import React, { useState, useRef, useEffect } from "react";
import { 
  Mic, Volume2, Upload, Play, Pause, Languages, 
  Activity, Check, Sparkles, RefreshCw, AlertCircle, Trash2, FolderPlus,
  Download, UserCheck, Headset, Info
} from "lucide-react";
import { VoiceProfile, TTSResult, User } from "../types";
import { makeApiRequest, playCompletionSound } from "../lib/apiHelper";

const PREMADE_AI_VOICES = [
  {
    id: "rachel",
    name: "Rachel",
    gender: "Female",
    age: "Young",
    accent: "American (General)",
    desc: "Conversational, bright, and highly professional. Perfect for newsletters or commercial voiceovers.",
    recommendedVoice: "Kore",
    pitch: "medium-high",
    tempo: "moderate",
    tone: ["warm", "bright", "professional", "clear"]
  },
  {
    id: "drew",
    name: "Drew",
    gender: "Male",
    age: "Middle-Aged",
    accent: "American (News)",
    desc: "News anchor style. Deep, commanding, and authoritative. Best for documentary and journalism scripts.",
    recommendedVoice: "Fenrir",
    pitch: "low",
    tempo: "moderate",
    tone: ["deep", "authoritative", "news", "confident"]
  },
  {
    id: "nicole",
    name: "Nicole",
    gender: "Female",
    age: "Young",
    accent: "American (Energetic)",
    desc: "High-energy, lively, and youthful. Ideal for gaming, fast-paced narration, and energetic promos.",
    recommendedVoice: "Puck",
    pitch: "high",
    tempo: "fast",
    tone: ["energetic", "bright", "youthful", "playful"]
  },
  {
    id: "clyde",
    name: "Clyde",
    gender: "Male",
    age: "Senior",
    accent: "American (Gravely)",
    desc: "Gravely, raspy, and elder style. Excellent for character voices, fantasy narration, and storytelling.",
    recommendedVoice: "Charon",
    pitch: "medium-low",
    tempo: "relaxed",
    tone: ["raspy", "gravely", "narrator", "mature"]
  },
  {
    id: "adam",
    name: "Adam",
    gender: "Male",
    age: "Young",
    accent: "American (Deep Narrative)",
    desc: "Deep, narrative, and warm tone. Great for audiobooks, storytelling, and elegant marketing promos.",
    recommendedVoice: "Fenrir",
    pitch: "low",
    tempo: "relaxed",
    tone: ["deep", "warm", "narrator", "smooth"]
  },
  {
    id: "bella",
    name: "Bella",
    gender: "Female",
    age: "Young",
    accent: "British (Soft)",
    desc: "Gentle, soft-spoken British RP. Outstanding for meditation, ASMR, whispery storytelling, or audiobooks.",
    recommendedVoice: "Kore",
    pitch: "medium",
    tempo: "slow",
    tone: ["soft", "whispery", "calm", "gentle"]
  },
  {
    id: "antoni",
    name: "Antoni",
    gender: "Male",
    age: "Young",
    accent: "European (Multilingual)",
    desc: "Warm and friendly with a subtle European flair. Highly adaptive to multi-language translation modes.",
    recommendedVoice: "Zephyr",
    pitch: "medium",
    tempo: "moderate",
    tone: ["warm", "friendly", "balanced", "smooth"]
  },
  {
    id: "arnold",
    name: "Arnold",
    gender: "Male",
    age: "Middle-Aged",
    accent: "Australian (Strong)",
    desc: "Strong, deep, and slightly raspy Australian accent. Rich, expressive, and conversational.",
    recommendedVoice: "Charon",
    pitch: "low",
    tempo: "moderate",
    tone: ["deep", "strong", "expressive", "conversational"]
  },
  {
    id: "aria",
    name: "Aria",
    gender: "Female",
    age: "Young",
    accent: "British (Elegant)",
    desc: "Sophisticated, warm, and highly elegant British RP voice. Outstanding for narrations and announcements.",
    recommendedVoice: "Aoede",
    pitch: "medium",
    tempo: "moderate",
    tone: ["posh", "sophisticated", "clear", "pleasant"]
  },
  {
    id: "rajiv",
    name: "Rajiv",
    gender: "Male",
    age: "Young",
    accent: "Indian English",
    desc: "Clear, fluent, and highly articulate Indian English speaker. Ideal for tech walkthroughs and guides.",
    recommendedVoice: "Zephyr",
    pitch: "medium",
    tempo: "moderate",
    tone: ["articulate", "professional", "clear", "friendly"]
  },
  {
    id: "ananya",
    name: "Ananya",
    gender: "Female",
    age: "Young",
    accent: "Hindi Accent",
    desc: "Sweet, melodic, and poetic Hindi voice speaker. Excellent for storytelling and lifestyle media.",
    recommendedVoice: "Kore",
    pitch: "medium-high",
    tempo: "moderate",
    tone: ["melodic", "warm", "expressive", "fluent"]
  },
  {
    id: "aarav",
    name: "Aarav",
    gender: "Male",
    age: "Young",
    accent: "Hindi Accent",
    desc: "Deep, crisp, and extremely articulate national Hindi tone. Ideal for deep narrations and promos.",
    recommendedVoice: "Fenrir",
    pitch: "medium-low",
    tempo: "moderate",
    tone: ["deep", "clear", "professional", "respectful"]
  },
  {
    id: "zainab",
    name: "Zainab",
    gender: "Female",
    age: "Young",
    accent: "Urdu Accent",
    desc: "Polite, elegant, and soft-spoken Urdu voice speaker. Perfect for cultural poetry and podcasts.",
    recommendedVoice: "Aoede",
    pitch: "medium",
    tempo: "moderate",
    tone: ["polite", "elegant", "expressive", "soft"]
  },
  {
    id: "hamza",
    name: "Hamza",
    gender: "Male",
    age: "Middle-Aged",
    accent: "Urdu Accent",
    desc: "Graceful, commanding, and respectful Urdu speaker with a classical tone. Perfect for narrating stories.",
    recommendedVoice: "Zephyr",
    pitch: "medium-low",
    tempo: "relaxed",
    tone: ["respectful", "dignified", "classical", "smooth"]
  }
];

