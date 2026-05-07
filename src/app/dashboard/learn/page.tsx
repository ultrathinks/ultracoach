import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { articles, getCategoryLabel } from "../../../../content/learn";

export default async function LearnPage() {
  const t = await getTranslations("learnIndex");
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
      <p className="text-secondary text-sm mb-8">{t("subtitle")}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/dashboard/learn/${article.slug}`}
            className="group rounded-xl border border-border-subtle bg-card p-6 transition-colors hover:border-border-default hover:bg-white/[0.02]"
          >
            <div className="flex items-start gap-2">
              <div className="mt-0.5 rounded-lg bg-indigo/10 p-2">
                <BookOpen className="h-4 w-4 text-indigo" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground group-hover:text-indigo transition-colors mb-1">
                  {article.title}
                </h2>
                <p className="text-sm text-muted line-clamp-2 mb-2">
                  {article.description}
                </p>
                <div className="flex items-center gap-2 text-xs text-muted">
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5">
                    {getCategoryLabel(article.category)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {t("readMin", { n: article.readMin })}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
