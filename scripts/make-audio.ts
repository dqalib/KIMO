// Pre-make professional recordings of everything the app says, using a
// Google Cloud Text-to-Speech British voice (Chirp 3 HD).
//
//   npm run audio -- --samples      try several voices on one sentence (audio-samples/)
//   npm run audio -- --dry-run      count what would be made, and how many characters
//   npm run audio                   make every missing recording
//   npm run audio -- --voice en-GB-Chirp3-HD-Leda --force   switch voice and remake all
//   npm run audio -- --prune        also delete recordings nothing uses any more
//
// Needs GOOGLE_TTS_API_KEY — set it in .env.local (never committed) or the shell.
// Files go to public/audio/<key>.mp3 and the list to src/content/audio-manifest.json,
// which the app reads to know what it can play (src/lib/speech.ts).

import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { audioKey, normaliseSpeech } from "../src/lib/audio-key";
import { allPhrases } from "../src/lib/phrases";

const ROOT = join(__dirname, "..");
const AUDIO_DIR = join(ROOT, "public", "audio");
const SAMPLE_DIR = join(ROOT, "audio-samples");
const MANIFEST = join(ROOT, "src", "content", "audio-manifest.json");
const DEFAULT_VOICE = "en-GB-Chirp3-HD-Aoede";
const SAMPLE_VOICES = [
  "en-GB-Chirp3-HD-Aoede",
  "en-GB-Chirp3-HD-Leda",
  "en-GB-Chirp3-HD-Kore",
  "en-GB-Chirp3-HD-Despina",
  "en-GB-Chirp3-HD-Sulafat",
  "en-GB-Chirp3-HD-Charon",
  "en-GB-Chirp3-HD-Puck",
  "en-GB-Chirp3-HD-Iapetus",
];
const SAMPLE_TEXT = "because. I stayed in because it rained. because. Well done, Yonis — that's brilliant spelling!";
const RATE = 0.9; // a little slower, for young children

// ---- tiny helpers -------------------------------------------------------------

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};

function loadKey(): string | undefined {
  if (process.env.GOOGLE_TTS_API_KEY) return process.env.GOOGLE_TTS_API_KEY.trim();
  const envFile = join(ROOT, ".env.local");
  if (!existsSync(envFile)) return undefined;
  const line = readFileSync(envFile, "utf8")
    .split(/\r?\n/)
    .find((l) => l.startsWith("GOOGLE_TTS_API_KEY="));
  return line?.slice("GOOGLE_TTS_API_KEY=".length).trim().replace(/^["']|["']$/g, "");
}

interface Manifest {
  voice: string | null;
  keys: string[];
}
const readManifest = (): Manifest => JSON.parse(readFileSync(MANIFEST, "utf8"));
const writeManifest = (m: Manifest) => writeFileSync(MANIFEST, JSON.stringify({ voice: m.voice, keys: [...new Set(m.keys)].sort() }, null, 2) + "\n");

async function synthesize(apiKey: string, voice: string, text: string): Promise<Buffer> {
  const body = {
    input: { text },
    voice: { languageCode: "en-GB", name: voice },
    audioConfig: { audioEncoding: "MP3", speakingRate: RATE, sampleRateHertz: 24000 },
  };
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = (await res.json()) as { audioContent: string };
      return Buffer.from(json.audioContent, "base64");
    }
    const msg = await res.text();
    // Rate limits / hiccups: wait and retry a few times. Anything else: stop.
    if ((res.status === 429 || res.status >= 500) && attempt < 5) {
      await new Promise((r) => setTimeout(r, 1000 * 2 ** attempt));
      continue;
    }
    throw new Error(`Google TTS ${res.status}: ${msg.slice(0, 400)}`);
  }
}

async function inBatches<T>(items: T[], size: number, work: (item: T) => Promise<void>) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) await work(items[next++]);
    }),
  );
}

// ---- main ---------------------------------------------------------------------

async function main() {
  const manifest = readManifest();
  const voice = option("voice") ?? manifest.voice ?? DEFAULT_VOICE;

  // Unique texts, keyed by file name.
  const phrases = new Map<string, { text: string; source: string }>();
  for (const p of allPhrases()) {
    const text = normaliseSpeech(p.text);
    if (text) phrases.set(audioKey(text), { text, source: p.source });
  }
  mkdirSync(AUDIO_DIR, { recursive: true });
  const onDisk = new Set(readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)));
  const voiceChanged = manifest.voice !== null && manifest.voice !== voice;
  const todo = [...phrases.entries()].filter(([k]) => flag("force") || !onDisk.has(k));
  const chars = todo.reduce((t, [, p]) => t + p.text.length, 0);

  const bySource: Record<string, number> = {};
  for (const [, p] of phrases) bySource[p.source] = (bySource[p.source] ?? 0) + 1;
  console.log(`Voice: ${voice}`);
  console.log(`Phrases: ${phrases.size} (${Object.entries(bySource).map(([s, n]) => `${s} ${n}`).join(", ")})`);
  console.log(`Already made: ${[...phrases.keys()].filter((k) => onDisk.has(k)).length} · to make now: ${todo.length} (${chars.toLocaleString()} characters)`);

  if (flag("dry-run")) return;

  const apiKey = loadKey();
  if (!apiKey) {
    console.error("\nNo GOOGLE_TTS_API_KEY found. Add a line  GOOGLE_TTS_API_KEY=your-key  to .env.local, then run again.");
    process.exit(1);
  }

  if (flag("samples")) {
    mkdirSync(SAMPLE_DIR, { recursive: true });
    for (const v of SAMPLE_VOICES) {
      const mp3 = await synthesize(apiKey, v, SAMPLE_TEXT);
      writeFileSync(join(SAMPLE_DIR, `${v}.mp3`), mp3);
      console.log(`  ✓ audio-samples/${v}.mp3`);
    }
    console.log(`\nListen to them, then run:  npm run audio -- --voice <the one you like>`);
    return;
  }

  if (voiceChanged && !flag("force")) {
    console.error(`\nThe existing recordings use ${manifest.voice}. To switch everything to ${voice}, add --force.`);
    process.exit(1);
  }

  let done = 0;
  const made: string[] = [];
  await inBatches(todo, 4, async ([key, p]) => {
    writeFileSync(join(AUDIO_DIR, `${key}.mp3`), await synthesize(apiKey, voice, p.text));
    made.push(key);
    done++;
    if (done % 50 === 0 || done === todo.length) {
      process.stdout.write(`  ${done}/${todo.length}\r`);
      writeManifest({ voice, keys: [...manifest.keys.filter((k) => phrases.has(k) || onDisk.has(k)), ...made] });
    }
  });

  // The manifest lists exactly the recordings that exist and are still used.
  const nowOnDisk = new Set(readdirSync(AUDIO_DIR).filter((f) => f.endsWith(".mp3")).map((f) => f.slice(0, -4)));
  const stale = [...nowOnDisk].filter((k) => !phrases.has(k));
  if (flag("prune")) for (const k of stale) unlinkSync(join(AUDIO_DIR, `${k}.mp3`));
  writeManifest({ voice, keys: [...nowOnDisk].filter((k) => phrases.has(k)) });

  console.log(`\nDone: made ${made.length} recording(s).${stale.length && !flag("prune") ? ` ${stale.length} old file(s) no longer used — add --prune to delete them.` : ""}`);
  console.log("Next: git add public/audio src/content/audio-manifest.json, commit and push.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
