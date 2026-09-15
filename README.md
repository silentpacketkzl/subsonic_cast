# 🎵 Arpeggi Subsonic Music Player with Spotify Connect Speaker Casting

A modern, responsive Subsonic & Navidrome music player styled with the **Arpeggi / Apple Music iOS** aesthetic, featuring **Spotify Connect-like device casting** to play and stream music through your computer's connected speakers.

---

## 🌟 Key Features

1. **Arpeggi & Apple Music Design Language**:
   - iOS Cupertino typography and sleek dark mode.
   - Dynamic ambient background glow that shifts color based on album artwork.
   - Frosted glass tab bar navigation (`Listen Now`, `Library`, `Search`, `Connect`).
   - Floating bottom Mini-Player and full-screen expandable Now Playing sheet.
   - Lock screen & dynamic island controls via the iOS MediaSession API.
   - Progressive Web App (PWA) ready: tap **"Add to Home Screen"** on iPhone Safari for a full-screen, native app experience without needing a Mac, Xcode, or sideloading!

2. **Full Subsonic & Navidrome Integration**:
   - Compatible with **Navidrome**, **Gonic**, **Airsonic**, and any Subsonic/OpenSubsonic server.
   - Secure token-based authentication (`salt` + MD5 `token` with `v=1.16.1`).
   - Real-time library search across artists, albums, and tracks.
   - Built-in CORS proxy to prevent browser cross-origin audio streaming blocks.
   - Includes high-quality demo ambient/synthwave tracks for immediate out-of-the-box testing.

3. **Spotify Connect-Style Speaker Casting**:
   - **Cast to PC Speakers**: Stream high-fidelity audio directly from your Navidrome server through your computer's sound card and connected speakers.
   - **Seamless Handoff**: Start playing on your iPhone, tap the device icon, select **Windows PC (Speakers)**, and playback instantly transfers to your speakers at the exact second.
   - **Real-Time Remote Control**: Scrubbing the progress bar, adjusting volume, skipping tracks, or reordering the queue on your iPhone immediately controls the PC speakers with sub-100ms WebSocket latency.
   - **Live Audio Visualizer**: The PC Speaker Receiver features an interactive Web Audio frequency bar visualizer dancing to the beat on your computer screen.

---

## 🚀 Quick Start Guide

### 1. Start the Server & PC Receiver

**Option A: Running directly on Windows (Zero Setup)**
Double-click [`start.bat`](start.bat) or run the following command in PowerShell:

```powershell
& "$env:LOCALAPPDATA\Programs\node-portable\node.exe" server.js
```

**Option B: Running as a Docker Container (Docker / Compose / NAS / Linux)**
Build and run using Docker:

```bash
# Using Docker Compose (Recommended)
docker compose up -d --build

# Or standard Docker CLI
docker build -t arpeggi-connect .
docker run -d -p 8080:8080 --name arpeggi-connect --restart unless-stopped arpeggi-connect
```
Once started:
- Relay server is available on port `8080`.
- Open the **PC Speaker Receiver** at `http://localhost:8080/receiver.html` to output audio through your computer speakers.


### 2. Connect from Your iPhone
1. Make sure your iPhone is connected to the same Wi-Fi network as your PC.
2. Open Safari on your iPhone and visit the Mobile URL displayed on the PC Receiver screen (e.g., `http://100.66.160.147:8080/` or your local Wi-Fi IP).
3. Tap the **Share** button in Safari and select **"Add to Home Screen"**.
4. Open the **Arpeggi** app from your iPhone home screen!

### 3. Connect to Your Navidrome Server
1. In the Arpeggi app, tap the **Gear / Settings** icon in the top right.
2. Enter your Navidrome details:
   - **Server URL**: `http://<your-server-ip>:4533` (or your domain/HTTPS URL)
   - **Username**: Your Navidrome username
   - **Password**: Your Navidrome password
3. Tap **"Test Connection"**, then tap **"Save & Sync Library"**.

### 4. Cast Music to Your Computer Speakers
1. Tap any song or album to start playing.
2. Tap the **Cast / Devices** icon (bottom left of the player or in the Now Playing sheet).
3. Select **"Windows PC (Speakers)"**.
4. Audio immediately begins streaming through your computer's speakers, with the top bar turning Spotify green (`Playing on Windows PC (Speakers)`).
5. Control playback, volume, and tracks from your phone anywhere within Wi-Fi range!

---

## 📁 Project Architecture

```
Antigravity/
├── server.js               # Zero-dependency Node.js server (Static host + WebSocket Connect Relay + Subsonic Proxy)
├── start.bat               # One-click Windows startup script
├── test.js                 # Verification and test suite
├── public/
│   ├── index.html          # Main iOS Arpeggi Music Player UI
│   ├── receiver.html       # PC Speaker Receiver dashboard with real-time audio visualizer
│   ├── manifest.json       # PWA manifest for iOS Home Screen standalone installation
│   ├── css/
│   │   ├── style.css       # Apple Music Cupertino design system & dynamic ambient glow
│   │   └── receiver.css    # PC Speaker Receiver dashboard styling
│   ├── js/
│   │   ├── subsonic.js     # Navidrome/Subsonic API client (token auth, albums, songs, stream, coverArt)
│   │   ├── player.js       # Local audio player engine & iOS MediaSession API sync
│   │   ├── connect.js      # Spotify Connect casting client (WebSocket device sync & handoff)
│   │   └── app.js          # Arpeggi app controller, navigation, and queue management
│   └── icons/
│       └── icon.svg        # High-res vector app icon
```

---

## 🧪 Running Automated Tests

Run the test suite at any time to verify system integrity:
```powershell
& "$env:LOCALAPPDATA\Programs\node-portable\node.exe" test.js
```
