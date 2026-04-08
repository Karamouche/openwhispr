import { useTranslation } from "react-i18next";
import { cn } from "../lib/utils";
import type { OpenClawStatus } from "./useOpenClawStatus";

interface OpenClawStatusPillProps {
  status: OpenClawStatus;
  onConfigure?: () => void;
}

const DOT_CLASS: Record<OpenClawStatus, string> = {
  connected: "bg-emerald-500",
  connecting: "bg-amber-500",
  reconnecting: "bg-amber-500",
  disconnected: "bg-red-500",
  error: "bg-red-500",
};

export default function OpenClawStatusPill({ status, onConfigure }: OpenClawStatusPillProps) {
  const { t } = useTranslation();
  const isActionable = status === "disconnected" || status === "error";
  const label =
    status === "connected"
      ? t("openclaw.connected")
      : status === "connecting"
        ? t("openclaw.connecting")
        : status === "reconnecting"
          ? t("openclaw.reconnecting")
          : status === "error"
            ? `${t("openclaw.error")} — ${t("openclaw.configure")}`
            : `${t("openclaw.disconnected")} — ${t("openclaw.configure")}`;

  const content = (
    <span className="inline-flex items-center gap-1.5">
      <span
        className={cn(
          "inline-block size-1.5 rounded-full shrink-0",
          DOT_CLASS[status],
          (status === "connecting" || status === "reconnecting") && "animate-pulse"
        )}
      />
      <span className="truncate">{label}</span>
    </span>
  );

  if (!isActionable) {
    return (
      <span className="text-[11px] text-muted-foreground/60 select-none">{content}</span>
    );
  }

  return (
    <button
      type="button"
      onClick={onConfigure}
      className={cn(
        "text-[11px] text-foreground/55 hover:text-foreground",
        "transition-colors duration-150",
        "focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/30 rounded-sm"
      )}
    >
      {content}
    </button>
  );
}
