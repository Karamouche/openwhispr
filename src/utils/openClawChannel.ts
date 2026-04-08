import { MessageCircle, Hash, Circle, Cloud, type LucideIcon } from "lucide-react";

const KNOWN_CHANNELS = new Set(["whatsapp", "slack", "telegram", "main", "openwhispr"]);

export function parseOpenClawChannel(sessionKey: string): string | undefined {
  if (!sessionKey) return undefined;
  if (sessionKey === "main") return "main";
  const colon = sessionKey.indexOf(":");
  if (colon === -1) return KNOWN_CHANNELS.has(sessionKey) ? sessionKey : undefined;
  const prefix = sessionKey.slice(0, colon).toLowerCase();
  return KNOWN_CHANNELS.has(prefix) ? prefix : undefined;
}

export function getOpenClawChannelIcon(channel: string): LucideIcon {
  switch (channel) {
    case "whatsapp":
    case "telegram":
      return MessageCircle;
    case "slack":
      return Hash;
    case "openwhispr":
      return Cloud;
    case "main":
    default:
      return Circle;
  }
}
