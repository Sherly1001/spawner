import {
  Badge,
  ColorSwatch,
  Group,
  Paper,
  Popover,
  SimpleGrid,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
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
import IconButton from "./IconButton";

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
  const httpActive = isHttp(p.activeUrl);
  return (
    <Paper withBorder p="xs" radius="md">
      <Stack gap={5}>
        <Group gap="xs" wrap="nowrap">
          <Popover
            opened={p.colorOpen}
            onChange={(o) => !o && p.onToggleColor()}
            position="bottom-start"
            withArrow
          >
            <Popover.Target>
              <Tooltip label="Change color">
                <ColorSwatch
                  component="button"
                  color={s.color}
                  size={12}
                  aria-label="Change color"
                  style={{ cursor: "pointer" }}
                  onClick={p.onToggleColor}
                />
              </Tooltip>
            </Popover.Target>
            <Popover.Dropdown p={6}>
              <SimpleGrid cols={4} spacing={6}>
                {COLORS.map((c) => (
                  <Tooltip key={c} label={c}>
                    <ColorSwatch
                      component="button"
                      color={c}
                      size={16}
                      aria-label={c}
                      style={{ cursor: "pointer" }}
                      onClick={() => p.onColorChange(c)}
                    />
                  </Tooltip>
                ))}
              </SimpleGrid>
            </Popover.Dropdown>
          </Popover>

          {p.editing ? (
            <TextInput
              size="xs"
              autoFocus
              style={{ flex: 1 }}
              value={p.editName}
              onChange={(e) => p.onEditNameChange(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") p.onCommitEdit();
                else if (e.key === "Escape") p.onCancelEdit();
              }}
              onBlur={p.onCommitEdit}
            />
          ) : (
            <Tooltip label="Click to rename">
              <Text
                fz="sm"
                fw={500}
                truncate
                style={{ flex: 1, minWidth: 0, cursor: "text" }}
                onClick={p.onStartEdit}
              >
                {s.name}
              </Text>
            </Tooltip>
          )}

          <Tooltip label="Toggle temp / stored">
            <Badge
              component="button"
              color={s.type === "temp" ? "yellow" : "blue"}
              variant="light"
              style={{ cursor: "pointer" }}
              onClick={p.onToggleType}
            >
              {s.type}
            </Badge>
          </Tooltip>
          <Tooltip label="View / edit cookies">
            <Badge
              component="button"
              color="gray"
              variant="light"
              style={{ cursor: "pointer" }}
              onClick={p.onOpenCookies}
            >
              {s.cookieCount}
            </Badge>
          </Tooltip>
        </Group>

        <TextInput
          size="xs"
          placeholder={p.activeUrl || "https://example.com"}
          value={p.urlValue}
          onChange={(e) => p.onUrlChange(e.currentTarget.value)}
          onKeyDown={(e) => e.key === "Enter" && p.onOpen()}
        />

        <Group grow gap={4} wrap="nowrap">
          <IconButton
            label="Open in session"
            variant="light"
            onClick={p.onOpen}
          >
            <FaExternalLinkAlt />
          </IconButton>
          {!p.isCurrent && (
            <IconButton
              label="Assign current tab to this session"
              variant="light"
              onClick={p.onAssign}
            >
              <FaReply />
            </IconButton>
          )}
          <IconButton
            label={
              httpActive
                ? "Pull this site's browser cookies into session"
                : "Open an http(s) tab to pull cookies"
            }
            variant="light"
            disabled={!httpActive}
            onClick={p.onFlushIn}
          >
            <FaSignInAlt />
          </IconButton>
          <IconButton
            label="Push session cookies to the real browser"
            variant="light"
            disabled={s.cookieCount === 0}
            onClick={p.onFlushOut}
          >
            <FaSignOutAlt />
          </IconButton>
          <IconButton
            label="Clear cookies"
            variant="light"
            color="gray"
            onClick={p.onClear}
          >
            <FaUndo />
          </IconButton>
          <IconButton
            label="Delete"
            variant="light"
            color="red"
            onClick={p.onDelete}
          >
            <FaTimes />
          </IconButton>
        </Group>
      </Stack>
    </Paper>
  );
}
