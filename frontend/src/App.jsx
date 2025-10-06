import "./App.css";
import { useEffect, useRef, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(msg || `Request failed: ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

function normalizeTask(t) {
  return { ...t, done: t.done === 1 || t.done === true };
}

function App() {
  const [columns, setColumns] = useState({
    todo: [],
    inprogress: [],
    done: [],
  });

  const todoRef = useRef(null);
  const inprogressRef = useRef(null);
  const doneRef = useRef(null);
  const editInputRef = useRef(null);
  const [editing, setEditing] = useState(null); // { columnKey, id }
  const [menuOpen, setMenuOpen] = useState(null); // { columnKey, id }

  // Load tasks from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const data = await api("/api/v1/tasks?group=status");
        setColumns({
          todo: Array.isArray(data?.todo) ? data.todo.map(normalizeTask) : [],
          inprogress: Array.isArray(data?.inprogress) ? data.inprogress.map(normalizeTask) : [],
          done: Array.isArray(data?.done) ? data.done.map(normalizeTask) : [],
        });
      } catch (e) {
        console.error("Failed to load tasks", e);
      }
    })();
  }, []);

  async function handleAdd(columnKey) {
    const map = { todo: todoRef, inprogress: inprogressRef, done: doneRef };
    const ref = map[columnKey];
    const value = ref?.current?.value ?? "";
    const text = value.trim();
    if (!text) return;

    try {
      const created = await api("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify({ title: text, status: columnKey }),
      });
      const task = normalizeTask(created);
      setColumns((prev) => ({
        ...prev,
        [columnKey]: [...prev[columnKey], task],
      }));
      if (ref?.current) ref.current.value = "";
    } catch (e) {
      console.error("Create failed", e);
    }
  }

  async function handleDelete(columnKey, id) {
    try {
      await api(`/api/v1/tasks/${id}`, { method: "DELETE" });
      setColumns((prev) => ({
        ...prev,
        [columnKey]: prev[columnKey].filter((item) => item.id !== id),
      }));
    } catch (e) {
      console.error("Delete failed", e);
    }
  }

  function startEdit(columnKey, id) {
    setEditing({ columnKey, id });
  }

  async function commitEdit() {
    if (!editing) return;
    const { columnKey, id } = editing;
    const value = editInputRef.current?.value ?? "";
    const text = value.trim();
    setEditing(null);
    if (!text) return;

    try {
      const updated = await api(`/api/v1/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ title: text }),
      });
      const task = normalizeTask(updated);
      setColumns((prev) => ({
        ...prev,
        [columnKey]: prev[columnKey].map((item) => (item.id === id ? task : item)),
      }));
    } catch (e) {
      console.error("Update failed", e);
    }
  }

  function cancelEdit() {
    setEditing(null);
  }

  function toggleMenu(columnKey, id) {
    setMenuOpen((prev) =>
      prev && prev.columnKey === columnKey && prev.id === id ? null : { columnKey, id },
    );
  }

  async function handleToggleDone(columnKey, id) {
    try {
      const current = columns[columnKey].find((i) => i.id === id);
      const updated = await api(`/api/v1/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ done: !current.done }),
      });
      const task = normalizeTask(updated);
      setColumns((prev) => ({
        ...prev,
        [columnKey]: prev[columnKey].map((item) => (item.id === id ? task : item)),
      }));
      setMenuOpen(null);
    } catch (e) {
      console.error("Toggle failed", e);
    }
  }

  async function handleMoveToDone(columnKey, id) {
    if (columnKey === "done") {
      setMenuOpen(null);
      return;
    }
    try {
      const updated = await api(`/api/v1/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: "done", done: true }),
      });
      const task = normalizeTask(updated);
      setColumns((prev) => {
        const from = prev[columnKey].filter((i) => i.id !== id);
        const to = [...prev.done, task];
        return { ...prev, [columnKey]: from, done: to };
      });
    } catch (e) {
      console.error("Move to done failed", e);
    } finally {
      setMenuOpen(null);
    }
  }

  async function handleMoveTo(columnKeyFrom, id, columnKeyTo) {
    if (columnKeyFrom === columnKeyTo) {
      setMenuOpen(null);
      return;
    }
    try {
      const updated = await api(`/api/v1/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: columnKeyTo, done: columnKeyTo === "done" }),
      });
      const task = normalizeTask(updated);
      setColumns((prev) => {
        const from = prev[columnKeyFrom].filter((i) => i.id !== id);
        const to = [...prev[columnKeyTo], task];
        return { ...prev, [columnKeyFrom]: from, [columnKeyTo]: to };
      });
    } catch (e) {
      console.error("Move failed", e);
    } finally {
      setMenuOpen(null);
    }
  }

  function Column({ title, columnKey }) {
    return (
      <div className="column">
        <h3>{title}</h3>
        <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.75rem" }}>
          <input
            type="text"
            placeholder={"Type"}
            ref={columnKey === "todo" ? todoRef : columnKey === "inprogress" ? inprogressRef : doneRef}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAdd(columnKey);
              }
            }}
          />
          <button type="button" onClick={() => handleAdd(columnKey)}>Add</button>
        </div>
        <ul className="items">
          {columns[columnKey].map((item) => {
            const isEditing = editing && editing.columnKey === columnKey && editing.id === item.id;
            const isMenuOpen = menuOpen && menuOpen.columnKey === columnKey && menuOpen.id === item.id;
            const liClass = `${isEditing ? "editing" : ""} ${item.done ? "done" : ""}`.trim();
            return (
              <li
                key={item.id}
                className={liClass}
                onDoubleClick={() => startEdit(columnKey, item.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleMenu(columnKey, item.id);
                }}
              >
                {isEditing ? (
                  <input
                    ref={editInputRef}
                    className="item-input"
                    type="text"
                    defaultValue={item.title}
                    autoFocus
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        commitEdit();
                      } else if (e.key === "Escape") {
                        e.preventDefault();
                        cancelEdit();
                      }
                    }}
                  />
                ) : (
                  <span className="item-text">{item.title}</span>
                )}

                {!isEditing && (
                  <div className="item-menu-wrap">
                    <button
                      className="item-menu-btn"
                      type="button"
                      aria-haspopup="menu"
                      aria-expanded={isMenuOpen ? "true" : "false"}
                      onClick={() => toggleMenu(columnKey, item.id)}
                    >
                      ⋯
                    </button>
                    {isMenuOpen && (
                      <div className="item-menu" role="menu">
                        <button type="button" role="menuitem" onClick={() => startEdit(columnKey, item.id)}>Edit</button>
                        <button type="button" role="menuitem" onClick={() => handleToggleDone(columnKey, item.id)}>
                          {item.done ? "Undo done" : "Mark as done"}
                        </button>
                        <div className="menu-divider" role="separator"></div>
                        {columnKey !== "todo" && (
                          <button type="button" role="menuitem" onClick={() => handleMoveTo(columnKey, item.id, "todo")}>Move to To Do</button>
                        )}
                        {columnKey !== "inprogress" && (
                          <button type="button" role="menuitem" onClick={() => handleMoveTo(columnKey, item.id, "inprogress")}>Move to In Progress</button>
                        )}
                        {columnKey !== "done" && (
                          <button type="button" role="menuitem" onClick={() => handleMoveTo(columnKey, item.id, "done")}>Move to Done</button>
                        )}
                        <div className="menu-divider" role="separator"></div>
                        <button type="button" role="menuitem" onClick={() => handleDelete(columnKey, item.id)}>Delete</button>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="board">
        <Column title="To Do" columnKey="todo" />
        <Column title="In Progress" columnKey="inprogress" />
        <Column title="Done" columnKey="done" />
      </div>
    </div>
  );
}

export default App;