interface VoiceClonerProps {
  onProfileAnalyzed: (profile: VoiceProfile) => void;
  onSpeechGenerated: (result: TTSResult) => void;
  activeProfile: VoiceProfile | null;
  activeTTS: TTSResult | null;
  onSaveProfile?: (profile: VoiceProfile) => void;
  user?: User | null;
}

export default function VoiceCloner({ 
  onProfileAnalyzed, 
  onSpeechGenerated, 
  activeProfile, 
  activeTTS,
  onSaveProfile,
  user
}: VoiceClonerProps) {
  // Tabs & Custom selectors state
  const [stepAMode, setStepAMode] = useState<"clone" | "premade">("premade"); // Default to pre-made ElevenLabs library for immediate utility
  const [selectedPremadeId, setSelectedPremadeId] = useState<string>("rachel");
  const [selectedAccent, setSelectedAccent] = useState("American (General)");

  // Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordDuration, setRecordDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  // UI State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // TTS configuration
  const [scriptText, setScriptText] = useState(
    "Hello there! I am thrilled to explore this brand new visual environment with you. Let's create something breathtaking together!"
  );
  const [targetLang, setTargetLang] = useState("English");
  const [voiceTheme, setVoiceTheme] = useState("conversational");
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playAudioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPlayTime, setCurrentPlayTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Playback Real-time Waveform Refs
  const playbackAudioContextRef = useRef<AudioContext | null>(null);
  const playbackAnalyserRef = useRef<AnalyserNode | null>(null);
  const playbackSourceNodeRef = useRef<MediaElementAudioSourceNode | null>(null);
  const playbackAnimationFrameRef = useRef<number | null>(null);
  const playbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const isPlayingRef = useRef(false);

  // Sync isPlaying with isPlayingRef to avoid stale closure issues in canvas drawing loop
  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (isPlaying) {
      initPlaybackVisualizer();
    }
  }, [isPlaying]);

  // Watch for voice changes to reset states
  useEffect(() => {
    setIsPlaying(false);
    setCurrentPlayTime(0);
    setDuration(0);
    if (playAudioRef.current) {
      playAudioRef.current.load();
    }
  }, [activeTTS?.base64Audio]);

  // Handle default preset selection on load
  useEffect(() => {
    if (stepAMode === "premade" && selectedPremadeId) {
      const match = PREMADE_AI_VOICES.find(v => v.id === selectedPremadeId);
      if (match) {
        selectPremadeVoice(match);
      }
    }
  }, [selectedPremadeId, stepAMode]);

  // Clean up timers & animation frames on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (playbackAnimationFrameRef.current) cancelAnimationFrame(playbackAnimationFrameRef.current);
      if (playbackAudioContextRef.current) {
        playbackAudioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  // Update record duration timer
  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  // Audio frequency animation during recording
  const startVisualizer = (stream: MediaStream) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      
      audioContextRef.current = audioCtx;
      analyserRef.current = analyser;

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const draw = () => {
        if (!canvasRef.current || !analyserRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, width, height);

        const barWidth = (width / bufferLength) * 1.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          barHeight = (dataArray[i] / 255) * height * 0.8;
          
          const gradient = ctx.createLinearGradient(0, height, 0, 0);
          gradient.addColorStop(0, "rgba(16, 185, 129, 0.2)");
          gradient.addColorStop(0.5, "rgba(52, 211, 153, 0.8)");
          gradient.addColorStop(1, "rgba(59, 130, 246, 1)");

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect(x, height - barHeight, barWidth - 2, barHeight, 3);
          ctx.fill();

          x += barWidth;
        }

        animationFrameRef.current = requestAnimationFrame(draw);
      };

      draw();
    } catch (e) {
      console.warn("Visualizer failed to start", e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    analyserRef.current = null;
  };

  const initPlaybackVisualizer = () => {
    if (!playAudioRef.current) return;
    try {
      if (!playbackAudioContextRef.current) {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        
        let sourceNode = playbackSourceNodeRef.current;
        if (!sourceNode) {
          sourceNode = audioCtx.createMediaElementSource(playAudioRef.current);
          playbackSourceNodeRef.current = sourceNode;
        }
        
        sourceNode.connect(analyser);
        analyser.connect(audioCtx.destination);
        
        playbackAudioContextRef.current = audioCtx;
        playbackAnalyserRef.current = analyser;
      } else if (playbackAudioContextRef.current.state === "suspended") {
        playbackAudioContextRef.current.resume();
      }

      if (!playbackAnimationFrameRef.current) {
        startPlaybackDrawingLoop();
      }
    } catch (e) {
      console.warn("Playback visualizer init failed or already connected:", e);
    }
  };

  const startPlaybackDrawingLoop = () => {
    const bufferLength = playbackAnalyserRef.current ? playbackAnalyserRef.current.frequencyBinCount : 128;
    const dataArray = new Uint8Array(bufferLength);
    const freqArray = new Uint8Array(bufferLength);

    const drawPlayback = () => {
      if (!playbackCanvasRef.current) {
        playbackAnimationFrameRef.current = requestAnimationFrame(drawPlayback);
        return;
      }
      const canvas = playbackCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;

      if (playbackAnalyserRef.current && isPlayingRef.current) {
        playbackAnalyserRef.current.getByteTimeDomainData(dataArray);
        playbackAnalyserRef.current.getByteFrequencyData(freqArray);

        // Slightly clear the canvas for sweet trailing wave glows
        ctx.fillStyle = "rgba(15, 23, 42, 0.25)";
        ctx.fillRect(0, 0, width, height);

        // Draw ambient frequency bar visualizers in the background
        ctx.fillStyle = "rgba(16, 185, 129, 0.08)";
        const barWidth = width / bufferLength;
        for (let i = 0; i < bufferLength; i++) {
          const barHeight = (freqArray[i] / 255) * height * 0.45;
          ctx.fillRect(i * barWidth, height - barHeight, barWidth - 1, barHeight);
        }

        // Draw a central glowing waveform path
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "rgba(16, 185, 129, 0.95)";
        ctx.shadowBlur = 8;
        ctx.shadowColor = "rgba(16, 185, 129, 0.5)";
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }

          x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // Flatline / Calm idle wave
        ctx.fillStyle = "rgba(15, 23, 42, 1)";
        ctx.fillRect(0, 0, width, height);
        
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(51, 65, 85, 0.4)";
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        ctx.lineTo(width, height / 2);
        ctx.stroke();
      }

      playbackAnimationFrameRef.current = requestAnimationFrame(drawPlayback);
    };

    drawPlayback();
  };

  // Mic Recording Actions
  const startRecording = async () => {
    setError(null);
    chunksRef.current = [];
    setRecordDuration(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const options = { mimeType: "audio/webm" };
      let recorder;
      try {
        recorder = new MediaRecorder(stream, options);
      } catch (err) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stopVisualizer();
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);
      setIsRecording(true);
      startVisualizer(stream);
    } catch (err: any) {
      console.error("Mic record error:", err);
      setError("Microphone access blocked. Please check container permissions or use an audio upload instead.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Upload or drag-and-drop actions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        setError("Please upload an audio file sample.");
        return;
      }
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    setError(null);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      if (!file.type.startsWith("audio/")) {
        setError("Please drop a valid audio file.");
        return;
      }
      setAudioBlob(file);
      setAudioUrl(URL.createObjectURL(file));
    }
  };

  // Trigger Gemini voice profile analysis
  const analyzeVoiceSample = async () => {
    if (!audioBlob) {
      setError("Please record or upload a voice sample first.");
      return;
    }

    setIsAnalyzing(true);
    setError(null);

    try {
      const base64Audio = await blobToBase64(audioBlob);
      const profile: VoiceProfile = await makeApiRequest("/api/voice-profile", {
        audioData: base64Audio,
        mimeType: audioBlob.type || "audio/webm",
      });
      onProfileAnalyzed(profile);
      playCompletionSound();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to analyze your voice pattern. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Select premade voice from ElevenLabs list
  const selectPremadeVoice = (voice: typeof PREMADE_AI_VOICES[0]) => {
    const profile: VoiceProfile = {
      pitch: voice.pitch as any,
      tempo: voice.tempo as any,
      accent: voice.accent,
      tone: voice.tone,
      genderEstimate: voice.gender === "Female" ? "feminine" : "masculine",
      recommendedVoice: voice.recommendedVoice as any,
    };
    onProfileAnalyzed(profile);
    setSelectedAccent(voice.accent);
  };

  // Trigger multilingual Speech cloning
  const generateClonedSpeech = async () => {
    if (!activeProfile) {
      setError("Please select an AI voice or analyze a voice sample first.");
      return;
    }
    if (!scriptText.trim()) {
      setError("Please provide a text or voice script.");
      return;
    }

    setIsSynthesizing(true);
    setError(null);

    try {
      let referenceAudioBase64 = null;
      if (audioBlob && stepAMode === "clone") {
        referenceAudioBase64 = await blobToBase64(audioBlob);
      }

      const result: TTSResult = await makeApiRequest("/api/voice-generate", {
        text: scriptText,
        targetLanguage: targetLang,
        recommendedVoice: activeProfile.recommendedVoice,
        voiceProfile: activeProfile,
        referenceAudio: referenceAudioBase64,
        accent: selectedAccent,
        voiceTheme: voiceTheme,
      });
      onSpeechGenerated(result);
      playCompletionSound();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate speech. Please check your network, quota limits or customize settings.");
    } finally {
      setIsSynthesizing(false);
    }
  };

  // Synthesized speech playback controls
  const togglePlayAudio = () => {
    if (!playAudioRef.current || !activeTTS?.base64Audio) return;
    
    if (isPlaying) {
      playAudioRef.current.pause();
    } else {
      playAudioRef.current.play().catch(e => console.warn(e));
    }
  };

  const handleAudioTimeUpdate = () => {
    if (playAudioRef.current) {
      setCurrentPlayTime(playAudioRef.current.currentTime);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setCurrentPlayTime(0);
  };

  const handleLoadedMetadata = () => {
    if (playAudioRef.current) {
      setDuration(playAudioRef.current.duration || 0);
    }
  };

  const downloadMp3 = () => {
    if (!activeTTS?.base64Audio) return;
    try {
      const base64 = activeTTS.base64Audio;
      const rawBase64 = base64.includes("base64,") ? base64.split("base64,")[1] : base64;
      
      const byteCharacters = atob(rawBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const mime = activeTTS.mimeType || "audio/wav";
      const ext = mime.includes("mp3") ? "mp3" : mime.includes("wav") ? "wav" : "aac";
      const blob = new Blob([byteArray], { type: mime });
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cloned-voice-${targetLang.toLowerCase()}-${Date.now()}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download audio:", e);
    }
  };

  const getAudioSrc = (base64: string) => {
    if (!base64) return "";
    if (base64.startsWith("data:")) return base64;
    const mime = activeTTS?.mimeType || "audio/wav";
    return `data:${mime};base64,${base64}`;
  };

  const deleteSample = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setError(null);
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const presets = [
    "Speak as my clone explaining our brand new product concept with absolute confidence.",
    "Deliver a warm, welcoming greeting for our international newsletter audience.",
    "Tell a creative sci-fi story script about deep space in an energetic narrator tone."
  ];

  return (
    <div id="voice-cloner-section" className="bg-slate-900 border border-slate-850 rounded-2xl p-6 shadow-2xl transition-all">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400">
            <Mic className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">1. AI Voice Profiling & Selection</h2>
            <p className="text-xs text-slate-400">Select a prebuilt ElevenLabs-style AI Voice or clone custom speech patterns</p>
          </div>
        </div>
        {activeProfile && (
          <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-semibold">
            <Check className="w-3.5 h-3.5" /> Cloned & Selected
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Voice library / custom recorder */}
        <div className="space-y-5">
          {/* STEP A HEADER WITH TOGGLE TABS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Step A: Vocal Source
            </h3>
            <div className="bg-slate-950 border border-slate-850 p-1 rounded-xl flex items-center self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setStepAMode("premade")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stepAMode === "premade"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                ElevenLabs Voices
              </button>
              <button
                type="button"
                onClick={() => setStepAMode("clone")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  stepAMode === "clone"
                    ? "bg-emerald-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Custom Cloner
              </button>
            </div>
          </div>

          {stepAMode === "clone" ? (
            /* CLONER WORKFLOW */
            <div className="space-y-4">
              <div className="bg-slate-950 border border-indigo-500/10 p-3.5 rounded-xl flex items-start gap-3 text-xs leading-relaxed">
                <div className="bg-indigo-600/10 p-1.5 rounded-lg border border-indigo-500/20 text-indigo-400 font-bold shrink-0">
                  <Info className="w-3.5 h-3.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-250">Acoustic Cloning Modes</h4>
                  <p className="text-slate-400 mt-1">
                    To maintain high speeds in <strong className="text-slate-300 font-semibold">Standard Cloud Mode</strong>, the AI analyzes your custom voice traits (pitch, tone, tempo) and automatically aligns them with the closest high-fidelity voice profiles.
                  </p>
                  <p className="text-slate-400 mt-1.5">
                    For absolute <strong className="text-emerald-400 font-bold">1-to-1 zero-shot voice cloning</strong> using your exact vocal wave-signature, enable <strong className="text-amber-400">Local RTX GPU</strong> in the header settings. This unlocks offline hardware-accelerated cloning using the companion microservice (<code className="bg-slate-900 border border-slate-800 px-1 py-0.5 rounded text-[10px] font-mono">app.py</code>).
                  </p>
                </div>
              </div>

              {!audioUrl ? (
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center flex flex-col items-center justify-center transition-all ${
                    isDragOver ? "border-emerald-500 bg-emerald-500/5" : "border-slate-800 hover:border-slate-700 bg-slate-950"
                  }`}
                >
                  <Upload className="w-10 h-10 text-slate-500 mb-3" />
                  <p className="text-sm text-slate-300 font-medium">Drag & drop your voice sample here</p>
                  <p className="text-xs text-slate-500 mt-1 mb-4">Supports MP3, WAV, M4A or WEBM</p>
                  
                  <div className="flex items-center gap-3 w-full max-w-xs">
                    <label className="flex-1 cursor-pointer bg-slate-850 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs py-2.5 px-3 rounded-lg font-semibold transition-all text-center">
                      Browse Files
                      <input type="file" accept="audio/*" className="hidden" onChange={handleFileUpload} />
                    </label>
                    <span className="text-xs text-slate-600 font-medium">or</span>
                    <button
                      type="button"
                      onClick={isRecording ? stopRecording : startRecording}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-2.5 px-3 rounded-lg font-semibold transition-all cursor-pointer ${
                        isRecording 
                          ? "bg-red-500 hover:bg-red-600 text-white animate-pulse" 
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }`}
                    >
                      <Mic className="w-3.5 h-3.5" />
                      {isRecording ? "Stop Record" : "Record Mic"}
                    </button>
                  </div>

                  {/* Live Canvas Waveform */}
                  {isRecording && (
                    <div className="mt-4 w-full">
                      <canvas ref={canvasRef} width={280} height={40} className="mx-auto rounded" />
                      <p className="text-xs text-emerald-400 font-semibold mt-2 animate-pulse flex items-center justify-center gap-1.5">
                        Recording Live Mic: {formatTime(recordDuration)}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                      <Check className="w-4 h-4 text-emerald-400" /> Loaded Voice Sample
                    </span>
                    <button
                      onClick={deleteSample}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition-all"
                      title="Remove sample"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <audio src={audioUrl} controls className="w-full h-10 accent-emerald-500 rounded-lg" />

                  <button
                    type="button"
                    onClick={analyzeVoiceSample}
                    disabled={isAnalyzing}
                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-850 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg shadow-emerald-900/20 cursor-pointer"
                  >
                    {isAnalyzing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Extracting Acoustic Features...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        Run Voice Profile Analysis
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* ELEVENLABS PREMADE LIBRARY WORKFLOW */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {PREMADE_AI_VOICES.map((voice) => {
                  const isActive = selectedPremadeId === voice.id;
                  return (
                    <button
                      key={voice.id}
                      type="button"
                      onClick={() => {
                        setSelectedPremadeId(voice.id);
                        selectPremadeVoice(voice);
                      }}
                      className={`text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                        isActive
                          ? "bg-slate-950 border-emerald-500 shadow-lg shadow-emerald-950/10 scale-[1.01]"
                          : "bg-slate-950/55 border-slate-850 hover:bg-slate-950 hover:border-slate-800"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-bold text-sm text-slate-100 flex items-center gap-1.5">
                            <Headset className={`w-3.5 h-3.5 ${isActive ? "text-emerald-400" : "text-slate-500"}`} />
                            {voice.name}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                            voice.gender === "Female" 
                              ? "bg-pink-500/10 text-pink-400 border border-pink-500/10" 
                              : "bg-blue-500/10 text-blue-400 border border-blue-500/10"
                          }`}>
                            {voice.gender} • {voice.age}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed mb-2.5 line-clamp-2">
                          {voice.desc}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-auto">
                        <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-medium">
                          {voice.accent}
                        </span>
                        {voice.tone.slice(0, 2).map((t, i) => (
                          <span key={i} className="text-[9px] bg-emerald-900/10 border border-emerald-950/20 text-emerald-400 px-1.5 py-0.5 rounded font-medium capitalize">
                            {t}
                          </span>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Voice profile output */}
          {activeProfile && (
            <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Vocal Signature</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Pitch Structure</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 capitalize">{activeProfile.pitch}</div>
                </div>
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Tempo Range</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 capitalize">{activeProfile.tempo}</div>
                </div>
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Estimated Accent</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 truncate">{activeProfile.accent}</div>
                </div>
                <div className="bg-slate-900 border border-slate-850 rounded-lg p-2.5 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase">Gender Identity</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-1 capitalize">{activeProfile.genderEstimate}</div>
                </div>
              </div>

              <div>
                <div className="text-[10px] text-slate-500 font-bold uppercase mb-1.5">Vocal Timbre Badges</div>
                <div className="flex flex-wrap gap-1.5">
                  {activeProfile.tone.map((t, idx) => (
                    <span key={idx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded text-xs font-medium capitalize">
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 bg-slate-900/50 border border-slate-850 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Synthesizer Driver</div>
                      <div className="text-xs font-semibold text-slate-300">Gemini Engine Voice: {activeProfile.recommendedVoice}</div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-bold uppercase">Ready</span>
                </div>
                {onSaveProfile && (
                  <button
                    type="button"
                    onClick={() => onSaveProfile(activeProfile)}
                    className="bg-emerald-650 hover:bg-emerald-550 border border-emerald-500/20 text-white px-3.5 py-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg"
                    title="Save Profile to Vault"
                  >
                    <FolderPlus className="w-4 h-4 text-emerald-300" />
                    <span>Save</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Script Inputs & TTS Cloned Outputs */}
        <div className="space-y-5">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Languages className="w-4 h-4 text-emerald-400" />
            Step B: Multilingual Translation & TTS Script
          </h3>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-slate-400 font-bold mb-1.5 block">Language Mode</label>
                <select
                  value={targetLang}
                  onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm py-2 px-3 rounded-xl focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="English">English (Original Style)</option>
                  <option value="Spanish">Spanish (Español)</option>
                  <option value="French">French (Français)</option>
                  <option value="German">German (Deutsch)</option>
                  <option value="Japanese">Japanese (日本語)</option>
                  <option value="Hindi">Hindi (हिन्दी)</option>
                  <option value="Urdu">Urdu (اردو)</option>
                  <option value="Italian">Italian (Italiano)</option>
                  <option value="Arabic">Arabic (العربية)</option>
                  <option value="Portuguese">Portuguese (Português)</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold mb-1.5 block">Voice Accent Style</label>
                <select
                  value={selectedAccent}
                  onChange={(e) => setSelectedAccent(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm py-2 px-3 rounded-xl focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="American (General)">American (General)</option>
                  <option value="British (RP - London)">British (RP - London)</option>
                  <option value="British (Scottish)">British (Scottish)</option>
                  <option value="British (Irish)">British (Irish)</option>
                  <option value="Australian">Australian</option>
                  <option value="Indian English">Indian English</option>
                  <option value="Hindi Accented English">Hindi Accented English</option>
                  <option value="Urdu Accented English">Urdu Accented English</option>
                  <option value="Pakistani (Urdu Dialect)">Pakistani (Urdu Dialect)</option>
                  <option value="South African">South African</option>
                  <option value="Spanish Accented English">Spanish Accented English</option>
                  <option value="French Accented English">French Accented English</option>
                  <option value="Italian Accented English">Italian Accented English</option>
                  <option value="German Accented English">German Accented English</option>
                  <option value="Japanese Accented English">Japanese Accented English</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-bold mb-1.5 block">Delivery Theme / Style</label>
                <select
                  value={voiceTheme}
                  onChange={(e) => setVoiceTheme(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm py-2 px-3 rounded-xl focus:border-emerald-500 focus:outline-none cursor-pointer"
                >
                  <option value="conversational">Neutral Conversational</option>
                  <option value="advertisement">Advertisement / Promo</option>
                  <option value="storyteller">Storyteller / Narrator</option>
                  <option value="fast-paced">Fast-paced Shorts (YouTube/TikTok)</option>
                  <option value="horror">Horror / Suspenseful</option>
                  <option value="news">News Broadcast</option>
                  <option value="educational">Educational / Tutorial</option>
                  <option value="trailer">Movie Trailer (Epic)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-bold mb-1.5 block">Enter Script Text / Prompt</label>
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                rows={4}
                className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm p-3.5 rounded-xl focus:border-emerald-500 focus:outline-none resize-none font-sans"
                placeholder="Type anything you want your voice clone to speak..."
              />
              <div className="flex justify-between items-center mt-1">
                <span className="text-[10px] text-slate-500">{scriptText.length} characters</span>
                <span className="text-[10px] text-emerald-400 font-semibold">Accent set to: {selectedAccent}</span>
              </div>
            </div>

            {/* Presets suggestions */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Quick Sample Presets:</span>
              <div className="flex flex-col gap-1">
                {presets.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setScriptText(p)}
                    className="text-left text-xs text-slate-400 hover:text-emerald-400 hover:bg-slate-950/40 p-1.5 rounded transition-all truncate border border-transparent hover:border-slate-850"
                  >
                    "{p}"
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={generateClonedSpeech}
              disabled={isSynthesizing || !activeProfile}
              className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-850 disabled:text-slate-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg cursor-pointer animate-pulse-subtle"
            >
              {isSynthesizing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Generating Accent & Cloned Speech Audio...
                </>
              ) : (
                <>
                  <Volume2 className="w-4 h-4 text-emerald-300" />
                  Clone & Translate Speech Patterns
                </>
              )}
            </button>
          </div>

          {/* Generated Audio waveform & subtitles preview */}
          {activeTTS && (
            <div className="bg-slate-950/60 border border-slate-850 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">Active Synthesized Output</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-semibold uppercase">
                  Clone Generated
                </span>
              </div>

              {/* Simple subtitle overlay */}
              <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 text-center min-h-[70px] flex flex-col justify-center">
                <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1 font-bold">Speech Subtitle ({targetLang})</p>
                <p className="text-sm font-medium text-slate-100 italic">
                  "{activeTTS.translatedText}"
                </p>
              </div>

              {activeTTS.base64Audio && (
                <div className="space-y-3">
                  {/* Real-time playback audio waveform visualizer */}
                  <div className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex flex-col items-center justify-center h-20 relative overflow-hidden">
                    <canvas ref={playbackCanvasRef} width={400} height={60} className="w-full h-full rounded" />
                    {!isPlaying && (
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 backdrop-blur-[2px] text-[11px] text-slate-400 font-semibold gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        Click Play to see real-time voice waveform
                      </div>
                    )}
                  </div>

                  <audio
                    ref={playAudioRef}
                    src={getAudioSrc(activeTTS.base64Audio)}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onTimeUpdate={handleAudioTimeUpdate}
                    onEnded={handleAudioEnded}
                    onLoadedMetadata={handleLoadedMetadata}
                    className="hidden"
                  />

                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={togglePlayAudio}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white p-3.5 rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                    >
                      {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white ml-0.5" />}
                    </button>

                    <button
                      type="button"
                      onClick={downloadMp3}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white p-3 rounded-full shadow hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                      title="Download MP3"
                    >
                      <Download className="w-5 h-5" />
                    </button>

                    <div className="flex-1 bg-slate-900 border border-slate-850 h-3 rounded-full overflow-hidden relative">
                      <div 
                        className="bg-emerald-500 h-full transition-all"
                        style={{
                          width: `${duration > 0 ? (currentPlayTime / duration) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <span className="text-xs text-slate-400 font-mono shrink-0">
                      {formatTime(currentPlayTime)} / {formatTime(duration)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-5 flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-semibold">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
