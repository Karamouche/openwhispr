import { useTranslation } from "react-i18next";
import { MoreHorizontal, Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { Button } from "../ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "../ui/dropdown-menu";
import { cn } from "../lib/utils";
import { normalizeDbDate } from "../../utils/dateFormatting";
import { getOpenClawChannelIcon } from "../../utils/openClawChannel";

export interface ConversationPreview {
  id: number;
  title: string;
  preview?: string;
  created_at: string;
  updated_at: string;
  is_archived?: boolean;
  origin_channel?: string;
  unread_count?: number;
}

interface ConversationItemProps {
  conversation: ConversationPreview;
  isActive: boolean;
  onClick: () => void;
  onArchive: (id: number) => void;
  onDelete: (id: number) => void;
}

function formatTimestamp(dateStr: string): string {
  const date = normalizeDbDate(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (seconds < 60) return "<1m";
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatChannelLabel(channel: string): string {
  if (channel === "whatsapp") return "WhatsApp";
  return channel.charAt(0).toUpperCase() + channel.slice(1);
}

export default function ConversationItem({
  conversation,
  isActive,
  onClick,
  onArchive,
  onDelete,
}: ConversationItemProps) {
  const { t } = useTranslation();
  const isArchived = !!conversation.is_archived;
  const showChannelBadge =
    !!conversation.origin_channel && conversation.origin_channel !== "openwhispr";
  const hasUnread =
    conversation.unread_count !== undefined && conversation.unread_count > 0;
  const ChannelIcon = showChannelBadge
    ? getOpenClawChannelIcon(conversation.origin_channel as string)
    : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative w-full text-left px-3 py-2 cursor-pointer transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/30",
        isActive ? "bg-primary/8 dark:bg-primary/10" : "hover:bg-foreground/4 dark:hover:bg-white/4"
      )}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className={cn("text-xs truncate text-foreground", isActive && "font-medium")}>
            {conversation.title}
          </p>
          <div className="flex items-center gap-0.5 shrink-0">
            {hasUnread ? (
              <span
                aria-label="Unread"
                className="h-1.5 w-1.5 rounded-full bg-primary group-hover:opacity-0 transition-opacity"
              />
            ) : (
              <span className="text-[10px] text-muted-foreground/40 tabular-nums group-hover:opacity-0 transition-opacity">
                {formatTimestamp(conversation.updated_at)}
              </span>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={(e) => e.stopPropagation()}
                  className="h-5 w-5 rounded-sm opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition-opacity absolute right-2 text-muted-foreground/60 dark:text-muted-foreground/40 hover:text-foreground/60 hover:bg-foreground/5 active:bg-foreground/8"
                >
                  <MoreHorizontal size={12} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={4} className="min-w-36">
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive(conversation.id);
                  }}
                  className="text-xs gap-2 rounded-lg px-2.5 py-1.5 cursor-pointer focus:bg-foreground/5"
                >
                  {isArchived ? (
                    <>
                      <ArchiveRestore size={12} className="text-muted-foreground/80" />
                      {t("chat.unarchive")}
                    </>
                  ) : (
                    <>
                      <Archive size={12} className="text-muted-foreground/80" />
                      {t("chat.archive")}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conversation.id);
                  }}
                  className="text-xs gap-2 rounded-lg px-2.5 py-1.5 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
                >
                  <Trash2 size={12} />
                  {t("chat.delete")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {showChannelBadge && ChannelIcon ? (
          <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
            <span className="flex items-center gap-1 shrink-0 text-[10px] text-muted-foreground/40">
              <ChannelIcon size={10} className="shrink-0" />
              {formatChannelLabel(conversation.origin_channel as string)}
            </span>
            {conversation.preview && (
              <p className="text-[11px] text-muted-foreground/50 line-clamp-1 min-w-0">
                {conversation.preview}
              </p>
            )}
          </div>
        ) : (
          conversation.preview && (
            <p className="text-[11px] text-muted-foreground/50 line-clamp-1 mt-0.5">
              {conversation.preview}
            </p>
          )
        )}
      </div>
    </button>
  );
}
