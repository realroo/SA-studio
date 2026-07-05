import React, { useState, useRef, useEffect } from "react";
import { Music, Volume2, Search, Play, Square, Download, CheckCircle, AlertCircle, Sparkles, Filter } from "lucide-react";

interface Sound {
  id: string;
  name: string;
  category: "memes" | "anime" | "gaming" | "cinematic" | "transitions";
  description: string;
  sourceUrl?: string; // Optional real fallback URL
  synthType: string;
  seed?: number;
}

const BASE_MEME_SOUNDS: Sound[] = [
  {
    id: "epic_impact",
    name: "Epic Metal Impact",
    category: "cinematic",
    description: "Deep, bass-boosted cinematic metal slam. Outstanding for high-impact transitions.",
    synthType: "boom",
    sourceUrl: "https://actions.google.com/sounds/v1/impacts/epic_vibrant_metal_impact.ogg"
  },
  {
    id: "cartoon_boing",
    name: "Cartoon Boing",
    category: "memes",
    description: "The classic springy boing sound of funny surprise.",
    synthType: "wow",
    sourceUrl: "https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg"
  },
  {
    id: "retro_laser",
    name: "Retro Pew Pew",
    category: "gaming",
    description: "8-bit arcade laser blaster pulse with pitch slide.",
    synthType: "pewpew",
    sourceUrl: "https://actions.google.com/sounds/v1/science_fiction/retro_arcade_laser_pew_pew.ogg"
  },
  {
    id: "slide_whistle_down",
    name: "Slide Whistle Fail",
    category: "memes",
    description: "Silly descending slide whistle representing disappointment.",
    synthType: "fail",
    sourceUrl: "https://actions.google.com/sounds/v1/cartoon/slide_whistle_descending.ogg"
  },
  {
    id: "cowbell",
    name: "Meme Cowbell",
    category: "memes",
    description: "Hype cowbell stroke. Essential for Phonk, beats, and meme accents.",
    synthType: "chime",
    sourceUrl: "https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg"
  },
  {
    id: "glass_shatter",
    name: "Glass Shatter",
    category: "cinematic",
    description: "Sharp high-frequency sound of breaking window panes.",
    synthType: "scratch",
    sourceUrl: "https://actions.google.com/sounds/v1/foley/glass_shatter.ogg"
  },
  {
    id: "metal_clang",
    name: "Iron Clang",
    category: "transitions",
    description: "Heavy iron chain/metal drop. Rich industrial texture.",
    synthType: "boom",
    sourceUrl: "https://actions.google.com/sounds/v1/impacts/crash_metal_clang.ogg"
  },
  {
    id: "whisper_whoosh",
    name: "Whisper Whoosh",
    category: "transitions",
    description: "Slick and airy noise sweep representing speed or clean screen wipes.",
    synthType: "whoosh",
    sourceUrl: "https://actions.google.com/sounds/v1/transitions/sliding_whisper_whoosh.ogg"
  },
  {
    id: "short_whoosh",
    name: "Short Sweeping Whoosh",
    category: "transitions",
    description: "Snappy, high-velocity atmospheric air sweep.",
    synthType: "whoosh",
    sourceUrl: "https://actions.google.com/sounds/v1/transitions/short_sweeping_whoosh.ogg"
  },
  {
    id: "ghostly_creak",
    name: "Ghostly Creak",
    category: "cinematic",
    description: "Eerie creaking wooden floorboards or haunted door.",
    synthType: "violin",
    sourceUrl: "https://actions.google.com/sounds/v1/horror/ghostly_creaking_whisper.ogg"
  },
  {
    id: "scary_drum",
    name: "Horror Sub Drum",
    category: "cinematic",
    description: "Terrifying low sub-bass heartbeat/drum hit for scary timing.",
    synthType: "bassdrop",
    sourceUrl: "https://actions.google.com/sounds/v1/horror/low_cinematic_scary_drum.ogg"
  },
  {
    id: "referee_whistle",
    name: "Referee Whistle Blow",
    category: "memes",
    description: "High-pitched sharp sports whistle blast.",
    synthType: "airhorn",
    sourceUrl: "https://actions.google.com/sounds/v1/sports/referee_whistle_blow.ogg"
  },
  {
    id: "chicken_cluck",
    name: "Chicken Cluck",
    category: "memes",
    description: "Funny animal sound. Great for mocking or sussy edits.",
    synthType: "bruh",
    sourceUrl: "https://actions.google.com/sounds/v1/animals/chicken_cluck.ogg"
  },
  {
    id: "dog_bark",
    name: "Dog Bark Twice",
    category: "memes",
    description: "Classic canine warning barks.",
    synthType: "bruh",
    sourceUrl: "https://actions.google.com/sounds/v1/animals/dog_bark_twice.ogg"
  },
  {
    id: "morning_birds",
    name: "Morning Birds Sparkle",
    category: "anime",
    description: "Peaceful morning forest ambiance with chirping birds.",
    synthType: "chime",
    sourceUrl: "https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg"
  },
  {
    id: "digital_alarm",
    name: "Digital Alarm Watch",
    category: "gaming",
    description: "Classic high-pitched beep-beep watch alert.",
    synthType: "pewpew",
    sourceUrl: "https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg"
  },
  {
    id: "retro_laser_shot",
    name: "Arcade Space Blaster",
    category: "gaming",
    description: "Retro sci-fi space wave laser pulse.",
    synthType: "pewpew",
    sourceUrl: "https://actions.google.com/sounds/v1/weapons/retro_laser_shot.ogg"
  }
];

