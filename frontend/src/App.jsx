import { useEffect, useRef, useState } from "react";
import "./App.css";
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
  const {
    columns,
    editing,
    menuOpen,
    dragging,
    dragOver,
    boardType,
    selectedTeam,
  } = state;
  const {
    handleAdd,
    startEdit,
    toggleMenu,
    commitEdit,
    cancelEdit,
    handleToggleDone,
    handleMoveTo,
    handleDelete,
    handleItemPointerDown,
  } = state.handlers;
  return (
    <div
      className={`column ${dragOver === columnKey ? "is-drag-over" : ""}`}
      data-column-key={columnKey}
    >
      <h3>{title}</h3>
      {!(boardType === "team" && selectedTeam === null) && (
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
      )}
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
            `${isEditing ? "editing" : ""} ${item.done ? "done" : ""} ${
              dragging &&
              dragging.columnKey === columnKey &&
              dragging.id === item.id
                ? "dragging"
                : ""
            }`.trim();
          return (
            <li
              key={item.id}
              className={liClass}
              onPointerDown={(e) =>
                handleItemPointerDown(columnKey, item.id, e)
              }
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
  const [dragging, setDragging] = useState(null); // { columnKey, id }
  const [dragOver, setDragOver] = useState(null); // columnKey
  const [boardType, setBoardType] = useState("personal"); // 'personal' | 'team'
  const [teams, setTeams] = useState([]); // Array of team objects
  const [selectedTeam, setSelectedTeam] = useState(null); // Selected team ID
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [showAssignTeamModal, setShowAssignTeamModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [selectedTeamForAssign, setSelectedTeamForAssign] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [teamMenuOpen, setTeamMenuOpen] = useState(null); // team ID or null
  const [showEditTeamModal, setShowEditTeamModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState(null); // team object
  const [showManageMembersModal, setShowManageMembersModal] = useState(false);
  const [managingTeam, setManagingTeam] = useState(null); // team object
  const [teamMembers, setTeamMembers] = useState([]); // array of member objects
  const [showDeleteTeamConfirm, setShowDeleteTeamConfirm] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState(null); // team object
  const [showLeaveTeamConfirm, setShowLeaveTeamConfirm] = useState(false);
  const [teamToLeave, setTeamToLeave] = useState(null); // team object
  const [showRemoveMemberConfirm, setShowRemoveMemberConfirm] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState(null); // { team, member }

  // Close team menu when clicking outside
  useEffect(() => {
    if (teamMenuOpen === null) return;
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".team-menu-wrap") &&
        !e.target.closest(".team-menu")
      ) {
        setTeamMenuOpen(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [teamMenuOpen]);

  // Close list item menu when clicking outside
  useEffect(() => {
    if (menuOpen === null) return;
    const handleClickOutside = (e) => {
      if (
        !e.target.closest(".item-menu-wrap") &&
        !e.target.closest(".item-menu")
      ) {
        setMenuOpen(null);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [menuOpen]);

  // Load current user; then load tasks only if authenticated (personal board is default)
  useEffect(() => {
    (async () => {
      // If URL contains a reset token, open reset form and prefill
      const params = new URLSearchParams(window.location.search);
      const t = params.get("token") || params.get("resetToken");
      if (t) {
        setAuthMode("reset");
        setResetToken(t);
        setAuthMessage("");
      }
      const me = await api("/api/v1/auth/me").catch(() => null);
      if (me) {
        setUser(me);
        // Always start with personal board
        setBoardType("personal");
        setSelectedTeam(null);
        // Load personal tasks on initial load (personal board is default)
        try {
          const data = await api(
            "/api/v1/tasks?group=status&personal_only=true",
          );
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
        // Load user's teams
        try {
          const teamsData = await api("/api/v1/teams");
          setTeams(Array.isArray(teamsData) ? teamsData : []);
        } catch (e) {
          console.error("Failed to load teams", e);
        }
      }
    })();
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setAuthMessage("");
    const form = new FormData(e.currentTarget);
    const identifier = String(form.get("identifier") || "").trim();
    const password = String(form.get("password") || "").trim();
    if (!identifier || !password) return;
    try {
      const me = await api("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      setUser(me);
      setAuthMessage("");
      // Always start with personal board
      setBoardType("personal");
      setSelectedTeam(null);
      // Reload tasks scoped to the user (personal board only)
      try {
        const data = await api("/api/v1/tasks?group=status&personal_only=true");
        setColumns({
          todo: Array.isArray(data?.todo) ? data.todo.map(normalizeTask) : [],
          inprogress: Array.isArray(data?.inprogress)
            ? data.inprogress.map(normalizeTask)
            : [],
          done: Array.isArray(data?.done) ? data.done.map(normalizeTask) : [],
        });
      } catch {}
      // Load user's teams
      try {
        const teamsData = await api("/api/v1/teams");
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch {}
    } catch (_err) {
      setAuthMessage("Invalid username or password");
    }
  }

  async function handleSignup(e) {
    e.preventDefault();
    setAuthMessage("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "").trim();
    const displayName = String(form.get("displayName") || "").trim();
    if (!email || !password || !displayName) return;
    try {
      const me = await api("/api/v1/auth/signup", {
        method: "POST",
        body: JSON.stringify({ email, password, displayName }),
      });
      setUser(me);
      setAuthMessage("");
      // Always start with personal board
      setBoardType("personal");
      setSelectedTeam(null);
      try {
        const data = await api("/api/v1/tasks?group=status&personal_only=true");
        setColumns({
          todo: Array.isArray(data?.todo) ? data.todo.map(normalizeTask) : [],
          inprogress: Array.isArray(data?.inprogress)
            ? data.inprogress.map(normalizeTask)
            : [],
          done: Array.isArray(data?.done) ? data.done.map(normalizeTask) : [],
        });
      } catch {}
      // Load user's teams
      try {
        const teamsData = await api("/api/v1/teams");
        setTeams(Array.isArray(teamsData) ? teamsData : []);
      } catch {}
    } catch (err) {
      // Handle signup errors - the api function throws Error with JSON string as message
      try {
        const errorText = err.message || "";
        const errorData = JSON.parse(errorText);
        if (errorData?.error === "email already in use") {
          setAuthMessage("Email already in use");
        } else if (errorData?.error === "duplicate username") {
          setAuthMessage("Duplicate username");
        } else {
          setAuthMessage("Signup failed. Please try again.");
        }
      } catch {
        // If error can't be parsed as JSON, check the error message string
        const errorMsg = err.message || "";
        if (
          errorMsg.includes("duplicate username") ||
          errorMsg.includes("display_name")
        ) {
          setAuthMessage("Duplicate username");
        } else if (errorMsg.includes("email already in use")) {
          setAuthMessage("Email already in use");
        } else {
          setAuthMessage("Signup failed. Please try again.");
        }
      }
    }
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
      await api("/api/v1/auth/forgot", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
      setAuthMessage(
        "If the email exists, a reset link was sent. Check your inbox.",
      );
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
      await api("/api/v1/auth/reset", {
        method: "POST",
        body: JSON.stringify({ token, newPassword }),
      });
      setAuthMessage("Password updated. You can now sign in.");
      setAuthMode("login");
    } catch (_err) {
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
      const body = { title: text, status: columnKey };
      if (boardType === "team" && selectedTeam) {
        body.team_id = selectedTeam;
      }
      const created = await api("/api/v1/tasks", {
        method: "POST",
        body: JSON.stringify(body),
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

  function handleItemPointerDown(columnKey, id, event) {
    if (event.target.closest("button, input")) return;
    if (typeof event.button === "number" && event.button !== 0) return;
    const item = columns[columnKey].find((i) => i.id === id);
    if (!item) return;
    const li = event.currentTarget;
    const rect = li.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    setMenuOpen(null);
    setDragging({
      columnKey,
      id,
      title: item.title,
      done: item.done,
      offsetX,
      offsetY,
      width: rect.width,
      x: rect.left,
      y: rect.top,
    });
  }

  const handleMoveToRef = useRef(handleMoveTo);
  handleMoveToRef.current = handleMoveTo;

  useEffect(() => {
    if (!dragging) return;

    const onPointerMove = (event) => {
      setDragging((prev) =>
        prev
          ? {
              ...prev,
              x: event.clientX - prev.offsetX,
              y: event.clientY - prev.offsetY,
            }
          : null,
      );
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const col = el?.closest("[data-column-key]");
      const key = col?.getAttribute("data-column-key");
      setDragOver((prev) => (prev === key ? prev : key || null));
    };

    const finishDrag = async (event) => {
      const el = document.elementFromPoint(event.clientX, event.clientY);
      const col = el?.closest("[data-column-key]");
      const toKey = col?.getAttribute("data-column-key");
      const from = dragging;
      setDragging(null);
      setDragOver(null);
      if (from && toKey && ["todo", "inprogress", "done"].includes(toKey)) {
        await handleMoveToRef.current(from.columnKey, from.id, toKey);
      }
    };

    const onPointerUp = (event) => {
      finishDrag(event);
    };

    const onPointerCancel = () => {
      setDragging(null);
      setDragOver(null);
    };

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    document.body.classList.add("is-dragging-task");

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      document.body.classList.remove("is-dragging-task");
    };
  }, [dragging]);

  // Gate: show login-only view until authenticated
  if (!user) {
    return (
      <div className="page auth-page">
        <header className="auth-header">
          <h1 className="auth-title">Welcome</h1>
          <p className="auth-subtitle">Sign in to access your boards</p>
        </header>
        {authMode === "login" ? (
          <form className="auth-form" onSubmit={handleLogin}>
            <h3>Sign in</h3>
            <input
              name="identifier"
              type="text"
              placeholder="Email or username"
              required
            />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
            />
            <button type="submit">Login</button>
            <div className="auth-links">
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setAuthMessage("");
                }}
              >
                Create an account
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode("forgot");
                  setAuthMessage("");
                }}
              >
                Forgot password?
              </button>
            </div>
          </form>
        ) : authMode === "signup" ? (
          <form className="auth-form" onSubmit={handleSignup}>
            <h3>Sign up</h3>
            <input
              name="displayName"
              type="text"
              placeholder="Username"
              required
            />
            <input name="email" type="email" placeholder="Email" required />
            <input
              name="password"
              type="password"
              placeholder="Password"
              required
            />
            <button type="submit">Create account</button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
            >
              Already have an account? Log in
            </button>
          </form>
        ) : authMode === "forgot" ? (
          <form className="auth-form" onSubmit={handleForgot}>
            <h3>Forgot password</h3>
            <input
              name="email"
              type="email"
              placeholder="Your email"
              required
            />
            <button type="submit">Send reset link</button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
            >
              Back to sign in
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleReset}>
            <h3>Reset password</h3>
            <input
              name="token"
              type="text"
              placeholder="Paste reset token"
              required
              defaultValue={resetToken}
            />
            <input
              name="newPassword"
              type="password"
              placeholder="New password"
              required
            />
            <button type="submit">Update password</button>
            <button
              type="button"
              onClick={() => {
                setAuthMode("login");
                setAuthMessage("");
              }}
            >
              Back to sign in
            </button>
          </form>
        )}
        {authMessage && <div className="auth-message">{authMessage}</div>}
      </div>
    );
  }

  return (
    <div className="page">
      {dragging && (
        <div
          className={`drag-ghost${dragging.done ? " done" : ""}`}
          style={{
            left: dragging.x,
            top: dragging.y,
            width: dragging.width,
          }}
          aria-hidden="true"
        >
          <span className="drag-ghost-text">{dragging.title}</span>
        </div>
      )}
      <header className="board-header">
        <h1 className="board-title">Hey, {user.displayName}!</h1>
        <p className="board-subtitle">Organize your tasks with style</p>
      </header>
      <div className="user-header">
        <span className="user-info">Signed in as {user.displayName}</span>
        <button
          className="user-logout-btn"
          type="button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
      <div className="board-type-switch">
        <button
          className={`board-type-btn ${boardType === "personal" ? "active" : ""}`}
          type="button"
          onClick={() => {
            setBoardType("personal");
            // Load personal tasks when switching to personal board
            if (user) {
              api("/api/v1/tasks?group=status&personal_only=true")
                .then((data) => {
                  setColumns({
                    todo: Array.isArray(data?.todo)
                      ? data.todo.map(normalizeTask)
                      : [],
                    inprogress: Array.isArray(data?.inprogress)
                      ? data.inprogress.map(normalizeTask)
                      : [],
                    done: Array.isArray(data?.done)
                      ? data.done.map(normalizeTask)
                      : [],
                  });
                })
                .catch((e) => {
                  console.error("Failed to load tasks", e);
                });
            }
          }}
        >
          Personal
        </button>
        <button
          className={`board-type-btn ${boardType === "team" ? "active" : ""}`}
          type="button"
          onClick={() => {
            setBoardType("team");
            setSelectedTeam(null);
            // Clear columns when switching to team board
            setColumns({
              todo: [],
              inprogress: [],
              done: [],
            });
          }}
        >
          Team
        </button>
      </div>
      {boardType === "team" && (
        <div className="team-actions-center">
          <button
            className="team-action-btn"
            type="button"
            onClick={() => setShowCreateTeamModal(true)}
          >
            Create Team
          </button>
          <button
            className="team-action-btn"
            type="button"
            onClick={() => setShowAssignTeamModal(true)}
          >
            Assign Team
          </button>
        </div>
      )}
      <div className="board-wrapper">
        {boardType === "team" && (
          <div className="team-actions-row">
            <div className="team-buttons-column">
              {teams.length > 0 && (
                <div
                  className="team-buttons"
                  style={{ paddingLeft: "3rem", marginLeft: "-5rem" }}
                >
                  {teams.map((team) => {
                    const isOwner =
                      team.created_by === user.id || team.role === "owner";
                    const isMenuOpen = teamMenuOpen === team.id;
                    return (
                      <div
                        key={team.id}
                        className="team-btn-wrapper"
                        style={{
                          position: "relative",
                          display: "inline-block",
                        }}
                      >
                        <button
                          className={`team-btn ${selectedTeam === team.id ? "active" : ""}`}
                          type="button"
                          onClick={async () => {
                            setSelectedTeam(team.id);
                            try {
                              const data = await api(
                                `/api/v1/tasks?group=status&team_id=${team.id}`,
                              );
                              setColumns({
                                todo: Array.isArray(data?.todo)
                                  ? data.todo.map(normalizeTask)
                                  : [],
                                inprogress: Array.isArray(data?.inprogress)
                                  ? data.inprogress.map(normalizeTask)
                                  : [],
                                done: Array.isArray(data?.done)
                                  ? data.done.map(normalizeTask)
                                  : [],
                              });
                            } catch (e) {
                              console.error("Failed to load team tasks", e);
                            }
                          }}
                        >
                          {team.name}
                        </button>
                        <div className="team-menu-wrap">
                          <button
                            className="team-menu-btn"
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTeamMenuOpen(isMenuOpen ? null : team.id);
                            }}
                          >
                            ⋯
                          </button>
                          {isMenuOpen && (
                            <div className="team-menu" role="menu">
                              {isOwner ? (
                                <>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setEditingTeam(team);
                                      setShowEditTeamModal(true);
                                      setTeamMenuOpen(null);
                                    }}
                                  >
                                    Edit Team Name
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={async () => {
                                      setManagingTeam(team);
                                      setShowManageMembersModal(true);
                                      setTeamMenuOpen(null);
                                      // Load team members
                                      try {
                                        const members = await api(
                                          `/api/v1/teams/${team.id}/members`,
                                        );
                                        setTeamMembers(
                                          Array.isArray(members) ? members : [],
                                        );
                                      } catch (e) {
                                        console.error(
                                          "Failed to load team members",
                                          e,
                                        );
                                        setTeamMembers([]);
                                      }
                                    }}
                                  >
                                    Manage Members
                                  </button>
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => {
                                      setTeamMenuOpen(null);
                                      setTeamToDelete(team);
                                      setShowDeleteTeamConfirm(true);
                                    }}
                                  >
                                    Delete Team
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setTeamMenuOpen(null);
                                    setTeamToLeave(team);
                                    setShowLeaveTeamConfirm(true);
                                  }}
                                >
                                  Leave Team
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
        {showCreateTeamModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowCreateTeamModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Create Team</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const name = String(form.get("name") || "").trim();
                  if (!name) return;
                  try {
                    const newTeam = await api("/api/v1/teams", {
                      method: "POST",
                      body: JSON.stringify({ name }),
                    });
                    setTeams((prev) => [...prev, newTeam]);
                    setSelectedTeam(newTeam.id);
                    setShowCreateTeamModal(false);
                    // Load team tasks
                    const data = await api(
                      `/api/v1/tasks?group=status&team_id=${newTeam.id}`,
                    );
                    setColumns({
                      todo: Array.isArray(data?.todo)
                        ? data.todo.map(normalizeTask)
                        : [],
                      inprogress: Array.isArray(data?.inprogress)
                        ? data.inprogress.map(normalizeTask)
                        : [],
                      done: Array.isArray(data?.done)
                        ? data.done.map(normalizeTask)
                        : [],
                    });
                  } catch (err) {
                    console.error("Failed to create team", err);
                    alert("Failed to create team. Please try again.");
                  }
                }}
              >
                <input
                  name="name"
                  type="text"
                  placeholder="Team name"
                  required
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="submit">Create</button>
                  <button
                    type="button"
                    onClick={() => setShowCreateTeamModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showAssignTeamModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowAssignTeamModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Assign Team</h3>
              <div className="assign-team-form">
                <label>Select Team:</label>
                <select
                  value={selectedTeamForAssign || ""}
                  onChange={(e) =>
                    setSelectedTeamForAssign(parseInt(e.target.value, 10))
                  }
                >
                  <option value="">Choose a team...</option>
                  {teams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <label>Search for User:</label>
                <input
                  type="text"
                  placeholder="Type to search users..."
                  value={userSearchTerm}
                  onChange={async (e) => {
                    const term = e.target.value.trim();
                    setUserSearchTerm(term);
                    if (term.length >= 2) {
                      try {
                        const results = await api(
                          `/api/v1/auth/users/search?q=${encodeURIComponent(term)}`,
                        );
                        setUserSearchResults(
                          Array.isArray(results) ? results : [],
                        );
                      } catch (err) {
                        console.error("Failed to search users", err);
                        setUserSearchResults([]);
                      }
                    } else {
                      setUserSearchResults([]);
                    }
                  }}
                />
                {userSearchResults.length > 0 && (
                  <div className="user-search-results">
                    {userSearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="user-search-result-item"
                        onClick={async () => {
                          if (!selectedTeamForAssign) {
                            setErrorMessage("Please select a team first");
                            setShowErrorModal(true);
                            return;
                          }
                          try {
                            await api(
                              `/api/v1/teams/${selectedTeamForAssign}/assign`,
                              {
                                method: "POST",
                                body: JSON.stringify({ user_id: user.id }),
                              },
                            );
                            setShowAssignTeamModal(false);
                            setUserSearchTerm("");
                            setUserSearchResults([]);
                            setSelectedTeamForAssign(null);
                            setSuccessMessage(
                              `Successfully assigned ${user.display_name} to team!`,
                            );
                            setShowSuccessModal(true);
                          } catch (err) {
                            console.error("Failed to assign user", err);
                            setErrorMessage(
                              "Failed to assign user. Please try again.",
                            );
                            setShowErrorModal(true);
                          }
                        }}
                      >
                        <strong>{user.display_name}</strong>
                        <span>{user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowAssignTeamModal(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        {showSuccessModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowSuccessModal(false)}
          >
            <div
              className="modal-content success-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Success</h3>
              <p>{successMessage}</p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {showErrorModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowErrorModal(false)}
          >
            <div
              className="modal-content error-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <h3>Error</h3>
              <p>{errorMessage}</p>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowErrorModal(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        {showEditTeamModal && editingTeam && (
          <div
            className="modal-overlay"
            onClick={() => setShowEditTeamModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Edit Team Name</h3>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = new FormData(e.currentTarget);
                  const name = String(form.get("name") || "").trim();
                  if (!name) return;
                  try {
                    const updated = await api(
                      `/api/v1/teams/${editingTeam.id}`,
                      {
                        method: "PUT",
                        body: JSON.stringify({ name }),
                      },
                    );
                    setTeams((prev) =>
                      prev.map((t) =>
                        t.id === editingTeam.id
                          ? { ...t, name: updated.name }
                          : t,
                      ),
                    );
                    setShowEditTeamModal(false);
                    setEditingTeam(null);
                    setSuccessMessage("Team name updated successfully");
                    setShowSuccessModal(true);
                  } catch (err) {
                    setErrorMessage(
                      err.message || "Failed to update team name",
                    );
                    setShowErrorModal(true);
                  }
                }}
              >
                <input
                  name="name"
                  type="text"
                  placeholder="Team name"
                  defaultValue={editingTeam.name}
                  required
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="submit">Save</button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditTeamModal(false);
                      setEditingTeam(null);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {showManageMembersModal && managingTeam && (
          <div
            className="modal-overlay"
            onClick={() => setShowManageMembersModal(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Manage Members - {managingTeam.name}</h3>
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
                  Add Member
                </h4>
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={userSearchTerm}
                  onChange={async (e) => {
                    const term = e.target.value.trim();
                    setUserSearchTerm(term);
                    if (term.length >= 2) {
                      try {
                        const results = await api(
                          `/api/v1/auth/users/search?q=${encodeURIComponent(term)}`,
                        );
                        setUserSearchResults(
                          Array.isArray(results) ? results : [],
                        );
                      } catch (err) {
                        console.error("Search failed", err);
                        setUserSearchResults([]);
                      }
                    } else {
                      setUserSearchResults([]);
                    }
                  }}
                  style={{
                    width: "93%",
                    padding: "0.75rem",
                    fontSize: "1rem",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.1)",
                    color: "#fff",
                  }}
                />
                {userSearchResults.length > 0 && (
                  <div
                    className="user-search-results"
                    style={{ marginTop: "0.5rem" }}
                  >
                    {userSearchResults.map((user) => (
                      <div
                        key={user.id}
                        className="user-search-result-item"
                        onClick={async () => {
                          try {
                            await api(
                              `/api/v1/teams/${managingTeam.id}/assign`,
                              {
                                method: "POST",
                                body: JSON.stringify({ user_id: user.id }),
                              },
                            );
                            // Reload members
                            const members = await api(
                              `/api/v1/teams/${managingTeam.id}/members`,
                            );
                            setTeamMembers(
                              Array.isArray(members) ? members : [],
                            );
                            setUserSearchTerm("");
                            setUserSearchResults([]);
                            setSuccessMessage("Member added successfully");
                            setShowSuccessModal(true);
                          } catch (err) {
                            setErrorMessage(
                              err.message || "Failed to add member",
                            );
                            setShowErrorModal(true);
                          }
                        }}
                      >
                        <strong>{user.display_name}</strong>
                        <span>{user.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: "1rem" }}>
                <h4 style={{ marginBottom: "0.5rem", fontSize: "1rem" }}>
                  Current Members
                </h4>
                {teamMembers.length === 0 ? (
                  <p style={{ opacity: 0.7 }}>No members yet</p>
                ) : (
                  <div>
                    {teamMembers.map((member) => (
                      <div
                        key={member.user_id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "0.5rem",
                          marginBottom: "0.5rem",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "6px",
                        }}
                      >
                        <div>
                          <strong>{member.display_name}</strong>
                          <span style={{ marginLeft: "0.5rem", opacity: 0.7 }}>
                            {member.email}
                          </span>
                          <span
                            style={{
                              marginLeft: "0.5rem",
                              fontSize: "0.9rem",
                              opacity: 0.6,
                            }}
                          >
                            ({member.role})
                          </span>
                        </div>
                        {member.user_id !== user.id &&
                          member.role !== "owner" && (
                            <button
                              type="button"
                              onClick={() => {
                                setMemberToRemove({
                                  team: managingTeam,
                                  member,
                                });
                                setShowRemoveMemberConfirm(true);
                              }}
                              style={{
                                padding: "0.25rem 0.5rem",
                                fontSize: "0.9rem",
                                background: "rgba(255, 0, 0, 0.2)",
                                border: "1px solid rgba(255, 0, 0, 0.5)",
                                color: "#ff6b6b",
                                borderRadius: "4px",
                                cursor: "pointer",
                              }}
                            >
                              Remove
                            </button>
                          )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={() => {
                    setShowManageMembersModal(false);
                    setManagingTeam(null);
                    setTeamMembers([]);
                    setUserSearchTerm("");
                    setUserSearchResults([]);
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
        {showDeleteTeamConfirm && teamToDelete && (
          <div
            className="modal-overlay"
            onClick={() => setShowDeleteTeamConfirm(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Delete Team</h3>
              <p>
                Are you sure you want to delete "{teamToDelete.name}"? This
                action cannot be undone.
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api(`/api/v1/teams/${teamToDelete.id}`, {
                        method: "DELETE",
                      });
                      setTeams((prev) =>
                        prev.filter((t) => t.id !== teamToDelete.id),
                      );
                      if (selectedTeam === teamToDelete.id) {
                        setSelectedTeam(null);
                        setColumns({ todo: [], inprogress: [], done: [] });
                      }
                      setShowDeleteTeamConfirm(false);
                      setTeamToDelete(null);
                      setSuccessMessage("Team deleted successfully");
                      setShowSuccessModal(true);
                    } catch (e) {
                      setErrorMessage(e.message || "Failed to delete team");
                      setShowErrorModal(true);
                    }
                  }}
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteTeamConfirm(false);
                    setTeamToDelete(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showLeaveTeamConfirm && teamToLeave && (
          <div
            className="modal-overlay"
            onClick={() => setShowLeaveTeamConfirm(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Leave Team</h3>
              <p>Are you sure you want to leave "{teamToLeave.name}"?</p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api(`/api/v1/teams/${teamToLeave.id}/leave`, {
                        method: "POST",
                      });
                      setTeams((prev) =>
                        prev.filter((t) => t.id !== teamToLeave.id),
                      );
                      if (selectedTeam === teamToLeave.id) {
                        setSelectedTeam(null);
                        setColumns({ todo: [], inprogress: [], done: [] });
                      }
                      setShowLeaveTeamConfirm(false);
                      setTeamToLeave(null);
                      setSuccessMessage("Left team successfully");
                      setShowSuccessModal(true);
                    } catch (e) {
                      setErrorMessage(e.message || "Failed to leave team");
                      setShowErrorModal(true);
                    }
                  }}
                >
                  Leave
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLeaveTeamConfirm(false);
                    setTeamToLeave(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        {showRemoveMemberConfirm && memberToRemove && (
          <div
            className="modal-overlay"
            onClick={() => setShowRemoveMemberConfirm(false)}
          >
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <h3>Remove Member</h3>
              <p>
                Are you sure you want to remove{" "}
                {memberToRemove.member.display_name} from the team?
              </p>
              <div className="modal-actions">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api(
                        `/api/v1/teams/${memberToRemove.team.id}/members/${memberToRemove.member.user_id}`,
                        {
                          method: "DELETE",
                        },
                      );
                      // Reload members if manage members modal is open
                      if (
                        showManageMembersModal &&
                        managingTeam &&
                        managingTeam.id === memberToRemove.team.id
                      ) {
                        const members = await api(
                          `/api/v1/teams/${managingTeam.id}/members`,
                        );
                        setTeamMembers(Array.isArray(members) ? members : []);
                      }
                      setShowRemoveMemberConfirm(false);
                      setMemberToRemove(null);
                      setSuccessMessage("Member removed successfully");
                      setShowSuccessModal(true);
                    } catch (err) {
                      setErrorMessage(err.message || "Failed to remove member");
                      setShowErrorModal(true);
                    }
                  }}
                >
                  Remove
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowRemoveMemberConfirm(false);
                    setMemberToRemove(null);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="board">
          <Column
            title="To Do"
            columnKey="todo"
            refs={{ todoRef, inprogressRef, doneRef, editInputRef }}
            state={{
              columns,
              editing,
              menuOpen,
              dragging,
              dragOver,
              boardType,
              selectedTeam,
              handlers: handlers({
                handleAdd,
                startEdit,
                toggleMenu,
                commitEdit,
                cancelEdit,
                handleToggleDone,
                handleMoveTo,
                handleDelete,
                handleItemPointerDown,
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
              dragging,
              dragOver,
              boardType,
              selectedTeam,
              handlers: handlers({
                handleAdd,
                startEdit,
                toggleMenu,
                commitEdit,
                cancelEdit,
                handleToggleDone,
                handleMoveTo,
                handleDelete,
                handleItemPointerDown,
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
              dragging,
              dragOver,
              boardType,
              selectedTeam,
              handlers: handlers({
                handleAdd,
                startEdit,
                toggleMenu,
                commitEdit,
                cancelEdit,
                handleToggleDone,
                handleMoveTo,
                handleDelete,
                handleItemPointerDown,
              }),
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
