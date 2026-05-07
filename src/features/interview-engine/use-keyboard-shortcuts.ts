"use client";

import { useEffect } from "react";

export interface KeyboardShortcutHandlers {
  onReplay?: () => void;
  onPauseResume?: () => void;
  onMicToggle?: () => void;
  onFullscreenToggle?: () => void;
  onTextInputToggle?: () => void;
  onShortcutsHelp?: () => void;
  onSilenceReset?: () => void;
}

function isFormFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (el instanceof HTMLInputElement) return true;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLElement && el.isContentEditable) return true;
  return false;
}

export function useKeyboardShortcuts(
  handlers: KeyboardShortcutHandlers,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;
    function handleKey(e: KeyboardEvent) {
      if (isFormFocused()) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      switch (e.key) {
        case " ":
          if (handlers.onSilenceReset) {
            e.preventDefault();
            handlers.onSilenceReset();
          }
          break;
        case "r":
        case "R":
          handlers.onReplay?.();
          break;
        case "p":
        case "P":
          handlers.onPauseResume?.();
          break;
        case "m":
        case "M":
          handlers.onMicToggle?.();
          break;
        case "f":
        case "F":
          handlers.onFullscreenToggle?.();
          break;
        case "t":
        case "T":
          handlers.onTextInputToggle?.();
          break;
        case "?":
          handlers.onShortcutsHelp?.();
          break;
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [enabled, handlers]);
}
