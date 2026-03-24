import { SimliClient } from "simli-client";

interface SimliAvatarOptions {
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
  sessionToken: string;
  iceServers: RTCIceServer[];
  onSpeaking?: () => void;
  onSilent?: () => void;
  onDisconnected?: (reason: string) => void;
}

export async function createSimliAvatar(options: SimliAvatarOptions) {
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
    const markDisconnected = (reason: string) => () => onDisconnected(reason);
    client.on("disconnected", markDisconnected("disconnected"));
    client.on("disconnect", markDisconnected("disconnect"));
    client.on("closed", markDisconnected("closed"));
    client.on("close", markDisconnected("close"));
    client.on("failed", markDisconnected("failed"));
    client.on("error", markDisconnected("error"));
  }
  if (process.env.NODE_ENV === "development") {
    client.on("video_info", (serialized) => {
      let parsed: { width?: number; height?: number } | null = null;
      try {
        parsed = JSON.parse(serialized) as { width?: number; height?: number };
      } catch {
        parsed = null;
      }

      if (parsed?.width && parsed?.height) {
        const ratio = parsed.width / parsed.height;
        const orientation =
          ratio > 1.05 ? "landscape" : ratio < 0.95 ? "portrait" : "square";
        console.info(
          "[ultracoach] simli video_info:",
          `raw ${parsed.width}x${parsed.height}`,
          `ratio ${ratio.toFixed(3)} (${orientation})`,
        );
        return;
      }

      console.info("[ultracoach] simli video_info:", serialized);
    });
  }

  await client.start();

  return {
    sendAudio(pcm16: Uint8Array) {
      client.sendAudioData(pcm16);
    },
    async stop() {
      await client.stop();
    },
  };
}
