# SabiPack classroom — Windows laptop host

A Windows laptop serves SabiPack and teacher resources to students on the same Wi-Fi or laptop hotspot. Students do not need mobile data to download published materials.

## Teacher: first-time setup
1. Install **Node.js LTS** once from https://nodejs.org/ (choose the LTS download).
2. Extract the complete `sabipack` project folder to the laptop. Keep the folder together.
3. Double-click `START_SABIPACK_CLASSROOM.bat`. On first run, it installs the project dependency once; internet is needed for this setup.
4. The Teacher Dashboard opens automatically in your browser. If Windows Firewall asks, allow Node.js on **Private networks** so students on your Wi-Fi can connect.
5. Turn on Windows Mobile Hotspot (Settings → Network & internet → Mobile hotspot), or connect the laptop to the classroom Wi-Fi router.
6. In the Teacher Dashboard, copy one of the Student access addresses and share it with students. Keep the black SabiPack server window open during the class.

## Teacher: every later class
Double-click `START_SABIPACK_CLASSROOM.bat`. Upload PDF, PPT, PPTX or TXT materials in the dashboard. Published resources remain in `classroom/uploads/` after the server stops.

## Students
1. Connect to the teacher laptop's Wi-Fi hotspot or the same classroom Wi-Fi router.
2. Open the student access address shared by the teacher.
3. Download the lesson material or SabiPack pack. Import a downloaded `.sabipack.txt` file in the app under Share.

## Important
- `localhost` is only for the teacher using the same laptop. Students must use the LAN address shown in the Teacher Dashboard.
- The laptop and student phones must be on the same local Wi-Fi network. A laptop-hosted local server is not automatically available worldwide. Worldwide access requires the separately hosted online SabiPack site.
- Local resource downloads work without internet once the server is running. Initial Node.js dependency installation and AI lesson generation require internet.
- Uploaded files are stored on the host laptop in `classroom/uploads/`. Back up that folder if the teacher needs to keep the materials.
- Press Ctrl+C in the SabiPack Classroom Server window to stop hosting.
- This is a local classroom distribution feature, not a remote classroom service.
