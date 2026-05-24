import { Box, Flex, ScrollArea, Text } from "@mantine/core";
import { modals } from "@mantine/modals";
import { useCallback, useEffect, useState } from "react";
import type { SessionSummary } from "./api";
import * as api from "./api";
import CreateSession from "./components/CreateSession";
import CurrentTabBanner from "./components/CurrentTabBanner";
import Header from "./components/Header";
import SessionList, { type DeleteScope } from "./components/SessionList";
import { addToast, updateToast } from "./toast";
import { isHttp, normalizeUrl, pickColor } from "./util";
import CookiesView from "./views/CookiesView";
import Settings from "./views/Settings";

export type View = "sessions" | "settings" | "cookies";

interface ActiveTab {
  id?: number;
  url?: string;
}

function confirmDanger(
  title: string,
  message: string,
  confirmLabel: string,
  onConfirm: () => void,
) {
  modals.openConfirmModal({
    title,
    centered: true,
    size: 300,
    children: <Text size="sm">{message}</Text>,
    labels: { confirm: confirmLabel, cancel: "Cancel" },
    confirmProps: { color: "red" },
    onConfirm,
  });
}

export default function App() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [current, setCurrent] = useState<SessionSummary | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab | null>(null);
  const [name, setName] = useState("");
  const [urlMap, setUrlMap] = useState<Record<string, string>>({});
  const [view, setView] = useState<View>("sessions");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [cookiesSessionId, setCookiesSessionId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, currentSession, tab] = await Promise.all([
      api.listSessions(),
      api.currentTabSession(),
      api.getActiveTab(),
    ]);
    setSessions(list ?? []);
    setCurrent(currentSession);
    setActiveTab(tab ? { id: tab.id, url: tab.url } : null);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleCreate = async (type: "temp" | "stored") => {
    const fallback = `${type === "temp" ? "Temp" : "Stored"} ${sessions.length + 1}`;
    await api.createSession({
      name: name.trim() || fallback,
      type,
      color: pickColor(),
    });
    setName("");
    refresh();
  };

  const handleOpen = async (sessionId: string) => {
    const url = normalizeUrl(urlMap[sessionId], activeTab?.url);
    await api.openInSession(sessionId, url);
  };

  const handleDelete = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    confirmDanger(
      "Delete session",
      `Remove "${target?.name || "this session"}" and its cookies?`,
      "Delete",
      async () => {
        await api.deleteSession(id);
        refresh();
      },
    );
  };

  const handleClear = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    confirmDanger(
      "Clear cookies",
      `Wipe all cookies in "${target?.name || "this session"}"?`,
      "Clear",
      async () => {
        await api.clearSessionCookies(id);
        refresh();
      },
    );
  };

  const handleAssign = async (sessionId: string) => {
    await api.assignCurrentTab(sessionId);
    refresh();
  };

  const handleToggleType = async (s: SessionSummary) => {
    await api.setSessionType(s.id, s.type === "temp" ? "stored" : "temp");
    refresh();
  };

  const handleFlushIn = async (sessionId: string) => {
    if (!isHttp(activeTab?.url)) return;
    const id = addToast("Pulling cookies…", "loading");
    const res = await api.flushNativeToSession(sessionId, activeTab!.url!);
    if (res?.ok) {
      updateToast(id, `Pulled ${res.count ?? 0} cookies`, "success");
    } else {
      updateToast(id, res?.error || "Pull failed", "error");
    }
    refresh();
  };

  const handleFlushOut = async (sessionId: string) => {
    const id = addToast("Pushing cookies…", "loading");
    const res = await api.flushSessionToNative(sessionId);
    if (res?.ok) {
      updateToast(id, `Pushed ${res.count ?? 0} cookies`, "success");
    } else {
      updateToast(id, res?.error || "Push failed", "error");
    }
    refresh();
  };

  const handleUnassign = async () => {
    await api.unassignCurrentTab();
    refresh();
  };

  const startEdit = (s: SessionSummary) => {
    setEditingId(s.id);
    setEditName(s.name);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
  };

  const commitEdit = async () => {
    const trimmed = editName.trim();
    if (trimmed && editingId) {
      await api.renameSession(editingId, trimmed);
    }
    cancelEdit();
    refresh();
  };

  const handleColorChange = async (sessionId: string, color: string) => {
    setColorPickerId(null);
    await api.setSessionColor(sessionId, color);
    refresh();
  };

  const toggleColorPicker = (id: string) =>
    setColorPickerId(colorPickerId === id ? null : id);

  const openCookies = (id: string) => {
    setCookiesSessionId(id);
    setView("cookies");
  };
  const cookiesSession =
    sessions.find((s) => s.id === cookiesSessionId) ?? null;

  const requestGroupDelete = (
    host: string,
    items: SessionSummary[],
    scope: DeleteScope,
  ) => {
    const matches =
      scope === "both" ? items : items.filter((s) => s.type === scope);
    if (matches.length === 0) return;
    const names = matches.map((m) => m.name).join(", ");
    confirmDanger(
      `Delete ${matches.length} session${matches.length === 1 ? "" : "s"}`,
      `Remove ${scope === "both" ? "all" : scope} session${matches.length === 1 ? "" : "s"} in "${host}"? (${names})`,
      "Delete",
      async () => {
        await Promise.all(matches.map((m) => api.deleteSession(m.id)));
        refresh();
      },
    );
  };

  return (
    <Flex
      direction="column"
      w={360}
      h={560}
      p={8}
      style={{ overflow: "hidden" }}
    >
      <Box component="header">
        <Header
          view={view}
          onToggleSettings={() => {
            if (view === "sessions") setView("settings");
            else {
              if (view === "cookies") refresh();
              setView("sessions");
            }
          }}
        />
        {view === "sessions" && (
          <Text c="dimmed" fz="xs" mt={2} mb="lg">
            Multi-login sessions in normal tabs.
          </Text>
        )}
        {view === "settings" && (
          <Text c="dimmed" fz="xs" mt={2} mb="lg">
            Settings
          </Text>
        )}
        {view === "cookies" && (
          <Text c="dimmed" fz="xs" mt={2} mb="lg">
            Cookies — {cookiesSession?.name ?? ""}
          </Text>
        )}
        {view === "sessions" && (
          <>
            <CurrentTabBanner
              current={current}
              onToggleType={handleToggleType}
              onUnassign={handleUnassign}
            />
            <CreateSession
              name={name}
              onName={setName}
              onCreate={handleCreate}
            />
          </>
        )}
      </Box>

      <ScrollArea type="hover" scrollbarSize={8} h="100%">
        {view === "settings" ? (
          <Settings onBack={() => setView("sessions")} />
        ) : view === "cookies" && cookiesSession ? (
          <CookiesView session={cookiesSession} addToast={addToast} />
        ) : (
          <SessionList
            sessions={sessions}
            currentId={current?.id}
            activeUrl={activeTab?.url}
            editingId={editingId}
            editName={editName}
            colorPickerId={colorPickerId}
            urlMap={urlMap}
            onUrl={(id, v) => setUrlMap({ ...urlMap, [id]: v })}
            onOpen={handleOpen}
            onStartEdit={startEdit}
            onEditName={setEditName}
            onCommitEdit={commitEdit}
            onCancelEdit={cancelEdit}
            onToggleColor={toggleColorPicker}
            onColorChange={handleColorChange}
            onToggleType={handleToggleType}
            onOpenCookies={openCookies}
            onAssign={handleAssign}
            onFlushIn={handleFlushIn}
            onFlushOut={handleFlushOut}
            onClear={handleClear}
            onDelete={handleDelete}
            onGroupDelete={requestGroupDelete}
          />
        )}
      </ScrollArea>
    </Flex>
  );
}
