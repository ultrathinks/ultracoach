import { SimliClient } from "simli-client";

interface SimliAvatarOptions {
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
  sessionToken: string;
  iceServers: RTCIceServer[];
  onSpeaking?: () => void;
  onSilent?: () => void;
}

export async function createSimliAvatar(options: SimliAvatarOptions) {
  const {
    videoElement,
    audioElement,
    sessionToken,
    iceServers,
    onSpeaking,
    onSilent,
  } = options;

  const client = new SimliClient(
    sessionToken,
    videoElement,
    audioElement,
    iceServers,
  );

  if (onSpeaking) client.on("speaking", onSpeaking);
  if (onSilent) client.on("silent", onSilent);

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
