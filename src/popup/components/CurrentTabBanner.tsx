import {
  Anchor,
  Badge,
  ColorSwatch,
  Group,
  Paper,
  Text,
  Tooltip,
} from "@mantine/core";
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
      <Paper withBorder p="xs" mb="lg" radius="md">
        <Text c="dimmed" fz="xs">
          This tab uses real browser cookies.
        </Text>
      </Paper>
    );
  }
  return (
    <Paper
      withBorder
      p="xs"
      mb="lg"
      radius="md"
      style={{ borderLeft: `3px solid ${current.color}` }}
    >
      <Group gap="xs" wrap="nowrap">
        <ColorSwatch color={current.color} size={10} withShadow={false} />
        <Text fz="xs" style={{ flex: 1, minWidth: 0 }} truncate>
          This tab → <b>{current.name}</b>
        </Text>
        <Tooltip label="Toggle temp / stored">
          <Badge
            component="button"
            color={current.type === "temp" ? "yellow" : "blue"}
            variant="light"
            style={{ cursor: "pointer" }}
            onClick={() => onToggleType(current)}
          >
            {current.type}
          </Badge>
        </Tooltip>
        <Anchor component="button" fz="xs" onClick={onUnassign}>
          unassign
        </Anchor>
      </Group>
    </Paper>
  );
}
