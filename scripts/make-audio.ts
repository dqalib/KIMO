// Pre-make professional recordings of everything the app says.
// Works with ElevenLabs (recommended) or Google Cloud Text-to-Speech.
//
//   npm.cmd run audio -- --samples       try the British voices on one sentence (audio-samples/)
//   npm.cmd run audio -- --dry-run       count what would be made, and how many characters
//   npm.cmd run audio -- --voice <id>    make every missing recording with that voice
//   npm.cmd run audio -- --max-chars 9000   stop before using more than this many characters
//   npm.cmd run audio -- --voice <id> --force   remake everything (e.g. after changing voice)
//   npm.cmd run audio -- --prune         also delete recordings nothing uses any more
//
// The key: put it on its own in ELEVENLABS_API.txt (ElevenLabs, starts "sk_") or
// GOOGLE_API.txt (Google, starts "AIza") in the KIMO folder — both are git-ignored.
// An ElevenLabs key is recognised in either file.
//
// Files go to public/audio/<key>.mp3 and the list to src/content/audio-manifest.json,
// which the app reads to know what it can play (src/lib/speech.ts). Recordings are
// made in order — phonics, spelling, grammar, reading — so a partial run (monthly
// allowance used up) still covers the most-used words first; run again to continue.

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { audioKey, normaliseSpeech } from "../src/lib/audio-key";
import { allPhrases } from "../src/lib/phrases";

const ROOT = join(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const SAMPLE_DIR = join(ROOT, "audio-samples");
const MANIFEST = join(ROOT, "src", "content", "audio-manifest.json");
const SAMPLE_TEXT = "because. I stayed in because it rained. because. Well done — that's brilliant spelling!";
const RATE = 0.9; // a little slower, for young children

// ---- options ------------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

// ---- keys & providers -----------------------------------------------------------

type Provider = "elevenlabs" | "google";

/** The longest key-looking token in a file (ignores labels like "key:" and line breaks). */
function tokenFrom(file: string): string | undefined {
  const path = join(ROOT, file);
  if (!existsSync(path)) return undefined;
  const text = readFileSync(path, "utf8").replace(/^﻿/, "");
  const tokens = (text.match(/[A-Za-z0-9._~+/=-]{20,}/g) ?? []).filter((t) => !/^(GOOGLE_TTS_API_KEY|ELEVENLABS_API_KEY)$/i.test(t));
  return tokens.sort((a, b) => b.length - a.length)[0];
}

function envLocal(name: string): string | undefined {
  const envFile = join(ROOT, ".env.local");
  if (!existsSync(envFile)) return undefined;
  const line = readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^["']|["']$/g, "") || undefined;
}

function findKey(): { provider: Provider; key: string } | undefined {
  const candidates = [
    process.env.ELEVENLABS_API_KEY,
    envLocal("ELEVENLABS_API_KEY"),
    tokenFrom("EL-API-Key.txt"),
    tokenFrom("EL-API-Key"),
    tokenFrom("ELEVENLABS_API.txt"),
    tokenFrom("ELEVENLABS_API"),
    process.env.GOOGLE_TTS_API_KEY,
    envLocal("GOOGLE_TTS_API_KEY"),
    tokenFrom("GOOGLE_API.txt"),
    tokenFrom("GOOGLE_API"),
  ].filter((k): k is string => !!k);
  const key = candidates[0];
  if (!key) return undefined;
  // Google API keys always start "AIza"; anything else is treated as ElevenLabs ("sk_…").
  return { provider: key.startsWith("AIza") ? "google" : "elevenlabs", key };
}

async function retrying(label: string, call: () => Promise<Response>): Promise<Response> {
  for (let attempt = 1; ; attempt++) {
    const res = await call();
    if (res.ok) return res;
    const msg = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 6) {
      await new Promise((r) => setTimeout(r, 1500 * 2 ** attempt));
      continue;
    }
    throw new Error(`${label} ${res.status}: ${msg.slice(0, 500)}`);
  }
}

// ElevenLabs --------------------------------------------------------------------

const EL = "https://api.elevenlabs.io/v1";
const EL_MODEL = option("model") ?? "eleven_multilingual_v2";

interface ElVoice {
  voice_id: string;
  name: string;
  labels?: Record<string, string>;
  description?: string;
}

/** ElevenLabs' own British voices, used when the key isn't allowed to list voices (no voices_read). */
const EL_BRITISH: ElVoice[] = [
  { voice_id: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", labels: { accent: "british", gender: "female", age: "middle aged" } },
  { voice_id: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", labels: { accent: "british", gender: "female", age: "middle aged" } },
  { voice_id: "ThT5KcBeYPX3keUQqHPh", name: "Dorothy", labels: { accent: "british", gender: "female", age: "young" } },
  { voice_id: "JBFqnCBsd6RMkjVDRZzb", name: "George", labels: { accent: "british", gender: "male", age: "middle aged" } },
  { voice_id: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", labels: { accent: "british", gender: "male", age: "middle aged" } },
];

async function elevenVoices(key: string): Promise<ElVoice[]> {
  try {
    const res = await retrying("ElevenLabs voices", () => fetch(`${EL}/voices`, { headers: { "xi-api-key": key } }));
    return ((await res.json()) as { voices: ElVoice[] }).voices;
  } catch (e) {
    if (!String(e).includes("voices_read")) throw e;
    console.log("(This key can't list voices — using ElevenLabs' built-in British voices instead.)");
    return EL_BRITISH;
  }
}

/** British-sounding voices by their labels/description. */
export function isBritish(v: { labels?: Record<string, string>; description?: string }): boolean {
  const accent = (v.labels?.accent ?? "").toLowerCase();
  if (/american|australian|irish|scottish|indian|african/.test(accent)) return false;
  return /brit|english|\buk\b|london/.test(`${accent} ${(v.description ?? "").toLowerCase()}`);
}

async function elevenSpeak(key: string, voiceId: string, text: string): Promise<Buffer> {
  const res = await retrying("ElevenLabs", () =>
    fetch(`${EL}/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_22050_32`, {
      method: "POST",
      headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
      body: JSON.stringify({
        text,
        model_id: EL_MODEL,
        voice_settings: { stability: 0.6, similarity_boost: 0.75, speed: RATE },
      }),
    }),
  );
  return Buffer.from(await res.arrayBuffer());
}

// Google ------------------------------------------------------------------------

const GOOGLE_SAMPLES = ["Aoede", "Leda", "Kore", "Despina", "Sulafat", "Charon", "Puck", "Iapetus"].map((n) => `en-GB-Chirp3-HD-${n}`);

async function googleSpeak(key: string, voice: string, text: string): Promise<Buffer> {
  const res = await retrying("Google TTS", () =>
    fetch("https://texttospeech.googleapis.com/v1/text:synthesize", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: "en-GB", name: voice },
        audioConfig: { audioEncoding: "MP3", speakingRate: RATE, sampleRateHertz: 24000 },
      }),
    }),
  );
  return Buffer.from(((await res.json()) as { audioContent: string }).audioContent, "base64");
}

