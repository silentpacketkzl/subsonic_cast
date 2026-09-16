import Foundation

public struct Song: Identifiable, Codable, Hashable {
    public let id: String
    public let title: String
    public let artist: String
    public let album: String?
    public let albumId: String?
    public let duration: Double
    public let track: Int?
    public let year: Int?
    public let genre: String?
    public let coverArt: String?
    public var streamUrl: URL?

    public var formattedDuration: String {
        guard duration > 0 else { return "0:00" }
        let mins = Int(duration) / 60
        let secs = Int(duration) % 60
        return String(format: "%d:%02d", mins, secs)
    }

    public init(
        id: String,
        title: String,
        artist: String,
        album: String? = nil,
        albumId: String? = nil,
        duration: Double = 0,
        track: Int? = nil,
        year: Int? = nil,
        genre: String? = nil,
        coverArt: String? = nil,
        streamUrl: URL? = nil
    ) {
        self.id = id
        self.title = title
        self.artist = artist
        self.album = album
        self.albumId = albumId
        self.duration = duration
        self.track = track
        self.year = year
        self.genre = genre
        self.coverArt = coverArt
        self.streamUrl = streamUrl
    }
}
