# SabiPack classroom kit

One computer serves SabiPack and its packs to a whole class over local Wi-Fi. No internet needed.

## Teacher setup (laptop)
1. Install Node.js (LTS) once from nodejs.org.
2. Copy the whole `sabipack` project folder to the laptop.
3. Turn on the laptop's hotspot (Windows: Settings > Network > Mobile hotspot) or connect it to a classroom Wi-Fi router.
4. Open a terminal in the project folder and run: `node classroom/server.mjs`
5. Write the address it prints (for example `http://192.168.137.1:8080`) on the board.

## Students
1. Join the teacher's Wi-Fi.
2. Open the address in the browser. The app loads and the packs save on the phone.
3. Or open `/classroom`, download a pack file, then in SabiPack tap Share > Import a pack file.

## Adding your own packs
Make a pack from notes in the app (needs data once), tap Send and save the `.sabipack.txt` file, then copy it into `classroom/packs/`. It appears on the `/classroom` page.

## What to know
- Tested on a computer with a simulated phone. Not yet tested with a real class.
- Phone hotspots limit how many devices can connect, and the limit differs by phone. Check yours. A laptop hotspot or a small router usually allows more.
- Over a plain local address the browser will not let students install the app or use offline caching. Packs still save on each phone, and importing a downloaded pack into the installed SabiPack works anywhere.
- "Make a pack from notes" needs the internet, so it is switched off in classroom mode and says so.
- The server keeps nothing on disk. It only counts connected devices in memory, and the count resets when you stop it.
