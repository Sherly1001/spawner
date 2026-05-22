import {
  FaExternalLinkAlt,
  FaReply,
  FaSignInAlt,
  FaSignOutAlt,
  FaTimes,
  FaUndo,
} from "react-icons/fa";
import type { SessionSummary } from "../api";
import { COLORS, isHttp } from "../util";

interface Props {
  session: SessionSummary;
  activeUrl?: string;
  isCurrent: boolean;
  editing: boolean;
  editName: string;
  colorOpen: boolean;
  urlValue: string;
  onUrlChange: (v: string) => void;
  onOpen: () => void;
  onStartEdit: () => void;
  onEditNameChange: (v: string) => void;
  onCommitEdit: () => void;
  onCancelEdit: () => void;
  onToggleColor: () => void;
  onColorChange: (c: string) => void;
  onToggleType: () => void;
  onOpenCookies: () => void;
  onAssign: () => void;
  onFlushIn: () => void;
  onFlushOut: () => void;
  onClear: () => void;
  onDelete: () => void;
}

export default function SessionRow(p: Props) {
  const s = p.session;
  return (
    <li className="session">
      <div className="row1">
        <span className="dot-wrap">
          <button
            type="button"
            className="dot dot-btn"
            style={{ background: s.color }}
            data-tip="Change color"
            aria-label="Change color"
            onClick={p.onToggleColor}
          />
          {p.colorOpen && (
            <div className="color-popover" onMouseLeave={p.onToggleColor}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={"swatch" + (c === s.color ? " active" : "")}
                  style={{ background: c }}
                  data-tip={c}
                  aria-label={c}
                  onClick={() => p.onColorChange(c)}
                />
              ))}
            </div>
          )}
        </span>
        {p.editing ? (
          <input
            className="name-edit"
            autoFocus
            value={p.editName}
            onChange={(e) => p.onEditNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") p.onCommitEdit();
              else if (e.key === "Escape") p.onCancelEdit();
            }}
            onBlur={p.onCommitEdit}
          />
        ) : (
          <span
            className="name"
            data-tip="Click to rename"
            onClick={p.onStartEdit}
          >
            {s.name}
          </span>
        )}
        <button
          type="button"
          className={`pill pill-btn ${s.type}`}
          data-tip="Toggle temp / stored"
          aria-label="Toggle session type"
          onClick={p.onToggleType}
        >
          {s.type}
        </button>
        <button
          type="button"
          className="count count-btn"
          data-tip="View / edit cookies"
          aria-label="View or edit cookies"
          onClick={p.onOpenCookies}
        >
          {s.cookieCount}
        </button>
      </div>
      <div className="row2">
        <input
          placeholder={p.activeUrl || "https://example.com"}
          value={p.urlValue}
          onChange={(e) => p.onUrlChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && p.onOpen()}
        />
      </div>
      <div className="row3">
        <button
          data-tip="Open in session"
          aria-label="Open in session"
          onClick={p.onOpen}
        >
          <FaExternalLinkAlt />
        </button>
        {!p.isCurrent && (
          <button
            data-tip="Assign current tab to this session"
            aria-label="Assign current tab to this session"
            onClick={p.onAssign}
          >
            <FaReply />
          </button>
        )}
        <button
          data-tip={
            isHttp(p.activeUrl)
              ? "Pull this site's browser cookies into session"
              : "Open an http(s) tab to pull cookies"
          }
          aria-label="Pull native cookies into session"
          disabled={!isHttp(p.activeUrl)}
          onClick={p.onFlushIn}
        >
          <FaSignInAlt />
        </button>
        <button
          data-tip="Push session cookies to the real browser"
          aria-label="Push session cookies to native browser"
          disabled={s.cookieCount === 0}
          onClick={p.onFlushOut}
        >
          <FaSignOutAlt />
        </button>
        <button
          className="ghost"
          data-tip="Clear cookies"
          aria-label="Clear cookies"
          onClick={p.onClear}
        >
          <FaUndo />
        </button>
        <button
          className="del"
          data-tip="Delete"
          aria-label="Delete"
          onClick={p.onDelete}
        >
          <FaTimes />
        </button>
      </div>
    </li>
  );
}
