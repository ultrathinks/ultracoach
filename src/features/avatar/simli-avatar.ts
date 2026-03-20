import {
  SimliClient,
  generateSimliSessionToken,
  generateIceServers,
} from "simli-client";

const FACE_ID = "tmp9i8bbq7c";

interface SimliAvatarOptions {
  videoElement: HTMLVideoElement;
  audioElement: HTMLAudioElement;
  apiKey: string;
  onSpeaking?: () => void;
  onSilent?: () => void;
}

export async function createSimliAvatar(options: SimliAvatarOptions) {
  const { videoElement, audioElement, apiKey, onSpeaking, onSilent } = options;

  const token = await generateSimliSessionToken(
    {
      config: {
        faceId: FACE_ID,
        handleSilence: true,
        maxSessionLength: 3600,
        maxIdleTime: 60,
      },
      apiKey,
    },
    "https://api.simli.ai",
  );

  const iceServers = await generateIceServers(apiKey);

  const client = new SimliClient(
    token.session_token,
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
