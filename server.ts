import express from "express";
import path from "path";
import dotenv from "dotenv";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = 3000;

// Increase request size limits for base64 file uploads (voice, images)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- DURABLE FILE-BASED JSON DATABASE SETUP ---
let DATA_DIR = "G:\\My Drive\\RooGenData";

// Fallback for non-Windows / Cloud Container environments to ensure continuous functionality in dev previews
try {
  if (process.platform !== "win32") {
    DATA_DIR = path.join(process.cwd(), "data");
  } else {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
  }
} catch (e) {
  DATA_DIR = path.join(process.cwd(), "data");
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const WORKS_FILE = path.join(DATA_DIR, "saved_works.json");

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Seed admin account on startup with password '102186drophere$6'
if (!fs.existsSync(USERS_FILE)) {
  const defaultUsers = [
    {
      uid: "admin",
      username: "admin",
      email: "admin@roogen.ai",
      displayName: "System Administrator",
      password: "102186drophere$6",
      role: "admin",
      createdAt: new Date().toISOString(),
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=admin"
    }
  ];
  fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
}

if (!fs.existsSync(WORKS_FILE)) {
  fs.writeFileSync(WORKS_FILE, JSON.stringify([], null, 2));
}

// Synchronous safe file read/write helper functions
function readUsersList() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (e) {
    console.error("Error reading users database", e);
    return [];
  }
}

