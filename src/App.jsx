import React, { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import {
  ArrowDownToLine,
  AudioLines,
  Check,
  ChevronDown,
  Clapperboard,
  Copy,
  Download,
  ExternalLink,
  FileAudio2,
  FileImage,
  FileVideo2,
  Film,
  FolderPlus,
  ImagePlus,
  LoaderCircle,
  MessageSquareText,
  Mic2,
  MonitorPlay,
  Music2,
  Plus,
  Search,
  Trash2,
  UserRound,
  WandSparkles,
} from "lucide-react";
import PromoComposition from "./remotion/compositions/Promo.jsx";
import { deleteAsset, getAssets, saveAsset } from "./lib/storage.js";
import { useAuth } from "./components/AuthGate.jsx";
import { supabase } from "./lib/supabase.js";

const STORAGE_KEY = "framefolk-project-v1";

const DEFAULT_PROJECT = {
  characterName: "Nara",
  characterDescription: "Teman cerita yang selalu punya sudut pandang berbeda.",
  characterTraits: "Ceria, observan, sedikit usil",
  characterVoice: "Hangat dan santai, tempo sedang, artikulasi jelas.",
  brief: "Bikin video pendek yang ngenalin karakter dan hal yang dia suka.",
  creationMode: "idea",
  generatedPromptKey: "",
  generatedScript: "",
  contentPreferences: {
    writingStyle: "conversational",
    energy: "balanced",
    humor: "light",
    avoidPhrases: "",
  },
  goal: "storytelling",
  audience: "",
  platform: "instagram-reels",
  visualStyle: "playful-editorial",
  callToAction: "",
  narration: "",
  scenes: [],
  characterAssetId: "",
  referenceAssetId: "",
  referenceVideoUrl: "",
  title: "Cerita yang terasa dekat.",
  subtitle: "Satu karakter. Banyak cerita. Tetap terasa seperti dirinya.",
  format: "portrait",
  durationSeconds: 15,
  accent: "#c1f17b",
  backgroundId: "",
  audioId: "",
  audioVolume: 70,
  voiceVolume: 100,
  sfxVolume: 22,
  voiceDelivery: "natural",
  audioNarration: "",
  audioAlignment: [],
  ttsVoiceId: "",
};

const STORY_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
const IMAGE_GENERATION_REFERENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const CLOUD_ASSET_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "video/mp4", "video/webm", "video/quicktime", "video/x-matroska",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/m4a", "audio/x-m4a",
  "audio/ogg", "audio/aac", "audio/flac", "audio/x-flac",
]);
const MAX_VIDEO_REFERENCE_BYTES = 150 * 1024 * 1024;
const MAX_SPEECH_CHARACTERS = 800;
const MAX_STYLE_REFERENCE_IMAGES = 3;
const isPremadeVoice = (voice) =>
  typeof voice.category === "string" && voice.category.toLowerCase() === "premade";
const countCharacters = (text) => Array.from(text.trim()).length;
const sceneNeedsVoice = (scene) =>
  !scene.voiceAssetId || (scene.voiceText && scene.voiceText !== scene.narration);
const SCENE_MOTION_STYLES = ["kinetic-type", "orbit", "depth", "burst", "diagram", "fluid"];
const SCENE_MOTION_LABELS = {
  "kinetic-type": "Kinetic type",
  orbit: "Orbit",
  depth: "Pseudo-3D depth",
  burst: "Burst",
  diagram: "Diagram",
  fluid: "Fluid",
};
const SCENE_MOTION_DIRECTIONS = ["left", "right", "up", "down", "center"];
const SCENE_MOTION_TEMPOS = ["deliberate", "steady", "rapid"];
const SCENE_MOTION_ENTRANCES = ["slam", "wipe", "orbit", "unfold", "rise"];
const SCENE_MOTION_ENTRANCE_LABELS = {
  slam: "Impact",
  wipe: "Sweep",
  orbit: "Orbit",
  unfold: "Unfold",
  rise: "Rise",
};
const QUICK_REVISIONS = [
  { label: "Lebih lucu", instruction: "Bikin lebih lucu dan lincah, tetap natural dan konsisten dengan karakter." },
  { label: "Lebih emosional", instruction: "Bikin lebih emosional dan menyentuh, tanpa jadi berlebihan." },
  { label: "Persingkat", instruction: "Persingkat narasi dan teks layar agar lebih padat serta mudah dipahami." },
];
const STARTER_TEMPLATES = [
  {
    id: "umkm",
    title: "Produk UMKM",
    description: "Kenalkan produk dengan hook, manfaat, dan CTA yang jelas.",
    brief: "Buat video promosi singkat untuk produk UMKM. Buka dengan masalah yang relatable, tunjukkan keunikan dan manfaat produk, tutup dengan ajakan yang terasa natural.",
    goal: "promotion",
    audience: "Orang Indonesia yang mencari produk lokal berkualitas",
    platform: "instagram-reels",
    visualStyle: "playful-editorial",
    callToAction: "Cek produknya sekarang",
    durationSeconds: 20,
  },
  {
    id: "edukasi",
    title: "Tips edukasi",
    description: "Satu insight praktis, ringkas, dan gampang dibagikan.",
    brief: "Buat video edukasi dengan satu tips yang benar-benar berguna. Mulai dari pertanyaan atau miskonsepsi, jelaskan langkah praktis, lalu tutup dengan rangkuman singkat.",
    goal: "education",
    audience: "Pemula yang ingin belajar lewat video singkat",
    platform: "youtube-shorts",
    visualStyle: "minimal",
    callToAction: "Simpan tips ini buat nanti",
    durationSeconds: 30,
  },
  {
    id: "cerita",
    title: "Cerita karakter",
    description: "Cerita pendek yang bikin karakter terasa dekat.",
    brief: "Buat cerita ringan tentang keseharian karakter. Mulai dengan momen yang bikin penasaran, beri satu kejutan kecil, lalu akhiri dengan punchline atau rasa hangat.",
    goal: "storytelling",
    audience: "Penonton yang suka cerita pendek dan karakter yang relatable",
    platform: "tiktok",
    visualStyle: "playful-editorial",
    callToAction: "",
    durationSeconds: 20,
  },
  {
    id: "personal-brand",
    title: "Kenalan kreator",
    description: "Perkenalkan siapa lo dan alasan orang perlu follow.",
    brief: "Buat video perkenalan personal brand yang terasa jujur, bukan seperti CV. Ceritakan siapa kreatornya, hal yang sering dibahas, dan alasan penonton akan terbantu.",
    goal: "personal-brand",
    audience: "Orang yang belum kenal kreator ini",
    platform: "instagram-reels",
    visualStyle: "warm-documentary",
    callToAction: "Follow untuk cerita dan tips berikutnya",
    durationSeconds: 25,
  },
];

const countWords = (text) => text.trim().split(/\s+/).filter(Boolean).length;
const getMotionText = (text) => {
  const phrase = (text || "").trim().split(/\s+/).slice(0, 3).join(" ");
  return phrase.length > 48 ? `${phrase.slice(0, 45).trimEnd()}...` : phrase;
};
const estimateSpeechDuration = (text) => Math.max(0.5, (countWords(text) * 60) / 155);
const sceneActiveDuration = (scene) =>
  Math.max(
    Number(scene.durationSeconds) || estimateSpeechDuration(scene.narration || ""),
    Number(scene.voiceDurationSeconds) || 0,
  );
const scenePause = (scene) => Math.max(0, Number(scene.pauseAfterSeconds) || 0);
const getTimelineDuration = (scenes) =>
  scenes.reduce((total, scene) => total + sceneActiveDuration(scene) + scenePause(scene), 0);
const distributeSceneDurations = (scenes, totalSeconds) => {
  if (scenes.length === 0) return scenes;
  const pauseDuration = scenes.reduce((total, scene) => total + scenePause(scene), 0);
  const activeDuration = Math.max(scenes.length * 0.5, totalSeconds - pauseDuration);
  const weights = scenes.map((scene) => Math.max(1, countWords(scene.narration || "")));
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  let assignedDuration = 0;
  return scenes.map((scene, index) => {
    const durationSeconds = index === scenes.length - 1
      ? activeDuration - assignedDuration
      : Math.max(0.5, Math.round((activeDuration * weights[index] / totalWeight) * 10) / 10);
    assignedDuration += durationSeconds;
    return { ...scene, durationSeconds: Math.round(durationSeconds * 10) / 10 };
  });
};

const createScenesFromScript = (script) => {
  const paragraphs = script.trim().replace(/[ \t]+/g, " ").split(/\n+/).filter(Boolean);
  const beats = paragraphs.flatMap((paragraph) => {
    const sentences = paragraph.match(/[^.!?…。！？]+[.!?…。！？]+|[^.!?…。！？]+$/gu) ?? [paragraph];
    return sentences.flatMap((sentence) => {
      const words = sentence.trim().split(/\s+/);
      if (words.length <= 28) return [sentence.trim()];
      const chunks = [];
      for (let index = 0; index < words.length; index += 22) {
        chunks.push(words.slice(index, index + 22).join(" "));
      }
      return chunks;
    });
  });
  const beatsPerScene = Math.max(1, Math.ceil(beats.length / 6));
  const groups = [];
  for (let index = 0; index < beats.length; index += beatsPerScene) {
    groups.push(beats.slice(index, index + beatsPerScene).join(" "));
  }
  const layouts = ["hero", "split", "quote", "poster", "sticker", "cinematic"];
  const motions = ["rise", "drift", "zoom", "reveal", "pop", "rise"];
  return groups.map((narration, index) => {
    const onScreenText = narration.split(/\s+/).slice(0, 7).join(" ");
    return {
      id: crypto.randomUUID(),
      label: `Beat ${String(index + 1).padStart(2, "0")}`,
      narration,
      onScreenText: onScreenText.length > 68 ? `${onScreenText.slice(0, 65).trimEnd()}…` : onScreenText,
      visualDescription: "Pilih aset visual dan layout yang paling sesuai dengan bagian naskah ini.",
      visualType: layouts[index % layouts.length],
      motionPreset: motions[index % motions.length],
      motionStyle: SCENE_MOTION_STYLES[index % SCENE_MOTION_STYLES.length],
      motionIntensity: 2,
      motionText: getMotionText(onScreenText),
      motionEmphasis: onScreenText.split(/\s+/)[0] || "Fokus",
      motionDirection: SCENE_MOTION_DIRECTIONS[index % SCENE_MOTION_DIRECTIONS.length],
      motionTempo: "steady",
      motionEntrance: SCENE_MOTION_ENTRANCES[index % SCENE_MOTION_ENTRANCES.length],
      durationSeconds: estimateSpeechDuration(narration),
      pauseAfterSeconds: index < groups.length - 1 ? 0.3 : 0,
      voiceAssetId: "",
      voiceDurationSeconds: 0,
      voiceText: "",
      voiceAlignment: [],
      visualAssetId: "",
    };
  });
};

const getAudioDuration = (blob) => new Promise((resolve, reject) => {
  const source = URL.createObjectURL(blob);
  const audio = new Audio();
  const cleanup = () => {
    URL.revokeObjectURL(source);
    audio.removeAttribute("src");
    audio.load();
  };
  const timeout = window.setTimeout(() => {
    cleanup();
    reject(new Error("Durasi file voice-over tidak bisa dibaca oleh browser."));
  }, 15000);
  audio.preload = "metadata";
  audio.onloadedmetadata = () => {
    window.clearTimeout(timeout);
    const duration = audio.duration;
    cleanup();
    if (!Number.isFinite(duration) || duration <= 0) {
      reject(new Error("File voice-over memiliki durasi yang tidak valid."));
      return;
    }
    resolve(duration);
  };
  audio.onerror = () => {
    window.clearTimeout(timeout);
    cleanup();
    reject(new Error("File voice-over tidak bisa dibaca untuk mengukur durasi."));
  };
  audio.src = source;
});

const formatBytes = (bytes) => {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  if (minutes === 0) return `${seconds} detik`;
  if (remainder === 0) return `${minutes} menit`;
  return `${minutes} m ${remainder} dtk`;
};

const blobToBase64 = async (blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

const waitForVideoEvent = (video, eventName) => new Promise((resolve, reject) => {
  const cleanup = () => {
    window.clearTimeout(timeout);
    video.removeEventListener(eventName, handleReady);
    video.removeEventListener("error", handleError);
  };
  const timeout = window.setTimeout(() => {
    cleanup();
    reject(new Error("Video referensi terlalu lama dibuka. Coba upload file lokal atau screenshot."));
  }, 20000);
  const handleReady = () => {
    cleanup();
    resolve();
  };
  const handleError = () => {
    cleanup();
    reject(new Error("Video referensi tidak bisa dibuka. Pastikan formatnya MP4/WebM dan link dapat diakses."));
  };
  video.addEventListener(eventName, handleReady, { once: true });
  video.addEventListener("error", handleError, { once: true });
});

const canvasToReferenceImage = async (canvas) => {
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (image) => image ? resolve(image) : reject(new Error("Frame referensi gagal diproses.")),
      "image/jpeg",
      0.68,
    );
  });
  return { mediaType: "image/jpeg", data: await blobToBase64(blob) };
};

const imageBlobToReference = async (blob) => {
  let bitmap;
  try {
    bitmap = await createImageBitmap(blob);
  } catch {
    throw new Error("Gambar referensi tidak bisa dibaca. Coba upload JPG, PNG, atau WebP.");
  }
  const scale = Math.min(1, 640 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) {
    bitmap.close();
    throw new Error("Browser tidak bisa memproses gambar referensi.");
  }
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvasToReferenceImage(canvas);
};

const extractVideoReferenceFrames = async (source, maxFrames = MAX_STYLE_REFERENCE_IMAGES) => {
  const isBlob = source instanceof Blob;
  const objectUrl = isBlob ? URL.createObjectURL(source) : null;
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.preload = "auto";
  video.muted = true;
  video.playsInline = true;
  const metadataLoaded = waitForVideoEvent(video, "loadedmetadata");
  video.src = objectUrl || source;
  video.load();

  try {
    await metadataLoaded;
    if (!Number.isFinite(video.duration) || video.duration <= 0 || video.duration > 300) {
      throw new Error("Referensi video harus berdurasi maksimal 5 menit.");
    }
    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Video referensi tidak memiliki ukuran frame yang valid.");
    }
    const scale = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Browser tidak bisa memproses frame video referensi.");

    const sampleRatios = video.duration < 1
      ? [0.5]
      : maxFrames >= 3 ? [0.12, 0.5, 0.88] : maxFrames === 2 ? [0.25, 0.75] : [0.5];
    const references = [];
    for (const ratio of sampleRatios.slice(0, maxFrames)) {
      const targetTime = Math.max(0.01, Math.min(video.duration - 0.01, video.duration * ratio));
      const seeked = waitForVideoEvent(video, "seeked");
      video.currentTime = targetTime;
      await seeked;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      references.push(await canvasToReferenceImage(canvas));
    }
    return references;
  } catch (referenceError) {
    if (referenceError?.name === "SecurityError") {
      throw new Error("Browser tidak diizinkan membaca link video ini. Upload file videonya atau pilih screenshot.");
    }
    throw referenceError;
  } finally {
    video.pause();
    video.removeAttribute("src");
    video.load();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
};

const isSocialVideoPage = (url) => {
  const host = new URL(url).hostname.toLowerCase();
  return ["youtube.com", "youtu.be", "tiktok.com", "instagram.com", "facebook.com"].some(
    (domain) => host === domain || host.endsWith(`.${domain}`),
  );
};

const getAssetIcon = (type) => {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo2;
  return FileAudio2;
};

