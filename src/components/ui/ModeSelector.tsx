import { ReactNode, useRef, useState, useEffect, useCallback } from "react";
import type { InferenceMode } from "../../types/electron";

export interface ModeSelectorItem {
  id: InferenceMode;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
}

interface ModeSelectorProps {
  modes: ModeSelectorItem[];
  selectedMode: InferenceMode;
  onSelect: (mode: InferenceMode) => void;
}

export function ModeSelector({ modes, selectedMode, onSelect }: ModeSelectorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties>({ opacity: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const selectedIndex = modes.findIndex((m) => m.id === selectedMode);
    if (selectedIndex === -1) {
      setIndicatorStyle({ opacity: 0 });
      return;
    }

    const buttons = container.querySelectorAll<HTMLButtonElement>("[data-mode-button]");
    const selectedButton = buttons[selectedIndex];
    if (!selectedButton) return;

    const containerRect = container.getBoundingClientRect();
    const buttonRect = selectedButton.getBoundingClientRect();

    setIndicatorStyle({
      width: buttonRect.width,
      height: buttonRect.height,
      transform: `translateX(${buttonRect.left - containerRect.left}px)`,
      opacity: 1,
    });
  }, [modes, selectedMode]);

  useEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const observer = new ResizeObserver(() => updateIndicator());
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      className="relative flex p-0.5 rounded-md bg-surface-raised dark:bg-surface-1"
    >
      <div
        className="absolute top-0.5 left-0 rounded-md bg-card border border-border dark:border-border-subtle shadow-sm dark:shadow-(--shadow-card) transition-[width,height,transform,opacity] duration-200 ease-out pointer-events-none"
        style={indicatorStyle}
      />
      {modes.map((mode) => {
        const isSelected = selectedMode === mode.id;
        return (
          <button
            key={mode.id}
            data-mode-button
            disabled={mode.disabled}
            onClick={() => !mode.disabled && onSelect(mode.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium text-xs transition-colors duration-150 ${
              mode.disabled
                ? "text-muted-foreground/40 cursor-not-allowed"
                : isSelected
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground cursor-pointer"
            }`}
          >
            {mode.icon}
            <span className="whitespace-nowrap">{mode.label}</span>
          </button>
        );
      })}
    </div>
  );
}
