import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream } from "node:fs";
import { copyFile, cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Busboy from "busboy";
import { pipeline } from "node:stream/promises";

const MAX_FILE_BYTES = 150 * 1024 * 1024;
const MAX_TOTAL_BYTES = 300 * 1024 * 1024;
const MAX_RENDER_ASSETS = 15;
const SCENE_VISUAL_TYPES = new Set(["hero", "split", "quote", "punchline", "cinematic", "sticker", "poster"]);
const SCENE_MOTIONS = new Set(["rise", "drift", "zoom", "pop", "reveal"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EXTENSIONS_BY_TYPE = {
  "image/avif": ".avif",
  "image/bmp": ".bmp",
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp",
  "image/x-icon": ".ico",
  "video/mp4": ".mp4",
  "video/quicktime": ".mov",
  "video/webm": ".webm",
  "video/x-m4v": ".m4v",
  "video/x-matroska": ".mkv",
  "video/x-msvideo": ".avi",
  "audio/aac": ".aac",
  "audio/flac": ".flac",
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/x-m4a": ".m4a",
  "audio/webm": ".webm",
  "audio/x-wav": ".wav",
};

const jobs = new Map();

class RequestError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

const sendJson = (response, status, body) => {
  response.writeHead(status, {
    "Cache-Control": "no-store",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
};

const isLoopback = (value) => {
  const address = value?.toLowerCase();
  return (
    address === "::1" ||
    address === "127.0.0.1" ||
    address?.startsWith("127.") ||
    address?.startsWith("::ffff:127.")
  );
};

const assertLocalRequest = (request, requireOrigin = false) => {
  if (!isLoopback(request.socket.remoteAddress)) {
    throw new RequestError("Render endpoint only accepts requests from this computer.", 403);
  }

  const host = request.headers.host;
  const origin = request.headers.origin;
  if (!host) throw new RequestError("Missing request host.", 403);
  if (requireOrigin && !origin) {
    throw new RequestError("Render requests must originate from this studio.", 403);
  }
  if (origin) {
    const originUrl = new URL(origin);
    const originHost = originUrl.hostname.toLowerCase();
    const localOrigin = ["localhost", "127.0.0.1", "[::1]"].includes(originHost);
    if (!localOrigin || originUrl.host !== host || !["http:", "https:"].includes(originUrl.protocol)) {
      throw new RequestError("Render requests must originate from this local studio.", 403);
    }
  }
};

const validateProject = (project) => {
  if (!project || typeof project !== "object" || Array.isArray(project)) {
    throw new Error("The render project is invalid.");
  }

  const stringFields = ["characterName", "characterTraits", "title", "subtitle"];
  for (const field of stringFields) {
    if (typeof project[field] !== "string" || project[field].length > 5000) {
      throw new RequestError(`The ${field} field is invalid or too long.`);
    }
  }

  if (!["portrait", "landscape"].includes(project.format)) {
    throw new RequestError("Choose a portrait or landscape video format.");
  }
  if (
    project.visualStyle !== undefined &&
    !["playful-editorial", "cinematic", "minimal", "comic", "warm-documentary"].includes(project.visualStyle)
  ) {
    throw new RequestError("Choose a supported overall visual style.");
  }
  if (
    !Number.isSafeInteger(project.durationSeconds) ||
    project.durationSeconds <= 0 ||
    !Number.isSafeInteger(project.durationSeconds * 30)
  ) {
    throw new RequestError("Video duration must be a positive number of seconds that Remotion can render.");
  }
  if (typeof project.accent !== "string" || !/^#[0-9a-f]{6}$/i.test(project.accent)) {
    throw new RequestError("The accent color is invalid.");
  }
  if (typeof project.audioVolume !== "number" || project.audioVolume < 0 || project.audioVolume > 1) {
    throw new RequestError("Audio volume must be between 0 and 1.");
  }
  if (
    project.voiceVolume !== undefined &&
    (typeof project.voiceVolume !== "number" || project.voiceVolume < 0 || project.voiceVolume > 1)
  ) {
    throw new RequestError("Voice-over volume must be between 0 and 1.");
  }

  const assetFields = ["backgroundId", "characterAssetId", "audioId"];
  for (const field of assetFields) {
    if (project[field] !== "" && !UUID_PATTERN.test(project[field])) {
      throw new RequestError(`The ${field} asset selection is invalid.`);
    }
  }

  const scenes = project.scenes ?? [];
  if (!Array.isArray(scenes) || scenes.length > 12) {
    throw new RequestError("A video can have up to 12 editable scenes.");
  }
  for (const scene of scenes) {
    if (
      !scene ||
      typeof scene !== "object" ||
      ["label", "onScreenText", "narration", "visualDescription"].some(
        (field) => typeof scene[field] !== "string" || scene[field].length > 5000,
      )
    ) {
      throw new RequestError("One of the editable scenes is invalid.");
    }
    if (
      (scene.visualType !== undefined && !SCENE_VISUAL_TYPES.has(scene.visualType)) ||
      (scene.motionPreset !== undefined && !SCENE_MOTIONS.has(scene.motionPreset))
    ) {
      throw new RequestError("One of the editable scenes has an unsupported visual type or motion preset.");
    }
    if (
      scene.voiceAssetId !== undefined &&
      scene.voiceAssetId !== "" &&
      !UUID_PATTERN.test(scene.voiceAssetId)
    ) {
      throw new RequestError("One of the scene voice-over selections is invalid.");
    }
    for (const field of ["durationSeconds", "voiceDurationSeconds", "pauseAfterSeconds"]) {
      if (
        scene[field] !== undefined &&
        (typeof scene[field] !== "number" || !Number.isFinite(scene[field]) || scene[field] < 0 || scene[field] > 86400)
      ) {
        throw new RequestError(`One of the scene ${field} values is invalid.`);
      }
    }
  }

  return { ...project, scenes, visualStyle: project.visualStyle || "playful-editorial" };
};

const readMultipart = (request, temporaryDirectory) =>
  new Promise((resolve, reject) => {
    let projectJson;
    let parseError;
    let totalBytes = 0;
    const uploaded = new Map();
    const writes = [];
    let finished = false;
    const parser = Busboy({
      headers: request.headers,
      limits: {
        fieldSize: 64 * 1024,
        fields: 1,
        fileSize: MAX_FILE_BYTES,
        files: MAX_RENDER_ASSETS,
        parts: MAX_RENDER_ASSETS + 1,
      },
    });

    const fail = (error) => {
      if (finished) return;
      finished = true;
      reject(error);
    };

    parser.on("field", (name, value, info) => {
      if (name !== "project" || projectJson !== undefined || info.valueTruncated) {
        parseError = new Error("The render request contains invalid project data.");
        return;
      }
      projectJson = value;
    });

    parser.on("file", (fieldName, stream, info) => {
      const match = /^asset:([0-9a-f-]{36})$/i.exec(fieldName);
      if (!match || uploaded.has(match[1])) {
        parseError = new Error("The render request contains an invalid or duplicate asset.");
        stream.resume();
        return;
      }

      const id = match[1];
      const type = info.mimeType.toLowerCase();
      const extension = EXTENSIONS_BY_TYPE[type];
      if (!extension) {
        parseError = new Error(`The selected asset format is not supported: ${type || "unknown"}.`);
        stream.resume();
        return;
      }

      const filePath = path.join(temporaryDirectory, `${id}${extension}`);
      let fileBytes = 0;
      stream.on("data", (chunk) => {
        fileBytes += chunk.length;
        totalBytes += chunk.length;
        if (totalBytes > MAX_TOTAL_BYTES) {
          parseError = new Error("Selected assets exceed the 300 MB render limit.");
          stream.resume();
        }
      });
      stream.on("limit", () => {
        parseError = new Error("Each selected asset must be smaller than 150 MB to render.");
      });

      const write = pipeline(stream, createWriteStream(filePath)).then(() => {
        if (!parseError) uploaded.set(id, { filePath, type, size: fileBytes });
      });
      writes.push(write);
    });

    parser.on("filesLimit", () => {
      parseError = new Error(`A video can use up to ${MAX_RENDER_ASSETS} selected assets.`);
    });
    parser.on("fieldsLimit", () => {
      parseError = new Error("The render request contains too many fields.");
    });
    parser.on("partsLimit", () => {
      parseError = new Error("The render request contains too many parts.");
    });
    parser.on("error", fail);
    parser.on("close", async () => {
      try {
        await Promise.all(writes);
        if (parseError) throw parseError;
        if (!projectJson) throw new Error("The render project is missing.");
        resolve({ project: validateProject(JSON.parse(projectJson)), uploaded });
      } catch (error) {
        fail(error);
      }
    });
    request.on("aborted", () => fail(new Error("The render request was interrupted.")));
    request.pipe(parser);
  });

const getAssetUrl = (id, uploaded, publicDirectory, renderId) => {
  if (!id) return undefined;
  const asset = uploaded.get(id);
  if (!asset) throw new RequestError("One of the selected assets is missing. Re-select it and try again.");
  const assetDirectory = path.join(publicDirectory, "_framefolk-renders", renderId);
  const fileName = `${id}${path.extname(asset.filePath)}`;
  return {
    source: asset,
    destination: path.join(assetDirectory, fileName),
    publicPath: path.posix.join("_framefolk-renders", renderId, fileName),
  };
};

const makeRenderProps = (project, uploaded, publicDirectory, renderId) => {
  const selected = new Map();
  const resolveAsset = (id, expectedType) => {
    const asset = getAssetUrl(id, uploaded, publicDirectory, renderId);
    if (!asset) return undefined;
    if (expectedType && !asset.source.type.startsWith(expectedType)) {
      throw new RequestError(`A selected ${expectedType} asset has the wrong file type.`);
    }
    selected.set(id, asset);
    return asset.publicPath;
  };

  const backgroundAsset = project.backgroundId ? uploaded.get(project.backgroundId) : undefined;
  if (backgroundAsset && !/^(image|video)\//.test(backgroundAsset.type)) {
    throw new RequestError("The selected background must be an image or video.");
  }
  const backgroundUrl = resolveAsset(project.backgroundId);

  return {
    inputProps: {
      characterName: project.characterName,
      characterTraits: project.characterTraits,
      characterImagePath: resolveAsset(project.characterAssetId, "image/"),
      title: project.title,
      subtitle: project.subtitle,
      scenes: project.scenes.map((scene) => ({
        ...scene,
        voiceAssetPath: resolveAsset(scene.voiceAssetId, "audio/"),
      })),
      accent: project.accent,
      visualStyle: project.visualStyle,
      backgroundAssetPath: backgroundUrl,
      backgroundType: project.backgroundId
        ? uploaded.get(project.backgroundId)?.type.startsWith("video/")
          ? "video"
          : "image"
        : undefined,
      audioAssetPath: resolveAsset(project.audioId, "audio/"),
      audioVolume: project.audioVolume,
      voiceVolume: project.voiceVolume ?? 1,
      durationInFrames: project.durationSeconds * 30,
      compositionWidth: project.format === "portrait" ? 1080 : 1920,
      compositionHeight: project.format === "portrait" ? 1920 : 1080,
    },
    selectedAssets: selected,
  };
};

const updateProgress = (job, output) => {
  const combined = `${job.progressBuffer}${output}`;
  const lines = combined.split(/\r?\n/);
  job.progressBuffer = lines.pop() ?? "";
  for (const line of lines) {
    const match = /Rendered\s+(\d+)\/(\d+)/.exec(line);
    if (!match) continue;
    const completed = Number(match[1]);
    const total = Number(match[2]);
    if (total > 0) {
      job.progress = Math.min(99, Math.floor((completed / total) * 100));
      job.message = `Merender frame ${completed} dari ${total}...`;
    }
  }
};

const runRender = (job, { root, publicDirectory, temporaryDirectory, renderDirectory, project, uploaded }) => {
  void (async () => {
    const temporaryPublicDirectory = path.join(temporaryDirectory, "public");
    const publicAssets = path.join(temporaryPublicDirectory, "_framefolk-renders", job.id);
    const outputPath = path.join(renderDirectory, `${job.id}.mp4`);
    const propsPath = path.join(temporaryDirectory, "props.json");

    try {
      await cp(publicDirectory, temporaryPublicDirectory, { recursive: true });
      const { inputProps, selectedAssets } = makeRenderProps(
        project,
        uploaded,
        temporaryPublicDirectory,
        job.id,
      );
      await mkdir(publicAssets, { recursive: true });
      await mkdir(renderDirectory, { recursive: true });

      for (const asset of selectedAssets.values()) {
        await copyFile(asset.source.filePath, asset.destination);
      }

      await writeFile(propsPath, JSON.stringify(inputProps), "utf8");

      const cliPath = path.join(root, "node_modules", "@remotion", "cli", "remotion-cli.js");
      const entryPoint = path.join(root, "src", "remotion", "root.jsx");
      const child = spawn(
        process.execPath,
        [
          cliPath,
          "render",
          entryPoint,
          "Promo",
          outputPath,
          `--props=${propsPath}`,
          `--public-dir=${temporaryPublicDirectory}`,
          "--concurrency=4",
        ],
        { cwd: root, windowsHide: true },
      );

      job.message = "Menyiapkan render Remotion...";
      let errorOutput = "";
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => updateProgress(job, chunk));
      child.stderr.on("data", (chunk) => {
        errorOutput = `${errorOutput}${chunk}`.slice(-8000);
      });
      child.on("error", (error) => {
        job.status = "failed";
        job.message = `Remotion gagal dijalankan: ${error.message}`;
      });
      child.on("close", async (code) => {
        try {
          if (job.status === "failed") return;
          if (code !== 0) {
            job.status = "failed";
            job.message = errorOutput.trim().slice(-3000) || `Proses render berhenti dengan kode ${code}.`;
            return;
          }
          const output = await stat(outputPath);
          if (!output.isFile() || output.size === 0) throw new Error("MP4 hasil render kosong.");
          job.status = "completed";
          job.progress = 100;
          job.message = "MP4 siap diunduh.";
        } catch (error) {
          job.status = "failed";
          job.message = error.message;
        } finally {
          await rm(temporaryDirectory, { recursive: true, force: true });
        }
      });
    } catch (error) {
      job.status = "failed";
      job.message = error.message;
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  })();
};

const createRenderMiddleware = ({ root, publicDirectory }) => async (request, response, next) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  if (!pathname.startsWith("/api/renders")) {
    next();
    return;
  }

  try {
    assertLocalRequest(request, request.method === "POST");
    if (request.method === "POST" && pathname === "/api/renders") {
      if ([...jobs.values()].some((job) => job.status === "rendering")) {
        sendJson(response, 409, { error: "Tunggu sampai render yang sedang berjalan selesai." });
        return;
      }

      const id = randomUUID();
      const temporaryDirectory = path.join(os.tmpdir(), `framefolk-${id}`);
      await mkdir(temporaryDirectory, { recursive: true });
      let parsed;
      try {
        parsed = await readMultipart(request, temporaryDirectory);
      } catch (error) {
        await rm(temporaryDirectory, { recursive: true, force: true });
        sendJson(response, 400, { error: error.message });
        return;
      }

      const renderDirectory = path.join(root, "out");
      const job = {
        id,
        status: "rendering",
        progress: 0,
        message: "Mengunggah aset untuk render...",
        progressBuffer: "",
        outputPath: path.join(renderDirectory, `${id}.mp4`),
      };
      jobs.set(id, job);
      runRender(job, {
        root,
        publicDirectory,
        temporaryDirectory,
        renderDirectory,
        ...parsed,
      });
      sendJson(response, 202, { id });
      return;
    }

    const match = /^\/api\/renders\/([0-9a-f-]{36})(\/file)?$/i.exec(pathname);
    if (!match) {
      sendJson(response, 404, { error: "Render tidak ditemukan." });
      return;
    }

    const job = jobs.get(match[1]);
    if (!job) {
      sendJson(response, 404, { error: "Render ini tidak ditemukan; mulai render baru dari studio." });
      return;
    }
    if (match[2] === "/file") {
      if (request.method !== "GET") {
        sendJson(response, 405, { error: "Metode request tidak didukung." });
        return;
      }
      if (job.status !== "completed") {
        sendJson(response, 409, { error: "Video belum selesai dirender." });
        return;
      }
      const file = await stat(job.outputPath);
      response.writeHead(200, {
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="framefolk-${job.id}.mp4"`,
        "Content-Length": file.size,
        "Content-Type": "video/mp4",
        "X-Content-Type-Options": "nosniff",
      });
      const stream = createReadStream(job.outputPath);
      stream.on("error", (error) => {
        console.error("Could not stream the rendered video.", error);
        response.destroy(error);
      });
      stream.pipe(response);
      return;
    }

    if (request.method !== "GET") {
      sendJson(response, 405, { error: "Metode request tidak didukung." });
      return;
    }
    sendJson(response, 200, {
      id: job.id,
      status: job.status,
      progress: job.progress,
      message: job.message,
    });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 400;
    if (status === 403) console.error("Local render request failed.", error);
    if (!response.headersSent) sendJson(response, status, { error: error.message });
    else response.destroy(error);
  }
};

export const renderPlugin = () => {
  let middleware;
  return {
    name: "framefolk-local-render",
    configResolved(config) {
      middleware = createRenderMiddleware({
        root: config.root,
        publicDirectory: config.publicDir,
      });
    },
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
};
