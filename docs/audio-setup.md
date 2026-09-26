# Professional British voice — one-off setup (~15 minutes)

KIMO plays a pre-made recording for everything it says (spelling words and sentences, phonics words, grammar questions, stories). Anything without a recording falls back to the iPad's own voice, so nothing breaks if you skip this.

Recordings are made once on your PC with Google Cloud Text-to-Speech (**Chirp 3 HD** British voices), saved in `public/audio/`, and pushed with the app. The whole app is about 110,000 characters; Google's free allowance for Chirp 3 HD voices is 1 million characters **per month**, so a full run should cost nothing. Check the current pricing page before you start: https://cloud.google.com/text-to-speech/pricing

## 1. Google Cloud project
1. Go to **console.cloud.google.com** and sign in with your Google account.
2. Top bar → project picker → **New project** → name `kimo` → **Create**, then select it.
3. Google asks for a **billing account** (card) even for free-tier use. Set one up when prompted. Optional but wise: **Billing → Budgets & alerts → Create budget** of £1 with email alerts.
4. Search bar → **Cloud Text-to-Speech API** → **Enable**.

## 2. API key (keep it private)
1. **APIs & Services → Credentials → Create credentials → API key**.
2. Click the new key → **Edit** → under **API restrictions** choose **Restrict key** → tick **Cloud Text-to-Speech API** → **Save**.
3. In your KIMO folder, open (or create) `.env.local` in Notepad and add a line:
   ```
   GOOGLE_TTS_API_KEY=paste-your-key-here
   ```
   `.env.local` is never committed to GitHub. Don't paste the key anywhere else.

## 3. Choose a voice
In the KIMO folder:
```
npm install
npm run audio -- --samples
```
This makes 8 short clips in the `audio-samples` folder (4 women's and 4 men's British voices). Double-click to listen — ideally with the kids — and note the file name of the favourite, e.g. `en-GB-Chirp3-HD-Leda`.

## 4. Make all the recordings
```
npm run audio -- --voice en-GB-Chirp3-HD-Leda
```
(use your chosen name). It takes a few minutes and shows progress. Then:
```
git add public/audio src/content/audio-manifest.json
git commit -m "Pre-made voice recordings"
git push
```
Vercel redeploys and the iPads start using the new voice straight away.

## Later
- **New content** (e.g. Kimi's stories, new word lists): run `npm run audio` again — it only makes the new recordings.
- **Change voice**: `npm run audio -- --voice <name> --force` remakes everything.
- **Tidy up** recordings nothing uses any more: add `--prune`.
- **Count first** without calling Google: `npm run audio -- --dry-run`.
