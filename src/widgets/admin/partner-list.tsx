"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
  Badge,
  Button,
  ConfirmDialog,
  EmptyState,
  FormError,
  Modal,
  Section,
  useToast,
} from "@/shared/ui";

interface Partner {
  id: string;
  domain: string;
  labelKo: string;
  labelEn: string;
  plan: "pro" | "premium";
  active: boolean;
  notes: string | null;
  createdAt: string;
}

interface DraftPartner {
  domain: string;
  labelKo: string;
  labelEn: string;
  plan: "pro" | "premium";
  notes: string;
}

const EMPTY_DRAFT: DraftPartner = {
  domain: "",
  labelKo: "",
  labelEn: "",
  plan: "pro",
  notes: "",
};

export function PartnerList() {
  const t = useTranslations("admin");
  const tCommon = useTranslations("common");
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [draft, setDraft] = useState<DraftPartner>(EMPTY_DRAFT);
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{
    id: string;
    label: string;
  } | null>(null);
  const [deleting, setDeleting] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/partners");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      setPartners(json.data);
    } catch {
      toast.show(t("toasts.loadFailed"), { tone: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const handleAdd = useCallback(async () => {
    if (!draft.domain || !draft.labelKo || !draft.labelEn) {
      setValidationError(t("validation.required"));
      return;
    }
    setValidationError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: draft.domain.toLowerCase().trim(),
          labelKo: draft.labelKo.trim(),
          labelEn: draft.labelEn.trim(),
          plan: draft.plan,
          notes: draft.notes.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.show(data.detail ?? t("toasts.addFailed"), { tone: "error" });
        return;
      }
      toast.show(t("toasts.added"), { tone: "success" });
      setShowAdd(false);
      setDraft(EMPTY_DRAFT);
      await load();
    } finally {
      setSubmitting(false);
    }
  }, [draft, toast, load, t]);

  const handleToggleActive = useCallback(
    async (id: string, active: boolean) => {
      const res = await fetch(`/api/admin/partners/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active }),
      });
      if (!res.ok) {
        toast.show(t("toasts.updateFailed"), { tone: "error" });
        return;
      }
      toast.show(t("toasts.updated"), { tone: "success" });
      await load();
    },
    [toast, load, t],
  );

  const handleDelete = useCallback(async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/partners/${pendingDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        toast.show(t("toasts.deleteFailed"), { tone: "error" });
        return;
      }
      toast.show(t("toasts.deleted"), { tone: "success" });
      setPendingDelete(null);
      await load();
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, toast, load, t]);

  return (
    <Section
      title={t("partners")}
      description={t("partnersDesc")}
      actions={
        <Button size="sm" onClick={() => setShowAdd(true)}>
          {t("addDomain")}
        </Button>
      }
    >
      {loading ? (
        <p className="text-sm text-muted">{t("partnersLoading")}</p>
      ) : partners.length === 0 ? (
        <EmptyState
          title={t("partnersEmpty")}
          description={t("partnersEmptyDesc")}
        />
      ) : (
        <div className="rounded-xl bg-card border border-border-subtle overflow-hidden">
          <table className="w-full text-sm">
            <thead className="border-b border-border-subtle bg-white/[0.02]">
              <tr className="text-left text-xs text-muted">
                <th className="px-4 py-3 font-medium">{t("domain")}</th>
                <th className="px-4 py-3 font-medium">{t("labelKo")}</th>
                <th className="px-4 py-3 font-medium">{t("labelEn")}</th>
                <th className="px-4 py-3 font-medium">{t("plan")}</th>
                <th className="px-4 py-3 font-medium">{t("status")}</th>
                <th className="px-4 py-3 font-medium text-right">
                  {t("actionsCol")}
                </th>
              </tr>
            </thead>
            <tbody>
              {partners.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-border-subtle last:border-b-0 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-mono text-xs">{p.domain}</td>
                  <td className="px-4 py-3">{p.labelKo}</td>
                  <td className="px-4 py-3 text-secondary">{p.labelEn}</td>
                  <td className="px-4 py-3">
                    <Badge tone={p.plan === "premium" ? "purple" : "indigo"}>
                      {p.plan === "premium"
                        ? tCommon("planPremium")
                        : tCommon("planPro")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(p.id, !p.active)}
                      aria-pressed={p.active}
                      aria-label={p.active ? t("active") : t("inactive")}
                      className="cursor-pointer"
                    >
                      <Badge tone={p.active ? "green" : "neutral"}>
                        {p.active ? t("active") : t("inactive")}
                      </Badge>
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setPendingDelete({ id: p.id, label: p.labelKo })
                      }
                    >
                      {tCommon("delete")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={showAdd}
        onClose={() => {
          if (submitting) return;
          setShowAdd(false);
          setDraft(EMPTY_DRAFT);
          setValidationError(null);
        }}
        title={t("modal.title")}
        description={t("modal.description")}
        size="md"
      >
        <div className="space-y-4 mt-2">
          <div>
            <label className="block text-xs text-muted mb-1">
              {t("domain")}
            </label>
            <input
              type="text"
              placeholder={t("modal.domainPlaceholder")}
              value={draft.domain}
              onChange={(e) => setDraft({ ...draft, domain: e.target.value })}
              className="w-full rounded-lg bg-background border border-border-default px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">
                {t("modal.labelKoLabel")}
              </label>
              <input
                type="text"
                placeholder={t("modal.labelKoPlaceholder")}
                value={draft.labelKo}
                onChange={(e) =>
                  setDraft({ ...draft, labelKo: e.target.value })
                }
                className="w-full rounded-lg bg-background border border-border-default px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">
                {t("modal.labelEnLabel")}
              </label>
              <input
                type="text"
                placeholder={t("modal.labelEnPlaceholder")}
                value={draft.labelEn}
                onChange={(e) =>
                  setDraft({ ...draft, labelEn: e.target.value })
                }
                className="w-full rounded-lg bg-background border border-border-default px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">
              {t("modal.planLabel")}
            </label>
            <select
              value={draft.plan}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  plan: e.target.value === "premium" ? "premium" : "pro",
                })
              }
              className="w-full rounded-lg bg-background border border-border-default px-3 py-2 text-sm cursor-pointer"
            >
              <option value="pro">{tCommon("planPro")}</option>
              <option value="premium">{tCommon("planPremium")}</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">
              {t("modal.notesLabel")}
            </label>
            <textarea
              placeholder={t("modal.notesPlaceholder")}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              className="w-full rounded-lg bg-background border border-border-default px-3 py-2 text-sm"
              rows={2}
            />
          </div>
          {validationError && <FormError>{validationError}</FormError>}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleAdd}
              disabled={submitting}
              className="flex-1"
            >
              {submitting ? t("modal.submitting") : t("modal.submit")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setShowAdd(false);
                setDraft(EMPTY_DRAFT);
                setValidationError(null);
              }}
            >
              {tCommon("cancel")}
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={pendingDelete !== null}
        onClose={() => !deleting && setPendingDelete(null)}
        onConfirm={handleDelete}
        title={tCommon("delete")}
        description={
          pendingDelete
            ? t("deleteConfirm", { label: pendingDelete.label })
            : ""
        }
        tone="danger"
        confirmLabel={tCommon("delete")}
        busy={deleting}
      />
    </Section>
  );
}
