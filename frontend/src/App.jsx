import { useEffect, useRef, useState } from "react";
import "./App.css";
import FillTextAnimation from "./components/FillTextAnimation.jsx";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

async function api(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include",
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

function Column({ title, columnKey, refs, state }) {
  const { todoRef, inprogressRef, doneRef, editInputRef } = refs;
  const { columns, editing, menuOpen } = state;
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
      <div className="column-input-group">
        <input
          type="text"
          placeholder={"Type"}
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
  const [user, setUser] = useState(null);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup' | 'forgot' | 'reset'
  const [authMessage, setAuthMessage] = useState("");
  const [columns, setColumns] = useState({
    todo: [],
    inprogress: [],
    done: [],
  });
  const [resetToken, setResetToken] = useState("");

  const todoRef = useRef(null);
  const inprogressRef = useRef(null);
  const doneRef = useRef(null);
  const editInputRef = useRef(null);
  const [editing, setEditing] = useState(null); // { columnKey, id }
  const [menuOpen, setMenuOpen] = useState(null); // { columnKey, id }

  // Load current user; then load tasks only if authenticated
  useEffect(() => {
    (async () => {
      // If URL contains a reset token, open reset form and prefill
      const params = new URLSearchParams(window.location.search);
      const t = params.get("token") || params.get("resetToken");
      if (t) {
        setAuthMode("reset");
        setResetToken(t);
      }
      const me = await api("/api/v1/auth/me").catch(() => null);
      if (me) {
        setUser(me);
        try {
          const data = await api("/api/v1/tasks?group=status");
          setColumns({
            todo: Array.isArray(data?.todo) ? data.todo.map(normalizeTask) : [],
            inprogress: Array.isArray(data?.inprogress)
              ? data.inprogress.map(normalizeTask)
              : [],
            done: Array.isArray(data?.done) ? data.done.map(normalizeTask) : [],
          });
        } catch (e) {
          console.error("Failed to load tasks", e);
        }
      }
    })();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("identifier") || "").trim();
    const password = String(form.get("password") || "").trim();
    if (!identifier || !password) return;
    const me = await api("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ identifier, password }),
    });
    setUser(me);
    // Reload tasks scoped to the user
    try {
      const data = await api("/api/v1/tasks?group=status");
      setColumns({
        todo: Array.isArray(data?.todo) ? data.todo.map(normalizeTask) : [],
        inprogress: Array.isArray(data?.inprogress)
          ? data.inprogress.map(normalizeTask)
          : [],
        done: Array.isArray(data?.done) ? data.done.map(normalizeTask) : [],
      });
    } catch {}
  }

  async function handleSignup(e) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();
    const displayName = String(form.get("displayName") || "").trim();
    if (!email || !password || !displayName) return;
    const me = await api("/api/v1/auth/signup", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName }),
    });
    setUser(me);
    try {
      const data = await api("/api/v1/tasks?group=status");
      setColumns({
        todo: Array.isArray(data?.todo) ? data.todo.map(normalizeTask) : [],
        inprogress: Array.isArray(data?.inprogress)
          ? data.inprogress.map(normalizeTask)
          : [],
        done: Array.isArray(data?.done) ? data.done.map(normalizeTask) : [],
      });
    } catch {}
  }

  async function handleLogout() {
    await api("/api/v1/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    // Clear tasks until login
    setColumns({ todo: [], inprogress: [], done: [] });
  }

  async function handleForgot(e) {
    e.preventDefault();
    setAuthMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    if (!email) return;
    try {
      await api("/api/v1/auth/forgot", { method: "POST", body: JSON.stringify({ email }) });
      setAuthMessage("If the email exists, a reset link was sent. In dev, the token is logged in backend.");
    } catch {
      setAuthMessage("Request received. Check your email if it exists.");
    }
  }

  async function handleReset(e) {
    e.preventDefault();
    setAuthMessage("");
    const form = new FormData(e.currentTarget);
    const token = String(form.get("token") || "").trim();
    const newPassword = String(form.get("newPassword") || "").trim();
    if (!token || !newPassword) return;
    try {
      await api("/api/v1/auth/reset", { method: "POST", body: JSON.stringify({ token, newPassword }) });
      setAuthMessage("Password updated. You can now sign in.");
      setAuthMode("login");
    } catch (err) {
      setAuthMessage("Invalid or expired token.");
    }
  }

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
        [columnKey]: prev[columnKey].map((item) =>
          item.id === id ? task : item,
        ),
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
      prev && prev.columnKey === columnKey && prev.id === id
        ? null
        : { columnKey, id },
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
        [columnKey]: prev[columnKey].map((item) =>
          item.id === id ? task : item,
        ),
      }));
      setMenuOpen(null);
    } catch (e) {
      console.error("Toggle failed", e);
    }
  }

  // handleMoveToDone removed (unused)

  async function handleMoveTo(columnKeyFrom, id, columnKeyTo) {
    if (columnKeyFrom === columnKeyTo) {
      setMenuOpen(null);
      return;
    }
    try {
      const updated = await api(`/api/v1/tasks/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          status: columnKeyTo,
          done: columnKeyTo === "done",
        }),
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

  function handlers(obj) {
    return obj;
  }

  // Gate: show login-only view until authenticated
  if (!user) {
    return (
      <div className="page" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <FillTextAnimation
          text="Welcome"
          fillColor="#ffffff"
          backgroundColor="transparent"
          subtitle="Sign in to access your boards"
          animationDuration={2.5}
          delay={0.1}
          containerClassName="compact"
        />
        {authMode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <h3>Sign in</h3>
            <input name="identifier" type="text" placeholder="Email or username" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit">Login</button>
            <div className="auth-links">
              <button type="button" onClick={() => setAuthMode("signup")}>Create an account</button>
              <button type="button" onClick={() => setAuthMode("forgot")}>Forgot password?</button>
            </div>
          </form>
        ) : authMode === "signup" ? (
          <form className="auth-form" onSubmit={handleSignup}>
            <h3>Sign up</h3>
            <input name="displayName" type="text" placeholder="Username" required />
            <input name="email" type="email" placeholder="Email" required />
            <input name="password" type="password" placeholder="Password" required />
            <button type="submit">Create account</button>
            <button type="button" onClick={() => setAuthMode("login")}>Already have an account? Log in</button>
          </form>
        ) : authMode === "forgot" ? (
          <form className="auth-form" onSubmit={handleForgot}>
            <h3>Forgot password</h3>
            <input name="email" type="email" placeholder="Your email" required />
            <button type="submit">Send reset link</button>
            <button type="button" onClick={() => setAuthMode("reset")}>Have a token? Reset here</button>
            <button type="button" onClick={() => setAuthMode("login")}>Back to sign in</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleReset}>
            <h3>Reset password</h3>
            <input name="token" type="text" placeholder="Paste reset token" required defaultValue={resetToken} />
            <input name="newPassword" type="password" placeholder="New password" required />
            <button type="submit">Update password</button>
            <button type="button" onClick={() => setAuthMode("login")}>Back to sign in</button>
          </form>
        )}
        {authMessage && (
          <div style={{ marginTop: "0.75rem", color: "#fff", opacity: 0.9, textAlign: "center" }}>{authMessage}</div>
        )}
      </div>
    );
  }

  return (
    <div className="page">
      <FillTextAnimation
        text={`Hey, ${user.displayName}!`}
        fillColor="#ffffff"
        backgroundColor="transparent"
        subtitle="Organize your tasks with style"
        animationDuration={3}
        delay={0.2}
        containerClassName="compact"
      />
      <div className="user-header">
        <span className="user-info">Signed in as {user.displayName}</span>
        <button className="user-logout-btn" type="button" onClick={handleLogout}>Logout</button>
      </div>
      <div className="board">
        <Column
          title="To Do"
          columnKey="todo"
          refs={{ todoRef, inprogressRef, doneRef, editInputRef }}
          state={{
            columns,
            editing,
            menuOpen,
            handlers: handlers({
              handleAdd,
              startEdit,
              toggleMenu,
              commitEdit,
              cancelEdit,
              handleToggleDone,
              handleMoveTo,
              handleDelete,
            }),
          }}
        />
        <Column
          title="In Progress"
          columnKey="inprogress"
          refs={{ todoRef, inprogressRef, doneRef, editInputRef }}
          state={{
            columns,
            editing,
            menuOpen,
            handlers: handlers({
              handleAdd,
              startEdit,
              toggleMenu,
              commitEdit,
              cancelEdit,
              handleToggleDone,
              handleMoveTo,
              handleDelete,
            }),
          }}
        />
        <Column
          title="Done"
          columnKey="done"
          refs={{ todoRef, inprogressRef, doneRef, editInputRef }}
          state={{
            columns,
            editing,
            menuOpen,
            handlers: handlers({
              handleAdd,
              startEdit,
              toggleMenu,
              commitEdit,
              cancelEdit,
              handleToggleDone,
              handleMoveTo,
              handleDelete,
            }),
          }}
        />
      </div>
    </div>
  );
}

export default App;
