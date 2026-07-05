import React, { useState, useEffect, useRef } from "react";
import { 
  Play, Pause, Film, MessageSquare, Eye, Sliders, Sparkles, 
  RefreshCw, AlertCircle, Maximize2, Radio, Activity, Camera, FolderPlus,
  Languages, Settings2, Cpu, Key
} from "lucide-react";
import { SocialPost, TTSResult, VideoScriptTimeline, VideoScriptKeyframe, User } from "../types";
import { makeApiRequest, checkLocalPCStatus, playCompletionSound } from "../lib/apiHelper";

interface MotionAnimatorProps {
  activeImage: SocialPost | null;
  activeTTS: TTSResult | null;
  onSaveAnimation?: (timeline: VideoScriptTimeline) => void;
  user?: User | null;
}

export default function MotionAnimator({ 
  activeImage, 
  activeTTS,
  onSaveAnimation,
  user
}: MotionAnimatorProps) {
  const [activeTab, setActiveTab] = useState<"kenburns" | "lipsync" | "director">("kenburns");
  const [isPlaying, setIsPlaying] = useState(false);

  // --- Personal Local PC & API Quota Settings State ---
  const [showSettings, setShowSettings] = useState(false);
  const [useLocalGpu, setUseLocalGpu] = useState(() => localStorage.getItem("use_local_gpu") === "true");
  const [localGpuHost, setLocalGpuHost] = useState(() => localStorage.getItem("local_gpu_host") || "http://localhost:8000");
  const [userGeminiKey, setUserGeminiKey] = useState(() => localStorage.getItem("user_gemini_key") || "");
  const [isLocalOnline, setIsLocalOnline] = useState<"checking" | "online" | "offline">("checking");

  // Periodically check connection to local PC
  useEffect(() => {
    let active = true;
    const checkConnection = async () => {
      if (!useLocalGpu) {
        setIsLocalOnline("offline");
        return;
      }
      setIsLocalOnline("checking");
      const online = await checkLocalPCStatus(localGpuHost);
      if (active) {
        setIsLocalOnline(online ? "online" : "offline");
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 10000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [useLocalGpu, localGpuHost]);

  const saveLocalGpuSettings = (useLocal: boolean, host: string, key: string) => {
    setUseLocalGpu(useLocal);
    setLocalGpuHost(host);
    setUserGeminiKey(key);
    localStorage.setItem("use_local_gpu", useLocal ? "true" : "false");
    localStorage.setItem("local_gpu_host", host);
    localStorage.setItem("user_gemini_key", key);
  };
  
  // Section 0: Custom Image Upload / URL States
  const [localImage, setLocalImage] = useState<SocialPost | null>(null);
  const [customUrl, setCustomUrl] = useState("");
  const [isExpandingPrompt, setIsExpandingPrompt] = useState(false);

  const currentImage = localImage || activeImage;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const b64 = event.target?.result as string;
      setLocalImage({
        id: "custom-upload-" + Date.now(),
        imageUrl: b64,
        caption: file.name,
        aspectRatio: "1:1",
        createdAt: new Date().toISOString()
      });
    };
    reader.readAsDataURL(file);
  };

  const handleAudioVoiceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLipsyncError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const resultBase64 = event.target?.result as string;
      const base64Data = resultBase64.split(",")[1] || resultBase64;

      // Create standard web Audio element to parse file duration dynamically
      const tempAudio = new Audio(resultBase64);
      tempAudio.onloadedmetadata = () => {
        const durationSec = tempAudio.duration || 5;
        const durationMs = Math.round(durationSec * 1000);

        // Generate dynamic character speaking mouth coordinates at 180ms frequency intervals
        const generatedTimeline = [];
        for (let t = 0; t < durationMs; t += 180) {
          const isWordPause = Math.sin(t / 800) < -0.45; // realistic word gaps
          const mouthOpen = isWordPause ? 0 : Math.abs(Math.sin(t / 110)) * 0.75 + 0.15;
          const mouthWidth = isWordPause ? 0.4 : 0.4 + Math.abs(Math.cos(t / 140)) * 0.4;
          const headTilt = Math.sin(t / 420) * 3.5 + Math.cos(t / 200) * 1.5;
          const eyesClosed = t % 3500 < 180; // beautiful standard blinking

          generatedTimeline.push({
            timeMs: t,
            mouthOpen,
            mouthWidth,
            eyesClosed,
            headTilt,
            subtitle: file.name
          });
        }

        setLocalTTS({
          translatedText: "Uploaded Voice Audio File",
          base64Audio: base64Data,
          timeline: generatedTimeline
        });

        // Trigger autoplay immediately and focus the view HUD
        setIsPlaying(true);
      };

      tempAudio.onerror = () => {
        setLipsyncError("Failed to decode uploaded audio file. Please upload standard MP3/WAV/M4A format.");
      };
    };
    reader.onerror = () => {
      setLipsyncError("FileReader failed reading your voice file.");
    };
    reader.readAsDataURL(file);
  };

  const handleUrlSubmit = (url: string) => {
    if (!url.trim()) return;
    setLocalImage({
      id: "custom-url-" + Date.now(),
      imageUrl: url.trim(),
      caption: "Custom Web Graphic",
      aspectRatio: "1:1",
      createdAt: new Date().toISOString()
    });
  };

  const handleAIPromptEnhance = async () => {
    if (!directorPrompt.trim()) return;
    setIsExpandingPrompt(true);
    try {
      const data = await makeApiRequest("/api/expand-prompt", { basicPrompt: directorPrompt });
      if (data.expandedPrompt) {
        setDirectorPrompt(data.expandedPrompt);
      }
    } catch (err) {
      console.error("AI prompt helper error:", err);
    } finally {
      setIsExpandingPrompt(false);
    }
  };

  // Section 1: Ken Burns States & AI Matcher
  const [kbMotionType, setKbMotionType] = useState<"dolly-in" | "dolly-out" | "pan-left" | "orbit-right" | "handheld">("dolly-in");
  const [kbDuration, setKbDuration] = useState<number>(10); // 1-25 seconds, default 10s
  const [quality, setQuality] = useState<"draft" | "medium" | "cinematic">("medium");
  const [kbOverlay, setKbOverlay] = useState<"none" | "particles" | "glitch" | "lens-flare" | "cinematic">("none");
  const [kbIntensity, setKbIntensity] = useState<number>(1.2);
  const [cameraPrompt, setCameraPrompt] = useState("dramatic slow zoom in with dreamy particles floating");
  const [isConfiguringCameraAI, setIsConfiguringCameraAI] = useState(false);

  const handleMatchCameraStyle = async () => {
    if (!cameraPrompt.trim()) return;
    setIsConfiguringCameraAI(true);
    try {
      const data = await makeApiRequest("/api/match-camera", { prompt: cameraPrompt });
      if (data.motionType) setKbMotionType(data.motionType);
      if (data.duration) setKbDuration(data.duration);
      if (data.quality) setQuality(data.quality);
      if (data.overlay) setKbOverlay(data.overlay);
      if (data.intensity) setKbIntensity(data.intensity);
    } catch (err) {
      console.error("AI camera matcher failed:", err);
    } finally {
      setIsConfiguringCameraAI(false);
    }
  };

  // Section 2: Lip Sync States & Local Synthesizer
  const [lipsyncAudioElement, setLipsyncAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [currentMouthOpen, setCurrentMouthOpen] = useState(0);
  const [currentHeadTilt, setCurrentHeadTilt] = useState(0);
  const [currentSubtitle, setCurrentSubtitle] = useState("");
  const [isBlinking, setIsBlinking] = useState(false);
  const [showWireframe, setShowWireframe] = useState(true);
  
  // Custom HUD adjustments
  const [hudX, setHudX] = useState(0);
  const [hudY, setHudY] = useState(-10);
  const [hudScale, setHudScale] = useState(1.0);
  
  // Movement dynamics & script prompts
  const [movementStyle, setMovementStyle] = useState<"subtle" | "vibrant" | "robotic" | "cinematic">("subtle");
  const [lipsyncScript, setLipsyncScript] = useState("Hey everyone! Watch my mouth move and my body sway dynamically to this generated voice cloning script!");
  const [lipsyncVoice, setLipsyncVoice] = useState("Serena");
  const [lipsyncLang, setLipsyncLang] = useState("English");
  const [isSynthesizingLipsync, setIsSynthesizingLipsync] = useState(false);
  const [localTTS, setLocalTTS] = useState<TTSResult | null>(null);
  const [lipsyncError, setLipsyncError] = useState<string | null>(null);

  const currentTTS = localTTS || activeTTS;

  const handleLipsyncSpeechGenerate = async () => {
    if (!lipsyncScript.trim()) {
      setLipsyncError("Please enter some text for your avatar to say.");
      return;
    }
    setIsSynthesizingLipsync(true);
    setLipsyncError(null);
    try {
      const result: TTSResult = await makeApiRequest("/api/voice-generate", {
        text: lipsyncScript,
        targetLanguage: lipsyncLang,
        recommendedVoice: lipsyncVoice,
        voiceProfile: {
          accent: lipsyncLang === "English" ? "neutral" : "local accent",
          pitch: "medium",
          tone: ["professional", "vibrant"]
        }
      });

      setLocalTTS(result);
      
      // Auto trigger playback and lock HUD
      setIsPlaying(true);
    } catch (err: any) {
      console.error(err);
      setLipsyncError(err.message || "Failed to generate lip sync voice. Try setting your personal Gemini key.");
    } finally {
      setIsSynthesizingLipsync(false);
    }
  };

  // Section 3: Text-To-Video Script States
  const [directorPrompt, setDirectorPrompt] = useState(
    "Astronaut realizes the booster rocket is venting oxygen: dramatic fast zoom in, facial alarm expression, warning lights red flash overlay, rapid text subtitles"
  );
  const [isGeneratingDirector, setIsGeneratingDirector] = useState(false);
  const [directorTimeline, setDirectorTimeline] = useState<VideoScriptTimeline | null>(null);
  const [directorError, setDirectorError] = useState<string | null>(null);
  
  // Script Timeline Player States
  const [directorTime, setDirectorTime] = useState(0);
  const [directorActiveIndex, setDirectorActiveIndex] = useState(0);
  const directorIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up audio & intervals
  useEffect(() => {
    return () => {
      if (directorIntervalRef.current) clearInterval(directorIntervalRef.current);
    };
  }, []);

  // Sync LipSync Audio playing with state
  useEffect(() => {
    if (currentTTS?.base64Audio) {
      const audio = new Audio(`data:audio/wav;base64,${currentTTS.base64Audio}`);
      audio.onended = () => {
        setIsPlaying(false);
        setCurrentTimeMs(0);
        setCurrentMouthOpen(0);
        setCurrentHeadTilt(0);
        setCurrentSubtitle("");
      };
      setLipsyncAudioElement(audio);
    } else {
      setLipsyncAudioElement(null);
    }
  }, [currentTTS]);

  // Audio Time Update listener for LipSync
  useEffect(() => {
    if (!lipsyncAudioElement || !isPlaying || activeTab !== "lipsync") return;

    let animFrameId: number;
    const updateLipSyncFrame = () => {
      if (!lipsyncAudioElement) return;

      const timeMs = lipsyncAudioElement.currentTime * 1000;
      setCurrentTimeMs(timeMs);

      // Find closest keyframe from currentTTS timeline
      if (currentTTS?.timeline && currentTTS.timeline.length > 0) {
        const closest = currentTTS.timeline.reduce((prev, curr) => {
          return Math.abs(curr.timeMs - timeMs) < Math.abs(prev.timeMs - timeMs) ? curr : prev;
        });

        if (closest && Math.abs(closest.timeMs - timeMs) < 300) {
          setCurrentMouthOpen(closest.mouthOpen);
          setCurrentHeadTilt(closest.headTilt);
          setCurrentSubtitle(closest.subtitle || "");
          setIsBlinking(closest.eyesClosed);
        } else {
          // fallback noise speech wave
          setCurrentMouthOpen(Math.sin(timeMs / 60) * 0.4 + 0.3);
          setCurrentHeadTilt(Math.cos(timeMs / 300) * 4);
        }
      } else {
        // Fallback procedural lipsync when no timeline available
        const randomMouth = Math.sin(timeMs / 80) * 0.5 + 0.5;
        setCurrentMouthOpen(randomMouth);
        setCurrentHeadTilt(Math.cos(timeMs / 400) * 6);
      }

      animFrameId = requestAnimationFrame(updateLipSyncFrame);
    };

    if (isPlaying) {
      lipsyncAudioElement.play().catch(e => console.warn(e));
      animFrameId = requestAnimationFrame(updateLipSyncFrame);
    } else {
      lipsyncAudioElement.pause();
    }

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [isPlaying, lipsyncAudioElement, currentTTS, activeTab]);

  // Handle Play/Pause Global Action
  const togglePlay = () => {
    if (activeTab === "lipsync") {
      if (!currentTTS) return;
      setIsPlaying(!isPlaying);
    } else if (activeTab === "director") {
      if (!directorTimeline) return;
      
      if (isPlaying) {
        if (directorIntervalRef.current) {
          clearInterval(directorIntervalRef.current);
          directorIntervalRef.current = null;
        }
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
        const duration = directorTimeline.durationMs;
        
        directorIntervalRef.current = setInterval(() => {
          setDirectorTime((prev) => {
            const next = prev + 100;
            if (next >= duration) {
              clearInterval(directorIntervalRef.current!);
              directorIntervalRef.current = null;
              setIsPlaying(false);
              return 0;
            }
            return next;
          });
        }, 100);
      }
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  // Sync Director script keyframes based on directorTime state
  useEffect(() => {
    if (activeTab !== "director" || !directorTimeline) return;

    const keyframes = directorTimeline.timeline;
    if (keyframes.length === 0) return;

    // Find current active keyframe
    const activeIdx = keyframes.findIndex((k, idx) => {
      const nextK = keyframes[idx + 1];
      if (!nextK) return true;
      return directorTime >= k.timeMs && directorTime < nextK.timeMs;
    });

    if (activeIdx !== -1) {
      setDirectorActiveIndex(activeIdx);
    }
  }, [directorTime, directorTimeline, activeTab]);

  // Trigger Gemini Text-to-Video timeline creation
  const generateDirectorScript = async () => {
    if (!directorPrompt.trim()) {
      setDirectorError("Please describe a cinematic action or script prompt.");
      return;
    }

    setIsGeneratingDirector(true);
    setDirectorError(null);
    setDirectorTimeline(null);
    setDirectorTime(0);

    try {
      const timelineData: VideoScriptTimeline = await makeApiRequest("/api/video-script-animate", {
        scriptPrompt: directorPrompt,
        activeImageBase64: currentImage?.imageUrl || null,
        activeAudioBase64: activeTTS?.base64Audio || null,
      });

      setDirectorTimeline(timelineData);
      playCompletionSound();
    } catch (err: any) {
      console.error(err);
      setDirectorError(err.message || "Failed to parse text-to-video script timeline.");
    } finally {
      setIsGeneratingDirector(false);
    }
  };

  // Reset LipSync Player
  const resetLipSyncPlayer = () => {
    if (lipsyncAudioElement) {
      lipsyncAudioElement.currentTime = 0;
      lipsyncAudioElement.pause();
    }
    setIsPlaying(false);
    setCurrentTimeMs(0);
    setCurrentMouthOpen(0);
    setCurrentHeadTilt(0);
    setCurrentSubtitle("");
  };

  // CSS for Ken Burns
  const getKenBurnsTransform = () => {
    if (activeTab !== "kenburns") return {};
    
    const speedSec = kbDuration; // direct duration in seconds
    
    // Return standard CSS style transitions
    const transformStyle: React.CSSProperties = {
      transition: isPlaying ? `transform ${speedSec}s ease-in-out, filter ${speedSec}s ease-in-out` : "all 0.5s ease",
      transform: isPlaying 
        ? kbMotionType === "dolly-in" 
          ? `scale(${kbIntensity}) translate(5px, 3px)` 
          : kbMotionType === "dolly-out"
            ? `scale(${1 / kbIntensity}) translate(-5px, -3px)`
            : kbMotionType === "pan-left"
              ? `scale(1.15) translateX(-${30 * kbIntensity}px)`
              : kbMotionType === "orbit-right"
                ? `scale(1.15) rotate(${5 * kbIntensity}deg) translateX(${15 * kbIntensity}px)`
                : `scale(1.1) translate(${Math.sin(Date.now() / 200) * 4}px, ${Math.cos(Date.now() / 150) * 4}px) rotate(${Math.sin(Date.now() / 500) * 1.5}deg)`
        : "scale(1) translate(0px, 0px) rotate(0deg)"
    };

    // Apply Quality enhancements
    if (quality === "draft") {
      // Basic styling, no advanced filters or perspective warping
    } else if (quality === "medium") {
      // Standard color grading
      if (isPlaying) {
        transformStyle.filter = "contrast(1.04) saturate(1.05)";
      }
    } else if (quality === "cinematic") {
      // High-quality lens motion blur, subtle glow/bloom, enhanced perspective depth
      if (isPlaying) {
        transformStyle.filter = "contrast(1.08) saturate(1.08) brightness(1.02) drop-shadow(0px 10px 30px rgba(0,0,0,0.5))";
        transformStyle.transform = `perspective(800px) rotateX(${kbMotionType === "handheld" ? 2.5 : 1.2}deg) ` + transformStyle.transform;
      }
    }

    return transformStyle;
  };

  // CSS for Director Canvas camera tracking
  const getDirectorCameraTransform = () => {
    if (!directorTimeline || directorTimeline.timeline.length === 0) return {};

    const activeKf = directorTimeline.timeline[directorActiveIndex];
    if (!activeKf || !activeKf.camera) return {};

    const cam = activeKf.camera;
    return {
      transition: "transform 0.4s ease-out-in",
      transform: `scale(${cam.scale || 1.0}) translate(${cam.panX || 0}px, ${cam.panY || 0}px) rotate(${cam.rotate || 0}deg)`
    };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl transition-all">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-4 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 text-blue-400">
            <Film className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">3. Creative Image Animation Studio</h2>
            <p className="text-xs text-slate-400">Animate social media posts and character coordinates driven by scripts</p>
          </div>
        </div>

        {/* Tab Headers and Settings Toggle */}
        <div className="flex items-center gap-3 self-stretch md:self-auto">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-850 w-full md:w-auto">
            <button
              onClick={() => { setActiveTab("kenburns"); setIsPlaying(false); }}
              className={`flex-1 md:flex-none text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "kenburns" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              Section 1: 3D Camera
            </button>
            <button
              onClick={() => { setActiveTab("lipsync"); setIsPlaying(false); }}
              className={`flex-1 md:flex-none text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "lipsync" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Section 2: Voice Drive
            </button>
            <button
              onClick={() => { setActiveTab("director"); setIsPlaying(false); }}
              className={`flex-1 md:flex-none text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "director" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              Section 3: Text-to-Video
            </button>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition-all cursor-pointer ${
              showSettings 
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400" 
                : "bg-slate-950 border-slate-850 text-slate-400 hover:text-slate-200 hover:bg-slate-900"
            }`}
            title="Local PC & API Quota Settings"
          >
            <Settings2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 🔌 Personal Local PC Rendering & API Quota Settings Panel */}
      {showSettings && (
        <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-5 mb-6 space-y-4 shadow-xl transition-all">
          <div className="flex items-center justify-between border-b border-slate-850 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-slate-200">🔌 Visitor PC GPU Rendering & API Quota Settings</h3>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">Configure local rendering & your own API limit boundaries</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-xs">
            {/* 1. PC GPU rendering toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  Local PC GPU Mode
                </label>
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                  isLocalOnline === "online" 
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" 
                    : isLocalOnline === "checking"
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/25 animate-pulse"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/25"
                }`}>
                  {isLocalOnline === "online" && "● RTX GPU ONLINE"}
                  {isLocalOnline === "checking" && "○ PINGING..."}
                  {isLocalOnline === "offline" && "● OFFLINE"}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-normal">
                Bypass cloud servers. Renders lip-syncs, voice cloning, and text-to-videos directly on your local computer's RTX hardware.
              </p>
              <button
                type="button"
                onClick={() => saveLocalGpuSettings(!useLocalGpu, localGpuHost, userGeminiKey)}
                className={`w-full py-2 px-3 rounded-lg border font-bold transition-all text-center cursor-pointer ${
                  useLocalGpu 
                    ? "bg-blue-600 border-blue-500 text-white" 
                    : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {useLocalGpu ? "Enabled (Using Visitor PC)" : "Disabled (Using Cloud Servers)"}
              </button>
            </div>

            {/* 2. PC GPU Endpoint URL */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 block">My PC GPU Server Host URL</label>
              <p className="text-[11px] text-slate-400 leading-normal">
                The local port or address where your SadTalker / AI Voice clone server is running on your machine.
              </p>
              <input
                type="text"
                placeholder="http://localhost:8000"
                value={localGpuHost}
                onChange={(e) => saveLocalGpuSettings(useLocalGpu, e.target.value, userGeminiKey)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>

            {/* 3. Personal Gemini API Key */}
            <div className="space-y-2">
              <label className="font-bold text-slate-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-amber-400" />
                Personal Gemini API Key (Optional)
              </label>
              <p className="text-[11px] text-slate-400 leading-normal">
                Supply your own API key to bypass shared workspace quota restrictions. Keys are stored locally in your browser.
              </p>
              <input
                type="password"
                placeholder="AIzaSy..."
                value={userGeminiKey}
                onChange={(e) => saveLocalGpuSettings(useLocalGpu, localGpuHost, e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 font-mono text-xs"
              />
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* LEFT COLUMN: Controls based on active Tab */}
        <div className="lg:col-span-5 space-y-6">
          {/* TAB 1: Ken Burns Camera Controls */}
          {activeTab === "kenburns" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 bg-blue-500/5 text-blue-400 border border-blue-500/10 px-3 py-2 rounded-xl text-xs font-semibold">
                <Sliders className="w-4 h-4 shrink-0" />
                Select camera paths to animate standard social images
              </div>

              {/* AI Camera Style Architect */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 shadow-md">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                    AI Camera Style Architect
                  </span>
                  <span className="text-[10px] text-blue-400 font-mono font-bold uppercase">Prompt Mode</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={cameraPrompt}
                    onChange={(e) => setCameraPrompt(e.target.value)}
                    placeholder="e.g. dramatic orbit right, 12 seconds, glitch overlay"
                    className="flex-1 bg-slate-900 border border-slate-800 text-slate-200 text-xs px-3 py-2 rounded-lg focus:outline-none focus:border-blue-500 min-w-0"
                  />
                  <button
                    type="button"
                    onClick={handleMatchCameraStyle}
                    disabled={isConfiguringCameraAI || !cameraPrompt.trim()}
                    className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    {isConfiguringCameraAI ? (
                      <RefreshCw className="w-3 h-3 animate-spin text-white" />
                    ) : (
                      "Apply"
                    )}
                  </button>
                </div>
                <p className="text-[9px] text-slate-500 leading-normal">
                  Type how you want the camera to move. The AI will instantly align motion, duration, quality, and overlay filters.
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-xs text-slate-400 font-bold block">Camera Motion Track</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {(["dolly-in", "dolly-out", "pan-left", "orbit-right", "handheld"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setKbMotionType(m)}
                      className={`text-left text-xs p-3 rounded-xl border capitalize transition-all cursor-pointer ${
                        kbMotionType === m
                          ? "border-blue-500 bg-blue-500/10 text-blue-400 font-bold"
                          : "border-slate-800 hover:border-slate-750 bg-slate-950 text-slate-300"
                      }`}
                    >
                      {m.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-400 font-bold">Animation Duration</label>
                    <span className="text-xs font-mono text-blue-400">{kbDuration} seconds</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="25"
                    step="1"
                    value={kbDuration}
                    onChange={(e) => setKbDuration(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-400 font-bold block">Rendering Quality</label>
                    <span className="text-xs font-mono text-blue-400 uppercase">{quality}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["draft", "medium", "cinematic"] as const).map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => setQuality(q)}
                        className={`text-xs p-2 rounded-lg border capitalize transition-all cursor-pointer ${
                          quality === q
                            ? q === "cinematic"
                              ? "border-purple-500 bg-purple-500/15 text-purple-300 font-bold"
                              : q === "medium"
                                ? "border-blue-500 bg-blue-500/15 text-blue-300 font-bold"
                                : "border-slate-500 bg-slate-500/15 text-slate-300 font-bold"
                            : "border-slate-850 bg-slate-950 text-slate-400 hover:text-slate-200"
                        }`}
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 leading-normal">
                    {quality === "draft" && "Fast previews with zero post-processing loads."}
                    {quality === "medium" && "Balanced transitions with default saturation boosts."}
                    {quality === "cinematic" && "Ultimate 3D depth-warp, color grades, and motion drop shadows."}
                  </p>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs text-slate-400 font-bold">Motion Scale Intensity</label>
                    <span className="text-xs font-mono text-blue-400">{(kbIntensity * 100).toFixed(0)}%</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="1.5"
                    step="0.05"
                    value={kbIntensity}
                    onChange={(e) => setKbIntensity(Number(e.target.value))}
                    className="w-full accent-blue-500 bg-slate-950 h-2 rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs text-slate-400 font-bold block">Atmospheric Post-Filter Effects</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["none", "particles", "glitch", "lens-flare", "cinematic"] as const).map((fx) => (
                    <button
                      key={fx}
                      onClick={() => setKbOverlay(fx)}
                      className={`text-xs p-2.5 rounded-lg border capitalize transition-all cursor-pointer ${
                        kbOverlay === fx
                          ? "border-blue-500 bg-blue-500/10 text-blue-400 font-bold"
                          : "border-slate-850 bg-slate-950 text-slate-400"
                      }`}
                    >
                      {fx.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Audio Lip Sync Puppeteer */}
          {activeTab === "lipsync" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 px-3 py-2 rounded-xl text-xs font-semibold">
                <Activity className="w-4 h-4 shrink-0 animate-pulse" />
                Driver: Voice Synthesis & Speech Puppeteering
              </div>

              {/* AI Voice & Script Prompt Section */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-4 shadow-md">
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs text-slate-300 font-bold flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                    Character Voice Script Prompt
                  </label>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">Prompt Mode</span>
                </div>

                <textarea
                  value={lipsyncScript}
                  onChange={(e) => setLipsyncScript(e.target.value)}
                  rows={3}
                  placeholder="Enter what you want this character to speak here..."
                  className="w-full bg-slate-900 border border-slate-800 text-slate-200 text-xs p-3 rounded-lg focus:border-emerald-500 focus:outline-none resize-none"
                />

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Vocal Voice</label>
                    <select
                      value={lipsyncVoice}
                      onChange={(e) => setLipsyncVoice(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="Serena">Serena (Calm, Professional)</option>
                      <option value="Zephyr">Zephyr (Deep, Resonant)</option>
                      <option value="Aoede">Aoede (Clear, Friendly)</option>
                      <option value="Fenrir">Fenrir (Warm, Confident)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Language</label>
                    <select
                      value={lipsyncLang}
                      onChange={(e) => setLipsyncLang(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="Japanese">Japanese</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold uppercase block mb-1">Movement Dynamics Style</label>
                    <select
                      value={movementStyle}
                      onChange={(e) => setMovementStyle(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs px-2.5 py-1.5 rounded-lg focus:outline-none focus:border-emerald-500"
                    >
                      <option value="subtle">Subtle Speaking (Gentle Head Bobs)</option>
                      <option value="vibrant">Vibrant Orator (Dynamic Tilts & Bounces)</option>
                      <option value="robotic">Robotic Glitch (Jittery & Digital scale)</option>
                      <option value="cinematic">Cinematic Sway (Elegant Sinusoidal Swings)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleLipsyncSpeechGenerate}
                  disabled={isSynthesizingLipsync}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-850 disabled:text-slate-500 text-white py-2.5 rounded-lg text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {isSynthesizingLipsync ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Synthesizing Voice & Mapping Mouth Lip Sync...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-emerald-200" />
                      Synthesize Voice & Drive Lip Sync
                    </>
                  )}
                </button>

                {/* Optional Voice Upload Row */}
                <div className="relative flex items-center justify-center py-1">
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className="w-full border-t border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-slate-950 px-3 text-[9px] font-black text-slate-500 tracking-wider">OR UPLOAD OWN VOICE (OPTIONAL)</span>
                  </div>
                </div>

                <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-wider block">Voice Audio File</span>
                    {localTTS?.translatedText === "Uploaded Voice Audio File" && (
                      <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold animate-pulse">
                        CONNECTED
                      </span>
                    )}
                  </div>
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioVoiceUpload}
                    className="block w-full text-xs text-slate-400 file:mr-2.5 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[9px] file:font-bold file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
                  />
                  <p className="text-[9px] text-slate-500 leading-normal">
                    Optionally select an MP3/WAV voice clip. The system will build a synchronous lipsync motion map automatically!
                  </p>
                </div>

                {lipsyncError && (
                  <p className="text-[10px] text-red-400 font-semibold bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                    {lipsyncError}
                  </p>
                )}
              </div>

              {/* HUD Positioning Calibration controls */}
              <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5 shadow-md">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-300 flex items-center gap-1">
                    <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                    HUD Tracker Calibration
                  </span>
                  <label className="flex items-center gap-1.5 text-[10px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showWireframe}
                      onChange={(e) => setShowWireframe(e.target.checked)}
                      className="rounded border-slate-800 bg-slate-900 text-emerald-500 focus:ring-0 w-3 h-3"
                    />
                    Display HUD HUD
                  </label>
                </div>

                {showWireframe && (
                  <div className="space-y-2 text-[10px] text-slate-400">
                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span>Horizontal Offset (Face X)</span>
                        <span className="font-mono text-emerald-400">{hudX}px</span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="2"
                        value={hudX}
                        onChange={(e) => setHudX(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span>Vertical Offset (Face Y)</span>
                        <span className="font-mono text-emerald-400">{hudY}px</span>
                      </div>
                      <input
                        type="range"
                        min="-120"
                        max="120"
                        step="2"
                        value={hudY}
                        onChange={(e) => setHudY(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-0.5">
                        <span>HUD Tracker Scale (Face Zoom)</span>
                        <span className="font-mono text-emerald-400">{hudScale.toFixed(2)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.4"
                        max="2.2"
                        step="0.05"
                        value={hudScale}
                        onChange={(e) => setHudScale(Number(e.target.value))}
                        className="w-full accent-emerald-500 bg-slate-900 h-1.5 rounded"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Speech & Sound check metrics */}
              {currentTTS && (
                <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3.5 shadow-md">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-400 uppercase">Synchronized Sound Check</span>
                    <span className="text-emerald-400 font-mono font-semibold">{(currentTimeMs / 1000).toFixed(1)}s</span>
                  </div>

                  <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-slate-300 font-medium">Cloned TTS Voice Ready</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalTTS(null);
                        setCurrentTimeMs(0);
                        setIsPlaying(false);
                      }}
                      className="text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer transition-all"
                    >
                      Clear Voice
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Phonetic Mouth Verticals (A-E-I-O-U)</span>
                        <span className="font-mono text-emerald-400">{(currentMouthOpen * 100).toFixed(0)}%</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-emerald-500 h-full transition-all" style={{ width: `${currentMouthOpen * 100}%` }} />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                        <span>Acoustic Head Bobbing / Inertia</span>
                        <span className="font-mono text-emerald-400">{currentHeadTilt.toFixed(1)}°</span>
                      </div>
                      <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-500 h-full transition-all" 
                          style={{ width: `${((currentHeadTilt + 12) / 24) * 100}%` }} 
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Text-To-Video Cinematic Director Controls */}
          {activeTab === "director" && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 bg-purple-500/5 text-purple-400 border border-purple-500/10 px-3 py-2 rounded-xl text-xs font-semibold">
                <Maximize2 className="w-4 h-4 shrink-0" />
                Text-to-Video: Let Gemini build camera tracks and keyframe timelines
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-bold">Enter Video Scene / Cinematic Prompt</label>
                  <button
                    type="button"
                    onClick={handleAIPromptEnhance}
                    disabled={isExpandingPrompt || !directorPrompt.trim()}
                    className="flex items-center gap-1.5 text-[10px] text-purple-400 bg-purple-500/10 hover:bg-purple-500/20 px-2.5 py-1 rounded-lg border border-purple-500/20 font-bold transition-all disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {isExpandingPrompt ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-purple-400" />
                        Refining Script...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3 text-purple-300" />
                        AI Act as Prompt Architect
                      </>
                    )}
                  </button>
                </div>
                <textarea
                  value={directorPrompt}
                  onChange={(e) => setDirectorPrompt(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm p-3.5 rounded-xl focus:border-purple-500 focus:outline-none resize-none"
                  placeholder="Describe camera zooming, rotation movements, emotional facial reactions..."
                />
              </div>

              <button
                onClick={generateDirectorScript}
                disabled={isGeneratingDirector}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-850 disabled:text-slate-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg cursor-pointer"
              >
                {isGeneratingDirector ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Assembling Camera & Subtitle Keyframes...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    Generate Cinematic Director Script
                  </>
                )}
              </button>

              {directorError && (
                <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{directorError}</p>
                </div>
              )}

              {/* Director Script Details metadata */}
              {directorTimeline && (
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-400 uppercase">Director Script Output</span>
                    <span className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-[10px]">
                      {directorTimeline.mood}
                    </span>
                  </div>
                  
                  <div className="text-xs space-y-1.5 text-slate-300">
                    <p><strong className="text-slate-400">Cinematic Scenery:</strong> {directorTimeline.scenery}</p>
                    <p><strong className="text-slate-400">Total Duration:</strong> {(directorTimeline.durationMs / 1000).toFixed(1)}s</p>
                  </div>

                  {onSaveAnimation && (
                    <button
                      type="button"
                      onClick={() => onSaveAnimation(directorTimeline)}
                      className="w-full bg-purple-600 hover:bg-purple-500 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-purple-950/20 mt-1"
                    >
                      <FolderPlus className="w-4 h-4 text-purple-200" />
                      Save Timeline to Vault
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Interactive Rendering Canvas */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-4">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 relative overflow-hidden flex flex-col justify-between min-h-[580px] lg:h-[640px]">
            {/* HUD Status tags */}
            <div className="flex items-center justify-between z-10">
              <span className="flex items-center gap-1 text-[9px] font-mono text-slate-400 bg-slate-900 border border-slate-800 px-2 py-1 rounded">
                <Sliders className="w-3 h-3 text-blue-400" /> STAGE MONITOR: {activeTab.toUpperCase()}
              </span>
              {currentImage && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setLocalImage(null);
                      setCustomUrl("");
                    }}
                    className="text-[9px] font-bold text-slate-400 hover:text-indigo-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded transition-all cursor-pointer"
                  >
                    Change Character
                  </button>
                  <span className="text-[9px] font-mono text-slate-500">
                    {currentImage.aspectRatio} Asset
                  </span>
                </div>
              )}
            </div>

            {/* Main Visual Node stage */}
            <div className="flex-1 flex items-center justify-center overflow-hidden my-4 relative">
              {currentImage ? (
                <div 
                  className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl transition-all"
                  style={{
                    aspectRatio: currentImage.aspectRatio.replace(":", "/"),
                    height: "100%",
                    maxHeight: "440px",
                    maxWidth: "100%",
                  }}
                >
                  {/* Outer atmospheric Overlay Effects */}
                  {activeTab === "kenburns" && kbOverlay !== "none" && (
                    <div className="absolute inset-0 z-20 pointer-events-none">
                      {kbOverlay === "particles" && (
                        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.1),transparent)] animate-pulse">
                          {/* Animated particle dots */}
                          <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce duration-1000" />
                          <div className="absolute top-1/2 left-2/3 w-2 h-2 bg-blue-300 rounded-full animate-bounce duration-2000" />
                          <div className="absolute top-3/4 left-1/3 w-1 h-1 bg-teal-400 rounded-full animate-bounce duration-1500" />
                        </div>
                      )}
                      {kbOverlay === "glitch" && (
                        <div className="absolute inset-0 border-2 border-red-500/10 bg-red-500/5 mix-blend-color-dodge animate-pulse" />
                      )}
                      {kbOverlay === "lens-flare" && (
                        <div className="absolute -top-10 -left-10 w-40 h-40 bg-gradient-to-br from-yellow-300/20 via-blue-400/10 to-transparent rounded-full filter blur-xl animate-pulse" />
                      )}
                      {kbOverlay === "cinematic" && (
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/50" />
                      )}
                    </div>
                  )}

                  {/* Character Facial Landmark Overlay HUD for LipSync tab */}
                  {activeTab === "lipsync" && showWireframe && (
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                      <div className="w-full h-full border border-emerald-500/20 absolute inset-0 bg-[linear-gradient(rgba(16,185,129,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(16,185,129,0.02)_1px,transparent_1px)] bg-[size:16px_16px]" />
                      
                      {/* Landmark tracking rings with custom calibration offsets */}
                      <div 
                        className="border border-dashed border-emerald-500/40 rounded-full absolute flex items-center justify-center transition-all duration-100"
                        style={{
                          width: "70px",
                          height: "70px",
                          transform: `translate(${hudX}px, ${hudY}px) rotate(${currentHeadTilt}deg) scale(${hudScale * (1 + currentMouthOpen * 0.05)})`
                        }}
                      >
                        {/* Eye Landmark nodes */}
                        <div className={`w-2.5 h-1 bg-emerald-400 absolute left-3 top-6 rounded ${isBlinking ? "scale-y-0" : "scale-y-100 transition-transform"}`} />
                        <div className={`w-2.5 h-1 bg-emerald-400 absolute right-3 top-6 rounded ${isBlinking ? "scale-y-0" : "scale-y-100 transition-transform"}`} />

                        {/* Mouth Landmark node dynamically resizing vertically */}
                        <div 
                          className="border border-emerald-400/80 bg-emerald-500/20 absolute bottom-5 rounded-full transition-all"
                          style={{
                            width: "20px",
                            height: `${8 + currentMouthOpen * 16}px`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Character LipSync Canvas overlay inside text-to-video tab */}
                  {activeTab === "director" && directorTimeline && (
                    <div className="absolute inset-0 z-20 pointer-events-none flex items-center justify-center">
                      {/* Dynamic expression label badge */}
                      <span className="absolute top-3 left-3 bg-purple-600/90 text-[8px] font-bold text-white px-2 py-0.5 rounded border border-purple-500 uppercase">
                        EXPR: {directorTimeline.timeline[directorActiveIndex]?.expression || "talking"}
                      </span>
                      
                      {/* Subtitle bottom banner */}
                      {directorTimeline.timeline[directorActiveIndex]?.subtitle && (
                        <div className="absolute bottom-2 inset-x-2 bg-black/85 text-white p-2 rounded border border-slate-800 text-center">
                          <p className="text-xs font-semibold text-purple-300">
                            {directorTimeline.timeline[directorActiveIndex].subtitle}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actual Post Image with transforms */}
                  <img
                    src={currentImage.imageUrl}
                    alt="Active animation element"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover origin-center"
                    style={{
                      ...(activeTab === "kenburns" ? getKenBurnsTransform() : {}),
                      ...(activeTab === "director" ? getDirectorCameraTransform() : {}),
                      ...(activeTab === "lipsync" ? {
                        transition: "transform 0.12s ease-out",
                        transform: isPlaying 
                          ? movementStyle === "vibrant"
                            ? `scale(${1.03 + currentMouthOpen * 0.03}) rotate(${currentHeadTilt * 1.6}deg) translateY(${currentMouthOpen * 4}px) translateX(${Math.sin(currentTimeMs / 180) * 4}px)`
                            : movementStyle === "robotic"
                              ? `scale(${1.01 + Math.round(currentMouthOpen) * 0.04}) rotate(${Math.round(currentHeadTilt / 3) * 3}deg) translateY(${Math.round(currentMouthOpen) * 6}px) skewX(${Math.sin(currentTimeMs / 30) * 0.8}deg)`
                              : movementStyle === "cinematic"
                                ? `scale(1.04) rotate(${currentHeadTilt}deg) translateY(${Math.sin(currentTimeMs / 350) * 5}px) translateX(${Math.cos(currentTimeMs / 500) * 4}px)`
                                : `scale(1.02) rotate(${currentHeadTilt}deg) translateY(${currentMouthOpen * 1.5}px)` // subtle default
                          : "scale(1) rotate(0deg) translateY(0px) translateX(0px)"
                      } : {})
                    }}
                  />
                </div>
              ) : (
                <div className="w-full max-w-md mx-auto space-y-4 p-4 border border-slate-850 rounded-xl bg-slate-950/90 text-center">
                  <div className="flex flex-col items-center justify-center space-y-1">
                    <Camera className="w-8 h-8 text-indigo-400 animate-pulse" />
                    <h3 className="text-xs font-black tracking-tight text-slate-200">Load Character to Animate</h3>
                    <p className="text-[10px] text-slate-500 max-w-[280px]">
                      Upload your own character face, paste a URL, or choose an artist-crafted profile below.
                    </p>
                  </div>

                  {/* Upload Actions Row */}
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex flex-col items-center justify-center border border-dashed border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 rounded-lg p-2.5 cursor-pointer transition-all">
                      <span className="text-[10px] font-bold text-indigo-400">Upload File</span>
                      <span className="text-[8px] text-slate-500 mt-0.5">PNG, JPG, WebP</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    <div className="flex flex-col justify-between border border-slate-850 bg-slate-900/20 rounded-lg p-2.5">
                      <span className="text-[9px] font-semibold text-slate-400 text-left">Paste Image URL</span>
                      <div className="flex gap-1 mt-1">
                        <input
                          type="text"
                          placeholder="https://..."
                          value={customUrl}
                          onChange={(e) => setCustomUrl(e.target.value)}
                          className="bg-slate-950 border border-slate-850 text-[9px] px-2 py-1 rounded text-slate-300 focus:outline-none focus:border-indigo-500 flex-1 min-w-0"
                        />
                        <button
                          type="button"
                          onClick={() => handleUrlSubmit(customUrl)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-[9px] font-bold px-2 py-1 rounded cursor-pointer"
                        >
                          Load
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Presets Grid */}
                  <div className="space-y-1.5">
                    <p className="text-[9px] font-bold text-slate-500 text-left uppercase tracking-wider">Studio Portrait Presets</p>
                    <div className="grid grid-cols-4 gap-1.5">
                      {[
                        { name: "Cyberpunk", url: "https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=400&q=80" },
                        { name: "Retro", url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80" },
                        { name: "Explorer", url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80" },
                        { name: "Architect", url: "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=400&q=80" },
                      ].map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setLocalImage({
                            id: preset.name.toLowerCase(),
                            imageUrl: preset.url,
                            caption: preset.name,
                            aspectRatio: "1:1",
                            createdAt: new Date().toISOString()
                          })}
                          className="flex flex-col items-center gap-1 p-1 bg-slate-900 hover:bg-indigo-950/30 border border-slate-850 hover:border-indigo-500/30 rounded transition-all cursor-pointer"
                        >
                          <img src={preset.url} className="w-8 h-8 rounded-full object-cover" alt="" />
                          <span className="text-[8px] text-slate-400 font-semibold truncate w-full text-center">{preset.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Playback bar & Subtitles Overlay */}
            <div className="z-10 bg-slate-900 border border-slate-850 p-2.5 rounded-xl">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlay}
                  disabled={!currentImage || (activeTab === "lipsync" && !currentTTS) || (activeTab === "director" && !directorTimeline)}
                  className={`p-2.5 rounded-lg transition-all flex-shrink-0 cursor-pointer ${
                    currentImage && ((activeTab === "lipsync" && currentTTS) || (activeTab === "director" && directorTimeline) || activeTab === "kenburns")
                      ? "bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-950/50 animate-pulse"
                      : "bg-slate-800 text-slate-600"
                  }`}
                >
                  {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white ml-0.5" />}
                </button>

                <div className="flex-1 text-center truncate px-2 min-h-[20px] flex items-center justify-center">
                  {activeTab === "lipsync" && currentSubtitle ? (
                    <p className="text-xs text-emerald-400 font-mono animate-pulse truncate font-semibold">
                      Speaking: "{currentSubtitle}"
                    </p>
                  ) : activeTab === "director" && directorTimeline && isPlaying ? (
                    <p className="text-xs text-purple-400 font-mono truncate font-semibold">
                      Director Timeline: {((directorTime) / 1000).toFixed(1)}s / {(directorTimeline.durationMs / 1000).toFixed(1)}s
                    </p>
                  ) : (
                    <div className="text-xs">
                      {activeTab === "lipsync" && currentTTS && !isPlaying ? (
                        <p className="text-amber-400 font-mono animate-pulse font-bold">
                          ✨ VOICE CONNECTED! Click the blue Play button left to speak!
                        </p>
                      ) : activeTab === "lipsync" && !currentTTS ? (
                        <p className="text-slate-500 font-mono text-[10px]">
                          Synthesize voice or upload an audio file on the left first!
                        </p>
                      ) : activeTab === "kenburns" && !isPlaying ? (
                        <p className="text-blue-400 font-mono font-semibold">
                          ✨ Click Play to start the 3D Ken Burns Camera Pan!
                        </p>
                      ) : activeTab === "director" && directorTimeline && !isPlaying ? (
                        <p className="text-purple-400 font-mono font-semibold">
                          ✨ Director track ready! Click Play to watch timeline!
                        </p>
                      ) : (
                        <p className="text-slate-500 font-mono">
                          {isPlaying ? "Animation playback active" : "Stage standby - click play to start preview"}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {activeTab === "lipsync" && currentTTS && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded font-bold font-mono uppercase">
                    AUDIO SYNC
                  </span>
                )}
                {activeTab === "director" && directorTimeline && (
                  <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-bold font-mono uppercase">
                    TIMELINE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick timeline tracking markers for the director mode */}
          {activeTab === "director" && directorTimeline && (
            <div className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-2.5">
              <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold uppercase">
                <span>Director Camera Keyframe Timeline</span>
                <span>{directorTimeline.timeline.length} Marks</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 relative">
                {directorTimeline.timeline.map((kf, idx) => (
                  <div
                    key={idx}
                    className={`flex-shrink-0 p-2 rounded-lg border text-center transition-all ${
                      directorActiveIndex === idx 
                        ? "border-purple-500 bg-purple-500/10 text-purple-300 font-bold" 
                        : "border-slate-850 bg-slate-900 text-slate-500"
                    }`}
                  >
                    <div className="text-[9px] font-mono">{kf.timeMs}ms</div>
                    <div className="text-[8px] uppercase font-bold mt-0.5 tracking-wide">{kf.expression}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
