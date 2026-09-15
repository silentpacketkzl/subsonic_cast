# 📲 How to Install ArpeggiCast on Your iPhone from Windows (Option 1)

This guide shows you how to use the automated **GitHub Actions CI/CD pipeline** to build your native Swift/SwiftUI app into an `.ipa` in the cloud, and install it on your physical iPhone from your Windows computer without needing a Mac.

---

## Step 1: Push to GitHub to Trigger the Build

1. Create a repository on [GitHub](https://github.com/new) (e.g. `ArpeggiCast`).
2. In your terminal or Git client, commit and push this workspace:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of native Swift iOS app & Spotify Connect relay"
   git branch -M main
   git remote add origin https://github.com/<your-username>/ArpeggiCast.git
   git push -u origin main
   ```
3. Go to the **Actions** tab on your GitHub repository.
4. You will see the **Build Native iOS App (IPA)** workflow running on a macOS cloud runner.
5. In ~2-3 minutes, the build will complete, and you can download the **`ArpeggiCast-IPA`** artifact (which contains `ArpeggiCast.ipa`).

---

## Step 2: Install `ArpeggiCast.ipa` onto Your iPhone

You can use **Sideloadly** (the easiest Windows sideloading tool) or **AltStore**.

### Method A: Sideloadly (Recommended - 2 Minutes)
1. Download and install **[Sideloadly](https://sideloadly.io/)** on your Windows PC (free).
2. Connect your iPhone to your PC via USB cable (and tap "Trust this Computer" if prompted).
3. Open Sideloadly on Windows:
   - Your iPhone will show up under **iDevice**.
   - Drag and drop the downloaded `ArpeggiCast.ipa` into Sideloadly.
   - Enter your Apple ID (used by Apple to generate a free personal developer certificate).
   - Click **Start**.
4. Once completed, the **ArpeggiCast** app will appear on your iPhone home screen!
5. On your iPhone, go to **Settings ➔ General ➔ VPN & Device Management**, tap your Apple ID, and tap **"Trust"**.

---

### Method B: AltStore
1. Download **[AltServer for Windows](https://altstore.io/)**.
2. Install AltStore onto your iPhone.
3. AirDrop or download `ArpeggiCast.ipa` to your iPhone files, open AltStore, tap the `+` button in the top left, and select `ArpeggiCast.ipa`.

---

## Step 3: Stream and Cast to Your PC Speakers

1. **Start the PC Receiver**:
   - Double-click [`start.bat`](start.bat) on your Windows PC (or run Docker).
   - Keep the Receiver window open at `http://localhost:8080/receiver.html`.
2. **Launch ArpeggiCast on your iPhone**:
   - Tap **Settings** ➔ enter your **Navidrome URL**, **username**, and **password**.
   - Tap **Save & Sync Library**.
3. **Cast to PC Speakers**:
   - Tap any song to play.
   - Tap the **Cast / Speaker** button.
   - Select **Windows PC (Speakers)**.
   - Enjoy music playing through your computer's speakers while controlling it wirelessly from your native iOS app!
