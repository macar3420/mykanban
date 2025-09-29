import { useRef, useState } from "react";
import "./App.css";

function Column({ title, columnKey, refs, state }) {
  const { columns, editing, menuOpen } = state;
  const { todoRef, inprogressRef, doneRef, editInputRef } = refs;
  const {
    handleAdd,
    startEdit,
    toggleMenu,
    commitEdit,
    cancelEdit,
    handleToggleDone,
    handleMoveTo,
    handleDelete,
  } = state.handlers;
  return (
    <div className="column">
      <h3>{title}</h3>
      <div style={{ display: "flex", gap: ".5rem", marginBottom: "1.75rem" }}>
        <input
          type="text"
          placeholder={`Type`}
          ref={
            columnKey === "todo"
              ? todoRef
              : columnKey === "inprogress"
                ? inprogressRef
                : doneRef
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAdd(columnKey);
            }
          }}
        />
        <button type="button" onClick={() => handleAdd(columnKey)}>
          Add
        </button>
      </div>
      <ul className="items">
        {columns[columnKey].map((item) => {
          const isEditing =
            editing &&
            editing.columnKey === columnKey &&
            editing.id === item.id;
          const isMenuOpen =
            menuOpen &&
            menuOpen.columnKey === columnKey &&
            menuOpen.id === item.id;
          const liClass =
            `${isEditing ? "editing" : ""} ${item.done ? "done" : ""}`.trim();
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
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => startEdit(columnKey, item.id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleToggleDone(columnKey, item.id)}
                      >
                        {item.done ? "Undo done" : "Mark as done"}
                      </button>
                      <hr className="menu-divider" />
                      {columnKey !== "todo" && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() =>
                            handleMoveTo(columnKey, item.id, "todo")
                          }
                        >
                          Move to To Do
                        </button>
                      )}
                      {columnKey !== "inprogress" && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() =>
                            handleMoveTo(columnKey, item.id, "inprogress")
                          }
                        >
                          Move to In Progress
                        </button>
                      )}
                      {columnKey !== "done" && (
                        <button
                          type="button"
                          role="menuitem"
                          onClick={() =>
                            handleMoveTo(columnKey, item.id, "done")
                          }
                        >
                          Move to Done
                        </button>
                      )}
                      <hr className="menu-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleDelete(columnKey, item.id)}
                      >
                        Delete
                      </button>
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

  function handleAdd(columnKey) {
    const map = { todo: todoRef, inprogress: inprogressRef, done: doneRef };
    const ref = map[columnKey];
    const value = ref?.current?.value ?? "";
    const text = value.trim();
    if (!text) return;
    setColumns((prev) => ({
      ...prev,
      [columnKey]: [
        ...prev[columnKey],
        {
          id: `${columnKey}-${Date.now()}`,
          title: text,
          createdAt: new Date().toISOString(),
          done: false,
        },
      ],
    }));
    if (ref?.current) ref.current.value = "";
  }

  function handleDelete(columnKey, id) {
    setColumns((prev) => ({
      ...prev,
      [columnKey]: prev[columnKey].filter((item) => item.id !== id),
    }));
  }

  function startEdit(columnKey, id) {
    setEditing({ columnKey, id });
  }

  function commitEdit() {
    if (!editing) return;
    const { columnKey, id } = editing;
    const value = editInputRef.current?.value ?? "";
    const text = value.trim();
    setColumns((prev) => ({
      ...prev,
      [columnKey]: prev[columnKey].map((item) =>
        item.id === id && text ? { ...item, title: text, updatedAt: new Date().toISOString() } : item
      ),
    }));
    setEditing(null);
  }

  function cancelEdit() {
    setEditing(null);
  }

  function toggleMenu(columnKey, id) {
    setMenuOpen((prev) =>
      prev && prev.columnKey === columnKey && prev.id === id ? null : { columnKey, id }
    );
  }

  function handleToggleDone(columnKey, id) {
    setColumns((prev) => ({
      ...prev,
      [columnKey]: prev[columnKey].map((item) =>
        item.id === id ? { ...item, done: !item.done, updatedAt: new Date().toISOString() } : item
      ),
    }));
    setMenuOpen(null);
  }

  function handleMoveTo(columnKeyFrom, id, columnKeyTo) {
    if (columnKeyFrom === columnKeyTo) {
      setMenuOpen(null);
      return;
    }
    setColumns((prev) => {
      const item = prev[columnKeyFrom].find((i) => i.id === id);
      if (!item) return prev;
      const from = prev[columnKeyFrom].filter((i) => i.id !== id);
      const moved = { ...item, done: columnKeyTo === "done", updatedAt: new Date().toISOString() };
      const to = [...prev[columnKeyTo], moved];
      return { ...prev, [columnKeyFrom]: from, [columnKeyTo]: to };
    });
    setMenuOpen(null);
  }

  const handlers = {
    handleAdd,
    startEdit,
    toggleMenu,
    commitEdit,
    cancelEdit,
    handleToggleDone,
    handleMoveTo,
    handleDelete,
  };

  return (
    <div className="page">
      <div className="board">
        <Column title="To Do" columnKey="todo" refs={{ todoRef, inprogressRef, doneRef, editInputRef }} state={{ columns, editing, menuOpen, handlers }} />
        <Column title="In Progress" columnKey="inprogress" refs={{ todoRef, inprogressRef, doneRef, editInputRef }} state={{ columns, editing, menuOpen, handlers }} />
        <Column title="Done" columnKey="done" refs={{ todoRef, inprogressRef, doneRef, editInputRef }} state={{ columns, editing, menuOpen, handlers }} />
      </div>
    </div>
  );
}

export default App;
