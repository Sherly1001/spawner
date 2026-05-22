import { FaArrowLeft, FaCog, FaGithub } from "react-icons/fa";
import type { View } from "../App";

interface Props {
  view: View;
  onToggleSettings: () => void;
}

export default function Header({ view, onToggleSettings }: Props) {
  const onSessions = view === "sessions";
  return (
    <div className="title-row">
      <h1>Spawner</h1>
      <div className="title-actions">
        <button
          className="icon-btn"
          data-tip={onSessions ? "Settings" : "Back to sessions"}
          aria-label={onSessions ? "Settings" : "Back to sessions"}
          onClick={onToggleSettings}
        >
          {onSessions ? <FaCog /> : <FaArrowLeft />}
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
  );
}
