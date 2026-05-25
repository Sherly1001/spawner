import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  TextInput,
} from "@mantine/core";
import { useClipboard, useDisclosure } from "@mantine/hooks";
import { useCallback, useEffect, useState } from "react";
import type { CookieDetail, SessionSummary } from "../api";
import * as api from "../api";
import CookieRow, { type Draft } from "../components/CookieRow";
import {
  type CookieFormat,
  parseCookies,
  serializeCookies,
} from "../cookie-io";
import type { ToastKind } from "../toast";

const FORMAT_DATA = [
  { value: "json", label: "JSON" },
  { value: "header", label: "Header" },
  { value: "netscape", label: "Netscape" },
];

const FORMAT_LABEL: Record<CookieFormat, string> = {
  json: "cookie-editor JSON.",
  header: 'Cookie header string ("a=1; b=2").',
  netscape: "Netscape / cURL cookies.txt.",
};

const IMPORT_PLACEHOLDER: Record<CookieFormat, string> = {
  json: '[ { "name": ..., "value": ..., "domain": ... } ]',
  header: "session=abc; theme=dark",
  netscape: ".example.com\tTRUE\t/\tFALSE\t0\tname\tvalue",
};

interface Props {
  session: SessionSummary;
  addToast: (msg: string, kind: ToastKind) => string;
}

const keyOf = (c: CookieDetail) => `${c.name} ${c.domain} ${c.path || "/"}`;

function blankDraft(domain: string): Draft {
  return {
    name: "",
    value: "",
    domain,
    path: "/",
    secure: false,
    httpOnly: false,
    hostOnly: false,
    sameSite: undefined,
    expires: undefined,
    _new: true,
  };
}

