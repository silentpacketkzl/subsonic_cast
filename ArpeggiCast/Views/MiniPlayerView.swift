import SwiftUI

public struct MiniPlayerView: View {
    @EnvironmentObject var playerVM: PlayerViewModel

    public var body: some View {
        if let song = playerVM.currentSong {
            HStack(spacing: 12) {
                // Album Art
                AsyncImage(url: URL(string: song.coverArt ?? "")) { phase in
                    if let image = phase.image {
                        image.resizable().aspectRatio(contentMode: .fill)
                    } else {
                        Rectangle().fill(Color.gray.opacity(0.3))
                    }
                }
                .frame(width: 42, height: 42)
                .cornerRadius(8)
                .clipped()

                // Track Info
                VStack(alignment: .leading, spacing: 2) {
                    Text(song.title)
                        .font(.system(size: 14, weight: .semibold))
                        .lineLimit(1)
                    Text(song.artist)
                        .font(.system(size: 12))
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }

                Spacer()

                // Cast / Speaker Beacon
                Button(action: {
                    playerVM.isDevicePickerPresented = true
                }) {
                    Image(systemName: playerVM.isCasting ? "hifispeaker.fill" : "airplayaudio")
                        .font(.system(size: 18))
                        .foregroundColor(playerVM.isCasting ? Color.green : Color.primary)
                        .padding(6)
                }

                // Play / Pause Button
                Button(action: {
                    playerVM.togglePlayPause()
                }) {
                    Image(systemName: playerVM.isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.primary)
                        .padding(6)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(.ultraThinMaterial)
            .cornerRadius(14)
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .stroke(playerVM.isCasting ? Color.green.opacity(0.4) : Color.white.opacity(0.1), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.3), radius: 10, x: 0, y: 4)
            .padding(.horizontal, 12)
            .onTapGesture {
                playerVM.isNowPlayingSheetPresented = true
            }
        }
    }
}
