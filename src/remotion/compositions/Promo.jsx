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
  audioVolume,
  voiceVolume,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
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
    if (frame >= scene.startSeconds * 30) sceneIndex = scene.index;
    else break;
  }
  const currentScene = sceneIndex >= 0 ? timeline[sceneIndex] : undefined;
  const sceneStart = currentScene ? currentScene.startSeconds * 30 : 0;
  const sceneDuration = currentScene ? currentScene.activeDuration * 30 : durationInFrames;
  const sceneFrame = frame - sceneStart;
  const enterFrames = Math.max(1, Math.min(20, sceneDuration / 2));
  const sceneOpacity = interpolate(sceneFrame, [0, enterFrames], [0, 1], { extrapolateRight: "clamp" });
  const motionPreset = currentScene?.motionPreset || "rise";
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

  const characterPosition = {
    hero: { right: "5%", bottom: "13%", width: "43%", height: "61%" },
    split: { right: "3%", bottom: "12%", width: "45%", height: "66%" },
    quote: { right: "8%", bottom: "8%", width: "30%", height: "43%" },
    punchline: { right: "0%", bottom: "3%", width: "56%", height: "61%" },
    cinematic: { right: "-4%", bottom: "-2%", width: "72%", height: "77%" },
    sticker: { right: "4%", bottom: "12%", width: "50%", height: "62%", transform: "rotate(-5deg)" },
    poster: { right: "6%", bottom: "13%", width: "38%", height: "65%" },
  }[visualType] || { right: "5%", bottom: "13%", width: "43%", height: "61%" };
  const copyPosition = {
    hero: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "88%" },
    split: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "57%" },
    quote: { alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "82%" },
    punchline: { alignItems: "center", justifyContent: "center", textAlign: "center", maxWidth: "94%" },
    cinematic: { alignItems: "flex-start", justifyContent: "flex-end", textAlign: "left", maxWidth: "90%" },
    sticker: { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "56%" },
    poster: { alignItems: "flex-start", justifyContent: "space-between", textAlign: "left", maxWidth: "88%" },
  }[visualType] || { alignItems: "flex-start", justifyContent: "center", textAlign: "left", maxWidth: "88%" };
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
          style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: visualType === "cinematic" ? 0.72 : 0.54 }}
        />
      ) : null}
      {resolvedBackgroundUrl && backgroundType === "video" ? (
        <Video
          src={resolvedBackgroundUrl}
          muted
          style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", opacity: 0.58 }}
        />
      ) : null}
      <AbsoluteFill style={{ background: styleTreatment }} />
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
      {resolvedCharacterImageUrl ? (
        <Img
          src={resolvedCharacterImageUrl}
          style={{
            position: "absolute",
            ...characterPosition,
            objectFit: "contain",
            objectPosition: "bottom",
            filter: "drop-shadow(0 18px 36px rgba(0,0,0,.4))",
          }}
        />
      ) : null}
      <AbsoluteFill
        style={{
          padding: visualType === "cinematic" ? "11% 10%" : "8%",
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
            alignSelf: copyPosition.alignItems === "center" ? "center" : "flex-start",
            display: "flex",
            flexDirection: "column",
            justifyContent: copyPosition.justifyContent,
            textAlign: copyPosition.textAlign,
            width: copyPosition.maxWidth,
            minHeight: visualType === "cinematic" ? "48%" : "57%",
            transform: motionTransform,
            opacity: sceneOpacity,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              alignSelf: copyPosition.alignItems === "center" ? "center" : "flex-start",
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
              fontSize: visualType === "punchline" ? "clamp(64px, 11vw, 150px)" : visualType === "poster" ? "clamp(64px, 11vw, 150px)" : "clamp(54px, 9.5vw, 128px)",
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
      {resolvedAudioUrl ? <Audio src={resolvedAudioUrl} volume={audioVolume} loop /> : null}
      {timeline.map((scene) => {
        const voiceSource = scene.voiceAssetPath ? staticFile(scene.voiceAssetPath) : scene.voiceUrl;
        if (!voiceSource) return null;
        return (
          <Sequence
            key={`voice-${scene.id || scene.index}`}
            from={Math.max(0, Math.round(scene.startSeconds * 30))}
            layout="none"
            name={`Voice ${scene.index + 1}`}
          >
            <Audio src={voiceSource} volume={voiceVolume} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

export default PromoComposition;
