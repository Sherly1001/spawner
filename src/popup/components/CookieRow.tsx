import type { CookieDetail } from "../api";

export type Draft = CookieDetail & { _new?: boolean };

function toLocalInput(epochSec?: number): string {
  if (epochSec == null) return "";
  const d = new Date(epochSec * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function fromLocalInput(v: string): number | undefined {
  if (!v) return undefined;
  const ms = Date.parse(v);
  return Number.isNaN(ms) ? undefined : Math.floor(ms / 1000);
}

interface Props {
  cookie: Draft;
  expanded: boolean;
  onToggle: () => void;
  onChange: (next: Draft) => void;
  onSave: () => void;
  onDelete: () => void;
}

export default function CookieRow({
  cookie,
  expanded,
  onToggle,
  onChange,
  onSave,
  onDelete,
}: Props) {
  const set = (patch: Partial<Draft>) => onChange({ ...cookie, ...patch });
  const session = cookie.expires == null;
  const canSave = cookie.name.trim() !== "" && cookie.domain.trim() !== "";

  return (
    <li className="cookie">
      <button
        type="button"
        className="cookie-head"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="cookie-name">{cookie.name || "(new cookie)"}</span>
        <span className="cookie-domain">{cookie.domain}</span>
        <span className="cookie-chevron">{expanded ? "▾" : "▸"}</span>
      </button>
      {expanded && (
        <div className="cookie-form">
          <label>
            name
            <input
              value={cookie.name}
              onChange={(e) => set({ name: e.target.value })}
            />
          </label>
          <label>
            value
            <input
              value={cookie.value}
              onChange={(e) => set({ value: e.target.value })}
            />
          </label>
          <label>
            domain
            <input
              value={cookie.domain}
              onChange={(e) => set({ domain: e.target.value })}
            />
          </label>
          <label>
            path
            <input
              value={cookie.path}
              onChange={(e) => set({ path: e.target.value })}
            />
          </label>
          <label className="cookie-check">
            <input
              type="checkbox"
              checked={session}
              onChange={(e) =>
                set({
                  expires: e.target.checked
                    ? undefined
                    : Math.floor(Date.now() / 1000) + 86400,
                })
              }
            />
            session cookie (no expiry)
          </label>
          {!session && (
            <label>
              expires
              <input
                type="datetime-local"
                value={toLocalInput(cookie.expires)}
                onChange={(e) =>
                  set({ expires: fromLocalInput(e.target.value) })
                }
              />
            </label>
          )}
          <label className="cookie-check">
            <input
              type="checkbox"
              checked={cookie.secure}
              onChange={(e) => set({ secure: e.target.checked })}
            />
            secure
          </label>
          <label className="cookie-check">
            <input
              type="checkbox"
              checked={cookie.httpOnly}
              onChange={(e) => set({ httpOnly: e.target.checked })}
            />
            httpOnly
          </label>
          <label className="cookie-check">
            <input
              type="checkbox"
              checked={cookie.hostOnly}
              onChange={(e) => set({ hostOnly: e.target.checked })}
            />
            host-only
          </label>
          <label>
            sameSite
            <select
              value={cookie.sameSite ?? ""}
              onChange={(e) =>
                set({
                  sameSite: (e.target.value ||
                    undefined) as CookieDetail["sameSite"],
                })
              }
            >
              <option value="">—</option>
              <option value="lax">lax</option>
              <option value="strict">strict</option>
              <option value="none">none</option>
            </select>
          </label>
          <div className="cookie-actions">
            <button className="primary" disabled={!canSave} onClick={onSave}>
              Save
            </button>
            <button className="del" onClick={onDelete}>
              Delete
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
