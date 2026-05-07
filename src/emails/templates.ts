import { z } from "zod";

interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

type Locale = "ko" | "en";

function shell(opts: {
  locale: Locale;
  title: string;
  body: string;
  ctaUrl?: string;
  ctaLabel?: string;
}): string {
  const cta = opts.ctaUrl
    ? `<p style="margin:24px 0;"><a href="${opts.ctaUrl}" style="background:#fafafa;color:#09090b;padding:10px 20px;border-radius:8px;text-decoration:none;font-weight:500;">${opts.ctaLabel ?? (opts.locale === "en" ? "View" : "확인")}</a></p>`
    : "";
  const tagline =
    opts.locale === "en"
      ? "UltraCoach · AI Interview Coaching"
      : "UltraCoach · AI 면접 코칭";
  return `<!doctype html>
<html lang="${opts.locale}"><body style="background:#09090b;color:#fafafa;font-family:sans-serif;padding:32px;">
  <div style="max-width:520px;margin:0 auto;">
    <h1 style="font-size:18px;margin:0 0 12px;">${opts.title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#a1a1aa;">${opts.body}</div>
    ${cta}
    <p style="font-size:12px;color:#71717a;margin-top:48px;">${tagline}</p>
  </div>
</body></html>`;
}

const paymentReceiptSchema = z.object({
  amount: z.number(),
  plan: z.string(),
  approvedAt: z.string(),
  receiptUrl: z.string().nullable().optional(),
  periodEnd: z.string(),
});

const paymentFailedSchema = z.object({
  reason: z.string(),
  attempts: z.number(),
  retryAt: z.string().optional(),
});

const paymentDowngradedSchema = z.object({
  reason: z.string(),
});

export function renderTemplate(
  template: string,
  payload: unknown,
  locale: Locale = "ko",
): RenderedEmail {
  switch (template) {
    case "payment_receipt": {
      const parsed = paymentReceiptSchema.safeParse(payload);
      if (!parsed.success) return fallback(locale);
      const p = parsed.data;
      const periodDate = new Date(p.periodEnd).toLocaleDateString(
        locale === "en" ? "en-US" : "ko-KR",
      );
      const amount = `₩${p.amount.toLocaleString()}`;
      if (locale === "en") {
        const subject = "[UltraCoach] Payment received";
        const text = `Payment received.\nAmount: ${amount}\nPlan: ${p.plan}\nNext billing: ${periodDate}`;
        const html = shell({
          locale,
          title: subject,
          body: `<p>Your payment has been processed.</p>
           <p><strong>Amount</strong> · ${amount}<br/>
           <strong>Plan</strong> · ${p.plan}<br/>
           <strong>Next billing</strong> · ${periodDate}</p>`,
          ctaUrl: p.receiptUrl ?? undefined,
          ctaLabel: "View receipt",
        });
        return { subject, html, text };
      }
      const subject = "[UltraCoach] 결제가 완료되었습니다";
      const text = `결제가 완료되었습니다.\n금액: ${amount}\n플랜: ${p.plan}\n다음 결제일: ${periodDate}`;
      const html = shell({
        locale,
        title: subject,
        body: `<p>결제가 완료되었습니다.</p>
         <p><strong>금액</strong> · ${amount}<br/>
         <strong>플랜</strong> · ${p.plan}<br/>
         <strong>다음 결제일</strong> · ${periodDate}</p>`,
        ctaUrl: p.receiptUrl ?? undefined,
        ctaLabel: "영수증 보기",
      });
      return { subject, html, text };
    }
    case "payment_failed_retry": {
      const parsed = paymentFailedSchema.safeParse(payload);
      if (!parsed.success) return fallback(locale);
      const p = parsed.data;
      const billingUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/dashboard/billing`;
      if (locale === "en") {
        const subject = "[UltraCoach] Payment failed — will retry";
        const text = `Payment failed (${p.reason}). Attempt ${p.attempts}. Please update your card or check the limit.`;
        const html = shell({
          locale,
          title: subject,
          body: `<p>Your payment failed.</p>
           <p><strong>Reason</strong> · ${p.reason}<br/>
           <strong>Attempt</strong> · ${p.attempts}</p>
           <p>Please update your card information.</p>`,
          ctaUrl: billingUrl,
          ctaLabel: "Open billing page",
        });
        return { subject, html, text };
      }
      const subject = "[UltraCoach] 결제 실패 — 재시도 예정";
      const text = `결제에 실패했습니다 (${p.reason}). ${p.attempts}회 시도. 카드 정보를 업데이트하시거나 한도를 확인해주세요.`;
      const html = shell({
        locale,
        title: subject,
        body: `<p>결제에 실패했습니다.</p>
         <p><strong>사유</strong> · ${p.reason}<br/>
         <strong>시도 횟수</strong> · ${p.attempts}회</p>
         <p>카드 정보를 업데이트해주세요.</p>`,
        ctaUrl: billingUrl,
        ctaLabel: "결제 페이지로 이동",
      });
      return { subject, html, text };
    }
    case "payment_downgraded": {
      const parsed = paymentDowngradedSchema.safeParse(payload);
      if (!parsed.success) return fallback(locale);
      const p = parsed.data;
      const billingUrl = `${process.env.NEXT_PUBLIC_BASE_URL ?? ""}/dashboard/billing`;
      if (locale === "en") {
        const subject = "[UltraCoach] Subscription expired";
        const text = `All payment attempts failed and your account was moved to the free plan (${p.reason}). Please update your card and resubscribe.`;
        const html = shell({
          locale,
          title: subject,
          body: `<p>All payment attempts failed; your account is now on the free plan.</p>
           <p><strong>Reason</strong> · ${p.reason}</p>
           <p>Please update your card information and resubscribe.</p>`,
          ctaUrl: billingUrl,
          ctaLabel: "Open billing page",
        });
        return { subject, html, text };
      }
      const subject = "[UltraCoach] 구독이 만료되었습니다";
      const text = `결제 시도가 모두 실패하여 무료 플랜으로 전환되었습니다 (${p.reason}). 카드 정보를 업데이트한 뒤 다시 구독해주세요.`;
      const html = shell({
        locale,
        title: subject,
        body: `<p>결제 시도가 모두 실패하여 무료 플랜으로 전환되었습니다.</p>
         <p><strong>사유</strong> · ${p.reason}</p>
         <p>카드 정보를 업데이트한 뒤 다시 구독해주세요.</p>`,
        ctaUrl: billingUrl,
        ctaLabel: "결제 페이지로 이동",
      });
      return { subject, html, text };
    }
    default:
      return fallback(locale);
  }
}

function fallback(locale: Locale): RenderedEmail {
  if (locale === "en") {
    const subject = "UltraCoach Notification";
    return {
      subject,
      html: shell({ locale, title: subject, body: "<p>Notification</p>" }),
      text: "You have a notification.",
    };
  }
  const subject = "UltraCoach 알림";
  return {
    subject,
    html: shell({ locale, title: subject, body: "<p>알림</p>" }),
    text: "알림이 도착했습니다.",
  };
}
