import React from "react";
import {
  AbsoluteFill,
  Audio,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  Video,
  staticFile,
} from "remotion";

const wordCount = (value) => (value?.trim().match(/\S+/g) ?? []).length;

const getIllustrationTheme = (text) => {
  const value = text.toLowerCase();
  if (/kopi|teh|makan|masak|lapar|roti|kue|minum|restoran|makanan/u.test(value)) return "food";
  if (/buku|belajar|kelas|ilmu|membaca|catatan|sekolah|tips/u.test(value)) return "learning";
  if (/kota|jalan|pergi|pulang|perjalanan|hujan|malam|pagi|rumah|kampung/u.test(value)) return "journey";
  if (/produk|jualan|bisnis|kemasan|toko|brand|harga|belanja/u.test(value)) return "product";
  if (/chat|pesan|ponsel|hp|telepon|sosial|konten|viral/u.test(value)) return "social";
  if (/teman|cinta|sayang|keluarga|rindu|senang|sedih|takut|emosi/u.test(value)) return "feeling";
  return "idea";
};

const SceneIllustration = ({ kind, accent, frame, fps, label, direction }) => {
  const float = Math.sin((frame / fps) * 2.2) * 10;
  const bob = Math.sin((frame / fps) * 3.4) * 5;
  const cream = "#fff4d8";
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg viewBox="0 0 640 500" width="100%" height="100%" role="img" aria-label={`${label} illustration`}>
        <rect x="10" y="12" width="620" height="476" rx="38" fill="#141914" fillOpacity=".78" stroke={accent} strokeOpacity=".5" strokeWidth="2" />
        <circle cx="500" cy="112" r="95" fill={accent} fillOpacity=".12" />
        <circle cx="142" cy="370" r="120" fill={accent} fillOpacity=".08" />
        <path d="M56 414 C170 372 248 448 342 405 S508 376 584 416" fill="none" stroke={accent} strokeOpacity=".32" strokeWidth="3" />
        <g style={{ transform: `translateY(${float}px)` }}>
        {kind === "food" ? (
          <>
            <path d="M231 190h176l-18 205H249z" fill={cream} />
            <path d="M244 219h150l-13 34H256z" fill={accent} />
            <path d="M407 235h42c50 0 47 91-8 91h-42" fill="none" stroke={cream} strokeWidth="22" />
            <path d="M283 173c-25-37 25-41 0-80M323 173c-25-37 25-41 0-80M363 173c-25-37 25-41 0-80" fill="none" stroke={accent} strokeWidth="8" strokeLinecap="round" />
            <ellipse cx="320" cy="404" rx="150" ry="20" fill="#000" fillOpacity=".34" />
          </>
        ) : null}
        {kind === "learning" ? (
          <>
            <path d="M143 177c67-30 123-18 177 20v204c-55-39-111-48-177-20z" fill={cream} />
            <path d="M497 177c-67-30-123-18-177 20v204c55-39 111-48 177-20z" fill="#d9e7c4" />
            <path d="M320 197v205" stroke={accent} strokeWidth="10" />
            <path d="M177 224h102M177 263h102M177 302h102M360 224h102M360 263h102M360 302h102" stroke="#71806b" strokeWidth="8" strokeLinecap="round" />
            <path d="M430 117v-47m-37 63-35-32m109 32 35-32" stroke={accent} strokeWidth="9" strokeLinecap="round" />
            <circle cx="430" cy="133" r="27" fill={accent} />
          </>
        ) : null}
        {kind === "journey" ? (
          <>
            <circle cx="448" cy="122" r="50" fill={accent} />
            <path d="M81 352h118V226H81zm141 0h108V164H222zm133 0h95V248h-95zm122 0h79V195h-79z" fill="#344034" />
            <path d="M81 252h118m23-43h108m0 71h95m27-61h79" stroke={cream} strokeOpacity=".7" strokeWidth="8" strokeDasharray="12 15" />
            <path d="M140 352c60-100 122-111 184-83s99 103 169 83" fill="none" stroke={accent} strokeWidth="16" strokeLinecap="round" />
            <circle cx="140" cy="352" r="14" fill={cream} /><circle cx="493" cy="352" r="14" fill={cream} />
          </>
        ) : null}
        {kind === "product" ? (
          <>
            <path d="m194 219 126-75 127 75v153l-127 73-126-73z" fill={accent} />
            <path d="m194 219 126 78 127-78M320 297v148" fill="none" stroke={cream} strokeWidth="10" />
            <path d="m272 172 128 77-80 49-126-79z" fill="#f3e8c7" />
            <path d="M320 215v81m-40-26 80-50" stroke={accent} strokeWidth="12" />
            <ellipse cx="320" cy="456" rx="151" ry="18" fill="#000" fillOpacity=".32" />
          </>
        ) : null}
        {kind === "social" ? (
          <>
            <rect x="242" y="95" width="156" height="310" rx="30" fill={cream} />
            <rect x="255" y="127" width="130" height="234" rx="12" fill="#283329" />
            <circle cx="320" cy="385" r="9" fill="#64705e" />
            <path d="M274 177h84a18 18 0 0 1 0 36h-46l-24 20v-20h-14a18 18 0 0 1 0-36z" fill={accent} />
            <path d="M293 252h67a17 17 0 0 1 0 34h-27l-21 18v-18h-19a17 17 0 0 1 0-34z" fill="#fff" />
            <circle cx="308" cy="194" r="4" fill="#263025" /><circle cx="322" cy="194" r="4" fill="#263025" /><circle cx="336" cy="194" r="4" fill="#263025" />
          </>
        ) : null}
        {kind === "feeling" ? (
          <>
            <path d="M320 377 183 251c-70-68 31-163 101-96l36 35 36-35c70-67 171 28 101 96z" fill={accent} />
            <path d="M320 361 201 250c-45-43 20-103 66-61l53 50 53-50c46-42 111 18 66 61z" fill="#fff1d2" fillOpacity=".35" />
            <path d="M205 145c15-17 38-25 62-22M435 145c-15-17-38-25-62-22" fill="none" stroke={cream} strokeWidth="8" strokeLinecap="round" />
            <circle cx="193" cy="192" r="10" fill={cream} /><circle cx="447" cy="192" r="10" fill={cream} />
          </>
        ) : null}
        {kind === "idea" ? (
          <>
            <path d="M320 112c-76 0-125 59-112 128 8 42 39 61 54 93h116c15-32 46-51 54-93 13-69-36-128-112-128z" fill={accent} />
            <path d="M273 338h94m-84 29h74m-60 28h46" stroke={cream} strokeWidth="12" strokeLinecap="round" />
            <path d="M320 58V28m-111 76-22-21m244 21 22-21m-266 130h-32m298 0h32" stroke={cream} strokeWidth="9" strokeLinecap="round" />
            <path d="M288 212c16-17 48-17 64 0m-64 43c16 17 48 17 64 0" fill="none" stroke="#243022" strokeWidth="10" strokeLinecap="round" />
          </>
        ) : null}
        </g>
        <g style={{ transform: `translateY(${bob}px)` }}>
          <circle cx="114" cy="145" r="12" fill={accent} />
          <circle cx="535" cy="298" r="8" fill={cream} />
          <path d="m91 185 18 18m0-18-18 18m430-93 18 18m0-18-18 18" stroke={cream} strokeOpacity=".7" strokeWidth="5" strokeLinecap="round" />
        </g>
      </svg>
      <div
        style={{
          position: "absolute",
          left: "9%",
          right: "9%",
          bottom: "8%",
          overflow: "hidden",
          color: cream,
          fontSize: "clamp(10px, 1.15vw, 15px)",
          letterSpacing: ".06em",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
          textTransform: "uppercase",
        }}
      >
        {direction || label}
      </div>
    </div>
  );
};

