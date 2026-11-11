# SabiPack classroom kit

One device serves SabiPack and its packs to a whole class over local Wi-Fi. No internet is needed in the room.

## From a laptop
1. Install Node.js (LTS) once from nodejs.org.
2. Copy the whole `sabipack` project folder to the laptop (or unzip `classroom-kit.zip`).
3. Turn on the laptop's hotspot (Windows: Settings > Network > Mobile hotspot) or join a classroom Wi-Fi router.
4. In a terminal in that folder run: `node classroom/server.mjs`
5. The server prints the student address. Open `/classroom/teacher` on the host device to manage uploads; give students the same address with `/classroom` appended.

## From an Android phone (Termux)
A phone's browser cannot run a server by itself, so the phone needs a small helper app called Termux.
1. Install **Termux from F-Droid** (the Play Store version is out of date).
2. With internet, paste this into Termux (it downloads the kit from your SabiPack site, then starts it):
   `pkg install -y nodejs curl unzip && curl -L -o kit.zip https://YOUR-SITE/classroom-kit.zip && unzip -o kit.zip && node classroom/server.mjs`
   The app's "Host a class" screen shows this command with your real site address and a Copy button.
3. Turn on the phone's Wi-Fi hotspot. Students join it and open the address Termux prints. If Termux cannot list the address, use the hotspot address in your phone settings (often `192.168.x.1`) followed by `:8080`.
4. Keep Termux open while the class is using it.
Next time (no internet needed): open Termux, run `node classroom/server.mjs`.

## Students
1. Join the teacher's Wi-Fi.
2. Open the address followed by `/classroom` in the browser. Download teacher materials or class packs. Open the SabiPack app to import or process supported files.
3. Or open `/classroom`, download a pack file, then in SabiPack tap Share > Import a pack file.

## Adding your own packs
Make a pack from notes in the app (needs data once), tap Send and save the `.sabipack.txt` file, then copy it into `classroom/packs/`. It appears on the `/classroom` page.

## Teacher uploads
- Open `http://localhost:8080/classroom/teacher` on the host laptop (or use its LAN IP) to upload PDF, PPT, PPTX and TXT resources.
- Uploaded files and `resources.json` are stored in `classroom/uploads/` on the host. This folder is ignored by Git so classroom files are not accidentally committed.
- PDF and TXT open in the browser; PPT and PPTX download for opening in a presentation app.
- Students can extract text from PDF, DOCX, TXT and PPTX in the SabiPack Pack Studio. Old `.ppt` files should be saved as `.pptx` first. AI lesson/quiz generation still needs an internet connection once; the resulting saved pack works offline.

## What to know
- Tested on a computer with a simulated phone. The phone (Termux) route is NOT yet tested on a real phone or with a real class.
- Phone hotspots limit how many devices can connect, and the limit differs by phone. Check yours. A laptop or small router usually allows more.
- Over a plain local address the browser will not let students install the app or use offline caching. Packs still save on each phone, and importing a downloaded pack into the installed SabiPack works anywhere.
- Making packs from notes, reading photos, and accounts need the internet, so they are switched off in classroom mode and say so.
- The server counts connected devices in memory. Teacher-uploaded resources are deliberately saved in `classroom/uploads/` and remain there after the server stops; the device count resets when you stop it.


## Teacher uploads (offline classroom)
Start the server with `node classroom/server.mjs`, then open the printed address followed by `/classroom/teacher` on the teacher laptop. Upload PDF, PPT, PPTX or TXT notes and give students the same Wi-Fi address followed by `/classroom`. Published files are stored in `classroom/uploads/` on the host device. PDF and TXT open in the browser; PowerPoint files download so students can open them with a presentation app.
