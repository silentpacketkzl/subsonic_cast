import Foundation
import CommonCrypto

public final class SubsonicService: ObservableObject {
    @Published public var serverUrl: String = ""
    @Published public var username: String = ""
    public var password: String = ""
    public let clientName: String = "ArpeggiCast-iOS"
    public let apiVersion: String = "1.16.1"

    public var isConfigured: Bool {
        return !serverUrl.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty &&
               !username.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    public init() {
        // Load saved credentials from UserDefaults
        self.serverUrl = UserDefaults.standard.string(forKey: "subsonic_server_url") ?? ""
        self.username = UserDefaults.standard.string(forKey: "subsonic_username") ?? ""
        self.password = UserDefaults.standard.string(forKey: "subsonic_password") ?? ""
    }

    public func saveCredentials(serverUrl: String, username: String, password: String) {
        self.serverUrl = serverUrl.trimmingCharacters(in: .whitespacesAndNewlines).trimmingCharacters(in: CharacterSet(charactersIn: "/"))
        self.username = username.trimmingCharacters(in: .whitespacesAndNewlines)
        self.password = password

        UserDefaults.standard.set(self.serverUrl, forKey: "subsonic_server_url")
        UserDefaults.standard.set(self.username, forKey: "subsonic_username")
        UserDefaults.standard.set(self.password, forKey: "subsonic_password")
    }

    // Standard MD5 hashing for Subsonic token auth
    private static func md5(_ string: String) -> String {
        let length = Int(CC_MD5_DIGEST_LENGTH)
        var digest = [UInt8](repeating: 0, count: length)
        if let data = string.data(using: .utf8) {
            _ = data.withUnsafeBytes { (bytes: UnsafeRawBufferPointer) in
                CC_MD5(bytes.baseAddress, CC_LONG(data.count), &digest)
            }
        }
        return (0..<length).map { String(format: "%02x", digest[$0]) }.joined()
    }

    private func generateSalt(length: Int = 8) -> String {
        let chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return String((0..<length).compactMap { _ in chars.randomElement() })
    }

    private func buildUrl(endpoint: String, extraParams: [String: String] = [:]) -> URL? {
        guard isConfigured else { return nil }
        let salt = generateSalt()
        let token = SubsonicService.md5(password + salt)

        var components = URLComponents(string: "\(serverUrl)/rest/\(endpoint).view")
        var queryItems = [
            URLQueryItem(name: "u", value: username),
            URLQueryItem(name: "t", value: token),
            URLQueryItem(name: "s", value: salt),
            URLQueryItem(name: "v", value: apiVersion),
            URLQueryItem(name: "c", value: clientName),
            URLQueryItem(name: "f", value: "json")
        ]

        for (key, value) in extraParams {
            queryItems.append(URLQueryItem(name: key, value: value))
        }

        components?.queryItems = queryItems
        return components?.url
    }

    // Ping Navidrome server
    public func ping() async throws -> Bool {
        guard let url = buildUrl(endpoint: "ping") else {
            throw URLError(.badURL)
        }
        let (data, response) = try await URLSession.shared.data(from: url)
        guard (response as? HTTPURLResponse)?.statusCode == 200 else {
            return false
        }
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let subResponse = json["subsonic-response"] as? [String: Any],
           let status = subResponse["status"] as? String {
            return status == "ok"
        }
        return false
    }

    // Fetch Recent Albums
    public func getRecentAlbums(size: Int = 30) async throws -> [Album] {
        guard let url = buildUrl(endpoint: "getAlbumList2", extraParams: ["type": "recent", "size": "\(size)"]) else {
            return fallbackAlbums
        }
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let subResponse = json["subsonic-response"] as? [String: Any],
              let albumList = subResponse["albumList2"] as? [String: Any],
              let rawAlbums = albumList["album"] as? [[String: Any]] else {
            return fallbackAlbums
        }

        return rawAlbums.map { dict in
            let id = dict["id"] as? String ?? ""
            let title = dict["title"] as? String ?? dict["name"] as? String ?? "Unknown Album"
            let artist = dict["artist"] as? String ?? "Unknown Artist"
            let coverArtId = dict["coverArt"] as? String ?? id
            let coverUrl = getCoverArtUrl(coverArtId: coverArtId)?.absoluteString

            return Album(
                id: id,
                title: title,
                artist: artist,
                artistId: dict["artistId"] as? String,
                coverArt: coverUrl,
                songCount: dict["songCount"] as? Int,
                duration: dict["duration"] as? Double,
                year: dict["year"] as? Int,
                genre: dict["genre"] as? String
            )
        }
    }

    // Fetch songs for an album
    public func getAlbumSongs(albumId: String) async throws -> [Song] {
        guard let url = buildUrl(endpoint: "getAlbum", extraParams: ["id": albumId]) else {
            return fallbackSongs.filter { $0.albumId == albumId }
        }
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let subResponse = json["subsonic-response"] as? [String: Any],
              let albumObj = subResponse["album"] as? [String: Any],
              let rawSongs = albumObj["song"] as? [[String: Any]] else {
            return fallbackSongs
        }

        return rawSongs.map { dict in
            let id = dict["id"] as? String ?? ""
            let title = dict["title"] as? String ?? "Unknown Title"
            let artist = dict["artist"] as? String ?? "Unknown Artist"
            let album = dict["album"] as? String
            let coverArtId = dict["coverArt"] as? String ?? albumId
            let coverUrl = getCoverArtUrl(coverArtId: coverArtId)?.absoluteString

            return Song(
                id: id,
                title: title,
                artist: artist,
                album: album,
                albumId: albumId,
                duration: dict["duration"] as? Double ?? 0,
                track: dict["track"] as? Int,
                year: dict["year"] as? Int,
                genre: dict["genre"] as? String,
                coverArt: coverUrl,
                streamUrl: getStreamUrl(songId: id)
            )
        }
    }

    // Search across Subsonic library
    public func search(query: String) async throws -> [Song] {
        guard !query.isEmpty, let url = buildUrl(endpoint: "search3", extraParams: ["query": query, "songCount": "30"]) else {
            return fallbackSongs.filter {
                $0.title.localizedCaseInsensitiveContains(query) ||
                $0.artist.localizedCaseInsensitiveContains(query)
            }
        }
        let (data, _) = try await URLSession.shared.data(from: url)
        guard let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let subResponse = json["subsonic-response"] as? [String: Any],
              let result = subResponse["searchResult3"] as? [String: Any],
              let rawSongs = result["song"] as? [[String: Any]] else {
            return []
        }

        return rawSongs.map { dict in
            let id = dict["id"] as? String ?? ""
            let title = dict["title"] as? String ?? "Unknown Title"
            let artist = dict["artist"] as? String ?? "Unknown Artist"
            let album = dict["album"] as? String
            let albumId = dict["albumId"] as? String
            let coverArtId = dict["coverArt"] as? String ?? id
            let coverUrl = getCoverArtUrl(coverArtId: coverArtId)?.absoluteString

            return Song(
                id: id,
                title: title,
                artist: artist,
                album: album,
                albumId: albumId,
                duration: dict["duration"] as? Double ?? 0,
                track: dict["track"] as? Int,
                year: dict["year"] as? Int,
                genre: dict["genre"] as? String,
                coverArt: coverUrl,
                streamUrl: getStreamUrl(songId: id)
            )
        }
    }

    // Audio stream URL for song
    public func getStreamUrl(songId: String) -> URL? {
        return buildUrl(endpoint: "stream", extraParams: ["id": songId])
    }

    // Cover art URL
    public func getCoverArtUrl(coverArtId: String, size: Int = 600) -> URL? {
        return buildUrl(endpoint: "getCoverArt", extraParams: ["id": coverArtId, "size": "\(size)"])
    }

    // Built-in Demo Library for immediate out-of-the-box preview
    public var fallbackAlbums: [Album] {
        return [
            Album(id: "alb-1", title: "Neon Constellations", artist: "Celestial Echoes", coverArt: "https://picsum.photos/seed/alb1/400/400", songCount: 3, duration: 573, year: 2024, genre: "Synthwave"),
            Album(id: "alb-2", title: "Solar Winds", artist: "Aurora Synth", coverArt: "https://picsum.photos/seed/alb2/400/400", songCount: 2, duration: 349, year: 2023, genre: "Lo-Fi Ambient"),
            Album(id: "alb-3", title: "Midnight Reverie", artist: "Velvet Horizon", coverArt: "https://picsum.photos/seed/alb3/400/400", songCount: 2, duration: 370, year: 2024, genre: "Dream Pop")
        ]
    }

    public var fallbackSongs: [Song] {
        return [
            Song(id: "song-1", title: "Starlight Drift", artist: "Celestial Echoes", album: "Neon Constellations", albumId: "alb-1", duration: 198, coverArt: "https://picsum.photos/seed/alb1/400/400", streamUrl: URL(string: "https://cdn.freesound.org/previews/682/682052_11861866-lq.mp3")),
            Song(id: "song-2", title: "Cybernetic Dreams", artist: "Celestial Echoes", album: "Neon Constellations", albumId: "alb-1", duration: 165, coverArt: "https://picsum.photos/seed/alb1/400/400", streamUrl: URL(string: "https://cdn.freesound.org/previews/650/650843_12151124-lq.mp3")),
            Song(id: "song-3", title: "Orbit Resonance", artist: "Celestial Echoes", album: "Neon Constellations", albumId: "alb-1", duration: 210, coverArt: "https://picsum.photos/seed/alb1/400/400", streamUrl: URL(string: "https://cdn.freesound.org/previews/625/625348_11861866-lq.mp3")),
            Song(id: "song-4", title: "Golden Hour Dust", artist: "Aurora Synth", album: "Solar Winds", albumId: "alb-2", duration: 184, coverArt: "https://picsum.photos/seed/alb2/400/400", streamUrl: URL(string: "https://cdn.freesound.org/previews/587/587896_11861866-lq.mp3")),
            Song(id: "song-5", title: "Twilight Glow", artist: "Velvet Horizon", album: "Midnight Reverie", albumId: "alb-3", duration: 205, coverArt: "https://picsum.photos/seed/alb3/400/400", streamUrl: URL(string: "https://cdn.freesound.org/previews/563/563604_11861866-lq.mp3"))
        ]
    }
}
