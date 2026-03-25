import { BookOpen, Clock } from "lucide-react";
import Link from "next/link";
import { articles, getCategoryLabel } from "../../../../content/learn";

export default function LearnPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">학습하기</h1>
      <p className="text-secondary text-sm mb-8">
        면접 준비에 도움이 되는 팁과 전략을 읽어보세요
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {articles.map((article) => (
          <Link
            key={article.slug}
            href={`/dashboard/learn/${article.slug}`}
            className="group rounded-xl border border-white/[0.06] bg-card p-5 transition-colors hover:border-white/[0.12] hover:bg-white/[0.02]"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-indigo/10 p-2">
                <BookOpen className="h-4 w-4 text-indigo" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-foreground group-hover:text-indigo transition-colors mb-1">
                  {article.title}
                </h2>
                <p className="text-sm text-muted line-clamp-2 mb-3">
                  {article.description}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted">
                  <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5">
                    {getCategoryLabel(article.category)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.readMin}분
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