const PromoComposition = ({
  characterName,
  characterTraits,
  characterImageUrl,
  characterImagePath,
  title,
  subtitle,
  scenes,
  accent,
  visualStyle,
  backgroundUrl,
  backgroundAssetPath,
  backgroundType,
  audioUrl,
  audioAssetPath,
  audioNarration,
  audioAlignment = [],
  audioVolume,
  voiceVolume,
  sfxVolume = 0.22,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps, width, height } = useVideoConfig();
  const isPortrait = height > width;
  let timelineCursor = 0;
  const timeline = (scenes ?? []).map((scene, index) => {
    const activeDuration = Math.max(
      Number(scene.activeDuration) || Number(scene.durationSeconds) || Math.max(0.5, (wordCount(scene.narration) * 60) / 155),
      Number(scene.voiceDurationSeconds) || 0,
    );
    const startSeconds = Number.isFinite(scene.startSeconds) ? scene.startSeconds : timelineCursor;
    const timedScene = {
      ...scene,
      index,
      startSeconds,
      activeDuration,
      endSeconds: startSeconds + activeDuration,
    };
    timelineCursor = timedScene.endSeconds + Math.max(0, Number(scene.pauseAfterSeconds) || 0);
    return timedScene;
  });
  let sceneIndex = -1;
  for (const scene of timeline) {
    if (frame >= scene.startSeconds * fps) sceneIndex = scene.index;
    else break;
  }
  const currentScene = sceneIndex >= 0 ? timeline[sceneIndex] : undefined;
  const sceneStart = currentScene ? currentScene.startSeconds * fps : 0;
  const sceneDuration = currentScene ? currentScene.activeDuration * fps : durationInFrames;
  const sceneFrame = frame - sceneStart;
  const enterFrames = Math.max(1, Math.min(20, sceneDuration / 2));
  const sceneOpacity = interpolate(sceneFrame, [0, enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const idleMotion = Math.sin((frame / fps) * 3.1);
  const fallbackWords = (currentScene?.narration || audioNarration || "").trim().split(/\s+/).filter(Boolean);
  const alignedWords = Array.isArray(currentScene?.voiceAlignment)
    ? currentScene.voiceAlignment
    : Array.isArray(audioAlignment) ? audioAlignment : [];
  const sceneElapsedSeconds = currentScene ? sceneFrame / fps : frame / fps;
  const activeVoiceDuration = currentScene
    ? Number(currentScene.voiceDurationSeconds) || currentScene.activeDuration
    : durationInFrames / fps;
  const activeAlignedWord = alignedWords.findIndex(
    (word) => sceneElapsedSeconds >= word.startSeconds && sceneElapsedSeconds < word.endSeconds,
  );
  const previousAlignedWord = alignedWords.reduce(
    (previous, word, index) => word.endSeconds <= sceneElapsedSeconds ? index : previous,
    -1,
  );
  const approximateWordIndex = currentScene || audioNarration
    ? Math.min(
        fallbackWords.length - 1,
        Math.floor(
          (sceneElapsedSeconds / Math.max(0.1, activeVoiceDuration)) *
            fallbackWords.length,
        ),
      )
    : -1;
  const spokenWordIndex = alignedWords.length > 0
    ? activeAlignedWord >= 0 ? activeAlignedWord : previousAlignedWord
    : approximateWordIndex;
  const captionWords = alignedWords.length > 0
    ? alignedWords.map((item) => item.word)
    : fallbackWords;
  const captionStart = Math.max(0, spokenWordIndex - 2);
  const captionEnd = spokenWordIndex < 0
    ? 0
    : Math.min(captionWords.length, spokenWordIndex + 4);
  const hasCaptionAudio = currentScene ? Boolean(currentScene.voiceAssetId) : Boolean(audioNarration);
  const speechCaptionWords = hasCaptionAudio
    ? captionWords.slice(captionStart, captionEnd)
    : [];
  const isSpeaking = currentScene
    ? Boolean(currentScene.voiceAssetId) && sceneFrame < activeVoiceDuration * fps
    : Boolean(audioNarration && (audioAssetPath || audioUrl)) && frame < activeVoiceDuration * fps;
  const mouthOpen = isSpeaking && Math.sin(sceneFrame * 0.9) > 0;
  const motionPreset = currentScene?.motionPreset || "rise";
  const characterEntranceX = {
    rise: 0,
    drift: 32,
    zoom: 0,
    pop: 0,
    reveal: 64,
  }[motionPreset] ?? 0;
  const characterEntranceY = motionPreset === "rise" ? 64 : motionPreset === "pop" ? 26 : 0;
  const characterStartScale = motionPreset === "zoom" ? 0.84 : motionPreset === "pop" ? 0.7 : 0.94;
  const characterEntranceProgress = interpolate(sceneFrame, [0, enterFrames], [0, 1], {
    extrapolateRight: "clamp",
  });
  const motionTransform = {
    rise: `translateY(${interpolate(sceneFrame, [0, enterFrames], [42, 0], { extrapolateRight: "clamp" })}px)`,
    drift: `translateX(${interpolate(sceneFrame, [0, sceneDuration], [24, -12], { extrapolateRight: "clamp" })}px)`,
    zoom: `scale(${interpolate(sceneFrame, [0, sceneDuration], [0.92, 1.04], { extrapolateRight: "clamp" })})`,
    pop: `scale(${interpolate(sceneFrame, [0, enterFrames], [0.84, 1], { extrapolateRight: "clamp" })})`,
    reveal: `translateX(${interpolate(sceneFrame, [0, enterFrames], [-48, 0], { extrapolateRight: "clamp" })})`,
  }[motionPreset] || "none";
  const visualType = currentScene?.visualType || "hero";
  const fade = interpolate(frame, [0, 12, durationInFrames - 12, durationInFrames], [0, 1, 1, 0], {
    extrapolateRight: "clamp",
  });
  const resolvedBackgroundUrl = backgroundAssetPath ? staticFile(backgroundAssetPath) : backgroundUrl;
  const resolvedCharacterImageUrl = characterImagePath ? staticFile(characterImagePath) : characterImageUrl;
  const resolvedAudioUrl = audioAssetPath ? staticFile(audioAssetPath) : audioUrl;
  const resolvedSceneVisualUrl = currentScene?.visualAssetPath
    ? staticFile(currentScene.visualAssetPath)
    : currentScene?.visualAssetUrl;
  const resolvedSfxVolume = Math.max(0, Math.min(1, Number(sfxVolume) || 0));
  const illustrationTheme = getIllustrationTheme(
    `${currentScene?.label || ""} ${currentScene?.visualDescription || ""} ${currentScene?.narration || ""}`,
  );

  const characterPosition = {
    hero: { right: "5%", bottom: "13%", width: "43%", height: "61%" },
    split: { right: "3%", bottom: "12%", width: "45%", height: "66%" },
    quote: { right: "8%", bottom: "8%", width: "30%", height: "43%" },
    punchline: { right: "0%", bottom: "3%", width: "56%", height: "61%" },
    cinematic: { right: "-4%", bottom: "-2%", width: "72%", height: "77%" },
    sticker: { right: "4%", bottom: "12%", width: "50%", height: "62%", transform: "rotate(-5deg)" },
    poster: { right: "6%", bottom: "13%", width: "38%", height: "65%" },
  }[visualType] || { right: "5%", bottom: "13%", width: "43%", height: "61%" };
  const portraitCharacterPosition = {
    hero: { right: "3%", bottom: "16%", width: "35%", height: "38%" },
    split: { right: "1%", bottom: "16%", width: "38%", height: "39%" },
    quote: { right: "5%", bottom: "15%", width: "30%", height: "34%" },
    punchline: { right: "1%", bottom: "16%", width: "37%", height: "38%" },
    cinematic: { right: "1%", bottom: "10%", width: "46%", height: "43%" },
    sticker: { right: "2%", bottom: "15%", width: "35%", height: "38%" },
    poster: { right: "3%", bottom: "16%", width: "33%", height: "38%" },
  }[visualType] || { right: "3%", bottom: "16%", width: "35%", height: "38%" };
  const resolvedCharacterPosition = isPortrait ? portraitCharacterPosition : characterPosition;
  const copyPosition = {
    hero: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "88%" },
    split: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "57%" },
    quote: { alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "82%" },
    punchline: { alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "94%" },
    cinematic: { alignItems: "flex-start", justifyContent: "flex-end", textAlign: "left", maxWidth: "90%" },
    sticker: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "56%" },
    poster: { alignItems: "flex-start", justifyContent: "space-between", textAlign: "left", maxWidth: "88%" },
  }[visualType] || { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "88%" };
  const portraitCopyPosition = {
    hero: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "59%" },
    split: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "57%" },
    quote: { alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "59%" },
    punchline: { alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "59%" },
    cinematic: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "59%" },
    sticker: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "56%" },
    poster: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "58%" },
  }[visualType] || { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "59%" };
  const resolvedCopyPosition = isPortrait ? portraitCopyPosition : copyPosition;
  const styleTreatment = {
    cinematic: "linear-gradient(180deg, rgba(7,9,12,.12), rgba(7,9,12,.92))",
    minimal: "linear-gradient(115deg, rgba(13,15,14,.91), rgba(13,15,14,.54))",
    comic: "radial-gradient(circle at 85% 20%, rgba(255,255,255,.16) 0 2px, transparent 2.5px) 0 0 / 18px 18px, linear-gradient(115deg, rgba(11,12,16,.91), rgba(11,12,16,.48))",
    "warm-documentary": "linear-gradient(115deg, rgba(31,18,12,.84), rgba(16,12,10,.5))",
    "playful-editorial": "linear-gradient(115deg, rgba(9,12,10,.89), rgba(9,12,10,.42))",
  }[visualStyle] || "linear-gradient(115deg, rgba(9,12,10,.89), rgba(9,12,10,.42))";

  return (
    <AbsoluteFill style={{ backgroundColor: "#101310", color: "#f5f4ed", fontFamily: "Arial, sans-serif" }}>
      {resolvedBackgroundUrl && backgroundType === "image" ? (
        <Img
          src={resolvedBackgroundUrl}
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: visualType === "cinematic" ? 0.72 : 0.54,
            scale: 1.04 + Math.sin(frame / (fps * 4)) * 0.025,
          }}
        />
      ) : null}
      {resolvedBackgroundUrl && backgroundType === "video" ? (
        <Video
          src={resolvedBackgroundUrl}
          muted
          loop
          style={{
            position: "absolute",
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.58,
            scale: 1.04 + Math.sin(frame / (fps * 4)) * 0.025,
          }}
        />
      ) : null}
      {resolvedSceneVisualUrl && currentScene?.visualAssetType?.startsWith("image/") ? (
        <Img
          src={resolvedSceneVisualUrl}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: sceneOpacity * 0.78,
          scale: 1.08 - interpolate(sceneFrame, [0, sceneDuration], [0, 0.08], { extrapolateRight: "clamp" }),
        }}
        />
      ) : null}
      {resolvedSceneVisualUrl && currentScene?.visualAssetType?.startsWith("video/") && currentScene ? (
        <Sequence
          from={Math.max(0, Math.round(currentScene.startSeconds * fps))}
          durationInFrames={Math.max(1, Math.ceil(currentScene.activeDuration * fps))}
          layout="none"
          name={`Visual ${currentScene.index + 1}`}
        >
          <Video
            src={resolvedSceneVisualUrl}
            muted
            loop
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              objectFit: "cover",
              opacity: sceneOpacity * 0.72,
              scale: 1.08 - interpolate(sceneFrame, [0, sceneDuration], [0, 0.08], { extrapolateRight: "clamp" }),
            }}
          />
        </Sequence>
      ) : null}
      <AbsoluteFill style={{ background: styleTreatment }} />
      <div
        style={{
          position: "absolute",
          width: "78%",
          aspectRatio: "1",
          right: "-34%",
          top: `${10 + Math.sin(frame / (fps * 2.8)) * 3}%`,
          borderRadius: "50%",
          border: `1px solid ${accent}45`,
          boxShadow: `0 0 0 34px ${accent}08, 0 0 0 92px ${accent}05`,
          opacity: 0.7,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: "-16%",
          bottom: `${4 + Math.cos(frame / (fps * 3.4)) * 2}%`,
          width: "54%",
          aspectRatio: "1",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${accent}20, transparent 68%)`,
          opacity: 0.8,
          pointerEvents: "none",
        }}
      />
      {visualType === "split" ? (
        <AbsoluteFill style={{ background: `linear-gradient(90deg, rgba(12,14,13,.97) 0%, rgba(12,14,13,.9) 53%, ${accent}26 53%, ${accent}12 100%)` }} />
      ) : null}
      {visualType === "quote" ? (
        <div style={{ position: "absolute", top: "21%", left: "12%", color: accent, fontSize: "clamp(100px, 22vw, 260px)", lineHeight: 0.7, fontFamily: "Georgia, serif", opacity: 0.8 }}>
          “
        </div>
      ) : null}
      {visualType === "punchline" ? (
        <div style={{ position: "absolute", top: "13%", right: "8%", width: "34%", aspectRatio: "1", borderRadius: "50%", background: accent, opacity: 0.12, filter: "blur(2px)" }} />
      ) : null}
      {visualType === "cinematic" ? (
        <div style={{ position: "absolute", inset: "8%", border: `1px solid ${accent}75`, opacity: 0.7 }} />
      ) : null}
      {visualType === "sticker" ? (
        <>
          <div style={{ position: "absolute", right: "12%", top: "16%", width: "17%", aspectRatio: "1", border: `3px solid ${accent}`, borderRadius: "50%", transform: "rotate(12deg)", boxShadow: `0 0 0 8px ${accent}20` }} />
          <div style={{ position: "absolute", right: "17%", top: "28%", width: "46%", height: "36%", backgroundColor: accent, clipPath: "polygon(50% 0%, 61% 31%, 97% 18%, 76% 49%, 100% 73%, 63% 68%, 50% 100%, 37% 68%, 0% 73%, 24% 49%, 3% 18%, 39% 31%)", opacity: 0.12 }} />
        </>
      ) : null}
      {visualType === "poster" ? (
        <>
          <div style={{ position: "absolute", left: "8%", top: "22%", bottom: "19%", width: 8, background: accent }} />
          <div style={{ position: "absolute", top: "17%", right: "9%", color: accent, fontSize: "clamp(180px, 30vw, 430px)", fontWeight: 800, lineHeight: 0.8, opacity: 0.08 }}>
            {String(Math.max(1, sceneIndex + 1)).padStart(2, "0")}
          </div>
          <div style={{ position: "absolute", left: "8%", right: "8%", bottom: "14%", height: "2px", background: accent, boxShadow: `0 10px 0 ${accent}40` }} />
        </>
      ) : null}
      {!resolvedSceneVisualUrl && currentScene ? (
        <div
          style={{
            position: "absolute",
            right: isPortrait ? "3%" : "4%",
            top: isPortrait ? "19%" : "21%",
            width: isPortrait ? "47%" : "49%",
            height: isPortrait ? "26%" : "38%",
            zIndex: 1,
            opacity: sceneOpacity,
          }}
        >
          <SceneIllustration
            kind={illustrationTheme}
            accent={accent}
            frame={sceneFrame}
            fps={fps}
            label={currentScene.label}
            direction={currentScene.visualDescription}
          />
        </div>
      ) : null}
      {resolvedCharacterImageUrl ? (
        <Img
          src={resolvedCharacterImageUrl}
          style={{
            position: "absolute",
            ...resolvedCharacterPosition,
            zIndex: 2,
            objectFit: "contain",
            objectPosition: "bottom",
            filter: "drop-shadow(0 18px 36px rgba(0,0,0,.4))",
            opacity: interpolate(sceneFrame, [0, enterFrames], [0, 1], { extrapolateRight: "clamp" }),
            translate: `${interpolate(characterEntranceProgress, [0, 1], [characterEntranceX, 0])}px ${interpolate(characterEntranceProgress, [0, 1], [characterEntranceY, 0]) + idleMotion * (isSpeaking ? 15 : 8)}px`,
            rotate: `${Math.sin((frame / fps) * (isSpeaking ? 5.2 : 1.7)) * (isSpeaking ? 2.2 : 1)}deg`,
            scale: interpolate(characterEntranceProgress, [0, 1], [characterStartScale, 1]) +
              Math.sin((frame / fps) * (isSpeaking ? 8 : 2.1)) * (isSpeaking ? 0.018 : 0.009),
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            ...resolvedCharacterPosition,
            zIndex: 2,
            opacity: sceneOpacity,
            translate: `${interpolate(characterEntranceProgress, [0, 1], [characterEntranceX, 0])}px ${interpolate(characterEntranceProgress, [0, 1], [characterEntranceY, 0]) + idleMotion * (isSpeaking ? 18 : 10)}px`,
            rotate: `${Math.sin((frame / fps) * (isSpeaking ? 5.2 : 1.7)) * (isSpeaking ? 2.2 : 1)}deg`,
            scale: interpolate(characterEntranceProgress, [0, 1], [characterStartScale, 1]) +
              Math.sin((frame / fps) * (isSpeaking ? 8 : 2.1)) * (isSpeaking ? 0.018 : 0.009),
          }}
        >
          <svg viewBox="0 0 360 460" width="100%" height="100%" role="img" aria-label={`${characterName || "Framefolk"} talking character`}>
            <ellipse cx="185" cy="429" rx="120" ry="20" fill="#000" fillOpacity=".34" />
            <path d="M92 186c0-79 39-132 92-132s92 53 92 132v143c0 52-41 88-92 88s-92-36-92-88z" fill={accent} stroke="#fff8" strokeWidth="7" />
            <path d="M99 232C56 205 39 230 51 272c8 27 31 37 54 28m154-68c43-27 60-2 48 40-8 27-31 37-54 28" fill={accent} stroke="#fff8" strokeWidth="7" strokeLinecap="round" />
            <ellipse cx="144" cy="204" rx="15" ry={isSpeaking ? 10 : 16} fill="#172019" />
            <ellipse cx="220" cy="204" rx="15" ry={isSpeaking ? 10 : 16} fill="#172019" />
            <circle cx="149" cy="199" r="4" fill="white" />
            <circle cx="225" cy="199" r="4" fill="white" />
            <ellipse cx="115" cy="253" rx="17" ry="9" fill="#ed8674" fillOpacity=".65" />
            <ellipse cx="250" cy="253" rx="17" ry="9" fill="#ed8674" fillOpacity=".65" />
            {isSpeaking ? (
              mouthOpen ? (
                <path d="M145 260c9-22 66-22 75 0-5 36-70 43-75 0z" fill="#572b32" stroke="#172019" strokeWidth="6" strokeLinejoin="round" />
              ) : (
                <path d="M151 263c17 18 46 18 63 0" fill="none" stroke="#172019" strokeWidth="8" strokeLinecap="round" />
              )
            ) : (
              <path d="M151 257c17 14 46 14 63 0" fill="none" stroke="#172019" strokeWidth="7" strokeLinecap="round" />
            )}
            <path d="M144 351c13 11 27 16 42 16m30-16c-13 11-27 16-42 16" fill="none" stroke="#172019" strokeOpacity=".22" strokeWidth="6" strokeLinecap="round" />
          </svg>
        </div>
      )}
      {speechCaptionWords.length > 0 ? (
        <div
          style={{
            position: "absolute",
            zIndex: 4,
            left: "8%",
            right: "8%",
            bottom: "13%",
            display: "flex",
            alignItems: "center",
            gap: 18,
            minHeight: 92,
            padding: "20px 26px",
            border: `1px solid ${accent}75`,
            borderRadius: 22,
            background: "rgba(12,15,12,.88)",
            boxShadow: "0 18px 50px #0006",
            color: "#fff",
            fontSize: "clamp(25px, 4vw, 48px)",
            fontWeight: 700,
            lineHeight: 1.12,
            textWrap: "balance",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 5, flex: "0 0 auto", height: 34 }}>
            {[0, 1, 2, 3].map((bar) => (
              <span
                key={bar}
                style={{
                  width: 5,
                  height: `${10 + Math.abs(Math.sin(frame * 0.42 + bar * 1.4)) * (isSpeaking ? 22 : 6)}px`,
                  borderRadius: 5,
                  background: accent,
                }}
              />
            ))}
          </div>
          <span>
            {speechCaptionWords.map((word, index) => {
              const wordIndex = captionStart + index;
              return (
                <React.Fragment key={`${wordIndex}-${word}`}>
                  <span
                    style={{
                      color: wordIndex === spokenWordIndex ? accent : "#fff",
                      textDecoration: wordIndex === spokenWordIndex ? "underline" : "none",
                      textUnderlineOffset: 6,
                    }}
                  >
                    {word}
                  </span>
                  {index < speechCaptionWords.length - 1 ? " " : ""}
                </React.Fragment>
              );
            })}
          </span>
        </div>
      ) : null}
      <AbsoluteFill
        style={{
          zIndex: 3,
          padding: isPortrait ? "7%" : visualType === "cinematic" ? "11% 10%" : "8%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          opacity: fade,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, fontSize: 20, letterSpacing: 2 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ width: 14, height: 14, borderRadius: 20, backgroundColor: accent }} />
            <span>FRAMEFOLK STUDIO</span>
          </div>
          <span style={{ color: accent, fontSize: 18 }}>{sceneIndex >= 0 ? `${String(sceneIndex + 1).padStart(2, "0")} / ${String(scenes.length).padStart(2, "0")}` : ""}</span>
        </div>

        <div
          style={{
            position: isPortrait ? "absolute" : "relative",
            top: isPortrait ? "40%" : undefined,
            left: isPortrait ? "7%" : undefined,
            alignSelf: resolvedCopyPosition.alignItems === "center" ? "center" : "flex-start",
            display: "flex",
            flexDirection: "column",
            justifyContent: resolvedCopyPosition.justifyContent,
            textAlign: resolvedCopyPosition.textAlign,
            width: resolvedCopyPosition.maxWidth,
            height: isPortrait ? "34%" : undefined,
            minHeight: isPortrait ? 0 : visualType === "cinematic" ? "48%" : "57%",
            transform: motionTransform,
            opacity: sceneOpacity,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: resolvedCopyPosition.alignItems === "center" ? "center" : "flex-start",
              border: `1px solid ${accent}`,
              color: visualType === "sticker" ? "#171a14" : accent,
              borderRadius: visualStyle === "comic" ? 8 : 100,
              padding: "10px 18px",
              fontSize: 21,
              marginBottom: 26,
              backgroundColor: visualType === "sticker" ? accent : visualType === "punchline" ? "#1013109c" : "#10131070",
            }}
          >
            {currentScene?.label || characterName || "Nama karakter"}
          </div>
          <div
            style={{
              fontSize: isPortrait
                ? visualType === "punchline" || visualType === "poster"
                  ? "clamp(46px, 7.5vw, 90px)"
                  : "clamp(42px, 7vw, 82px)"
                : visualType === "punchline" ? "clamp(64px, 11vw, 150px)" : visualType === "poster" ? "clamp(64px, 11vw, 150px)" : "clamp(54px, 9.5vw, 128px)",
              fontWeight: visualStyle === "minimal" ? 600 : 750,
              letterSpacing: "-0.065em",
              lineHeight: visualType === "poster" ? 0.88 : 0.98,
              whiteSpace: "pre-wrap",
              textWrap: "balance",
              color: visualType === "punchline" ? accent : visualType === "sticker" ? "#171a14" : "#f5f4ed",
              textShadow: visualType === "cinematic" ? "0 5px 35px #000" : "none",
              ...(visualType === "sticker" ? {
                padding: "28px 30px",
                border: `3px solid ${accent}`,
                borderRadius: 28,
                backgroundColor: "#f5f0d7",
                boxShadow: `0 10px 0 ${accent}90, 0 22px 38px #0007`,
                transform: "rotate(-2deg)",
              } : {}),
            }}
          >
            {currentScene?.onScreenText || title || "Judul ceritamu"}
          </div>
          {!currentScene && subtitle ? (
            <div style={{ color: "#d1d2c8", fontSize: "clamp(25px, 3.2vw, 42px)", lineHeight: 1.3, marginTop: 26, maxWidth: 1050 }}>
              {subtitle}
            </div>
          ) : null}
          {!currentScene && characterTraits ? (
            <div style={{ marginTop: 28, color: "#c5c7bc", fontSize: 20, letterSpacing: 0.5 }}>{characterTraits}</div>
          ) : null}
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 16, letterSpacing: 1 }}>
          <span>SEBUAH CERITA DARI {characterName || "KARAKTERMU"}</span>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {timeline.map((scene, index) => (
              <span
                key={scene.id || index}
                style={{
                  width: index === sceneIndex ? 24 : 7,
                  height: 7,
                  borderRadius: 10,
                  backgroundColor: index === sceneIndex ? accent : "#f5f4ed70",
                }}
              />
            ))}
          </div>
        </div>
      </AbsoluteFill>
      {resolvedAudioUrl ? (
        <Audio
          src={resolvedAudioUrl}
          volume={audioNarration ? voiceVolume : audioVolume}
          loop={!audioNarration}
        />
      ) : null}
      {timeline.map((scene) => {
        const voiceSource = scene.voiceAssetPath ? staticFile(scene.voiceAssetPath) : scene.voiceUrl;
        const impactSound = scene.visualType === "punchline" || scene.visualType === "sticker"
          ? "pop.wav"
          : scene.visualType === "quote"
            ? "sparkle.wav"
            : "whoosh.wav";
        return (
          <React.Fragment key={`audio-${scene.id || scene.index}`}>
            {voiceSource ? (
              <Sequence
                from={Math.max(0, Math.round(scene.startSeconds * fps))}
                layout="none"
                name={`Voice ${scene.index + 1}`}
              >
                <Audio src={voiceSource} volume={voiceVolume} />
              </Sequence>
            ) : null}
            {resolvedSfxVolume > 0 ? (
              <Sequence
                from={Math.max(0, Math.round(scene.startSeconds * fps))}
                layout="none"
                name={`Scene impact ${scene.index + 1}`}
              >
                <Audio
                  src={staticFile(`assets/sfx/${impactSound}`)}
                  volume={resolvedSfxVolume}
                />
              </Sequence>
            ) : null}
          </React.Fragment>
        );
      })}
    </AbsoluteFill>
  );
};

export default PromoComposition;
