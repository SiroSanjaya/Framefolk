import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { afterEach, beforeEach, test } from "node:test";
import { aiPlugin } from "./aiMiddleware.js";

let middleware;
let originalFetch;

beforeEach(() => {
  const plugin = aiPlugin();
  plugin.configResolved({
    env: {
      ELEVENLABS_API_KEY: "test-key",
      PEXELS_API_KEY: "pexels-test-key",
    },
  });
  plugin.configureServer({
    middlewares: {
      use(handler) {
        middleware = handler;
      },
    },
  });
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const callMiddleware = async (method, url, body) => {
  const request = Readable.from(
    body === undefined ? [] : [Buffer.from(JSON.stringify(body))],
  );
  Object.assign(request, {
    method,
    url,
    headers: {
      host: "localhost:5173",
      origin: "http://localhost:5173",
    },
    socket: { remoteAddress: "127.0.0.1" },
  });
  const response = {
    headersSent: false,
    writeHead(status, headers) {
      this.statusCode = status;
      this.headers = headers;
      this.headersSent = true;
    },
    end(value) {
      this.body = value;
    },
  };
  await middleware(request, response, () => {});
  return {
    status: response.statusCode,
    body: JSON.parse(response.body || "{}"),
  };
};

const speechRequest = (text) => ({
  text,
  voiceId: "voice_123",
  voiceDelivery: "natural",
});

const speechResponse = () => ({
  ok: true,
  status: 200,
  json: async () => ({
    audio_base64: Buffer.from("audio").toString("base64"),
    alignment: {
      characters: [],
      character_start_times_seconds: [],
      character_end_times_seconds: [],
    },
  }),
});

test("does not call text-to-speech when the account character limit is exhausted", async () => {
  const requestedUrls = [];
  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ character_count: 1000, character_limit: 1000 }),
    };
  };

  const result = await callMiddleware(
    "POST",
    "/api/ai/speech",
    speechRequest("Hello"),
  );

  assert.equal(result.status, 402);
  assert.match(result.body.error, /sisa kuota ElevenLabs hanya 0/);
  assert.deepEqual(requestedUrls, [
    "https://api.elevenlabs.io/v1/user/subscription",
  ]);
});

test("rejects voice-over above the per-video character cap before calling providers", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Unexpected provider call.");
  };

  const result = await callMiddleware(
    "POST",
    "/api/ai/speech",
    speechRequest("a".repeat(801)),
  );

  assert.equal(result.status, 400);
  assert.match(result.body.error, /dibatasi 800 karakter per video/);
  assert.equal(fetchCalled, false);
});

test("keeps the existing timestamped voice model as the default", async () => {
  let speechModel;
  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith("/v1/user/subscription")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ character_count: 0, character_limit: 500 }),
      };
    }

    speechModel = JSON.parse(options.body).model_id;
    return speechResponse();
  };

  const result = await callMiddleware(
    "POST",
    "/api/ai/speech",
    speechRequest("Halo, dunia."),
  );

  assert.equal(result.status, 200);
  assert.equal(speechModel, "eleven_multilingual_v2");
});

test("serializes concurrent speech requests against the remaining character quota", async () => {
  let usedCharacters = 0;
  let speechRequests = 0;
  globalThis.fetch = async (url, options = {}) => {
    if (url.endsWith("/v1/user/subscription")) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          character_count: usedCharacters,
          character_limit: 500,
        }),
      };
    }

    speechRequests += 1;
    usedCharacters += Array.from(JSON.parse(options.body).text).length;
    return speechResponse();
  };

  const [first, second] = await Promise.all([
    callMiddleware("POST", "/api/ai/speech", speechRequest("a".repeat(400))),
    callMiddleware("POST", "/api/ai/speech", speechRequest("b".repeat(400))),
  ]);

  assert.deepEqual([first.status, second.status].sort(), [200, 402]);
  assert.equal(speechRequests, 1);
  assert.equal(usedCharacters, 400);
});

test("searches Pexels server-side and returns attributed, validated photo results", async () => {
  let requestedUrl;
  globalThis.fetch = async (url, options) => {
    requestedUrl = new URL(url);
    assert.equal(options.headers.Authorization, "pexels-test-key");
    return {
      ok: true,
      status: 200,
      json: async () => ({
        photos: [{
          id: 123,
          alt: "A person drawing at a desk",
          photographer: "Example Photographer",
          photographer_url: "https://www.pexels.com/@example",
          url: "https://www.pexels.com/photo/example-123/",
          width: 1200,
          height: 1800,
          src: { large: "https://images.pexels.com/photos/123/example.jpeg" },
        }],
      }),
    };
  };

  const result = await callMiddleware("POST", "/api/ai/stock/search", {
    query: "person drawing at a desk",
    orientation: "portrait",
  });

  assert.equal(result.status, 200);
  assert.equal(requestedUrl.origin, "https://api.pexels.com");
  assert.equal(requestedUrl.pathname, "/v1/search");
  assert.equal(requestedUrl.searchParams.get("query"), "person drawing at a desk");
  assert.equal(result.body.photos[0].photographer, "Example Photographer");
  assert.equal(result.body.attributionUrl, "https://www.pexels.com");
});

test("does not fetch an imported stock image from an untrusted host", async () => {
  let fetchCalled = false;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error("Unexpected external request.");
  };

  const result = await callMiddleware("POST", "/api/ai/stock/download", {
    imageUrl: "https://example.com/image.jpg",
  });

  assert.equal(result.status, 400);
  assert.match(result.body.error, /CDN resmi Pexels/);
  assert.equal(fetchCalled, false);
});

test("downloads a valid Pexels image and returns its verified image type", async () => {
  const pngBytes = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3]);
  globalThis.fetch = async (url, options) => {
    assert.equal(new URL(url).hostname, "images.pexels.com");
    assert.equal(options.redirect, "manual");
    return {
      ok: true,
      status: 200,
      headers: {
        get(name) {
          return name === "content-type" ? "image/png" : String(pngBytes.length);
        },
      },
      body: Readable.toWeb(Readable.from([pngBytes])),
    };
  };

  const result = await callMiddleware("POST", "/api/ai/stock/download", {
    imageUrl: "https://images.pexels.com/photos/123/example.png",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.mimeType, "image/png");
  assert.equal(Buffer.from(result.body.imageBase64, "base64").length, pngBytes.length);
});
