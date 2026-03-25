export interface Article {
  slug: string;
  title: string;
  description: string;
  category: "answer" | "mindset" | "body-language" | "preparation";
  readMin: number;
}

export const articles: Article[] = [
  {
    slug: "star-method",
    title: "STAR 기법으로 답변 구조화하기",
    description:
      "상황-과제-행동-결과 프레임워크로 면접 답변을 논리적으로 구성하는 방법을 알아봅니다.",
    category: "answer",
    readMin: 5,
  },
  {
    slug: "common-questions",
    title: "자주 나오는 면접 질문 TOP 10",
    description:
      "인성, 기술, 컬처핏 면접에서 가장 많이 나오는 질문과 답변 전략을 정리했습니다.",
    category: "preparation",
    readMin: 7,
  },
  {
    slug: "body-language-tips",
    title: "면접 바디랭귀지 가이드",
    description:
      "시선 처리, 자세, 제스처 등 비언어적 커뮤니케이션으로 신뢰감을 주는 방법입니다.",
    category: "body-language",
    readMin: 4,
  },
  {
    slug: "filler-words",
    title: "추임새 줄이는 실전 연습법",
    description:
      "'음', '어', '그니까' 같은 추임새를 의식적으로 줄이는 3단계 훈련법입니다.",
    category: "answer",
    readMin: 4,
  },
  {
    slug: "nervousness",
    title: "면접 긴장 다스리기",
    description:
      "면접 전 불안을 관리하고 자신감 있게 임하는 마인드셋과 호흡법을 소개합니다.",
    category: "mindset",
    readMin: 5,
  },
  {
    slug: "technical-interview",
    title: "기술 면접 준비 전략",
    description:
      "코딩 테스트부터 시스템 설계까지, 기술 면접 유형별 준비 방법을 안내합니다.",
    category: "preparation",
    readMin: 8,
  },
  {
    slug: "culture-fit",
    title: "컬처핏 면접 완벽 대비",
    description:
      "회사 문화와 가치관을 파악하고, 자신의 경험과 연결짓는 답변 기법입니다.",
    category: "preparation",
    readMin: 5,
  },
  {
    slug: "self-introduction",
    title: "1분 자기소개 공식",
    description:
      "첫인상을 결정하는 자기소개를 현재-과거-미래 구조로 인상 깊게 만드는 법입니다.",
    category: "answer",
    readMin: 4,
  },
];

const categoryLabel: Record<Article["category"], string> = {
  answer: "답변 기법",
  mindset: "마인드셋",
  "body-language": "바디랭귀지",
  preparation: "면접 준비",
};

export function getCategoryLabel(category: Article["category"]): string {
  return categoryLabel[category];
}

export function getArticle(slug: string): Article | undefined {
  return articles.find((a) => a.slug === slug);
}
