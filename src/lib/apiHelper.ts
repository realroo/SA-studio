/**
 * Centralized API helper coordinating direct local PC GPU rendering and personal Gemini API key routing.
 * Avoids rate-limits / quotas by using the user's local hardware or their personal API key.
 */

export const getHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const key = localStorage.getItem("user_gemini_key") || "";
  if (key) {
    headers["x-user-gemini-key"] = key;
  }
  return headers;
};

export const makeApiRequest = async (endpoint: string, bodyObj: any) => {
  const useLocal = localStorage.getItem("use_local_gpu") === "true";
  const host = localStorage.getItem("local_gpu_host") || "http://localhost:8000";
  const key = localStorage.getItem("user_gemini_key") || "";

  // Endpoints that support local GPU processing bypass
  const supportsLocalGpu = 
    endpoint === "/api/voice-generate" || 
    endpoint === "/api/video-script-animate" || 
    endpoint === "/api/image-generate" || 
    endpoint === "/api/voice-profile";

  if (useLocal && supportsLocalGpu) {
    try {
      const targetUrl = `${host}${endpoint}`;
      console.log(`[Local PC GPU] Attempting direct browser request to local PC: ${targetUrl}`);
      
      const localResponse = await fetch(targetUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyObj),
        // Timeout after 6.5s to fallback immediately to Cloud Run server if PC GPU is sluggish or stuck
        signal: AbortSignal.timeout(6500),
      });

      if (localResponse.ok) {
        const localData = await localResponse.json();
        console.log(`[Local PC GPU] SUCCESS: Rendered ${endpoint} locally on visitor's RTX card!`);
        return { ...localData, isLocalGpu: true };
      } else {
        console.warn(`[Local PC GPU] Host returned error code ${localResponse.status}. Routing to Cloud Run...`);
      }
    } catch (err: any) {
      console.warn(`[Local PC GPU] Unreachable local host ${host}. Falling back to Cloud Run proxy:`, err.message || err);
    }
  }

  // Cloud API request routed through Cloud Run proxy (injects custom user-provided API key to handle quota rate-limiting)
  const cloudHeaders = getHeaders();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: cloudHeaders,
    body: JSON.stringify(bodyObj),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Request failed with status ${response.status}`);
  }

  return await response.json();
};

export const checkLocalPCStatus = async (hostUrl: string): Promise<boolean> => {
  if (!hostUrl) return false;
  try {
    const checkUrl = `${hostUrl}/api/gpu-status`;
    const res = await fetch(checkUrl, {
      method: "GET",
      signal: AbortSignal.timeout(1000),
    });
    return res.ok;
  } catch {
    // Fallback: ping root with no-cors mode to verify service port is open
    try {
      const cleanUrl = hostUrl.endsWith("/") ? hostUrl : `${hostUrl}/`;
      await fetch(cleanUrl, {
        method: "HEAD",
        mode: "no-cors",
        signal: AbortSignal.timeout(1000),
      });
      return true;
    } catch {
      return false;
    }
  }
};

/**
 * Plays a beautiful, high-quality, offline-ready success chime when asset generation is complete.
 * Uses Web Audio API oscillators so it works without requiring external media files.
 */
export const playCompletionSound = () => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const audioContext = new AudioContextClass();
    
    const playNote = (frequency: number, startTime: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(frequency, startTime);
      
      gainNode.gain.setValueAtTime(0.08, startTime);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
      
      osc.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    
    const now = audioContext.currentTime;
    // Ascending major chord (C5 - E5 - G5)
    playNote(523.25, now, 0.15); // C5
    playNote(659.25, now + 0.10, 0.15); // E5
    playNote(783.99, now + 0.20, 0.40); // G5
  } catch (err) {
    console.warn("Failed to trigger completion audio notification chime:", err);
  }
};

