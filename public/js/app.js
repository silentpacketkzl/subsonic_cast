/**
 * Arpeggi Music Player Application Logic
 * Integrates Subsonic API, local AudioPlayer, and ConnectClient (Spotify Connect casting).
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Subsonic Client with saved or default credentials
  const savedConfig = JSON.parse(localStorage.getItem('arpeggi_subsonic_config') || '{}');
  const subsonic = new SubsonicClient({
    serverUrl: savedConfig.serverUrl || '',
    username: savedConfig.username || '',
    password: savedConfig.password || '',
    clientName: 'ArpeggiConnect'
  });

  // Local audio player for this device
  const localPlayer = new AudioPlayer();

  // Connect client for Spotify Connect casting
  const connect = new ConnectClient({
    clientName: /iPhone|iPad/i.test(navigator.userAgent) ? 'iPhone' : 'My Phone',
    clientType: 'mobile-controller'
  });

  // UI State
  let currentLibrary = DEMO_LIBRARY;
  let activeView = 'home';
  let isNavidromeConnected = false;
  let isCasting = false;
  let activeSong = null;

  // DOM Elements
  const miniPlayer = document.getElementById('miniPlayer');
  const miniThumb = document.getElementById('miniThumb');
  const miniTitle = document.getElementById('miniTitle');
  const miniArtist = document.getElementById('miniArtist');
  const miniPlayPauseBtn = document.getElementById('miniPlayPauseBtn');
  const miniPlayPauseIcon = document.getElementById('miniPlayPauseIcon');
  const miniProgressFill = document.getElementById('miniProgressFill');
  const miniCastBtn = document.getElementById('miniCastBtn');

  const nowPlayingModal = document.getElementById('nowPlayingModal');
  const closeNowPlayingBtn = document.getElementById('closeNowPlayingBtn');
  const modalArt = document.getElementById('modalArt');
  const modalTitle = document.getElementById('modalTitle');
  const modalArtist = document.getElementById('modalArtist');
  const scrubberSlider = document.getElementById('scrubberSlider');
  const currentTimeLabel = document.getElementById('currentTimeLabel');
  const durationLabel = document.getElementById('durationLabel');
  const mainPlayPauseBtn = document.getElementById('mainPlayPauseBtn');
  const mainPlayPauseIcon = document.getElementById('mainPlayPauseIcon');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const volumeSlider = document.getElementById('volumeSlider');
  const modalCastBtn = document.getElementById('modalCastBtn');

  const castStatusBar = document.getElementById('castStatusBar');
  const castStatusText = document.getElementById('castStatusText');
  const connectModalBackdrop = document.getElementById('connectModalBackdrop');
  const closeConnectModalBtn = document.getElementById('closeConnectModalBtn');
  const deviceListContainer = document.getElementById('deviceListContainer');

  const settingsModalBackdrop = document.getElementById('settingsModalBackdrop');
  const openSettingsBtn = document.getElementById('openSettingsBtn');
  const closeSettingsBtn = document.getElementById('closeSettingsBtn');
  const serverUrlInput = document.getElementById('serverUrlInput');
  const usernameInput = document.getElementById('usernameInput');
  const passwordInput = document.getElementById('passwordInput');
  const testConnBtn = document.getElementById('testConnBtn');
  const saveSettingsBtn = document.getElementById('saveSettingsBtn');
  const connStatusBadge = document.getElementById('connStatusBadge');

  const tabItems = document.querySelectorAll('.tab-item');
  const viewSections = document.querySelectorAll('.view-section');
  const ambientGlow = document.getElementById('ambientGlow');

  // Format seconds to mm:ss
  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Set ambient background glow
  function setAmbientColor(colorHex) {
    if (!colorHex || !ambientGlow) return;
    ambientGlow.style.background = `
      radial-gradient(circle at 30% 20%, ${colorHex}44 0%, transparent 55%),
      radial-gradient(circle at 80% 60%, rgba(121, 40, 202, 0.2) 0%, transparent 60%),
      radial-gradient(circle at 50% 90%, ${isCasting ? 'rgba(30, 215, 96, 0.25)' : 'rgba(250, 45, 72, 0.2)'} 0%, transparent 50%)
    `;
  }

  // Initialize UI with songs & albums
  function renderLibrary() {
    // Render Featured Albums
    const albumContainer = document.getElementById('featuredAlbumsContainer');
    if (albumContainer) {
      albumContainer.innerHTML = currentLibrary.albums.map(album => {
        const coverSrc = album.coverArt.startsWith('http')
          ? album.coverArt
          : `https://picsum.photos/seed/${album.id}/300/300`;
        return `
          <div class="album-card" data-album-id="${album.id}">
            <div class="album-art">
              <img src="${coverSrc}" alt="${album.title}" loading="lazy" />
              <div class="play-overlay">
                <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              </div>
            </div>
            <div class="album-title">${album.title}</div>
            <div class="album-artist">${album.artist}</div>
          </div>
        `;
      }).join('');

      // Click on album card plays album songs
      albumContainer.querySelectorAll('.album-card').forEach(card => {
        card.addEventListener('click', () => {
          const albId = card.dataset.albumId;
          const albumSongs = currentLibrary.songs.filter(s => s.albumId === albId);
          if (albumSongs.length > 0) {
            playTrack(albumSongs[0], albumSongs, 0);
          }
        });
      });
    }

    // Render Recent Songs
    const songsContainer = document.getElementById('recentSongsContainer');
    if (songsContainer) {
      songsContainer.innerHTML = currentLibrary.songs.map((song, idx) => {
        const coverSrc = (song.coverArt && song.coverArt.startsWith('http'))
          ? song.coverArt
          : `https://picsum.photos/seed/${song.albumId || song.id}/120/120`;
        const isPlayingThis = activeSong && activeSong.id === song.id;
        return `
          <div class="song-row ${isPlayingThis ? 'playing' : ''}" data-song-id="${song.id}" data-index="${idx}">
            <div class="song-row-thumb">
              <img src="${coverSrc}" alt="${song.title}" loading="lazy" />
            </div>
            <div class="song-row-info">
              <div class="song-row-title">${song.title}</div>
              <div class="song-row-artist">${song.artist} &bull; ${song.album || ''}</div>
            </div>
            <div class="song-row-duration">${formatTime(song.duration)}</div>
          </div>
        `;
      }).join('');

      songsContainer.querySelectorAll('.song-row').forEach(row => {
        row.addEventListener('click', () => {
          const songId = row.dataset.songId;
          const song = currentLibrary.songs.find(s => s.id === songId);
          if (song) {
            playTrack(song, currentLibrary.songs, parseInt(row.dataset.index, 10));
          }
        });
      });
    }
  }

  // Play track either locally or cast to computer
  function playTrack(song, queue = null, queueIndex = 0) {
    if (!song) return;
    activeSong = song;

    // Update active highlight in list
    document.querySelectorAll('.song-row').forEach(row => {
      row.classList.toggle('playing', row.dataset.songId === song.id);
    });

    // Update Mini-Player & Modal UI
    const coverSrc = (song.coverArt && song.coverArt.startsWith('http'))
      ? song.coverArt
      : `https://picsum.photos/seed/${song.albumId || song.id}/400/400`;

    miniThumb.src = coverSrc;
    miniTitle.textContent = song.title;
    miniArtist.textContent = song.artist;
    miniPlayer.classList.remove('hidden');

    modalArt.src = coverSrc;
    modalTitle.textContent = song.title;
    modalArtist.textContent = song.artist;
    durationLabel.textContent = formatTime(song.duration);

    setAmbientColor(song.accentColor || '#fa2d48');

    if (isCasting) {
      // Stream directly to computer speakers via Connect
      connect.play(song, 0);
      updatePlayPauseIcons(true);
    } else {
      // Play locally on phone
      if (queue) {
        localPlayer.setQueue(queue, queueIndex);
      } else {
        localPlayer.loadTrack(song, true);
      }
      updatePlayPauseIcons(true);
    }
  }

  // Toggle play/pause
  function togglePlayPause() {
    if (isCasting) {
      if (connect.state.isPlaying) {
        connect.pause();
        updatePlayPauseIcons(false);
      } else {
        connect.play(activeSong, scrubberSlider.value);
        updatePlayPauseIcons(true);
      }
    } else {
      localPlayer.togglePlay();
      updatePlayPauseIcons(localPlayer.isPlaying());
    }
  }

  function updatePlayPauseIcons(isPlaying) {
    const playSvg = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    const pauseSvg = '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';

    miniPlayPauseIcon.innerHTML = isPlaying ? pauseSvg : playSvg;
    mainPlayPauseIcon.innerHTML = isPlaying ? pauseSvg : playSvg;

    nowPlayingModal.classList.toggle('playing', isPlaying);
    nowPlayingModal.classList.toggle('paused', !isPlaying);
  }

  // Event Listeners for Player Engine
  localPlayer.on('play', () => {
    if (!isCasting) updatePlayPauseIcons(true);
  });
  localPlayer.on('pause', () => {
    if (!isCasting) updatePlayPauseIcons(false);
  });
  localPlayer.on('timeupdate', ({ currentTime, duration, percentage }) => {
    if (!isCasting) {
      scrubberSlider.value = currentTime;
      scrubberSlider.max = duration || 100;
      currentTimeLabel.textContent = formatTime(currentTime);
      durationLabel.textContent = formatTime(duration);
      miniProgressFill.style.width = `${percentage}%`;
    }
  });

  // Event Listeners for Connect (Spotify Connect-like sync)
  connect.on('deviceChanged', ({ activeDeviceId, isRemote }) => {
    isCasting = isRemote;
    const activeDeviceName = connect.getActiveDeviceName();

    if (isCasting) {
      castStatusBar.classList.add('active');
      castStatusText.textContent = `Playing on ${activeDeviceName}`;
      miniCastBtn.classList.add('cast-active');
      modalCastBtn.classList.add('active');
      miniProgressFill.classList.add('casting');

      // If phone was playing locally, pause local audio and transfer to PC
      if (localPlayer.isPlaying()) {
        const curTime = localPlayer.audio.currentTime;
        localPlayer.pause();
        connect.play(activeSong, curTime);
      }
    } else {
      castStatusBar.classList.remove('active');
      miniCastBtn.classList.remove('cast-active');
      modalCastBtn.classList.remove('active');
      miniProgressFill.classList.remove('casting');

      // Switched back to phone: pause remote and resume locally
      connect.pause();
      if (activeSong) {
        localPlayer.loadTrack(activeSong, true, parseFloat(scrubberSlider.value) || 0);
      }
    }
    renderDeviceList(connect.devices);
  });

  connect.on('stateChange', (remoteState) => {
    if (isCasting) {
      if (remoteState.currentSong && (!activeSong || activeSong.id !== remoteState.currentSong.id)) {
        activeSong = remoteState.currentSong;
        miniTitle.textContent = activeSong.title;
        miniArtist.textContent = activeSong.artist;
        modalTitle.textContent = activeSong.title;
        modalArtist.textContent = activeSong.artist;
      }

      updatePlayPauseIcons(remoteState.isPlaying);

      if (remoteState.position !== undefined) {
        scrubberSlider.value = remoteState.position;
        currentTimeLabel.textContent = formatTime(remoteState.position);
      }
      if (remoteState.duration) {
        scrubberSlider.max = remoteState.duration;
        durationLabel.textContent = formatTime(remoteState.duration);
        const pct = (remoteState.position / remoteState.duration) * 100;
        miniProgressFill.style.width = `${pct}%`;
      }
    }
  });

  connect.on('devicesUpdated', (devices) => {
    renderDeviceList(devices);
  });

  // Render Spotify Connect device picker
  function renderDeviceList(devices) {
    if (!deviceListContainer) return;
    deviceListContainer.innerHTML = devices.map(device => {
      const isCur = device.isCurrent;
      const isPc = device.type === 'pc-receiver';
      const iconSvg = isPc
        ? `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>`
        : `<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="3"/><line x1="12" y1="18" x2="12" y2="18.01"/></svg>`;

      return `
        <div class="device-item ${isCur ? 'active' : ''}" data-device-id="${device.id}">
          <div class="device-icon-box">
            ${iconSvg}
          </div>
          <div class="device-info">
            <div class="device-name">${device.name}</div>
            <div class="device-status">${isCur ? (isPc ? 'Connected to PC Speakers' : 'Active Device') : 'Available on network'}</div>
          </div>
          ${isCur ? '<div class="device-active-badge">Active</div>' : ''}
        </div>
      `;
    }).join('');

    deviceListContainer.querySelectorAll('.device-item').forEach(el => {
      el.addEventListener('click', () => {
        const devId = el.dataset.deviceId;
        const currentPos = parseFloat(scrubberSlider.value) || 0;
        connect.selectDevice(devId, {
          song: activeSong,
          position: currentPos,
          isPlaying: isCasting ? connect.state.isPlaying : localPlayer.isPlaying(),
          queue: currentLibrary.songs
        });
        connectModalBackdrop.classList.remove('open');
      });
    });
  }

  // Scrubber scrubbing
  scrubberSlider.addEventListener('input', () => {
    const targetSec = parseFloat(scrubberSlider.value);
    currentTimeLabel.textContent = formatTime(targetSec);
  });

  scrubberSlider.addEventListener('change', () => {
    const targetSec = parseFloat(scrubberSlider.value);
    if (isCasting) {
      connect.seek(targetSec);
    } else {
      localPlayer.seek(targetSec);
    }
  });

  // Volume slider
  volumeSlider.addEventListener('input', () => {
    const vol = parseFloat(volumeSlider.value);
    if (isCasting) {
      connect.setVolume(vol);
    } else {
      localPlayer.setVolume(vol);
    }
  });

  // Next / Previous buttons
  nextBtn.addEventListener('click', () => {
    if (isCasting) {
      connect.next();
    } else {
      localPlayer.next();
    }
  });

  prevBtn.addEventListener('click', () => {
    if (isCasting) {
      connect.prev();
    } else {
      localPlayer.prev();
    }
  });

  // Controls bindings
  miniPlayPauseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    togglePlayPause();
  });

  mainPlayPauseBtn.addEventListener('click', () => {
    togglePlayPause();
  });

  // Open / Close Now Playing Sheet
  miniPlayer.addEventListener('click', () => {
    nowPlayingModal.classList.add('open');
  });

  closeNowPlayingBtn.addEventListener('click', () => {
    nowPlayingModal.classList.remove('open');
  });

  // Device Casting Modal
  function openDeviceModal() {
    connectModalBackdrop.classList.add('open');
  }

  miniCastBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    openDeviceModal();
  });

  modalCastBtn.addEventListener('click', () => {
    openDeviceModal();
  });

  castStatusBar.addEventListener('click', () => {
    openDeviceModal();
  });

  closeConnectModalBtn.addEventListener('click', () => {
    connectModalBackdrop.classList.remove('open');
  });

  connectModalBackdrop.addEventListener('click', (e) => {
    if (e.target === connectModalBackdrop) {
      connectModalBackdrop.classList.remove('open');
    }
  });

  // Tab Navigation
  tabItems.forEach(tab => {
    tab.addEventListener('click', () => {
      const viewId = tab.dataset.view;
      tabItems.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      viewSections.forEach(section => {
        section.classList.toggle('active', section.id === `view-${viewId}`);
      });
      activeView = viewId;
    });
  });

  // Settings Modal (Subsonic / Navidrome configuration)
  openSettingsBtn.addEventListener('click', () => {
    serverUrlInput.value = subsonic.serverUrl;
    usernameInput.value = subsonic.username;
    passwordInput.value = subsonic.password;
    settingsModalBackdrop.classList.add('open');
  });

  closeSettingsBtn.addEventListener('click', () => {
    settingsModalBackdrop.classList.remove('open');
  });

  settingsModalBackdrop.addEventListener('click', (e) => {
    if (e.target === settingsModalBackdrop) {
      settingsModalBackdrop.classList.remove('open');
    }
  });

  // Test Navidrome connection
  testConnBtn.addEventListener('click', async () => {
    const testUrl = serverUrlInput.value.trim();
    const testUser = usernameInput.value.trim();
    const testPass = passwordInput.value;

    if (!testUrl || !testUser) {
      alert('Please enter your Navidrome server URL and username.');
      return;
    }

    connStatusBadge.textContent = 'Testing connection...';
    connStatusBadge.style.color = 'var(--text-secondary)';

    const tempClient = new SubsonicClient({
      serverUrl: testUrl,
      username: testUser,
      password: testPass
    });

    try {
      await tempClient.ping();
      connStatusBadge.textContent = '✓ Connected successfully to Navidrome!';
      connStatusBadge.style.color = 'var(--connect-green)';
    } catch (err) {
      connStatusBadge.textContent = `✕ Connection failed: ${err.message}`;
      connStatusBadge.style.color = 'var(--accent-pink)';
    }
  });

  // Save Settings & Load live Navidrome library
  saveSettingsBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim();
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    const config = { serverUrl, username, password };
    localStorage.setItem('arpeggi_subsonic_config', JSON.stringify(config));
    subsonic.updateConfig(config);

    if (serverUrl && username) {
      try {
        await loadNavidromeLibrary();
      } catch (err) {
        console.warn('Could not fetch Navidrome library, remaining on demo library:', err);
      }
    }

    settingsModalBackdrop.classList.remove('open');
  });

  // Fetch live library from Navidrome
  async function loadNavidromeLibrary() {
    if (!subsonic.isConfigured) return;
    try {
      const albums = await subsonic.getAlbumList2('recent', 30);
      if (albums && albums.length > 0) {
        const liveAlbums = albums.map(a => ({
          id: a.id,
          title: a.title || a.name,
          artist: a.artist,
          artistId: a.artistId,
          coverArt: subsonic.getCoverArtUrl(a.coverArt || a.id),
          year: a.year
        }));

        // Fetch tracks for the first album to seed recent tracks
        const firstAlbumData = await subsonic.getAlbum(liveAlbums[0].id);
        const liveSongs = (firstAlbumData?.song || []).map(s => ({
          id: s.id,
          title: s.title,
          artist: s.artist,
          album: s.album,
          albumId: s.albumId,
          duration: s.duration,
          streamUrl: subsonic.getStreamUrl(s.id),
          coverArt: subsonic.getCoverArtUrl(s.coverArt || s.albumId || s.id),
          accentColor: '#fa2d48'
        }));

        currentLibrary = {
          albums: liveAlbums,
          songs: liveSongs.length > 0 ? liveSongs : DEMO_LIBRARY.songs
        };

        isNavidromeConnected = true;
        renderLibrary();
      }
    } catch (err) {
      console.error('Failed to load Navidrome library:', err);
    }
  }

  // Search input handler
  const searchInput = document.getElementById('searchInput');
  const searchResultsContainer = document.getElementById('searchResultsContainer');

  if (searchInput) {
    searchInput.addEventListener('input', async () => {
      const q = searchInput.value.trim().toLowerCase();
      if (!q) {
        searchResultsContainer.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 40px 0;">Type to search songs, albums, or artists</div>';
        return;
      }

      if (isNavidromeConnected) {
        try {
          const res = await subsonic.search(q);
          const songs = (res.song || []).map(s => ({
            id: s.id,
            title: s.title,
            artist: s.artist,
            album: s.album,
            duration: s.duration,
            streamUrl: subsonic.getStreamUrl(s.id),
            coverArt: subsonic.getCoverArtUrl(s.coverArt || s.id)
          }));
          renderSearchResults(songs);
        } catch (e) {
          filterLocalSearch(q);
        }
      } else {
        filterLocalSearch(q);
      }
    });
  }

  function filterLocalSearch(q) {
    const matchedSongs = currentLibrary.songs.filter(s =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.album && s.album.toLowerCase().includes(q))
    );
    renderSearchResults(matchedSongs);
  }

  function renderSearchResults(songs) {
    if (songs.length === 0) {
      searchResultsContainer.innerHTML = '<div style="color: var(--text-tertiary); text-align: center; padding: 40px 0;">No matching songs found</div>';
      return;
    }

    searchResultsContainer.innerHTML = songs.map((song, idx) => {
      const coverSrc = (song.coverArt && song.coverArt.startsWith('http'))
        ? song.coverArt
        : `https://picsum.photos/seed/${song.id}/120/120`;
      return `
        <div class="song-row" data-song-id="${song.id}">
          <div class="song-row-thumb">
            <img src="${coverSrc}" alt="${song.title}" />
          </div>
          <div class="song-row-info">
            <div class="song-row-title">${song.title}</div>
            <div class="song-row-artist">${song.artist}</div>
          </div>
          <div class="song-row-duration">${formatTime(song.duration)}</div>
        </div>
      `;
    }).join('');

    searchResultsContainer.querySelectorAll('.song-row').forEach(row => {
      row.addEventListener('click', () => {
        const songId = row.dataset.songId;
        const song = songs.find(s => s.id === songId);
        if (song) playTrack(song, songs);
      });
    });
  }

  // Initial render
  renderLibrary();
  renderDeviceList(connect.devices);

  // Auto-connect to Navidrome if credentials exist
  if (subsonic.isConfigured) {
    loadNavidromeLibrary();
  }
});
