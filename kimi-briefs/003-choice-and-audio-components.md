# 003 — Tap, listen and sound-button components

Status: done — PR #3
Owner: Kimi · Reviewer: Claude, then DQ

## Goal
Build three reusable UI components the phonics, spelling and grammar screens will need, plus a hidden demo page to try them on the iPad. No changes to existing screens.

## Files to create (nothing else)
- `src/components/ChoiceGrid.tsx`
- `src/components/SpeakButton.tsx`
- `src/components/SoundButtons.tsx`
- `src/lib/speech.ts`
- `src/app/dev/components/page.tsx` (demo page, not linked from anywhere)

Look at `src/components/NumberPad.tsx` and `src/app/globals.css` first and match their style: colour tokens (`bg-card`, `border-line`, `text-ink`, `bg-good`, `bg-bad`…), rounded-2xl, the "pressed button" shadow, `font-extrabold`, big tap targets. iPad first.

## 1. `ChoiceGrid`
Big buttons for "tap the right answer" questions.
```tsx
<ChoiceGrid
  options={["ship", "chip", "shop"]}   // 2–6 strings
  onChoose={(option, index) => void}
  disabled?: boolean
  result?: { chosen: number; correct: number }  // after answering: colour chosen green/red, show correct in green
  size?: "md" | "lg"                  // lg = phonics (huge text)
/>
```
- 2 options → 2 columns; 3 → 3 columns; 4 → 2×2; 5–6 → 3×2.
- Buttons at least 88px tall; text at least 32px (`lg`: 48px).
- Keyboard: keys `1`–`6` choose that option (for laptop testing).
- Shake the chosen button (existing `animate-shake` class) when wrong.

## 2. `speech.ts` + `SpeakButton`
Text-to-speech using the browser's Web Speech API (`speechSynthesis`), which works offline on iPad Safari.

`src/lib/speech.ts`:
```ts
export function canSpeak(): boolean
export function speak(text: string, opts?: { rate?: number }): Promise<void>  // resolves when finished
export function stopSpeaking(): void
```
- Prefer an `en-GB` voice (on iPad usually "Daniel" / "Kate" / "Serena"); fall back to any `en-*` voice, then the default.
- Voices load asynchronously on Safari — handle `voiceschanged` and cache the chosen voice.
- Default `rate` 0.85 (slower for young children).
- Cancel anything currently speaking before starting new speech.
- Safe to import on the server (no `window` access at module top level).

`SpeakButton`:
```tsx
<SpeakButton text="ship" label?="Hear it" autoPlay?: boolean size?: "md" | "lg" />
```
- Round button with a 🔊 icon, pulses gently while speaking.
- If `canSpeak()` is false, render nothing.
- Note: iOS only allows speech after a user tap, so `autoPlay` should only be used after the child has already tapped something on that page — document this in a comment.

## 3. `SoundButtons`
Shows a word split into its sounds, the way Year 1 teachers do: a **dot** under each single-letter sound and a **dash** under each multi-letter sound (digraph/trigraph).
```tsx
<SoundButtons graphemes={["sh", "i", "p"]} />
<SoundButtons graphemes={["c", "a-e", "k"]} />   // split digraph: "cake"
```
- Render the whole word large (≥ 64px), letters spaced slightly.
- Under each grapheme: a dot (1 letter) or a line spanning its letters (2+ letters).
- Split digraph `a-e`: the `a` and the final `e` are joined by a curved line (arc) under the word, and the `k` between them keeps its own dot. Simple SVG is fine.
- Optional prop `highlight?: number` highlights one grapheme (brand colour) — used when blending sound by sound.

## 4. Demo page `/dev/components`
One page showing: a ChoiceGrid with 2, 3, 4 and 6 options (and the result state), SpeakButtons for "ship", "The cat sat on the mat.", and SoundButtons for `cat`, `ship`, `night` (`n`,`igh`,`t`), `cake`, `stamp`. Plain layout, no need to polish.

## Done when
- `npm run lint`, `npm test`, `npm run build` pass.
- Checked in Chrome's iPad emulation, landscape and portrait: nothing overflows, buttons are easy to tap.
- PR from `kimi/003-choice-and-audio-components` with 2 screenshots of the demo page.

## Notes from Kimi
- All five files created; `npm run lint`, `npm test`, `npm run build` pass. No existing screens touched.
- **iPad emulation check done** in headless Chrome at 768×1024 (portrait) and 834×1112 (landscape): no overflow, buttons ≥ 88px, easy tap targets. Screenshots: `shots/demo-portrait.png` and `shots/demo-landscape.png` in the KIMO-kimi clone (repo convention is screenshots not committed — `Claude outputs/` is gitignored; PAT can't upload PR attachments, so the images are in the clone + shown to DQ directly rather than embedded in the PR body).
- `SpeakButton` renders nothing during SSR (`canSpeak()` is false server-side) — buttons appear after hydration. On devices with no speech support they never appear, per the brief.
- `autoPlay` gotcha found in review: React hooks lint forbids synchronous setState in effects, so the speaking-state is set via a zero-delay timeout; behaviour unchanged.
- `SoundButtons` renders letters at 72px in fixed 76px cells; words up to ~7 graphemes fit portrait iPad at the demo's max-w-3xl. Longer words (PH-16 style) may need a smaller variant later — flag for the phonics screen brief.
- `speech.ts` prefers en-GB (Daniel/Kate/Serena on iPad), falls back to any en-*; voices load async on Safari — `primeVoices()` handles `voiceschanged`. Rate 0.85 default.
- Next.js 16: read `node_modules/next/dist/docs/` per AGENTS.md — client-component conventions unchanged from what the code uses.
