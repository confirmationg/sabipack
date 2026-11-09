# SabiPack
Offline-first AI learning companion for JAMB Biology students in low-data communities.
Wale Lab NextGen AI Hackathon 2026, Track 1 (AI for "Zero-Bandwidth" & Localized Learning). Solo entry: Godwin Obadiah.

## Pre-existing work (made before 7 Nov 2026)
Everything in `pre-hackathon/`: the interactive design prototype (`prototype.html`), the first topic list (`syllabus.json`, from a third-party copy of the JAMB Biology syllabus) and the first database sketch (`schema.sql`).

## Built during the hackathon
Everything else, committed to Git with timestamps.

## AI tools used
- Claude (Anthropic): coding assistant; the developer reviews and runs all code.
- Groq API: generates draft lessons and quiz questions from open-licensed source text.

## Accuracy
Generated lessons are labelled `draft` until a human has checked them against the source and the syllabus. Nothing here has been tested with students yet.

## Pack Maker (built during the hackathon)
`public/maker.html` + `api/generate.js`: a web page that turns a source text into a draft pack with Groq. Keys are kept in Vercel environment settings (GROQ_API_KEY, GROQ_MODEL, MAKER_PASSCODE).

## Try the AI (public)
`public/try.html` + `api/try.js`: anyone can paste notes and get a draft lesson and quiz. No passcode and no per-user limits. Safeguards: input 400-3000 characters, output capped, and TRY_ENABLED=false switches it off.
Environment variables: GROQ_API_KEY, GROQ_MODEL (Pack Maker also needs MAKER_PASSCODE).

## Brand
Logo and icons are in `public/` (favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png, logo.svg, logo-dark.svg, logo.png, site.webmanifest). Mascot: "Sabi", an original character made for this project.

## Groq model
Set GROQ_MODEL to a current production model ID from console.groq.com/docs/models (we planned on `openai/gpt-oss-120b`, fallback `openai/gpt-oss-20b`). Reasoning models spend part of max_tokens on thinking, so try.js allows 4000. Optional: GROQ_REASONING_EFFORT=low to speed things up (only if the model supports it).

## The app (`public/index.html`)
Adapted during the hackathon from the pre-hackathon prototype (`pre-hackathon/prototype.html`). Real today: live AI notes-to-pack (via `/api/try`), saved packs that work offline (on-device storage), audio with the phone's own voice, interactive quiz, first-run tour, installable, opens offline (`sw.js`). Still previews (simulated, labelled "Preview"): SMS/USSD, pack sharing, classroom hotspot. Not built yet: JAMB Biology packs from the syllabus, Smart Revision, PDF/Word upload.

## Built-in JAMB Biology packs (`public/packs/`)
Three draft packs (Cell structure, Transport, Heredity) written by Claude from the syllabus objectives, labelled "draft, written by AI, needs review". They are loaded once, stored on the phone and work offline. Pending review by the developer before any claim of accuracy.