// ---- manifest -------------------------------------------------------------------

interface Manifest {
  voice: string | null;
  keys: string[];
}
const readManifest = (): Manifest => JSON.parse(readFileSync(MANIFEST, "utf8"));
const writeManifest = (m: Manifest) => writeFileSync(MANIFEST, JSON.stringify({ voice: m.voice, keys: [...new Set(m.keys)].sort() }, null, 2) + "\n");
const mp3sOnDisk = () => new Set(readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)));

async function inBatches<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0;
  let failure: unknown = null;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length && !failure) {
        try {
          await work(items[next++]);
        } catch (e) {
          failure ??= e;
        }
      }
    }),
  );
  if (failure) throw failure;
}

// ---- main ---------------------------------------------------------------------

async function main() {
  const manifest = readManifest();

  // Unique texts in priority order, keyed by file name.
  const phrases = new Map<string, { text: string; source: string }>();
  for (const p of allPhrases()) {
    const text = normaliseSpeech(p.text);
    if (text && !phrases.has(audioKey(text))) phrases.set(audioKey(text), { text, source: p.source });
  }
  mkdirSync(AUDIO_DIR, { recursive: true });
  const onDisk = mp3sOnDisk();
  let todo = [...phrases.entries()].filter(([k]) => flag("force") || !onDisk.has(k));
  const maxChars = Number(option("max-chars") ?? Infinity);
  if (Number.isFinite(maxChars)) {
    let total = 0;
    todo = todo.filter(([, p]) => {
      if (total + p.text.length > maxChars) return false;
      total += p.text.length;
      return true;
    });
  }
  const chars = todo.reduce((t, [, p]) => t + p.text.length, 0);

  const bySource: Record<string, number> = {};
  for (const [, p] of phrases) bySource[p.source] = (bySource[p.source] ?? 0) + 1;
  console.log(`Phrases: ${phrases.size} (${Object.entries(bySource).map(([s, n]) => `${s} ${n}`).join(", ")})`);
  console.log(`Already made: ${[...phrases.keys()].filter((k) => onDisk.has(k)).length} · to make now: ${todo.length} (${chars.toLocaleString()} characters)`);
  if (flag("dry-run")) return;

  const found = findKey();
  if (!found) {
    console.error("\nNo API key found. Put your ElevenLabs key on its own in ELEVENLABS_API.txt in the KIMO folder, then run again.");
    process.exit(1);
  }
  const { provider, key } = found;
  console.log(`Provider: ${provider === "elevenlabs" ? "ElevenLabs" : "Google"} · key …${key.slice(-4)}`);

  // Samples: several British voices saying the same sentence.
  if (flag("samples")) {
    mkdirSync(SAMPLE_DIR, { recursive: true });
    if (provider === "elevenlabs") {
      const voices = await elevenVoices(key);
      const british = voices.filter(isBritish);
      const pick = (british.length ? british : voices).slice(0, 10);
      if (!british.length) console.log("(No voices labelled British in your ElevenLabs voice list — sampling the first few. Add British voices from the Voice Library, then run again.)");
      for (const v of pick) {
        const file = `${v.name.replace(/[^A-Za-z0-9]+/g, "-")}__${v.voice_id}.mp3`;
        try {
          writeFileSync(join(SAMPLE_DIR, file), await elevenSpeak(key, v.voice_id, SAMPLE_TEXT));
        } catch (e) {
          console.log(`  ✗ ${v.name}: ${String(e).slice(0, 200)}`);
          continue;
        }
        console.log(`  ✓ audio-samples/${file}   (${[v.labels?.accent, v.labels?.gender, v.labels?.age].filter(Boolean).join(", ")})`);
      }
      console.log("\nListen, then run:  npm.cmd run audio -- --voice <the ID after the __ in the file name>");
    } else {
      for (const v of GOOGLE_SAMPLES) {
        writeFileSync(join(SAMPLE_DIR, `${v}.mp3`), await googleSpeak(key, v, SAMPLE_TEXT));
        console.log(`  ✓ audio-samples/${v}.mp3`);
      }
      console.log("\nListen, then run:  npm.cmd run audio -- --voice <the one you like>");
    }
    return;
  }

  const voice = option("voice") ?? manifest.voice?.replace(/^elevenlabs:/, "") ?? undefined;
  if (!voice) {
    console.error("\nChoose a voice first: run with --samples, listen, then add --voice <id>.");
    process.exit(1);
  }
  const voiceTag = provider === "elevenlabs" ? `elevenlabs:${voice}` : voice;
  if (manifest.voice && manifest.voice !== voiceTag && !flag("force")) {
    console.error(`\nThe existing recordings use ${manifest.voice}. To switch everything to ${voiceTag}, add --force.`);
    process.exit(1);
  }

  const speakOne = (text: string) => (provider === "elevenlabs" ? elevenSpeak(key, voice, text) : googleSpeak(key, voice, text));
  let done = 0;
  const save = () => writeManifest({ voice: voiceTag, keys: [...mp3sOnDisk()].filter((k) => phrases.has(k)) });
  try {
    // ElevenLabs allows only a few requests at once on smaller plans.
    await inBatches(todo, provider === "elevenlabs" ? 2 : 4, async ([k, p]) => {
      writeFileSync(join(AUDIO_DIR, `${k}.mp3`), await speakOne(p.text));
      done++;
      if (done % 25 === 0 || done === todo.length) {
        process.stdout.write(`  ${done}/${todo.length}\r`);
        save();
      }
    });
  } catch (e) {
    save();
    console.error(`\nStopped after ${done} recording(s): ${e instanceof Error ? e.message : e}`);
    console.error("Everything made so far is saved. If your monthly allowance ran out, run the same command again next month (or after upgrading) — it carries on where it stopped.");
    process.exit(1);
  }

  const stale = [...mp3sOnDisk()].filter((k) => !phrases.has(k));
  if (flag("prune")) for (const k of stale) unlinkSync(join(AUDIO_DIR, `${k}.mp3`));
  save();
  const left = [...phrases.keys()].filter((k) => !mp3sOnDisk().has(k)).length;
  console.log(`\nDone: made ${done} recording(s).${left ? ` ${left} still to make — run again to continue.` : " Everything is recorded."}${stale.length && !flag("prune") ? ` ${stale.length} old file(s) no longer used — add --prune to delete them.` : ""}`);
  console.log("Next: git add -A, check git status (no API files listed), commit and push.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
