import {
  Box,
  Collapse,
  Group,
  Paper,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useMemo, useState } from "react";
import { FaChevronRight, FaTrash } from "react-icons/fa";
import type { SessionSummary } from "../api";
import IconButton from "./IconButton";
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
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (host: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(host)) next.delete(host);
      else next.add(host);
      return next;
    });

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

  const splits: [DeleteScope, string, string][] = [
    ["temp", "T", "Delete temp sessions"],
    ["stored", "S", "Delete stored sessions"],
    ["both", "*", "Delete all sessions"],
  ];

  return (
    <Stack gap="lg">
      {p.sessions.length === 0 && (
        <Text c="dimmed" fz="sm" ta="center" fs="italic" py="md">
          No sessions yet. Create one above.
        </Text>
      )}
      {groups.map(([host, items]) => {
        const isCollapsed = collapsed.has(host);
        return (
          <Paper key={host} withBorder bg="gray.0" p={8} radius="lg">
            <Group gap="xs" wrap="nowrap" mb={isCollapsed ? 0 : 6}>
              <IconButton
                label={isCollapsed ? "Expand" : "Collapse"}
                size="sm"
                onClick={() => toggle(host)}
                style={{
                  transition: "transform 120ms ease",
                  transform: isCollapsed ? "none" : "rotate(90deg)",
                }}
              >
                <FaChevronRight />
              </IconButton>
              <Text
                fz="xs"
                fw={600}
                truncate
                style={{ flex: 1, minWidth: 0, cursor: "pointer" }}
                onClick={() => toggle(host)}
              >
                {host}
              </Text>
              <Tooltip label="sessions">
                <Text fz="xs" c="dimmed">
                  {items.length}
                </Text>
              </Tooltip>
              {splits.map(([scope, badge, tip]) => {
                const count =
                  scope === "both"
                    ? items.length
                    : items.filter((s) => s.type === scope).length;
                return (
                  <IconButton
                    key={scope}
                    label={`${tip} in ${host}`}
                    color="red"
                    size="sm"
                    w="auto"
                    px={4}
                    disabled={count === 0}
                    onClick={() => p.onGroupDelete(host, items, scope)}
                  >
                    <FaTrash />
                    <Box component="span" fz={9} fw={700} ml={1}>
                      {badge}
                    </Box>
                  </IconButton>
                );
              })}
            </Group>
            <Collapse expanded={!isCollapsed}>
              <Stack gap={6}>
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
              </Stack>
            </Collapse>
          </Paper>
        );
      })}
    </Stack>
  );
}
