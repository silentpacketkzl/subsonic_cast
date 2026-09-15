/**
 * Spotify Connect Casting Client
 * Manages device discovery, remote playback control, and real-time state sync.
 */
class ConnectClient {
  constructor(options = {}) {
    this.clientId = 'client-' + Math.random().toString(36).substring(2, 9);
    this.clientName = options.clientName || (this.isMobile() ? 'iPhone' : 'Web Player');
    this.clientType = options.clientType || (this.isMobile() ? 'mobile-controller' : 'web-player');
    this.isReceiver = options.isReceiver || false;

    this.activeDeviceId = 'local'; // 'local' = This Device, 'pc-speaker-1' = Computer
    this.devices = [
      { id: 'local', name: this.isMobile() ? 'This iPhone' : 'This Device', type: 'local', isOnline: true, isCurrent: true }
    ];

    this.socket = null;
    this.reconnectTimer = null;
    this.listeners = new Map();
    this.state = {
      isPlaying: false,
      currentSong: null,
      position: 0,
      duration: 0,
      volume: 0.8,
      queue: []
    };

    this.initWebSocket();
  }

  isMobile() {
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) || window.innerWidth <= 768;
  }

  initWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws`;

    try {
      this.socket = new WebSocket(wsUrl);

      this.socket.onopen = () => {
        console.log('[Connect] Connected to cast relay server');
        this.emit('connectionChange', { connected: true });

        // Register client
        this.send({
          type: 'REGISTER',
          id: this.clientId,
          name: this.clientName,
          clientType: this.isReceiver ? 'pc-receiver' : this.clientType
        });
      };

      this.socket.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          this.handleMessage(msg);
        } catch (e) {
          console.error('[Connect] Failed to parse message:', e);
        }
      };

      this.socket.onclose = () => {
        console.log('[Connect] Disconnected from cast relay, retrying in 3s...');
        this.emit('connectionChange', { connected: false });
        clearTimeout(this.reconnectTimer);
        this.reconnectTimer = setTimeout(() => this.initWebSocket(), 3000);
      };

      this.socket.onerror = (err) => {
        console.warn('[Connect] WebSocket error:', err);
      };
    } catch (e) {
      console.error('[Connect] Could not initialize WebSocket:', e);
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    }
  }

  handleMessage(msg) {
    switch (msg.type) {
      case 'INIT':
        this.updateDeviceList(msg.devices);
        if (msg.state) {
          this.state = { ...this.state, ...msg.state };
          this.emit('stateChange', this.state);
        }
        break;

      case 'DEVICES_UPDATE':
        this.updateDeviceList(msg.devices);
        break;

      case 'DEVICE_CHANGED':
        this.activeDeviceId = msg.activeDeviceId;
        this.updateCurrentDeviceSelection();
        this.emit('deviceChanged', { activeDeviceId: this.activeDeviceId });
        break;

      case 'STATE_UPDATE':
        if (msg.state) {
          this.state = { ...this.state, ...msg.state };
          this.emit('stateChange', this.state);
        }
        break;

      case 'COMMAND':
        // If this client is a receiver or target of command
        if (this.isReceiver || (msg.targetDeviceId === 'local' && this.activeDeviceId === 'local')) {
          this.emit('remoteCommand', { command: msg.command, payload: msg.payload });
        }
        break;

      case 'TRANSFER_PLAYBACK':
        this.activeDeviceId = msg.targetDeviceId;
        this.updateCurrentDeviceSelection();
        if (msg.state) {
          this.state = { ...this.state, ...msg.state };
          this.emit('stateChange', this.state);
        }
        this.emit('playbackTransferred', { targetDeviceId: msg.targetDeviceId, state: this.state });
        break;
    }
  }

  updateDeviceList(serverDevices = []) {
    const localDevice = {
      id: 'local',
      name: this.isMobile() ? 'This iPhone' : 'This Computer (Local)',
      type: 'local',
      isOnline: true,
      isCurrent: this.activeDeviceId === 'local'
    };

    const externalDevices = serverDevices.map(d => ({
      ...d,
      isCurrent: this.activeDeviceId === d.id
    }));

    this.devices = [localDevice, ...externalDevices];
    this.emit('devicesUpdated', this.devices);
  }

  updateCurrentDeviceSelection() {
    this.devices = this.devices.map(d => ({
      ...d,
      isCurrent: d.id === this.activeDeviceId
    }));
    this.emit('devicesUpdated', this.devices);
  }

  // Switch playback destination (e.g. from iPhone to Computer)
  selectDevice(deviceId, currentPlaybackInfo = null) {
    const previousDevice = this.activeDeviceId;
    this.activeDeviceId = deviceId;
    this.updateCurrentDeviceSelection();

    if (currentPlaybackInfo) {
      // Transfer active track & timestamp seamlessly
      this.send({
        type: 'TRANSFER_PLAYBACK',
        targetDeviceId: deviceId,
        song: currentPlaybackInfo.song,
        position: currentPlaybackInfo.position,
        isPlaying: currentPlaybackInfo.isPlaying,
        queue: currentPlaybackInfo.queue
      });
    } else {
      this.send({
        type: 'SELECT_DEVICE',
        deviceId: deviceId
      });
    }

    this.emit('deviceChanged', {
      previousDeviceId: previousDevice,
      activeDeviceId: deviceId,
      isRemote: this.isCasting()
    });
  }

  isCasting() {
    return this.activeDeviceId !== 'local';
  }

  getActiveDeviceName() {
    const dev = this.devices.find(d => d.id === this.activeDeviceId);
    return dev ? dev.name : 'Unknown Device';
  }

  // Send control commands to currently active cast receiver
  play(song = null, position = 0) {
    if (!this.isCasting()) return false;
    this.send({
      type: 'COMMAND',
      command: 'PLAY',
      targetDeviceId: this.activeDeviceId,
      payload: { song, position }
    });
    return true;
  }

  pause() {
    if (!this.isCasting()) return false;
    this.send({
      type: 'COMMAND',
      command: 'PAUSE',
      targetDeviceId: this.activeDeviceId,
      payload: {}
    });
    return true;
  }

  seek(position) {
    if (!this.isCasting()) return false;
    this.send({
      type: 'COMMAND',
      command: 'SEEK',
      targetDeviceId: this.activeDeviceId,
      payload: { position }
    });
    return true;
  }

  setVolume(volume) {
    if (!this.isCasting()) return false;
    this.send({
      type: 'COMMAND',
      command: 'SET_VOLUME',
      targetDeviceId: this.activeDeviceId,
      payload: { volume }
    });
    return true;
  }

  next() {
    if (!this.isCasting()) return false;
    this.send({
      type: 'COMMAND',
      command: 'NEXT',
      targetDeviceId: this.activeDeviceId,
      payload: {}
    });
    return true;
  }

  prev() {
    if (!this.isCasting()) return false;
    this.send({
      type: 'COMMAND',
      command: 'PREV',
      targetDeviceId: this.activeDeviceId,
      payload: {}
    });
    return true;
  }

  // Receiver method: broadcast state sync to controllers
  syncReceiverState(state) {
    this.send({
      type: 'STATE_SYNC',
      state: state
    });
  }

  // Event listener system
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
  window.ConnectClient = ConnectClient;
}
