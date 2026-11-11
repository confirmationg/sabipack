# SabiPack — Owner and Hackathon Demo Guide

## 1. What SabiPack is

SabiPack has three connected parts:

1. **The SabiPack learning app** — students and teachers can study built-in packs, create packs from notes, generate AI lessons when online, save packs on their device, and share packs with classmates.
2. **The Windows classroom server** — a teacher runs this on a Windows laptop. It publishes teacher-provided PDF, PPT, PPTX and TXT resources to students on the same Wi-Fi network or laptop hotspot.
3. **The online AI service** — secure server-side endpoints use the Groq credentials configured in the deployed hosting environment. The API key must never be placed in the browser or committed to GitHub.

A laptop-hosted classroom is local-network access, not worldwide hosting. A person in another country can publish resources worldwide only through the separately deployed online SabiPack website/service. Students can download packs/resources and keep supported learning packs offline.

## 2. Windows teacher setup

### First-time setup

1. Install Node.js LTS on the Windows laptop from https://nodejs.org/.
2. Extract the SabiPack project ZIP.
3. Open the extracted `sabipack` project folder.
4. If this is the first run, double-click `START_SABIPACK_CLASSROOM.bat`. It installs project dependencies once, then starts the local classroom server.
5. The launcher opens the Teacher Dashboard in the browser.
6. Keep the black server window open while teaching. Closing it stops the classroom server.

The launcher uses port 8080 when available. If another program is already using that port, it automatically tries 8081, then the next available port up to 8090. Use the address opened by the launcher; do not assume it is always 8080.

### Each classroom session

1. Double-click `START_SABIPACK_CLASSROOM.bat`.
2. On the Teacher Dashboard, enter a resource title, choose a PDF/PPT/PPTX/TXT file, and click **Publish to students**.
3. Turn on Windows Mobile Hotspot or connect the laptop to the school's Wi-Fi.
4. Give students the student access address displayed on the dashboard. Students must join the same Wi-Fi/hotspot.
5. Students open the address in their phone browser and download the teacher's materials or available built-in packs.
6. Keep the server window open until the class is finished. Press Ctrl+C in that window to stop it.

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
