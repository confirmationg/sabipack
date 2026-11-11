# SabiPack — Owner and Hackathon Demo Guide

## 1. What SabiPack is

SabiPack has three connected parts:

1. **The SabiPack learning app** — students and teachers can study built-in packs, create packs from notes, generate AI lessons when online, save packs on their device, and share packs with classmates.
2. **The Windows classroom server** — a teacher runs this on a Windows laptop. It publishes teacher-provided PDF, PPT, PPTX and TXT resources to students on the same Wi-Fi network or laptop hotspot.
3. **The online AI service** — secure server-side endpoints use the Groq credentials configured in the deployed hosting environment. The API key must never be placed in the browser or committed to GitHub.

A laptop-hosted classroom is local-network access, not worldwide hosting. A person in another country can publish resources worldwide only through the separately deployed online SabiPack website/service. Students can download packs/resources and keep supported learning packs offline.

## 2. Windows teacher setup

### First-time setup

1. Open SabiPack → Teacher and download **Classroom Setup for Windows**.
2. Extract the setup ZIP and connect the laptop to the internet for this one-time installation.
3. Double-click `Install_SabiPack_Classroom.bat`. It downloads the official portable Node.js 26.13.0 runtime, installs the local classroom files, registers the `sabipack-classroom://` launch protocol and creates a desktop shortcut. No separate Node.js installation is required.
4. Open SabiPack → Teacher → **Start My Local Classroom**. The registered helper starts the local server and opens the Teacher Dashboard.
5. Keep the black server window open while teaching. Closing it stops the classroom server.

The setup package supports 64-bit Windows. Internet is needed only for the first-time runtime download; after setup, local classroom hosting works without internet.

The launcher uses port 8080 when available. If another program is already using that port, it automatically tries 8081, then the next available port up to 8090. Use the address opened by the launcher; do not assume it is always 8080.

### Each classroom session

1. Turn on Windows Mobile Hotspot or connect the laptop to the school's Wi-Fi.
2. Open SabiPack → Teacher and click **Start My Local Classroom** (or use the desktop shortcut).
3. If Windows Firewall asks, allow Node.js on **Private networks** so students on the same Wi-Fi/hotspot can connect.
4. On the Teacher Dashboard, enter a resource title, choose a PDF/PPT/PPTX/TXT file, and click **Publish to students**.
5. Give students the student access address displayed on the dashboard. Students must join the same Wi-Fi/hotspot.
6. Students open the address in their phone browser and download the teacher's materials or available built-in packs.
7. Keep the server window open until the class is finished. Press Ctrl+C in that window to stop it.

## 3. Understanding the Teacher Dashboard

- **Published resources** counts files uploaded by the teacher.
- **PDF & text resources** counts PDF and TXT files.
- **PowerPoint resources** counts PPT and PPTX files.
- **Publish a lesson** stores the selected file on the laptop in `classroom/uploads/` and makes it available to connected students.
- **Published materials** lists teacher uploads. Removing a resource removes it from the classroom library.
- **Student access address** is the laptop's network address. Share this address with students; `localhost` is only for the laptop itself.
- **Ready-made class packs** on the student page are built into SabiPack. They are not teacher uploads.

## 4. Built-in packs versus teacher resources

There are two separate content sources:

- **Built-in SabiPack packs:** already included in the application. Students can download these even if the teacher has not uploaded anything.
- **Teacher-published resources:** original files uploaded by the teacher from the dashboard. These appear in the teacher materials section of the student classroom page.

A downloaded `.sabipack.txt` file is a structured SabiPack learning pack. Students can import it through the app's Share/Import workflow. A PDF or PowerPoint is a source document; it is downloaded/opened as a document and can be used as source material for making a personal learning pack where supported.

## 5. AI features when using the local classroom copy

The local classroom server is designed for local file distribution. AI generation still requires an internet connection and a deployed SabiPack API. The local server now forwards `/api/*` requests to the deployed API when configured.

To connect it:

1. Open `classroom/settings.example.bat`.
2. Copy it to a new file named `classroom/settings.bat`.
3. Edit `settings.bat` and set `SABIPACK_API_ORIGIN` to the root address of the deployed SabiPack website, for example `https://your-project.vercel.app` (use your real deployment address; do not include `/api`).
4. Save the file and restart the classroom launcher.

The deployed website must have its Groq environment variables configured in the hosting provider. Do not put `GROQ_API_KEY` in `settings.bat`, in frontend code, or in GitHub.

If no API origin is configured, the app now returns a clear JSON message explaining that local AI is not connected, instead of the confusing `Unexpected token 'M'` parsing error. Classroom downloads and previously saved packs continue to work locally.

## 6. Network and privacy notes

