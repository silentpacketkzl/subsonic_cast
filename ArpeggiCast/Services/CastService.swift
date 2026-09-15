import Foundation
import Combine

public final class CastService: ObservableObject {
    @Published public var isConnected: Bool = false
    @Published public var activeDeviceId: String = "local"
    @Published public var devices: [CastDevice] = [CastDevice.localDevice]
    @Published public var remoteIsPlaying: Bool = false
    @Published public var remoteCurrentTime: Double = 0
    @Published public var remoteDuration: Double = 0
    @Published public var remoteVolume: Float = 0.8
    @Published public var remoteSong: Song?

    public var isCasting: Bool {
        return activeDeviceId != "local"
    }

    private var webSocketTask: URLSessionWebSocketTask?
    private var pingTimer: Timer?
    private let clientId = "ios-" + UUID().uuidString.prefix(8)

    public init() {
        connectToRelay()
    }

    public func connectToRelay(host: String = "100.66.160.147", port: Int = 8080) {
        let urlString = "ws://\(host):\(port)/ws"
        guard let url = URL(string: urlString) else { return }

        let session = URLSession(configuration: .default)
        self.webSocketTask = session.webSocketTask(with: url)
        self.webSocketTask?.resume()

        self.isConnected = true
        sendRegistration()
        listenForMessages()
        startPingTimer()
    }

    private func startPingTimer() {
        pingTimer?.invalidate()
        pingTimer = Timer.scheduledTimer(withTimeInterval: 15, repeats: true) { [weak self] _ in
            self?.webSocketTask?.sendPing { error in
                if let error = error {
                    print("[CastService] WebSocket Ping failed: \(error)")
                }
            }
        }
    }

    private func sendRegistration() {
        let msg: [String: Any] = [
            "type": "REGISTER",
            "id": clientId,
            "name": "iPhone (ArpeggiCast)",
            "clientType": "mobile-controller"
        ]
        send(json: msg)
    }

    public func send(json: [String: Any]) {
        guard let data = try? JSONSerialization.data(withJSONObject: json),
              let string = String(data: data, encoding: .utf8) else { return }

        webSocketTask?.send(.string(string)) { error in
            if let error = error {
                print("[CastService] Send error: \(error)")
            }
        }
    }

    private func listenForMessages() {
        webSocketTask?.receive { [weak self] result in
            guard let self = self else { return }
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self.handleMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self.handleMessage(text)
                    }
                @unknown default:
                    break
                }
                self.listenForMessages() // Continue listening
            case .failure(let error):
                print("[CastService] Receive failure: \(error)")
                DispatchQueue.main.async {
                    self.isConnected = false
                }
            }
        }
    }

    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }

        DispatchQueue.main.async {
            switch type {
            case "INIT", "DEVICES_UPDATE":
                if let rawDevices = json["devices"] as? [[String: Any]] {
                    self.updateDevices(rawDevices)
                }

            case "DEVICE_CHANGED":
                if let deviceId = json["activeDeviceId"] as? String {
                    self.activeDeviceId = deviceId
                    self.refreshCurrentDevice()
                }

            case "STATE_UPDATE":
                if let state = json["state"] as? [String: Any] {
                    self.updatePlaybackState(state)
                }

            default:
                break
            }
        }
    }

    private func updateDevices(_ rawDevices: [[String: Any]]) {
        var newDevices: [CastDevice] = [
            CastDevice(id: "local", name: "This iPhone", type: "local", isOnline: true, isCurrent: activeDeviceId == "local")
        ]

        for d in rawDevices {
            if let id = d["id"] as? String,
               let name = d["name"] as? String,
               let type = d["type"] as? String {
                newDevices.append(
                    CastDevice(
                        id: id,
                        name: name,
                        type: type,
                        isOnline: d["isOnline"] as? Bool ?? true,
                        isCurrent: activeDeviceId == id
                    )
                )
            }
        }
        self.devices = newDevices
    }

    private func refreshCurrentDevice() {
        self.devices = self.devices.map { device in
            var updated = device
            updated.isCurrent = (device.id == activeDeviceId)
            return updated
        }
    }

    private func updatePlaybackState(_ state: [String: Any]) {
        if let isPlaying = state["isPlaying"] as? Bool {
            self.remoteIsPlaying = isPlaying
        }
        if let pos = state["position"] as? Double {
            self.remoteCurrentTime = pos
        }
        if let dur = state["duration"] as? Double {
            self.remoteDuration = dur
        }
        if let vol = state["volume"] as? Double {
            self.remoteVolume = Float(vol)
        }
    }

    // Remote Control Commands
    public func play(song: Song?, position: Double = 0) {
        var payload: [String: Any] = ["position": position]
        if let song = song {
            var songDict: [String: Any] = [
                "id": song.id,
                "title": song.title,
                "artist": song.artist,
                "duration": song.duration
            ]
            if let streamUrl = song.streamUrl?.absoluteString {
                songDict["streamUrl"] = streamUrl
            }
            if let coverArt = song.coverArt {
                songDict["coverArt"] = coverArt
            }
            payload["song"] = songDict
        }

        send(json: [
            "type": "COMMAND",
            "command": "PLAY",
            "targetDeviceId": activeDeviceId,
            "payload": payload
        ])
    }

    public func pause() {
        send(json: [
            "type": "COMMAND",
            "command": "PAUSE",
            "targetDeviceId": activeDeviceId,
            "payload": [:]
        ])
    }

    public func seek(to seconds: Double) {
        send(json: [
            "type": "COMMAND",
            "command": "SEEK",
            "targetDeviceId": activeDeviceId,
            "payload": ["position": seconds]
        ])
    }

    public func setVolume(_ volume: Float) {
        send(json: [
            "type": "COMMAND",
            "command": "SET_VOLUME",
            "targetDeviceId": activeDeviceId,
            "payload": ["volume": Double(volume)]
        ])
    }

    public func selectDevice(_ device: CastDevice, currentSong: Song?, currentPosition: Double, isPlaying: Bool) {
        self.activeDeviceId = device.id
        refreshCurrentDevice()

        if device.id != "local" {
            // Transfer playback to PC speaker
            var songDict: [String: Any] = [:]
            if let song = currentSong {
                songDict["id"] = song.id
                songDict["title"] = song.title
                songDict["artist"] = song.artist
                songDict["duration"] = song.duration
                if let streamUrl = song.streamUrl?.absoluteString {
                    songDict["streamUrl"] = streamUrl
                }
                if let coverArt = song.coverArt {
                    songDict["coverArt"] = coverArt
                }
            }

            send(json: [
                "type": "TRANSFER_PLAYBACK",
                "targetDeviceId": device.id,
                "song": songDict,
                "position": currentPosition,
                "isPlaying": isPlaying
            ])
        }
    }
}
