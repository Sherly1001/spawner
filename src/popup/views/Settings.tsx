import { Box, Code, Group, Paper, Stack, Switch, Text } from "@mantine/core";
import { useEffect, useState } from "react";
import type { Settings as SettingsValue } from "../api";
import * as api from "../api";

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
      <Text c="dimmed" fz="sm">
        Loading…
      </Text>
    );
  }

  return (
    <Stack gap="sm">
      <Paper withBorder p="sm" radius="md">
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} fz="xs">
              Prefix tab title with session name
            </Text>
            <Text c="dimmed" fz="xs" mt={4}>
              Shows <Code fz="10px">[Session]&nbsp;page&nbsp;title</Code> in the
              tab strip so you can tell which session a tab belongs to at a
              glance.
            </Text>
          </Box>
          <Switch
            checked={!!settings.prefixTabName}
            disabled={saving}
            onChange={(e) => update({ prefixTabName: e.currentTarget.checked })}
          />
        </Group>
      </Paper>

      <Paper withBorder p="sm" radius="md">
        <Group justify="space-between" wrap="nowrap" gap="md">
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Text fw={500} fz="xs">
              Colorize extension icon by session
            </Text>
            <Text c="dimmed" fz="xs" mt={4}>
              On: normal tabs show a gray icon, session tabs show the session's
              color. Off: icon is always blue.
            </Text>
          </Box>
          <Switch
            checked={settings.colorizeIcon !== false}
            disabled={saving}
            onChange={(e) => update({ colorizeIcon: e.currentTarget.checked })}
          />
        </Group>
      </Paper>
    </Stack>
  );
}
