import { useCallback, useEffect, useState } from "react";
import {
  FaArrowLeft,
  FaCog,
  FaGithub,
  FaPlus,
  FaReply,
  FaTimes,
  FaTrash,
  FaUndo,
} from "react-icons/fa";
import * as api from "./api";
import type { SessionSummary } from "./api";
import Dialog, { type DialogTone } from "./Dialog";
import Settings from "./Settings";

const COLORS = [
  "#e74c3c",
  "#3498db",
  "#2ecc71",
  "#f39c12",
  "#9b59b6",
  "#1abc9c",
  "#e67e22",
  "#34495e",
];

const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

function normalizeUrl(input: string | undefined, fallback?: string): string {
  const value = (input || "").trim();
  if (!value) return fallback || "about:blank";
  if (/^(https?|file|about):/i.test(value)) return value;
  return "https://" + value;
}

const UNASSIGNED = "(no cookies)";

type DeleteScope = "temp" | "stored" | "both";

interface GroupDeleteState {
  host: string;
  scope: DeleteScope;
}

interface DialogState {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: DialogTone;
  onConfirm: () => void;
}

type View = "sessions" | "settings";

interface ActiveTab {
  id?: number;
  url?: string;
}

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<SessionSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);
  const [name, setName] = useState("");
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [view, setView] = useState<View>("sessions");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [groupDelete, setGroupDelete] = useState<GroupDeleteState | null>(null);

  const refresh = useCallback(async () => {
    const [list, currentSession, tab] = await Promise.all([
      api.listSessions(),
      api.currentTabSession(),
      api.getActiveTab(),
    ]);
    setSessions(list ?? []);
    setCurrent(currentSession);
    setActiveTab(tab ? { id: tab.id, url: tab.url } : null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async (type: "temp" | "stored") => {
    const fallback = `${type === "temp" ? "Temp" : "Stored"} ${sessions.length + 1}`;
    await api.createSession({
      name: name.trim() || fallback,
      type,
      color: pickColor(),
    });
    setName("");
    refresh();
  };

  const handleOpen = async (sessionId: string) => {
    const url = normalizeUrl(urlMap[sessionId], activeTab?.url);
    await api.openInSession(sessionId, url);
  };

  const handleDelete = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    setDialog({
      title: "Delete session",
      message: `Remove "${target?.name || "this session"}" and its cookies?`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        setDialog(null);
        await api.deleteSession(id);
        refresh();
      },
    });
  };

  const handleClear = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    setDialog({
      title: "Clear cookies",
      message: `Wipe all cookies in "${target?.name || "this session"}"?`,
      confirmLabel: "Clear",
      tone: "danger",
      onConfirm: async () => {
        setDialog(null);
        await api.clearSessionCookies(id);
        refresh();
      },
    });
  };

  const handleAssign = async (sessionId: string) => {
    await api.assignCurrentTab(sessionId);
    refresh();
  };

  const handleUnassign = async () => {
    await api.unassignCurrentTab();
    refresh();
  };

  const startEdit = (s: SessionSummary) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const commitEdit = async () => {
    const trimmed = editName.trim();
    if (trimmed && editingId) {
      await api.renameSession(editingId, trimmed);
    }
    cancelEdit();
    refresh();
  };

  const handleColorChange = async (sessionId: string, color: string) => {
    setColorPickerId(null);
    await api.setSessionColor(sessionId, color);
    refresh();
  };

  const groups = (() => {
    const map = new Map<string, SessionSummary[]>();
    for (const s of sessions) {
      const keys = s.domains.length > 0 ? s.domains : [UNASSIGNED];
      for (const k of keys) {
        const arr = map.get(k);
        if (arr) arr.push(s);
        else map.set(k, [s]);
      }
    }
    for (const items of map.values()) {
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === "stored" ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNASSIGNED) return -1;
      if (b === UNASSIGNED) return 1;
      return a.localeCompare(b);
    });
  })();

  const confirmGroupDelete = () => {
    if (!groupDelete) return;
    const { host, scope } = groupDelete;
    const matches = sessions.filter((s) => {
      if (host === UNASSIGNED) {
        if (s.domains.length !== 0) return false;
      } else if (!s.domains.includes(host)) {
        return false;
      }
      if (scope === "both") return true;
      return s.type === scope;
    });
    setGroupDelete(null);
    if (matches.length === 0) {
      setDialog({
        title: "No matches",
        message: `No ${scope === "both" ? "" : scope + " "}sessions to delete in "${host}".`,
        confirmLabel: "OK",
        onConfirm: () => setDialog(null),
      });
      return;
    }
    const names = matches.map((m) => m.name).join(", ");
    setDialog({
      title: `Delete ${matches.length} session${matches.length === 1 ? "" : "s"}`,
      message: `Remove ${scope === "both" ? "all" : scope} session${matches.length === 1 ? "" : "s"} in "${host}"? (${names})`,
      confirmLabel: "Delete",
      tone: "danger",
      onConfirm: async () => {
        setDialog(null);
        await Promise.all(matches.map((m) => api.deleteSession(m.id)));
        refresh();
      },
    });
  };

  return (
    <div className="app">
      <header>
        <div className="title-row">
          <h1>Spawner</h1>
          <div className="title-actions">
            <button
              className="icon-btn"
              title={view === "sessions" ? "Settings" : "Back to sessions"}
              onClick={() =>
                setView(view === "sessions" ? "settings" : "sessions")
              }
            >
              {view === "sessions" ? <FaCog /> : <FaArrowLeft />}
            </button>
            <a
              className="icon-btn"
              href="https://github.com/Sherly1001/spawner"
              target="_blank"
              rel="noreferrer noopener"
              title="GitHub repository"
            >
              <FaGithub />
            </a>
          </div>
        </div>
        {view === "sessions" && (
          <p className="sub">Multi-login sessions in normal tabs.</p>
        )}
        {view === "settings" && <p className="sub">Settings</p>}
        {view === "sessions" &&
          (current ? (
            <div className="current" style={{ borderColor: current.color }}>
              <span className="dot" style={{ background: current.color }} />
              This tab → <b>{current.name}</b>{" "}
              <span className={`pill ${current.type}`}>{current.type}</span>
              <button className="link" onClick={handleUnassign}>
                unassign
              </button>
            </div>
          ) : (
            <div className="current muted">
              This tab uses real browser cookies.
            </div>
          ))}
      </header>

      {view === "settings" ? (
        <Settings onBack={() => setView("sessions")} />
      ) : (
        <>
          <section className="create">
            <input
              placeholder="New session name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <button className="primary" onClick={() => handleCreate("temp")}>
              <FaPlus /> Temp
            </button>
            <button className="primary" onClick={() => handleCreate("stored")}>
              <FaPlus /> Stored
            </button>
          </section>

          <div className="groups">
            {sessions.length === 0 && (
              <div className="empty">No sessions yet. Create one above.</div>
            )}
            {groups.map(([host, items]) => (
              <div key={host} className="group">
                <div className="group-head">
                  <span className="host" title={host}>
                    {host}
                  </span>
                  <span className="count" title="sessions">
                    {items.length}
                  </span>
                  <button
                    className="icon-btn del"
                    title={`Delete sessions in ${host}`}
                    onClick={() => setGroupDelete({ host, scope: "temp" })}
                  >
                    <FaTrash />
                  </button>
                </div>
                <ul className="sessions">
                  {items.map((s) => (
                    <li key={s.id} className="session">
                      <div className="row1">
                        <span className="dot-wrap">
                          <button
                            type="button"
                            className="dot dot-btn"
                            style={{ background: s.color }}
                            title="Change color"
                            onClick={() =>
                              setColorPickerId(
                                colorPickerId === s.id ? null : s.id,
                              )
                            }
                          />
                          {colorPickerId === s.id && (
                            <div
                              className="color-popover"
                              onMouseLeave={() => setColorPickerId(null)}
                            >
                              {COLORS.map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  className={
                                    "swatch" + (c === s.color ? " active" : "")
                                  }
                                  style={{ background: c }}
                                  title={c}
                                  onClick={() => handleColorChange(s.id, c)}
                                />
                              ))}
                            </div>
                          )}
                        </span>
                        {editingId === s.id ? (
                          <input
                            className="name-edit"
                            autoFocus
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") commitEdit();
                              else if (e.key === "Escape") cancelEdit();
                            }}
                            onBlur={commitEdit}
                          />
                        ) : (
                          <span
                            className="name"
                            title="Click to rename"
                            onClick={() => startEdit(s)}
                          >
                            {s.name}
                          </span>
                        )}
                        <span className={`pill ${s.type}`}>{s.type}</span>
                        <span className="count" title="cookies">
                          {s.cookieCount}
                        </span>
                      </div>
                      <div className="row2">
                        <input
                          placeholder={activeTab?.url || "https://example.com"}
                          value={urlMap[s.id] || ""}
                          onChange={(e) =>
                            setUrlMap({ ...urlMap, [s.id]: e.target.value })
                          }
                          onKeyDown={(e) =>
                            e.key === "Enter" && handleOpen(s.id)
                          }
                        />
                        <button onClick={() => handleOpen(s.id)}>Open</button>
                        {current?.id !== s.id && (
                          <button
                            title="Assign current tab to this session"
                            onClick={() => handleAssign(s.id)}
                          >
                            <FaReply />
                          </button>
                        )}
                        <button
                          className="ghost"
                          title="Clear cookies"
                          onClick={() => handleClear(s.id)}
                        >
                          <FaUndo />
                        </button>
                        <button
                          className="del"
                          title="Delete"
                          onClick={() => handleDelete(s.id)}
                        >
                          <FaTimes />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </>
      )}

      <Dialog
        open={!!dialog}
        title={dialog?.title}
        message={dialog?.message}
        confirmLabel={dialog?.confirmLabel}
        cancelLabel={dialog?.cancelLabel}
        tone={dialog?.tone}
        onConfirm={dialog?.onConfirm}
        onCancel={() => setDialog(null)}
      />

      {groupDelete && (
        <div
          className="dlg-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setGroupDelete(null);
          }}
        >
          <div className="dlg" role="dialog" aria-modal="true">
            <h2 className="dlg-title">Delete sessions in {groupDelete.host}</h2>
            <div className="dlg-radio-group">
              {(["temp", "stored", "both"] as DeleteScope[]).map((opt) => (
                <label key={opt} className="dlg-radio">
                  <input
                    type="radio"
                    name="scope"
                    checked={groupDelete.scope === opt}
                    onChange={() =>
                      setGroupDelete({ ...groupDelete, scope: opt })
                    }
                  />
                  <span>
                    {opt === "both"
                      ? "Both"
                      : opt === "temp"
                        ? "Temp only"
                        : "Stored only"}
                  </span>
                </label>
              ))}
            </div>
            <div className="dlg-actions">
              <button onClick={() => setGroupDelete(null)}>Cancel</button>
              <button className="danger" onClick={confirmGroupDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