export default function CookiesView({ session, addToast }: Props) {
  const [cookies, setCookies] = useState<CookieDetail[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [origKeys, setOrigKeys] = useState<Record<string, api.CookieKey>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adding, setAdding] = useState<Draft | null>(null);
  const [importOpen, importHandlers] = useDisclosure(false);
  const [importText, setImportText] = useState("");
  const [importFormat, setImportFormat] = useState<CookieFormat>("json");
  const [importDomain, setImportDomain] = useState("");
  const [exportOpen, exportHandlers] = useDisclosure(false);
  const [exportFormat, setExportFormat] = useState<CookieFormat>("json");
  const clipboard = useClipboard({ timeout: 1500 });

  const load = useCallback(async () => {
    const res = await api.listSessionCookies(session.id);
    setCookies(res?.cookies ?? []);
  }, [session.id]);

  useEffect(() => {
    load();
  }, [load]);

  const draftFor = (c: CookieDetail): Draft => drafts[keyOf(c)] ?? { ...c };

  const editDraft = (c: CookieDetail, next: Draft) => {
    const k = keyOf(c);
    setDrafts((d) => ({ ...d, [k]: next }));
    if (!origKeys[k]) {
      setOrigKeys((o) => ({
        ...o,
        [k]: { name: c.name, domain: c.domain, path: c.path || "/" },
      }));
    }
  };

  const saveCookie = async (draft: Draft, oldKey?: api.CookieKey) => {
    const { _new, ...cookie } = draft;
    const res = await api.upsertSessionCookie(session.id, cookie, oldKey);
    setCookies(res?.cookies ?? []);
    const saved = (res?.cookies ?? []).some(
      (c) =>
        c.name === cookie.name &&
        c.domain === cookie.domain.replace(/^\./, "") &&
        (c.path || "/") === (cookie.path || "/"),
    );
    if (!res?.ok || !saved) {
      addToast(`Couldn't save "${cookie.name}"`, "error");
    } else {
      addToast(`${_new ? "Added" : "Saved"} "${cookie.name}"`, "success");
    }
  };

  const onSaveExisting = async (c: CookieDetail) => {
    const k = keyOf(c);
    const draft = drafts[k] ?? { ...c };
    await saveCookie(draft, origKeys[k]);
    setDrafts((d) => {
      const { [k]: _, ...rest } = d;
      return rest;
    });
    setOrigKeys((o) => {
      const { [k]: _, ...rest } = o;
      return rest;
    });
    setExpanded(null);
  };

  const onDeleteExisting = async (c: CookieDetail) => {
    const res = await api.deleteSessionCookie(session.id, {
      name: c.name,
      domain: c.domain,
      path: c.path || "/",
    });
    setCookies(res?.cookies ?? []);
    addToast(`Deleted "${c.name}"`, "success");
    setExpanded(null);
  };

  const onSaveNew = async () => {
    if (!adding) return;
    await saveCookie(adding);
    setAdding(null);
  };

  const exportText = serializeCookies(cookies, exportFormat);

  const openImport = () => {
    setImportText("");
    setImportDomain(session.domains[0] ?? "");
    importHandlers.open();
  };

  const onImport = async () => {
    let parsed: CookieDetail[];
    try {
      parsed = parseCookies(importText, importFormat, importDomain.trim());
    } catch {
      addToast("Couldn't parse cookies", "error");
      return;
    }
    if (parsed.length === 0) {
      addToast("No cookies to import", "error");
      return;
    }
    const res = await api.importSessionCookies(session.id, parsed);
    if (!res?.ok) {
      addToast("Import failed", "error");
      return;
    }
    setCookies(res.cookies ?? []);
    addToast(`Imported ${res.count} cookies`, "success");
    importHandlers.close();
    setImportText("");
  };

  return (
    <Stack gap="xs" py="xs">
      {cookies.length === 0 && !adding && (
        <Text c="dimmed" fz="sm" ta="center" fs="italic" py="md">
          No cookies in this session.
        </Text>
      )}
      <Stack gap={4}>
        {cookies.map((c) => {
          const k = keyOf(c);
          return (
            <CookieRow
              key={k}
              cookie={draftFor(c)}
              expanded={expanded === k}
              onToggle={() => setExpanded(expanded === k ? null : k)}
              onChange={(next) => editDraft(c, next)}
              onSave={() => onSaveExisting(c)}
              onDelete={() => onDeleteExisting(c)}
            />
          );
        })}
        {adding && (
          <CookieRow
            cookie={adding}
            expanded
            onToggle={() => setAdding(null)}
            onChange={setAdding}
            onSave={onSaveNew}
            onDelete={() => setAdding(null)}
          />
        )}
      </Stack>
      {!adding && (
        <Group gap="xs">
          <Button
            variant="light"
            onClick={() => {
              setAdding(blankDraft(session.domains[0] ?? ""));
              setExpanded(null);
            }}
          >
            + add cookie
          </Button>
          <Button variant="light" onClick={openImport}>
            Import
          </Button>
          <Button
            variant="light"
            disabled={cookies.length === 0}
            onClick={exportHandlers.open}
          >
            Export
          </Button>
        </Group>
      )}

      <Modal
        opened={importOpen}
        onClose={importHandlers.close}
        title="Import cookies"
        centered
        size="lg"
      >
        <Stack gap="sm">
          <SegmentedControl
            size="xs"
            fullWidth
            data={FORMAT_DATA}
            value={importFormat}
            onChange={(v) => setImportFormat(v as CookieFormat)}
          />
          <Text c="dimmed" fz="xs">
            {FORMAT_LABEL[importFormat]} Cookies merge into this session
            (existing ones with the same name/domain/path are overwritten).
          </Text>
          {importFormat === "header" && (
            <TextInput
              size="xs"
              label="domain"
              description="Header strings carry no domain; cookies are placed here."
              value={importDomain}
              onChange={(e) => setImportDomain(e.currentTarget.value)}
            />
          )}
          <Textarea
            autosize
            minRows={6}
            maxRows={12}
            placeholder={IMPORT_PLACEHOLDER[importFormat]}
            value={importText}
            onChange={(e) => setImportText(e.currentTarget.value)}
            styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
          />
          <Button disabled={importText.trim() === ""} onClick={onImport}>
            Import
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={exportOpen}
        onClose={exportHandlers.close}
        title={`Export cookies (${cookies.length})`}
        centered
        size="lg"
      >
        <Stack gap="sm">
          <SegmentedControl
            size="xs"
            fullWidth
            data={FORMAT_DATA}
            value={exportFormat}
            onChange={(v) => setExportFormat(v as CookieFormat)}
          />
          <Text c="dimmed" fz="xs">
            {FORMAT_LABEL[exportFormat]}
          </Text>
          <Textarea
            readOnly
            autosize
            minRows={6}
            maxRows={12}
            value={exportText}
            onFocus={(e) => e.currentTarget.select()}
            styles={{ input: { fontFamily: "monospace", fontSize: 12 } }}
          />
          <Button onClick={() => clipboard.copy(exportText)}>
            {clipboard.copied ? "Copied!" : "Copy"}
          </Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
