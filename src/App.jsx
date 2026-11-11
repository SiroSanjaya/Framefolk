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
  Trash2,
  UserRound,
  WandSparkles,
} from "lucide-react";
import PromoComposition from "./remotion/compositions/Promo.jsx";
import { deleteAsset, getAssets, saveAsset } from "./lib/storage.js";

const STORAGE_KEY = "framefolk-project-v1";

const DEFAULT_PROJECT = {
  characterName: "Nara",
  characterDescription: "Teman cerita yang selalu punya sudut pandang berbeda.",
  characterTraits: "Ceria, observan, sedikit usil",
  characterVoice: "Hangat dan santai, tempo sedang, artikulasi jelas.",
  brief: "Bikin video pendek yang ngenalin karakter dan hal yang dia suka.",
  goal: "storytelling",
  audience: "",
  platform: "instagram-reels",
  visualStyle: "playful-editorial",
  callToAction: "",
  narration: "",
  scenes: [],
  characterAssetId: "",
  title: "Cerita yang terasa dekat.",
  subtitle: "Satu karakter. Banyak cerita. Tetap terasa seperti dirinya.",
  format: "portrait",
  durationSeconds: 15,
  accent: "#c1f17b",
  backgroundId: "",
  audioId: "",
  audioVolume: 70,
  voiceVolume: 100,
  audioNarration: "",
  ttsVoiceId: "",
};

const CLAUDE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/gif", "image/webp"]);
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

const getAssetIcon = (type) => {
  if (type.startsWith("image/")) return FileImage;
  if (type.startsWith("video/")) return FileVideo2;
  return FileAudio2;
};

