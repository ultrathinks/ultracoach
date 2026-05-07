"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { useErrorMessage } from "@/shared/lib/use-error-message";
import { Badge, EmptyState, Section, useToast } from "@/shared/ui";

interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: "user" | "admin" | "demo";
  plan: "free" | "pro" | "premium";
  createdAt: string;
  sessionCount: number;
}

const ROLE_OPTIONS = ["user", "admin", "demo"] as const;
const PLAN_OPTIONS = ["free", "pro", "premium"] as const;

type Role = (typeof ROLE_OPTIONS)[number];
type Plan = (typeof PLAN_OPTIONS)[number];

function parseRole(value: string): Role {
  const found = ROLE_OPTIONS.find((r) => r === value);
  if (!found) throw new Error(`invalid role: ${value}`);
  return found;
}

function parsePlan(value: string): Plan {
  const found = PLAN_OPTIONS.find((p) => p === value);
  if (!found) throw new Error(`invalid plan: ${value}`);
  return found;
}

export function AdminOverview() {
  const t = useTranslations("admin");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const getErrorMessage = useErrorMessage();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users?limit=50");
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = await res.json();
      setUsers(json.data);
    } catch (err) {
      toast.show(t("usersFailed"), { tone: "error" });
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [toast, t]);

  useEffect(() => {
    load();
  }, [load]);

  const updateUser = useCallback(
    async (id: string, patch: Partial<Pick<AdminUser, "role" | "plan">>) => {
      try {
        const res = await fetch(`/api/admin/users/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const updated = await res.json();
        setUsers((prev) =>
          prev.map((u) => (u.id === id ? { ...u, ...updated } : u)),
        );
        toast.show(t("changed"), { tone: "success" });
      } catch (err) {
        toast.show(t("changeFailed"), { tone: "error" });
        console.error(err);
      }
    },
    [toast, t],
  );

  if (loading) {
    return (
      <Section title={t("users")}>
        <p className="text-sm text-muted">{t("usersLoading")}</p>
      </Section>
    );
  }

  if (users.length === 0) {
    return (
      <Section title={t("users")}>
        <EmptyState title={t("usersEmpty")} description={t("usersEmptyDesc")} />
      </Section>
    );
  }

  return (
    <Section
      title={t("users")}
      description={t("usersTotal", { count: users.length })}
    >
      <div className="rounded-xl bg-card border border-border-subtle overflow-hidden">
        <table className="w-full text-sm">
          <thead className="border-b border-border-subtle bg-white/[0.02]">
            <tr className="text-left text-xs text-muted">
              <th className="px-4 py-3 font-medium">{t("email")}</th>
              <th className="px-4 py-3 font-medium">{t("name")}</th>
              <th className="px-4 py-3 font-medium">{t("role")}</th>
              <th className="px-4 py-3 font-medium">{t("plan")}</th>
              <th className="px-4 py-3 font-medium text-right">
                {t("sessions")}
              </th>
              <th className="px-4 py-3 font-medium text-right">
                {t("joinedDate")}
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b border-border-subtle last:border-b-0 hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate max-w-[200px]">{u.email}</span>
                    {u.role !== "user" && (
                      <Badge tone={u.role === "admin" ? "purple" : "yellow"}>
                        {u.role}
                      </Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-secondary">{u.name ?? "-"}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      updateUser(u.id, {
                        role: parseRole(e.target.value),
                      })
                    }
                    className="rounded-md bg-card border border-border-default px-2 py-1 text-xs text-foreground cursor-pointer"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.plan}
                    onChange={(e) =>
                      updateUser(u.id, {
                        plan: parsePlan(e.target.value),
                      })
                    }
                    className="rounded-md bg-card border border-border-default px-2 py-1 text-xs text-foreground cursor-pointer"
                  >
                    {PLAN_OPTIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3 text-right tabular-nums">
                  {u.sessionCount}
                </td>
                <td className="px-4 py-3 text-right text-muted">
                  {new Date(u.createdAt).toLocaleDateString("ko-KR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  );
}
