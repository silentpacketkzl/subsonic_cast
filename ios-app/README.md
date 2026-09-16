# 📱 ArpeggiCast - Native iOS Subsonic Player with Speaker Casting

A **100% pure native iOS application** written in **Swift & SwiftUI** designed to stream music from **Navidrome / Subsonic** servers, featuring a built-in **Spotify Connect-style casting engine** to play music out of your computer's connected speakers.

---

## 🌟 Architecture & Features

- **Framework**: Native **SwiftUI** (iOS 16+) with Cupertino styling and dynamic color ambient blurs.
- **Audio Engine**: Apple **AVFoundation** (`AVPlayer`, `AVAudioSession`) with background audio playback capability.
- **Lock Screen Integration**: Native `MPNowPlayingInfoCenter` and `MPRemoteCommandCenter` for lock-screen scrubbing and playback controls.
- **Subsonic API**: Built-in Swift client with **MD5 Token Authentication** (`u`, `t`, `s`, `v=1.16.1`, `f=json`).
- **Spotify Connect Casting**: Uses native `URLSessionWebSocketTask` to stream / cast / control playback on the PC speakers with sub-100ms latency.

---

## 📁 Native Project Structure

```
ios-app/
├── Package.swift                    # Swift Package Manager manifest
├── ArpeggiCast/
│   ├── Info.plist                   # Background audio & local network permissions
│   ├── ArpeggiCastApp.swift         # @main entry point
│   ├── Models/
│   │   ├── Song.swift               # Track model
│   │   ├── Album.swift              # Album model
│   │   └── CastDevice.swift         # Device target (Local vs Remote PC)
│   ├── Services/
│   │   ├── SubsonicService.swift    # Navidrome Subsonic REST API (MD5 Token auth)
│   │   ├── AudioPlayerService.swift # AVPlayer + MPRemoteCommandCenter
│   │   └── CastService.swift        # URLSessionWebSocketTask client for PC Speaker Casting
│   ├── ViewModels/
│   │   ├── PlayerViewModel.swift    # Playback state, queue, scrubber, casting handoff
│   │   └── LibraryViewModel.swift   # Navidrome library fetching, caching, search
│   └── Views/
│       ├── MainTabView.swift        # Native Cupertino tab navigation
│       ├── ListenNowView.swift      # Featured albums carousel & recent tracks
│       ├── MiniPlayerView.swift     # Bottom floating mini-player bar
│       ├── NowPlayingSheet.swift    # Full-screen Apple Music player with dynamic blur
│       ├── DevicePickerSheet.swift  # Spotify Connect device selector ("Connect to a device")
│       ├── SearchView.swift         # Real-time search
│       └── SettingsView.swift       # Navidrome server credentials setup
└── README.md
```

---

## 🛠️ How to Build & Run on iPhone

### Option 1: Open in Xcode (on any Mac)
1. Open the `ios-app/` folder in **Xcode 15+**.
2. Select your connected iPhone or an iOS Simulator.
3. Click **Run (Cmd + R)**.

### Option 2: Automatic Cloud Build (from Windows via GitHub Actions)
1. Push this repository to GitHub.
2. The workflow in [`.github/workflows/build-ios.yml`](../.github/workflows/build-ios.yml) will automatically run on a free macOS-14 cloud runner.
3. Download the compiled `.ipa` artifact from the GitHub Actions tab.
4. Install it on your iPhone using **AltStore**, **SideStore**, or **Sideloadly** from your Windows computer!