const CATEGORY_COMPONENTS = {
  memes: {
    prefixes: ["Dank", "Sarcastic", "Hyper", "Deep Fried", "Sussy", "Sigma", "GigaChad", "Baka", "Classic", "Vintage", "MLG", "Gamer", "Emotional", "Wojak", "Boomer", "Zoomer", "Noob", "Pro", "Savage", "Cringe", "Cheeky", "Sneaky", "Speedrunner", "Reaction", "Troll", "Spam", "Clickbait", "Oof", "Screaming"],
    roots: ["Sigh", "Scream", "Laugh", "Quack", "Honk", "Boing", "Slide", "Fart", "Gulp", "Slap", "Burp", "Sneeze", "Whistle", "Beep", "Groan", "Giggle", "Snort", "Chuckle", "Howl", "Gasp", "Chomp", "Yawn", "Squeak", "Plop", "Zap", "Crash", "Ding", "Dong"],
    suffixes: ["SFX", "Drop", "Meme", "Hit", "Vibe", "Moment", "Effect", "Classic", "Audio", "Wave", "Tone", "Stutter", "Echo", "Bass", "Reverb", "Glitch", "Pulse", "Punch", "Boom", "Clash", "Bust", "Slam"]
  },
  anime: {
    prefixes: ["Chibi", "Kawaii", "Shonen", "Senpai", "Tsundere", "Yandere", "Mecha", "Golden", "Aura", "Spirit", "Mystic", "Celestial", "Dimensional", "Nani", "Sugoii", "Yamete", "Otaku", "Ninja", "Shinobi", "Kaiju", "Chakra", "Super", "Hyper", "Neo", "Cosmic", "Lunar", "Solar"],
    roots: ["Sparkle", "Chime", "Beam", "Slay", "Shine", "Glance", "Glow", "Charge", "Burst", "Flash", "Teleport", "Power-Up", "Awakening", "Slash", "Strike", "Impact", "Summon", "Whirl", "Vortex", "Swell", "Glimmer", "Bell", "Heartbeat", "Sigh"],
    suffixes: ["Effect", "Chime", "Aura", "Magic", "Burst", "Glimmer", "Glow", "Whisper", "Echo", "Style", "Technique", "Form", "Phase", "Trigger", "Force", "Strike", "Slash", "Spark", "Shield", "Pulse"]
  },
  gaming: {
    prefixes: ["Pixel", "8-Bit", "16-Bit", "Retro", "Arcade", "Cyber", "Virtual", "Synthwave", "Level Up", "Game Over", "Combo", "Quest", "Loot", "Epic", "Legendary", "Rare", "Boss", "Respawn", "Glitched", "Alpha", "Beta", "Reloaded", "Speedrun", "Stealth", "Assault", "Melee"],
    roots: ["Laser", "Pew", "Zap", "Coin", "Jump", "Dash", "Hurt", "Kill", "Score", "Unlock", "Equip", "Spawn", "Teleport", "Reload", "Blaster", "Phaser", "Disintegrator", "Power", "Buff", "Debuff", "Shield", "Mana", "Health", "Exp", "Critical", "Ping"],
    suffixes: ["Beep", "Pulse", "Blaster", "Tone", "Synth", "Wave", "Chime", "Click", "Buzz", "Swell", "Alert", "Warning", "Alarm", "Siren", "Engine", "Boost", "Drive", "Trigger", "Module", "System", "Protocol"]
  },
  cinematic: {
    prefixes: ["Orchestral", "Symphonic", "Hollywood", "Epic", "Dark", "Dramatic", "Suspenseful", "Thriller", "Action", "Horror", "Sci-Fi", "Cosmic", "Interstellar", "Stellar", "Deep Space", "Abyssal", "Gothic", "Ambient", "Atmospheric", "Subsonic", "Ethereal", "Ghostly", "Vintage"],
    roots: ["Boom", "Drop", "Swell", "Rise", "Rumble", "Drone", "Impact", "Hit", "Crash", "Slam", "Blast", "Thud", "Shockwave", "Climax", "Crescendo", "Tremor", "Pulse", "Wobble", "Oscillation", "Heartbeat", "Reverb", "Tension", "Sub", "Bender", "Sub-Bass"],
    suffixes: ["Boomer", "Sub", "Impact", "Hit", "Rumble", "Drone", "Rise", "Swell", "Tail", "Decay", "Release", "Atmosphere", "Texture", "Layer", "Pad", "Synth", "Orchestra", "Brass", "String", "Horn", "Ensemble"]
  },
  transitions: {
    prefixes: ["Clean", "Dirty", "Fast", "Slow", "Smooth", "Abrupt", "Glitchy", "Analog", "Digital", "Vinyl", "Tape", "Radio", "White Noise", "Filter", "Sweeping", "Phased", "Flanged", "Chorus", "Dynamic", "Panned", "Slick", "Washed", "Reverbed", "Dry", "Spatial", "Stereo"],
    roots: ["Whoosh", "Swipe", "Scratch", "Slide", "Swoosh", "Whip", "Flyby", "Pass", "Wind", "Breeze", "Rush", "Spin", "Rewind", "Forward", "Fast-Forward", "Stop", "Break", "Interruption", "Static", "Fuzz", "Vacuum", "Vortex", "Siphon", "Gate", "Trigger"],
    suffixes: ["Transition", "Whip", "Whoosh", "Swipe", "Swoosh", "Cut", "Fade", "Wipe", "Dissolve", "Switch", "Slam", "Drop", "Swell", "Build", "Riser", "Downlifter", "Sweeper", "Filter", "Pass", "Breaker"]
  }
};

