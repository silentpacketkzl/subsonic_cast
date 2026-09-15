import SwiftUI

public struct NowPlayingSheet: View {
    @EnvironmentObject var playerVM: PlayerViewModel
    @Environment(\.dismiss) var dismiss

    @State private var isDraggingScrubber: Bool = false
    @State private var dragScrubberValue: Double = 0
    @State private var localVolume: Float = 0.8

    public var body: some View {
        ZStack {
            // Ambient Colorful Background Glow
            LinearGradient(
                colors: [
                    playerVM.isCasting ? Color.green.opacity(0.3) : Color.pink.opacity(0.35),
                    Color.purple.opacity(0.2),
                    Color.black
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()
            .blur(radius: 60)

            VStack(spacing: 24) {
                // Drag handle
                Capsule()
                    .fill(Color.white.opacity(0.25))
                    .frame(width: 36, height: 5)
                    .padding(.top, 12)

                // Top Bar
                HStack {
                    Button(action: { dismiss() }) {
                        Image(systemName: "chevron.down")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundColor(.white.opacity(0.7))
                    }
                    Spacer()
                    Text("Now Playing")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.white.opacity(0.6))
                        .textCase(.uppercase)
                    Spacer()
                    Button(action: {
                        playerVM.isDevicePickerPresented = true
                    }) {
                        Image(systemName: playerVM.isCasting ? "hifispeaker.fill" : "airplayaudio")
                            .font(.system(size: 18))
                            .foregroundColor(playerVM.isCasting ? .green : .white.opacity(0.7))
                    }
                }
                .padding(.horizontal, 24)

                Spacer(minLength: 10)

                // Big Album Artwork with Dynamic Scale
                if let song = playerVM.currentSong {
                    AsyncImage(url: URL(string: song.coverArt ?? "")) { phase in
                        if let image = phase.image {
                            image.resizable().aspectRatio(contentMode: .fill)
                        } else {
                            Rectangle().fill(Color.white.opacity(0.08))
                        }
                    }
                    .frame(width: 280, height: 280)
                    .cornerRadius(20)
                    .shadow(color: playerVM.isCasting ? Color.green.opacity(0.3) : Color.black.opacity(0.6), radius: 24, x: 0, y: 12)
                    .scaleEffect(playerVM.isPlaying ? 1.0 : 0.9)
                    .animation(.spring(response: 0.4, dampingFraction: 0.7), value: playerVM.isPlaying)
                }

                Spacer(minLength: 10)

                // Track Title & Artist
                if let song = playerVM.currentSong {
                    VStack(spacing: 6) {
                        Text(song.title)
                            .font(.system(size: 22, weight: .bold))
                            .foregroundColor(.white)
                            .lineLimit(1)
                        Text(song.artist)
                            .font(.system(size: 17, weight: .medium))
                            .foregroundColor(.white.opacity(0.7))
                            .lineLimit(1)

                        if playerVM.isCasting {
                            HStack(spacing: 6) {
                                Circle().fill(Color.green).frame(width: 6, height: 6)
                                Text("Playing on \(playerVM.activeDeviceName)")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.green)
                            }
                            .padding(.top, 4)
                        }
                    }
                    .padding(.horizontal, 24)
                }

                // Scrubber Slider
                VStack(spacing: 6) {
                    Slider(
                        value: Binding(
                            get: { isDraggingScrubber ? dragScrubberValue : playerVM.currentTime },
                            set: { newValue in
                                isDraggingScrubber = true
                                dragScrubberValue = newValue
                            }
                        ),
                        in: 0...max(1, playerVM.duration),
                        onEditingChanged: { isEditing in
                            if !isEditing {
                                playerVM.seek(to: dragScrubberValue)
                                isDraggingScrubber = false
                            }
                        }
                    )
                    .tint(.white)

                    HStack {
                        Text(formatSeconds(isDraggingScrubber ? dragScrubberValue : playerVM.currentTime))
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                        Spacer()
                        Text(formatSeconds(playerVM.duration))
                            .font(.caption)
                            .foregroundColor(.white.opacity(0.5))
                    }
                }
                .padding(.horizontal, 24)

                // Playback Controls
                HStack(spacing: 48) {
                    Button(action: { playerVM.prev() }) {
                        Image(systemName: "backward.fill")
                            .font(.system(size: 26))
                            .foregroundColor(.white)
                    }

                    Button(action: { playerVM.togglePlayPause() }) {
                        Image(systemName: playerVM.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 38))
                            .foregroundColor(.black)
                            .frame(width: 72, height: 72)
                            .background(Color.white)
                            .clipShape(Circle())
                            .shadow(color: Color.white.opacity(0.2), radius: 12)
                    }

                    Button(action: { playerVM.next() }) {
                        Image(systemName: "forward.fill")
                            .font(.system(size: 26))
                            .foregroundColor(.white)
                    }
                }

                // Volume Slider
                HStack(spacing: 14) {
                    Image(systemName: "speaker.fill")
                        .foregroundColor(.white.opacity(0.4))
                        .font(.system(size: 12))

                    Slider(value: $localVolume, in: 0...1) { editing in
                        if !editing {
                            playerVM.setVolume(localVolume)
                        }
                    }
                    .tint(.white.opacity(0.6))

                    Image(systemName: "speaker.wave.3.fill")
                        .foregroundColor(.white.opacity(0.4))
                        .font(.system(size: 12))
                }
                .padding(.horizontal, 32)
                .padding(.bottom, 24)
            }
        }
        .sheet(isPresented: $playerVM.isDevicePickerPresented) {
            DevicePickerSheet()
        }
    }

    private func formatSeconds(_ seconds: Double) -> String {
        guard seconds > 0 && !seconds.isNaN else { return "0:00" }
        let mins = Int(seconds) / 60
        let secs = Int(seconds) % 60
        return String(format: "%d:%02d", mins, secs)
    }
}