const App = () => {
  const [project, setProject] = useState(DEFAULT_PROJECT);
  const [assets, setAssets] = useState([]);
  const [assetUrls, setAssetUrls] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  const [promptVisible, setPromptVisible] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [renderJob, setRenderJob] = useState(null);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [revisingStory, setRevisingStory] = useState(false);
  const [revisionTarget, setRevisionTarget] = useState("all");
  const [revisionInstruction, setRevisionInstruction] = useState("");
  const [loadingVoices, setLoadingVoices] = useState(false);
  const [generatingSpeech, setGeneratingSpeech] = useState(false);
  const [speechProgress, setSpeechProgress] = useState(null);
  const [voices, setVoices] = useState([]);
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const savedProject = localStorage.getItem(STORAGE_KEY);
        const savedAssets = await getAssets();
        if (!active) return;
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
        }
        setAssets(savedAssets);
      } catch (loadError) {
        console.error("Could not load the saved Framefolk project.", loadError);
        setError("Project atau library aset tidak bisa dibuka. Coba refresh; data lokal mungkin bermasalah.");
      } finally {
        if (active) setLoaded(true);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(project));
    } catch (saveError) {
      console.error("Could not save the Framefolk project.", saveError);
      setError("Perubahan project gagal disimpan di browser ini.");
    }
  }, [loaded, project]);

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
    setProject((current) => ({ ...current, [key]: value }));
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
  const timelineDurationSeconds = project.scenes.length
    ? Math.max(1, Math.ceil(getTimelineDuration(project.scenes)))
    : Number(project.durationSeconds);
  const durationInFrames = timelineDurationSeconds * 30;
  const preflightChecks = useMemo(() => {
    const checks = [];
    if (project.scenes.length === 0) {
      checks.push({ level: "warning", message: "Belum ada adegan hasil Claude; preview memakai komposisi default." });
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
    if (!project.audioId && !project.scenes.some((scene) => scene.voiceAssetId)) {
      checks.push({ level: "info", message: "Belum ada audio. Render tetap bisa dibuat tanpa suara." });
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
      audioVolume: Number(project.audioVolume) / 100,
      voiceVolume: Number(project.voiceVolume ?? 100) / 100,
      scenes: sceneTimeline.map((scene) => ({
        ...scene,
        voiceUrl: assetUrls[scene.voiceAssetId],
      })),
    }),
    [project, assetUrls, backgroundAsset, sceneTimeline],
  );

  const regenerateSceneSpeech = async (scene) => {
    if (generatingSpeech) return;
    if (!scene.narration.trim()) {
      setError("Isi narasi adegan dulu sebelum generate voice-over.");
      return;
    }
    setGeneratingSpeech(true);
    setError("");
    setNotice("");
    try {
      const voiceId = await ensureVoiceId();
      await createSpeechAsset(scene.narration, voiceId, scene.id);
      setNotice(`Voice-over adegan "${scene.label}" selesai dan tersinkron.`);
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
      setNotice("Prompt disalin. Buka Claude di tab lain dan paste prompt-nya.");
      setError("");
    } catch (copyError) {
      console.error("Could not copy the prompt to the clipboard.", copyError);
      setPromptVisible(true);
      setError("Clipboard tidak tersedia. Salin prompt dari kotak teks di bawah preview.");
    }
  };

  const openClaude = () => {
    window.open("https://claude.ai/new", "_blank", "noopener,noreferrer");
  };

  const addAssets = async (files, selectRole = "") => {
    const unsupported = files.filter(
      (file) =>
        !file.type.startsWith("image/") &&
        !file.type.startsWith("video/") &&
        !file.type.startsWith("audio/"),
    );
    if (unsupported.length > 0) {
      setError(`Format tidak didukung: ${unsupported.map((file) => file.name).join(", ")}.`);
    }
    const supported = files.filter((file) => !unsupported.includes(file));
    try {
      const newAssets = supported.map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        blob: file,
        addedAt: Date.now(),
      }));
      await Promise.all(newAssets.map(saveAsset));
      setAssets((current) => [...newAssets, ...current]);
      const selectedAsset = newAssets.find((asset) =>
        selectRole === "audio" ? asset.type.startsWith("audio/") : asset.type.startsWith("image/"),
      );
      if (selectedAsset && selectRole === "audio") {
        updateProject("audioId", selectedAsset.id);
        updateProject("audioNarration", "");
      }
      if (selectedAsset && selectRole === "character") {
        updateProject("characterAssetId", selectedAsset.id);
      }
      if (newAssets.length > 0) {
        setNotice(
          selectRole === "audio"
            ? "Audio berhasil ditambahkan dan langsung dipilih untuk video."
            : selectRole === "character"
              ? "Gambar karakter berhasil ditambahkan dan langsung dipilih."
              : `${newAssets.length} aset ditambahkan ke library browser.`,
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

  const buildStoryRequest = async (revision) => {
    const characterReference = assets.find((asset) => asset.id === project.characterAssetId);
    let referenceImage;
    if (characterReference && CLAUDE_IMAGE_TYPES.has(characterReference.type)) {
      if (characterReference.size > 5 * 1024 * 1024) {
        setNotice("Gambar karakter lebih dari 5 MB; Claude akan memakai character bible tanpa gambar.");
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
    return {
      brief: project.brief,
      goal: project.goal,
      audience: project.audience,
      platform: project.platform,
      visualStyle: project.visualStyle,
      callToAction: project.callToAction,
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
        role: assetRoles.get(asset.id) || "tersedia di library lokal",
      })),
      characterReference: referenceImage,
      revision,
    };
  };

  const requestStory = async (revision) => {
    const response = await fetch("/api/ai/story", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(await buildStoryRequest(revision)),
    });
    const story = await response.json();
    if (!response.ok) throw new Error(story.error || "Claude gagal membuat cerita.");
    return story;
  };

  const applyStory = (story) => {
    const scenes = story.scenes.map((scene, index, list) => ({
      ...scene,
      visualType: scene.visualType || "hero",
      motionPreset: scene.motionPreset || "rise",
      durationSeconds: estimateSpeechDuration(scene.narration),
      pauseAfterSeconds: index < list.length - 1 ? 0.35 : 0,
      voiceAssetId: "",
      voiceDurationSeconds: 0,
      id: crypto.randomUUID(),
    }));
    const timedScenes = distributeSceneDurations(scenes, Number(project.durationSeconds) || 15);
    setProject((current) => ({
      ...current,
      title: story.title,
      subtitle: story.opening,
      narration: story.narration,
      scenes: timedScenes,
      durationSeconds: Math.ceil(getTimelineDuration(timedScenes)),
      audioId: current.audioNarration ? "" : current.audioId,
      audioNarration: "",
    }));
    return timedScenes;
  };

  const ensureVoiceId = async () => {
    if (project.ttsVoiceId) return project.ttsVoiceId;
    const response = await fetch("/api/ai/voices");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Daftar voice ElevenLabs gagal dimuat.");
    setVoices(result.voices);
    const selectedVoice = result.voices.find((voice) => voice.id === result.defaultVoiceId) || result.voices[0];
    if (!selectedVoice) throw new Error("Belum ada voice di akun ElevenLabs. Pilih atau tambahkan voice, lalu coba lagi.");
    updateProject("ttsVoiceId", selectedVoice.id);
    return selectedVoice.id;
  };

  const createSpeechAsset = async (text, voiceId, sceneId) => {
    const response = await fetch("/api/ai/speech", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId }),
    });
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || "ElevenLabs gagal membuat voice-over.");
    }
    const blob = await response.blob();
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
    await saveAsset(asset);
    setAssets((current) => [asset, ...current]);
    setProject((current) => {
      if (!sceneId) return { ...current, audioId: asset.id, audioNarration: text };
      const scenes = current.scenes.map((scene) =>
        scene.id === sceneId
          ? {
              ...scene,
              voiceAssetId: asset.id,
              voiceDurationSeconds: durationSeconds,
              voiceText: text,
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

  const generateSceneVoices = async (scenes, voiceId) => {
    if (scenes.some((scene) => !scene.narration.trim())) {
      throw new Error("Ada adegan yang belum punya narasi. Isi semua beat sebelum membuat voice-over.");
    }
    if (scenes.length === 0) throw new Error("Belum ada narasi per adegan untuk dibuat menjadi voice-over.");
    let completed = 0;
    for (const scene of scenes) {
      setSpeechProgress({ completed, total: scenes.length });
      setNotice(`Membuat voice-over adegan ${completed + 1} dari ${scenes.length}...`);
      await createSpeechAsset(scene.narration, voiceId, scene.id);
      completed += 1;
    }
    setSpeechProgress({ completed, total: scenes.length });
  };

  const generateStory = async ({ withVoice = false } = {}) => {
    if (generatingStory) return;
    setGeneratingStory(true);
    setError("");
    setNotice("");
    try {
      const story = await requestStory();
      const scenes = applyStory(story);
      setNotice(`Cerita ${story.scenes.length} adegan berhasil dibuat.`);
      if (withVoice) {
        setGeneratingSpeech(true);
        try {
          const voiceId = await ensureVoiceId();
          await generateSceneVoices(scenes, voiceId);
          setNotice("Draft dan voice-over per adegan selesai. Timing-nya bisa lo atur di timeline.");
        } catch (speechError) {
          console.error("The story was created, but automatic voice-over generation failed.", speechError);
          setError(`Ceritanya tetap tersimpan, tapi voice-over adegan belum semuanya selesai: ${speechError.message}`);
        } finally {
          setGeneratingSpeech(false);
          setSpeechProgress(null);
        }
      }
    } catch (generationError) {
      console.error("Could not generate the story with Claude.", generationError);
      setError(generationError.message || "Claude gagal membuat cerita. Periksa setup API dan coba lagi.");
    } finally {
      setGeneratingStory(false);
    }
  };

  const reviseStory = async (instruction, targetSceneIndex = null) => {
    if (revisingStory || generatingStory || project.scenes.length < 2) return;
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
    setLoadingVoices(true);
    setError("");
    try {
      const response = await fetch("/api/ai/voices");
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Daftar voice ElevenLabs gagal dimuat.");
      setVoices(result.voices);
      if (!project.ttsVoiceId && result.defaultVoiceId) {
        updateProject("ttsVoiceId", result.defaultVoiceId);
      }
      if (result.voices.length === 0) {
        setNotice("Belum ada voice yang tersedia di akun ElevenLabs.");
      }
    } catch (voiceError) {
      console.error("Could not load ElevenLabs voices.", voiceError);
      setError(voiceError.message || "Daftar voice tidak bisa dimuat.");
    } finally {
      setLoadingVoices(false);
    }
  };

  const generateSpeech = async () => {
    if (generatingSpeech) return;
    if (!project.narration.trim()) {
      setError("Bikin cerita dengan Claude dulu atau tulis naskah voice-over sebelum generate.");
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
        setNotice("Voice-over per adegan selesai dan tersinkron di timeline.");
      } else {
        await createSpeechAsset(project.narration, voiceId);
        setNotice("Voice-over berhasil dibuat, dipilih, dan masuk ke render preview.");
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
    setProject((current) => {
      const scenes = current.scenes.map((scene) =>
        scene.id === sceneId ? { ...scene, [key]: value } : scene,
      );
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
      await deleteAsset(asset.id);
      setAssets((current) => current.filter((item) => item.id !== asset.id));
      setProject((current) => {
        const scenes = current.scenes.map((scene) =>
          scene.voiceAssetId === asset.id
            ? { ...scene, voiceAssetId: "", voiceDurationSeconds: 0, voiceText: "" }
            : scene,
        );
        return {
          ...current,
          backgroundId: current.backgroundId === asset.id ? "" : current.backgroundId,
          characterAssetId: current.characterAssetId === asset.id ? "" : current.characterAssetId,
          audioId: current.audioId === asset.id ? "" : current.audioId,
          audioNarration: current.audioId === asset.id ? "" : current.audioNarration,
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

  const renderVideo = async () => {
    if (renderJob?.status === "uploading" || renderJob?.status === "rendering") return;
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
        ].filter(Boolean)),
      ];
      if (selectedIds.length > 15) {
        throw new Error("Render mendukung maksimal 15 aset terpilih sekaligus.");
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
          scenes: project.scenes,
          audioVolume: Number(project.audioVolume) / 100,
          voiceVolume: Number(project.voiceVolume ?? 100) / 100,
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

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Framefolk home">
          <span className="brand-mark"><Clapperboard size={18} strokeWidth={2.2} /></span>
          <span>framefolk<span className="brand-dot">.</span></span>
        </a>
        <div className="topbar-center"><span className="live-dot" /> REMOTION WORKSPACE <span className="topbar-slash">/</span> PROJECT 01</div>
        <div className="saved-badge"><span /> Tersimpan di browser ini</div>
      </header>

      <section className="welcome-row">
        <div>
          <div className="eyebrow"><WandSparkles size={14} /> YOUR CHARACTER-LED VIDEO STUDIO</div>
          <h1>Semua cerita, tetap <em>punya karakter.</em></h1>
          <p>Bangun character bible, rapikan aset, lalu preview dan edit video tanpa prompt ulang.</p>
        </div>
        <div className="welcome-actions">
          {onboardingDismissed && (
            <button className="button button-quiet button-small" onClick={reopenOnboarding}>Panduan mulai</button>
          )}
          <button className="button button-quiet" onClick={() => setPromptVisible((visible) => !visible)}>
            <MessageSquareText size={16} /> {promptVisible ? "Sembunyikan prompt manual" : "Prompt manual"}
          </button>
          <button className="button button-primary" onClick={() => generateStory({ withVoice: true })} disabled={generatingStory || generatingSpeech || !loaded}>
            {generatingStory ? <LoaderCircle className="loading-spinner-icon" size={16} /> : <WandSparkles size={16} />}
            {generatingStory ? "Bikin draft + suara..." : "Bikin draft + voice-over"}
          </button>
          <button className="button button-render" onClick={renderVideo} disabled={!loaded || rendering || preflightErrors.length > 0}>
            {rendering ? <span className="loading-spinner" /> : <Film size={16} />}
            {rendering ? "Sedang render..." : "Render MP4"}
          </button>
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

      {aiStatus && !aiStatus.unavailable && (!aiStatus.claudeConfigured || !aiStatus.elevenLabsConfigured) && (
        <div className="api-setup-note">
          <strong>Setup satu kali:</strong> copy <code>.env.example</code> jadi <code>.env.local</code>, isi API key
          {aiStatus.claudeConfigured ? null : " Anthropic"}{!aiStatus.claudeConfigured && !aiStatus.elevenLabsConfigured ? " dan" : ""}
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
            <div><h2>Asset library</h2><p>Footage dan gambar tambahan.</p></div>
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
            <span className="upload-copy"><strong>Tambah gambar / footage</strong><small>Aset pilihan · max 150 MB per file untuk render</small></span>
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
                const isAudio = project.audioId === asset.id;
                return (
                  <div className="asset-row" key={asset.id}>
                    <div className="asset-type-icon"><Icon size={16} /></div>
                    <div className="asset-details"><strong title={asset.name}>{asset.name}</strong><small>{formatBytes(asset.size)}</small></div>
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
            <div className="empty-assets"><AudioLines size={17} /><span>Upload aset tersimpan lokal di browser; file tidak otomatis terkirim ke Claude.</span></div>
          )}
        </aside>

        <section className="preview-column">
          <div className="preview-header">
            <div className="section-heading">
              <div className="section-icon"><MonitorPlay size={17} /></div>
              <div><h2>Live composition</h2><p>Perubahan langsung terlihat di preview.</p></div>
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
              <span className="mini-eyebrow"><WandSparkles size={12} /> BRIEF TERPANDU · SEKALI GENERATE</span>
              <span className="brief-helper">Makin spesifik brief-nya, makin dekat draft pertama ke bayangan lo.</span>
            </div>
            <label className="edit-field">
              <span>IDE CERITA / INSTRUKSI KREATIF</span>
              <textarea
                className="text-input"
                rows={3}
                maxLength={5000}
                value={project.brief}
                onChange={(event) => updateProject("brief", event.target.value)}
                placeholder="Contoh: Nara cerita lucu kenapa dia suka hujan. Kasih opening kuat dan ending hangat."
              />
            </label>
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
            <div className="idea-footer">
              <span>Claude bikin cerita + variasi visual adegan; ElevenLabs bikin suara dan langsung masuk library. Pemakaian API berlaku.</span>
              <button
                className="button button-primary button-small"
                onClick={() => generateStory({ withVoice: true })}
                disabled={generatingStory || generatingSpeech || !loaded}
              >
                {generatingStory || generatingSpeech ? <LoaderCircle className="loading-spinner-icon" size={14} /> : <WandSparkles size={14} />}
                {generatingStory ? "Claude bikin cerita..." : generatingSpeech ? "Bikin voice-over..." : "Buat cerita + suara"}
              </button>
            </div>
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
                <div className="audio-hint"><FileAudio2 size={15} /> Upload musik latar di sebelah kiri; voice-over diatur per adegan.</div>
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
            </div>
          </div>

          {project.scenes.length > 0 && (
            <div className="panel scenes-panel">
              <div className="scenes-heading">
                <div><span className="mini-eyebrow">HASIL CLAUDE · AUTO-SAVE</span><h3>{project.scenes.length} adegan · siap diedit</h3></div>
                <button className="button button-quiet button-small" onClick={() => generateStory({ withVoice: true })} disabled={generatingStory || generatingSpeech}>
                  <WandSparkles size={13} /> Generate ulang
                </button>
              </div>
              <div className="revision-tools">
                <div className="quick-revision-row">
                  {QUICK_REVISIONS.map((revision) => (
                    <button
                      className="button button-quiet button-small"
                      key={revision.label}
                      onClick={() => reviseStory(revision.instruction, revisionTarget === "all" ? null : Number(revisionTarget))}
                      disabled={revisingStory || generatingStory}
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
                    disabled={revisingStory || generatingStory || !revisionInstruction.trim()}
                  >
                    {revisingStory ? "Merevisi..." : "Revisi"}
                  </button>
                </div>
                <small className="revision-note">Revisi AI memakai API lagi; edit manual tetap gratis dan langsung tersimpan.</small>
              </div>
              <div className="timeline-panel">
                <div className="timeline-heading">
                  <div>
                    <span className="mini-eyebrow">TIMELINE VIDEO · {formatDuration(timelineDurationSeconds)}</span>
                    <small>Visual, voice-over, dan jeda tersusun per adegan.</small>
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
              <label className="edit-field narration-field">
                <span>NASKAH CERITA LENGKAP</span>
                <textarea
                  className="text-input"
                  rows={5}
                  maxLength={5000}
                  value={project.narration}
                  onChange={(event) => updateProject("narration", event.target.value)}
                  placeholder="Naskah hasil Claude — bisa diedit sendiri."
                />
              </label>
              <div className="scene-list">
                {project.scenes.map((scene, index) => (
                  <div className="scene-card" key={scene.id}>
                    <span className="scene-index">{String(index + 1).padStart(2, "0")}</span>
                    <div className="scene-fields">
                      <div className="scene-timing-summary">
                        <span>{formatDuration(Math.floor(sceneTimeline[index].startSeconds))} – {formatDuration(Math.ceil(sceneTimeline[index].endSeconds))}</span>
                        <span className={scene.voiceAssetId ? "voice-ready" : "voice-missing"}>
                          {scene.voiceAssetId ? `Voice ${Number(scene.voiceDurationSeconds || 0).toFixed(1)} dtk` : "Belum ada voice"}
                        </span>
                      </div>
                      <label className="edit-field">
                        <span>{scene.label || `ADEGAN ${index + 1}`}</span>
                        <input
                          className="text-input"
                          value={scene.onScreenText}
                          onChange={(event) => updateScene(scene.id, "onScreenText", event.target.value)}
                        />
                      </label>
                      <label className="edit-field">
                        <span>NARASI ADEGAN</span>
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
                        <button className="button button-quiet button-small" onClick={() => regenerateSceneSpeech(scene)} disabled={generatingSpeech}>
                          {generatingSpeech ? <LoaderCircle className="loading-spinner-icon" size={12} /> : <Mic2 size={12} />}
                          {generatingSpeech ? speechProgress ? `Voice ${speechProgress.completed + 1}/${speechProgress.total}...` : "Memproses..." : scene.voiceAssetId ? "Buat ulang voice" : "Buat voice adegan"}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel tts-panel">
            <div className="tts-heading">
              <span className="render-icon"><Mic2 size={16} /></span>
              <div><h3>Voice-over karakter</h3><p>ElevenLabs pakai voice yang lo pilih; character bible memandu naskahnya.</p></div>
              <button className="button button-quiet button-small" onClick={loadVoices} disabled={loadingVoices}>
                {loadingVoices ? <LoaderCircle className="loading-spinner-icon" size={13} /> : <AudioLines size={13} />}
                {loadingVoices ? "Memuat..." : "Muat daftar voice"}
              </button>
            </div>
            <div className="tts-controls">
              <label className="edit-field">
                <span>PILIH KARAKTER SUARA</span>
                <select
                  className="text-input voice-select"
                  value={project.ttsVoiceId}
                  onChange={(event) => updateProject("ttsVoiceId", event.target.value)}
                  disabled={voices.length === 0}
                >
                  <option value="">Muat daftar voice dulu</option>
                  {voices.map((voice) => (
                    <option value={voice.id} key={voice.id}>{voice.name}{voice.category ? ` · ${voice.category}` : ""}</option>
                  ))}
                </select>
              </label>
              <label className="edit-field">
                <span>NASKAH SUARA <b>{project.narration.length}/5000</b></span>
                <textarea
                  className="text-input"
                  rows={3}
                  maxLength={5000}
                  value={project.narration}
                  onChange={(event) => updateProject("narration", event.target.value)}
                  placeholder="Generate cerita dengan Claude dulu, atau tulis teks voice-over sendiri."
                />
              </label>
              <button
                className="button button-primary tts-generate"
                onClick={generateSpeech}
                disabled={generatingSpeech || !project.narration.trim()}
              >
                {generatingSpeech ? <LoaderCircle className="loading-spinner-icon" size={15} /> : <Mic2 size={15} />}
                {generatingSpeech ? "Membuat voice-over..." : "Generate voice-over"}
              </button>
            </div>
            <p className="tts-footnote">Voice dibuat per adegan supaya timing bisa diatur. Generate satu kali memanggil ElevenLabs untuk setiap adegan; penggunaan dihitung dari teks dan kuota akun.</p>
          </div>

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
              <button className="button button-primary render-button" onClick={renderVideo} disabled={!loaded || rendering || preflightErrors.length > 0}>
                {rendering ? <span className="loading-spinner" /> : <Film size={15} />}
                {rendering ? "Merender..." : renderJob?.status === "failed" ? "Coba render lagi" : "Render & siapkan MP4"}
              </button>
            )}
          </div>

          {promptVisible && (
            <div className="panel prompt-panel">
              <div className="prompt-heading"><div><span className="mini-eyebrow">CLAUDE PROMPT</span><h3>Siap dipakai di Claude</h3></div><button className="icon-button" onClick={copyPrompt} title="Salin prompt"><Copy size={15} /></button></div>
              <textarea className="prompt-output" value={generatedPrompt} readOnly rows={13} aria-label="Prompt untuk Claude" />
              <div className="prompt-footer">
                <span>Prompt berisi detail aset; lampirkan file-nya sendiri di Claude bila perlu.</span>
                <button className="button button-primary button-small" onClick={openClaude}><ExternalLink size={14} /> Buka Claude</button>
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
