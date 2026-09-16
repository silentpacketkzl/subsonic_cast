import Foundation
import AVFoundation
import MediaPlayer

public final class AudioPlayerService: ObservableObject {
    @Published public var currentSong: Song?
    @Published public var isPlaying: Bool = false
    @Published public var currentTime: Double = 0
    @Published public var duration: Double = 0
    @Published public var volume: Float = 0.8

    private var player: AVPlayer?
    private var timeObserverToken: Any?

    public init() {
        configureAudioSession()
        setupRemoteCommandCenter()
    }

    private func configureAudioSession() {
        do {
            let session = AVAudioSession.sharedInstance()
            try session.setCategory(.playback, mode: .default, options: [.defaultToSpeaker, .allowBluetooth, .allowAirPlay])
            try session.setActive(true)
        } catch {
            print("[AudioPlayerService] Failed to set AVAudioSession category: \(error)")
        }
    }

    private func setupRemoteCommandCenter() {
        let commandCenter = MPRemoteCommandCenter.shared()

        commandCenter.playCommand.addTarget { [weak self] _ in
            self?.play()
            return .success
        }

        commandCenter.pauseCommand.addTarget { [weak self] _ in
            self?.pause()
            return .success
        }

        commandCenter.changePlaybackPositionCommand.addTarget { [weak self] event in
            if let positionEvent = event as? MPChangePlaybackPositionCommandEvent {
                self?.seek(to: positionEvent.positionTime)
                return .success
            }
            return .commandFailed
        }
    }

    public func loadAndPlay(song: Song, startTime: Double = 0) {
        guard let url = song.streamUrl else { return }
        self.currentSong = song

        // Clean up previous observer
        if let token = timeObserverToken {
            player?.removeTimeObserver(token)
            timeObserverToken = nil
        }

        let playerItem = AVPlayerItem(url: url)
        self.player = AVPlayer(playerItem: playerItem)
        self.player?.volume = volume

        // Observe periodic time updates (every 0.25 seconds)
        let interval = CMTime(seconds: 0.25, preferredTimescale: CMTimeScale(NSEC_PER_SEC))
        self.timeObserverToken = player?.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self else { return }
            self.currentTime = time.seconds
            if let itemDuration = self.player?.currentItem?.duration.seconds, !itemDuration.isNaN {
                self.duration = itemDuration
            } else {
                self.duration = song.duration
            }
            self.updateNowPlayingInfo()
        }

        if startTime > 0 {
            seek(to: startTime)
        }

        play()
        updateNowPlayingInfo()
    }

    public func play() {
        player?.play()
        isPlaying = true
        updateNowPlayingInfo()
    }

    public func pause() {
        player?.pause()
        isPlaying = false
        updateNowPlayingInfo()
    }

    public func togglePlayPause() {
        if isPlaying {
            pause()
        } else {
            play()
        }
    }

    public func seek(to seconds: Double) {
        let targetTime = CMTime(seconds: seconds, preferredTimescale: 600)
        player?.seek(to: targetTime, toleranceBefore: .zero, toleranceAfter: .zero)
        currentTime = seconds
        updateNowPlayingInfo()
    }

    public func setVolume(_ vol: Float) {
        self.volume = max(0, min(1, vol))
        player?.volume = self.volume
    }

    private func updateNowPlayingInfo() {
        guard let song = currentSong else { return }

        var nowPlayingInfo = [String: Any]()
        nowPlayingInfo[MPMediaItemPropertyTitle] = song.title
        nowPlayingInfo[MPMediaItemPropertyArtist] = song.artist
        nowPlayingInfo[MPMediaItemPropertyAlbumTitle] = song.album ?? ""
        nowPlayingInfo[MPMediaItemPropertyPlaybackDuration] = duration > 0 ? duration : song.duration
        nowPlayingInfo[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        nowPlayingInfo[MPNowPlayingInfoPropertyPlaybackRate] = isPlaying ? 1.0 : 0.0

        MPNowPlayingInfoCenter.default().nowPlayingInfo = nowPlayingInfo
    }
}
