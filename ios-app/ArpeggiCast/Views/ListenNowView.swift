import SwiftUI

public struct ListenNowView: View {
    @EnvironmentObject var libraryVM: LibraryViewModel
    @EnvironmentObject var playerVM: PlayerViewModel

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Featured Albums Horizontal Scroll
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Featured Albums")
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal)

                        ScrollView(.horizontal, showsIndicators: false) {
                            LazyHStack(spacing: 16) {
                                ForEach(libraryVM.albums) { album in
                                    VStack(alignment: .leading, spacing: 6) {
                                        AsyncImage(url: URL(string: album.coverArt ?? "")) { phase in
                                            if let image = phase.image {
                                                image.resizable().aspectRatio(contentMode: .fill)
                                            } else {
                                                Rectangle().fill(Color.gray.opacity(0.2))
                                            }
                                        }
                                        .frame(width: 150, height: 150)
                                        .cornerRadius(12)
                                        .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)

                                        Text(album.title)
                                            .font(.system(size: 14, weight: .semibold))
                                            .lineLimit(1)
                                            .frame(width: 150, alignment: .leading)

                                        Text(album.artist)
                                            .font(.system(size: 12))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                            .frame(width: 150, alignment: .leading)
                                    }
                                    .onTapGesture {
                                        Task {
                                            do {
                                                let songs = try await libraryVM.subsonicService.getAlbumSongs(albumId: album.id)
                                                if let firstSong = songs.first {
                                                    playerVM.playTrack(firstSong, queue: songs, index: 0)
                                                }
                                            } catch {}
                                        }
                                    }
                                }
                            }
                            .padding(.horizontal)
                        }
                    }

                    // Recent Tracks List
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Recent Tracks")
                            .font(.title2)
                            .fontWeight(.bold)
                            .padding(.horizontal)

                        LazyVStack(spacing: 4) {
                            ForEach(Array(libraryVM.recentSongs.enumerated()), id: \.element.id) { index, song in
                                HStack(spacing: 12) {
                                    AsyncImage(url: URL(string: song.coverArt ?? "")) { phase in
                                        if let image = phase.image {
                                            image.resizable().aspectRatio(contentMode: .fill)
                                        } else {
                                            Rectangle().fill(Color.gray.opacity(0.2))
                                        }
                                    }
                                    .frame(width: 48, height: 48)
                                    .cornerRadius(8)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(song.title)
                                            .font(.system(size: 15, weight: .medium))
                                            .foregroundColor(playerVM.currentSong?.id == song.id ? .pink : .primary)
                                            .lineLimit(1)
                                        Text(song.artist)
                                            .font(.system(size: 13))
                                            .foregroundColor(.secondary)
                                            .lineLimit(1)
                                    }

                                    Spacer()

                                    Text(song.formattedDuration)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.horizontal)
                                .padding(.vertical, 6)
                                .background(playerVM.currentSong?.id == song.id ? Color.pink.opacity(0.08) : Color.clear)
                                .cornerRadius(8)
                                .onTapGesture {
                                    playerVM.playTrack(song, queue: libraryVM.recentSongs, index: index)
                                }
                            }
                        }
                    }
                }
                .padding(.vertical)
                .padding(.bottom, 70) // Padding for MiniPlayer
            }
            .navigationTitle("Listen Now")
        }
    }
}