const generateProceduralSounds = (): Sound[] => {
  const sounds: Sound[] = [...BASE_MEME_SOUNDS];
  const categories: Sound["category"][] = ["memes", "anime", "gaming", "cinematic", "transitions"];

  let index = 0;
  while (sounds.length < 505) {
    const category = categories[index % categories.length];
    const comp = CATEGORY_COMPONENTS[category];
    
    // Deterministic selection based on iteration index to guarantee unique titles
    const prefix = comp.prefixes[Math.floor(index / categories.length) % comp.prefixes.length];
    const root = comp.roots[Math.floor(index / (categories.length * comp.prefixes.length)) % comp.roots.length];
    const suffix = comp.suffixes[Math.floor(index / (categories.length * comp.prefixes.length * comp.roots.length)) % comp.suffixes.length];

    const name = `${prefix} ${root} ${suffix}`;
    const id = `${category}_procedural_${index}`;

    // Map the sound to an appropriate synthesizer type
    let synthType = "chime";
    if (category === "memes") {
      const memeSynths = ["boom", "bruh", "airhorn", "fail"];
      synthType = memeSynths[index % memeSynths.length];
    } else if (category === "anime") {
      const animeSynths = ["wow", "chime", "violin"];
      synthType = animeSynths[index % animeSynths.length];
    } else if (category === "gaming") {
      const gamingSynths = ["pewpew", "wasted", "chime"];
      synthType = gamingSynths[index % gamingSynths.length];
    } else if (category === "cinematic") {
      const cineSynths = ["bassdrop", "boom", "violin"];
      synthType = cineSynths[index % cineSynths.length];
    } else if (category === "transitions") {
      const transSynths = ["whoosh", "scratch", "fail"];
      synthType = transSynths[index % transSynths.length];
    }

    const description = `High quality procedural ${synthType} sound effect. Perfect for high-fidelity ${category} video edits, streams, and animations. Features custom real-time Web Audio envelope synthesis.`;

    // Ensure no duplicate IDs or names
    if (!sounds.some(s => s.name === name)) {
      sounds.push({
        id,
        name,
        category,
        description,
        synthType,
        seed: index + 101
      });
    }

    index++;
  }

  return sounds;
};

const MEME_SOUNDS: Sound[] = generateProceduralSounds();

