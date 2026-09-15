import Foundation

public struct Album: Identifiable, Codable, Hashable {
    public let id: String
    public let title: String
    public let artist: String
    public let artistId: String?
    public let coverArt: String?
    public let songCount: Int?
    public let duration: Double?
    public let year: Int?
    public let genre: String?

    public init(
        id: String,
        title: String,
        artist: String,
        artistId: String? = nil,
        coverArt: String? = nil,
        songCount: Int? = nil,
        duration: Double? = nil,
        year: Int? = nil,
        genre: String? = nil
    ) {
        self.id = id
        self.title = title
        self.artist = artist
        self.artistId = artistId
        self.coverArt = coverArt
        self.songCount = songCount
        self.duration = duration
        self.year = year
        self.genre = genre
    }
}
