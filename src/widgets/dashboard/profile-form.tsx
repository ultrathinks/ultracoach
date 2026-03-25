"use client";

import { Camera, Loader2 } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { Button, Input } from "@/shared/ui";

interface ProfileFormProps {
  name: string;
  email: string;
  image: string;
}

export function ProfileForm({
  name: initialName,
  email,
  image,
}: ProfileFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const nameId = useId();
  const emailId = useId();
  const dirty = name !== initialName;

  async function handleSave() {
    setSaving(true);
    setMessage("");
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setMessage(data.error ?? "저장에 실패했습니다");
        return;
      }
      setMessage("저장되었습니다");
      router.refresh();
    } catch {
      setMessage("네트워크 오류가 발생했습니다");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8">프로필</h1>

      <div className="rounded-xl border border-white/[0.06] bg-card p-6">
        <div className="flex items-center gap-5 mb-8">
          <div className="relative h-16 w-16 shrink-0">
            {image ? (
              <Image
                src={image}
                alt="프로필"
                width={64}
                height={64}
                className="rounded-full object-cover"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-indigo/20 text-indigo text-xl font-bold">
                {(initialName || email)[0]?.toUpperCase()}
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 rounded-full bg-card border border-white/[0.1] p-1">
              <Camera className="h-3 w-3 text-muted" />
            </div>
          </div>
          <div>
            <p className="font-semibold text-foreground">
              {initialName || "이름 없음"}
            </p>
            <p className="text-sm text-muted">{email}</p>
          </div>
        </div>

        <div className="space-y-5">
          <Input
            id={nameId}
            label="이름"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름을 입력하세요"
          />

          <Input
            id={emailId}
            label="이메일"
            value={email}
            disabled
            className="opacity-50 cursor-not-allowed"
          />
        </div>

        <div className="flex items-center gap-3 mt-6">
          <Button onClick={handleSave} disabled={!dirty || saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                저장 중...
              </>
            ) : (
              "저장"
            )}
          </Button>
          {message && (
            <p
              className={`text-sm ${message === "저장되었습니다" ? "text-green" : "text-red"}`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
