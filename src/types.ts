export interface VoiceProfile {
  pitch: "high" | "medium-high" | "medium" | "medium-low" | "low";
  tempo: "fast" | "medium-fast" | "moderate" | "relaxed" | "slow";
  accent: string;
  tone: string[];
  genderEstimate: "feminine" | "masculine" | "androgynous";
  recommendedVoice: "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr";
}

export interface KeyframeState {
  timeMs: number;
  mouthOpen: number;
  mouthWidth: number;
  eyesClosed: boolean;
  headTilt: number;
  subtitle: string;
}

export interface TTSResult {
  translatedText: string;
  base64Audio: string; // wav/mp3 base64
  mimeType?: string;
  timeline: KeyframeState[];
  isProceduralFallback?: boolean;
  isLocalGpu?: boolean;
}

export interface SocialPost {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  createdAt: string;
}

export interface CameraState {
  scale: number;
  panX: number;
  panY: number;
  rotate: number;
}

export interface VideoScriptKeyframe {
  timeMs: number;
  camera: CameraState;
  expression: "happy" | "talking" | "surprised" | "serious" | "thinking";
  lipSyncMouthOpen: number;
  subtitle: string;
}

export interface VideoScriptTimeline {
  durationMs: number;
  scenery: string;
  mood: string;
  timeline: VideoScriptKeyframe[];
}

export interface User {
  uid: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface SavedWork {
  id: string;
  userId: string;
  type: "voice" | "image" | "animation";
  title: string;
  payload: any;
  createdAt: string;
}
