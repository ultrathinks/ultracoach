"use client";

import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { useErrorMessage } from "@/shared/lib/use-error-message";
import {
  Button,
  Card,
  ConfirmDialog,
  Input,
  Spinner,
  useToast,
} from "@/shared/ui";

interface ProfileFormProps {
  name: string;
  email: string;
  image: string;
  allowDataForTraining: boolean;
}

export function ProfileForm({
  name: initialName,
  email,
  image,
  allowDataForTraining: initialAllow,
}: ProfileFormProps) {
  const t = useTranslations("profile");
  const router = useRouter();
  const toast = useToast();
  const getErrorMessage = useErrorMessage();
  const [name, setName] = useState(initialName);
  const [allowDataForTraining, setAllowDataForTraining] =
    useState(initialAllow);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const nameId = useId();
  const emailId = useId();
  const dirty = name !== initialName || allowDataForTraining !== initialAllow;

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          allowDataForTraining,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.show(getErrorMessage(data) || t("saveFailed"), { tone: "error" });
        return;
      }
      toast.show(t("saved"), { tone: "success" });
      router.refresh();
    } catch {
      toast.show(t("networkError"), { tone: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch("/api/me", { method: "DELETE" });
      if (!res.ok) {
        toast.show(t("deleteFailed"), { tone: "error" });
        setDeleting(false);
        setConfirmOpen(false);
        return;
      }
      await signOut({ callbackUrl: "/" });
    } catch {
      toast.show(t("networkError"), { tone: "error" });
      setDeleting(false);
      setConfirmOpen(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{t("title")}</h1>

      <Card className="p-6">
        <div className="flex items-center gap-4 mb-8">
          <div className="relative h-16 w-16 shrink-0">
            {image ? (
              // biome-ignore lint/performance/noImgElement: external avatar URL
              <img
                src={image}
                alt={t("title")}
                width={64}
                height={64}
                className="h-16 w-16 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo/20 text-indigo text-xl font-bold">
                {(initialName || email)[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 rounded-full bg-card border border-border-default p-1">
              <Camera className="h-3 w-3 text-muted" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {initialName || t("noName")}
            </p>
            <p className="text-sm text-muted">{email}</p>
          </div>
        </div>

        <div className="space-y-4">
          <Input
            id={nameId}
            label={t("name")}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("namePlaceholder")}
          />
          <Input
            id={emailId}
            label={t("email")}
            value={email}
            disabled
            className="opacity-50 cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-2 mt-6">
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {t("saving")}
              </>
            ) : (
              t("save")
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <h2 className="font-semibold mb-2">{t("dataTraining")}</h2>
        <p className="text-sm text-muted mb-4">{t("dataTrainingDesc")}</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allowDataForTraining}
            onChange={(e) => setAllowDataForTraining(e.target.checked)}
            className="w-4 h-4 cursor-pointer"
          />
          <span className="text-sm">{t("dataTraining")}</span>
        </label>
      </Card>

      <Card className="p-6 border-red/20">
        <h2 className="font-semibold text-red mb-2">{t("deleteAccount")}</h2>
        <p className="text-sm text-muted mb-4">{t("deleteWarning")}</p>
        <Button
          variant="ghost"
          onClick={() => setConfirmOpen(true)}
          disabled={deleting}
        >
          {deleting ? t("processing") : t("deleteAccount")}
        </Button>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => !deleting && setConfirmOpen(false)}
        onConfirm={handleDelete}
        title={t("deleteAccount")}
        description={t("deleteWarning")}
        tone="danger"
        requireText={t("deleteConfirmPhrase")}
        confirmLabel={t("deleteAccount")}
        busy={deleting}
      />
    </div>
  );
}
