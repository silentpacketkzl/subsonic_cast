/**
 * Audio Player Engine
 * Controls local HTML5 audio playback, buffering, track transitions,
 * and iOS lock screen / MediaSession API synchronization.
 */
class AudioPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.preload = 'auto';
    this.currentSong = null;
    this.queue = [];
    this.queueIndex = -1;
    this.isShuffle = false;
    this.repeatMode = 'off'; // 'off', 'all', 'one'
    this.listeners = new Map();

    this.bindAudioEvents();
    this.setupMediaSession();
  }

  bindAudioEvents() {
    this.audio.addEventListener('play', () => this.emit('play', this.currentSong));
    this.audio.addEventListener('pause', () => this.emit('pause', this.currentSong));
    this.audio.addEventListener('timeupdate', () => {
      this.emit('timeupdate', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration || 0,
        percentage: this.audio.duration ? (this.audio.currentTime / this.audio.duration) * 100 : 0
      });
      this.updateMediaSessionPositionState();
    });
    this.audio.addEventListener('loadedmetadata', () => {
      this.emit('loadedmetadata', { duration: this.audio.duration });
      this.updateMediaSessionPositionState();
    });
    this.audio.addEventListener('ended', () => {
      this.emit('ended', this.currentSong);
      this.handleTrackEnded();
    });
    this.audio.addEventListener('waiting', () => this.emit('buffering', true));
    this.audio.addEventListener('canplay', () => this.emit('buffering', false));
    this.audio.addEventListener('error', (e) => {
      console.error('Audio playback error:', e);
      this.emit('error', e);
    });
  }

  setupMediaSession() {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => this.play());
      navigator.mediaSession.setActionHandler('pause', () => this.pause());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.prev());
      navigator.mediaSession.setActionHandler('nexttrack', () => this.next());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) {
          this.seek(details.seekTime);
        }
      });
    }
  }

  updateMediaSessionMetadata(song) {
    if ('mediaSession' in navigator && song) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: song.title || 'Unknown Title',
        artist: song.artist || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        artwork: [
          { src: song.coverArtUrl || '/icons/cover-placeholder.png', sizes: '512x512', type: 'image/png' }
        ]
      });
    }
  }

  updateMediaSessionPositionState() {
    if ('mediaSession' in navigator && this.audio.duration) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration,
          playbackRate: this.audio.playbackRate,
          position: this.audio.currentTime
        });
      } catch (e) {
        // Ignored if position state is out of range during loading
      }
    }
  }

  async loadTrack(song, autoplay = true, startTime = 0) {
    if (!song) return;
    this.currentSong = song;

    const streamUrl = song.streamUrl || song.url;
    if (!streamUrl) {
      console.error('No stream URL provided for song:', song);
      return;
    }

    this.audio.src = streamUrl;
    this.audio.currentTime = startTime;

    this.updateMediaSessionMetadata(song);
    this.emit('trackchange', song);

    if (autoplay) {
      try {
        await this.audio.play();
      } catch (err) {
        console.warn('Autoplay prevented or interrupted:', err);
      }
    }
  }

  async play() {
    try {
      await this.audio.play();
    } catch (err) {
      console.warn('Playback play() failed:', err);
    }
  }

  pause() {
    this.audio.pause();
  }

  togglePlay() {
    if (this.isPlaying()) {
      this.pause();
    } else {
      this.play();
    }
  }

  seek(seconds) {
    if (Number.isFinite(seconds)) {
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration || 0));
    }
  }

  setVolume(vol) {
    this.audio.volume = Math.max(0, Math.min(1, vol));
  }

  getVolume() {
    return this.audio.volume;
  }

  isPlaying() {
    return !this.audio.paused && !this.audio.ended && this.audio.readyState > 2;
  }

  setQueue(songs, startIndex = 0) {
    this.queue = Array.isArray(songs) ? [...songs] : [];
    this.queueIndex = startIndex;
    if (this.queue.length > 0 && startIndex >= 0 && startIndex < this.queue.length) {
      this.loadTrack(this.queue[startIndex], true);
    }
    this.emit('queuechange', { queue: this.queue, index: this.queueIndex });
  }

  next() {
    if (this.queue.length === 0) return;

    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
      return;
    }

    let nextIndex = this.queueIndex + 1;
    if (nextIndex >= this.queue.length) {
      if (this.repeatMode === 'all') {
        nextIndex = 0;
      } else {
        return; // End of queue
      }
    }

    this.queueIndex = nextIndex;
    this.loadTrack(this.queue[this.queueIndex], true);
    this.emit('queuechange', { queue: this.queue, index: this.queueIndex });
  }

  prev() {
    if (this.queue.length === 0) return;

    // If more than 3 seconds into track, restart current track
    if (this.audio.currentTime > 3) {
      this.seek(0);
      return;
    }

    let prevIndex = this.queueIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.queue.length - 1;
    }

    this.queueIndex = prevIndex;
    this.loadTrack(this.queue[this.queueIndex], true);
    this.emit('queuechange', { queue: this.queue, index: this.queueIndex });
  }

  handleTrackEnded() {
    if (this.repeatMode === 'one') {
      this.seek(0);
      this.play();
    } else {
      this.next();
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        cb(data);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  window.AudioPlayer = AudioPlayer;
}
