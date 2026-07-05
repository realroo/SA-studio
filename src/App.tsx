import React, { useState, useEffect } from "react";
import { 
  Sparkles, Info, ArrowRight, Video, Languages, Home, Mic, Image as ImageIcon, Film, 
  FolderHeart, LogOut, LogIn, ChevronRight, CheckCircle2, X, Trash2, Key, Loader2, User as UserIcon, BookMarked, Download,
  Cpu, Settings2, Activity
} from "lucide-react";
import VoiceCloner from "./components/VoiceCloner";
import ImageStudio from "./components/ImageStudio";
import MotionAnimator from "./components/MotionAnimator";
import { VoiceProfile, TTSResult, SocialPost, User, SavedWork, VideoScriptTimeline } from "./types";
import { checkLocalPCStatus } from "./lib/apiHelper";

export default function App() {
  // Navigation
  const [activePage, setActivePage] = useState<"explore" | "voice" | "image" | "motion" | "vault" | "admin">("explore");
  
  // Shared Studio States
  const [activeProfile, setActiveProfile] = useState<VoiceProfile | null>(null);
  const [gpuStatus, setGpuStatus] = useState<any>(null);

  // --- Personal Local PC & API Quota Settings State ---
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [useLocalGpu, setUseLocalGpu] = useState(() => localStorage.getItem("use_local_gpu") === "true");
  const [localGpuHost, setLocalGpuHost] = useState(() => localStorage.getItem("local_gpu_host") || "http://localhost:8000");
  const [userGeminiKey, setUserGeminiKey] = useState(() => localStorage.getItem("user_gemini_key") || "");
  const [isLocalOnline, setIsLocalOnline] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    const checkGpu = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          const data = await res.json();
          setGpuStatus(data.gpuServer);
        }
      } catch (e) {
        console.warn("Health probe failed", e);
      }
    };
    checkGpu();
    const interval = setInterval(checkGpu, 7000);
    return () => clearInterval(interval);
  }, []);

  // Check connection to local PC
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
  
  const [activeTTS, setActiveTTS] = useState<TTSResult | null>(null);
  const [activeImage, setActiveImage] = useState<SocialPost | null>(null);
  const [history, setHistory] = useState<SocialPost[]>([]);

  // Auth States
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem("roo_user");
    return saved ? JSON.parse(saved) : null;
  });
  
  const [savedWorks, setSavedWorks] = useState<SavedWork[]>([]);

  // Login Modal & Flow states
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginModalMessage, setLoginModalMessage] = useState("");
  const [pendingSaveItem, setPendingSaveItem] = useState<{ type: "voice" | "image" | "animation"; payload: any } | null>(null);
  const [authTab, setAuthTab] = useState<"signin" | "signup">("signin");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Admin States
  const [adminPasswordInput, setAdminPasswordInput] = useState("");
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [adminWorks, setAdminWorks] = useState<any[]>([]);
  const [adminActiveTab, setAdminActiveTab] = useState<"users" | "works">("users");

  // Create User States
  const [adminNewUsername, setAdminNewUsername] = useState("");
  const [adminNewPassword, setAdminNewPassword] = useState("");
  const [adminNewEmail, setAdminNewEmail] = useState("");
  const [adminNewDisplayName, setAdminNewDisplayName] = useState("");

  // Sync saved works on login/state changes
  useEffect(() => {
    if (user) {
      const fetchWorks = async () => {
        try {
          const headers: any = { "Content-Type": "application/json" };
          const isAdmin = user.displayName === "admin" || user.email === "admin" || user.uid === "admin" || (user as any).role === "admin";
          const url = (isAdmin && isAdminAuthenticated)
            ? `/api/works?all=true`
            : `/api/works?userId=${user.uid}`;
            
          if (isAdmin && isAdminAuthenticated) {
            headers["x-admin-password"] = "102186drophere$6";
          }
          
          const res = await fetch(url, { headers });
          if (res.ok) {
            const data = await res.json();
            setSavedWorks(data);
          }
        } catch (e) {
          console.error("Failed to load saved works from server:", e);
        }
      };
      fetchWorks();
    } else {
      setSavedWorks([]);
    }
  }, [user, isAdminAuthenticated]);

  // Filter state in Vault
  const [vaultFilter, setVaultFilter] = useState<"all" | "voice" | "image" | "animation">("all");

  // Custom Toast Notification System
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
  };

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // State handlers
  const handleProfileAnalyzed = (profile: VoiceProfile) => {
    setActiveProfile(profile);
    showToast("Vocal signature extracted successfully!");
  };

  const handleSpeechGenerated = (result: TTSResult) => {
    setActiveTTS(result);
    showToast("Voice cloned and translated into target accent!");
  };

  const handleImageGenerated = (post: SocialPost) => {
    setHistory((prev) => [post, ...prev]);
    setActiveImage(post);
    showToast("Presenter canvas generated!");
  };

  const handleSelectActiveImage = (post: SocialPost) => {
    setActiveImage(post);
    showToast("Selected active presenter image");
  };

  // Auth Functions
  const handleSignOut = () => {
    setUser(null);
    setIsAdminAuthenticated(false);
    setAdminPasswordInput("");
    localStorage.removeItem("roo_user");
    showToast("Signed out successfully", "info");
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authEmail || !authPassword) {
      setAuthError("Please fill out all required fields.");
      return;
    }
    if (authTab === "signup" && !authName) {
      setAuthError("Please provide your full name.");
      return;
    }

    setIsAuthLoading(true);
    try {
      const isRegister = authTab === "signup";
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister 
        ? { username: authEmail, password: authPassword, email: authEmail, displayName: authName }
        : { usernameOrEmail: authEmail, password: authPassword };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Authentication failed.");
      } else {
        const loggedUser: User & { role?: string } = {
          uid: data.uid || data.username || `usr_${Date.now()}`,
          email: data.email || authEmail,
          displayName: data.displayName || data.username,
          avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${data.email || authEmail}`,
          createdAt: data.createdAt || new Date().toISOString(),
          role: data.role || (data.username === "admin" ? "admin" : "user")
        };
        
        setUser(loggedUser);
        localStorage.setItem("roo_user", JSON.stringify(loggedUser));
        showToast(isRegister ? "Account registered successfully!" : "Successfully logged in!", "success");

        // Handle any pending save action
        if (pendingSaveItem) {
          executeSave(pendingSaveItem.type, pendingSaveItem.payload, loggedUser);
          setPendingSaveItem(null);
        }

        // Reset fields
        setAuthEmail("");
        setAuthPassword("");
        setAuthName("");
      }
    } catch (err: any) {
      setAuthError("Failed to connect to the authentication server.");
    } finally {
      setIsAuthLoading(false);
    }
  };

  const triggerGoogleLogin = () => {
    setIsAuthLoading(true);
    setTimeout(() => {
      setIsAuthLoading(false);
      const simulatedUser: User = {
        uid: "usr_g_google",
        email: "google-creator@roogen.ai",
        displayName: "Google Creator",
        avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=google",
        createdAt: new Date().toISOString(),
      };

      setUser(simulatedUser);
      localStorage.setItem("roo_user", JSON.stringify(simulatedUser));
      setShowLoginModal(false);
      showToast("Signed in securely with Google Auth", "success");

      if (pendingSaveItem) {
        executeSave(pendingSaveItem.type, pendingSaveItem.payload, simulatedUser);
        setPendingSaveItem(null);
      }
    }, 1000);
  };

  // Trigger Save Actions from components
  const triggerSave = (type: "voice" | "image" | "animation", payload: any) => {
    if (!user) {
      setPendingSaveItem({ type, payload });
      setLoginModalMessage(`🔐 Sign in or create an account to lock this generated ${type} into your secure creations vault.`);
      setAuthTab("signup");
      setShowLoginModal(true);
      return;
    }

    executeSave(type, payload, user);
  };

  const executeSave = async (type: "voice" | "image" | "animation", payload: any, activeUser: User) => {
    let title = "My Creation";
    if (type === "voice") {
      title = `Voice: ${payload.genderEstimate} (${payload.accent})`;
    } else if (type === "image") {
      title = payload.prompt.length > 35 ? payload.prompt.substring(0, 35) + "..." : payload.prompt;
    } else if (type === "animation") {
      title = payload.scenery ? (payload.scenery.length > 35 ? payload.scenery.substring(0, 35) + "..." : payload.scenery) : "Animation Script Timeline";
    }

    try {
      const res = await fetch("/api/works", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: activeUser.uid,
          type,
          title,
          payload
        })
      });
      if (res.ok) {
        const savedItem = await res.json();
        setSavedWorks(prev => [savedItem, ...prev]);
        showToast(`Saved to server database!`, "success");
      } else {
        const errData = await res.json();
        showToast(errData.error || "Failed to save work", "error");
      }
    } catch (e) {
      showToast("Network error saving creation to server database.", "error");
    }
  };

  const handleDeleteSavedWork = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/works/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user?.uid })
      });
      if (res.ok) {
        setSavedWorks(prev => prev.filter(w => w.id !== id));
        showToast("Removed creation from server database", "info");
      } else {
        showToast("Failed to delete creation", "error");
      }
    } catch (err) {
      showToast("Network error deleting creation", "error");
    }
  };

  const handleLoadSavedWork = (work: SavedWork) => {
    if (work.type === "voice") {
      setActiveProfile(work.payload);
      setActivePage("voice");
      showToast("Loaded Voice Signature as Active");
    } else if (work.type === "image") {
      setActiveImage(work.payload);
      // Ensure it is also in history if not present
      if (!history.some(h => h.id === work.payload.id)) {
        setHistory(prev => [work.payload, ...prev]);
      }
      setActivePage("image");
      showToast("Loaded Presenter Image as Active");
    } else if (work.type === "animation") {
      // In order to preview the script timeline properly, we'll keep it stored locally in the components
      // but let's notify the user and jump to Animator!
      setActivePage("motion");
      showToast("Jumped to Motion Studio to preview animation");
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center font-sans p-4 relative overflow-hidden">
        {/* Decorative Ambient Background Gradients */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-2xl p-8 shadow-2xl z-10 space-y-6 relative">
          <div className="text-center space-y-2">
            <div className="inline-flex bg-indigo-600/10 border border-indigo-500/20 p-3 rounded-2xl text-indigo-400 mb-2">
              <Video className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-100">
              Roo <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Gen</span> Studio
            </h1>
            <p className="text-xs text-slate-400">
              Sign in or register to access the high-fidelity vocal cloning and cinematic animation suite.
            </p>
          </div>

          {/* Toggle Tab */}
          <div className="bg-slate-950 border border-slate-850 p-1 rounded-xl flex items-center">
            <button
              onClick={() => { setAuthTab("signin"); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authTab === "signin" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setAuthTab("signup"); setAuthError(null); }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                authTab === "signup" ? "bg-indigo-600 text-white shadow-md" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Register Account
            </button>
          </div>

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl text-xs font-semibold text-center leading-relaxed">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authTab === "signup" && (
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Your Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Alex Carter"
                  value={authName}
                  onChange={(e) => setAuthName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Username or Email</label>
              <input
                type="text"
                placeholder="e.g. creator"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold tracking-wider uppercase block">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-850 text-slate-250 text-xs p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isAuthLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/40 mt-6"
            >
              {isAuthLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-slate-300" />
                  <span>Authenticating secure session...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>{authTab === "signin" ? "Enter Studio" : "Create My Account"}</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Filtered saved works
  const filteredWorks = savedWorks.filter(w => {
    if (vaultFilter === "all") return true;
    return w.type === vaultFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-300 font-sans">
      
      {/* Dynamic Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500 rounded-xl blur opacity-30 animate-pulse" />
              <div className="relative bg-gradient-to-br from-indigo-900 to-slate-950 border border-slate-850 p-2.5 rounded-xl text-indigo-400">
                <Video className="w-5.5 h-5.5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-slate-100 flex items-center gap-1.5">
                  Roo <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">Gen</span>
                  <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded-full font-bold ml-1.5 tracking-wider">STUDIO</span>
                </h1>
                {isLocalOnline === "online" ? (
                  <span className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-wider animate-pulse" title="Connected to local PC GPU server!">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                    LOCAL RTX GPU ACTIVE
                  </span>
                ) : gpuStatus?.status === "online" ? (
                  <span className="flex items-center gap-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider animate-pulse" title={`${gpuStatus.gpu_name} Active`}>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    RTX 4070 ACTIVE ({gpuStatus.vram_allocated_gb || "12GB"})
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 bg-slate-900 text-slate-450 border border-slate-800 px-2.5 py-0.5 rounded-full text-[9px] font-semibold tracking-wider">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-600" />
                    CLOUD DIRECT
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5">High-Fidelity Voice Synthesis & AI Cinematic Puppeteer</p>
            </div>
          </div>

          {/* Premium Unified Tabs Navigation bar */}
          <nav className="flex items-center bg-slate-900/80 p-1 border border-slate-850 rounded-xl">
            <button
              onClick={() => setActivePage("explore")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activePage === "explore" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
              }`}
            >
              <Home className="w-3.5 h-3.5" />
              <span>Explore</span>
            </button>
            <button
              onClick={() => setActivePage("voice")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activePage === "voice" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Voice Clone</span>
            </button>
            <button
              onClick={() => setActivePage("image")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activePage === "image" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Presenter</span>
            </button>
            <button
              onClick={() => setActivePage("motion")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer ${
                activePage === "motion" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Motion</span>
            </button>
             <button
              onClick={() => setActivePage("vault")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer relative ${
                activePage === "vault" ? "bg-indigo-600 text-white shadow-lg" : "text-slate-400 hover:text-slate-200 hover:bg-slate-850/40"
              }`}
            >
              <FolderHeart className="w-3.5 h-3.5" />
              <span>Vault</span>
              {savedWorks.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-indigo-500 text-[8px] text-white w-4 h-4 rounded-full flex items-center justify-center font-bold">
                  {savedWorks.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActivePage("admin")}
              className={`flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-lg font-bold transition-all cursor-pointer relative ${
                activePage === "admin" ? "bg-amber-600 text-white shadow-lg" : "text-slate-400 hover:text-amber-500 hover:bg-slate-850/40"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
          </nav>

          {/* Quick User Identity block */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-850 text-slate-400 hover:text-amber-400 hover:bg-slate-850 transition-all cursor-pointer flex items-center justify-center"
              title="Setup Local GPU / Personal Gemini Key"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            {user ? (
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-850 px-3 py-1.5 rounded-xl text-xs">
                <img src={user.avatarUrl} alt="User avatar" className="w-5 h-5 rounded-md bg-indigo-950/50" />
                <span className="font-semibold text-slate-300 max-w-[100px] truncate">{user.displayName}</span>
                <button 
                  onClick={handleSignOut}
                  className="text-slate-500 hover:text-red-400 p-0.5 ml-1 transition-all cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setLoginModalMessage("🔑 Sign in to access your creations vault, manage saved assets, and load custom models.");
                  setAuthTab("signin");
                  setShowLoginModal(true);
                }}
                className="bg-indigo-600/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/20 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Log In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 relative">
        
        {/* Toast Toast Container */}
        {toast && (
          <div className="fixed top-20 right-4 sm:right-8 bg-slate-900 border-2 border-indigo-500/40 p-4 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-bounce duration-500 max-w-sm">
            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0" />
            <p className="text-xs font-semibold text-slate-100 leading-relaxed">{toast.message}</p>
          </div>
        )}

        {/* PAGE 1: Explore & Overview */}
        {activePage === "explore" && (
          <div className="space-y-8 animate-fadeIn duration-300">
            {/* Elegant Branding Banner */}
            <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/10 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xl shadow-indigo-950/10">
              <div className="space-y-1.5">
                <h2 className="text-base font-black text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 animate-spin" />
                  Your Ultimate AI Presenter Hub
                </h2>
                <p className="text-xs text-slate-400 max-w-3xl leading-relaxed">
                  Roo Gen empowers creators with deep multilingual voice cloning, customized presenter asset generation, and camera animation orchestrators. Process files server-side and lock your custom templates securely in your Roo Vault.
                </p>
              </div>
              <button 
                onClick={() => setActivePage("voice")}
                className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shrink-0 shadow-lg shadow-indigo-950/20"
              >
                <span>Generate Voice</span> <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Active States Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Voice Card */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">vocal signature</span>
                    <Mic className="w-4 h-4 text-emerald-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1.5">Voice Profiler</h3>
                  {activeProfile ? (
                    <div className="text-xs space-y-1 text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <p><strong className="text-slate-300">Accent:</strong> {activeProfile.accent}</p>
                      <p><strong className="text-slate-300">Gender:</strong> {activeProfile.genderEstimate}</p>
                      <p><strong className="text-slate-300">Tone:</strong> {activeProfile.tone.slice(0, 3).join(", ")}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">Record or upload a voice signature sample. Speak naturally for 8 seconds to extract tone and acoustic traits.</p>
                  )}
                </div>
                <button
                  onClick={() => setActivePage("voice")}
                  className="mt-4 w-full bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {activeProfile ? "View Voice Cloner" : "Profile My Voice"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Presenter Card */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">presenter asset</span>
                    <ImageIcon className="w-4 h-4 text-blue-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1.5">Presenter Studio</h3>
                  {activeImage ? (
                    <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-850">
                      <img src={activeImage.imageUrl} alt="Active preview" className="w-12 h-12 rounded object-cover border border-slate-800" />
                      <div className="text-[10px] text-slate-400 truncate">
                        <p className="font-bold text-slate-300">Active Portrait</p>
                        <p className="truncate max-w-[140px] italic">"{activeImage.prompt}"</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">Design dynamic closeup portraits with specific backgrounds using custom aspect ratios like 16:9 or 9:16.</p>
                  )}
                </div>
                <button
                  onClick={() => setActivePage("image")}
                  className="mt-4 w-full bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {activeImage ? "View Presenter Studio" : "Design Presenter"} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Motion Card */}
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2.5 py-0.5 rounded-full font-bold uppercase">motion track</span>
                    <Film className="w-4 h-4 text-purple-400" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-200 mb-1.5">Animator Engine</h3>
                  {activeImage && activeTTS ? (
                    <div className="text-xs space-y-1 text-slate-400 bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <p className="text-emerald-400 font-bold">✓ Assets Loaded</p>
                      <p className="text-[10px] text-slate-500">Mouth tracking & facial wireframes are synced to your voice clone.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 leading-relaxed mb-4">Coordinate extreme panning tracks, 3D dolly cameras, real-time wireframes, or custom text-to-video director prompts.</p>
                  )}
                </div>
                <button
                  onClick={() => setActivePage("motion")}
                  className="mt-4 w-full bg-slate-950 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Animate Active Asset <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

            </div>

            {/* Comprehensive Info panel */}
            <div className="bg-slate-900/40 border border-slate-900 rounded-2xl p-6">
              <h3 className="text-xs font-bold text-slate-400 tracking-wider uppercase mb-3 flex items-center gap-2">
                <Info className="w-4 h-4 text-indigo-400" />
                Optimal Studio Tips for High Fidelity Creations
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-400">
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-200">Acoustic Profiling</h4>
                  <p className="leading-relaxed">
                    For accurate voice analysis, ensure your sample recording has minimal ambient noise and lasts at least 8 seconds. Speak naturally with your usual conversational pace.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-200">Character Prompts</h4>
                  <p className="leading-relaxed">
                    When generating presenters in Image Studio, specify "plain solid gray background" and "close-up portrait" in your prompts to optimize facial landmarking nodes during lip-sync.
                  </p>
                </div>
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-slate-200">Text-to-Video Scripts</h4>
                  <p className="leading-relaxed">
                    Describe distinct camera movements (e.g. "extreme close-up", "fast orbit zoom") and facial gestures together. Gemini translates these details into precise timeline keyframes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PAGE 2: Voice Clone Profiler */}
        {activePage === "voice" && (
          <div className="animate-fadeIn duration-300">
            <VoiceCloner
              onProfileAnalyzed={handleProfileAnalyzed}
              onSpeechGenerated={handleSpeechGenerated}
              activeProfile={activeProfile}
              activeTTS={activeTTS}
              onSaveProfile={(prof) => triggerSave("voice", prof)}
              user={user}
            />
          </div>
        )}

        {/* PAGE 3: Presenter Canvas */}
        {activePage === "image" && (
          <div className="animate-fadeIn duration-300">
            <ImageStudio
              onImageGenerated={handleImageGenerated}
              onSelectActiveImage={handleSelectActiveImage}
              activeImage={activeImage}
              history={history}
              onSaveImage={(img) => triggerSave("image", img)}
              user={user}
            />
          </div>
        )}

        {/* PAGE 4: Motion Animator */}
        {activePage === "motion" && (
          <div className="animate-fadeIn duration-300">
            <MotionAnimator
              activeImage={activeImage}
              activeTTS={activeTTS}
              onSaveAnimation={(timeline) => triggerSave("animation", timeline)}
              user={user}
            />
          </div>
        )}

        {/* PAGE 5: Vault / Creations list */}
        {activePage === "vault" && (
          <div className="space-y-6 animate-fadeIn duration-300">
            
            {user ? (
              <div className="space-y-6">
                
                {/* Vault Header Card */}
                <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-slate-850 p-6 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
                  <div className="flex items-center gap-4 text-center sm:text-left">
                    <div className="relative bg-indigo-500/10 p-3 rounded-2xl border border-indigo-500/20 text-indigo-400">
                      <FolderHeart className="w-8 h-8" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                        My Creations Vault
                      </h2>
                      <p className="text-xs text-slate-400">Permanent cloud secure backup of your character assets</p>
                      <div className="flex items-center gap-1.5 mt-2 justify-center sm:justify-start">
                        <span className="text-[10px] bg-slate-850 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">UID: {user.uid}</span>
                        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2.5 py-0.5 rounded font-semibold">Premium Active</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center gap-3">
                    <img src={user.avatarUrl} alt="Vocal robot profile" className="w-10 h-10 rounded bg-indigo-950/50" />
                    <div className="text-xs">
                      <p className="font-bold text-slate-300">{user.displayName}</p>
                      <p className="text-slate-500 text-[10px]">{user.email}</p>
                    </div>
                  </div>
                </div>

                {/* Filter and Content Lists */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
                  
                  {/* Filter tabs */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4 gap-4 flex-wrap">
                    <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl gap-1">
                      {(["all", "voice", "image", "animation"] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setVaultFilter(f)}
                          className={`text-xs px-4 py-1.5 rounded-lg font-bold transition-all capitalize cursor-pointer ${
                            vaultFilter === f ? "bg-indigo-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <span className="text-xs text-slate-500 font-mono font-bold uppercase">{filteredWorks.length} Saved Items</span>
                  </div>

                  {/* Render saved cards */}
                  {filteredWorks.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredWorks.map((work) => (
                        <div 
                          key={work.id}
                          className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col justify-between hover:border-indigo-500/40 transition-all shadow-md group relative overflow-hidden"
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className={`text-[9px] px-2.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                work.type === "voice" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                                work.type === "image" ? "bg-blue-500/10 text-blue-400 border border-blue-500/20" :
                                "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              }`}>
                                {work.type === "animation" ? "Director Timeline" : work.type}
                              </span>
                              <span className="text-[9px] text-slate-500 font-mono font-bold">
                                {new Date(work.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Thumbnail / Content depending on type */}
                            {work.type === "image" && (
                              <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-800 bg-slate-900 max-h-[110px]">
                                <img src={work.payload.imageUrl} alt="Saved visual asset" className="w-full h-full object-cover" />
                                <div className="absolute top-1 left-1 bg-black/70 text-[8px] px-1 py-0.2 rounded font-mono text-slate-200">
                                  {work.payload.aspectRatio}
                                </div>
                              </div>
                            )}

                            {work.type === "voice" && (
                              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 space-y-1.5">
                                <div className="flex justify-between text-[10px] text-slate-400 font-mono">
                                  <span>Pitch: {work.payload.pitch}</span>
                                  <span>Accent: {work.payload.accent}</span>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {work.payload.tone.slice(0, 3).map((t: string, i: number) => (
                                    <span key={i} className="text-[8px] bg-emerald-500/5 text-emerald-400 border border-emerald-500/10 px-1.5 py-0.2 rounded capitalize">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {work.type === "animation" && (
                              <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-400 space-y-1 leading-relaxed">
                                <p className="line-clamp-2"><strong className="text-slate-300">Scenery:</strong> {work.payload.scenery}</p>
                                <p><strong className="text-slate-300">Mood:</strong> {work.payload.mood} ({(work.payload.durationMs / 1000).toFixed(1)}s)</p>
                              </div>
                            )}

                            <h3 className="text-xs font-bold text-slate-200 line-clamp-1 mt-1.5">{work.title}</h3>
                          </div>

                          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-900">
                            <button
                              onClick={() => handleLoadSavedWork(work)}
                              className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                            >
                              <span>Load Asset</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteSavedWork(work.id, e)}
                              className="bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 p-2 rounded-lg border border-slate-800 transition-all cursor-pointer"
                              title="Delete Creation"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center max-w-md mx-auto">
                      <BookMarked className="w-12 h-12 text-slate-600 mb-3 mx-auto" />
                      <p className="text-xs text-slate-300 font-bold">Your Vault is Empty</p>
                      <p className="text-[10px] text-slate-500 mt-1 mb-4 leading-relaxed">
                        Generate some voice signatures in Cloner, design presenter portraits in Studio, or create Text-to-Video director scripts, and click "Save" to build your cloud catalog.
                      </p>
                      <button
                        onClick={() => setActivePage("voice")}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      >
                        Start Creating
                      </button>
                    </div>
                  )}

                </div>

              </div>
            ) : (
              /* GORGEOUS FULL PAGE AUTH GATE FOR LOGGED OUT USERS VISITING THE VAULT TAB */
              <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden space-y-6">
                
                {/* Visual Glow background decoration */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full filter blur-xl pointer-events-none" />
                
                <div className="text-center space-y-2">
                  <div className="inline-flex bg-indigo-500/10 p-3.5 rounded-2xl border border-indigo-500/20 text-indigo-400 mb-2">
                    <FolderHeart className="w-8 h-8 animate-pulse" />
                  </div>
                  <h2 className="text-lg font-black tracking-tight text-slate-100">Lock in Your Workspace</h2>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Unlock your Roo Gen Vault to permanently store custom voices, presenter libraries, and director keyframe timelines securely in the cloud.
                  </p>
                </div>

                {/* Simulated authentication tabs */}
                <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
                  <button
                    onClick={() => { setAuthTab("signin"); setAuthError(null); }}
                    className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      authTab === "signin" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    onClick={() => { setAuthTab("signup"); setAuthError(null); }}
                    className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      authTab === "signup" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Sign Up Free
                  </button>
                </div>

                <form onSubmit={handleAuthSubmit} className="space-y-4">
                  {authTab === "signup" && (
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</label>
                      <input
                        type="text"
                        required
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        placeholder="e.g. Jean Doe"
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="e.g. creator@roogen.ai"
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Password</label>
                    <input
                      type="password"
                      required
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-3 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {authError && (
                    <p className="text-[10px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg">
                      ⚠ {authError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={isAuthLoading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    {isAuthLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Verifying Access Token...</span>
                      </>
                    ) : (
                      <>
                        <Key className="w-3.5 h-3.5 text-indigo-300" />
                        <span>{authTab === "signin" ? "Login to My Vault" : "Create My Roo Vault"}</span>
                      </>
                    )}
                  </button>
                </form>

                {/* Google Auth simulation button separator */}
                <div className="relative flex py-2 items-center">
                  <div className="flex-grow border-t border-slate-850"></div>
                  <span className="flex-shrink mx-3 text-[9px] text-slate-600 font-bold uppercase tracking-widest">or</span>
                  <div className="flex-grow border-t border-slate-850"></div>
                </div>

                <button
                  type="button"
                  onClick={triggerGoogleLogin}
                  disabled={isAuthLoading}
                  className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                  </svg>
                  <span>Continue with Google Account</span>
                </button>

              </div>
            )}

          </div>
        )}

        {/* PAGE 6: Admin Panel Gate & Control Center */}
        {activePage === "admin" && !isAdminAuthenticated && (
          <div className="max-w-md mx-auto bg-slate-900 border border-slate-850 rounded-2xl p-8 shadow-2xl relative overflow-hidden space-y-6 animate-fadeIn">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full filter blur-xl pointer-events-none" />
            
            <div className="text-center space-y-2">
              <div className="inline-flex bg-amber-500/10 p-3.5 rounded-2xl border border-amber-500/20 text-amber-400 mb-2">
                <Key className="w-8 h-8 animate-pulse" />
              </div>
              <h2 className="text-lg font-black tracking-tight text-slate-100">Admin Control Shield</h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                Please enter your administrative access credential key to gain entry, manage registered profiles, or oversee creation pipelines.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Admin Protection Password</label>
                <input
                  type="password"
                  placeholder="Enter administrator key..."
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-3 rounded-xl focus:border-amber-500 focus:outline-none text-center font-mono"
                />
              </div>

              <button
                type="button"
                onClick={async () => {
                  if (adminPasswordInput === "102186drophere$6") {
                    setIsAdminAuthenticated(true);
                    showToast("Admin access authenticated successfully!", "success");
                    
                    // Fetch users
                    try {
                      const uRes = await fetch("/api/admin/users", {
                        headers: { "x-admin-password": "102186drophere$6" }
                      });
                      if (uRes.ok) {
                        const uData = await uRes.json();
                        setAdminUsers(uData);
                      }
                      
                      const wRes = await fetch("/api/works?all=true", {
                        headers: { "x-admin-password": "102186drophere$6" }
                      });
                      if (wRes.ok) {
                        const wData = await wRes.json();
                        setAdminWorks(wData);
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  } else {
                    showToast("Incorrect Administrative Password. Access Denied.", "error");
                  }
                }}
                className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/20"
              >
                <Key className="w-4 h-4" />
                <span>Verify Credential Key</span>
              </button>
            </div>
          </div>
        )}

        {activePage === "admin" && isAdminAuthenticated && (
          <div className="space-y-6 animate-fadeIn">
            
            {/* Header banner */}
            <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/15 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
              <div className="flex items-center gap-4 text-center sm:text-left">
                <div className="bg-amber-500/10 p-3 rounded-2xl border border-amber-500/20 text-amber-400">
                  <Key className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-100 flex items-center justify-center sm:justify-start gap-1.5">
                    Admin Dashboard Control Center
                  </h2>
                  <p className="text-xs text-slate-400">Manage registered creators, view saved works database, and configure secure IDs</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    // Refresher
                    try {
                      const uRes = await fetch("/api/admin/users", { headers: { "x-admin-password": "102186drophere$6" } });
                      if (uRes.ok) setAdminUsers(await uRes.json());
                      const wRes = await fetch("/api/works?all=true", { headers: { "x-admin-password": "102186drophere$6" } });
                      if (wRes.ok) setAdminWorks(await wRes.json());
                      showToast("Admin data refreshed", "info");
                    } catch (e) {}
                  }}
                  className="bg-slate-900 hover:bg-slate-800 border border-slate-850 text-slate-300 text-xs py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Refresh Data
                </button>
                <button
                  type="button"
                  onClick={() => setIsAdminAuthenticated(false)}
                  className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs py-2 px-3.5 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Lock Panel
                </button>
              </div>
            </div>

            {/* Selector tabs for user list vs works */}
            <div className="flex bg-slate-900 border border-slate-850 p-1 rounded-xl w-full max-w-sm">
              <button
                onClick={() => setAdminActiveTab("users")}
                className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  adminActiveTab === "users" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Creators List ({adminUsers.length})
              </button>
              <button
                onClick={() => setAdminActiveTab("works")}
                className={`flex-1 text-xs py-2 rounded-lg font-bold transition-all cursor-pointer ${
                  adminActiveTab === "works" ? "bg-amber-600 text-white shadow" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                All Users saved works ({adminWorks.length})
              </button>
            </div>

            {adminActiveTab === "users" ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                
                {/* User creator form */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 border-b border-slate-800 pb-3">
                    <UserIcon className="w-4 h-4 text-amber-400" />
                    Register / Make New ID & Pass
                  </h3>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Username</label>
                      <input
                        type="text"
                        placeholder="e.g. jason"
                        value={adminNewUsername}
                        onChange={(e) => setAdminNewUsername(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Password</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        value={adminNewPassword}
                        onChange={(e) => setAdminNewPassword(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</label>
                      <input
                        type="email"
                        placeholder="e.g. jason@roogen.ai"
                        value={adminNewEmail}
                        onChange={(e) => setAdminNewEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Display Name</label>
                      <input
                        type="text"
                        placeholder="e.g. Jason Carter"
                        value={adminNewDisplayName}
                        onChange={(e) => setAdminNewDisplayName(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (!adminNewUsername || !adminNewPassword) {
                          showToast("Username and Password are required fields.", "error");
                          return;
                        }
                        try {
                          const res = await fetch("/api/admin/create-user", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              "x-admin-password": "102186drophere$6"
                            },
                            body: JSON.stringify({
                              username: adminNewUsername,
                              password: adminNewPassword,
                              email: adminNewEmail || `${adminNewUsername}@roogen.ai`,
                              displayName: adminNewDisplayName || adminNewUsername
                            })
                          });
                          if (res.ok) {
                            const added = await res.json();
                            setAdminUsers(prev => [...prev, added]);
                            showToast("User ID registered successfully!", "success");
                            // Reset
                            setAdminNewUsername("");
                            setAdminNewPassword("");
                            setAdminNewEmail("");
                            setAdminNewDisplayName("");
                          } else {
                            const err = await res.json();
                            showToast(err.error || "Failed to create user", "error");
                          }
                        } catch (err) {
                          showToast("Network error creating user", "error");
                        }
                      }}
                      className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow mt-4"
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Register User Account</span>
                    </button>
                  </div>
                </div>

                {/* Creators table */}
                <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 lg:col-span-2 space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-3 uppercase tracking-wider text-[11px] text-slate-400">
                    Registered Systems Creators ({adminUsers.length})
                  </h3>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400 font-bold">
                          <th className="pb-3 font-semibold">Avatar</th>
                          <th className="pb-3 font-semibold">UID / Username</th>
                          <th className="pb-3 font-semibold">Display Name</th>
                          <th className="pb-3 font-semibold">Email</th>
                          <th className="pb-3 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {adminUsers.map((u) => (
                          <tr key={u.uid} className="hover:bg-slate-950/25">
                            <td className="py-3">
                              <img src={u.avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${u.username}`} className="w-8 h-8 rounded bg-slate-950 border border-slate-800" />
                            </td>
                            <td className="py-3 font-mono text-[11px] text-slate-300 font-bold">{u.username || u.uid}</td>
                            <td className="py-3 font-medium text-slate-200">{u.displayName}</td>
                            <td className="py-3 text-slate-400">{u.email}</td>
                            <td className="py-3">
                              {u.username !== "admin" ? (
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!window.confirm(`Are you sure you want to delete creator ${u.username}?`)) return;
                                    try {
                                      const res = await fetch("/api/admin/delete-user", {
                                        method: "POST",
                                        headers: {
                                          "Content-Type": "application/json",
                                          "x-admin-password": "102186drophere$6"
                                        },
                                        body: JSON.stringify({ uid: u.uid })
                                      });
                                      if (res.ok) {
                                        setAdminUsers(prev => prev.filter(item => item.uid !== u.uid));
                                        showToast(`Deleted creator ${u.username}`, "info");
                                      } else {
                                        showToast("Failed to delete user", "error");
                                      }
                                    } catch (err) {
                                      showToast("Network error deleting user", "error");
                                    }
                                  }}
                                  className="text-red-400 hover:text-red-300 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded text-[10px] font-bold cursor-pointer transition-all"
                                >
                                  Delete
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-500 font-bold uppercase bg-slate-950 px-2 py-1 rounded border border-slate-850">System Master</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            ) : (
              /* Saved works section for all users */
              <div className="bg-slate-900 border border-slate-850 rounded-2xl p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-100 border-b border-slate-800 pb-3">
                  All Users saved works ({adminWorks.length})
                </h3>

                {adminWorks.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {adminWorks.map((work) => (
                      <div key={work.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 flex flex-col justify-between relative overflow-hidden group">
                        <div>
                          <div className="flex items-center justify-between mb-3">
                            <span className={`text-[9px] px-2.5 py-0.5 rounded font-black uppercase border ${
                              work.type === "voice" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                              work.type === "image" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                              "bg-purple-500/10 text-purple-400 border-purple-500/20"
                            }`}>
                              {work.type}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono">User: {work.userId}</span>
                          </div>

                          <h3 className="text-xs font-bold text-slate-200 truncate">{work.title}</h3>
                          <p className="text-[10px] text-slate-500 mt-0.5">Created: {new Date(work.createdAt).toLocaleString()}</p>

                          {work.type === "image" && work.payload?.imageUrl && (
                            <img src={work.payload.imageUrl} className="w-full h-32 object-cover rounded-lg border border-slate-850 mt-3" />
                          )}
                        </div>

                        <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-900">
                          <button
                            onClick={() => handleLoadSavedWork(work)}
                            className="flex-1 bg-amber-600 hover:bg-amber-500 text-white py-1.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1"
                          >
                            <span>Load Asset</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
                              if (!window.confirm(`Are you sure you want to delete creation ${work.title}?`)) return;
                              try {
                                const res = await fetch(`/api/works/${work.id}`, {
                                  method: "DELETE",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ userId: work.userId })
                                });
                                if (res.ok) {
                                  setAdminWorks(prev => prev.filter(w => w.id !== work.id));
                                  showToast("Removed creation successfully", "info");
                                } else {
                                  showToast("Failed to delete creation", "error");
                                }
                              } catch (err) {
                                showToast("Network error deleting creation", "error");
                              }
                            }}
                            className="bg-slate-900 hover:bg-red-500/10 text-slate-400 hover:text-red-400 p-2 rounded-lg border border-slate-800 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 text-center py-8">No saved materials found in the database yet.</p>
                )}
              </div>
            )}
          </div>
        )}

      </main>

      {/* POPUP LOGIN MODAL (TRIGGERED WHEN LOGGED OUT USER CLICKS SAVE ACTIONS) */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          
          <div className="bg-slate-900 border border-slate-850 w-full max-w-md rounded-2xl p-6 shadow-2xl relative space-y-5 animate-scaleUp">
            
            <button
              onClick={() => { setShowLoginModal(false); setPendingSaveItem(null); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pr-6">
              <div className="inline-flex bg-indigo-500/10 p-2.5 rounded-xl border border-indigo-500/20 text-indigo-400 mb-1">
                <FolderHeart className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">Sign in to Save Progress</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {loginModalMessage}
              </p>
            </div>

            {/* Auth tab Selector inside popup */}
            <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl">
              <button
                onClick={() => { setAuthTab("signin"); setAuthError(null); }}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  authTab === "signin" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => { setAuthTab("signup"); setAuthError(null); }}
                className={`flex-1 text-xs py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                  authTab === "signup" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3.5">
              {authTab === "signup" && (
                <div className="space-y-1">
                  <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    required
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="Jean Doe"
                    className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="creator@roogen.ai"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none"
                />
              </div>

              {authError && (
                <p className="text-[9px] text-red-400 font-bold bg-red-500/10 border border-red-500/20 p-2 rounded-lg">
                  ⚠ {authError}
                </p>
              )}

              <button
                type="submit"
                disabled={isAuthLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing access token...</span>
                  </>
                ) : (
                  <>
                    <Key className="w-3.5 h-3.5 text-indigo-300" />
                    <span>{authTab === "signin" ? "Confirm Log In" : "Register Account"}</span>
                  </>
                )}
              </button>
            </form>

            <div className="relative flex py-1.5 items-center">
              <div className="flex-grow border-t border-slate-850"></div>
              <span className="flex-shrink mx-3 text-[8px] text-slate-600 font-bold uppercase tracking-widest">or</span>
              <div className="flex-grow border-t border-slate-850"></div>
            </div>

            <button
              type="button"
              onClick={triggerGoogleLogin}
              disabled={isAuthLoading}
              className="w-full bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-200 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </button>

          </div>
        </div>
      )}

      {/* PERSONAL SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-slate-900 border border-slate-850 w-full max-w-lg rounded-2xl p-6 shadow-2xl relative space-y-5 animate-scaleUp">
            
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-300 p-1 rounded-lg transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1.5 pr-6">
              <div className="inline-flex bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20 text-amber-400 mb-1">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-100">🔌 Personal PC GPU & Custom API Quota Settings</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                If the shared workspace API limits are exhausted, configure your own machine to perform the GPU heavy lifting or supply your personal Gemini API Key. Keys are saved locally in your browser storage.
              </p>
            </div>

            <div className="space-y-4">
              {/* 1. PC GPU rendering toggle */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    Use Personal local PC RTX GPU
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
                <p className="text-[11px] text-slate-450 leading-relaxed">
                  Bypass the cloud. Lip-sync, voice drive, and director motion scripts can render directly using local RTX hardware on your machine (e.g. running SadTalker, Tortoise, or local server).
                </p>
                <button
                  type="button"
                  onClick={() => saveLocalGpuSettings(!useLocalGpu, localGpuHost, userGeminiKey)}
                  className={`w-full py-2 px-3 rounded-lg border font-bold text-xs transition-all text-center cursor-pointer ${
                    useLocalGpu 
                      ? "bg-indigo-600 border-indigo-500 text-white" 
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {useLocalGpu ? "Enabled (Using Visitor PC)" : "Disabled (Using Cloud Servers)"}
                </button>
              </div>

              {/* 2. PC GPU Endpoint URL */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">My PC GPU Server Host URL</label>
                <input
                  type="text"
                  placeholder="http://localhost:8000"
                  value={localGpuHost}
                  onChange={(e) => saveLocalGpuSettings(useLocalGpu, e.target.value, userGeminiKey)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  The local port or address where your SadTalker / AI Voice server is running on your machine.
                </p>
              </div>

              {/* 3. Personal Gemini API Key */}
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-amber-400" />
                  Personal Gemini API Key (Optional)
                </label>
                <input
                  type="password"
                  placeholder="AIzaSy..."
                  value={userGeminiKey}
                  onChange={(e) => saveLocalGpuSettings(useLocalGpu, localGpuHost, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 text-slate-200 text-xs p-2.5 rounded-xl focus:border-indigo-500 focus:outline-none font-mono"
                />
                <p className="text-[10px] text-slate-500 leading-normal">
                  Input your personal Gemini key. Storing this allows direct generation calls from your browser, bypassing general server quota constraints entirely!
                </p>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-xs font-bold transition-all text-center cursor-pointer"
              >
                Done & Apply Settings
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Humble Footer */}
      <footer className="border-t border-slate-900 bg-slate-950/50 py-6 mt-12 text-center text-xs text-slate-500">
        <p>© 2026 Roo Gen Studio. All voice profile, translation algorithms, and video scripts run securely server-side.</p>
      </footer>
    </div>
  );
}
