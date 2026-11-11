# SabiPack

An offline-first AI learning companion for Nigerian exam students in low-data communities.
Wale Lab NextGen AI Hackathon 2026, Track 1: AI for "Zero-Bandwidth" & Localized Learning.
Solo entry: Godwin Obadiah.

## Folder map

```
sabipack/
  public/            What students see. This is the website.
    index.html         The whole app (subjects, lessons, quiz, notes, share, tour)
    try.html           Simple page where anyone can try the AI with their own notes
    maker.html         Private Pack Maker (passcode) for making packs from a source text
    sw.js              Lets the app open with no internet
    extract.mjs        Reads text out of PDF, Word and PowerPoint files, on the phone
    vendor/            PDF and Word reader libraries (pdf.js, fflate), bundled
    classroom-kit.zip  What a teacher downloads to host a class from a phone (rebuild with scripts/build-kit.py)
    packs/             The built-in JAMB Biology packs (index.json + one file per pack)
    syllabus.json      Topic list used by the Pack Maker page
    logo / icons / site.webmanifest   Brand files
  api/               Small server programs that run on Vercel
    try.js             Public "Try the AI" (no passcode)
    generate.js        Private Pack Maker (needs MAKER_PASSCODE)
    lesson.js          Ask the AI: a typed topic becomes a lesson, quiz and simple diagrams
    read-notes.js      Reads handwritten or printed notes from photos (vision model)
    account.js         Optional email accounts and small backup of subjects and packs
  lib/               Shared code
    generate.mjs       Builds the AI request and checks the answer
    validate.mjs       Rejects any AI pack with a wrong format
  content/           Course material
    syllabus.json      Topic tree (24 JAMB Biology topics)
    sources/ packs/    Working folders for the Pack Maker
  classroom/         Classroom hotspot kit
    server.mjs         Serves the app and packs over local Wi-Fi, no internet
    packs/             Teacher packs (.sabipack.txt) to show on the class page
    README.md          Teacher and student steps
  scripts/           Command-line helpers and tests
  pre-hackathon/     Work that existed BEFORE 7 Nov 2026 (prototype, first topic list, first database sketch)
  vercel.json  package.json  .gitignore
```

## How the pieces fit
- A student opens the site. The app loads the Biology packs once, saves them on the phone, and works offline after that.
- "Bring your own notes" sends only text to `api/try.js`, which asks Groq to write a lesson and quiz. The result is saved on the phone.
- "Share" sends a pack as a file by Bluetooth or Nearby Share. The other phone imports it.
- In a classroom, `classroom/server.mjs` serves the app, teacher-published resources and packs over local Wi-Fi with no internet. Students can download PDF/TXT/PPT/PPTX materials from `/classroom`; teachers manage uploads at `/classroom/teacher`.

## Environment variables (set in Vercel > Settings > Environment Variables, then redeploy)
| Name | Needed for |
|---|---|
| GROQ_API_KEY | Try the AI, Pack Maker |
| GROQ_MODEL | Try the AI, Pack Maker (current model ID from console.groq.com/docs/models) |
| GROQ_VISION_MODEL | Reading photos of notes: a vision model ID from console.groq.com/docs/vision |
| GROQ_VISION_REASONING_EFFORT | Optional. Only if the vision model is slow or returns nothing. Use a value listed in Groq's docs for that model |
| TURSO_DATABASE_URL, TURSO_AUTH_TOKEN | Accounts (database). Without them the app still works; accounts are switched off |
| AUTH_SECRET | Accounts: a long random secret (32+ characters) used to sign sign-in tokens |
| MAKER_PASSCODE | Pack Maker only (your private password) |
| TRY_ENABLED | Optional. Set to `false` to switch off the public AI try-out |
| GROQ_REASONING_EFFORT | Optional. `low` can make answers faster if the model accepts it |

Never put keys in files or in GitHub.

## What is real today
- Ask the AI: type a topic, get a layered lesson with quiz and simple drawn diagrams (flow, cycle, parts); save it, work offline, share it
- Optional accounts (email and password) with a small backup of subjects and packs, or carry on as a guest; a time-of-day greeting with the student's name
- Subject picker (all Nigerian exam subjects hidden until chosen), changeable any time
- Notes to pack from pasted text, PDF, Word (.docx), PowerPoint (.pptx) and text files (read on the phone), and photos of handwritten notes (read by the AI vision model, then checked by the student)
- Biology packs: one full layered lesson with diagrams (Cell structure) and two short lessons, with quizzes
- Packs made from notes are saved offline and tagged by subject
- Audio using the phone's own voice
- Sharing and importing packs as files
- Classroom server for local Wi-Fi, with a teacher upload dashboard at `/classroom/teacher`; PDF/TXT open in browser and PPT/PPTX download; laptop route tested on a computer; phone route (Termux) NOT yet tested on a real phone
- First-run tour, installable app, opens offline after the first visit

## Previews (not real yet) and not built
- Previews: Practice tab (SMS-style quiz inside the app), USSD menu simulation
- Not built: Smart Revision, real SMS and USSD, email checking and forgot-password for accounts, other subjects' lessons, local-language voices (the local-language text in the audio demo is demo text only)

## Pre-existing work and AI tools (required disclosure)
- Made before 7 Nov 2026: everything in `pre-hackathon/`. The app in `public/index.html` was adapted from that prototype during the hackathon.
- Third-party libraries: pdf.js (Apache-2.0) and fflate (MIT), bundled in `public/vendor`. Database client: @libsql/client.
- AI tools: Claude (Anthropic) as coding assistant and as the writer of the draft Biology packs; Groq API for lessons made from user notes. The developer runs, reviews and is responsible for all of it.

## Accuracy and privacy
- Built-in packs are labelled draft until reviewed. The developer reviewed the Cell, Transport and Heredity questions as accurate; the new layered Cell lesson text is still marked draft.
- AI-made packs are always labelled draft. Nothing here has been tested with students yet. The teacher dashboard and student classroom pages have been visually upgraded; the full student-device workflow still needs field testing.
- Accounts are optional. Guests keep everything on their own phone. With an account, the email, name, subjects and saved packs are stored in the database so they can be restored on another phone; the password is stored only as a salted scrypt hash, and users can delete their account. The email is not verified. There is no age gate; the sign-up screen only says a parent or teacher is welcome to help.
- When using the AI, only the notes text is sent. PDF, Word and PowerPoint (.pptx) files are read on the phone for text extraction. A photo of notes is sent (shrunk) to the AI vision model so it can read the writing, and the student checks the text before using it.

## Tests
`npm test` runs the format, server-endpoint and pack checks. It does not test the real Groq call or real phones.
