import {
  Button,
  Checkbox,
  Collapse,
  Group,
  Paper,
  Select,
  Stack,
  Text,
  TextInput,
  UnstyledButton,
} from "@mantine/core";
import { DateTimePicker } from "@mantine/dates";
import dayjs from "dayjs";
import { FaChevronRight } from "react-icons/fa";
import type { CookieDetail } from "../api";

// Mantine Select dislikes an empty-string option value; use a sentinel.
const SAMESITE_DATA = [
  { value: "unset", label: "—" },
  { value: "lax", label: "lax" },
  { value: "strict", label: "strict" },
  { value: "none", label: "none" },
];

export type Draft = CookieDetail & { _new?: boolean };

const toPicker = (epochSec?: number): string | null =>
  epochSec == null ? null : dayjs.unix(epochSec).format("YYYY-MM-DD HH:mm:ss");

const fromPicker = (v: string | null): number | undefined =>
  v ? dayjs(v).unix() : undefined;

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
    <Paper withBorder radius="md">
      <UnstyledButton
        w="100%"
        px={8}
        py={7}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <Group gap="xs" wrap="nowrap">
          <Text fz="sm" fw={600} truncate style={{ minWidth: 0 }}>
            {cookie.name || "(new cookie)"}
          </Text>
          <Text fz="xs" c="dimmed" truncate style={{ marginLeft: "auto" }}>
            {cookie.domain}
          </Text>
          <Text
            component="span"
            c="dimmed"
            fz="xs"
            style={{
              display: "inline-flex",
              transition: "transform 120ms ease",
              transform: expanded ? "rotate(90deg)" : "none",
            }}
          >
            <FaChevronRight />
          </Text>
        </Group>
      </UnstyledButton>
      <Collapse expanded={expanded}>
        <Stack gap={6} px={8} pb={10}>
          <TextInput
            label="name"
            value={cookie.name}
            onChange={(e) => set({ name: e.currentTarget.value })}
          />
          <TextInput
            label="value"
            value={cookie.value}
            onChange={(e) => set({ value: e.currentTarget.value })}
          />
          <TextInput
            label="domain"
            value={cookie.domain}
            onChange={(e) => set({ domain: e.currentTarget.value })}
          />
          <TextInput
            label="path"
            value={cookie.path}
            onChange={(e) => set({ path: e.currentTarget.value })}
          />
          <Checkbox
            label="session cookie (no expiry)"
            checked={session}
            onChange={(e) =>
              set({
                expires: e.currentTarget.checked
                  ? undefined
                  : Math.floor(Date.now() / 1000) + 86400,
              })
            }
          />
          {!session && (
            <DateTimePicker
              size="xs"
              label="expires"
              valueFormat="YYYY-MM-DD HH:mm"
              value={toPicker(cookie.expires)}
              onChange={(v) => set({ expires: fromPicker(v) })}
            />
          )}
          <Checkbox
            label="secure"
            checked={cookie.secure}
            onChange={(e) => set({ secure: e.currentTarget.checked })}
          />
          <Checkbox
            label="httpOnly"
            checked={cookie.httpOnly}
            onChange={(e) => set({ httpOnly: e.currentTarget.checked })}
          />
          <Checkbox
            label="host-only"
            checked={cookie.hostOnly}
            onChange={(e) => set({ hostOnly: e.currentTarget.checked })}
          />
          <Select
            label="sameSite"
            data={SAMESITE_DATA}
            value={(cookie.sameSite ?? "unset") as string}
            allowDeselect={false}
            onChange={(v) =>
              set({
                sameSite:
                  !v || v === "unset"
                    ? undefined
                    : (v as CookieDetail["sameSite"]),
              })
            }
          />
          <Group gap="xs" mt={4}>
            <Button disabled={!canSave} onClick={onSave}>
              Save
            </Button>
            <Button color="red" variant="light" onClick={onDelete}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Collapse>
    </Paper>
  );
}
