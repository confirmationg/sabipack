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

## Implemented, planned and not built
- Implemented: subject-based Practice using built-in Biology sample questions and quizzes from saved/imported packs; answer feedback, scores and local topic-level progress.
- Planned: USSD, pending an authorised telecom/aggregator integration and shortcode approval; offline AI generation on teacher laptops and student phones.
- Not built: real SMS delivery, Smart Revision automation, email verification and forgot-password for accounts, a full question bank and lesson library for every subject, and production-quality local-language voices (the local-language text in the audio demo is demo text only).

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


## Windows classroom quick start
1. Download the dedicated **SabiPack Classroom Setup for Windows** ZIP from the Teacher page and extract it.
2. Double-click `Install_SabiPack_Classroom.bat` once while connected to the internet. The installer downloads the official portable Node.js LTS runtime and installs the classroom files; teachers do not need to install Node.js separately.
3. Open SabiPack → Teacher → **Start My Local Classroom**. The helper starts the local server and opens the Teacher Dashboard.
4. Turn on Windows Mobile Hotspot or join classroom Wi-Fi, then copy the student access address displayed on the dashboard.
5. At school, the installed local classroom server works without internet. Groq AI generation still requires internet in this build.
See `classroom/README.md` for details.

## Windows teacher classroom

For a guided setup and explanation of the local classroom, built-in packs, teacher uploads, AI API connection, and hackathon demo flow, see [SABIPACK_HACKATHON_GUIDE.md](SABIPACK_HACKATHON_GUIDE.md).

The helper calls `START_SABIPACK_CLASSROOM.bat`, which selects an available port starting at 8080. Optional AI proxy configuration is documented in `classroom/settings.example.bat`.

## Student Practice

The bottom navigation includes **Learn, Practice, Share and USSD**. Practice lets a learner choose a subject and answer questions from the built-in Biology sample bank and from quizzes inside saved/imported SabiPack lessons. Answers receive immediate feedback. Question totals, accuracy and topic-level results are stored locally in the browser so the learner can identify topics to revisit. Practice is available offline once the relevant pack is on the device. A subject without an available question bank or saved pack will ask the learner to create/import a pack first; this build does not claim a complete question bank for every listed subject.

## USSD status

USSD is a planned channel, not a live feature in this build. A working deployment requires a partnership with a mobile network operator or authorised USSD aggregator, shortcode allocation/approval, gateway credentials, and secure backend integration. The app intentionally does not present a simulated dial session as a live USSD service.

## One-time Windows teacher helper setup

1. Install Node.js LTS on the teacher's Windows laptop.
2. Extract the SabiPack project ZIP.
3. From the extracted project folder, double-click `Install_SabiPack_Classroom.bat` once. It copies the classroom runtime into `%LOCALAPPDATA%\\SabiPack\\app` and registers the `sabipack-classroom://` protocol for the current Windows user.
4. Open SabiPack and choose **Teacher**. After setup, click **Start My Local Classroom** to start the helper and open the local Teacher Dashboard.
5. Turn on Windows Mobile Hotspot or connect the laptop to the classroom Wi-Fi before starting. Windows does not permit the browser to enable Hotspot silently.

The helper's protocol registration and installer are included in this project. The installer and protocol launch must still be tested on the actual Windows submission laptop before claiming they have been verified on that device. The local server uses Node.js built-in modules and does not need npm packages to serve the classroom.

## Hackathon report

See `SabiPack_Hackathon_Project_Report_Godwin_Obadiah.docx` for the feature-status matrix, architecture, offline AI roadmap, limitations and verification record for this submission package.

## Self-service Windows classroom download (website deployment)

The Teacher page contains a public download link to
`/downloads/SabiPack-Classroom-Setup-Windows.zip`. The file is stored in
`public/downloads/`, so Vercel serves it as a static download from:

`https://sabipack.vercel.app/downloads/SabiPack-Classroom-Setup-Windows.zip`

To publish this workflow, commit and push the complete project contents to the
connected GitHub repository and allow Vercel to deploy. After deployment, open
the Teacher page and test the download URL above in a private/incognito browser
window. Do not upload the setup ZIP as a separate Vercel project or send it
manually to individual teachers.

The downloaded ZIP contains a one-time Windows setup script and the local
classroom app. It downloads the official portable Node.js runtime during setup;
therefore the first installation needs internet. Once installed, local classroom
resource serving over the same Wi-Fi/hotspot works without internet. Groq AI
generation still requires internet in this submission build.


## Direct teacher-note to student-pack workflow

In a local classroom, students can tap **Create My Pack** beside a teacher-published PDF, PPTX or text resource. The local server supplies the file to the SabiPack app, which opens Pack Studio with the document loaded for review and pack creation. Manual download and import remain available as a fallback. New AI-generated lesson/quiz creation still requires the online Groq API in this build; saved packs can be studied offline. Older `.ppt` files must be converted to `.pptx` before Pack Studio can extract their text.
