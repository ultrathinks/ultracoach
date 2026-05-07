"use client";

import { useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { Button } from "./button";
import { Modal } from "./modal";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  requireText?: string;
  busy?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  tone = "default",
  requireText,
  busy = false,
}: ConfirmDialogProps) {
  const tCommon = useTranslations("common");
  const inputId = useId();
  const [text, setText] = useState("");

  useEffect(() => {
    if (!open) setText("");
  }, [open]);

  const matches = !requireText || text === requireText;
  const disabled = !matches || busy;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
    >
      {requireText && (
        <div className="mt-2">
          <label htmlFor={inputId} className="text-xs text-muted">
            {tCommon("typeToConfirm", { phrase: requireText })}
          </label>
          <input
            id={inputId}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            className="mt-2 w-full rounded-xl bg-background border border-border-default px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground/30"
          />
        </div>
      )}
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose} disabled={busy}>
          {cancelLabel ?? tCommon("cancel")}
        </Button>
        <Button
          variant={tone === "danger" ? "primary" : "primary"}
          onClick={() => void onConfirm()}
          disabled={disabled}
          className={
            tone === "danger" ? "bg-red text-white hover:bg-red/90" : undefined
          }
        >
          {confirmLabel ?? tCommon("confirm")}
        </Button>
      </div>
    </Modal>
  );
}