function writeUsersList(users: any[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (e) {
    console.error("Error writing users database", e);
  }
}

function readWorksList() {
  try {
    return JSON.parse(fs.readFileSync(WORKS_FILE, "utf-8"));
  } catch (e) {
    console.error("Error reading saved works database", e);
    return [];
  }
}

function writeWorksList(works: any[]) {
  try {
    fs.writeFileSync(WORKS_FILE, JSON.stringify(works, null, 2));
  } catch (e) {
    console.error("Error writing saved works database", e);
  }
}

// --- SERVER-SIDE AUTHENTICATION & ADMINISTRATIVE API ENDPOINTS ---

// 1. User Sign Up / Register Endpoint
app.post("/api/auth/register", (req, res) => {
  try {
    const { username, password, email, displayName } = req.body;
    if (!username || !password || !email) {
      return res.status(400).json({ error: "Username, email, and password are required" });
    }

    const users = readUsersList();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = email.trim().toLowerCase();

    // Check duplicate
    const exists = users.find(
      (u: any) => u.username.toLowerCase() === cleanUsername || u.email.toLowerCase() === cleanEmail
    );
    if (exists) {
      return res.status(400).json({ error: "Username or email is already registered." });
    }

    const newUser = {
      uid: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      email: cleanEmail,
      displayName: displayName || username,
      password: password, // Plain text for simplicity, as requested for easy admin inspection
      role: "user",
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`
    };

    users.push(newUser);
    writeUsersList(users);

    // Return without password
    const { password: _, ...userResponse } = newUser;
    res.json({ success: true, user: userResponse });
  } catch (error: any) {
    console.error("Register error:", error);
    res.status(500).json({ error: error.message || "Failed to register user" });
  }
});

// 2. User Sign In / Login Endpoint
app.post("/api/auth/login", (req, res) => {
  try {
    const { usernameOrEmail, password } = req.body;
    if (!usernameOrEmail || !password) {
      return res.status(400).json({ error: "Username/Email and password are required" });
    }

    const users = readUsersList();
    const input = usernameOrEmail.trim().toLowerCase();

    const matched = users.find(
      (u: any) => (u.username.toLowerCase() === input || u.email.toLowerCase() === input) && u.password === password
    );

    if (!matched) {
      return res.status(401).json({ error: "Invalid username/email or password." });
    }

    const { password: _, ...userResponse } = matched;
    res.json({ success: true, user: userResponse });
  } catch (error: any) {
    console.error("Login error:", error);
    res.status(500).json({ error: error.message || "Failed to log in" });
  }
});

// 3. Admin: List All Registered Users (password-protected on frontend & backend)
app.get("/api/admin/users", (req, res) => {
  try {
    const adminPassword = req.headers["x-admin-password"];
    if (adminPassword !== "102186drophere$6") {
      return res.status(403).json({ error: "Unauthorized access to admin panel." });
    }

    const users = readUsersList();
    // Return all users (including passwords so admin can inspect/manage)
    res.json(users);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Admin: Create custom credentials directly
app.post("/api/admin/create-user", (req, res) => {
  try {
    const adminPassword = req.headers["x-admin-password"];
    if (adminPassword !== "102186drophere$6") {
      return res.status(403).json({ error: "Unauthorized access to admin panel." });
    }

    const { username, password, email, displayName, role } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    const users = readUsersList();
    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = (email || `${cleanUsername}@roogen.local`).trim().toLowerCase();

    const exists = users.find((u: any) => u.username.toLowerCase() === cleanUsername);
    if (exists) {
      return res.status(400).json({ error: "User already exists." });
    }

    const newUser = {
      uid: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      username: cleanUsername,
      email: cleanEmail,
      displayName: displayName || username,
      password: password,
      role: role || "user",
      createdAt: new Date().toISOString(),
      avatarUrl: `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`
    };

    users.push(newUser);
    writeUsersList(users);
    res.json({ success: true, user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Admin: Delete any user
app.post("/api/admin/delete-user", (req, res) => {
  try {
    const adminPassword = req.headers["x-admin-password"];
    if (adminPassword !== "102186drophere$6") {
      return res.status(403).json({ error: "Unauthorized access to admin panel." });
    }

    const { uid } = req.body;
    if (!uid) {
      return res.status(400).json({ error: "Missing user UID to delete" });
    }
    if (uid === "admin") {
      return res.status(400).json({ error: "Cannot delete the default root admin user" });
    }

    let users = readUsersList();
    const exists = users.some((u: any) => u.uid === uid);
    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    users = users.filter((u: any) => u.uid !== uid);
    writeUsersList(users);

    // Also clean up their saved works if desired, or keep them. Let's keep saved works database clean by filtering
    let works = readWorksList();
    works = works.filter((w: any) => w.userId !== uid);
    writeWorksList(works);

    res.json({ success: true, message: "User and associated creations permanently deleted." });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Creations Vault API: Fetch Saved Creations
app.get("/api/works", (req, res) => {
  try {
    const { userId, all } = req.query;
    const adminPassword = req.headers["x-admin-password"];
    const works = readWorksList();

    if (all === "true" && adminPassword === "102186drophere$6") {
      // Admin sees ALL works with user attribution info mapped
       const users = readUsersList();
      const userMap = new Map<string, any>(users.map((u: any) => [u.uid as string, u] as [string, any]));
      
      const enrichedWorks = works.map((w: any) => {
        const creator = userMap.get(w.userId);
        return {
          ...w,
          creatorName: creator ? (creator as any).displayName : "Unknown User",
          creatorEmail: creator ? (creator as any).email : "N/A"
        };
      });
      return res.json(enrichedWorks);
    }

    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    // Regular users see only their creations
    const filtered = works.filter((w: any) => w.userId === userId);
    res.json(filtered);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Creations Vault API: Save Creation Permanently on Server
app.post("/api/works", (req, res) => {
  try {
    const { userId, type, title, payload } = req.body;
    if (!userId || !type || !payload) {
      return res.status(400).json({ error: "Missing required work metadata or payload." });
    }

    const works = readWorksList();
    const newWork = {
      id: `work_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId,
      type,
      title: title || "Untitled Studio Work",
      payload,
      createdAt: new Date().toISOString()
    };

    works.unshift(newWork);
    writeWorksList(works);
    res.json(newWork);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Creations Vault API: Delete saved work
app.delete("/api/works/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    if (!id) {
      return res.status(400).json({ error: "Missing creation work ID" });
    }

    let works = readWorksList();
    const originalLength = works.length;
    
    // Filter out
    works = works.filter((w: any) => w.id !== id);
    if (works.length === originalLength) {
      return res.status(404).json({ error: "Saved creation not found" });
    }

    writeWorksList(works);
    res.json({ success: true, message: "Creation successfully removed from database" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Helper to get Gemini Client securely
function getGeminiClient(req?: express.Request): GoogleGenAI {
  const apiKey = (req?.headers["x-user-gemini-key"] as string) || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is required but missing. Please configure it in Settings > Secrets or provide your personal key in settings.");
  }
  return new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Helper to run generateContent with automatic retry and fallback models on 503/UNAVAILABLE or 429/RATE_LIMIT errors
async function generateContentWithRetry(ai: GoogleGenAI, params: any, maxRetries = 2) {
  const isAudioModality = params.config?.responseModalities?.includes("AUDIO") || params.model?.includes("tts");
  const isImageModality = params.model?.includes("image") || params.model?.includes("veo");
  
  let modelsToTry = [params.model];
  if (!isAudioModality && !isImageModality) {
    modelsToTry.push("gemini-3.1-flash-lite", "gemini-flash-latest");
  } else if (isImageModality && params.model === "gemini-3.1-flash-lite-image") {
    modelsToTry.push("gemini-3.1-flash-image");
  }
  modelsToTry = [...new Set(modelsToTry.filter(Boolean))];

  let lastError: any = null;

  for (const modelName of modelsToTry) {
    let attempt = 0;
    while (attempt < maxRetries) {
      try {
        console.log(`Calling generateContent using model: ${modelName} (attempt ${attempt + 1})`);
        const p = { ...params, model: modelName };
        const response = await ai.models.generateContent(p);
        return response;
      } catch (error: any) {
        attempt++;
        lastError = error;
        
        const errorMsg = (error.message || "").toLowerCase();
        console.warn(`Error using model ${modelName} on attempt ${attempt}:`, error.message || error);
        
        // If it is a persistent daily quota exceeded error, do not waste retries or wait.
        // Immediately break out of this model's attempt loop to try the next model.
        const isQuotaExceeded = error.status === 429 && 
                                (errorMsg.includes("quota") || errorMsg.includes("limit") || errorMsg.includes("exhausted"));
        
        if (isQuotaExceeded) {
          console.log(`Daily/Tier quota exhausted for ${modelName}. Falling back immediately to next model...`);
          break;
        }

        const isTransient = error.status === 503 || 
                            errorMsg.includes("503") || 
                            errorMsg.includes("demand") || 
                            errorMsg.includes("unavailable") || 
                            error.status === 429 ||
                            errorMsg.includes("429");
        
        if (isTransient && attempt < maxRetries) {
          const delay = Math.pow(2, attempt) * 1000;
          console.log(`Transient/rate-limit error detected, waiting ${delay}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          break;
        }
      }
    }
  }

  // If we reach here, all fallback models have been exhausted. Provide an incredibly helpful error message for 429/503.
  const lastErrorMsg = lastError?.message || lastError || "";
  const isQuota = lastError?.status === 429 || lastErrorMsg.includes("429") || lastErrorMsg.toLowerCase().includes("quota") || lastErrorMsg.toLowerCase().includes("limit") || lastErrorMsg.toLowerCase().includes("exhausted");
  const isUnavailable = lastError?.status === 503 || lastErrorMsg.includes("503") || lastErrorMsg.toLowerCase().includes("unavailable") || lastErrorMsg.toLowerCase().includes("demand");

  if (isQuota || isUnavailable) {
    throw new Error(`The system Gemini API free-tier quota is currently exhausted or busy. To bypass this, please click the ⚙ (Gear) icon in the top header to configure your personal Gemini API Key or enable local GPU rendering! (Details: ${lastErrorMsg})`);
  }

  throw lastError || new Error("Failed to generate content after retries and fallback models.");
}

// Helper to convert raw Linear-16 PCM base64 audio to a playable WAV base64 format
function encodePCMToWav(pcmBase64: string, sampleRate = 24000, channels = 1, bitsPerSample = 16): string {
  try {
    const pcmBuffer = Buffer.from(pcmBase64, "base64");
    const fileSizeBytes = 44 + pcmBuffer.length;
    const header = Buffer.alloc(44);

    // RIFF identifier
    header.write("RIFF", 0);
    // file length minus RIFF and WAVE headers
    header.writeUInt32LE(fileSizeBytes - 8, 4);
    // WAVE identifier
    header.write("WAVE", 8);
    // format chunk identifier
    header.write("fmt ", 12);
    // format chunk length
    header.writeUInt32LE(16, 16);
    // sample format (raw PCM = 1)
    header.writeUInt16LE(1, 20);
    // channel count
    header.writeUInt16LE(channels, 22);
    // sample rate
    header.writeUInt32LE(sampleRate, 24);
    // byte rate = (sample rate * block align)
    const blockAlign = channels * (bitsPerSample / 8);
    header.writeUInt32LE(sampleRate * blockAlign, 28);
    // block align
    header.writeUInt16LE(blockAlign, 32);
    // bits per sample
    header.writeUInt16LE(bitsPerSample, 34);
    // data chunk identifier
    header.write("data", 36);
    // data chunk length
    header.writeUInt32LE(pcmBuffer.length, 40);

    const wavBuffer = Buffer.concat([header, pcmBuffer]);
    return wavBuffer.toString("base64");
  } catch (err) {
    console.error("PCM to WAV conversion failed:", err);
    return pcmBase64;
  }
}

// 1. Health check route
app.get("/api/health", async (req, res) => {
  let gpuStatus = { status: "offline", device: "cloud-only", cuda_available: false, gpu_name: "Gemini Cloud Fallback Only", vram_allocated_gb: "0 GB", tensor_cores: "None" };
  try {
    const gpuCheck = await fetch("http://127.0.0.1:8000/api/gpu-status", {
      signal: AbortSignal.timeout(800),
    });
    if (gpuCheck.ok) {
      const parsedGpu = await gpuCheck.json();
      gpuStatus = {
        ...parsedGpu,
        status: "online"
      };
    }
  } catch (err: any) {
    // Local GPU is offline or unreachable
  }
  
  res.json({
    status: "ok",
    time: new Date().toISOString(),
    gpuServer: gpuStatus
  });
});

// 2. Voice Profile Analysis Endpoint
// Analyzes base64 voice recordings using gemini-3.5-flash and returns vocal traits
app.post("/api/voice-profile", async (req, res) => {
  try {
    const { audioData, mimeType } = req.body;
    if (!audioData) {
      return res.status(400).json({ error: "Missing audioData recording" });
    }

    const ai = getGeminiClient(req);
    
    // Prompt to guide analysis
    const prompt = `Analyze this voice sample to extract core acoustic and speech characteristics. Output a JSON object with details that will help customize a text-to-speech model and direct its speech style.
    
    The response MUST be a valid JSON object matching exactly this schema, without any markdown formatting or surrounding explanation (just pure raw JSON):
    {
      "pitch": "high" | "medium-high" | "medium" | "medium-low" | "low",
      "tempo": "fast" | "medium-fast" | "moderate" | "relaxed" | "slow",
      "accent": string (e.g., "General American", "British English", "French Accented", "None/Neutral"),
      "tone": string[] (array of descriptive words, e.g. ["warm", "soft", "professional", "raspy", "crisp"]),
      "genderEstimate": "feminine" | "masculine" | "androgynous",
      "recommendedVoice": "Kore" | "Puck" | "Charon" | "Fenrir" | "Zephyr"
    }

    Guideline for recommendedVoice:
    - Choose 'Kore' for warm, feminine, expressive speech.
    - Choose 'Puck' for rapid, energetic, youthful, or higher-pitched speech.
    - Choose 'Fenrir' for deep, resonant, masculine speech.
    - Choose 'Charon' for dry, narrator-like, or gravely speech.
    - Choose 'Zephyr' for standard, balanced, conversational speech.`;

    const base64Data = audioData.includes("base64,") ? audioData.split("base64,")[1] : audioData;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType || "audio/mp3",
          },
        },
        prompt,
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const textResult = response.text?.trim() || "{}";
    res.json(JSON.parse(textResult));
  } catch (error: any) {
    console.error("Voice profile analysis error:", error);
    res.status(500).json({ error: error.message || "Failed to analyze voice sample." });
  }
});

// 3. Multilingual Text-to-Speech & Keyframed Lip-Sync Generation
// Translates/styles the script to suit the vocal profile and generates voice audio
app.post("/api/voice-generate", async (req, res) => {
  try {
    const { text, targetLanguage, recommendedVoice, voiceProfile, referenceAudio, accent, voiceTheme } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing script text" });
    }

    const ai = getGeminiClient(req);
    const finalAccent = accent || voiceProfile?.accent || "neutral";

    // Define descriptive cues based on selected theme
    const themeDescriptions: Record<string, string> = {
      advertisement: "highly enthusiastic, energetic, promotional, persuasive, commercial-advertisement style, capturing listener attention with strong, crisp delivery",
      storyteller: "warm, conversational, slow-paced, atmospheric narrative style, with rich emotional pauses and dramatic/melodic storytelling pacing",
      "fast-paced": "extremely energetic, rapid pacing, enthusiastic, high-impact, short punchy syllables suited for fast-paced YouTube Shorts or TikTok videos",
      horror: "creepy, whispered, hushed suspense, dark, eerie low-pitch voice, slow dramatic pacing with terrifying/thrilling tension",
      news: "authoritative, news-anchor style, objective, professional, clean, measured, and highly confident news broadcast tone",
      educational: "supportive, reassuring, informative, clean tutorial-guide style, measured and clear explanations with encouraging tone",
      trailer: "exceptionally deep, booming, legendary movie-trailer narrator style, slow epic delivery, huge cinematic presence with long dramatic pauses"
    };
    const activeThemeDesc = voiceTheme && themeDescriptions[voiceTheme] ? themeDescriptions[voiceTheme] : "conversational, standard tone";

    // Step A: Translate and optimize script to suit vocal profile and theme
    const translatePrompt = `You are a professional multilingual voice actor script coordinator.
Translate or refine this script into ${targetLanguage || "English"}.
Adjust the pacing, phrasing, and word selection to align with a voice profile that has an accent of "${finalAccent}", pitch of "${voiceProfile?.pitch || "medium"}", and tone elements: "${(voiceProfile?.tone || []).join(", ")}".
Format the output for a speech delivery theme of: "${activeThemeDesc}".
Ensure natural speech rhythms, pausing, and phonetic flow.
Output ONLY the final polished script in ${targetLanguage || "English"}, with no comments, no translation tags, and no annotations.`;

    const translationResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [translatePrompt, text],
    });

    const translatedText = translationResponse.text?.trim() || text;

    // TRY LOCAL RTX 4070 GPU SERVER FIRST
    try {
      console.log("Attempting local RTX 4070 zero-shot voice cloning handoff at http://127.0.0.1:8000...");
      const localResponse = await fetch("http://127.0.0.1:8000/api/voice-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: translatedText,
          reference_audio: referenceAudio || null,
          voice_profile: voiceProfile || null,
          target_language: targetLanguage || "English",
          voice_theme: voiceTheme || "conversational"
        }),
        // Short timeout to fallback quickly if local GPU is offline
        signal: AbortSignal.timeout(6000),
      });

      if (localResponse.ok) {
        const localData = await localResponse.json();
        console.log("SUCCESS: Cloned voice generated locally on RTX 4070!");
        return res.json({
          translatedText,
          base64Audio: localData.base64Audio,
          timeline: localData.timeline,
          isLocalGpu: true,
        });
      } else {
        console.log("Local GPU server is offline or returned empty, falling back to Gemini Cloud.");
      }
    } catch (localErr: any) {
      console.log("Local RTX 4070 server is offline/unavailable. Falling back to Gemini Cloud:", localErr.message);
    }

    // FALLBACK: Step B: Text-to-Speech synthesis with style guides and voice theme style cues
    const speakPrompt = `Speak in a style that is ${activeThemeDesc}. The voice accent should be a highly pronounced "${finalAccent}" accent, ${voiceProfile?.pitch || "medium"} pitch, ${voiceProfile?.tempo || "moderate"} speed, with a ${(voiceProfile?.tone || []).join(", ")} tone. Script to speak: ${translatedText}`;

    const ttsResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: speakPrompt }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: recommendedVoice || "Zephyr" },
          },
        },
      },
    });

    const part = ttsResponse.candidates?.[0]?.content?.parts?.[0];
    let base64Audio = part?.inlineData?.data;
    let mimeType = part?.inlineData?.mimeType || "audio/aac";

    if (base64Audio && (mimeType.includes("l16") || mimeType.includes("pcm"))) {
      console.log("Wrapping raw PCM (audio/l16) audio inside standard 44-byte WAV container...");
      base64Audio = encodePCMToWav(base64Audio, 24000, 1, 16);
      mimeType = "audio/wav";
    }

    // Step C: Generate Lip-Sync timeline
    const timelinePrompt = `Given this spoken script: "${translatedText}"
    Generate a JSON array of character facial keyframes mapped in milliseconds to drive fluid client-side character animations (lip movements, head tilt, blinking).
    The total speech duration is roughly estimated around ${Math.max(1000, translatedText.split(" ").length * 350)}ms.
    
    The output MUST be a valid JSON array of objects. Do NOT include markdown code blocks or explanations. Just pure JSON.
    Schema of each item in the array:
    {
      "timeMs": number (timestamp in milliseconds, increasing from 0 up to total duration, e.g., 0, 150, 300, 450, etc.),
      "mouthOpen": number (between 0 and 1 representing mouth vertical openness),
      "mouthWidth": number (between 0.2 and 1 representing phonetic mouth horizontal width),
      "eyesClosed": boolean (true occasionally for blinking, otherwise false),
      "headTilt": number (angle in degrees from -12 to 12),
      "subtitle": string (active word or syllable segment spoken around this timeframe)
    }
    Include keyframes separated by roughly 100ms to 250ms for maximum fluid responsiveness.`;

    const timelineResponse = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [timelinePrompt],
      config: {
        responseMimeType: "application/json",
      },
    });

    const timeline = JSON.parse(timelineResponse.text?.trim() || "[]");

    res.json({
      translatedText,
      base64Audio,
      mimeType,
      timeline,
      isLocalGpu: false,
    });
  } catch (error: any) {
    console.error("Voice generate error:", error);
    res.status(500).json({ error: error.message || "Failed to generate speech." });
  }
});

// Helper to generate a highly aesthetic, stylized procedural SVG image based on prompt keywords
function generateFallbackSVG(prompt: string, ratio: string): string {
  const normPrompt = prompt.toLowerCase();
  
  // Choose dimensions based on aspect ratio
  let w = 800;
  let h = 800;
  if (ratio === "9:16") { w = 450; h = 800; }
  else if (ratio === "16:9") { w = 800; h = 450; }
  else if (ratio === "3:4") { w = 600; h = 800; }
  else if (ratio === "4:3") { w = 800; h = 600; }

  // High-end premium styling presets
  let colors = {
    bgStart: "#0f172a", // Slate 900
    bgEnd: "#1e1b4b",   // Indigo 950
    accent1: "#4f46e5",  // Indigo 600
    accent2: "#06b6d4",  // Cyan 500
    glow: "#818cf8",     // Indigo 400
  };
  let themeName = "Digital Abstract Space";
  let contentSvg = "";

  if (normPrompt.includes("cyber") || normPrompt.includes("neon") || normPrompt.includes("synth") || normPrompt.includes("future") || normPrompt.includes("ai") || normPrompt.includes("tech") || normPrompt.includes("robot") || normPrompt.includes("comput")) {
    themeName = "Cyberpunk / Synthwave Studio";
    colors = {
      bgStart: "#090514",
      bgEnd: "#1a0b2e",
      accent1: "#ff007f", // Hot Pink
      accent2: "#00f0ff", // Neon Cyan
      glow: "#bc13fe",    // Purple Glow
    };
    contentSvg = `
      <!-- Grid -->
      <path d="M 0,${h*0.6} L ${w},${h*0.6} M 0,${h*0.7} L ${w},${h*0.7} M 0,${h*0.8} L ${w},${h*0.8} M 0,${h*0.9} L ${w},${h*0.9}" stroke="${colors.accent1}" stroke-width="1.5" opacity="0.3" />
      <path d="${Array.from({length: 11}, (_, i) => `M ${(w/10)*i},${h*0.5} L ${(w/10)*i - (w*0.2) + (w*0.4/10)*i},${h}`).join(" ")}" stroke="${colors.accent2}" stroke-width="1.5" opacity="0.2" />
      
      <!-- Rising Sun / Grid Portal -->
      <circle cx="${w/2}" cy="${h*0.5}" r="${Math.min(w, h)*0.25}" fill="url(#sunGlow)" />
      
      <!-- Cyber waves or network grid points -->
      <g stroke="${colors.accent2}" stroke-width="1" opacity="0.4" fill="none">
        <path d="M 0,${h*0.45} Q ${w*0.25},${h*0.35} ${w*0.5},${h*0.45} T ${w},${h*0.45}" />
        <path d="M 0,${h*0.48} Q ${w*0.25},${h*0.42} ${w*0.5},${h*0.48} T ${w},${h*0.48}" />
      </g>
      
      <!-- Tech logo / Core -->
      <g transform="translate(${w/2}, ${h*0.42})">
        <circle r="40" fill="#090514" stroke="${colors.accent2}" stroke-width="3" filter="url(#glow-filter)" />
        <polygon points="0,-25 22,-12 22,12 0,25 -22,12 -22,-12" fill="none" stroke="${colors.accent1}" stroke-width="2" />
        <circle r="8" fill="${colors.accent2}" />
      </g>
    `;
  } else if (normPrompt.includes("nature") || normPrompt.includes("forest") || normPrompt.includes("leaf") || normPrompt.includes("earth") || normPrompt.includes("peace") || normPrompt.includes("health") || normPrompt.includes("eco") || normPrompt.includes("plant") || normPrompt.includes("green") || normPrompt.includes("zen")) {
    themeName = "Organic / Nature Serenity";
    colors = {
      bgStart: "#022c22", // Emerald 950
      bgEnd: "#064e3b",   // Emerald 900
      accent1: "#10b981", // Emerald 500
      accent2: "#fbbf24", // Amber 400
      glow: "#34d399",    // Mint
    };
    contentSvg = `
      <!-- Gentle organic flowing waves -->
      <path d="M -100,${h} L -100,${h*0.6} Q ${w*0.2},${h*0.5} ${w*0.5},${h*0.65} T ${w+100},${h*0.55} L ${w+100},${h} Z" fill="url(#organicWave1)" opacity="0.85" />
      <path d="M -100,${h} L -100,${h*0.7} Q ${w*0.3},${h*0.8} ${w*0.6},${h*0.68} T ${w+100},${h*0.72} L ${w+100},${h} Z" fill="url(#organicWave2)" opacity="0.9" />
      
      <!-- Glowing leaf shape / Zen blossom -->
      <g transform="translate(${w/2}, ${h*0.42}) scale(${Math.min(w, h)/800})">
        <path d="M 0,-150 C 60,-80 80,-20 0,50 C -80,-20 -60,-80 0,-150 Z" fill="url(#leafGrad)" filter="url(#glow-filter)" />
        <path d="M 0,-150 L 0,50" stroke="${colors.accent2}" stroke-width="2" opacity="0.5" />
        <path d="M 0,-100 Q 25,-85 35,-65" stroke="${colors.accent2}" stroke-width="1.5" fill="none" opacity="0.4" />
        <path d="M 0,-70 Q -25,-55 -35,-35" stroke="${colors.accent2}" stroke-width="1.5" fill="none" opacity="0.4" />
      </g>

      <!-- Soft light particles floating -->
      <circle cx="${w*0.25}" cy="${h*0.3}" r="12" fill="${colors.accent2}" opacity="0.2" filter="url(#glow-filter)" />
      <circle cx="${w*0.75}" cy="${h*0.35}" r="8" fill="${colors.accent1}" opacity="0.25" filter="url(#glow-filter)" />
      <circle cx="${w*0.15}" cy="${h*0.55}" r="6" fill="${colors.glow}" opacity="0.15" filter="url(#glow-filter)" />
      <circle cx="${w*0.85}" cy="${h*0.6}" r="10" fill="${colors.accent2}" opacity="0.2" filter="url(#glow-filter)" />
    `;
  } else if (normPrompt.includes("space") || normPrompt.includes("star") || normPrompt.includes("galaxy") || normPrompt.includes("universe") || normPrompt.includes("sky") || normPrompt.includes("moon") || normPrompt.includes("orbit") || normPrompt.includes("astro")) {
    themeName = "Cosmic / Deep Space Galaxy";
    colors = {
      bgStart: "#020617", // Slate 950
      bgEnd: "#0f172a",   // Slate 900
      accent1: "#701a75", // Fuchsia Dark
      accent2: "#38bdf8", // Sky 400
      glow: "#ec4899",    // Pink 500
    };
    contentSvg = `
      <!-- Nebula clouds -->
      <circle cx="${w*0.3}" cy="${h*0.4}" r="${Math.min(w, h)*0.35}" fill="url(#nebula1)" opacity="0.6" filter="url(#glow-filter)" />
      <circle cx="${w*0.7}" cy="${h*0.5}" r="${Math.min(w, h)*0.3}" fill="url(#nebula2)" opacity="0.5" filter="url(#glow-filter)" />
      
      <!-- Starfields -->
      <g fill="#ffffff">
        <circle cx="${w*0.1}" cy="${h*0.2}" r="1.5" opacity="0.8" />
        <circle cx="${w*0.85}" cy="${h*0.15}" r="1" opacity="0.5" />
        <circle cx="${w*0.3}" cy="${h*0.1}" r="2" opacity="0.9" />
        <circle cx="${w*0.75}" cy="${h*0.4}" r="1.2" opacity="0.6" />
        <circle cx="${w*0.2}" cy="${h*0.7}" r="2.5" opacity="0.75" />
        <circle cx="${w*0.9}" cy="${h*0.65}" r="1.5" opacity="0.8" />
        <circle cx="${w*0.45}" cy="${h*0.8}" r="1" opacity="0.4" />
        <circle cx="${w*0.6}" cy="${h*0.25}" r="1.8" opacity="0.7" />
      </g>
      
      <!-- Majestic ringed planet -->
      <g transform="translate(${w/2}, ${h*0.42}) rotate(-15) scale(${Math.min(w, h)/800})">
        <!-- Back ring -->
        <ellipse cx="0" cy="0" rx="190" ry="30" fill="none" stroke="url(#ringGrad)" stroke-width="16" opacity="0.4" clip-path="url(#backRingClip)" />
        
        <!-- Planet Body -->
        <circle cx="0" cy="0" r="95" fill="url(#planetGrad)" filter="url(#shadow-filter)" />
        
        <!-- Front ring -->
        <ellipse cx="0" cy="0" rx="190" ry="30" fill="none" stroke="url(#ringGrad)" stroke-width="16" opacity="0.85" clip-path="url(#frontRingClip)" />
      </g>
    `;
  } else if (normPrompt.includes("sunset") || normPrompt.includes("sunrise") || normPrompt.includes("warm") || normPrompt.includes("desert") || normPrompt.includes("fire") || normPrompt.includes("summer") || normPrompt.includes("sand") || normPrompt.includes("beach")) {
    themeName = "Solar Eclipse / Sunset Warmth";
    colors = {
      bgStart: "#311105", // Rust 950
      bgEnd: "#4c0519",   // Rose 950
      accent1: "#ea580c", // Orange 600
      accent2: "#facc15", // Yellow 400
      glow: "#f43f5e",    // Rose 500
    };
    contentSvg = `
      <!-- Radiant giant sun -->
      <circle cx="${w/2}" cy="${h*0.45}" r="${Math.min(w, h)*0.28}" fill="url(#sunGradient)" filter="url(#glow-filter)" />
      
      <!-- Parallax horizontal ridge silhouettes -->
      <path d="M 0,${h} L 0,${h*0.75} Q ${w*0.35},${h*0.68} ${w*0.7},${h*0.78} T ${w},${h*0.72} L ${w},${h} Z" fill="#2d0f0c" opacity="0.8" />
      <path d="M 0,${h} L 0,${h*0.84} Q ${w*0.25},${h*0.8} ${w*0.55},${h*0.86} T ${w},${h*0.81} L ${w},${h} Z" fill="#18040a" />

      <!-- Vector birds flying -->
      <g stroke="${colors.bgStart}" stroke-width="2.5" fill="none" opacity="0.7">
        <path d="M ${w*0.25},${h*0.25} Q ${w*0.28},${h*0.23} ${w*0.3},${h*0.26} Q ${w*0.32},${h*0.23} ${w*0.35},${h*0.25}" />
        <path d="M ${w*0.65},${h*0.2} Q ${w*0.67},${h*0.18} ${w*0.69},${h*0.21} Q ${w*0.71},${h*0.18} ${w*0.73},${h*0.2}" transform="scale(0.85) translate(60, 30)" />
      </g>
    `;
  } else {
    // Elegant high-tech bento grid & abstract glass bubbles (Default Fallback)
    themeName = "Creative Host Studio Portrait";
    colors = {
      bgStart: "#0f172a", // Slate 900
      bgEnd: "#1e1b4b",   // Indigo 950
      accent1: "#4f46e5",  // Indigo 600
      accent2: "#06b6d4",  // Cyan 500
      glow: "#818cf8",     // Indigo 400
    };
    contentSvg = `
      <!-- Abstract geometric background structure -->
      <rect x="${w*0.1}" y="${h*0.15}" width="${w*0.3}" height="${h*0.3}" rx="16" fill="${colors.accent1}" opacity="0.1" stroke="${colors.accent1}" stroke-width="1" />
      <rect x="${w*0.5}" y="${h*0.2}" width="${w*0.4}" height="${h*0.45}" rx="24" fill="${colors.accent2}" opacity="0.08" stroke="${colors.accent2}" stroke-width="1" />
      
      <!-- Flowing concentric circle waves -->
      <circle cx="${w/2}" cy="${h*0.42}" r="150" fill="none" stroke="${colors.glow}" stroke-width="1" opacity="0.15" />
      <circle cx="${w/2}" cy="${h*0.42}" r="230" fill="none" stroke="${colors.accent2}" stroke-width="1.5" stroke-dasharray="5 15" opacity="0.2" />
      <circle cx="${w/2}" cy="${h*0.42}" r="320" fill="none" stroke="${colors.accent1}" stroke-width="1" opacity="0.1" />

      <!-- Glowing main glass bubble -->
      <circle cx="${w/2}" cy="${h*0.42}" r="${Math.min(w, h)*0.22}" fill="url(#glassGrad)" filter="url(#shadow-filter)" />
      
      <!-- Abstract presenter core portrait silhouette -->
      <g transform="translate(${w/2}, ${h*0.42}) scale(${Math.min(w, h)/800})">
        <path d="M -80,120 C -80,80 -50,50 -20,40 C -30,30 -35,15 -35,0 C -35,-25 -15,-45 10,-45 C 35,-45 55,-25 55,0 C 55,15 50,30 40,40 C 70,50 100,80 100,120 Z" fill="url(#silhouetteGrad)" opacity="0.95" />
        <circle cx="10" cy="0" r="15" fill="none" stroke="${colors.accent2}" stroke-width="2" opacity="0.6" filter="url(#glow-filter)" />
      </g>
    `;
  }

  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" height="100%">
  <defs>
    <!-- Common Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.bgStart}" />
      <stop offset="100%" stop-color="${colors.bgEnd}" />
    </linearGradient>
    
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.accent1}" />
      <stop offset="100%" stop-color="${colors.accent2}" />
    </linearGradient>

    <!-- Theme specific gradients -->
    <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.accent2}" stop-opacity="0.9" />
      <stop offset="30%" stop-color="${colors.glow}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="${colors.bgStart}" stop-opacity="0" />
    </radialGradient>

    <linearGradient id="organicWave1" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${colors.bgStart}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${colors.accent1}" stop-opacity="0.3" />
    </linearGradient>
    
    <linearGradient id="organicWave2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.accent1}" stop-opacity="0.5" />
      <stop offset="100%" stop-color="${colors.accent2}" stop-opacity="0.1" />
    </linearGradient>

    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.accent2}" />
      <stop offset="50%" stop-color="${colors.accent1}" />
      <stop offset="100%" stop-color="${colors.bgStart}" />
    </linearGradient>

    <radialGradient id="nebula1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.accent1}" stop-opacity="0.75" />
      <stop offset="100%" stop-color="${colors.bgStart}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="nebula2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.glow}" stop-opacity="0.6" />
      <stop offset="100%" stop-color="${colors.bgStart}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="planetGrad" cx="35%" cy="35%" r="65%">
      <stop offset="0%" stop-color="${colors.accent2}" />
      <stop offset="45%" stop-color="${colors.accent1}" />
      <stop offset="100%" stop-color="#020617" />
    </radialGradient>

    <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${colors.accent2}" stop-opacity="0" />
      <stop offset="30%" stop-color="${colors.accent2}" stop-opacity="0.9" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.95" />
      <stop offset="70%" stop-color="${colors.glow}" stop-opacity="0.9" />
      <stop offset="100%" stop-color="${colors.accent1}" stop-opacity="0" />
    </linearGradient>

    <radialGradient id="sunGradient" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${colors.accent2}" />
      <stop offset="25%" stop-color="${colors.accent1}" />
      <stop offset="60%" stop-color="${colors.glow}" stop-opacity="0.4" />
      <stop offset="100%" stop-color="${colors.bgStart}" stop-opacity="0" />
    </radialGradient>

    <radialGradient id="glassGrad" cx="30%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2" />
      <stop offset="100%" stop-color="${colors.accent1}" stop-opacity="0.05" />
    </radialGradient>

    <linearGradient id="silhouetteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="${colors.accent2}" />
      <stop offset="50%" stop-color="${colors.accent1}" stop-opacity="0.8" />
      <stop offset="100%" stop-color="${colors.bgStart}" stop-opacity="0.1" />
    </linearGradient>

    <!-- Filters & Shadows -->
    <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="15" result="blur" />
      <feMerge>
        <feMergeNode in="blur" />
        <feMergeNode in="SourceGraphic" />
      </feMerge>
    </filter>

    <filter id="shadow-filter" x="-30%" y="-30%" width="160%" height="160%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000000" flood-opacity="0.6" />
    </filter>

    <!-- Planet ring clipping paths -->
    <clipPath id="frontRingClip">
      <rect x="-300" y="0" width="600" height="300" />
    </clipPath>
    <clipPath id="backRingClip">
      <rect x="-300" y="-300" width="600" height="300" />
    </clipPath>
  </defs>

  <!-- Background Base -->
  <rect width="100%" height="100%" fill="url(#bgGrad)" />

  <!-- Subtle grid backdrop across all themes -->
  <rect width="100%" height="100%" fill="none" opacity="0.05" stroke="#ffffff" stroke-width="1" stroke-dasharray="1 30" />

  <!-- Custom Theme Core Content -->
  ${contentSvg}

  <!-- Beautiful glassmorphism bottom overlay banner for title info -->
  <g transform="translate(0, ${h - 100})">
    <rect width="${w}" height="100" fill="#000000" fill-opacity="0.45" />
    <!-- Gradient line -->
    <rect width="${w}" height="3" fill="url(#glowGrad)" />
    
    <!-- Title and Metadata text -->
    <text x="24" y="44" font-family="'Inter', system-ui, sans-serif" font-weight="800" font-size="15" fill="#ffffff" letter-spacing="1.5" text-transform="uppercase">
      ${themeName}
    </text>
    <text x="24" y="68" font-family="'JetBrains Mono', monospace" font-size="11" fill="${colors.accent2}" opacity="0.85">
      Prompt fallback rendering: "${prompt.length > 52 ? prompt.substring(0, 49) + '...' : prompt}"
    </text>
    
    <!-- Premium Watermark Logo -->
    <text x="${w - 180}" y="52" font-family="'Inter', system-ui, sans-serif" font-weight="900" font-size="12" fill="#ffffff" letter-spacing="4" text-anchor="end" opacity="0.4">
      ROO GEN STUDIO
    </text>
    <circle cx="${w - 50}" cy="48" r="10" fill="none" stroke="${colors.accent1}" stroke-width="2" opacity="0.6" />
    <circle cx="${w - 50}" cy="48" r="4" fill="${colors.accent2}" opacity="0.8" />
  </g>
</svg>`;

  return "data:image/svg+xml;base64," + Buffer.from(svgString).toString("base64");
}

// 4. Social Media Image Generation Endpoint
// Generates image utilizing gemini-3.1-flash-lite-image with dynamic SVG vector art fallback if quota fails
app.post("/api/image-generate", async (req, res) => {
  const { prompt, aspectRatio } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: "Missing image prompt" });
  }

  // Valid standard ratios: "1:1", "3:4", "4:3", "9:16", and "16:9"
  const validRatios = ["1:1", "3:4", "4:3", "9:16", "16:9"];
  const ratio = validRatios.includes(aspectRatio) ? aspectRatio : "1:1";

  try {
    const ai = getGeminiClient(req);

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [{ text: prompt }],
      },
      config: {
        imageConfig: {
          aspectRatio: ratio as any,
        },
      },
    });

    let imageUrl = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!imageUrl) {
      throw new Error("No image data returned from Gemini API");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.warn("Gemini Image generation failed or quota exceeded. Using premium dynamic vector fallback...", error.message || error);
    try {
      // Return a spectacular stylized vector SVG placeholder based on prompt keywords
      const fallbackUrl = generateFallbackSVG(prompt, ratio);
      res.json({ imageUrl: fallbackUrl, isFallback: true, fallbackReason: error.message });
    } catch (fallbackError: any) {
      console.error("Critical image fallback error:", fallbackError);
      res.status(500).json({ error: error.message || "Failed to generate social media post image." });
    }
  }
});

// 5. Text-To-Video / Animation Drive Prompt Endpoint
// Takes a prompt or video script and generates keyframes and camera tracks for multi-section animations
app.post("/api/video-script-animate", async (req, res) => {
  try {
    const { scriptPrompt, activeImageBase64, activeAudioBase64 } = req.body;
    if (!scriptPrompt) {
      return res.status(400).json({ error: "Missing scriptPrompt" });
    }

    // TRY LOCAL RTX 4070 GPU SERVER FIRST
    try {
      console.log("Attempting local RTX 4070 SadTalker/LivePortrait animation handoff at http://127.0.0.1:8000...");
      const localResponse = await fetch("http://127.0.0.1:8000/api/video-script-animate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          script_prompt: scriptPrompt,
          image_base64: activeImageBase64 || null,
          audio_base64: activeAudioBase64 || null,
        }),
        signal: AbortSignal.timeout(6000),
      });

      if (localResponse.ok) {
        const localData = await localResponse.json();
        console.log("SUCCESS: Video keyframes and camera tracking computed locally on RTX 4070!");
        return res.json({
          ...localData,
          isLocalGpu: true,
        });
      } else {
        console.log("Local GPU server is offline or returned empty for video script, falling back to Gemini Cloud.");
      }
    } catch (localErr: any) {
      console.log("Local RTX 4070 server is offline/unavailable for animation. Falling back to Gemini Cloud:", localErr.message);
    }

    const ai = getGeminiClient(req);

    const prompt = `Based on this text-to-video prompt or animation script: "${scriptPrompt}"
    Construct a full cinematic character animation timeline with dynamic camera motions.
    The response MUST be a valid JSON object matching the schema below. Output ONLY raw JSON, no markdown codeblocks, no commentary.
    
    Schema:
    {
      "durationMs": number (total duration in milliseconds, e.g., 5000),
      "scenery": string (description of the scene and lighting),
      "mood": string (e.g., "cinematic", "dynamic", "whimsical", "corporate"),
      "timeline": [
        {
          "timeMs": number (timestamp, e.g. 0, 500, 1000...),
          "camera": {
            "scale": number (zoom factor, e.g., 1.0 to 1.8),
            "panX": number (horizontal pan in px, e.g., -50 to 50),
            "panY": number (vertical pan in px, e.g., -50 to 50),
            "rotate": number (camera rotation angle, e.g., -10 to 10)
          },
          "expression": "happy" | "talking" | "surprised" | "serious" | "thinking",
          "lipSyncMouthOpen": number (0 to 1),
          "subtitle": string (spoken segment or camera direction text)
        }
      ]
    }`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [prompt],
      config: {
        responseMimeType: "application/json",
      },
    });

    const scriptResult = response.text?.trim() || "{}";
    const parsedData = JSON.parse(scriptResult);
    
    res.json({
      ...parsedData,
      isLocalGpu: false,
    });
  } catch (error: any) {
    console.error("Video script animation error:", error);
    res.status(500).json({ error: error.message || "Failed to generate video script animation keyframes." });
  }
});

