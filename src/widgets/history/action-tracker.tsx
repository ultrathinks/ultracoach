"use client";

import { useTranslations } from "next-intl";
import type { ActionTrackerData } from "@/entities/analytics";

interface ActionTrackerProps {
  data: ActionTrackerData;
}

function TagBadge({ tag }: { tag: "new" | "repeat" }) {
  const t = useTranslations("history");
  if (tag === "new") {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo/15 text-indigo px-2 py-0.5 text-xs font-medium ml-2">
        {t("actionNew")}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-pink/15 text-pink px-2 py-0.5 text-xs font-medium ml-2">
      {t("actionRepeat")}
    </span>
  );
}

function ActionTrackerInner({ data }: ActionTrackerProps) {
  const t = useTranslations("history");

  if (data.items.length === 0 && data.sessionDate === "") {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">{t("actionItems")}</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">{t("actionItemsEmpty")}</p>
        </div>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">{t("actionItems")}</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            {t("actionItemsSessionEmpty")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="text-base font-semibold mb-4">{t("actionItems")}</h3>
      <ul className="space-y-3">
        {data.items.map((item) => (
          <li key={item.id} className="flex items-start text-sm">
            <span className="text-indigo mr-2 mt-0.5 shrink-0">•</span>
            <span className="text-secondary leading-relaxed">
              {item.text}
              {item.tag !== null && <TagBadge tag={item.tag} />}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export { ActionTrackerInner };
