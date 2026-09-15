import SwiftUI

public struct SearchView: View {
    @EnvironmentObject var libraryVM: LibraryViewModel
    @EnvironmentObject var playerVM: PlayerViewModel

    public var body: some View {
        NavigationStack {
            VStack {
                if libraryVM.searchResults.isEmpty {
                    VStack(spacing: 12) {
                        Image(systemName: "magnifyingglass")
                            .font(.system(size: 44))
                            .foregroundColor(.secondary)
                        Text(libraryVM.searchQuery.isEmpty ? "Search your Navidrome library" : "No matching songs found")
                            .font(.subheadline)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List {
                        ForEach(Array(libraryVM.searchResults.enumerated()), id: \.element.id) { index, song in
                            HStack(spacing: 12) {
                                AsyncImage(url: URL(string: song.coverArt ?? "")) { phase in
                                    if let image = phase.image {
                                        image.resizable().aspectRatio(contentMode: .fill)
                                    } else {
                                        Rectangle().fill(Color.gray.opacity(0.2))
                                    }
                                }
                                .frame(width: 44, height: 44)
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
                            .contentShape(Rectangle())
                            .onTapGesture {
                                playerVM.playTrack(song, queue: libraryVM.searchResults, index: index)
                            }
                        }
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Search")
            .searchable(text: $libraryVM.searchQuery, prompt: "Artists, Songs, Lyrics")
        }
    }
}
