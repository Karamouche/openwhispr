import { useTranslation } from "react-i18next";
import { ChatEmptyIllustration } from "../chat/ChatEmptyIllustration";
import { Button } from "../ui/button";

interface OpenClawDisconnectedStateProps {
  onConfigure?: () => void;
}

export default function OpenClawDisconnectedState({
  onConfigure,
}: OpenClawDisconnectedStateProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center h-full -mt-6 select-none">
      <ChatEmptyIllustration />
      <p className="text-xs text-muted-foreground/50 mt-4 max-w-60 text-center">
        {t("openclaw.connectGateway")}
      </p>
      {onConfigure && (
        <Button variant="outline-flat" size="sm" className="mt-3" onClick={onConfigure}>
          {t("openclaw.connectGatewayCta")}
        </Button>
      )}
    </div>
  );
}
