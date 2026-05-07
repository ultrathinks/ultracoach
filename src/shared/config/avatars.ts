import type { UserPlan } from "@/shared/lib/permissions";

export type Persona = "kind" | "strict" | "technical";
export type AvatarLocale = "ko" | "en";

export interface AvatarConfig {
  id: string;
  name: string;
  description: string;
  persona: Persona;
  faceId: string;
  voiceIdKo: string;
  voiceIdEn: string;
  previewImage: string;
  plan: UserPlan;
  locales: readonly AvatarLocale[];
}

export const AVATARS = [
  {
    id: "raj",
    name: "라지",
    description: "차분하고 디테일을 파고드는 시니어 엔지니어",
    persona: "technical",
    faceId: "7e74d6e7-d559-4394-bd56-4923a3ab75ad",
    // Adam — calm male, multilingual
    voiceIdKo: "pNInz6obpgDQGcFmaJgB",
    voiceIdEn: "pNInz6obpgDQGcFmaJgB",
    previewImage: "/avatars/raj.jpg",
    plan: "free",
    locales: ["ko", "en"],
  },
  {
    id: "sora",
    name: "소라",
    description: "친절한 사수형 면접관, 답변을 풀어내도록 격려",
    persona: "kind",
    faceId: "cace3ef7-a4c4-425d-a8cf-a5358eb0c427",
    // Bella — warm female, multilingual
    voiceIdKo: "EXAVITQu4vr4xnSDxMaL",
    voiceIdEn: "EXAVITQu4vr4xnSDxMaL",
    previewImage: "/avatars/sora.jpg",
    plan: "pro",
    locales: ["ko", "en"],
  },
  {
    id: "michael",
    name: "마이클",
    description: "압박 면접 스타일, 약점을 집요하게 추궁",
    persona: "strict",
    faceId: "dd10cb5a-d31d-4f12-b69f-6db3383c006e",
    // Antoni — firm male, multilingual
    voiceIdKo: "ErXwobaYiN019PkySvjV",
    voiceIdEn: "ErXwobaYiN019PkySvjV",
    previewImage: "/avatars/michael.jpg",
    plan: "pro",
    locales: ["ko", "en"],
  },
  {
    id: "babi",
    name: "베이비",
    description: "(재미 옵션) 부담 없이 연습하는 아기 면접관",
    persona: "kind",
    faceId: "14de6eb1-0ea6-4fde-9522-8552ce691cb6",
    // Domi — friendly female, multilingual
    voiceIdKo: "AZnzlk1XvdvUeBnXmlld",
    voiceIdEn: "AZnzlk1XvdvUeBnXmlld",
    previewImage: "/avatars/babi.jpg",
    plan: "premium",
    locales: ["ko"],
  },
] as const satisfies readonly AvatarConfig[];

export type AvatarId = (typeof AVATARS)[number]["id"];

export const AVATAR_IDS = [
  "raj",
  "sora",
  "michael",
  "babi",
] as const satisfies readonly AvatarId[];

export const DEFAULT_AVATAR_ID: AvatarId = "raj";

export function findAvatar(id: string | null | undefined): AvatarConfig | null {
  if (!id) return null;
  return AVATARS.find((a) => a.id === id) ?? null;
}

export function resolveVoiceId(avatar: AvatarConfig, locale: string): string {
  return locale === "en" ? avatar.voiceIdEn : avatar.voiceIdKo;
}