// Takes a basic concept and acts as an AI prompt architect to expand/enhance it for cinematic animation
app.post("/api/expand-prompt", async (req, res) => {
  try {
    const { basicPrompt } = req.body;
    if (!basicPrompt) {
      return res.status(400).json({ error: "Missing basicPrompt" });
    }

    const ai = getGeminiClient(req);

    const systemPrompt = `You are an elite Hollywood visual director and AI cinematography architect. 
    Your job is to expand the user's basic animation or character prompt into a professional, high-fidelity camera directing script.
    Incorporate detailed camera motion directives (e.g. slow zoom, dramatic pan, orbit tracking, lens flares) and facial expression keyframe requests (e.g. eye blinks, expression transitions, subtle head tilts) that a video generation model or face-puppeteer model can map perfectly.
    Keep the expanded prompt concise, impactful, and descriptive (under 120 words).
    Do NOT output any markdown blocks, lists or conversational preamble. Output ONLY the raw expanded prompt text.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [`System Instruction: ${systemPrompt}\n\nExpand this basic idea: "${basicPrompt}"`],
    });

    const expandedPrompt = response.text?.trim() || basicPrompt;
    res.json({ expandedPrompt });
  } catch (error: any) {
    console.error("Expand prompt error:", error);
    res.status(500).json({ error: error.message || "Failed to expand prompt." });
  }
});

// Takes a freeform camera styling description and acts as an AI prompt architect to configure 3D camera values
app.post("/api/match-camera", async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Missing camera motion style description" });
    }

    const ai = getGeminiClient(req);

    const systemPrompt = `You are an elite motion designer and visual FX director. 
    Analyze the user's camera request and output a valid JSON object matching these options:
    - motionType: strictly one of "dolly-in", "dolly-out", "pan-left", "orbit-right", "handheld"
    - duration: integer between 1 and 25 (seconds)
    - quality: strictly one of "draft", "medium", "cinematic"
    - overlay: strictly one of "none", "particles", "glitch", "lens-flare", "cinematic"
    - intensity: float between 1.0 and 1.5 (motion speed/scale intensity)

    Ensure the config aligns creatively with the request (e.g., "dramatic", "epic" -> high intensity/cinematic; "sci-fi", "digital" -> glitch; "dusty", "dreamy" -> particles).
    Return ONLY a JSON block matching the specified format. Do NOT wrap in markdown formatting.`;

    const response = await generateContentWithRetry(ai, {
      model: "gemini-3.5-flash",
      contents: [`System Instruction: ${systemPrompt}\n\nMatch this description: "${prompt}"`],
      config: {
        responseMimeType: "application/json",
      }
    });

    const matchedConfig = JSON.parse(response.text?.trim() || "{}");
    res.json(matchedConfig);
  } catch (error: any) {
    console.error("Match camera error:", error);
    res.status(500).json({ error: error.message || "Failed to configure camera parameters." });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
