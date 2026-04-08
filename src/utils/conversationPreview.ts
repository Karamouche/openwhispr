import type { ConversationPreview } from "../components/chat/ConversationItem";

interface ConversationPreviewRow {
  id: number;
  title: string;
  last_message?: string | null;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
  origin_channel?: string | null;
  unread_count?: number | null;
}

export function toConversationPreview(row: ConversationPreviewRow): ConversationPreview {
  return {
    id: row.id,
    title: row.title || "Untitled",
    preview: row.last_message ?? undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_archived: !!row.archived_at,
    origin_channel: row.origin_channel ?? undefined,
    unread_count: row.unread_count ?? undefined,
  };
}
