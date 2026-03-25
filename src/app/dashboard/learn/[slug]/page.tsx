import { ArrowLeft, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  articles,
  getArticle,
  getCategoryLabel,
} from "../../../../../content/learn";

interface Props {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return articles.map((a) => ({ slug: a.slug }));
}

export default async function LearnArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  let Content: React.ComponentType;
  try {
    const mod = await import(`../../../../../content/learn/${slug}.mdx`);
    Content = mod.default;
  } catch {
    notFound();
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/dashboard/learn"
        className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        목록으로
      </Link>

      <div className="flex items-center gap-3 text-xs text-muted mb-4">
        <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5">
          {getCategoryLabel(article.category)}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {article.readMin}분
        </span>
      </div>

      <article className="prose prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-secondary prose-strong:text-foreground prose-li:text-secondary prose-a:text-indigo prose-blockquote:border-indigo/30 prose-blockquote:text-muted prose-hr:border-white/[0.06] prose-th:text-foreground prose-td:text-secondary">
        <Content />
      </article>
    </div>
  );
}
