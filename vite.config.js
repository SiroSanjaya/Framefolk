import { defineConfig } from "vite";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { aiPlugin } from "./src/server/aiMiddleware.js";
import { renderPlugin } from "./src/server/renderMiddleware.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  for (const key of [
    "AI_PROVIDER",
    "GEMINI_API_KEY",
    "GEMINI_MODEL",
    "GEMINI_IMAGE_MODEL",
    "PEXELS_API_KEY",
    "ANTHROPIC_API_KEY",
    "ANTHROPIC_MODEL",
    "ELEVENLABS_API_KEY",
    "ELEVENLABS_MODEL",
    "ELEVENLABS_VOICE_ID",
  ]) {
    if (!process.env[key] && env[key]) process.env[key] = env[key];
  }

  return {
    plugins: [react(), aiPlugin(), renderPlugin()],
  };
});
