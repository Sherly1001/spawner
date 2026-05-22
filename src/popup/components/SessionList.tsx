import { useMemo } from "react";
import { FaTrash } from "react-icons/fa";
import type { SessionSummary } from "../api";
import SessionRow from "./SessionRow";

export type DeleteScope = "temp" | "stored" | "both";

const UNASSIGNED = "(no cookies)";

interface Props {
  sessions: SessionSummary[];
  currentId?: string;
  activeUrl?: string;
  editingId: string | null;
  editName: string;
  colorPickerId: string | null;
  urlMap: Record<string, string>;
  onUrl: (id: string, v: string) => void;
  onOpen: (id: string) => void;
  onStartEdit: (s: SessionSummary) => void;
  onEditName: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onToggleColor: (id: string) => void;
  onColorChange: (id: string, c: string) => void;
  onToggleType: (s: SessionSummary) => void;
  onOpenCookies: (id: string) => void;
  onAssign: (id: string) => void;
  onFlushIn: (id: string) => void;
  onFlushOut: (id: string) => void;
  onClear: (id: string) => void;
  onDelete: (id: string) => void;
  onGroupDelete: (
    host: string,
    items: SessionSummary[],
    scope: DeleteScope,
  ) => void;
}

export default function SessionList(p: Props) {
  const groups = useMemo(() => {
    const map = new Map<string, SessionSummary[]>();
    for (const s of p.sessions) {
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
  }, [p.sessions]);

  return (
    <div className="groups">
      {p.sessions.length === 0 && (
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
                  onClick={() => p.onGroupDelete(host, items, scope)}
                >
                  <FaTrash />
                  <span className="del-badge">{badge}</span>
                </button>
              );
            })}
          </div>
          <ul className="sessions">
            {items.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                activeUrl={p.activeUrl}
                isCurrent={p.currentId === s.id}
                editing={p.editingId === s.id}
                editName={p.editName}
                colorOpen={p.colorPickerId === s.id}
                urlValue={p.urlMap[s.id] || ""}
                onUrlChange={(v) => p.onUrl(s.id, v)}
                onOpen={() => p.onOpen(s.id)}
                onStartEdit={() => p.onStartEdit(s)}
                onEditNameChange={p.onEditName}
                onCommitEdit={p.onCommitEdit}
                onCancelEdit={p.onCancelEdit}
                onToggleColor={() => p.onToggleColor(s.id)}
                onColorChange={(c) => p.onColorChange(s.id, c)}
                onToggleType={() => p.onToggleType(s)}
                onOpenCookies={() => p.onOpenCookies(s.id)}
                onAssign={() => p.onAssign(s.id)}
                onFlushIn={() => p.onFlushIn(s.id)}
                onFlushOut={() => p.onFlushOut(s.id)}
                onClear={() => p.onClear(s.id)}
                onDelete={() => p.onDelete(s.id)}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
