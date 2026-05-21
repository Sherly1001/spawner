import { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaArrowLeft,
  FaCog,
  FaExternalLinkAlt,
  FaGithub,
  FaReply,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaTrash,
  FaUndo,
} from "react-icons/fa";
import { LuCircleFadingPlus, LuCirclePlus } from "react-icons/lu";
import * as api from "./api";
import type { SessionSummary } from "./api";
import Dialog, { type DialogTone } from "./Dialog";
import Settings from "./Settings";
import TooltipLayer from "./Tooltip";

const COLORS = [
  "#ff757f",
  "#ffc777",
  "#c3e88d",
  "#86e1fc",
  "#82aaff",
  "#c099ff",
  "#c53b53",
  "#3e68d7",
];

const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

function normalizeUrl(input: string | undefined, fallback?: string): string {
  const value = (input || "").trim();
  if (!value) return fallback || "about:blank";
  if (/^(https?|file|about):/i.test(value)) return value;
  return "https://" + value;
}

const isHttp = (u?: string) => /^https?:\/\//i.test(u || "");

const UNASSIGNED = "(no cookies)";

type DeleteScope = "temp" | "stored" | "both";

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

  const handleToggleType = async (s: SessionSummary) => {
    await api.setSessionType(s.id, s.type === "temp" ? "stored" : "temp");
    refresh();
  };

  const handleFlushIn = async (sessionId: string) => {
    if (!isHttp(activeTab?.url)) return;
    await api.flushNativeToSession(sessionId, activeTab!.url!);
    refresh();
  };

  const handleFlushOut = async (sessionId: string) => {
    await api.flushSessionToNative(sessionId);
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

  const groups = useMemo(() => {
    const map = new Map<string, SessionSummary[]>();
    for (const s of sessions) {
      const keys = s.domains.length > 0 ? s.domains : [UNASSIGNED];
      for (const k of keys) {
        const arr = map.get(k);
        if (arr) arr.push(s);
        else map.set(k, [s]);
      }
    }
    const naturalCompare = (a: string, b: string) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    for (const items of map.values()) {
      items.sort((a, b) => {
        if (a.type !== b.type) return a.type === "stored" ? -1 : 1;
        return naturalCompare(a.name, b.name);
      });
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === UNASSIGNED) return -1;
      if (b === UNASSIGNED) return 1;
      return naturalCompare(a, b);
    });
  }, [sessions]);

  const requestGroupDelete = (
    host: string,
    items: SessionSummary[],
    scope: DeleteScope,
  ) => {
    const matches =
      scope === "both" ? items : items.filter((s) => s.type === scope);
    if (matches.length === 0) return;
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
              data-tip={view === "sessions" ? "Settings" : "Back to sessions"}
              aria-label={view === "sessions" ? "Settings" : "Back to sessions"}
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
              data-tip="GitHub repository"
              aria-label="GitHub repository"
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
              <button
                type="button"
                className={`pill pill-btn ${current.type}`}
                data-tip="Toggle temp / stored"
                aria-label="Toggle session type"
                onClick={() => handleToggleType(current)}
              >
                {current.type}
              </button>
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
            <button
              className="primary"
              data-tip="New temp session"
              aria-label="New temp session"
              onClick={() => handleCreate("temp")}
            >
              <LuCircleFadingPlus />
            </button>
            <button
              className="primary"
              data-tip="New stored session"
              aria-label="New stored session"
              onClick={() => handleCreate("stored")}
            >
              <LuCirclePlus />
            </button>
          </section>

          <div className="groups">
            {sessions.length === 0 && (
              <div className="empty">No sessions yet. Create one above.</div>
            )}
            {groups.map(([host, items]) => (
              <div key={host} className="group">
                <div className="group-head">
                  <span className="host" data-tip={host}>
                    {host}
                  </span>
                  <span className="count" data-tip="sessions">
                    {items.length}
                  </span>
                  {(
                    [
                      ["temp", "T", "Delete temp sessions"],
                      ["stored", "S", "Delete stored sessions"],
                      ["both", "*", "Delete all sessions"],
                    ] as [DeleteScope, string, string][]
                  ).map(([scope, badge, tip]) => {
                    const count =
                      scope === "both"
                        ? items.length
                        : items.filter((s) => s.type === scope).length;
                    return (
                      <button
                        key={scope}
                        className="icon-btn del del-split"
                        data-tip={`${tip} in ${host}`}
                        aria-label={`${tip} in ${host}`}
                        disabled={count === 0}
                        onClick={() => requestGroupDelete(host, items, scope)}
                      >
                        <FaTrash />
                        <span className="del-badge">{badge}</span>
                      </button>
                    );
                  })}
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
                            data-tip="Change color"
                            aria-label="Change color"
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
                                  data-tip={c}
                                  aria-label={c}
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
                            data-tip="Click to rename"
                            onClick={() => startEdit(s)}
                          >
                            {s.name}
                          </span>
                        )}
                        <button
                          type="button"
                          className={`pill pill-btn ${s.type}`}
                          data-tip="Toggle temp / stored"
                          aria-label="Toggle session type"
                          onClick={() => handleToggleType(s)}
                        >
                          {s.type}
                        </button>
                        <span className="count" data-tip="cookies">
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
                      </div>
                      <div className="row3">
                        <button
                          data-tip="Open in session"
                          aria-label="Open in session"
                          onClick={() => handleOpen(s.id)}
                        >
                          <FaExternalLinkAlt />
                        </button>
                        {current?.id !== s.id && (
                          <button
                            data-tip="Assign current tab to this session"
                            aria-label="Assign current tab to this session"
                            onClick={() => handleAssign(s.id)}
                          >
                            <FaReply />
                          </button>
                        )}
                        <button
                          data-tip={
                            isHttp(activeTab?.url)
                              ? "Pull this site's browser cookies into session"
                              : "Open an http(s) tab to pull cookies"
                          }
                          aria-label="Pull native cookies into session"
                          disabled={!isHttp(activeTab?.url)}
                          onClick={() => handleFlushIn(s.id)}
                        >
                          <FaSignInAlt />
                        </button>
                        <button
                          data-tip="Push session cookies to the real browser"
                          aria-label="Push session cookies to native browser"
                          disabled={s.cookieCount === 0}
                          onClick={() => handleFlushOut(s.id)}
                        >
                          <FaSignOutAlt />
                        </button>
                        <button
                          className="ghost"
                          data-tip="Clear cookies"
                          aria-label="Clear cookies"
                          onClick={() => handleClear(s.id)}
                        >
                          <FaUndo />
                        </button>
                        <button
                          className="del"
                          data-tip="Delete"
                          aria-label="Delete"
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

      <TooltipLayer />

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
    </div>
  );
}
