import type { SessionSummary } from "../api";

interface Props {
  current: SessionSummary | null;
  onToggleType: (s: SessionSummary) => void;
  onUnassign: () => void;
}

export default function CurrentTabBanner({
  current,
  onToggleType,
  onUnassign,
}: Props) {
  if (!current) {
    return (
      <div className="current muted">This tab uses real browser cookies.</div>
    );
  }
  return (
    <div className="current" style={{ borderColor: current.color }}>
      <span className="dot" style={{ background: current.color }} />
      This tab → <b>{current.name}</b>{" "}
      <button
        type="button"
        className={`pill pill-btn ${current.type}`}
        data-tip="Toggle temp / stored"
        aria-label="Toggle session type"
        onClick={() => onToggleType(current)}
      >
        {current.type}
      </button>
      <button className="link" onClick={onUnassign}>
        unassign
      </button>
    </div>
  );
}