const App = () => {
  const { user, plan, signOut } = useAuth();
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [assets, setAssets] = useState([]);
  const [assetUrls, setAssetUrls] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [loadedUserId, setLoadedUserId] = useState(null);
  const [syncStatus, setSyncStatus] = useState("syncing");
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const [importingLegacy, setImportingLegacy] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [renderJob, setRenderJob] = useState(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [generatingMotion, setGeneratingMotion] = useState(false);
  const [generatingImages, setGeneratingImages] = useState(false);
  const [generatingCompleteVideo, setGeneratingCompleteVideo] = useState(false);
  const [completeVideoStage, setCompleteVideoStage] = useState("");
  const [imageProgress, setImageProgress] = useState(null);
  const [stockSearch, setStockSearch] = useState({ sceneId: "", query: "", photos: [] });
  const [searchingStock, setSearchingStock] = useState(false);
  const [importingStockId, setImportingStockId] = useState(null);
  const [revisingStory, setRevisingStory] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState("all");
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [generatingSpeech, setGeneratingSpeech] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(null);
  const [voices, setVoices] = useState([]);
  const [elevenLabsUsage, setElevenLabsUsage] = useState(null);
  const [aiStatus, setAiStatus] = useState(null);

  const saveAssetToAccount = async (asset) => {
    if (!supabase || !user?.id) throw new Error("Akun belum siap untuk menyimpan aset.");
    if (asset.blob.size > 157286400) throw new Error("Ukuran aset melebihi batas 150 MB.");
    if (!CLOUD_ASSET_TYPES.has(asset.type)) {
      throw new Error(`Format aset ${asset.type || "tidak dikenali"} belum didukung untuk cloud.`);
    }
    const storagePath = `${user.id}/${asset.id}`;
    const { error: uploadError } = await supabase.storage
      .from("framefolk-assets")
      .upload(storagePath, asset.blob, {
        contentType: asset.type || "application/octet-stream",
        upsert: true,
      });
    if (uploadError) throw uploadError;
    const { error: metadataError } = await supabase.from("user_assets").upsert({
      id: asset.id,
      user_id: user.id,
      storage_path: storagePath,
      name: asset.name.slice(0, 300),
      content_type: asset.type || "application/octet-stream",
      byte_size: asset.blob.size,
      metadata: {
        addedAt: asset.addedAt,
        generatedBy: asset.generatedBy,
        sceneId: asset.sceneId,
        source: asset.source,
      },
    }, { onConflict: "id" });
    if (metadataError) {
      const { error: cleanupError } = await supabase.storage.from("framefolk-assets").remove([storagePath]);
      if (cleanupError) console.error("Could not clean up an unregistered uploaded asset.", cleanupError);
      throw metadataError;
    }
    await saveAsset(asset, user.id);
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoaded(false);
      setLoadedUserId(null);
      setSyncStatus("syncing");
      setLegacyAvailable(false);
      try {
        if (!supabase || !user?.id) {
          throw new Error("Akun belum siap untuk memuat project.");
        }
        const userId = user.id;
        const projectKey = `${STORAGE_KEY}:${userId}`;
        const [{ data: remoteProject, error: projectError }, { data: remoteAssets, error: assetsError }] =
          await Promise.all([
            supabase.from("user_projects").select("project").eq("user_id", userId).maybeSingle(),
            supabase.from("user_assets").select("id,storage_path,name,content_type,byte_size,metadata,created_at").eq("user_id", userId),
          ]);
        if (projectError) throw projectError;
        if (assetsError) throw assetsError;

        const cachedAssets = await getAssets(userId);
        const cachedById = new Map(cachedAssets.map((asset) => [asset.id, asset]));
        const restoredAssets = await Promise.all((remoteAssets ?? []).map(async (record) => {
          const cachedAsset = cachedById.get(record.id);
          if (cachedAsset?.blob?.size === record.byte_size) return cachedAsset;
          const { data: blob, error: downloadError } = await supabase.storage
            .from("framefolk-assets")
            .download(record.storage_path);
          if (downloadError) throw downloadError;
          const asset = {
            id: record.id,
            name: record.name,
            type: record.content_type,
            size: record.byte_size,
            blob,
            addedAt: Number(record.metadata?.addedAt) || new Date(record.created_at).getTime(),
            ...(record.metadata?.generatedBy ? { generatedBy: record.metadata.generatedBy } : {}),
            ...(record.metadata?.sceneId ? { sceneId: record.metadata.sceneId } : {}),
            ...(record.metadata?.source ? { source: record.metadata.source } : {}),
          };
          await saveAsset(asset, userId);
          return asset;
        }));
        if (!active) return;
        const savedProject = remoteProject?.project
          ? JSON.stringify(remoteProject.project)
          : localStorage.getItem(projectKey);
        let legacyProjectAvailable = false;
        if (savedProject) {
          const restoredProject = { ...DEFAULT_PROJECT, ...JSON.parse(savedProject) };
          if (restoredProject.scenes.length > 0) {
            const needsTimingMigration = restoredProject.scenes.some(
              (scene) => !Number.isFinite(scene.durationSeconds),
            );
            restoredProject.scenes = restoredProject.scenes.map((scene, index, scenes) => ({
                ...scene,
                pauseAfterSeconds: Number.isFinite(scene.pauseAfterSeconds)
                  ? scene.pauseAfterSeconds
                  : index < scenes.length - 1 ? 0.35 : 0,
              }));
            if (needsTimingMigration) {
              restoredProject.scenes = distributeSceneDurations(
                restoredProject.scenes,
                Number(restoredProject.durationSeconds) || 15,
              );
            }
            restoredProject.durationSeconds = Math.ceil(getTimelineDuration(restoredProject.scenes));
          }
          setProject(restoredProject);
          if (!remoteProject) {
            const { error: saveError } = await supabase.from("user_projects").upsert({
              user_id: userId,
              project: restoredProject,
              updated_at: new Date().toISOString(),
            });
            if (saveError) throw saveError;
          }
        } else {
          const legacyAssets = await getAssets();
          legacyProjectAvailable = Boolean(localStorage.getItem(STORAGE_KEY) || legacyAssets.length);
          setProject(DEFAULT_PROJECT);
          if (!legacyProjectAvailable) {
            const { error: saveError } = await supabase.from("user_projects").upsert({
              user_id: userId,
              project: DEFAULT_PROJECT,
              updated_at: new Date().toISOString(),
            });
            if (saveError) throw saveError;
          }
        }
        setAssets(restoredAssets);
        setLegacyAvailable(legacyProjectAvailable);
        setLoadedUserId(userId);
        setSyncStatus(legacyProjectAvailable ? "pending" : "synced");
      } catch (loadError) {
        console.error("Could not load the saved Framefolk project.", loadError);
        if (active) {
          setError("Project cloud atau library aset tidak bisa dimuat. Coba refresh; tidak ada perubahan yang ditimpa.");
          setSyncStatus("error");
        }
      } finally {
        if (active) setLoaded(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.id]);

  useEffect(() => {
    if (!loaded || legacyAvailable || loadedUserId !== user?.id || !supabase) return undefined;
    const userId = user.id;
    const projectKey = `${STORAGE_KEY}:${userId}`;
    setSyncStatus("syncing");
    try {
      localStorage.setItem(projectKey, JSON.stringify(project));
    } catch (saveError) {
      console.error("Could not save the Framefolk project.", saveError);
      setError("Cache project lokal penuh atau tidak tersedia.");
      setSyncStatus("error");
      return undefined;
    }
    const timeout = window.setTimeout(async () => {
      try {
        const { error: saveError } = await supabase.from("user_projects").upsert({
          user_id: userId,
          project,
          updated_at: new Date().toISOString(),
        });
        if (saveError) throw saveError;
        setSyncStatus("synced");
      } catch (saveError) {
        console.error("Could not sync the Framefolk project.", saveError);
        setError("Project tersimpan di perangkat ini, tetapi belum tersinkron ke cloud. Periksa koneksi lalu refresh.");
        setSyncStatus("error");
      }
    }, 700);
    return () => window.clearTimeout(timeout);
  }, [loaded, legacyAvailable, loadedUserId, project, user?.id]);

  useEffect(() => {
    if (!loaded) return;
    try {
      setOnboardingDismissed(localStorage.getItem("framefolk-onboarding-dismissed-v1") === "true");
    } catch (storageError) {
      console.error("Could not read the onboarding preference.", storageError);
    }
  }, [loaded]);

  useEffect(() => {
    const urls = Object.fromEntries(assets.map((asset) => [asset.id, URL.createObjectURL(asset.blob)]));
    setAssetUrls(urls);
    return () => Object.values(urls).forEach((url) => URL.revokeObjectURL(url));
  }, [assets]);

  useEffect(() => {
    if (!notice) return undefined;
    const timeout = window.setTimeout(() => setNotice(""), 3000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    let active = true;
    fetch("/api/ai/status")
      .then(async (response) => {
        const status = await response.json();
        if (!response.ok) throw new Error(status.error || "Status AI tidak bisa dibaca.");
        if (active) setAiStatus(status);
      })
      .catch((statusError) => {
        console.error("Could not check the local AI setup.", statusError);
        if (active) setAiStatus({ unavailable: true });
      });
    return () => {
      active = false;
    };
  }, []);

  const updateProject = (key, value) => {
    if (generatingCompleteVideo) return;
    setProject((current) => ({
      ...current,
      [key]: value,
      ...(key === "narration" && current.audioNarration && current.audioNarration !== value
        ? { audioId: "", audioNarration: "", audioAlignment: [] }
        : {}),
    }));
  };

  const updateContentPreference = (key, value) => {
    if (generatingCompleteVideo) return;
    setProject((current) => ({
      ...current,
      contentPreferences: {
        ...DEFAULT_PROJECT.contentPreferences,
        ...current.contentPreferences,
        [key]: value,
      },
    }));
  };

  const applyStarterTemplate = (template) => {
    setProject((current) => ({
      ...current,
      brief: template.brief,
      goal: template.goal,
      audience: template.audience,
      platform: template.platform,
      visualStyle: template.visualStyle,
      callToAction: template.callToAction,
      durationSeconds: template.durationSeconds,
    }));
    setNotice(`Template "${template.title}" dipakai. Character bible dan aset lo tetap aman.`);
  };

  const dismissOnboarding = () => {
    try {
      localStorage.setItem("framefolk-onboarding-dismissed-v1", "true");
      setOnboardingDismissed(true);
    } catch (storageError) {
      console.error("Could not save the onboarding preference.", storageError);
      setError("Preferensi panduan belum tersimpan; coba lagi setelah refresh.");
    }
  };

  const reopenOnboarding = () => {
    try {
      localStorage.removeItem("framefolk-onboarding-dismissed-v1");
      setOnboardingDismissed(false);
    } catch (storageError) {
      console.error("Could not reopen the onboarding guide.", storageError);
      setError("Panduan belum bisa dibuka. Coba refresh studio.");
    }
  };

  const setupSteps = [
    { title: "Tinjau ide cerita contoh", complete: Boolean(project.brief.trim()) },
    { title: "Tinjau karakter contoh", complete: Boolean(project.characterName.trim() && project.characterDescription.trim()) },
    { title: "Generate draft pertama", complete: project.scenes.length > 0 },
    { title: "Preview dan ekspor MP4", complete: renderJob?.status === "completed" },
  ];
  const completedSetupSteps = setupSteps.filter((step) => step.complete).length;

  const backgroundAsset = assets.find((asset) => asset.id === project.backgroundId);
  const characterAsset = assets.find((asset) => asset.id === project.characterAssetId);
  const audioAsset = assets.find((asset) => asset.id === project.audioId);
  const selectedVoice = voices.find((voice) => voice.id === project.ttsVoiceId);
  const aiProviderLabel = aiStatus?.aiProvider === "anthropic" ? "Claude" : "Gemini";
  const storyGenerationKey = JSON.stringify({
    brief: project.brief,
    character: [
      project.characterName,
      project.characterDescription,
      project.characterTraits,
      project.characterVoice,
    ],
    goal: project.goal,
    audience: project.audience,
    platform: project.platform,
    visualStyle: project.visualStyle,
    callToAction: project.callToAction,
    format: project.format,
    durationSeconds: project.durationSeconds,
    preferences: { ...DEFAULT_PROJECT.contentPreferences, ...project.contentPreferences },
    referenceVideoUrl: project.referenceVideoUrl,
    referenceAssetId: project.referenceAssetId,
  });
  const speechCharacters = project.scenes.length > 0
    ? project.scenes.reduce((total, scene) => total + countCharacters(scene.narration), 0)
    : countCharacters(project.narration);
  const speechQuotaExceeded = elevenLabsUsage
    ? speechCharacters > elevenLabsUsage.remainingCharacters
    : false;
  const contentPreferences = {
    ...DEFAULT_PROJECT.contentPreferences,
    ...project.contentPreferences,
  };
  const width = project.format === "portrait" ? 1080 : 1920;
  const height = project.format === "portrait" ? 1920 : 1080;
  const sceneTimeline = useMemo(() => {
    let cursor = 0;
    return project.scenes.map((scene, index) => {
      const activeDuration = sceneActiveDuration(scene);
      const pauseAfter = scenePause(scene);
      const segment = { ...scene, index, startSeconds: cursor, endSeconds: cursor + activeDuration, activeDuration };
      cursor += activeDuration + pauseAfter;
      return segment;
    });
  }, [project.scenes]);
  const speechBudgetExceeded = speechCharacters > MAX_SPEECH_CHARACTERS;
  const timelineDurationSeconds = project.scenes.length
    ? Math.max(1, Math.ceil(getTimelineDuration(project.scenes)))
    : Number(project.durationSeconds);
  const durationInFrames = timelineDurationSeconds * 30;
  const preflightChecks = useMemo(() => {
    const checks = [];
    if (project.scenes.length === 0) {
      checks.push({ level: "warning", message: "Belum ada adegan hasil AI; preview memakai komposisi default." });
    } else {
      const emptyScene = project.scenes.findIndex(
        (scene) => !scene.onScreenText.trim() || !scene.visualDescription.trim(),
      );
      if (emptyScene >= 0) {
        checks.push({ level: "warning", message: `Adegan ${emptyScene + 1} belum punya teks layar atau arahan visual.` });
      }
      const longCopy = project.scenes.findIndex(
        (scene) => countWords(scene.onScreenText) > 10 || scene.onScreenText.length > 72,
      );
      if (longCopy >= 0) {
        checks.push({ level: "warning", message: `Teks di adegan ${longCopy + 1} cukup panjang dan mungkin sulit dibaca di layar kecil.` });
      }
      const emptyBeat = project.scenes.findIndex((scene) => !scene.narration.trim());
      if (emptyBeat >= 0) {
        checks.push({ level: "warning", message: `Adegan ${emptyBeat + 1} belum punya beat narasi untuk mengatur timing.` });
      }
    }

    const spokenWords = countWords(project.narration);
    const comfortableWords = Math.floor(timelineDurationSeconds * 2.8);
    if (spokenWords > comfortableWords && comfortableWords > 0) {
      checks.push({ level: "warning", message: `Naskah sekitar ${spokenWords} kata untuk ${timelineDurationSeconds} detik; suara bisa terlalu cepat. Coba Persingkat.` });
    }
    if (project.audioId && !audioAsset) {
      checks.push({ level: "error", message: "Audio terpilih tidak ditemukan di library; pilih ulang sebelum render." });
    }
    const missingVisual = project.scenes.findIndex(
      (scene) => scene.visualAssetId && !assets.some((asset) => asset.id === scene.visualAssetId),
    );
    if (missingVisual >= 0) {
      checks.push({ level: "error", message: `Aset visual adegan ${missingVisual + 1} tidak ditemukan di library; pilih ulang sebelum render.` });
    }
    if (!project.audioId && !project.scenes.some((scene) => scene.voiceAssetId)) {
      checks.push({ level: "info", message: "Voice-over dimatikan. Subtitle naskah tetap tampil; musik dan efek suara tetap opsional." });
    } else if (project.audioId && project.audioNarration && project.audioNarration !== project.narration) {
      checks.push({ level: "warning", message: "Naskah berubah setelah voice-over dibuat; generate ulang suara agar sinkron." });
    }
    const unassignedVoice = project.scenes.findIndex(
      (scene) => scene.voiceAssetId && !assets.some((asset) => asset.id === scene.voiceAssetId),
    );
    if (unassignedVoice >= 0) {
      checks.push({ level: "error", message: `Voice-over adegan ${unassignedVoice + 1} tidak ditemukan di library; generate ulang suaranya.` });
    }
    const staleVoice = project.scenes.findIndex(
      (scene) => scene.voiceAssetId && scene.voiceText && scene.voiceText !== scene.narration,
    );
    if (staleVoice >= 0) {
      checks.push({ level: "warning", message: `Naskah adegan ${staleVoice + 1} berubah setelah voice dibuat; generate ulang voice-over adegan itu.` });
    }
    if (!characterAsset) {
      checks.push({ level: "info", message: "Belum ada gambar karakter; gunakan upload untuk tampilan karakter yang konsisten." });
    }
    if (
      project.scenes.length > 0 &&
      !backgroundAsset &&
      !project.scenes.some((scene) => scene.visualAssetId)
    ) {
      checks.push({
        level: "info",
        message: "Belum ada visual adegan. Pilih “Buat video lengkap” untuk mencari stock otomatis atau pasang aset sendiri.",
      });
    }
    if (project.goal === "promotion" && !project.callToAction.trim()) {
      checks.push({ level: "warning", message: "Tujuan video promosi dipilih, tetapi ajakan/CTA masih kosong." });
    }
    return checks;
  }, [project, audioAsset, characterAsset, assets, timelineDurationSeconds]);
  const preflightErrors = preflightChecks.filter((check) => check.level === "error");
  const preflightWarnings = preflightChecks.filter((check) => check.level === "warning");

  const playerProps = useMemo(
    () => ({
      characterName: project.characterName,
      characterTraits: project.characterTraits,
      characterImageUrl: assetUrls[project.characterAssetId],
      title: project.title,
      subtitle: project.subtitle,
      accent: project.accent,
      visualStyle: project.visualStyle,
      backgroundUrl: assetUrls[project.backgroundId],
      backgroundType: backgroundAsset?.type.startsWith("video/") ? "video" : "image",
      audioUrl: assetUrls[project.audioId],
      audioNarration: project.audioNarration || "",
      audioVolume: Number(project.audioVolume) / 100,
      voiceVolume: Number(project.voiceVolume ?? 100) / 100,
      sfxVolume: Number(project.sfxVolume ?? 22) / 100,
      audioAlignment: project.audioAlignment || [],
      scenes: sceneTimeline.map((scene) => {
        const visualAsset = assets.find((asset) => asset.id === scene.visualAssetId);
        return {
          ...scene,
          voiceUrl: assetUrls[scene.voiceAssetId],
          visualAssetUrl: assetUrls[scene.visualAssetId],
          visualAssetType: visualAsset?.type,
          visualAttribution: visualAsset?.source?.provider === "pexels"
            ? `Photo by ${visualAsset.source.photographer} on Pexels`
            : "",
        };
      }),
    }),
    [project, assetUrls, assets, backgroundAsset, sceneTimeline],
  );

  const regenerateSceneSpeech = async (scene) => {
    if (generatingImages || generatingSpeech || generatingCompleteVideo) return;
    if (!scene.narration.trim()) {
      setError("Isi narasi adegan dulu sebelum generate voice-over.");
      return;
    }
    const totalCharacters = project.scenes.length > 0
      ? project.scenes.reduce((total, currentScene) => total + countCharacters(currentScene.narration), 0)
      : countCharacters(scene.narration);
    if (totalCharacters > MAX_SPEECH_CHARACTERS) {
      setError(`Voice-over video ini ${totalCharacters.toLocaleString("id-ID")} karakter; batas hematnya ${MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")}. Persingkat naskah sebelum membuat suara.`);
      return;
    }
    setGeneratingSpeech(true);
    setError("");
    setNotice("");
    try {
      const voiceId = await ensureVoiceId();
      await ensureElevenLabsQuota([scene.narration]);
      await createSpeechAsset(scene.narration, voiceId, scene.id);
      const usage = await refreshElevenLabsUsageAfterSpeech();
      setNotice(usage
        ? `Voice-over adegan "${scene.label}" selesai dan tersinkron.`
        : "Voice-over selesai, tapi sisa kuota belum berhasil diperbarui. Cek ulang sebelum generate lagi.");
    } catch (speechError) {
      console.error("Could not regenerate voice-over for the scene.", speechError);
      setError(speechError.message || "Voice-over adegan gagal dibuat.");
    } finally {
      setGeneratingSpeech(false);
    }
  };

  const generatedPrompt = useMemo(() => {
    const backgroundDescription = backgroundAsset
      ? `${backgroundAsset.name} (${backgroundAsset.type}, ${formatBytes(backgroundAsset.size)})`
      : "Belum dipilih; usulkan visual yang sesuai.";
    const characterReference = characterAsset
      ? `${characterAsset.name} (${characterAsset.type}, ${formatBytes(characterAsset.size)})`
      : "Belum dipilih.";
    const audioDescription = audioAsset
      ? `${audioAsset.name} (${audioAsset.type}); volume preview ${project.audioVolume}%.`
      : `Belum ada audio. Catatan suara/voice: ${project.characterVoice}`;
    return `Bantu kembangkan video Remotion dalam JavaScript untuk project ini. Buat karakter dan identitas visual tetap konsisten dengan character bible; jangan mengubah kepribadian atau gaya bicara tanpa instruksi. Hasilnya harus berupa composition Remotion yang bisa dipreview dan diedit lewat props (judul, teks, warna, durasi, aset, audio), bukan hard-code nilai project.

CHARACTER BIBLE
- Nama: ${project.characterName}
- Deskripsi: ${project.characterDescription}
- Sifat utama: ${project.characterTraits}
- Panduan suara: ${project.characterVoice}
- Gambar referensi karakter: ${characterReference}

VIDEO
- Format: ${project.format === "portrait" ? "vertikal 9:16" : "horizontal 16:9"}
- Durasi target: ${project.durationSeconds} detik
- Judul: ${project.title}
- Teks pendamping: ${project.subtitle}
- Warna aksen: ${project.accent}
- Background/reference terpilih: ${backgroundDescription}
- Audio: ${audioDescription}

INSTRUKSI
- Gunakan React JavaScript dan Remotion; pertahankan setup project yang sudah ada.
- Buat visual yang punya karakter, terasa konsisten, dan punya gerak yang halus serta ritme yang jelas.
- File dari asset library di bawah ini disimpan di browser, tidak ikut terlampir di prompt. Kalau belum ada di project, minta file tersebut disalin ke public/assets/ dan jangan mengarang path aset.
- Isi prompt secara manual hanya diperlukan untuk eksperimen atau mengubah template composition. Ide cerita rutin bisa dibuat langsung dari studio.
- Sediakan defaultProps yang aman dan props yang bisa diubah tanpa menulis ulang animasi.
- Tunjukkan file yang perlu dibuat/diubah dan kode lengkapnya secara ringkas.`;
  }, [project, characterAsset, backgroundAsset, audioAsset]);

  const copyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(generatedPrompt);
      setPromptVisible(true);
      setNotice("Prompt disalin. Buka Gemini di tab lain dan paste prompt-nya.");
      setError("");
    } catch (copyError) {
      console.error("Could not copy the prompt to the clipboard.", copyError);
      setPromptVisible(true);
      setError("Clipboard tidak tersedia. Salin prompt dari kotak teks di bawah preview.");
    }
  };

  const openGemini = () => {
    window.open("https://gemini.google.com/app", "_blank", "noopener,noreferrer");
  };

  const addAssets = async (files, selectRole = "") => {
    const unsupported = files.filter((file) => !CLOUD_ASSET_TYPES.has(file.type));
    if (unsupported.length > 0) {
      setError(`Format tidak didukung untuk penyimpanan akun: ${unsupported.map((file) => file.name).join(", ")}.`);
    }
    const supported = files.filter((file) => !unsupported.includes(file));
    if (supported.length === 0) return;
    try {
      const newAssets = supported.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
        addedAt: Date.now(),
      }));
      await Promise.all(newAssets.map(saveAssetToAccount));
      setAssets((current) => [...newAssets, ...current]);
      const selectedAsset = newAssets.find((asset) =>
        selectRole === "audio"
          ? asset.type.startsWith("audio/")
          : selectRole === "reference"
            ? asset.type.startsWith("image/") || asset.type.startsWith("video/")
            : asset.type.startsWith("image/"),
      );
      if (selectedAsset && selectRole === "audio") {
        updateProject("audioId", selectedAsset.id);
        updateProject("audioNarration", "");
        updateProject("audioAlignment", []);
      }
      if (selectedAsset && selectRole === "character") {
        updateProject("characterAssetId", selectedAsset.id);
      }
      if (selectedAsset && selectRole === "reference") {
        updateProject("referenceAssetId", selectedAsset.id);
      }
      if (newAssets.length > 0) {
        setNotice(
          selectRole === "audio"
            ? "Audio berhasil ditambahkan dan langsung dipilih untuk video."
            : selectRole === "character"
              ? "Gambar karakter berhasil ditambahkan dan langsung dipilih."
              : selectRole === "reference"
                ? "Video/gambar referensi ditambahkan dan langsung dipilih."
                : `${newAssets.length} aset ditambahkan ke library akun.`,
        );
      }
    } catch (uploadError) {
      console.error("Could not save uploaded assets.", uploadError);
      setError("Aset gagal disimpan. Coba file yang lebih kecil atau periksa ruang penyimpanan browser.");
    }
  };

  const handleUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) await addAssets(files);
  };

  const handleCharacterUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) await addAssets(files, "character");
  };

  const handleAudioUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.length > 0) await addAssets(files, "audio");
  };

  const handleReferenceUpload = async (event) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (files.some((file) => file.size > MAX_VIDEO_REFERENCE_BYTES)) {
      setError("File referensi harus maksimal 150 MB.");
      return;
    }
    if (files.length > 0) await addAssets(files.slice(0, 1), "reference");
  };

  const getStyleReferenceImages = async () => {
    const references = [];
    const referenceAsset = assets.find((asset) => asset.id === project.referenceAssetId);
    if (project.referenceAssetId && !referenceAsset) {
      throw new Error("Aset referensi tidak ditemukan di library. Pilih ulang video atau gambarnya.");
    }
    if (referenceAsset) {
      if (referenceAsset.type.startsWith("video/")) {
        if (referenceAsset.size > MAX_VIDEO_REFERENCE_BYTES) {
          throw new Error("Video referensi harus maksimal 150 MB.");
        }
        references.push(...await extractVideoReferenceFrames(referenceAsset.blob));
      } else if (STORY_IMAGE_TYPES.has(referenceAsset.type)) {
        references.push(await imageBlobToReference(referenceAsset.blob));
      } else {
        throw new Error("Referensi visual harus berupa video atau gambar.");
      }
    }

    const referenceUrl = project.referenceVideoUrl.trim();
    if (referenceUrl && references.length < MAX_STYLE_REFERENCE_IMAGES) {
      let parsedUrl;
      try {
        parsedUrl = new URL(referenceUrl);
      } catch {
        throw new Error("Masukkan link video yang valid, atau kosongkan kolom referensi.");
      }
      if (!["http:", "https:"].includes(parsedUrl.protocol) || parsedUrl.username || parsedUrl.password) {
        throw new Error("Link referensi harus menggunakan HTTP atau HTTPS dan tidak boleh berisi kredensial.");
      }
      if (isSocialVideoPage(referenceUrl)) {
        if (references.length === 0) {
          throw new Error("Link YouTube/TikTok/Reels tidak bisa dibaca langsung. Upload video yang kamu punya haknya atau pilih screenshot di Asset library.");
        }
      } else {
        const frames = await extractVideoReferenceFrames(
          referenceUrl,
          MAX_STYLE_REFERENCE_IMAGES - references.length,
        );
        references.push(...frames);
      }
    }
    return references.slice(0, MAX_STYLE_REFERENCE_IMAGES);
  };

  const buildStoryRequest = async (revision) => {
    const characterReference = assets.find((asset) => asset.id === project.characterAssetId);
    const styleReferenceImages = await getStyleReferenceImages();
    let referenceImage;
    if (characterReference && STORY_IMAGE_TYPES.has(characterReference.type)) {
      if (characterReference.size > 5 * 1024 * 1024) {
        setNotice("Gambar karakter lebih dari 5 MB; Gemini akan memakai character bible tanpa gambar.");
      } else {
        referenceImage = {
          mediaType: characterReference.type,
          data: await blobToBase64(characterReference.blob),
        };
      }
    }

    const assetRoles = new Map([
      [project.characterAssetId, "referensi visual karakter"],
      [project.backgroundId, "background video"],
      [project.audioId, "audio/voice-over"],
    ]);
    project.scenes.forEach((scene, index) => {
      if (scene.visualAssetId) assetRoles.set(scene.visualAssetId, `visual adegan ${index + 1}`);
    });
    const contentPreferences = {
      ...DEFAULT_PROJECT.contentPreferences,
      ...project.contentPreferences,
    };
    return {
      brief: project.brief,
      goal: project.goal,
      audience: project.audience,
      platform: project.platform,
      visualStyle: project.visualStyle,
      callToAction: project.callToAction,
      preferences: contentPreferences,
      character: {
        name: project.characterName,
        description: project.characterDescription,
        traits: project.characterTraits,
        voice: project.characterVoice,
      },
      format: project.format,
      durationSeconds: Number(project.durationSeconds),
      assets: assets.slice(0, 100).map((asset) => ({
        name: asset.name,
        type: asset.type,
        role: assetRoles.get(asset.id) ||
          (asset.id === project.referenceAssetId ? "referensi visual video" : "tersedia di library lokal"),
      })),
      characterReference: referenceImage,
      styleReferenceImages,
      revision,
    };
  };

  const requestStory = async (revision) => {
    if (plan !== "pro") throw new Error("Pembuatan dan revisi cerita AI tersedia di paket Pro.");
    const response = await fetch("/api/ai/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await buildStoryRequest(revision)),
    });
    const story = await response.json();
    if (!response.ok) throw new Error(story.error || `${aiProviderLabel} gagal membuat cerita.`);
    return story;
  };

  const applyStory = (story) => {
    const scenes = story.scenes.map((scene, index, list) => ({
      ...scene,
      visualType: scene.visualType || "hero",
      motionPreset: scene.motionPreset || "rise",
      motionStyle: scene.motionStyle || SCENE_MOTION_STYLES[index % SCENE_MOTION_STYLES.length],
      motionIntensity: scene.motionIntensity || 2,
      motionText: scene.motionText || getMotionText(scene.onScreenText),
      motionEmphasis: scene.motionEmphasis || scene.onScreenText.split(/\s+/)[0] || "Fokus",
      motionDirection: scene.motionDirection || SCENE_MOTION_DIRECTIONS[index % SCENE_MOTION_DIRECTIONS.length],
      motionTempo: scene.motionTempo || "steady",
      motionEntrance: scene.motionEntrance || SCENE_MOTION_ENTRANCES[index % SCENE_MOTION_ENTRANCES.length],
      motionDesigned: false,
      durationSeconds: estimateSpeechDuration(scene.narration),
      pauseAfterSeconds: index < list.length - 1 ? 0.35 : 0,
      voiceAssetId: "",
      voiceDurationSeconds: 0,
      voiceAlignment: [],
      id: crypto.randomUUID(),
    }));
    const timedScenes = distributeSceneDurations(scenes, Number(project.durationSeconds) || 15);
    setProject((current) => ({
      ...current,
      title: story.title,
      subtitle: story.opening,
      narration: story.narration,
      scenes: timedScenes,
      generatedPromptKey: storyGenerationKey,
      generatedScript: "",
      durationSeconds: Math.ceil(getTimelineDuration(timedScenes)),
      audioId: current.audioNarration ? "" : current.audioId,
      audioNarration: "",
      audioAlignment: [],
    }));
    return timedScenes;
  };

  const refreshElevenLabsUsage = async () => {
    const response = await fetch("/api/ai/elevenlabs-usage");
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || "Sisa kuota ElevenLabs tidak bisa dicek.");
    }
    if (
      !Number.isSafeInteger(result.characterCount) ||
      !Number.isSafeInteger(result.characterLimit) ||
      !Number.isSafeInteger(result.remainingCharacters)
    ) {
      throw new Error("Respons kuota ElevenLabs tidak valid. Voice-over dibatalkan agar batas tetap aman.");
    }
    setElevenLabsUsage(result);
    return result;
  };

  const ensureElevenLabsQuota = async (texts) => {
    const requiredCharacters = texts.reduce(
      (total, text) => total + countCharacters(text),
      0,
    );
    const usage = await refreshElevenLabsUsage();
    if (requiredCharacters > usage.remainingCharacters) {
      throw new Error(
        `Video ini butuh ${requiredCharacters.toLocaleString("id-ID")} karakter, tetapi sisa kuota ElevenLabs hanya ${usage.remainingCharacters.toLocaleString("id-ID")}. Tidak ada voice yang dibuat dan overage tidak digunakan.`,
      );
    }
    return usage;
  };

  const refreshElevenLabsUsageAfterSpeech = async () => {
    try {
      return await refreshElevenLabsUsage();
    } catch (usageError) {
      console.error("Could not refresh ElevenLabs usage after speech generation.", usageError);
      return null;
    }
  };

  const ensureVoiceId = async () => {
    const selectedPremadeVoice = voices.find(
      (voice) => voice.id === project.ttsVoiceId && isPremadeVoice(voice),
    );
    if (selectedPremadeVoice) return selectedPremadeVoice.id;
    const response = await fetch("/api/ai/voices");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Daftar voice ElevenLabs gagal dimuat.");
    const premadeVoices = result.voices.filter(isPremadeVoice);
    setVoices(premadeVoices);
    const selectedVoice =
      premadeVoices.find((voice) => voice.id === project.ttsVoiceId) ||
      premadeVoices.find((voice) => voice.id === result.defaultVoiceId) ||
      premadeVoices[0];
    if (!selectedVoice) {
      throw new Error("Akun ElevenLabs tidak menyediakan voice Premade yang bisa dipakai API. Voice Library tidak dipilih otomatis.");
    }
    updateProject("ttsVoiceId", selectedVoice.id);
    return selectedVoice.id;
  };

  const createSpeechAsset = async (text, voiceId, sceneId, voiceDelivery = project.voiceDelivery) => {
    if (countCharacters(text) > MAX_SPEECH_CHARACTERS) {
      throw new Error(`Voice-over dibatasi ${MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")} karakter per video agar biaya tetap terkendali.`);
    }
    const response = await fetch("/api/ai/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId, voiceDelivery }),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "ElevenLabs gagal membuat voice-over.");
    }
    const result = await response.json();
    if (typeof result.audioBase64 !== "string" || !Array.isArray(result.words)) {
      throw new Error("ElevenLabs mengembalikan audio tanpa data timing yang valid.");
    }
    const audioBytes = Uint8Array.from(atob(result.audioBase64), (character) => character.charCodeAt(0));
    const blob = new Blob([audioBytes], { type: "audio/mpeg" });
    if (blob.size === 0 || !blob.type.startsWith("audio/")) {
      throw new Error("ElevenLabs mengembalikan file audio yang tidak valid.");
    }
    const durationSeconds = await getAudioDuration(blob);
    const voiceName = voices.find((voice) => voice.id === voiceId)?.name || "Voice-over";
    const asset = {
      id: crypto.randomUUID(),
      name: `${voiceName} · ${new Date().toLocaleString("id-ID")}.mp3`,
      type: "audio/mpeg",
      size: blob.size,
      blob,
      addedAt: Date.now(),
      durationSeconds,
    };
    await saveAssetToAccount(asset);
    setAssets((current) => [asset, ...current]);
    setProject((current) => {
      if (!sceneId) {
        return {
          ...current,
          audioId: asset.id,
          audioNarration: text,
          audioAlignment: result.words,
          durationSeconds: Math.max(Number(current.durationSeconds) || 1, Math.ceil(durationSeconds)),
        };
      }
      const scenes = current.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              voiceAssetId: asset.id,
              voiceDurationSeconds: durationSeconds,
              voiceText: text,
              voiceAlignment: result.words,
            }
          : scene,
      );
      return {
        ...current,
        scenes,
        durationSeconds: Math.ceil(getTimelineDuration(scenes)),
        audioNarration: "",
      };
    });
    return asset;
  };

  const generateSceneVoices = async (scenes, voiceId, voiceDelivery = project.voiceDelivery) => {
    if (plan !== "pro") throw new Error("Voice-over AI tersedia di paket Pro.");
    if (scenes.some((scene) => !scene.narration.trim())) {
      throw new Error("Ada adegan yang belum punya narasi. Isi semua beat sebelum membuat voice-over.");
    }
    if (scenes.length === 0) throw new Error("Belum ada narasi per adegan untuk dibuat menjadi voice-over.");
    const pendingScenes = scenes.filter(sceneNeedsVoice);
    if (pendingScenes.length === 0) return;
    const totalCharacters = scenes.reduce((total, scene) => total + countCharacters(scene.narration), 0);
    if (totalCharacters > MAX_SPEECH_CHARACTERS) {
      throw new Error(`Voice-over video ini ${totalCharacters.toLocaleString("id-ID")} karakter; batas hematnya ${MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")}. Persingkat naskah sebelum membuat suara.`);
    }
    await ensureElevenLabsQuota(pendingScenes.map((scene) => scene.narration));
    let completed = 0;
    for (const scene of pendingScenes) {
      setSpeechProgress({ completed, total: pendingScenes.length });
      setNotice(`Membuat voice-over adegan ${completed + 1} dari ${pendingScenes.length}...`);
      await createSpeechAsset(scene.narration, voiceId, scene.id, voiceDelivery);
      completed += 1;
    }
    setSpeechProgress({ completed, total: pendingScenes.length });
  };

  const designSceneMotion = async (scenes) => {
    const response = await fetch("/api/ai/motion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenes: scenes.map(({ id, label, onScreenText, narration, visualDescription }) => ({
          id,
          label,
          onScreenText,
          narration,
          visualDescription,
        })),
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "AI gagal merancang motion adegan.");
    if (!Array.isArray(result.scenes) || result.scenes.length !== scenes.length) {
      throw new Error("AI tidak mengembalikan motion untuk semua adegan. Coba lagi.");
    }
    const motionById = new Map(result.scenes.map((scene) => [scene.sceneId, scene]));
    if (scenes.some((scene) => !motionById.has(scene.id))) {
      throw new Error("Respons AI tidak cocok dengan urutan adegan sekarang. Coba lagi.");
    }
    return scenes.map((scene) => {
      const motion = motionById.get(scene.id);
      return {
        ...scene,
        motionStyle: motion.motionStyle,
        motionIntensity: motion.motionIntensity,
        motionText: motion.motionText,
        motionEmphasis: motion.motionEmphasis,
        motionDirection: motion.motionDirection,
        motionTempo: motion.motionTempo,
        motionEntrance: motion.motionEntrance,
        motionDesigned: true,
      };
    });
  };

  const generateSceneMotion = async () => {
    if (generatingImages || generatingMotion || generatingStory || generatingSpeech || generatingCompleteVideo || project.scenes.length < 2) return;
    if (plan !== "pro") {
      setError("Perancangan motion dengan AI tersedia di paket Pro.");
      return;
    }
    setGeneratingMotion(true);
    setError("");
    setNotice("");
    try {
      const scenes = await designSceneMotion(project.scenes);
      setProject((current) => ({
        ...current,
        scenes: current.scenes.map((scene) => scenes.find((designed) => designed.id === scene.id) || scene),
      }));
      setNotice(`Motion graphics ${scenes.length} adegan dirancang AI. Naskah dan voice-over tetap sama.`);
    } catch (motionError) {
      console.error("Could not design motion graphics for the scenes.", motionError);
      setError(motionError.message || "AI gagal merancang motion. Coba lagi.");
    } finally {
      setGeneratingMotion(false);
    }
  };

  const generateSceneImages = async (sceneIds) => {
    if (generatingImages || generatingStory || generatingSpeech || generatingMotion || generatingCompleteVideo) return;
    if (plan !== "pro") {
      setError("Pembuatan gambar dengan AI tersedia di paket Pro.");
      return;
    }
    const requestedIds = new Set(sceneIds);
    const scenes = project.scenes.filter((scene) => requestedIds.has(scene.id));
    if (scenes.length === 0) return;
    if (scenes.some((scene) => !scene.narration.trim() || !scene.visualDescription.trim())) {
      setError("Isi narasi dan arahan visual untuk tiap adegan sebelum membuat gambar.");
      return;
    }

    setGeneratingImages(true);
    setError("");
    setNotice("");
    setImageProgress({ completed: 0, total: scenes.length, activeSceneId: scenes[0]?.id });
    let completed = 0;
    let failure = null;
    try {
      const characterImage = assets.find(
        (asset) => asset.id === project.characterAssetId && IMAGE_GENERATION_REFERENCE_TYPES.has(asset.type),
      );
      if (
        project.characterAssetId &&
        !characterImage &&
        !assets.some((asset) => asset.id === project.characterAssetId)
      ) {
        throw new Error("Gambar referensi karakter tidak ditemukan di library. Pilih ulang gambar karakter.");
      }
      if (characterImage?.size > 5 * 1024 * 1024) {
        throw new Error("Gambar referensi karakter harus maksimal 5 MB untuk dikirim ke Gemini Image.");
      }
      const styleReferenceImages = await getStyleReferenceImages();
      let continuityReference = characterImage
        ? {
            mediaType: characterImage.type,
            data: await blobToBase64(characterImage.blob),
          }
        : null;
      if (!continuityReference) {
        const generatedReference = project.scenes
          .map((scene) => assets.find((asset) => asset.id === scene.visualAssetId && asset.generatedBy === "gemini-image"))
          .find(Boolean);
        if (generatedReference) {
          continuityReference = {
            mediaType: generatedReference.type,
            data: await blobToBase64(generatedReference.blob),
          };
        }
      }

      for (const scene of scenes) {
        setImageProgress({ completed, total: scenes.length, activeSceneId: scene.id });
        setNotice(`Membuat gambar AI adegan ${completed + 1} dari ${scenes.length}...`);
        const response = await fetch("/api/ai/scene-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scene: {
              id: scene.id,
              label: scene.label,
              narration: scene.narration,
              onScreenText: scene.onScreenText,
              visualDescription: scene.visualDescription,
            },
            character: {
              name: project.characterName,
              description: project.characterDescription,
              traits: project.characterTraits,
            },
            format: project.format,
            visualStyle: project.visualStyle,
            referenceImage: continuityReference,
            styleReferenceImages,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Gemini gagal membuat gambar adegan.");
        if (
          result.sceneId !== scene.id ||
          typeof result.imageBase64 !== "string" ||
          !IMAGE_GENERATION_REFERENCE_TYPES.has(result.mimeType)
        ) {
          throw new Error("Respons Gemini tidak berisi gambar valid untuk adegan ini.");
        }
        const imageBytes = Uint8Array.from(atob(result.imageBase64), (character) => character.charCodeAt(0));
        if (imageBytes.length === 0 || imageBytes.length > 12 * 1024 * 1024) {
          throw new Error("Ukuran gambar Gemini kosong atau melebihi batas 12 MB.");
        }
        const blob = new Blob([imageBytes], { type: result.mimeType });
        const asset = {
          id: crypto.randomUUID(),
          name: `Visual AI · ${scene.label || `Adegan ${completed + 1}`} · ${new Date().toLocaleString("id-ID")}`,
          type: result.mimeType,
          size: blob.size,
          blob,
          addedAt: Date.now(),
          generatedBy: "gemini-image",
          sceneId: scene.id,
        };
        await saveAssetToAccount(asset);
        setAssets((current) => [asset, ...current]);
        setProject((current) => ({
          ...current,
          scenes: current.scenes.map((currentScene) =>
            currentScene.id === scene.id
              ? { ...currentScene, visualAssetId: asset.id }
              : currentScene,
          ),
        }));
        if (blob.size <= 5 * 1024 * 1024) {
          continuityReference = {
            mediaType: result.mimeType,
            data: result.imageBase64,
          };
        }
        completed += 1;
      }
      setNotice(`${completed} gambar AI selesai dan sudah dipasang ke adegan. Preview bisa langsung diedit.`);
    } catch (imageError) {
      failure = imageError;
      console.error("Could not generate scene images.", imageError);
      setError(
        completed > 0
          ? `${completed} gambar tersimpan, lalu generasi berhenti: ${imageError.message}`
          : imageError.message || "Gemini gagal membuat gambar adegan.",
      );
    } finally {
      setGeneratingImages(false);
      setImageProgress(null);
      if (failure) setNotice("");
    }
  };

  const openStockSearch = (scene) => {
    setError("");
    setStockSearch({
      sceneId: scene.id,
      query: (scene.visualDescription || scene.narration || "").trim().slice(0, 200),
      photos: [],
    });
  };

  const fetchPexelsPhotos = async (query) => {
    const response = await fetch("/api/ai/stock/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: query.trim().slice(0, 200),
        orientation: project.format === "portrait" ? "portrait" : "landscape",
      }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Pencarian Pexels gagal.");
    return Array.isArray(result.photos) ? result.photos : [];
  };

  const searchStockPhotos = async () => {
    if (searchingStock || generatingCompleteVideo || !stockSearch.sceneId) return;
    if (!aiStatus?.pexelsConfigured) {
      setError("Pencarian stock belum dikonfigurasi. Admin perlu menambahkan PEXELS_API_KEY di server.");
      return;
    }
    if (!stockSearch.query.trim()) {
      setError("Tulis kata kunci visual dulu untuk mencari aset stock.");
      return;
    }

    setSearchingStock(true);
    setError("");
    try {
      const photos = await fetchPexelsPhotos(stockSearch.query);
      setStockSearch((current) => ({ ...current, photos }));
      if (!photos.length) setNotice("Belum ada hasil yang cocok. Coba kata kunci yang lebih spesifik.");
    } catch (stockError) {
      console.error("Could not search Pexels photos.", stockError);
      setError(stockError.message || "Pencarian aset stock gagal.");
    } finally {
      setSearchingStock(false);
    }
  };

  const savePexelsPhoto = async (photo, scene) => {
    const response = await fetch("/api/ai/stock/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageUrl: photo.imageUrl }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Aset Pexels gagal diunduh.");
    if (
      typeof result.imageBase64 !== "string" ||
      !IMAGE_GENERATION_REFERENCE_TYPES.has(result.mimeType)
    ) {
      throw new Error("Respons Pexels tidak berisi gambar yang valid.");
    }
    const imageBytes = Uint8Array.from(atob(result.imageBase64), (character) => character.charCodeAt(0));
    if (imageBytes.length === 0 || imageBytes.length > 12 * 1024 * 1024) {
      throw new Error("Ukuran gambar Pexels kosong atau melebihi batas 12 MB.");
    }
    const blob = new Blob([imageBytes], { type: result.mimeType });
    const asset = {
      id: crypto.randomUUID(),
      name: `Pexels · ${photo.photographer} · ${scene.label || "visual adegan"}`,
      type: result.mimeType,
      size: blob.size,
      blob,
      addedAt: Date.now(),
      source: {
        provider: "pexels",
        photoId: photo.id,
        photoUrl: photo.pexelsUrl,
        photographer: photo.photographer,
        photographerUrl: photo.photographerUrl,
      },
    };
    await saveAssetToAccount(asset);
    setAssets((current) => [asset, ...current]);
    setProject((current) => ({
      ...current,
      scenes: current.scenes.map((currentScene) =>
        currentScene.id === scene.id
          ? { ...currentScene, visualAssetId: asset.id }
          : currentScene,
      ),
    }));
    return asset;
  };

  const importStockPhoto = async (photo, scene) => {
    if (importingStockId !== null || generatingCompleteVideo) return;
    setImportingStockId(photo.id);
    setError("");
    try {
      await savePexelsPhoto(photo, scene);
      setStockSearch({ sceneId: "", query: "", photos: [] });
      setNotice(`Foto karya ${photo.photographer} dipasang. Kredit Pexels tersimpan bersama aset.`);
    } catch (stockError) {
      console.error("Could not import Pexels photo.", stockError);
      setError(stockError.message || "Aset Pexels gagal diimpor.");
    } finally {
      setImportingStockId(null);
    }
  };

  const generateCompleteVideo = async () => {
    if (generatingCompleteVideo || generatingImages || generatingMotion || generatingStory || generatingSpeech) return;
    if (plan !== "pro") {
      setError("Pembuatan video AI lengkap tersedia di paket Pro.");
      return;
    }
    if (!aiStatus || aiStatus.unavailable) {
      setError("Status AI belum siap. Restart studio lalu coba lagi.");
      return;
    }
    const shouldGenerateStory = project.creationMode === "idea" &&
      (!project.scenes.length || project.generatedPromptKey !== storyGenerationKey);
    const shouldSplitScript = project.creationMode === "script" &&
      (!project.scenes.length || project.generatedScript !== project.narration);
    if (shouldGenerateStory && !project.brief.trim()) {
      setError("Tulis prompt cerita dulu, lalu generate video lengkap.");
      return;
    }
    if (shouldSplitScript && !project.narration.trim()) {
      setError("Tempel naskah dulu, lalu generate video lengkap.");
      return;
    }
    const willNeedAi = shouldGenerateStory || shouldSplitScript ||
      project.scenes.some((scene) => !scene.motionDesigned);
    const willNeedStock = shouldGenerateStory || shouldSplitScript ||
      project.scenes.some((scene) => !scene.visualAssetId);
    const willNeedVoice = shouldGenerateStory || shouldSplitScript ||
      project.scenes.some(sceneNeedsVoice);
    if (willNeedAi && !aiStatus.aiConfigured) {
      setError(`Claude/Gemini belum dikonfigurasi untuk merancang video. Periksa key ${aiStatus.aiProvider === "anthropic" ? "Anthropic" : "Gemini"} di server.`);
      return;
    }
    if (willNeedVoice && !aiStatus.elevenLabsConfigured) {
      setError("ElevenLabs belum dikonfigurasi di server.");
      return;
    }
    if (willNeedStock && !aiStatus.pexelsConfigured) {
      setError("Pencarian stock belum aktif. Admin perlu mengatur PEXELS_API_KEY sebelum video lengkap bisa dibuat.");
      return;
    }

    setGeneratingCompleteVideo(true);
    setError("");
    setNotice("");
    let stage = "cek akun dan kuota";
    setCompleteVideoStage(stage);
    try {
      let voiceId = "";
      if (willNeedVoice) {
        const usage = await refreshElevenLabsUsage();
        if (usage.remainingCharacters <= 0) {
          throw new Error("Kuota ElevenLabs sudah habis. Cerita belum dibuat; isi kuota voice dulu agar proses lengkap tidak berhenti di tengah.");
        }
        voiceId = await ensureVoiceId();
      }
      let scenes = project.scenes;

      if (shouldGenerateStory) {
        stage = "Claude menulis cerita";
        setCompleteVideoStage(stage);
        const story = await requestStory();
        scenes = applyStory(story);
      } else if (shouldSplitScript) {
        const script = project.narration.trim();
        if (!script) throw new Error("Tulis naskah dulu sebelum membuat video lengkap.");
        scenes = createScenesFromScript(script);
        if (scenes.length < 2 || scenes.length > 12) {
          throw new Error("Naskah belum bisa dipecah menjadi 2–12 adegan. Rapikan paragraf atau tanda bacanya.");
        }
        scenes = distributeSceneDurations(scenes, Number(project.durationSeconds) || 15);
        setProject((current) => ({
          ...current,
          title: scenes[0].onScreenText || current.title,
          subtitle: "",
          narration: script,
          generatedScript: script,
          generatedPromptKey: "",
          scenes,
          durationSeconds: Math.ceil(getTimelineDuration(scenes)),
          audioId: current.audioNarration ? "" : current.audioId,
          audioNarration: "",
          audioAlignment: [],
        }));
      }
      if (scenes.length < 2 || scenes.length > 12) {
        throw new Error("Video lengkap membutuhkan 2–12 adegan. Periksa naskah atau brief ceritanya.");
      }

      const missingVoiceScenes = scenes.filter(sceneNeedsVoice);
      const totalCharacters = scenes.reduce((total, scene) => total + countCharacters(scene.narration), 0);
      if (missingVoiceScenes.length > 0 && totalCharacters > MAX_SPEECH_CHARACTERS) {
        throw new Error(`Naskah video ini ${totalCharacters.toLocaleString("id-ID")} karakter; batas voice hematnya ${MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")}. Persingkat naskah, lalu lanjutkan lagi.`);
      }
      if (missingVoiceScenes.length > 0) {
        await ensureElevenLabsQuota(missingVoiceScenes.map((scene) => scene.narration));
      }

      stage = "mencari visual stock";
      setCompleteVideoStage(stage);
      let importedVisuals = 0;
      let scenesWithoutStock = 0;
      const scenesNeedingVisuals = scenes.filter((scene) => !scene.visualAssetId);
      for (let index = 0; index < scenesNeedingVisuals.length; index += 1) {
        const scene = scenesNeedingVisuals[index];
        setCompleteVideoStage(`mencari visual ${index + 1}/${scenesNeedingVisuals.length}`);
        const stockQuery = typeof scene.visualDescription === "string" &&
          scene.visualDescription.startsWith("Pilih aset visual")
          ? scene.narration
          : scene.visualDescription || scene.narration;
        const photos = await fetchPexelsPhotos(stockQuery);
        if (photos.length === 0) {
          scenesWithoutStock += 1;
          continue;
        }
        const asset = await savePexelsPhoto(photos[0], scene);
        scenes = scenes.map((currentScene) =>
          currentScene.id === scene.id
            ? { ...currentScene, visualAssetId: asset.id }
            : currentScene,
        );
        importedVisuals += 1;
      }

      if (scenes.some((scene) => !scene.motionDesigned)) {
        stage = "Claude merancang motion";
        setCompleteVideoStage(stage);
        scenes = await designSceneMotion(scenes);
        setProject((current) => ({
          ...current,
          scenes: current.scenes.map((scene) => scenes.find((designed) => designed.id === scene.id) || scene),
        }));
      }

      if (scenes.some(sceneNeedsVoice)) {
        stage = "membuat voice dan timing subtitle";
        setCompleteVideoStage(stage);
        setGeneratingSpeech(true);
        await generateSceneVoices(scenes, voiceId);
        await refreshElevenLabsUsageAfterSpeech();
      }
      const visualSummary = importedVisuals > 0
        ? `${importedVisuals} visual stock terpasang`
        : "visual yang sudah ada dipertahankan";
      const missingSummary = scenesWithoutStock > 0
        ? ` ${scenesWithoutStock} adegan memakai visual bawaan karena stock tidak ditemukan.`
        : "";
      setNotice(`Video siap dicek di preview; ${visualSummary}.${missingSummary} Ganti visual bila perlu, lalu export MP4.`);
    } catch (generationError) {
      console.error(`Complete video generation stopped during ${stage}.`, generationError);
      setError(`Proses berhenti saat ${completeVideoStage || stage}: ${generationError.message || "Coba lagi setelah memeriksa konfigurasi."} Hasil yang sudah selesai tetap tersimpan; tidak ada auto-retry.`);
    } finally {
      setGeneratingSpeech(false);
      setSpeechProgress(null);
      setGeneratingCompleteVideo(false);
      setCompleteVideoStage("");
    }
  };

  const generateStory = async ({ withVoice = false } = {}) => {
    if (generatingImages || generatingStory || generatingMotion || generatingCompleteVideo) return;
    setGeneratingStory(true);
    setError("");
    setNotice("");
    try {
      const story = await requestStory();
      const scenes = applyStory(story);
      setNotice(`Cerita ${story.scenes.length} adegan berhasil dibuat. Subtitle sudah muncul di preview.`);
      if (withVoice) {
        setGeneratingSpeech(true);
        try {
          const voiceId = await ensureVoiceId();
          await generateSceneVoices(scenes, voiceId);
          const usage = await refreshElevenLabsUsageAfterSpeech();
          setNotice(usage
            ? "Draft dan voice-over per adegan selesai. Timing-nya bisa lo atur di timeline."
            : "Draft dan voice-over selesai, tapi sisa kuota belum berhasil diperbarui. Cek ulang sebelum generate lagi.");
        } catch (speechError) {
          console.error("The story was created, but automatic voice-over generation failed.", speechError);
          setError(`Ceritanya tetap tersimpan, tapi voice-over dan subtitle belum lengkap: ${speechError.message}`);
        } finally {
          setGeneratingSpeech(false);
          setSpeechProgress(null);
        }
      }
    } catch (generationError) {
      console.error(`Could not generate the story with ${aiProviderLabel}.`, generationError);
      setError(generationError.message || `${aiProviderLabel} gagal membuat cerita. Periksa setup API dan coba lagi.`);
    } finally {
      setGeneratingStory(false);
    }
  };

  const createOwnScriptScenes = async ({ withVoice = false } = {}) => {
    const script = project.narration.trim();
    if (!script) {
      setError("Tulis atau tempel naskah dulu sebelum menyusun adegan.");
      return;
    }
    if (generatingImages || generatingStory || generatingSpeech || generatingMotion || generatingCompleteVideo) return;

    const scenes = createScenesFromScript(script);
    if (scenes.length === 0 || scenes.length > 12) {
      setError("Naskah belum bisa dipecah menjadi adegan yang aman. Coba rapikan paragraf atau tanda bacanya.");
      return;
    }
    const timedScenes = distributeSceneDurations(scenes, Number(project.durationSeconds) || 15);
    setProject((current) => ({
      ...current,
      title: timedScenes[0].onScreenText || current.title,
      subtitle: "",
      narration: script,
      generatedScript: script,
      generatedPromptKey: "",
      scenes: timedScenes,
      durationSeconds: Math.ceil(getTimelineDuration(timedScenes)),
      audioId: current.audioNarration ? "" : current.audioId,
      audioNarration: "",
      audioAlignment: [],
    }));
    setError("");
    setNotice(`${timedScenes.length} adegan dan subtitle tersusun dari naskah lo. Teks asli tetap dipertahankan.`);
    if (!withVoice) return;

    setGeneratingSpeech(true);
    try {
      const voiceId = await ensureVoiceId();
      await generateSceneVoices(timedScenes, voiceId, project.voiceDelivery);
      const usage = await refreshElevenLabsUsageAfterSpeech();
      setNotice(usage
        ? "Adegan dari naskah lo sudah disusun dan voice-over-nya siap diedit."
        : "Adegan dan voice-over selesai, tapi sisa kuota belum berhasil diperbarui. Cek ulang sebelum generate lagi.");
    } catch (speechError) {
      console.error("The user's script was split, but voice-over generation failed.", speechError);
      setError(`Adegan tetap tersimpan, tapi voice-over belum selesai: ${speechError.message}`);
    } finally {
      setGeneratingSpeech(false);
      setSpeechProgress(null);
    }
  };

  const reviseStory = async (instruction, targetSceneIndex = null) => {
    if (generatingImages || revisingStory || generatingStory || generatingMotion || generatingCompleteVideo || project.scenes.length < 2) return;
    setRevisingStory(true);
    setError("");
    setNotice("");
    try {
      const revisedStory = await requestStory({
        instruction,
        targetSceneIndex,
        currentStory: {
          title: project.title,
          opening: project.subtitle,
          narration: project.narration,
          scenes: project.scenes.map(({ id, ...scene }) => scene),
        },
      });
      if (targetSceneIndex === null) {
        applyStory(revisedStory);
      } else {
        const updatedScenes = project.scenes.map((scene, index) =>
          index === targetSceneIndex
            ? { ...revisedStory.scenes[targetSceneIndex], id: scene.id }
            : scene,
        );
        const revisedNarration = updatedScenes.map((scene) => scene.narration).filter(Boolean).join(" ");
        if (revisedNarration.length > 5000) {
          throw new Error("Hasil gabungan narasi melebihi 5.000 karakter. Coba revisi yang lebih singkat.");
        }
        setProject((current) => {
          return {
            ...current,
            scenes: current.scenes.map((scene, index) =>
              index === targetSceneIndex ? updatedScenes[targetSceneIndex] : scene,
            ),
            narration: revisedNarration,
            durationSeconds: Math.ceil(getTimelineDuration(updatedScenes)),
          };
        });
      }
      setNotice(targetSceneIndex === null ? "Revisi cerita selesai." : `Adegan ${targetSceneIndex + 1} berhasil direvisi.`);
      setRevisionInstruction("");
    } catch (revisionError) {
      console.error("Could not revise the story.", revisionError);
      setError(revisionError.message || "Revisi gagal dibuat.");
    } finally {
      setRevisingStory(false);
    }
  };

  const loadVoices = async () => {
    if (loadingVoices) return;
    if (plan !== "pro") {
      setError("Voice-over AI tersedia di paket Pro.");
      return;
    }
    setLoadingVoices(true);
    setError("");
    try {
      await refreshElevenLabsUsage();
      const response = await fetch("/api/ai/voices");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Daftar voice ElevenLabs gagal dimuat.");
      const premadeVoices = result.voices.filter(isPremadeVoice);
      setVoices(premadeVoices);
      const selectedVoice =
        premadeVoices.find((voice) => voice.id === project.ttsVoiceId) ||
        premadeVoices.find((voice) => voice.id === result.defaultVoiceId) ||
        premadeVoices[0];
      updateProject("ttsVoiceId", selectedVoice?.id || "");
      if (!selectedVoice) {
        setNotice("Tidak ada voice Premade yang tersedia untuk API di akun ini. Voice Library tidak dipilih otomatis.");
      }
    } catch (voiceError) {
      console.error("Could not load ElevenLabs voices.", voiceError);
      setError(voiceError.message || "Daftar voice tidak bisa dimuat.");
    } finally {
      setLoadingVoices(false);
    }
  };

  const generateSpeech = async () => {
    if (generatingImages || generatingSpeech || generatingCompleteVideo) return;
    if (plan !== "pro") {
      setError("Voice-over AI tersedia di paket Pro.");
      return;
    }
    if (!project.narration.trim()) {
      setError(`Bikin cerita dengan ${aiProviderLabel} dulu atau tulis naskah voice-over sebelum generate.`);
      return;
    }
    if (speechBudgetExceeded) {
      setError(`Voice-over video ini ${speechCharacters.toLocaleString("id-ID")} karakter; batas hematnya ${MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")}. Persingkat naskah sebelum membuat suara.`);
      return;
    }
    setGeneratingSpeech(true);
    setError("");
    setNotice("");
    try {
      const voiceId = await ensureVoiceId();
      if (project.scenes.length > 0) {
        if (project.audioNarration) {
          updateProject("audioId", "");
          updateProject("audioNarration", "");
        }
        await generateSceneVoices(project.scenes, voiceId);
        const usage = await refreshElevenLabsUsageAfterSpeech();
        setNotice(usage
          ? "Voice-over per adegan selesai dan tersinkron di timeline."
          : "Voice-over selesai, tapi sisa kuota belum berhasil diperbarui. Cek ulang sebelum generate lagi.");
      } else {
        await ensureElevenLabsQuota([project.narration]);
        await createSpeechAsset(project.narration, voiceId);
        const usage = await refreshElevenLabsUsageAfterSpeech();
        setNotice(usage
          ? "Voice-over berhasil dibuat, dipilih, dan masuk ke render preview."
          : "Voice-over selesai, tapi sisa kuota belum berhasil diperbarui. Cek ulang sebelum generate lagi.");
      }
    } catch (speechError) {
      console.error("Could not generate the ElevenLabs voice-over.", speechError);
      setError(speechError.message || "Voice-over gagal dibuat.");
    } finally {
      setGeneratingSpeech(false);
      setSpeechProgress(null);
    }
  };

  const setVideoDuration = (seconds) => {
    if (!Number.isSafeInteger(seconds) || seconds <= 0 || !Number.isSafeInteger(seconds * 30)) return;
    setProject((current) => {
      if (current.scenes.length === 0) return { ...current, durationSeconds: seconds };
      const scenes = distributeSceneDurations(current.scenes, seconds);
      return { ...current, scenes, durationSeconds: Math.ceil(getTimelineDuration(scenes)) };
    });
  };

  const updateScene = (sceneId, key, value) => {
    if (generatingCompleteVideo) return;
    setProject((current) => {
      const scenes = current.scenes.map((scene) => {
        if (scene.id !== sceneId) return scene;
        return {
          ...scene,
          [key]: value,
          ...(["narration", "visualDescription", "onScreenText"].includes(key)
            ? { motionDesigned: false }
            : {}),
          ...(key === "narration"
            ? { voiceAssetId: "", voiceDurationSeconds: 0, voiceText: "", voiceAlignment: [] }
            : {}),
        };
      });
      return {
        ...current,
        scenes,
        durationSeconds: Math.ceil(getTimelineDuration(scenes)),
        narration: key === "narration"
          ? scenes.map((scene) => scene.narration).filter(Boolean).join(" ")
          : current.narration,
      };
    });
  };

  const removeAsset = async (asset) => {
    try {
      const { error: metadataError } = await supabase
        .from("user_assets")
        .delete()
        .eq("user_id", user.id)
        .eq("id", asset.id);
      if (metadataError) throw metadataError;
      const { error: storageError } = await supabase.storage
        .from("framefolk-assets")
        .remove([`${user.id}/${asset.id}`]);
      if (storageError) throw storageError;
      await deleteAsset(asset.id, user.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setProject((current) => {
        const scenes = current.scenes.map((scene) =>
          ({
            ...scene,
            ...(scene.voiceAssetId === asset.id
              ? { voiceAssetId: "", voiceDurationSeconds: 0, voiceText: "", voiceAlignment: [] }
              : {}),
            ...(scene.visualAssetId === asset.id ? { visualAssetId: "" } : {}),
          }),
        );
        return {
          ...current,
          backgroundId: current.backgroundId === asset.id ? "" : current.backgroundId,
          characterAssetId: current.characterAssetId === asset.id ? "" : current.characterAssetId,
          referenceAssetId: current.referenceAssetId === asset.id ? "" : current.referenceAssetId,
          audioId: current.audioId === asset.id ? "" : current.audioId,
          audioNarration: current.audioId === asset.id ? "" : current.audioNarration,
          audioAlignment: current.audioId === asset.id ? [] : current.audioAlignment,
          scenes,
          durationSeconds: scenes.length ? Math.ceil(getTimelineDuration(scenes)) : current.durationSeconds,
        };
      });
      setNotice(`${asset.name} dihapus dari library.`);
    } catch (removeError) {
      console.error("Could not remove the asset.", removeError);
      setError(`Aset ${asset.name} gagal dihapus.`);
    }
  };

  const handleSignOut = async () => {
    try {
      const { error: signOutError } = await signOut();
      if (signOutError) throw signOutError;
    } catch (signOutError) {
      console.error("Could not sign out of Framefolk.", signOutError);
      setError("Gagal keluar dari akun. Coba lagi.");
    }
  };

  const importLegacyWorkspace = async () => {
    if (importingLegacy || !legacyAvailable || !supabase || !user?.id) return;
    setImportingLegacy(true);
    setError("");
    setNotice("");
    try {
      const legacyProjectJson = localStorage.getItem(STORAGE_KEY);
      const restoredProject = legacyProjectJson
        ? { ...DEFAULT_PROJECT, ...JSON.parse(legacyProjectJson) }
        : DEFAULT_PROJECT;
      if (!Array.isArray(restoredProject.scenes)) {
        throw new Error("Project lama punya format adegan yang tidak valid.");
      }
      if (restoredProject.scenes.length > 0) {
        const needsTimingMigration = restoredProject.scenes.some(
          (scene) => !Number.isFinite(scene.durationSeconds),
        );
        restoredProject.scenes = restoredProject.scenes.map((scene, index, scenes) => ({
          ...scene,
          pauseAfterSeconds: Number.isFinite(scene.pauseAfterSeconds)
            ? scene.pauseAfterSeconds
            : index < scenes.length - 1 ? 0.35 : 0,
        }));
        if (needsTimingMigration) {
          restoredProject.scenes = distributeSceneDurations(
            restoredProject.scenes,
            Number(restoredProject.durationSeconds) || 15,
          );
        }
        restoredProject.durationSeconds = Math.ceil(getTimelineDuration(restoredProject.scenes));
      }

      const legacyAssets = await getAssets();
      for (const asset of legacyAssets) {
        await saveAssetToAccount(asset);
        setAssets((current) => current.some((item) => item.id === asset.id)
          ? current
          : [asset, ...current]);
      }
      const { error: saveError } = await supabase.from("user_projects").upsert({
        user_id: user.id,
        project: restoredProject,
        updated_at: new Date().toISOString(),
      });
      if (saveError) throw saveError;
      setProject(restoredProject);
      setLegacyAvailable(false);
      setSyncStatus("synced");
      setNotice(`Project lama dan ${legacyAssets.length} aset berhasil dipindahkan ke akun ini. Data lokal lama tetap aman.`);
    } catch (migrationError) {
      console.error("Could not import the previous local workspace.", migrationError);
      setError(migrationError.message || "Project lama gagal dipindahkan ke cloud.");
    } finally {
      setImportingLegacy(false);
    }
  };

  const skipLegacyImport = () => {
    setLegacyAvailable(false);
    setSyncStatus("syncing");
  };

  const renderVideo = async () => {
    if (renderJob?.status === "uploading" || renderJob?.status === "rendering" || generatingCompleteVideo) return;
    setError("");
    setNotice("");
    setRenderJob({ status: "uploading", progress: 0, message: "Menyiapkan project dan aset..." });

    try {
      const selectedIds = [
        ...new Set([
          project.characterAssetId,
          project.backgroundId,
          project.audioId,
          ...project.scenes.map((scene) => scene.voiceAssetId),
          ...project.scenes.map((scene) => scene.visualAssetId),
        ].filter(Boolean)),
      ];
      if (selectedIds.length > 27) {
        throw new Error("Render mendukung maksimal 27 aset terpilih sekaligus (maksimal 12 adegan, masing-masing dengan voice dan visual).");
      }
      const selectedAssets = selectedIds.map((id) => assets.find((asset) => asset.id === id));
      if (!Number.isSafeInteger(Number(project.durationSeconds)) || Number(project.durationSeconds) <= 0) {
        throw new Error("Isi durasi positif sebelum render.");
      }
      if (selectedAssets.some((asset) => !asset)) {
        throw new Error("Ada aset terpilih yang tidak ditemukan. Pilih ulang asetnya sebelum render.");
      }
      const oversizedAsset = selectedAssets.find((asset) => asset.size > 150 * 1024 * 1024);
      if (oversizedAsset) {
        throw new Error(`${oversizedAsset.name} lebih besar dari batas render 150 MB.`);
      }

      const formData = new FormData();
      formData.append(
        "project",
        JSON.stringify({
          characterName: project.characterName,
          characterTraits: project.characterTraits,
          title: project.title,
          subtitle: project.subtitle,
          accent: project.accent,
          visualStyle: project.visualStyle,
          durationSeconds: timelineDurationSeconds,
          format: project.format,
          scenes: project.scenes.map((scene) => {
            const visualAsset = assets.find((asset) => asset.id === scene.visualAssetId);
            return {
              ...scene,
              visualAttribution: visualAsset?.source?.provider === "pexels"
                ? `Photo by ${visualAsset.source.photographer} on Pexels`
                : "",
            };
          }),
          audioVolume: Number(project.audioVolume) / 100,
          voiceVolume: Number(project.voiceVolume ?? 100) / 100,
          sfxVolume: Number(project.sfxVolume ?? 22) / 100,
          audioAlignment: project.audioAlignment || [],
          audioNarration: project.audioNarration || "",
          characterAssetId: project.characterAssetId,
          backgroundId: project.backgroundId,
          audioId: project.audioId,
        }),
      );
      selectedAssets.forEach((asset) => {
        formData.append(`asset:${asset.id}`, asset.blob, asset.name);
      });

      const startResponse = await fetch("/api/renders", { method: "POST", body: formData });
      const startResult = await startResponse.json();
      if (!startResponse.ok) throw new Error(startResult.error || "Render tidak bisa dimulai.");

      setRenderJob({
        id: startResult.id,
        status: "rendering",
        progress: 0,
        message: "Remotion sedang menyiapkan videonya...",
      });

      while (true) {
        await new Promise((resolve) => window.setTimeout(resolve, 1200));
        const statusResponse = await fetch(`/api/renders/${startResult.id}`);
        const statusResult = await statusResponse.json();
        if (!statusResponse.ok) throw new Error(statusResult.error || "Status render tidak bisa dibaca.");
        setRenderJob(statusResult);
        if (statusResult.status === "completed") {
          setNotice("Video final siap diunduh.");
          return;
        }
        if (statusResult.status === "failed") {
          throw new Error(statusResult.message || "Remotion gagal merender video.");
        }
      }
    } catch (renderError) {
      console.error("Could not render the current Framefolk project.", renderError);
      setRenderJob((current) => ({ ...current, status: "failed", message: renderError.message }));
      setError(renderError.message || "Render gagal. Periksa file aset dan coba lagi.");
    }
  };

  const rendering = renderJob?.status === "uploading" || renderJob?.status === "rendering";

  if (loadedUserId !== user?.id) {
    return (
      <main className="auth-page">
        <section className="auth-card">
          <div className="auth-brand">
            <span className="brand-mark"><Clapperboard size={18} /></span>
            <span>framefolk<span className="brand-dot">.</span></span>
          </div>
          {syncStatus === "error" ? (
            <>
              <h1>Project belum bisa dimuat.</h1>
              <p>{error || "Cloud project dan library aset tidak tersedia. Tidak ada perubahan yang ditimpa."}</p>
              <button className="button button-primary auth-submit" onClick={() => window.location.reload()}>
                Coba lagi
              </button>
            </>
          ) : (
            <div className="auth-loading" role="status">Menyinkronkan project dan aset akun...</div>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Framefolk home">
          <span className="brand-mark"><Clapperboard size={18} strokeWidth={2.2} /></span>
          <span>framefolk<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> REMOTION WORKSPACE <span className="topbar-slash">/</span> PROJECT 01</div>
        <div className="account-toolbar">
          <span className={`plan-badge plan-${plan}`}>{plan}</span>
          <span className="account-email" title={user.email}>{user.email}</span>
          <button type="button" className="account-signout" onClick={handleSignOut}>Keluar</button>
          <div className={`saved-badge sync-${syncStatus}`} aria-live="polite">
            <span /> {syncStatus === "syncing" ? "Sync..." : syncStatus === "error" ? "Cloud error" : syncStatus === "pending" ? "Import lama" : "Cloud sync"}
          </div>
        </div>
      </header>

      {legacyAvailable && (
        <section className="legacy-import-banner" aria-labelledby="legacy-import-title">
          <div>
            <h2 id="legacy-import-title">Project lama ditemukan di browser ini</h2>
            <p>Kalau ini akunmu, pindahkan project dan library aset lama ke cloud agar tersedia di perangkat lain. Data lama tidak akan dihapus.</p>
          </div>
          <div className="legacy-import-actions">
            <button type="button" className="button button-primary button-small" onClick={importLegacyWorkspace} disabled={importingLegacy}>
              {importingLegacy ? "Memindahkan..." : "Pindahkan ke akun"}
            </button>
            <button type="button" className="button button-quiet button-small" onClick={skipLegacyImport} disabled={importingLegacy}>
              Lewati
            </button>
          </div>
        </section>
      )}

      <section className="welcome-row">
        <div>
          <div className="eyebrow"><WandSparkles size={14} /> YOUR CHARACTER-LED VIDEO STUDIO</div>
          <h1>Semua cerita, tetap <em>punya karakter.</em></h1>
          <p>Tulis satu ide, cek draft dan subtitle, lalu lihat hasilnya langsung di preview.</p>
        </div>
        <div className="welcome-actions">
          {onboardingDismissed && (
            <button className="button button-quiet button-small" onClick={reopenOnboarding}>Panduan mulai</button>
          )}
          <details className="welcome-tools">
            <summary>Opsi</summary>
            <button className="button button-quiet button-small" onClick={() => setPromptVisible((visible) => !visible)}>
              <MessageSquareText size={14} /> {promptVisible ? "Sembunyikan prompt" : "Prompt manual"}
            </button>
          </details>
        </div>
      </section>

      {(error || notice) && (
        <div className={`feedback ${error ? "feedback-error" : ""}`} role={error ? "alert" : "status"}>
          <span>{error || notice}</span>
          <button onClick={() => { setError(""); setNotice(""); }} aria-label="Tutup notifikasi">×</button>
        </div>
      )}

      {aiStatus?.unavailable && (
        <div className="api-setup-note" role="status">
          Status AI lokal belum bisa dicek. Restart <code>npm run dev</code> lalu refresh studio.
        </div>
      )}

      {aiStatus && !aiStatus.unavailable && (!aiStatus.aiConfigured || !aiStatus.elevenLabsConfigured) && (
        <div className="api-setup-note">
          <strong>Setup satu kali:</strong> buat <code>.env.local</code>, isi API key
          {aiStatus.aiConfigured ? null : ` ${aiStatus.aiProvider === "anthropic" ? "Anthropic" : "Gemini"}`}{!aiStatus.aiConfigured && !aiStatus.elevenLabsConfigured ? " dan" : ""}
          {aiStatus.elevenLabsConfigured ? null : " ElevenLabs"}, lalu restart <code>npm run dev</code>. Key hanya dibaca server lokal.
        </div>
      )}

      {!onboardingDismissed && loaded && (
        <section className="panel onboarding-panel" aria-label="Panduan mulai">
          <div className="onboarding-top">
            <div>
              <span className="mini-eyebrow">MULAI DALAM 4 LANGKAH</span>
              <h2>Ide dulu. Video menyusul.</h2>
              <p>Pilih template kalau belum tahu mulai dari mana. Edit tetap bisa lo ubah kapan saja.</p>
            </div>
            <button className="button button-quiet button-small" onClick={dismissOnboarding}>Tutup panduan</button>
          </div>
          <div className="onboarding-progress" role="progressbar" aria-label="Progres setup studio" aria-valuenow={completedSetupSteps} aria-valuemin={0} aria-valuemax={setupSteps.length}>
            <span style={{ width: `${(completedSetupSteps / setupSteps.length) * 100}%` }} />
          </div>
          <div className="onboarding-steps">
            {setupSteps.map((step, index) => (
              <div className={`onboarding-step ${step.complete ? "is-complete" : ""}`} key={step.title}>
                <span>{step.complete ? <Check size={12} /> : String(index + 1).padStart(2, "0")}</span>
                <small>{step.title}</small>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="studio-grid">
        <aside className="editor-column">
          <details className="sidebar-options">
            <summary>
              <span className="section-icon"><UserRound size={17} /></span>
              <span><strong>Karakter & aset</strong><small>Atur karakter, upload referensi, dan kelola file.</small></span>
              <ChevronDown size={15} />
            </summary>
          <div className="section-heading">
            <div className="section-icon"><UserRound size={17} /></div>
            <div><h2>Character bible</h2><p>Karakter yang jadi pegangan setiap video.</p></div>
            <span className="step-number">01</span>
          </div>

          <div className="panel character-panel">
            <div className="character-avatar">
              {characterAsset && assetUrls[characterAsset.id] ? (
                <img src={assetUrls[characterAsset.id]} alt={`Referensi ${project.characterName}`} />
              ) : (
                <UserRound size={22} />
              )}
            </div>
            <label className="field-label">NAMA KARAKTER</label>
            <input
              className="text-input character-name"
              value={project.characterName}
              onChange={(event) => updateProject("characterName", event.target.value)}
              placeholder="Contoh: Nara"
            />
            <label className="character-upload">
              <input type="file" accept="image/*" onChange={handleCharacterUpload} />
              <ImagePlus size={14} />
              {characterAsset ? `Ganti gambar · ${characterAsset.name}` : "Upload gambar karakter"}
            </label>
            <label className="field-label">DESKRIPSI SINGKAT</label>
            <textarea
              className="text-input textarea-small"
              value={project.characterDescription}
              onChange={(event) => updateProject("characterDescription", event.target.value)}
              placeholder="Siapa dia dan perannya?"
              rows={2}
            />
            <label className="field-label">SIFAT UTAMA <span className="optional">PISAHKAN DENGAN KOMA</span></label>
            <input
              className="text-input"
              value={project.characterTraits}
              onChange={(event) => updateProject("characterTraits", event.target.value)}
              placeholder="Ceria, cerdas, sedikit usil"
            />
            <label className="field-label"><Mic2 size={12} /> PANDUAN SUARA</label>
            <textarea
              className="text-input textarea-small"
              value={project.characterVoice}
              onChange={(event) => updateProject("characterVoice", event.target.value)}
              placeholder="Nada, tempo, aksen, cara bicara..."
              rows={2}
            />
          </div>

          <div className="section-heading assets-heading">
            <div className="section-icon"><FolderPlus size={17} /></div>
            <div><h2>Asset library</h2><p>Footage, screenshot, dan gambar tambahan.</p></div>
            <span className="asset-count">{assets.length} FILE</span>
          </div>
          <label className="upload-zone">
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleUpload}
            />
            <span className="upload-icon"><Plus size={18} /></span>
            <span className="upload-copy"><strong>Tambah gambar / footage</strong><small>Untuk referensi, pilih ikon clapperboard · max 150 MB per file</small></span>
            <ArrowDownToLine className="upload-arrow" size={16} />
          </label>
          <label className="upload-zone audio-upload-zone">
            <input type="file" accept="audio/*" onChange={handleAudioUpload} />
            <span className="upload-icon"><Music2 size={16} /></span>
            <span className="upload-copy">
              <strong>{audioAsset ? `Ganti audio · ${audioAsset.name}` : "Upload musik / voice-over"}</strong>
              <small>Musik latar · MP3, WAV, M4A, OGG · volume terpisah dari voice</small>
            </span>
            <ArrowDownToLine className="upload-arrow" size={16} />
          </label>

          {assets.length > 0 ? (
            <div className="asset-list">
              {assets.map((asset) => {
                const Icon = getAssetIcon(asset.type);
                const isBackground = project.backgroundId === asset.id;
                const isCharacter = project.characterAssetId === asset.id;
                const isReference = project.referenceAssetId === asset.id;
                const isAudio = project.audioId === asset.id;
                return (
                  <div className="asset-row" key={asset.id}>
                    <div className="asset-type-icon"><Icon size={16} /></div>
                    <div className="asset-details">
                      <strong title={asset.name}>{asset.name}</strong>
                      <small>{formatBytes(asset.size)}</small>
                      {asset.source?.provider === "pexels" && (
                        <a
                          className="asset-credit"
                          href={asset.source.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Photo by {asset.source.photographer} on Pexels
                        </a>
                      )}
                    </div>
                    <div className="asset-actions">
                      {(asset.type.startsWith("image/") || asset.type.startsWith("video/")) && (
                        <button
                          className={`asset-use ${isBackground ? "is-selected" : ""}`}
                          onClick={() => updateProject("backgroundId", isBackground ? "" : asset.id)}
                          title={isBackground ? "Hapus background" : "Gunakan sebagai background"}
                        >
                          <ImagePlus size={14} />
                        </button>
                      )}
                      {(asset.type.startsWith("image/") || asset.type.startsWith("video/")) && (
                        <button
                          className={`asset-use ${isReference ? "is-selected" : ""}`}
                          onClick={() => updateProject("referenceAssetId", isReference ? "" : asset.id)}
                          title={isReference ? "Hapus referensi visual" : "Gunakan sebagai referensi visual"}
                          aria-label={isReference ? "Hapus referensi visual" : "Gunakan sebagai referensi visual"}
                        >
                          <Clapperboard size={14} />
                        </button>
                      )}
                      {asset.type.startsWith("image/") && (
                        <button
                          className={`asset-use ${isCharacter ? "is-selected" : ""}`}
                          onClick={() => updateProject("characterAssetId", isCharacter ? "" : asset.id)}
                          title={isCharacter ? "Hapus referensi karakter" : "Gunakan sebagai referensi karakter"}
                        >
                          <UserRound size={14} />
                        </button>
                      )}
                      {asset.type.startsWith("audio/") && (
                        <button
                          className={`asset-use ${isAudio ? "is-selected" : ""}`}
                            onClick={() => {
                              updateProject("audioId", isAudio ? "" : asset.id);
                              updateProject("audioNarration", "");
                            }}
                          title={isAudio ? "Hapus audio" : "Gunakan sebagai audio"}
                        >
                          <Music2 size={14} />
                        </button>
                      )}
                      <button className="asset-delete" onClick={() => removeAsset(asset)} aria-label={`Hapus ${asset.name}`} title="Hapus aset">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="empty-assets"><AudioLines size={17} /><span>Aset tersimpan lokal di browser; gambar karakter dan frame referensi terpilih saja yang dikirim ke AI.</span></div>
          )}
          </details>
        </aside>

        <section className="preview-column">
          <div className="preview-header">
            <div className="section-heading">
              <div className="section-icon"><MonitorPlay size={17} /></div>
              <div><h2>Preview video</h2><p>Draft dan subtitle langsung terlihat di sini.</p></div>
            </div>
            <label className="format-select">
              <span>{project.format === "portrait" ? "9:16 · Portrait" : "16:9 · Landscape"}</span>
              <ChevronDown size={14} />
              <select value={project.format} onChange={(event) => updateProject("format", event.target.value)} aria-label="Format video">
                <option value="portrait">9:16 · Portrait</option>
                <option value="landscape">16:9 · Landscape</option>
              </select>
            </label>
          </div>

          <div className="panel idea-panel">
            <div className="brief-heading">
              <span className="mini-eyebrow"><WandSparkles size={12} /> MULAI DI SINI</span>
              <span className="brief-helper">Tulis ide singkat atau tempel naskah. Draft dan subtitle siap dipreview tanpa voice berbayar.</span>
            </div>
            <div className="creation-mode-tabs" role="group" aria-label="Pilih cara mulai video">
              <button
                type="button"
                className={`creation-mode-tab ${project.creationMode === "idea" ? "is-active" : ""}`}
                aria-pressed={project.creationMode === "idea"}
                onClick={() => updateProject("creationMode", "idea")}
              >
                <WandSparkles size={14} /> Dari ide
              </button>
              <button
                type="button"
                className={`creation-mode-tab ${project.creationMode === "script" ? "is-active" : ""}`}
                aria-pressed={project.creationMode === "script"}
                onClick={() => updateProject("creationMode", "script")}
              >
                <MessageSquareText size={14} /> Naskah sendiri
              </button>
            </div>
            {project.creationMode === "idea" ? (
              <label className="edit-field">
                <span>PROMPT CERITA</span>
                <textarea
                  className="text-input"
                  rows={3}
                  maxLength={5000}
                  value={project.brief}
                  onChange={(event) => updateProject("brief", event.target.value)}
                  placeholder={`Tulis prompt bebas: topik, konflik, gaya, atau ending yang kamu mau. ${aiProviderLabel} akan mengembangkannya jadi cerita dan adegan.`}
                />
                <small className="field-note">Sudah punya naskah lengkap? Pilih “Naskah sendiri” supaya kata-katamu dipakai apa adanya.</small>
              </label>
            ) : null}
            <details className="advanced-creation-options">
              <summary><span>Opsi tambahan</span><small>Template, referensi, dan gaya video</small><ChevronDown size={14} /></summary>
            <label className="edit-field guided-wide">
              <span>REFERENSI VISUAL VIDEO <b>OPSIONAL</b></span>
              <input
                className="text-input"
                type="url"
                value={project.referenceVideoUrl}
                onChange={(event) => updateProject("referenceVideoUrl", event.target.value)}
                placeholder="Link video langsung MP4/WebM atau link YouTube/TikTok/Reels"
              />
              <small className="field-note">
                {project.referenceAssetId
                  ? `Aset terpilih: ${assets.find((asset) => asset.id === project.referenceAssetId)?.name || "tidak ditemukan"}. `
                  : ""}
                Video langsung dibaca sebagai maksimal 3 frame gaya visual. Untuk link YouTube/TikTok/Reels, pilih video atau screenshot dari Asset library. Referensi dikirim ke AI saat membuat cerita/gambar.
              </small>
            </label>
            <label className="upload-zone reference-upload-zone">
              <input type="file" accept="image/*,video/*" onChange={handleReferenceUpload} />
              <span className="upload-icon"><Clapperboard size={16} /></span>
              <span className="upload-copy">
                <strong>
                  {project.referenceAssetId
                    ? `Ganti referensi · ${assets.find((asset) => asset.id === project.referenceAssetId)?.name || "file tidak ditemukan"}`
                    : "Upload video atau screenshot"}
                </strong>
                <small>Video max 150 MB / 5 menit · maks. 3 frame dipakai sebagai acuan visual</small>
              </span>
              <ArrowDownToLine className="upload-arrow" size={16} />
            </label>
            </details>
            {project.creationMode === "idea" ? (
              <>
            <details className="brief-options">
              <summary><span>Atur gaya & template</span><small>Opsional</small><ChevronDown size={14} /></summary>
            <div className="starter-templates">
              <div className="starter-heading">
                <span className="mini-eyebrow">BELUM ADA IDE? PILIH TEMPLATE</span>
                <span>Template cuma mengisi brief—karakter lo nggak diubah.</span>
              </div>
              <div className="starter-grid">
                {STARTER_TEMPLATES.map((template) => (
                  <button
                    className="starter-card"
                    key={template.id}
                    type="button"
                    onClick={() => applyStarterTemplate(template)}
                    aria-label={`Pakai template ${template.title}`}
                  >
                    <strong>{template.title}</strong>
                    <span>{template.description}</span>
                    <small>{template.durationSeconds} detik · {template.platform === "instagram-reels" ? "Reels" : template.platform === "youtube-shorts" ? "Shorts" : template.platform === "personal-brand" ? "Personal brand" : template.platform === "tiktok" ? "TikTok" : "Video"}</small>
                  </button>
                ))}
              </div>
            </div>
            <div className="guided-grid">
              <label className="edit-field">
                <span>TUJUAN VIDEO</span>
                <select className="text-input" value={project.goal} onChange={(event) => updateProject("goal", event.target.value)}>
                  <option value="storytelling">Storytelling</option>
                  <option value="education">Edukasi</option>
                  <option value="entertainment">Hiburan</option>
                  <option value="promotion">Promosi</option>
                  <option value="personal-brand">Personal brand</option>
                </select>
              </label>
              <label className="edit-field">
                <span>UNTUK SIAPA?</span>
                <input className="text-input" maxLength={300} value={project.audience} onChange={(event) => updateProject("audience", event.target.value)} placeholder="Contoh: anak muda yang suka cerita ringan" />
              </label>
              <label className="edit-field">
                <span>PLATFORM</span>
                <select className="text-input" value={project.platform} onChange={(event) => updateProject("platform", event.target.value)}>
                  <option value="instagram-reels">Instagram Reels</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube-shorts">YouTube Shorts</option>
                  <option value="youtube">YouTube</option>
                  <option value="general">Umum / lainnya</option>
                </select>
              </label>
              <label className="edit-field">
                <span>GAYA VISUAL</span>
                <select className="text-input" value={project.visualStyle} onChange={(event) => updateProject("visualStyle", event.target.value)}>
                  <option value="playful-editorial">Playful editorial</option>
                  <option value="cinematic">Sinematik</option>
                  <option value="minimal">Minimal</option>
                  <option value="comic">Komik</option>
                  <option value="warm-documentary">Dokumenter hangat</option>
                </select>
              </label>
              <label className="edit-field guided-wide">
                <span>AJAKAN / CTA <b>OPSIONAL</b></span>
                <input className="text-input" maxLength={300} value={project.callToAction} onChange={(event) => updateProject("callToAction", event.target.value)} placeholder="Contoh: Follow buat cerita berikutnya" />
              </label>
            </div>
            </details>
            <div className="idea-footer">
              <span>Prompt → {aiProviderLabel} → visual stock gratis → voice/subtitle → motion → preview. Hasil stock teratas dipilih; bisa diganti. {aiProviderLabel} & ElevenLabs memakai kuota.</span>
              <button
                className="button button-primary button-small"
                onClick={generateCompleteVideo}
                disabled={generatingCompleteVideo || generatingImages || generatingStory || generatingMotion || generatingSpeech || !loaded}
              >
                {generatingCompleteVideo ? <LoaderCircle className="loading-spinner-icon" size={14} /> : <WandSparkles size={14} />}
                {generatingCompleteVideo ? completeVideoStage || "Menyiapkan video..." : "Buat video lengkap"}
              </button>
              <button
                type="button"
                className="button button-quiet button-small"
                onClick={() => generateStory()}
                disabled={generatingCompleteVideo || generatingImages || generatingStory || generatingMotion || generatingSpeech || !loaded}
              >
                Draft saja
              </button>
            </div>
            {generatingCompleteVideo && (
              <small className="pipeline-progress" role="status">
                Sedang {completeVideoStage || "menyiapkan video"}. Jangan tutup tab; hasil parsial akan tetap tersimpan jika ada langkah yang gagal.
              </small>
            )}
              </>
            ) : (
              <div className="manual-script-panel">
                <label className="edit-field">
                  <span>NASKAH UCAPAN KARAKTER <b>{project.narration.length}/5000</b></span>
                  <textarea
                    className="text-input"
                    rows={6}
                    maxLength={5000}
                    value={project.narration}
                    onChange={(event) => updateProject("narration", event.target.value)}
                    placeholder="Tempel naskah final lo di sini. Kalimat/paragraf akan disusun menjadi beat adegan; kata-katanya tetap milik lo."
                  />
                </label>
                <div className="manual-script-actions">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={generateCompleteVideo}
                    disabled={generatingCompleteVideo || generatingImages || generatingSpeech || generatingStory || generatingMotion || !project.narration.trim()}
                  >
                    {generatingCompleteVideo ? <LoaderCircle className="loading-spinner-icon" size={14} /> : <Clapperboard size={14} />}
                    {generatingCompleteVideo ? completeVideoStage || "Menyiapkan video..." : "Generate video dari naskah"}
                  </button>
                  <button
                    type="button"
                    className="button button-quiet button-small"
                    onClick={() => createOwnScriptScenes()}
                    disabled={generatingCompleteVideo || generatingImages || generatingSpeech || generatingStory || generatingMotion || !project.narration.trim()}
                  >
                    Susun draft saja
                  </button>
                </div>
                <small className="manual-script-note">Naskahmu dipakai apa adanya; Framefolk mencari visual stock, membuat voice/subtitle dan motion, lalu menyiapkan preview. Voice/AI memakai kuota.</small>
                {generatingCompleteVideo && (
                  <small className="pipeline-progress" role="status">
                    Sedang {completeVideoStage || "menyiapkan video"}. Hasil yang sudah selesai tetap tersimpan jika ada langkah yang gagal.
                  </small>
                )}
              </div>
            )}
            <details className="content-preferences">
              <summary>
                <span><WandSparkles size={13} /> Preferensi hasil</span>
                <small>Disimpan bersama project · bikin output lebih khas lo</small>
                <ChevronDown size={14} />
              </summary>
              <div className="preference-grid">
                <label className="edit-field">
                  <span>GAYA NULIS</span>
                  <select className="text-input" value={contentPreferences.writingStyle} onChange={(event) => updateContentPreference("writingStyle", event.target.value)}>
                    <option value="conversational">Percakapan natural</option>
                    <option value="direct">To the point</option>
                    <option value="warm-story">Storytelling hangat</option>
                    <option value="documentary">Dokumenter / informatif</option>
                  </select>
                </label>
                <label className="edit-field">
                  <span>ENERGI</span>
                  <select className="text-input" value={contentPreferences.energy} onChange={(event) => updateContentPreference("energy", event.target.value)}>
                    <option value="calm">Tenang</option>
                    <option value="balanced">Seimbang</option>
                    <option value="high">Enerjik</option>
                  </select>
                </label>
                <label className="edit-field">
                  <span>HUMOR</span>
                  <select className="text-input" value={contentPreferences.humor} onChange={(event) => updateContentPreference("humor", event.target.value)}>
                    <option value="none">Serius, tanpa humor</option>
                    <option value="light">Humor tipis</option>
                    <option value="playful">Playful</option>
                    <option value="dry">Dry humor</option>
                  </select>
                </label>
                <label className="edit-field preference-wide">
                  <span>HINDARI KATA / KALIMAT KLISÉ <b>OPSIONAL</b></span>
                  <input
                    className="text-input"
                    maxLength={500}
                    value={contentPreferences.avoidPhrases}
                    onChange={(event) => updateContentPreference("avoidPhrases", event.target.value)}
                    placeholder="Contoh: pernah nggak sih, di era sekarang, yuk..."
                  />
                </label>
              </div>
              <small>Untuk mode naskah sendiri, teks yang lo tulis nggak akan diubah AI.</small>
            </details>
          </div>

          <div className={`preview-stage ${project.format === "landscape" ? "landscape" : ""}`}>
            <div className="preview-frame">
              <Player
                component={PromoComposition}
                inputProps={playerProps}
                durationInFrames={Number.isSafeInteger(durationInFrames) ? durationInFrames : 450}
                compositionWidth={width}
                compositionHeight={height}
                fps={30}
                numberOfSharedAudioTags={27}
                controls
                clickToPlay
                style={{ width: "100%", height: "100%" }}
              />
            </div>
          </div>

          <div className="preview-caption">
            <div className="preview-caption-left"><span className="status-dot" /> LIVE PREVIEW <span className="caption-divider">·</span> {formatDuration(timelineDurationSeconds)}</div>
            <span>{width} × {height}</span>
          </div>

          <details className="advanced-panel edit-panel-details">
            <summary><span>Setelan video</span><small>Judul, durasi, subtitle, dan audio</small><ChevronDown size={14} /></summary>
          <div className="panel edit-panel">
            <div className="edit-panel-top">
              <div><span className="mini-eyebrow">EDIT WITHOUT A NEW PROMPT</span><h3>Atur adegannya</h3></div>
              <span className="edit-badge"><Check size={12} /> LIVE</span>
            </div>
            <div className="edit-grid">
              <label className="edit-field edit-field-wide">
                <span>JUDUL VIDEO</span>
                <input className="text-input" value={project.title} onChange={(event) => updateProject("title", event.target.value)} />
              </label>
              <label className="edit-field">
                <span>DURASI VIDEO <b>{formatDuration(Number(project.durationSeconds))}</b></span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={project.durationSeconds}
                  aria-label="Durasi video dalam detik"
                  onChange={(event) => {
                    const seconds = Number(event.target.value);
                    setVideoDuration(seconds);
                  }}
                />
                <small className="field-note">Detik · tidak ada batas menit. Render panjang butuh waktu/ruang disk lebih besar.</small>
              </label>
              <label className="edit-field edit-field-wide">
                <span>TEKS PENDAMPING</span>
                <textarea className="text-input" rows={2} value={project.subtitle} onChange={(event) => updateProject("subtitle", event.target.value)} />
              </label>
              <label className="edit-field">
                <span>WARNA AKSEN</span>
                <div className="color-control">
                  <input type="color" value={project.accent} onChange={(event) => updateProject("accent", event.target.value)} />
                  <code>{project.accent.toUpperCase()}</code>
                </div>
              </label>
              {audioAsset ? (
                <label className="edit-field edit-field-wide audio-control">
                  <span><Music2 size={12} /> VOLUME MUSIK LATAR <b>{project.audioVolume}%</b></span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={project.audioVolume}
                    onChange={(event) => updateProject("audioVolume", Number(event.target.value))}
                    style={{ "--range-progress": `${project.audioVolume}%` }}
                  />
                </label>
              ) : (
                <div className="audio-hint"><FileAudio2 size={15} /> Musik latar opsional; subtitle tampil dari ucapan karakter meski tanpa audio.</div>
              )}
              {project.scenes.some((scene) => scene.voiceAssetId) && (
                <label className="edit-field edit-field-wide audio-control">
                  <span><Mic2 size={12} /> VOLUME VOICE-OVER <b>{project.voiceVolume ?? 100}%</b></span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={project.voiceVolume ?? 100}
                    onChange={(event) => updateProject("voiceVolume", Number(event.target.value))}
                    style={{ "--range-progress": `${project.voiceVolume ?? 100}%` }}
                  />
                </label>
              )}
              {project.scenes.length > 0 && (
                <label className="edit-field edit-field-wide audio-control">
                  <span><AudioLines size={12} /> SFX ADEGAN <b>{project.sfxVolume ?? 22}%</b></span>
                  <input
                    type="range"
                    min="0"
                    max="60"
                    value={project.sfxVolume ?? 22}
                    onChange={(event) => updateProject("sfxVolume", Number(event.target.value))}
                    style={{ "--range-progress": `${((project.sfxVolume ?? 22) / 60) * 100}%` }}
                  />
                  <small className="field-note">Efek whoosh, pop, dan sparkle otomatis mengikuti pergantian adegan. Geser ke 0 untuk mute.</small>
                </label>
              )}
            </div>
          </div>
          </details>

          {project.scenes.length > 0 && (
            <details className="advanced-panel scene-editor-details">
              <summary><span>Visual & edit adegan</span><small>{project.scenes.length} adegan · semua opsi</small><ChevronDown size={14} /></summary>
            <div className="panel scenes-panel">
              <div className="scenes-heading">
                <div><span className="mini-eyebrow">{project.creationMode === "script" ? "NASKAH LO" : "HASIL AI"} · AUTO-SAVE</span><h3>{project.scenes.length} adegan · siap diedit</h3></div>
                <button
                  className="button button-quiet button-small"
                  onClick={() => project.creationMode === "script" ? createOwnScriptScenes() : generateStory()}
                  disabled={generatingStory || generatingMotion || generatingSpeech}
                >
                  {project.creationMode === "script" ? <Clapperboard size={13} /> : <WandSparkles size={13} />}
                  {project.creationMode === "script" ? "Susun ulang" : "Generate ulang"}
                </button>
              </div>
              <div className="revision-tools">
                <div className="quick-revision-row">
                  {QUICK_REVISIONS.map((revision) => (
                    <button
                      className="button button-quiet button-small"
                      key={revision.label}
                      onClick={() => reviseStory(revision.instruction, revisionTarget === "all" ? null : Number(revisionTarget))}
                      disabled={revisingStory || generatingStory || generatingMotion}
                    >
                      {revisingStory ? <LoaderCircle className="loading-spinner-icon" size={12} /> : null}
                      {revision.label}
                    </button>
                  ))}
                </div>
                <div className="revision-custom-row">
                  <select className="text-input" value={revisionTarget} onChange={(event) => setRevisionTarget(event.target.value)} aria-label="Pilih cakupan revisi">
                    <option value="all">Seluruh cerita</option>
                    {project.scenes.map((scene, index) => <option value={index} key={scene.id}>Adegan {index + 1}</option>)}
                  </select>
                  <input
                    className="text-input"
                    value={revisionInstruction}
                    onChange={(event) => setRevisionInstruction(event.target.value)}
                    maxLength={500}
                    placeholder="Minta revisi, misalnya: opening lebih kuat"
                  />
                  <button
                    className="button button-primary button-small"
                    onClick={() => reviseStory(revisionInstruction, revisionTarget === "all" ? null : Number(revisionTarget))}
                    disabled={revisingStory || generatingStory || generatingMotion || !revisionInstruction.trim()}
                  >
                    {revisingStory ? "Merevisi..." : "Revisi"}
                  </button>
                </div>
                <small className="revision-note">Revisi AI memakai API lagi; edit manual tetap gratis dan langsung tersimpan.</small>
              </div>
              <div className="motion-design-tools">
                <div>
                  <span className="mini-eyebrow">AI MOTION DESIGN</span>
                  <small>AI hanya merancang grafis bergerak; naskah dan voice-over nggak diubah.</small>
                </div>
                <button
                  type="button"
                  className="button button-primary button-small"
                  onClick={generateSceneMotion}
                  disabled={generatingImages || generatingMotion || generatingStory || generatingSpeech || project.scenes.length < 2}
                >
                  {generatingMotion ? <LoaderCircle className="loading-spinner-icon" size={13} /> : <WandSparkles size={13} />}
                  {generatingMotion ? "Merancang motion..." : "Rancang motion AI"}
                </button>
              </div>
              <div className="timeline-panel">
                <div className="timeline-heading">
                  <div>
                    <span className="mini-eyebrow">TIMELINE VIDEO · {formatDuration(timelineDurationSeconds)}</span>
                    <small>Visual, subtitle, dan jeda tersusun per adegan.</small>
                  </div>
                  <span>{project.scenes.filter((scene) => scene.voiceAssetId).length}/{project.scenes.length} voice</span>
                </div>
                <div className="timeline-track" aria-label="Ringkasan urutan adegan">
                  {sceneTimeline.map((scene) => (
                    <div
                      className="timeline-track-item"
                      key={scene.id}
                      style={{ flexGrow: Math.max(scene.activeDuration + scene.pauseAfterSeconds, 0.5) }}
                    >
                      <span style={{ flexGrow: Math.max(scene.activeDuration, 0.5) }} title={`${scene.label} · ${formatDuration(Math.round(scene.activeDuration))}`}>
                        {scene.index + 1}
                      </span>
                      {scene.pauseAfterSeconds > 0 && (
                        <i style={{ flexGrow: scene.pauseAfterSeconds }} title={`Jeda ${scene.pauseAfterSeconds.toFixed(1)} dtk`} />
                      )}
                    </div>
                  ))}
                </div>
                <small className="timeline-footnote">Jeda menahan visual antaradegan. Durasi slot otomatis memanjang jika voice-over lebih panjang.</small>
              </div>
              <div className="scene-list">
                {project.scenes.map((scene, index) => (
                  <div className="scene-card" key={scene.id}>
                    <span className="scene-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="scene-fields">
                      <div className="scene-timing-summary">
                        <span>{formatDuration(Math.floor(sceneTimeline[index].startSeconds))} – {formatDuration(Math.ceil(sceneTimeline[index].endSeconds))}</span>
                        <span className={scene.voiceAssetId ? "voice-ready" : "voice-missing"}>
                          {scene.voiceAssetId ? `Voice ${Number(scene.voiceDurationSeconds || 0).toFixed(1)} dtk` : "Subtitle saja"}
                        </span>
                      </div>
                      <div className="scene-image-action">
                        <span className={scene.visualAssetId ? "voice-ready" : "voice-missing"}>
                          {scene.visualAssetId ? "Visual terpasang" : "Belum ada visual"}
                        </span>
                        <button
                          type="button"
                          className="button button-quiet button-small"
                          onClick={() => openStockSearch(scene)}
                          disabled={searchingStock || importingStockId !== null}
                        >
                          <Search size={12} />
                          Cari stock gratis
                        </button>
                        <button
                          type="button"
                          className="button button-quiet button-small"
                          onClick={() => generateSceneImages([scene.id])}
                          disabled={
                            generatingImages ||
                            generatingStory ||
                            generatingSpeech ||
                            generatingMotion ||
                            !aiStatus?.geminiImageConfigured
                          }
                        >
                          {generatingImages && imageProgress?.activeSceneId === scene.id
                            ? <LoaderCircle className="loading-spinner-icon" size={12} />
                            : <ImagePlus size={12} />}
                          {scene.visualAssetId
                            ? assets.find((asset) => asset.id === scene.visualAssetId)?.generatedBy === "gemini-image"
                              ? "Generate ulang AI · berbayar"
                              : "Ganti dengan AI · berbayar"
                            : "Gambar AI · berbayar"}
                        </button>
                      </div>
                      {assets.find((asset) => asset.id === scene.visualAssetId)?.source?.provider === "pexels" && (
                        <a
                          className="asset-credit"
                          href={assets.find((asset) => asset.id === scene.visualAssetId).source.photoUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Photo by {assets.find((asset) => asset.id === scene.visualAssetId).source.photographer} on Pexels
                        </a>
                      )}
                      {stockSearch.sceneId === scene.id && (
                        <div className="stock-search-panel">
                          <div className="stock-search-heading">
                            <div>
                              <span className="mini-eyebrow">CARI VISUAL ADEGAN</span>
                              <small>Pilih hasil yang cocok; foto diunduh setelah kamu klik “Pakai foto”.</small>
                            </div>
                            <a href="https://www.pexels.com" target="_blank" rel="noreferrer">
                              Photos provided by Pexels
                            </a>
                          </div>
                          {!aiStatus?.pexelsConfigured && (
                            <small className="stock-search-note">
                              Pencarian belum aktif. Admin perlu mengatur <code>PEXELS_API_KEY</code> di server.
                            </small>
                          )}
                          <div className="stock-search-form">
                            <input
                              className="text-input"
                              value={stockSearch.query}
                              maxLength={200}
                              onChange={(event) => setStockSearch((current) => ({ ...current, query: event.target.value }))}
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  searchStockPhotos();
                                }
                              }}
                              placeholder="Contoh: young designer working at a desk"
                              aria-label={`Kata kunci stock untuk ${scene.label || `adegan ${index + 1}`}`}
                            />
                            <button
                              type="button"
                              className="button button-primary button-small"
                              onClick={searchStockPhotos}
                              disabled={searchingStock || !aiStatus?.pexelsConfigured}
                            >
                              {searchingStock ? <LoaderCircle className="loading-spinner-icon" size={13} /> : <Search size={13} />}
                              {searchingStock ? "Mencari..." : "Cari"}
                            </button>
                            <button
                              type="button"
                              className="button button-quiet button-small"
                              onClick={() => setStockSearch({ sceneId: "", query: "", photos: [] })}
                            >
                              Tutup
                            </button>
                          </div>
                          {stockSearch.photos.length > 0 && (
                            <div className="stock-search-grid">
                              {stockSearch.photos.map((photo) => (
                                <article className="stock-result-card" key={photo.id}>
                                  <img src={photo.imageUrl} alt={photo.alt || `Foto oleh ${photo.photographer}`} loading="lazy" />
                                  <div className="stock-result-details">
                                    <a href={photo.pexelsUrl} target="_blank" rel="noreferrer">
                                      Foto oleh {photo.photographer}
                                    </a>
                                    <button
                                      type="button"
                                      className="button button-quiet button-small"
                                      onClick={() => importStockPhoto(photo, scene)}
                                      disabled={importingStockId !== null}
                                    >
                                      {importingStockId === photo.id
                                        ? <LoaderCircle className="loading-spinner-icon" size={12} />
                                        : <ImagePlus size={12} />}
                                      Pakai foto
                                    </button>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                      <label className="edit-field">
                        <span>{scene.label || `ADEGAN ${index + 1}`}</span>
                        <input
                          className="text-input"
                          value={scene.onScreenText}
                          onChange={(event) => updateScene(scene.id, "onScreenText", event.target.value)}
                        />
                      </label>
                      <label className="edit-field">
                        <span>UCAPAN KARAKTER · SUBTITLE</span>
                        <textarea
                          className="text-input"
                          rows={2}
                          value={scene.narration}
                          onChange={(event) => updateScene(scene.id, "narration", event.target.value)}
                        />
                      </label>
                      <label className="edit-field">
                        <span>ARAH VISUAL · {scene.visualType || "hero"} / {scene.motionPreset || "rise"}</span>
                        <textarea
                          className="text-input"
                          rows={2}
                          value={scene.visualDescription}
                          onChange={(event) => updateScene(scene.id, "visualDescription", event.target.value)}
                        />
                      </label>
                      <div className="scene-design-controls">
                        <label className="edit-field">
                          <span>LAYOUT</span>
                          <select className="text-input" value={scene.visualType || "hero"} onChange={(event) => updateScene(scene.id, "visualType", event.target.value)}>
                            <option value="hero">Hero</option>
                            <option value="split">Split</option>
                            <option value="quote">Quote</option>
                            <option value="punchline">Punchline</option>
                            <option value="cinematic">Cinematic</option>
                            <option value="sticker">Sticker pop</option>
                            <option value="poster">Poster</option>
                          </select>
                        </label>
                        <label className="edit-field">
                          <span>ASET ADEGAN</span>
                          <select
                            className="text-input"
                            value={scene.visualAssetId || ""}
                            onChange={(event) => updateScene(scene.id, "visualAssetId", event.target.value)}
                          >
                            <option value="">Pakai background utama</option>
                            {assets.filter((asset) => asset.type.startsWith("image/") || asset.type.startsWith("video/")).map((asset) => (
                              <option value={asset.id} key={asset.id}>{asset.name}</option>
                            ))}
                          </select>
                        </label>
                        <label className="edit-field">
                          <span>GERAK</span>
                          <select className="text-input" value={scene.motionPreset || "rise"} onChange={(event) => updateScene(scene.id, "motionPreset", event.target.value)}>
                            <option value="rise">Rise</option>
                            <option value="drift">Drift</option>
                            <option value="zoom">Zoom</option>
                            <option value="pop">Pop</option>
                            <option value="reveal">Reveal</option>
                          </select>
                        </label>
                      </div>
                      <div className="scene-motion-controls">
                        <label className="edit-field">
                          <span>MOTION GRAPHICS · {scene.motionStyle ? SCENE_MOTION_LABELS[scene.motionStyle] || scene.motionStyle : "Orbit"}</span>
                          <select
                            className="text-input"
                            value={scene.motionStyle || "orbit"}
                            onChange={(event) => updateScene(scene.id, "motionStyle", event.target.value)}
                          >
                            {SCENE_MOTION_STYLES.map((style) => <option value={style} key={style}>{SCENE_MOTION_LABELS[style]}</option>)}
                          </select>
                        </label>
                        <label className="edit-field">
                          <span>INTENSITAS · {scene.motionIntensity || 2}/3</span>
                          <select
                            className="text-input"
                            value={scene.motionIntensity || 2}
                            onChange={(event) => updateScene(scene.id, "motionIntensity", Number(event.target.value))}
                          >
                            <option value={1}>1 · Halus</option>
                            <option value={2}>2 · Energik</option>
                            <option value={3}>3 · Ekspresif</option>
                          </select>
                        </label>
                        <label className="edit-field">
                          <span>TEKS MOTION</span>
                          <input
                            className="text-input"
                            maxLength={48}
                            value={scene.motionText || scene.onScreenText}
                            onChange={(event) => updateScene(scene.id, "motionText", event.target.value)}
                          />
                        </label>
                      </div>
                      <div className="scene-motion-controls">
                        <label className="edit-field">
                          <span>KATA FOKUS</span>
                          <input
                            className="text-input"
                            maxLength={32}
                            value={scene.motionEmphasis || scene.onScreenText.split(/\s+/)[0] || ""}
                            onChange={(event) => updateScene(scene.id, "motionEmphasis", event.target.value)}
                          />
                        </label>
                        <label className="edit-field">
                          <span>ARAH GERAK</span>
                          <select
                            className="text-input"
                            value={scene.motionDirection || "center"}
                            onChange={(event) => updateScene(scene.id, "motionDirection", event.target.value)}
                          >
                            <option value="left">Dari kiri</option>
                            <option value="right">Dari kanan</option>
                            <option value="up">Dari atas</option>
                            <option value="down">Dari bawah</option>
                            <option value="center">Dari tengah</option>
                          </select>
                        </label>
                        <label className="edit-field">
                          <span>RITME MASUK</span>
                          <select
                            className="text-input"
                            value={scene.motionTempo || "steady"}
                            onChange={(event) => updateScene(scene.id, "motionTempo", event.target.value)}
                          >
                            <option value="deliberate">Dramatis</option>
                            <option value="steady">Terukur</option>
                            <option value="rapid">Cepat / impact</option>
                          </select>
                        </label>
                      </div>
                      <div className="scene-motion-controls">
                        <label className="edit-field">
                          <span>TRANSISI MASUK</span>
                          <select
                            className="text-input"
                            value={scene.motionEntrance || "rise"}
                            onChange={(event) => updateScene(scene.id, "motionEntrance", event.target.value)}
                          >
                            {SCENE_MOTION_ENTRANCES.map((entrance) => (
                              <option value={entrance} key={entrance}>{SCENE_MOTION_ENTRANCE_LABELS[entrance]}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <div className="scene-timing-controls">
                        <label className="edit-field">
                          <span>DURASI ADEGAN · {sceneActiveDuration(scene).toFixed(1)} dtk</span>
                          <input
                            className="text-input"
                            type="number"
                            min="0.5"
                            max="3600"
                            step="0.5"
                            value={scene.durationSeconds ?? estimateSpeechDuration(scene.narration).toFixed(1)}
                            onChange={(event) => {
                              const durationSeconds = Number(event.target.value);
                              if (Number.isFinite(durationSeconds) && durationSeconds >= 0.5 && durationSeconds <= 3600) {
                                updateScene(scene.id, "durationSeconds", durationSeconds);
                              }
                            }}
                          />
                        </label>
                        <label className="edit-field">
                          <span>JEDA SETELAHNYA · {scenePause(scene).toFixed(1)} dtk</span>
                          <input
                            className="text-input"
                            type="number"
                            min="0"
                            max="5"
                            step="0.1"
                            value={scene.pauseAfterSeconds ?? 0}
                            onChange={(event) => {
                              const pauseAfterSeconds = Number(event.target.value);
                              if (Number.isFinite(pauseAfterSeconds) && pauseAfterSeconds >= 0 && pauseAfterSeconds <= 5) {
                                updateScene(scene.id, "pauseAfterSeconds", pauseAfterSeconds);
                              }
                            }}
                          />
                        </label>
                      </div>
                      <div className="scene-voice-row">
                        {scene.voiceAssetId && assetUrls[scene.voiceAssetId] ? (
                          <audio className="scene-audio-preview" controls preload="none" src={assetUrls[scene.voiceAssetId]}>
                            Browser tidak mendukung preview audio.
                          </audio>
                        ) : (
                          <span>Audio adegan muncul di sini setelah dibuat.</span>
                        )}
                        <button
                          className="button button-quiet button-small"
                          onClick={() => regenerateSceneSpeech(scene)}
                          disabled={
                            generatingSpeech ||
                            loadingVoices ||
                            voices.length === 0 ||
                            !project.ttsVoiceId ||
                            !elevenLabsUsage ||
                            countCharacters(scene.narration) > elevenLabsUsage.remainingCharacters
                          }
                        >
                          {generatingSpeech ? <LoaderCircle className="loading-spinner-icon" size={12} /> : <Mic2 size={12} />}
                          {generatingSpeech ? "Membuat voice..." : `Generate voice · ${countCharacters(scene.narration).toLocaleString("id-ID")} karakter`}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            </details>
          )}

          <details className="advanced-panel voice-details">
            <summary><span>Voice-over & kuota</span><small>Cek karakter tersisa sebelum generate</small><ChevronDown size={14} /></summary>
          <div className="panel tts-panel">
            <div className="tts-heading">
              <span className="render-icon"><Mic2 size={16} /></span>
              <div><h3>Voice ElevenLabs</h3><p>Kuota dicek langsung dari akun. Aplikasi berhenti di batas karakter dan tidak memakai overage/top-up.</p></div>
              <button className="button button-quiet button-small" onClick={loadVoices} disabled={loadingVoices || !aiStatus?.elevenLabsConfigured}>
                {loadingVoices ? <LoaderCircle className="loading-spinner-icon" size={13} /> : <AudioLines size={13} />}
                {loadingVoices ? "Mengecek..." : "Cek voice & kuota"}
              </button>
            </div>
            <div className="elevenlabs-usage" role="status">
              {elevenLabsUsage ? (
                <>
                  <strong>
                    Sisa {elevenLabsUsage.remainingCharacters.toLocaleString("id-ID")} dari {elevenLabsUsage.characterLimit.toLocaleString("id-ID")} karakter
                  </strong>
                  <span>
                    Sudah terpakai {elevenLabsUsage.characterCount.toLocaleString("id-ID")}. Teks video ini {speechCharacters.toLocaleString("id-ID")} dari {MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")} karakter batas hemat.
                    {elevenLabsUsage.nextCharacterCountResetUnix
                      ? ` Reset ${new Date(elevenLabsUsage.nextCharacterCountResetUnix * 1000).toLocaleDateString("id-ID")}.`
                      : ""}
                  </span>
                </>
              ) : (
                <span>Kuota belum dicek. Tekan “Cek voice & kuota” sebelum membuat suara.</span>
              )}
              <small>Hard stop aktif: batas {MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")} karakter/video dan pengecekan kuota akun sebelum request. Pemakaian ElevenLabs tetap bisa bertambah jika voice dibuat ulang.</small>
            </div>
            <div className="tts-controls">
              <label className="edit-field">
                <span>PILIH KARAKTER SUARA</span>
                <select
                  className="text-input voice-select"
                  value={project.ttsVoiceId}
                  onChange={(event) => updateProject("ttsVoiceId", event.target.value)}
                  disabled={!voices.length}
                >
                  <option value="">{voices.length ? "Pilih voice Premade" : "Cek voice & kuota dulu"}</option>
                  {voices.map((voice) => (
                    <option value={voice.id} key={voice.id}>{voice.name}{voice.category ? ` · ${voice.category}` : ""}</option>
                  ))}
                </select>
                <small className="field-note">Hanya voice Premade yang tersedia untuk API dipilih otomatis; voice Library tidak akan dipakai.</small>
              </label>
              {selectedVoice?.previewUrl ? (
                <div className="voice-preview-control">
                  <span className="mini-eyebrow">CONTOH SUARA</span>
                  <audio controls preload="none" src={selectedVoice.previewUrl}>
                    Browser tidak mendukung preview audio.
                  </audio>
                </div>
              ) : null}
              <label className="edit-field">
                <span>GAYA PENYAMPAIAN VOICE</span>
                <select
                  className="text-input"
                  value={project.voiceDelivery || "natural"}
                  onChange={(event) => updateProject("voiceDelivery", event.target.value)}
                >
                  <option value="natural">Natural · stabil dan santai</option>
                  <option value="expressive">Ekspresif · lebih hidup</option>
                  <option value="calm">Tenang · lebih konsisten</option>
                </select>
                <small className="field-note">Pilih satu gaya, preview contoh suara, lalu generate. Pengaturan dipakai di setiap klip baru.</small>
              </label>
              {project.scenes.length === 0 && project.creationMode === "idea" ? (
                <label className="edit-field">
                  <span>NASKAH UCAPAN KARAKTER <b>{project.narration.length}/5000</b></span>
                  <textarea
                    className="text-input"
                    rows={3}
                    maxLength={5000}
                    value={project.narration}
                    onChange={(event) => updateProject("narration", event.target.value)}
                    placeholder={`Tulis naskah voice-over sendiri atau buat cerita dengan ${aiProviderLabel}.`}
                  />
                </label>
              ) : null}
              <button
                className="button button-primary tts-generate"
                onClick={generateSpeech}
                disabled={
                  !loaded ||
                  generatingSpeech ||
                  loadingVoices ||
                  voices.length === 0 ||
                  !project.ttsVoiceId ||
                  !elevenLabsUsage ||
                  speechQuotaExceeded ||
                  speechBudgetExceeded
                }
              >
                {generatingSpeech ? <LoaderCircle className="loading-spinner-icon" size={15} /> : <Mic2 size={15} />}
                {generatingSpeech ? "Membuat voice-over..." : speechQuotaExceeded
                  ? "Kuota ElevenLabs tidak cukup"
                  : speechBudgetExceeded
                    ? `Persingkat ke ${MAX_SPEECH_CHARACTERS.toLocaleString("id-ID")} karakter`
                  : `Buat voice-over · ${speechCharacters.toLocaleString("id-ID")} karakter`}
              </button>
            </div>
            <p className="tts-footnote">
              {project.scenes.length > 0
                ? "Voice dibuat berurutan per adegan; subtitle memakai timing aktual dari ElevenLabs."
                : "Voice-over dibuat dari naskah yang ada dan timing kata-katanya dipakai untuk subtitle."}
            </p>
          </div>
          </details>

          <div className="panel preflight-panel">
            <div className="preflight-heading">
              <span className={`render-icon ${preflightErrors.length ? "preflight-icon-error" : ""}`}><Check size={16} /></span>
              <div>
                <h3>Pemeriksaan sebelum render</h3>
                <p>{preflightErrors.length ? "Ada hal yang perlu dibetulkan sebelum render." : preflightWarnings.length ? "Bisa dirender; cek catatan ini untuk hasil yang lebih rapi." : "Draft siap dirender."}</p>
              </div>
              <span className={`preflight-count ${preflightErrors.length ? "has-errors" : ""}`}>
                {preflightErrors.length ? `${preflightErrors.length} perlu dibetulkan` : `${preflightWarnings.length} catatan`}
              </span>
            </div>
            {preflightChecks.length > 0 ? (
              <ul className="preflight-list">
                {preflightChecks.map((check, index) => (
                  <li className={`preflight-${check.level}`} key={`${check.level}-${index}`}>
                    <span>{check.level === "error" ? "×" : check.level === "warning" ? "!" : "i"}</span>
                    {check.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="preflight-clear">Naskah, adegan, timing, dan audio lolos pemeriksaan dasar.</p>
            )}
          </div>

          <div className="panel render-panel">
            <div className="render-panel-heading">
              <span className="render-icon"><Film size={17} /></span>
              <div><h3>Render versi final</h3><p>Editan dan aset terpilih langsung masuk ke MP4. Prompt tidak diperlukan.</p></div>
            </div>
            {renderJob && (
              <div className={`render-status ${renderJob.status === "failed" ? "render-status-error" : ""}`}>
                <div className="render-status-copy">
                  <span>{renderJob.message}</span>
                  {renderJob.status === "rendering" && <b>{renderJob.progress}%</b>}
                </div>
                {renderJob.status === "rendering" && (
                  <div className="render-progress" role="progressbar" aria-valuenow={renderJob.progress} aria-valuemin={0} aria-valuemax={100}>
                    <span style={{ width: `${renderJob.progress}%` }} />
                  </div>
                )}
              </div>
            )}
            {renderJob?.status === "completed" ? (
              <a className="button button-primary render-button" href={`/api/renders/${renderJob.id}/file`} download>
                <Download size={15} /> Unduh MP4
              </a>
            ) : (
              <button className="button button-primary render-button" onClick={renderVideo} disabled={!loaded || rendering || generatingCompleteVideo || preflightErrors.length > 0}>
                {rendering ? <span className="loading-spinner" /> : <Film size={15} />}
                {rendering ? "Merender..." : renderJob?.status === "failed" ? "Coba render lagi" : "Render & siapkan MP4"}
              </button>
            )}
          </div>

          {promptVisible && (
            <div className="panel prompt-panel">
              <div className="prompt-heading"><div><span className="mini-eyebrow">GEMINI PROMPT</span><h3>Siap dipakai di Gemini</h3></div><button className="icon-button" onClick={copyPrompt} title="Salin prompt"><Copy size={15} /></button></div>
              <textarea className="prompt-output" value={generatedPrompt} readOnly rows={13} aria-label="Prompt untuk Gemini" />
              <div className="prompt-footer">
                <span>Prompt berisi detail aset; lampirkan file-nya sendiri di Gemini bila perlu.</span>
                <button className="button button-primary button-small" onClick={openGemini}><ExternalLink size={14} /> Buka Gemini</button>
              </div>
            </div>
          )}
        </section>
      </section>

      <footer className="app-footer">
        <span><span className="footer-mark">f.</span> Bikin sekali. Ceritakan berkali-kali.</span>
        <span><Clapperboard size={13} /> Dibangun dengan Remotion</span>
      </footer>
    </main>
  );
};

export default App;
