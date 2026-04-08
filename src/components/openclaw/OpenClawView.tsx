import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useOpenClawPersistence } from "./useOpenClawPersistence";
import { useOpenClawStreaming } from "./useOpenClawStreaming";
import { useOpenClawSessionSync } from "./useOpenClawSessionSync";
import { useOpenClawStatus } from "./useOpenClawStatus";
import OpenClawStatusPill from "./OpenClawStatusPill";
import OpenClawDisconnectedState from "./OpenClawDisconnectedState";
import { ChatMessages } from "../chat/ChatMessages";
import { ChatInput } from "../chat/ChatInput";
import { ChatEmptyIllustration } from "../chat/ChatEmptyIllustration";
import ConversationList from "../chat/ConversationList";
import EmptyChatState from "../chat/EmptyChatState";
import type { ConversationPreview } from "../chat/ConversationItem";
import { ConfirmDialog } from "../ui/dialog";
import { useDialogs } from "../../hooks/useDialogs";
import { getCachedPlatform } from "../../utils/platform";
import { toConversationPreview } from "../../utils/conversationPreview";

const platform = getCachedPlatform();

interface OpenClawViewProps {
  onOpenSettings?: (section?: string) => void;
}

async function loadOpenClawConversations(): Promise<ConversationPreview[]> {
  const [active, archived] = await Promise.all([
    window.electronAPI?.getOpenClawConversationsWithPreview?.(200, 0, false),
    window.electronAPI?.getOpenClawConversationsWithPreview?.(200, 0, true),
  ]);
  return [...(active ?? []), ...(archived ?? [])].map(toConversationPreview);
}

function NewChatEmptyState() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full -mt-6 select-none">
      <ChatEmptyIllustration />
      <p className="text-xs text-foreground/50 dark:text-foreground/25 text-center max-w-48 mt-4">
        {t("chat.newChatEmpty")}
      </p>
    </div>
  );
}

export default function OpenClawView({ onOpenSettings }: OpenClawViewProps) {
  const { t } = useTranslation();
  const status = useOpenClawStatus();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [activeSessionKey, setActiveSessionKey] = useState<string | null>(null);
  const [isNewChat, setIsNewChat] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const { confirmDialog, showConfirmDialog, hideConfirmDialog } = useDialogs();

  const activeSessionKeyRef = useRef<string | null>(null);
  activeSessionKeyRef.current = activeSessionKey;

  const getSessionKey = useCallback(() => activeSessionKeyRef.current, []);

  const openSettings = useCallback(() => {
    onOpenSettings?.("openclaw");
  }, [onOpenSettings]);

  useOpenClawSessionSync({
    status,
    onSync: () => setRefreshKey((k) => k + 1),
  });

  const persistence = useOpenClawPersistence({
    conversationId: activeConversationId,
    onConversationCreated: (id, _title, sessionKey) => {
      activeSessionKeyRef.current = sessionKey;
      setActiveConversationId(id);
      setActiveSessionKey(sessionKey);
      setRefreshKey((k) => k + 1);
    },
  });

  const streaming = useOpenClawStreaming({
    getSessionKey,
    setMessages: persistence.setMessages,
    onStreamComplete: (_id, content, toolCalls) => {
      persistence.saveAssistantMessage(content, toolCalls);
    },
  });

  const handleSelectConversation = useCallback(
    async (id: number) => {
      if (id === activeConversationId) return;
      setActiveConversationId(id);
      setIsNewChat(false);
      const sessionKey = await persistence.loadConversation(id);
      activeSessionKeyRef.current = sessionKey;
      setActiveSessionKey(sessionKey);
      if (sessionKey) {
        await window.electronAPI?.openclaw?.setActiveSession?.(sessionKey);
      }
      await window.electronAPI?.clearOpenClawUnread?.(id);
      setRefreshKey((k) => k + 1);
    },
    [activeConversationId, persistence]
  );

  const handleNewChat = useCallback(() => {
    activeSessionKeyRef.current = null;
    setActiveConversationId(null);
    setActiveSessionKey(null);
    setIsNewChat(true);
    persistence.handleNewChat();
  }, [persistence]);

  const handleTextSubmit = useCallback(
    async (text: string) => {
      setIsNewChat(false);
      let convId = activeConversationId;
      if (!convId) {
        const title = text.length > 50 ? `${text.slice(0, 50)}...` : text;
        convId = await persistence.createConversation(title);
      }

      const userMsg = {
        id: crypto.randomUUID(),
        role: "user" as const,
        content: text,
        isStreaming: false,
      };
      persistence.setMessages((prev) => [...prev, userMsg]);
      await persistence.saveUserMessage(text);

      const allMessages = [...persistence.messages, userMsg];
      await streaming.sendToAI(text, allMessages);
    },
    [activeConversationId, persistence, streaming]
  );

  const handleArchive = useCallback(
    async (id: number) => {
      await window.electronAPI?.archiveOpenClawConversation?.(id);
      if (activeConversationId === id) {
        handleNewChat();
      }
      setRefreshKey((k) => k + 1);
    },
    [activeConversationId, handleNewChat]
  );

  const handleDelete = useCallback(
    (id: number) => {
      showConfirmDialog({
        title: t("openclaw.deleteConfirmTitle"),
        description: t("openclaw.deleteConfirmBody"),
        onConfirm: async () => {
          await window.electronAPI?.deleteOpenClawConversation?.(id);
          if (activeConversationId === id) {
            handleNewChat();
          }
          setRefreshKey((k) => k + 1);
        },
        variant: "destructive",
      });
    },
    [activeConversationId, handleNewChat, showConfirmDialog, t]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = platform === "darwin" ? e.metaKey : e.ctrlKey;
      if (mod && e.key === "n") {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleNewChat]);

  useEffect(() => {
    window.electronAPI?.openclaw?.tabActive?.(true);
    return () => {
      window.electronAPI?.openclaw?.tabActive?.(false);
    };
  }, []);

  const hasActiveChat =
    activeConversationId !== null || persistence.messages.length > 0 || isNewChat;
  const showDisconnected =
    (status === "disconnected" || status === "error") && !activeConversationId;

  return (
    <>
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={hideConfirmDialog}
        title={confirmDialog.title}
        description={confirmDialog.description}
        onConfirm={confirmDialog.onConfirm}
        variant={confirmDialog.variant}
      />
      <div className="flex h-full">
        <div className="w-56 min-w-50 shrink-0 border-r border-border/15 dark:border-white/6">
          <ConversationList
            loadConversations={loadOpenClawConversations}
            title={t("sidebar.openclaw")}
            headerSlot={<OpenClawStatusPill status={status} onConfigure={openSettings} />}
            activeConversationId={activeConversationId}
            onSelectConversation={handleSelectConversation}
            onNewChat={handleNewChat}
            onOpenSearch={() => {}}
            onArchive={handleArchive}
            onDelete={handleDelete}
            refreshKey={refreshKey}
          />
        </div>
        <div className="flex-1 min-w-80 flex flex-col">
          {showDisconnected ? (
            <OpenClawDisconnectedState onConfigure={openSettings} />
          ) : hasActiveChat ? (
            <>
              <ChatMessages messages={persistence.messages} emptyState={<NewChatEmptyState />} />
              <ChatInput
                agentState={streaming.agentState}
                partialTranscript=""
                onTextSubmit={handleTextSubmit}
                onCancel={streaming.cancelStream}
                autoFocus={isNewChat}
              />
            </>
          ) : (
            <EmptyChatState />
          )}
        </div>
      </div>
    </>
  );
}