export default function Soundboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0.8);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [isDownloadingId, setIsDownloadingId] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(60);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeNodesRef = useRef<{ oscs: OscillatorNode[]; gain: GainNode; filter?: BiquadFilterNode } | null>(null);
  const activeAudioElRef = useRef<HTMLAudioElement | null>(null);

  // Reset lazy load pagination on filter change
  useEffect(() => {
    setVisibleCount(60);
  }, [activeCategory, searchQuery]);

  // Show status toasts
  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Stop currently playing audio (element or synthesizer)
  const stopCurrentAudio = () => {
    if (activeAudioElRef.current) {
      try {
        activeAudioElRef.current.pause();
        activeAudioElRef.current.currentTime = 0;
      } catch (e) {}
      activeAudioElRef.current = null;
    }

    if (activeNodesRef.current) {
      try {
        activeNodesRef.current.oscs.forEach(osc => osc.stop());
      } catch (e) {}
      activeNodesRef.current = null;
    }

    setPlayingId(null);
  };

  // Sound synthesis recipes with deterministic dynamic seed parameterization
  const synthesizeSoundNode = (ctx: BaseAudioContext, synthType: string, destNode: AudioNode, seed?: number) => {
    const oscs: OscillatorNode[] = [];
    const mainGain = ctx.createGain();
    mainGain.connect(destNode);

    const t = ctx.currentTime;

    if (synthType === "boom") {
      // 1. VINE BOOM: Deep bass kick + sweeping low triangle + noise click (modulated by seed)
      const freqMult = seed ? 0.75 + (seed % 50) / 100 : 1.0;
      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(1.0, t + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

      // Low bass sweep
      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(160 * freqMult, t);
      osc.frequency.exponentialRampToValueAtTime(40 * freqMult, t + 0.4);
      osc.frequency.exponentialRampToValueAtTime(28 * freqMult, t + 1.2);
      osc.connect(mainGain);
      oscs.push(osc);

      // Deep sub hum
      const subOsc = ctx.createOscillator();
      subOsc.type = "sine";
      subOsc.frequency.setValueAtTime(60 * freqMult, t);
      subOsc.frequency.linearRampToValueAtTime(35 * freqMult, t + 1.5);
      
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.6, t);
      subGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
      subOsc.connect(subGain);
      subGain.connect(destNode);
      oscs.push(subOsc);

      // Click/Impact noise
      try {
        const bufferSize = ctx.sampleRate * 0.1;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;
        const noiseFilter = ctx.createBiquadFilter();
        noiseFilter.type = "bandpass";
        noiseFilter.frequency.setValueAtTime(300 * freqMult, t);
        
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.3, t);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(destNode);
        
        noise.start(t);
      } catch (e) {}

    } else if (synthType === "bruh") {
      // 2. BRUH: Flat low vocal sigh (modulated by seed)
      const freqMult = seed ? 0.8 + (seed % 40) / 100 : 1.0;
      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.9, t + 0.08);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.6);

      const osc = ctx.createOscillator();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(115 * freqMult, t);
      osc.frequency.linearRampToValueAtTime(82 * freqMult, t + 0.45);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.Q.setValueAtTime(12, t);
      filter.frequency.setValueAtTime(180 * freqMult, t);
      filter.frequency.linearRampToValueAtTime(140 * freqMult, t + 0.45);

      osc.connect(filter);
      filter.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "airhorn") {
      // 3. AIRHORN: Classic harsh tri-tone with an amplitude LFO jitter (modulated by seed)
      mainGain.gain.setValueAtTime(0, t);
      
      const pitchShift = seed ? (seed % 12) - 6 : 0; // -6 to +5 semitones shift
      const freqMult = Math.pow(2, pitchShift / 12);
      const freqs = [698.46 * freqMult, 783.99 * freqMult, 932.33 * freqMult];
      const hornGains: GainNode[] = [];

      freqs.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, t);
        osc.detune.setValueAtTime(Math.random() * 8 - 4, t);
        
        const hGain = ctx.createGain();
        hGain.gain.setValueAtTime(0.25, t);
        
        osc.connect(hGain);
        hGain.connect(mainGain);
        oscs.push(osc);
        hornGains.push(hGain);
      });

      // Air pressure envelope (stutter)
      mainGain.gain.setValueAtTime(0.8, t);
      mainGain.gain.setValueAtTime(0.001, t + 0.18);
      mainGain.gain.setValueAtTime(0.8, t + 0.22);
      mainGain.gain.setValueAtTime(0.001, t + 0.38);
      mainGain.gain.setValueAtTime(0.8, t + 0.42);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    } else if (synthType === "violin") {
      // 4. SAD VIOLIN: slow attack tremolo-vibrato sawtooth (note modulated by seed)
      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.7, t + 0.3);
      mainGain.gain.linearRampToValueAtTime(0.6, t + 0.9);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

      const notes = [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25, 783.99]; // A3 to G5 notes
      const baseFreq = seed ? notes[seed % notes.length] : 440;

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(baseFreq, t);

      // Vibrato
      const vibrato = ctx.createOscillator();
      vibrato.frequency.setValueAtTime(6.2, t); // 6.2Hz
      const vibratoGain = ctx.createGain();
      vibratoGain.gain.setValueAtTime(5, t); // 5 cents
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc.detune);
      vibrato.start(t);
      oscs.push(vibrato);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(baseFreq * 2.1, t);

      osc.connect(filter);
      filter.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "wow") {
      // 5. ANIME WOW: High pitch swipe up with echo delay simulation (modulated by seed)
      const startFreq = seed ? 200 + (seed % 300) : 320;
      const endFreq = seed ? 800 + (seed % 800) : 1150;

      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.65, t + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.95);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + 0.3);

      const filter = ctx.createBiquadFilter();
      filter.type = "peaking";
      filter.frequency.setValueAtTime(endFreq * 0.8, t);
      filter.Q.setValueAtTime(8, t);

      osc.connect(filter);
      filter.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "wasted") {
      // 6. WASTED GTA TUNE: Sad retro 8-bit descending melody (modulated by seed)
      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.6, t + 0.02);
      
      const pitchShift = seed ? (seed % 8) - 4 : 0;
      const freqMult = Math.pow(2, pitchShift / 12);

      const osc = ctx.createOscillator();
      osc.type = "square";
      osc.frequency.setValueAtTime(392.00 * freqMult, t); // G4
      osc.frequency.setValueAtTime(369.99 * freqMult, t + 0.25); // F#4
      osc.frequency.setValueAtTime(349.23 * freqMult, t + 0.50); // F4
      osc.frequency.setValueAtTime(293.66 * freqMult, t + 0.75); // D4
      
      mainGain.gain.setValueAtTime(0.6, t);
      mainGain.gain.setValueAtTime(0.5, t + 0.25);
      mainGain.gain.setValueAtTime(0.4, t + 0.50);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 1.6);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(1200 * freqMult, t);
      filter.frequency.exponentialRampToValueAtTime(300 * freqMult, t + 1.4);

      osc.connect(filter);
      filter.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "scratch") {
      // 7. RECORD SCRATCH: Sweeping noise bands (modulated by seed)
      const startFreq = seed ? 1200 + (seed % 1600) : 2000;
      const endFreq = seed ? 300 + (seed % 200) : 400;

      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.7, t + 0.05);
      mainGain.gain.linearRampToValueAtTime(0.6, t + 0.15);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);

      try {
        const bufferSize = ctx.sampleRate * 0.6;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(6, t);
        filter.frequency.setValueAtTime(startFreq, t);
        filter.frequency.linearRampToValueAtTime(endFreq, t + 0.22);
        filter.frequency.linearRampToValueAtTime(startFreq * 0.8, t + 0.4);

        noise.connect(filter);
        filter.connect(mainGain);
        noise.start(t);
      } catch (e) {}

    } else if (synthType === "fail") {
      // 8. FAIL HORN: Descending slide trombone notes (modulated by seed)
      const pitchShift = seed ? (seed % 6) - 3 : 0;
      const freqMult = Math.pow(2, pitchShift / 12);

      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.5, t + 0.05);

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(311.13 * freqMult, t); // Eb4
      osc.frequency.setValueAtTime(293.66 * freqMult, t + 0.35); // D4
      osc.frequency.setValueAtTime(277.18 * freqMult, t + 0.70); // Db4
      osc.frequency.setValueAtTime(261.63 * freqMult, t + 1.05); // C4
      osc.frequency.linearRampToValueAtTime(196.00 * freqMult, t + 1.8); // Drop down to G3

      mainGain.gain.setValueAtTime(0.5, t);
      mainGain.gain.setValueAtTime(0.45, t + 0.35);
      mainGain.gain.setValueAtTime(0.42, t + 0.70);
      mainGain.gain.setValueAtTime(0.40, t + 1.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 2.1);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(800 * freqMult, t);

      osc.connect(filter);
      filter.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "bassdrop") {
      // 9. BASS DROP: Sub sweeps (modulated by seed)
      const startFreq = seed ? 80 + (seed % 60) : 120;
      const sweepSpeed = seed ? 1.8 + (seed % 10) / 10 : 2.2;

      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(1.0, t + 0.1);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 2.5);

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(25, t + sweepSpeed);

      osc.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "pewpew") {
      // 10. PEW PEW: Fast laser swipe (modulated by seed)
      const startFreq = seed ? 1400 + (seed % 1400) : 2200;
      const endFreq = seed ? 80 + (seed % 80) : 120;
      const laserSpeed = seed ? 0.25 + (seed % 15) / 100 : 0.35;

      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.65, t + 0.02);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + laserSpeed + 0.05);

      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(startFreq, t);
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + laserSpeed);

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(startFreq * 0.8, t);

      osc.connect(filter);
      filter.connect(mainGain);
      oscs.push(osc);

    } else if (synthType === "whoosh") {
      // 11. WHOOSH: Noise transition (modulated by seed)
      const qVal = seed ? 0.8 + (seed % 20) / 10 : 1.5;
      const sweepPeak = seed ? 1000 + (seed % 1000) : 1400;

      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.85, t + 0.35);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

      try {
        const bufferSize = ctx.sampleRate * 1.0;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = "bandpass";
        filter.Q.setValueAtTime(qVal, t);
        filter.frequency.setValueAtTime(120, t);
        filter.frequency.exponentialRampToValueAtTime(sweepPeak, t + 0.35);
        filter.frequency.exponentialRampToValueAtTime(220, t + 0.85);

        noise.connect(filter);
        filter.connect(mainGain);
        noise.start(t);
      } catch (e) {}

    } else if (synthType === "chime") {
      // 12. GLIMMER CHIME: sparkling bell high tones (chords modulated by seed)
      mainGain.gain.setValueAtTime(0, t);
      mainGain.gain.linearRampToValueAtTime(0.6, t + 0.05);
      mainGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

      const chords = [
        [1046.50, 1318.51, 1567.98, 2093.00], // C major C6-E6-G6-C7
        [880.00, 1046.50, 1318.51, 1760.00],  // A minor A5-C6-E6-A6
        [1174.66, 1396.91, 1760.00, 2349.32], // D minor D6-F6-A6-D7
        [987.77, 1174.66, 1567.98, 1975.53]   // G major B5-D6-G6-B6
      ];
      const freqs = chords[seed ? seed % chords.length : 0];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, t + idx * 0.08);

        const bellGain = ctx.createGain();
        bellGain.gain.setValueAtTime(0, t);
        bellGain.gain.setValueAtTime(0.2, t + idx * 0.08);
        bellGain.gain.exponentialRampToValueAtTime(0.001, t + idx * 0.08 + 0.8);

        osc.connect(bellGain);
        bellGain.connect(mainGain);
        oscs.push(osc);
      });
    }

    // Start all configured oscillators
    oscs.forEach(osc => {
      try { osc.start(t); } catch (err) {}
    });

    return oscs;
  };

  // Play sound trigger
  const handlePlaySound = async (sound: Sound) => {
    stopCurrentAudio();
    setPlayingId(sound.id);

    // Prefer using real high-quality CDN URL in iframe or new tab if available
    if (sound.sourceUrl) {
      let fallbackTriggered = false;
      const triggerFallback = () => {
        if (!fallbackTriggered) {
          fallbackTriggered = true;
          triggerSynthPlayback(sound);
        }
      };

      let safetyTimeout: NodeJS.Timeout | null = null;

      try {
        const audio = new Audio(sound.sourceUrl);
        audio.volume = volume;
        activeAudioElRef.current = audio;
        
        audio.addEventListener("ended", () => {
          setPlayingId(prev => prev === sound.id ? null : prev);
        });

        audio.addEventListener("error", (e) => {
          console.warn("External URL playback failed or was blocked, falling back to real-time Web Audio Synthesizer:", e);
          triggerFallback();
        });

        // Set a safety timeout: if the audio hasn't started playing within 800ms, fall back to the synthesizer
        safetyTimeout = setTimeout(() => {
          if (activeAudioElRef.current === audio && (audio.paused || audio.seeking)) {
            console.warn("External URL load timed out (800ms), falling back to local synthesizer");
            stopCurrentAudio(); // Clear the slow audio element
            setPlayingId(sound.id); // Reset playing ID
            triggerFallback();
          }
        }, 800);

        await audio.play();
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
        }
        return;
      } catch (err) {
        console.warn("Autoplay block or network block. Falling back to local synthesizer:", err);
        if (safetyTimeout) {
          clearTimeout(safetyTimeout);
        }
        triggerFallback();
        return;
      }
    }

    // Local procedural synthesizer fallback
    triggerSynthPlayback(sound);
  };

  const triggerSynthPlayback = async (sound: Sound) => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) {
        showToast("Web Audio API is not supported in this browser.", "error");
        setPlayingId(null);
        return;
      }

      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioContextClass();
      }

      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        await ctx.resume();
      }

      const dest = ctx.destination;
      const playbackGain = ctx.createGain();
      playbackGain.gain.setValueAtTime(volume, ctx.currentTime);
      playbackGain.connect(dest);

      const oscs = synthesizeSoundNode(ctx, sound.synthType, playbackGain, sound.seed);

      activeNodesRef.current = {
        oscs,
        gain: playbackGain
      };

      // Auto-turn off indicator after 2 seconds (safely covers durations)
      setTimeout(() => {
        setPlayingId(prev => prev === sound.id ? null : prev);
      }, 2000);

    } catch (e: any) {
      showToast("Synthesis failed: " + e.message, "error");
      setPlayingId(null);
    }
  };

  // Download Sound Logic (generates a perfect high-quality WAV PCM Blob client-side)
  const handleDownloadSound = async (sound: Sound) => {
    setIsDownloadingId(sound.id);
    stopCurrentAudio();

    try {
      const OfflineCtxClass = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OfflineCtxClass) {
        throw new Error("Offline audio rendering unsupported.");
      }

      const sampleRate = 44100;
      const durationSeconds = 2.5; // Envelope safety length
      const renderCtx = new OfflineCtxClass(2, sampleRate * durationSeconds, sampleRate);

      const mainGain = renderCtx.createGain();
      mainGain.gain.setValueAtTime(1.0, 0);
      mainGain.connect(renderCtx.destination);

      synthesizeSoundNode(renderCtx, sound.synthType, mainGain, sound.seed);

      const renderedBuffer = await renderCtx.startRendering();
      const wavBlob = bufferToWav(renderedBuffer);

      // Trigger standard browser download
      const downloadUrl = URL.createObjectURL(wavBlob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${sound.id}_sa_studio_soundboard.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(downloadUrl);

      showToast(`Exported "${sound.name}" as HQ 16-bit WAV successfully!`, "success");
    } catch (err: any) {
      console.error(err);
      showToast("Could not render download file: " + err.message, "error");
    } finally {
      setIsDownloadingId(null);
    }
  };

  // WAV file formatter (16-bit signed stereo PCM)
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArr = new ArrayBuffer(length);
    const view = new DataView(bufferArr);
    const channels = [];
    let i;
    let sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
      view.setUint16(pos, data, true);
      pos += 2;
    };

    const setUint32 = (data: number) => {
      view.setUint32(pos, data, true);
      pos += 4;
    };

    // Write WAV RIFF container headers
    setUint32(0x46464952);                         // "RIFF"
    setUint32(length - 8);                         // file length - 8
    setUint32(0x45564157);                         // "WAVE"
    setUint32(0x20746d66);                         // "fmt " chunk
    setUint32(16);                                 // chunk length
    setUint16(1);                                  // sample format (1 = raw PCM)
    setUint16(numOfChan);                          // channel count
    setUint32(buffer.sampleRate);                  // sample rate
    setUint32(buffer.sampleRate * numOfChan * 2);  // byte rate
    setUint16(numOfChan * 2);                      // block align
    setUint16(16);                                 // bits per sample
    setUint32(0x61746164);                         // "data" chunk header
    setUint32(length - pos - 4);                   // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
      for (i = 0; i < numOfChan; i++) {             // Interleave channels
        sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp clip
        sample = (sample < 0 ? sample * 0x8000 : sample * 0x7FFF); // Scale to 16-bit
        view.setInt16(pos, sample, true);          // Write signed integer
        pos += 2;
      }
      offset++;
    }

    return new Blob([bufferArr], { type: "audio/wav" });
  };

  // Filter sounds
  const filteredSounds = MEME_SOUNDS.filter((sound) => {
    const matchesSearch = sound.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sound.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = activeCategory === "all" || sound.category === activeCategory;
    return matchesSearch && matchesCategory;
  });

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCurrentAudio();
    };
  }, []);

  return (
    <div id="soundboard-container" className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl transition-all">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-800 pb-5 mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-500/10 p-2.5 rounded-xl border border-purple-500/20 text-purple-400">
            <Music className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              Meme & Video Soundboard Library
              <span className="text-[10px] bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-bold">PRO TOOLS</span>
            </h2>
            <p className="text-xs text-slate-400">Classic high-fidelity editing assets, instant previews, and custom WAV exporters</p>
          </div>
        </div>

        {/* Master Volume Indicator */}
        <div className="flex items-center gap-2.5 bg-slate-950 px-4 py-2 rounded-xl border border-slate-850 self-stretch md:self-auto">
          <Volume2 className="w-4 h-4 text-slate-400" />
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider min-w-[50px]">Preview Vol</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-24 sm:w-32 h-1 bg-slate-800 accent-purple-500 rounded-lg cursor-pointer"
          />
          <span className="text-xs font-mono text-purple-400 w-8 text-right font-bold">{(volume * 100).toFixed(0)}%</span>
        </div>
      </div>

      {/* Floating alert toasts inside section */}
      {toast && (
        <div className={`mb-4 flex items-center gap-2.5 p-3.5 rounded-xl text-xs font-bold border transition-all ${
          toast.type === "success" 
            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" 
            : toast.type === "error"
              ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
              : "bg-blue-500/10 border-blue-500/20 text-blue-400"
        }`}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Search and Category Filters */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Custom styled search bar */}
          <div className="md:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search editing meme sounds instantly by name or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-850 hover:border-slate-800 text-slate-200 text-xs p-3.5 pl-10 rounded-xl focus:border-purple-500 focus:outline-none transition-all placeholder-slate-500 font-sans"
            />
          </div>

          {/* Quick filter status indicator */}
          <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
              <Filter className="w-3.5 h-3.5 text-purple-400" /> Filter View
            </span>
            <span className="font-mono text-purple-400 font-bold bg-purple-500/10 px-2.5 py-0.5 rounded border border-purple-500/10">
              {filteredSounds.length} sounds
            </span>
          </div>

        </div>

        {/* Category filters */}
        <div className="flex bg-slate-950 p-1 border border-slate-850 rounded-xl gap-1 overflow-x-auto">
          {(["all", "memes", "anime", "gaming", "cinematic", "transitions"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`flex-1 text-center py-2 px-4 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap min-w-[85px] ${
                activeCategory === cat 
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-950/20" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Sound effects cards */}
      {filteredSounds.length > 0 ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSounds.slice(0, visibleCount).map((sound) => {
              const isPlaying = playingId === sound.id;
              return (
                <div
                  key={sound.id}
                  className={`bg-slate-950 border rounded-xl p-4 flex flex-col justify-between transition-all relative overflow-hidden group ${
                    isPlaying 
                      ? "border-purple-500 bg-purple-500/[0.02]" 
                      : "border-slate-850 hover:border-slate-800"
                  }`}
                >
                  {/* Active audio background waves */}
                  {isPlaying && (
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-gradient-to-r from-purple-500 via-indigo-500 to-purple-500 animate-pulse" />
                  )}

                  <div className="space-y-2 relative z-10">
                    <div className="flex items-start justify-between">
                      <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wider border ${
                        sound.category === "memes" ? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                        sound.category === "anime" ? "bg-rose-500/10 text-rose-400 border-rose-500/20" :
                        sound.category === "gaming" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" :
                        sound.category === "cinematic" ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                        "bg-purple-500/10 text-purple-400 border-purple-500/20"
                      }`}>
                        {sound.category}
                      </span>

                      {/* Small dynamic animated sound bars */}
                      {isPlaying && (
                        <div className="flex items-end gap-0.5 h-3.5">
                          <span className="w-0.5 bg-purple-400 rounded animate-bar1" />
                          <span className="w-0.5 bg-purple-400 rounded animate-bar2" />
                          <span className="w-0.5 bg-purple-400 rounded animate-bar3" />
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-250 truncate group-hover:text-purple-400 transition-all">{sound.name}</h3>
                      <p className="text-[11px] text-slate-500 leading-normal mt-1 line-clamp-2 h-[34px]">{sound.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-900 relative z-10">
                    {/* Play preview toggle */}
                    <button
                      onClick={() => isPlaying ? stopCurrentAudio() : handlePlaySound(sound)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isPlaying 
                          ? "bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/20" 
                          : "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-950/20"
                      }`}
                    >
                      {isPlaying ? (
                        <>
                          <Square className="w-3 h-3 fill-current" />
                          <span>Stop</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3 fill-current" />
                          <span>Play Preview</span>
                        </>
                      )}
                    </button>

                    {/* HQ Download wav */}
                    <button
                      onClick={() => handleDownloadSound(sound)}
                      disabled={isDownloadingId === sound.id}
                      className="bg-slate-900 hover:bg-purple-500/15 text-slate-400 hover:text-purple-400 p-2.5 rounded-lg border border-slate-800 hover:border-purple-500/20 transition-all cursor-pointer disabled:bg-slate-950 disabled:text-slate-650"
                      title="Download high fidelity sound effect clip"
                    >
                      {isDownloadingId === sound.id ? (
                        <span className="block w-4.5 h-4.5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Load More Pagination Trigger */}
          {filteredSounds.length > visibleCount && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => setVisibleCount((prev) => prev + 60)}
                className="flex items-center gap-2 bg-slate-950 hover:bg-slate-900 border border-slate-850 hover:border-slate-800 text-slate-300 hover:text-white px-6 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-purple-950/5"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
                <span>Load More Sounds ({filteredSounds.length - visibleCount} remaining)</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="border border-dashed border-slate-800 rounded-xl p-12 text-center max-w-sm mx-auto">
          <Music className="w-10 h-10 text-slate-600 mb-2 mx-auto" />
          <p className="text-xs text-slate-350 font-bold">No Matching SFX Found</p>
          <p className="text-[10px] text-slate-500 mt-1">Try adjusting your filters or typing a different keyword in the search bar.</p>
        </div>
      )}

      {/* Styled css animations in component for premium audio wave bars */}
      <style>{`
        @keyframes barGrowth {
          0%, 100% { height: 4px; }
          50% { height: 14px; }
        }
        .animate-bar1 { animation: barGrowth 0.8s ease-in-out infinite; }
        .animate-bar2 { animation: barGrowth 0.5s ease-in-out infinite 0.15s; }
        .animate-bar3 { animation: barGrowth 0.7s ease-in-out infinite 0.3s; }
      `}</style>
    </div>
  );
}
