const PRO_URL =
  "https://briefly.klaim.me/Fcz3O8te8el391dBsOKn?item_id=AuI8C6f3a2UVaLwIYvMF&name=John+Doe&email=leegeh1213%40gmail.com&success_url=https%3A%2F%2Fcoach.jmo.kr%2Fdashboard&cancel_url=https%3A%2F%2Fcoach.jmo.kr%2Fdashboard";
const PREMIUM_URL =
  "https://briefly.klaim.me/Fcz3O8te8el391dBsOKn?item_id=1QQmIWnQDTs85uL0ifab&name=John+Doe&email=leegeh1213%40gmail.com&success_url=https%3A%2F%2Fcoach.jmo.kr%2Fdashboard&cancel_url=https%3A%2F%2Fcoach.jmo.kr%2Fdashboard";

export default function BillingPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">Billing</h1>
      <p className="text-secondary text-sm mb-8">
        플랜을 선택하고 더 많은 기능을 이용하세요
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Starter */}
        <div className="rounded-xl bg-card border border-white/[0.06] p-6 flex flex-col">
          <p className="text-sm text-muted mb-1">Starter</p>
          <p className="text-3xl font-bold mb-1">Free</p>
          <p className="text-sm text-muted mb-6">/month</p>
          <ul className="space-y-3 text-sm text-secondary mb-8 flex-1">
            <li>월 3회 면접 연습</li>
            <li>기본 피드백 리포트</li>
            <li>점수 추이 차트</li>
          </ul>
          <button
            type="button"
            disabled
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-white/[0.06] text-muted cursor-not-allowed"
          >
            현재 플랜
          </button>
        </div>

        {/* Pro */}
        <div className="rounded-xl bg-card border border-indigo/30 p-6 flex flex-col relative">
          <span className="absolute -top-3 right-4 px-3 py-0.5 rounded-full bg-indigo/15 text-indigo text-xs font-medium border border-indigo/30">
            인기
          </span>
          <p className="text-sm text-muted mb-1">Pro</p>
          <p className="text-3xl font-bold mb-1">$15</p>
          <p className="text-sm text-muted mb-6">/month</p>
          <ul className="space-y-3 text-sm text-secondary mb-8 flex-1">
            <li>월 30회 면접 연습</li>
            <li>추임새 분석</li>
            <li>STAR 충족률 분석</li>
            <li>바디랭귀지 리포트</li>
            <li>드릴 모드</li>
          </ul>
          <a
            href={PRO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-foreground text-background hover:bg-foreground/90 transition-colors cursor-pointer text-center block"
          >
            업그레이드
          </a>
        </div>

        {/* Premium */}
        <div className="rounded-xl bg-card border border-white/[0.06] p-6 flex flex-col">
          <p className="text-sm text-muted mb-1">Premium</p>
          <p className="text-3xl font-bold mb-1">$29</p>
          <p className="text-sm text-muted mb-6">/month</p>
          <ul className="space-y-3 text-sm text-secondary mb-8 flex-1">
            <li>무제한 면접 연습</li>
            <li>심층 AI 피드백</li>
            <li>이력서 기반 맞춤 질문</li>
            <li>우선 지원</li>
          </ul>
          <a
            href={PREMIUM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 rounded-lg text-sm font-medium bg-card border border-border text-foreground hover:bg-card-hover transition-colors cursor-pointer text-center block"
          >
            업그레이드
          </a>
        </div>
      </div>
    </div>
  );
}
