# Professional British voice — setup

KIMO plays a pre-made recording for everything it says (spelling words and sentences, phonics words, grammar questions, stories). Anything without a recording falls back to the iPad's own voice, so nothing breaks if you skip this.

Recordings are made once on your PC by `scripts/make-audio.ts`, saved in `public/audio/`, and pushed with the app. It works with **ElevenLabs** (what DQ uses) or **Google Cloud Text-to-Speech**. In PowerShell use `npm.cmd` (plain `npm` is blocked by PowerShell's script policy).

## ElevenLabs
1. elevenlabs.io → your profile → **API keys** → create a key (it starts `sk_`). Give it Text to Speech + Voices (read) access.
2. Put the key **on its own** in a file called `ELEVENLABS_API.txt` in the KIMO folder (git-ignored — never committed).
3. Optional: in ElevenLabs **Voice Library**, add a few British voices you like to "My voices" — the samples step tries every British-labelled voice in your list.
4. `npm.cmd install` (once), then `npm.cmd run audio -- --samples` → listen to the clips in `audio-samples`. Each file name ends with `__<voice id>`.
5. `npm.cmd run audio -- --voice <voice id>` makes the recordings.

**Credits:** the whole app is about 93,000 characters (see `npm.cmd run audio -- --dry-run`). On ElevenLabs every character costs credits — roughly one per character with the default Multilingual v2 model, about half with `--model eleven_flash_v2_5`. If your plan's monthly credits are smaller than that, add `--max-chars 9000` (or whatever you have left): the script records phonics and spelling first, stops before the limit, and carries on from where it stopped next time. Check your remaining credits on the ElevenLabs dashboard.

## Google Cloud — the free way to record everything (what to do now)
ElevenLabs' free plan (10,000 characters a month) ran out after 569 recordings; the whole app is about 160,000. Google's best British voices (**Chirp 3 HD**) are **free up to 1 million characters a month**, so one run records the whole app in a single voice.

1. console.cloud.google.com → pick or create a project → **APIs & Services → Library** → enable **Cloud Text-to-Speech API** (Google may ask for a card for the free tier — you aren't charged under 1M characters a month).
2. **APIs & Services → Credentials → Create credentials → API key** (a classic key starting `AIza`, *not* "bound to a service account"); restrict it to Cloud Text-to-Speech API.
3. Put the key on its own in `GOOGLE_API.txt` in the KIMO folder (git-ignored).
4. Double-click **`voice-google.bat`**. It checks the key with one test recording first (nothing changes if that fails), then records everything with `en-GB-Chirp3-HD-Leda`, commits and pushes. Vercel redeploys and the iPads use the new voice.
   - Want to hear other voices first? `npm.cmd run audio -- --provider google --samples`, listen in `audio-samples`, then change `VOICE=` at the top of the .bat.

## Google Cloud (manual)
Create a **classic API key** (starts `AIza`, *not* "bound to a service account") restricted to Cloud Text-to-Speech API, put it on its own in `GOOGLE_API.txt`, then the same `--samples` / `--voice` steps (voices are named like `en-GB-Chirp3-HD-Leda`).

## After recording
```
git add -A
git status          (check no *_API.txt file is listed)
git commit -m "Voice recordings"
git push
```
Vercel redeploys and the iPads use the new voice straight away.

## Later
- **New content** (new stories, word lists): run `npm.cmd run audio` again — it only makes what's new, with the same voice.
- **Change voice**: `--voice <id> --force` remakes everything (uses credits again).
- **Tidy up** recordings nothing uses any more: add `--prune`.