- Students and the laptop must be on the same Wi-Fi network or laptop hotspot.
- Local classroom downloads do not require student mobile data or internet.
- The teacher laptop must remain on and the server window must remain open during the session.
- Uploaded teacher files are stored on the teacher laptop in `classroom/uploads/` and are not automatically sent to the public internet.
- Do not commit `.env`, API keys, passwords, student records, or uploaded classroom files to GitHub.

## 7. Colour and navigation update

The Teacher Dashboard and student classroom page now use SabiPack's light brand palette: warm cream background, SabiPack green, dark forest text, mint surfaces, and amber accents. The app's guided tour now includes a step that highlights the Teacher button in the top navigation.

## 8. What to demonstrate to judges

1. Open SabiPack on a phone and show the student home screen.
2. Show the Teacher entry point and guided navigation.
3. On a Windows laptop, start the classroom using the `.bat` launcher.
4. Open the Teacher Dashboard and upload an Osmosis PDF.
5. Connect the phone to the laptop hotspot and open the displayed student address.
6. Download the teacher's PDF or a built-in `.sabipack.txt` pack.
7. Import a downloaded SabiPack file into the app and show the saved pack working offline.
8. If the deployed AI endpoint is configured, demonstrate creating a learning pack from notes while the laptop has internet.

## 9. Current scope and honest limitations

- Windows laptop hosting is the supported teacher-hosting path in this hackathon build.
- Local classroom access is limited to devices on the same Wi-Fi/hotspot; it is not automatically reachable worldwide.
- Global resource publishing requires the online deployment.
- AI generation and photo reading require an internet connection and a configured deployed API.
- The classroom upload formats are PDF, PPT, PPTX and TXT. PPT/PPTX are downloadable resources; browser preview depends on the student's device/software.
- QR-code generation is not part of this update; the dashboard provides copyable student addresses.

## 10. Practice, progress and USSD status

### Practice (implemented in this build)

- The bottom navigation presents four primary areas: Learn, Practice, Share and USSD.
- Learners choose a subject in Practice.
- The app uses the built-in Biology sample questions and questions contained in saved or imported SabiPack quizzes for the selected subject.
- Learners receive immediate right/wrong feedback and explanations.
- Results are stored locally on the device. The screen shows completed attempts, answered questions, accuracy, and topics with less than 70% correct answers.
- Practice works offline for questions already stored in the app or in saved packs.
- Important scope limit: this build does not contain a complete preloaded question bank for every subject. Where a subject has no questions yet, learners must create or import a pack with a quiz.

### USSD (planned; not implemented)

USSD is not operational in this build. A live service requires a mobile network operator or authorised USSD aggregator, approved shortcode allocation, gateway credentials, and a secure backend integration. The app labels this section as Planned and does not claim that a real dial session is available.

## 11. One-time Windows teacher setup package

1. Download the dedicated Classroom Setup ZIP from the Teacher page on the deployed SabiPack app.
2. Extract it and run `Install_SabiPack_Classroom.bat` while connected to the internet.
3. The installer downloads the official portable Node.js 26.13.0 Windows x64 runtime, copies the classroom application into `%LOCALAPPDATA%\SabiPack\app`, registers the `sabipack-classroom://` protocol and creates a desktop shortcut.
4. Return to the deployed SabiPack app, open Teacher, enable Windows Mobile Hotspot or join the classroom router, and click **Start My Local Classroom**.

The package is designed for 64-bit Windows. Internet is required once to download the runtime; local file serving works offline after installation. Windows Hotspot must be enabled manually. The installer and protocol must still be rehearsed on the actual submission laptop; they have not been physically verified in this development environment.

## 12. Offline AI roadmap (not implemented in this submission)

Because of the hackathon submission time constraint, offline AI is a planned development item, not a completed feature. Current AI note-to-lesson generation uses the online Groq API and needs an internet connection. The proposed staged method is:

1. **Teacher laptop:** bundle a local inference runtime such as Ollama or llama.cpp with a suitably small quantized language model; the teacher downloads the model once while online.
2. **Provider adapter:** add a local generation provider that implements the same structured SabiPack lesson-and-quiz schema as the current Groq provider, allowing the app to switch providers without changing pack validation or the student workflow.
3. **Document pipeline:** extract PDF/PPTX/text, detect headings and chapters, chunk long documents, generate section-by-section, validate each result, and save a `.sabipack` pack locally.
4. **Student devices:** evaluate a mobile inference runtime such as llama.cpp or another Android-compatible runtime, taking device RAM, storage, battery and model size into account.
5. **Validation and governance:** test factual quality against teacher-reviewed answers; check model and runtime licences; keep source documents and student data local by default; disclose model limitations; and provide a fallback when device hardware is insufficient.

This staged plan is future work. No offline model is bundled or invoked by this build.
