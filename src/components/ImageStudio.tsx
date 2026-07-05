import React, { useState } from "react";
import { Image, Sparkles, RefreshCw, AlertCircle, Layout, ArrowRight, Download, FolderPlus } from "lucide-react";
import { SocialPost, User } from "../types";
import { makeApiRequest, playCompletionSound } from "../lib/apiHelper";

interface ImageStudioProps {
  onImageGenerated: (post: SocialPost) => void;
  onSelectActiveImage: (post: SocialPost) => void;
  activeImage: SocialPost | null;
  history: SocialPost[];
  onSaveImage?: (post: SocialPost) => void;
  user?: User | null;
}

export default function ImageStudio({
  onImageGenerated,
  onSelectActiveImage,
  activeImage,
  history,
  onSaveImage,
  user,
}: ImageStudioProps) {
  const [prompt, setPrompt] = useState(
    "A clean close-up avatar portrait of a friendly cyberpunk female android, highly detailed 3D render, glowing neon accents, clean solid dark gray background, centered face"
  );
  const [ratio, setRatio] = useState<"1:1" | "9:16" | "16:9" | "3:4" | "4:3">("1:1");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDownload = (e: React.MouseEvent, post: SocialPost) => {
    e.stopPropagation(); // Prevent selecting/changing the active preview image
    try {
      const link = document.createElement("a");
      link.href = post.imageUrl;
      link.download = `persona-speak-${post.id}-${post.aspectRatio.replace(":", "x")}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Failed to download image", err);
    }
  };

  const presets = [
    {
      title: "Cyberpunk Avatar",
      prompt: "A clean close-up avatar portrait of a friendly cyberpunk female android, highly detailed 3D render, glowing neon accents, clean solid dark gray background, centered face",
    },
    {
      title: "Cute Garden Monster",
      prompt: "A cute round green clay garden monster with wide expressive eyes and a friendly smile, pixar style, soft natural volumetric studio lighting, clear light background, centered portrait",
    },
    {
      title: "Steampunk Inventor",
      prompt: "Close up portrait of a stylized steampunk explorer wearing brass goggles, vintage leather coat, confident smart expression, detailed digital illustration, plain dark studio background",
    },
    {
      title: "Corporate Presenter",
      prompt: "A polished corporate virtual presenter wearing modern glasses and a navy blazer, confident and friendly smile, minimalist flat background, centered headshot avatar",
    },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Please write an image description or choose a preset.");
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const data = await makeApiRequest("/api/image-generate", {
        prompt,
        aspectRatio: ratio,
      });
      
      const newPost: SocialPost = {
        id: "post_" + Date.now(),
        imageUrl: data.imageUrl,
        prompt,
        aspectRatio: ratio,
        createdAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      onImageGenerated(newPost);
      playCompletionSound();
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate your social media image. Try adjusting the prompt.");
    } finally {
      setIsGenerating(false);
    }
  };

  const ratioDescriptions = {
    "1:1": "Square (Instagram post, LinkedIn, Profile avatar)",
    "9:16": "Story & Reels (Instagram, TikTok, YouTube Shorts)",
    "16:9": "Landscape (YouTube thumbnail, Twitter header, Blog banner)",
    "3:4": "Portrait (Pinterest post, editorial grids, posters)",
    "4:3": "Standard Card (Facebook post thumbnail, presentation slides)",
  };

  return (
    <div id="image-studio-section" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl transition-all">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500/10 p-2.5 rounded-xl border border-blue-500/20 text-blue-400">
            <Image className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100">2. Social Media Image Studio</h2>
            <p className="text-xs text-slate-400">Generate high-fidelity virtual hosts, presenters, or social media graphics</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* LEFT COLUMN: Controls */}
        <div className="space-y-6">
          <div>
            <label className="text-xs text-slate-400 font-bold mb-2.5 block">Select Post Aspect Ratio</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {(["1:1", "9:16", "16:9", "3:4", "4:3"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all cursor-pointer ${
                    ratio === r
                      ? "border-blue-500 bg-blue-500/10 text-blue-400 font-bold"
                      : "border-slate-800 hover:border-slate-750 bg-slate-950 text-slate-400"
                  }`}
                >
                  <span className="text-xs font-mono">{r}</span>
                  <span className="text-[9px] text-slate-500 mt-1 truncate max-w-[65px]">
                    {r === "1:1" ? "Square" : r === "9:16" ? "Vertical" : r === "16:9" ? "Wide" : r === "3:4" ? "Portrait" : "Card"}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[10px] text-slate-500 mt-2 font-medium">
              Ratio size: {ratioDescriptions[ratio]}
            </p>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold mb-2 block">Choose Character Preset</label>
            <div className="grid grid-cols-2 gap-2">
              {presets.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(p.prompt)}
                  className="bg-slate-950 border border-slate-850 hover:border-blue-500/40 hover:bg-slate-900/50 p-2.5 rounded-xl text-left text-xs text-slate-300 font-medium transition-all cursor-pointer"
                >
                  <div className="text-blue-400 font-bold text-[10px] mb-1">Preset {idx + 1}</div>
                  <div className="line-clamp-1">{p.title}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-bold mb-1.5 block">Custom Image Prompt (Detailed)</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-sm p-3.5 rounded-xl focus:border-blue-500 focus:outline-none resize-none font-sans"
              placeholder="Describe your social media character or post in detail..."
            />
            <div className="flex justify-between items-center mt-1">
              <span className="text-[10px] text-slate-500">Include details about lighting, background, and rendering style.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-850 disabled:text-slate-500 text-white py-3 rounded-xl text-sm font-semibold transition-all shadow-lg cursor-pointer"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Drafting & Painting Social Post Asset...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-yellow-300" />
                Generate Social Media Post Asset
              </>
            )}
          </button>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-400 p-3.5 rounded-xl text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Active Asset & Library */}
        <div className="flex flex-col gap-5 justify-between">
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 flex flex-col justify-between h-full min-h-[300px]">
            <div className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center justify-between">
              <span>Active Social Media Canvas</span>
              {activeImage && (
                <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded text-[10px] font-mono">
                  Ratio: {activeImage.aspectRatio}
                </span>
              )}
            </div>

            {activeImage ? (
              <div className="flex flex-col items-center justify-center flex-1 space-y-4">
                <div 
                  className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-xl max-w-full flex items-center justify-center group"
                  style={{
                    aspectRatio: activeImage.aspectRatio.replace(":", "/"),
                    maxHeight: "240px",
                  }}
                >
                  <img
                    src={activeImage.imageUrl}
                    alt="Active animation canvas"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-3">
                    <p className="text-[10px] text-slate-300 line-clamp-2">{activeImage.prompt}</p>
                  </div>
                </div>
                <div className="flex flex-col items-center gap-2.5 w-full px-2">
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-300">Ready for Animator Stage</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">This asset will be animated in Section 3</p>
                  </div>
                  <div className="flex gap-2 w-full mt-1">
                    <button
                      type="button"
                      onClick={(e) => handleDownload(e, activeImage)}
                      className="flex-1 bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                    {onSaveImage && (
                      <button
                        type="button"
                        onClick={() => onSaveImage(activeImage)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-950/30"
                      >
                        <FolderPlus className="w-3.5 h-3.5" />
                        Save to Vault
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 border border-dashed border-slate-850 rounded-xl flex flex-col items-center justify-center p-8 text-center bg-slate-950">
                <Layout className="w-12 h-12 text-slate-700 mb-2.5" />
                <p className="text-xs text-slate-400 font-bold">No Active Post Image</p>
                <p className="text-[10px] text-slate-600 max-w-xs mt-1">
                  Generate a post image or select one from your library to load it into the animation studio.
                </p>
              </div>
            )}
          </div>

          {/* Library history row */}
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-2">My Assets Library ({history.length})</div>
            {history.length > 0 ? (
              <div className="flex gap-2.5 overflow-x-auto pb-1.5 scrollbar-thin scrollbar-thumb-slate-800">
                {history.map((post) => (
                  <div
                    key={post.id}
                    className="relative flex-shrink-0 group"
                  >
                    <button
                      onClick={() => onSelectActiveImage(post)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition-all relative block cursor-pointer ${
                        activeImage?.id === post.id ? "border-blue-500 scale-95" : "border-slate-850 hover:border-slate-700"
                      }`}
                    >
                      <img
                        src={post.imageUrl}
                        alt="History post thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-0.5 left-0.5 bg-black/70 text-[8px] font-mono text-slate-200 px-1 py-0.2 rounded">
                        {post.aspectRatio}
                      </div>
                    </button>
                    {/* Hover Download button with stopPropagation */}
                    <button
                      onClick={(e) => handleDownload(e, post)}
                      className="absolute bottom-1 right-1 bg-slate-950/90 border border-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white p-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-250 cursor-pointer"
                      title="Download image"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 bg-slate-950 border border-slate-900 rounded-lg p-2.5 text-center">
                Library is empty. Generate your first post!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
