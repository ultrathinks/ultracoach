import { SimliClient } from "simli-client";
import { z } from "zod";

interface SimliAvatarOptions {
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
  sessionToken: string;
  iceServers: RTCIceServer[];
  onSpeaking?: () => void;
  onSilent?: () => void;
  onDisconnected?: (reason: string) => void;
}

const videoInfoSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
});

export interface AvatarHandle {
  sendAudio: (pcm16: Uint8Array) => void;
  stop: () => Promise<void>;
}

export async function createSimliAvatar(
  options: SimliAvatarOptions,
): Promise<AvatarHandle> {
  const {
    videoElement,
    audioElement,
    sessionToken,
    iceServers,
    onSpeaking,
    onSilent,
    onDisconnected,
  } = options;

  const client = new SimliClient(
    sessionToken,
    videoElement,
    audioElement,
    iceServers,
  );

  if (onSpeaking) client.on("speaking", onSpeaking);
  if (onSilent) client.on("silent", onSilent);

  if (onDisconnected) {
    client.on("error", (detail) => onDisconnected(detail));
    client.on("startup_error", (detail) => onDisconnected(detail));
    client.on("stop", () => onDisconnected("stop"));
  }

  if (process.env.NODE_ENV === "development") {
    client.on("video_info", (serialized: string) => {
      let raw: unknown;
      try {
        raw = JSON.parse(serialized);
      } catch {
        return;
      }
      const parsed = videoInfoSchema.safeParse(raw);
      if (parsed.success && parsed.data.width && parsed.data.height) {
        const { width, height } = parsed.data;
        const ratio = width / height;
        const orientation =
          ratio > 1.05 ? "landscape" : ratio < 0.95 ? "portrait" : "square";
        console.info(
          "[ultracoach] avatar video_info:",
          `${width}x${height}`,
          `ratio ${ratio.toFixed(3)} (${orientation})`,
        );
      }
    });
  }

  await client.start();

  return {
    sendAudio(pcm16) {
      client.sendAudioData(pcm16);
    },
    async stop() {
      await client.stop();
    },
  };
}
