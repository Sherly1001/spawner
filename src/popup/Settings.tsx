import { useEffect, useState } from "react";
import * as api from "./api";
import type { Settings as SettingsValue } from "./api";

interface ToggleProps {
  checked: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
}

function Toggle({ checked, onChange, disabled }: ToggleProps) {
  return (
    <button
      className={"toggle" + (checked ? " on" : "")}
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    >
      <span className="thumb" />
    </button>
  );
}

export default function Settings(_props: { onBack: () => void }) {
  const [settings, setSettings] = useState<SettingsValue | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.getSettings().then((s) => setSettings(s ?? null));
  }, []);

  const update = async (patch: Partial<SettingsValue>) => {
    setSaving(true);
    const next = await api.setSettings(patch);
    setSettings(next);
    setSaving(false);
  };

  if (!settings) {
    return (
      <div className="settings">
        <p className="muted">Loading…</p>
      </div>
    );
  }

  return (
    <div className="settings">
      <div className="setting-row">
        <div className="setting-text">
          <div className="setting-label">
            Prefix tab title with session name
          </div>
          <div className="setting-desc">
            Shows <code>[Session]&nbsp;page&nbsp;title</code> in the tab strip
            so you can tell which session a tab belongs to at a glance.
          </div>
        </div>
        <Toggle
          checked={!!settings.prefixTabName}
          disabled={saving}
          onChange={(v) => update({ prefixTabName: v })}
        />
      </div>

      <div className="setting-row">
        <div className="setting-text">
          <div className="setting-label">
            Colorize extension icon by session
          </div>
          <div className="setting-desc">
            On: normal tabs show a gray icon, session tabs show the session's
            color. Off: icon is always blue.
          </div>
        </div>
        <Toggle
          checked={settings.colorizeIcon !== false}
          disabled={saving}
          onChange={(v) => update({ colorizeIcon: v })}
        />
      </div>
    </div>
  );
}
