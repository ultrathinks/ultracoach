export interface PartnerInfo {
  id: string;
  labelKo: string;
  labelEn: string;
}

export function getPartnerLabel(
  partner: PartnerInfo | null | undefined,
  locale: string,
): string | null {
  if (!partner) return null;
  return locale === "en" ? partner.labelEn : partner.labelKo;
}
