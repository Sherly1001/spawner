import { Button, Stack, Text } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
import type { CookieDetail, SessionSummary } from "../api";
import * as api from "../api";
import CookieRow, { type Draft } from "../components/CookieRow";
import type { ToastKind } from "../toast";

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
        <Button
          variant="light"
          style={{ alignSelf: "flex-start" }}
          onClick={() => {
            setAdding(blankDraft(session.domains[0] ?? ""));
            setExpanded(null);
          }}
        >
          + add cookie
        </Button>
      )}
    </Stack>
  );
}
