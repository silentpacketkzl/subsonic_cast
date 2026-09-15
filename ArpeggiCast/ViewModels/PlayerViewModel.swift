import Foundation
import Combine

@MainActor
public final class PlayerViewModel: ObservableObject {
    @Published public var currentSong: Song?
    @Published public var queue: [Song] = []
    @Published public var queueIndex: Int = 0
    @Published public var isNowPlayingSheetPresented: Bool = false
    @Published public var isDevicePickerPresented: Bool = false

    public let localPlayer = AudioPlayerService()
    public let castService = CastService()

    private var cancellables = Set<AnyCancellable>()

    public var isCasting: Bool {
        return castService.isCasting
    }

    public var isPlaying: Bool {
        return isCasting ? castService.remoteIsPlaying : localPlayer.isPlaying
    }

    public var currentTime: Double {
        return isCasting ? castService.remoteCurrentTime : localPlayer.currentTime
    }

    public var duration: Double {
        return isCasting ? castService.remoteDuration : (localPlayer.duration > 0 ? localPlayer.duration : (currentSong?.duration ?? 0))
    }

    public var activeDeviceName: String {
        if isCasting {
            let dev = castService.devices.first(where: { $0.id == castService.activeDeviceId })
            return dev?.name ?? "External Speaker"
        }
        return "This iPhone"
    }

    public init() {
        // Forward changes from localPlayer and castService
        localPlayer.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }.store(in: &cancellables)

        castService.objectWillChange.sink { [weak self] _ in
            self?.objectWillChange.send()
        }.store(in: &cancellables)
    }

    public func playTrack(_ song: Song, queue: [Song] = [], index: Int = 0) {
        self.currentSong = song
        self.queue = queue.isEmpty ? [song] : queue
        self.queueIndex = index

        if isCasting {
            castService.play(song: song, position: 0)
        } else {
            localPlayer.loadAndPlay(song: song, startTime: 0)
        }
    }

    public func togglePlayPause() {
        if isCasting {
            if castService.remoteIsPlaying {
                castService.pause()
            } else {
                castService.play(song: currentSong, position: currentTime)
            }
        } else {
            localPlayer.togglePlayPause()
        }
    }

    public func seek(to seconds: Double) {
        if isCasting {
            castService.seek(to: seconds)
        } else {
            localPlayer.seek(to: seconds)
        }
    }

    public func setVolume(_ vol: Float) {
        if isCasting {
            castService.setVolume(vol)
        } else {
            localPlayer.setVolume(vol)
        }
    }

    public func next() {
        guard !queue.isEmpty else { return }
        let nextIndex = (queueIndex + 1) % queue.count
        queueIndex = nextIndex
        playTrack(queue[nextIndex], queue: queue, index: nextIndex)
    }

    public func prev() {
        guard !queue.isEmpty else { return }
        if currentTime > 3 {
            seek(to: 0)
            return
        }
        let prevIndex = (queueIndex - 1 + queue.count) % queue.count
        queueIndex = prevIndex
        playTrack(queue[prevIndex], queue: queue, index: prevIndex)
    }

    public func selectDevice(_ device: CastDevice) {
        let currentPos = currentTime
        let wasPlaying = isPlaying

        if device.id != "local" {
            // Transfer to PC Speaker
            localPlayer.pause()
            castService.selectDevice(device, currentSong: currentSong, currentPosition: currentPos, isPlaying: wasPlaying)
        } else {
            // Transfer back to iPhone
            castService.pause()
            castService.activeDeviceId = "local"
            if let song = currentSong {
                localPlayer.loadAndPlay(song: song, startTime: currentPos)
            }
        }
    }
}
