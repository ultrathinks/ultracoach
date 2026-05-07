"use client";

import { useTranslations } from "next-intl";
import { Button, Modal } from "@/shared/ui";

interface ResumeModalProps {
  open: boolean;
  questionsAnswered: number;
  jobTitle: string;
  onResume: () => void;
  onDiscard: () => void;
}

export function ResumeModal({
  open,
  questionsAnswered,
  jobTitle,
  onResume,
  onDiscard,
}: ResumeModalProps) {
  const t = useTranslations("interview.resume");
  return (
    <Modal
      open={open}
      onClose={onResume}
      title={t("title")}
      description={t("description", {
        jobTitle,
        answered: questionsAnswered,
      })}
    >
      <div className="flex flex-col gap-2 mt-2">
        <Button onClick={onResume}>{t("continue")}</Button>
        <Button variant="ghost" onClick={onDiscard}>
          {t("discard")}
        </Button>
      </div>
    </Modal>
  );
}
