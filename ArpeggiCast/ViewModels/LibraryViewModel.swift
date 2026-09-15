import Foundation
import Combine

@MainActor
public final class LibraryViewModel: ObservableObject {
    @Published public var albums: [Album] = []
    @Published public var recentSongs: [Song] = []
    @Published public var searchResults: [Song] = []
    @Published public var searchQuery: String = ""
    @Published public var isLoading: Bool = false
    @Published public var errorMessage: String?

    public let subsonicService = SubsonicService()
    private var cancellables = Set<AnyCancellable>()

    public init() {
        // Debounce search query updates
        $searchQuery
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .sink { [weak self] query in
                Task {
                    await self?.performSearch(query: query)
                }
            }
            .store(in: &cancellables)

        loadInitialData()
    }

    public func loadInitialData() {
        Task {
            isLoading = true
            do {
                if subsonicService.isConfigured {
                    self.albums = try await subsonicService.getRecentAlbums()
                    if let firstAlb = albums.first {
                        self.recentSongs = try await subsonicService.getAlbumSongs(albumId: firstAlb.id)
                    }
                } else {
                    self.albums = subsonicService.fallbackAlbums
                    self.recentSongs = subsonicService.fallbackSongs
                }
            } catch {
                self.albums = subsonicService.fallbackAlbums
                self.recentSongs = subsonicService.fallbackSongs
                self.errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }

    public func performSearch(query: String) async {
        guard !query.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            searchResults = []
            return
        }

        do {
            searchResults = try await subsonicService.search(query: query)
        } catch {
            searchResults = []
        }
    }
}
