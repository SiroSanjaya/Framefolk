import { Composition } from "remotion";
import PromoComposition from "./compositions/Promo.jsx";

export const RemotionRoot = () => (
  <Composition
    id="Promo"
    component={PromoComposition}
    durationInFrames={450}
    fps={30}
    width={1080}
    height={1920}
    calculateMetadata={({ props }) => ({
      durationInFrames: props.durationInFrames ?? 450,
      width: props.compositionWidth ?? 1080,
      height: props.compositionHeight ?? 1920,
    })}
    defaultProps={{
      characterName: "Nara",
      characterTraits: "Ceria · observan · sedikit usil",
      characterImageUrl: undefined,
      characterImagePath: undefined,
      title: "Cerita yang terasa dekat.",
      subtitle: "Satu karakter. Banyak cerita. Tetap terasa seperti dirinya.",
      scenes: [],
      accent: "#c1f17b",
      visualStyle: "playful-editorial",
      backgroundUrl: undefined,
      backgroundAssetPath: undefined,
      backgroundType: undefined,
      audioUrl: undefined,
      audioAssetPath: undefined,
      audioVolume: 0.7,
      voiceVolume: 1,
      durationInFrames: 450,
      compositionWidth: 1080,
      compositionHeight: 1920,
    }}
  />
);
