"use client";

import type { ActionTrackerData } from "@/entities/analytics";

interface ActionTrackerProps {
  data: ActionTrackerData;
}

function TagBadge({ tag }: { tag: "new" | "repeat" }) {
  if (tag === "new") {
    return (
      <span className="inline-flex items-center rounded-full bg-indigo/15 text-indigo px-2 py-0.5 text-xs font-medium ml-2">
        신규
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-pink/15 text-pink px-2 py-0.5 text-xs font-medium ml-2">
      반복
    </span>
  );
}

function ActionTrackerInner({ data }: ActionTrackerProps) {
  if (data.items.length === 0 && data.sessionDate === "") {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">액션 아이템</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            면접 후 개선할 점을 정리해 드려요
          </p>
        </div>
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-white/[0.1] p-6">
        <h3 className="text-base font-semibold mb-4">액션 아이템</h3>
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-secondary text-sm">
            이 세션에서는 별도 액션 아이템이 없어요
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-card border border-white/[0.1] p-6">
      <h3 className="text-base font-semibold mb-4">액션 아이템</h3>
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
