import Foundation

public struct CastDevice: Identifiable, Codable, Hashable {
    public let id: String
    public let name: String
    public let type: String
    public var isOnline: Bool
    public var isCurrent: Bool

    public var isRemote: Bool {
        return id != "local"
    }

    public init(id: String, name: String, type: String, isOnline: Bool = true, isCurrent: Bool = false) {
        self.id = id
        self.name = name
        self.type = type
        self.isOnline = isOnline
        self.isCurrent = isCurrent
    }

    public static let localDevice = CastDevice(
        id: "local",
        name: "This iPhone",
        type: "local",
        isOnline: true,
        isCurrent: true
    )
}
