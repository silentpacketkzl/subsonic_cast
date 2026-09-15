/**
 * Subsonic & OpenSubsonic API Client
 * Compatible with Navidrome, Gonic, Airsonic, and standard Subsonic servers.
 */
class SubsonicClient {
  constructor(config = {}) {
    this.serverUrl = (config.serverUrl || '').replace(/\/+$/, '');
    this.username = config.username || '';
    this.password = config.password || '';
    this.clientName = config.clientName || 'ArpeggiConnect';
    this.apiVersion = config.apiVersion || '1.16.1';
    this.isConfigured = Boolean(this.serverUrl && this.username);
  }

  updateConfig(config) {
    this.serverUrl = (config.serverUrl || '').replace(/\/+$/, '');
    this.username = config.username || '';
    if (config.password !== undefined) {
      this.password = config.password;
    }
    this.isConfigured = Boolean(this.serverUrl && this.username);
  }

  // Generate MD5 hash for token authentication
  static md5(string) {
    function rotateLeft(lValue, iShiftBits) {
      return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
    }
    function addUnsigned(lX, lY) {
      const lX4 = lX & 0x40000000;
      const lY4 = lY & 0x40000000;
      const lX8 = lX & 0x80000000;
      const lY8 = lY & 0x80000000;
      const lResult = (lX & 0x3fffffff) + (lY & 0x3fffffff);
      if (lX4 & lY4) return lResult ^ 0x80000000 ^ lX8 ^ lY8;
      if (lX4 | lY4) {
        if (lResult & 0x40000000) return lResult ^ 0xc0000000 ^ lX8 ^ lY8;
        return lResult ^ 0x40000000 ^ lX8 ^ lY8;
      }
      return lResult ^ lX8 ^ lY8;
    }
    function F(x, y, z) { return (x & y) | (~x & z); }
    function G(x, y, z) { return (x & z) | (y & ~z); }
    function H(x, y, z) { return x ^ y ^ z; }
    function I(x, y, z) { return y ^ (x | ~z); }

    function FF(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function GG(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function HH(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }
    function II(a, b, c, d, x, s, ac) {
      a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
      return addUnsigned(rotateLeft(a, s), b);
    }

    function convertToWordArray(string) {
      let lWordCount;
      const lMessageLength = string.length;
      const lNumberOfWordsTemp1 = lMessageLength + 8;
      const lNumberOfWordsTemp2 = (lNumberOfWordsTemp1 - (lNumberOfWordsTemp1 % 64)) / 64;
      const lNumberOfWords = (lNumberOfWordsTemp2 + 1) * 16;
      const lWordArray = new Array(lNumberOfWords - 1);
      let lBytePosition = 0;
      let lByteCount = 0;
      while (lByteCount < lMessageLength) {
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
        lByteCount++;
      }
      lWordCount = (lByteCount - (lByteCount % 4)) / 4;
      lBytePosition = (lByteCount % 4) * 8;
      lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
      lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
      lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
      return lWordArray;
    }

    function wordToHex(lValue) {
      let wordToHexValue = '', wordToHexValueTemp = '', lByte, lCount;
      for (lCount = 0; lCount <= 3; lCount++) {
        lByte = (lValue >>> (lCount * 8)) & 255;
        wordToHexValueTemp = '0' + lByte.toString(16);
        wordToHexValue = wordToHexValue + wordToHexValueTemp.substr(wordToHexValueTemp.length - 2, 2);
      }
      return wordToHexValue;
    }

    const x = convertToWordArray(string);
    let a = 0x67452301, b = 0xefcdab89, c = 0x98badcfe, d = 0x10325476;
    const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
    const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
    const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
    const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

    for (let k = 0; k < x.length; k += 16) {
      const AA = a, BB = b, CC = c, DD = d;
      a = FF(a, b, c, d, x[k + 0], S11, 0xd76aa478);
      d = FF(d, a, b, c, x[k + 1], S12, 0xe8c7b756);
      c = FF(c, d, a, b, x[k + 2], S13, 0x242070db);
      b = FF(b, c, d, a, x[k + 3], S14, 0xc1bdceee);
      a = FF(a, b, c, d, x[k + 4], S11, 0xf57c0faf);
      d = FF(d, a, b, c, x[k + 5], S12, 0x4787c62a);
      c = FF(c, d, a, b, x[k + 6], S13, 0xa8304613);
      b = FF(b, c, d, a, x[k + 7], S14, 0xfd469501);
      a = FF(a, b, c, d, x[k + 8], S11, 0x698098d8);
      d = FF(d, a, b, c, x[k + 9], S12, 0x8b44f7af);
      c = FF(c, d, a, b, x[k + 10], S13, 0xffff5bb1);
      b = FF(b, c, d, a, x[k + 11], S14, 0x895cd7be);
      a = FF(a, b, c, d, x[k + 12], S11, 0x6b901122);
      d = FF(d, a, b, c, x[k + 13], S12, 0xfd987193);
      c = FF(c, d, a, b, x[k + 14], S13, 0xa679438e);
      b = FF(b, c, d, a, x[k + 15], S14, 0x49b40821);

      a = GG(a, b, c, d, x[k + 1], S21, 0xf61e2562);
      d = GG(d, a, b, c, x[k + 6], S22, 0xc040b340);
      c = GG(c, d, a, b, x[k + 11], S23, 0x265e5a51);
      b = GG(b, c, d, a, x[k + 0], S24, 0xe9b6c7aa);
      a = GG(a, b, c, d, x[k + 5], S21, 0xd62f105d);
      d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
      c = GG(c, d, a, b, x[k + 15], S23, 0xd8a1e681);
      b = GG(b, c, d, a, x[k + 4], S24, 0xe7d3fbc8);
      a = GG(a, b, c, d, x[k + 9], S21, 0x21e1cde6);
      d = GG(d, a, b, c, x[k + 14], S22, 0xc33707d6);
      c = GG(c, d, a, b, x[k + 3], S23, 0xf4d50d87);
      b = GG(b, c, d, a, x[k + 8], S24, 0x455a14ed);
      a = GG(a, b, c, d, x[k + 13], S21, 0xa9e3e905);
      d = GG(d, a, b, c, x[k + 2], S22, 0xfcefa3f8);
      c = GG(c, d, a, b, x[k + 7], S23, 0x676f02d9);
      b = GG(b, c, d, a, x[k + 12], S24, 0x8d2a4c8a);

      a = HH(a, b, c, d, x[k + 5], S31, 0xfffa3942);
      d = HH(d, a, b, c, x[k + 8], S32, 0x8771f681);
      c = HH(c, d, a, b, x[k + 11], S33, 0x6d9d6122);
      b = HH(b, c, d, a, x[k + 14], S34, 0xfde5380c);
      a = HH(a, b, c, d, x[k + 1], S31, 0xa4beea44);
      d = HH(d, a, b, c, x[k + 4], S32, 0x4bdecfa9);
      c = HH(c, d, a, b, x[k + 7], S33, 0xf6bb4b60);
      b = HH(b, c, d, a, x[k + 10], S34, 0xbebfbc70);
      a = HH(a, b, c, d, x[k + 13], S31, 0x289b7ec6);
      d = HH(d, a, b, c, x[k + 0], S32, 0xeaa127fa);
      c = HH(c, d, a, b, x[k + 3], S33, 0xd4ef3085);
      b = HH(b, c, d, a, x[k + 6], S34, 0x4881d05);
      a = HH(a, b, c, d, x[k + 9], S31, 0xd9d4d039);
      d = HH(d, a, b, c, x[k + 12], S32, 0xe6db99e5);
      c = HH(c, d, a, b, x[k + 15], S33, 0x1fa27cf8);
      b = HH(b, c, d, a, x[k + 2], S34, 0xc4ac5665);

      a = II(a, b, c, d, x[k + 0], S41, 0xf4292244);
      d = II(d, a, b, c, x[k + 7], S42, 0x432aff97);
      c = II(c, d, a, b, x[k + 14], S43, 0xab9423a7);
      b = II(b, c, d, a, x[k + 5], S44, 0xfc93a039);
      a = II(a, b, c, d, x[k + 12], S41, 0x655b59c3);
      d = II(d, a, b, c, x[k + 3], S42, 0x8f0ccc92);
      c = II(c, d, a, b, x[k + 10], S43, 0xffeff47d);
      b = II(b, c, d, a, x[k + 1], S44, 0x85845dd1);
      a = II(a, b, c, d, x[k + 8], S41, 0x6fa87e4f);
      d = II(d, a, b, c, x[k + 15], S42, 0xfe2ce6e0);
      c = II(c, d, a, b, x[k + 6], S43, 0xa3014314);
      b = II(b, c, d, a, x[k + 13], S44, 0x4e0811a1);
      a = II(a, b, c, d, x[k + 4], S41, 0xf7537e82);
      d = II(d, a, b, c, x[k + 11], S42, 0xbd3af235);
      c = II(c, d, a, b, x[k + 2], S43, 0x2ad7d2bb);
      b = II(b, c, d, a, x[k + 9], S44, 0xeb86d391);

      a = addUnsigned(a, AA);
      b = addUnsigned(b, BB);
      c = addUnsigned(c, CC);
      d = addUnsigned(d, DD);
    }
    return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
  }

  // Generate random salt for Subsonic token auth
  generateSalt(length = 8) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let salt = '';
    for (let i = 0; i < length; i++) {
      salt += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return salt;
  }

  // Build query parameters with salt + token auth
  getAuthParams() {
    const salt = this.generateSalt();
    const token = SubsonicClient.md5(this.password + salt);
    return new URLSearchParams({
      u: this.username,
      t: token,
      s: salt,
      v: this.apiVersion,
      c: this.clientName,
      f: 'json'
    });
  }

  // Execute request against Subsonic endpoint
  async request(endpoint, additionalParams = {}) {
    if (!this.serverUrl) {
      throw new Error('Server URL is not configured.');
    }

    const params = this.getAuthParams();
    for (const [key, value] of Object.entries(additionalParams)) {
      if (value !== undefined && value !== null) {
        params.append(key, value);
      }
    }

    const url = `${this.serverUrl}/rest/${endpoint}.view?${params.toString()}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const subResponse = data['subsonic-response'];

      if (!subResponse) {
        throw new Error('Invalid Subsonic API response format');
      }

      if (subResponse.status !== 'ok') {
        const err = subResponse.error || {};
        throw new Error(`Subsonic Error ${err.code || 'unknown'}: ${err.message || 'Operation failed'}`);
      }

      return subResponse;
    } catch (err) {
      console.error(`Subsonic request [${endpoint}] failed:`, err);
      throw err;
    }
  }

  // Ping server to test credentials
  async ping() {
    return this.request('ping');
  }

  // Get all artists
  async getArtists() {
    const res = await this.request('getArtists');
    const artists = [];
    const indexList = res.artists?.index || [];
    for (const group of indexList) {
      if (group.artist) {
        if (Array.isArray(group.artist)) {
          artists.push(...group.artist);
        } else {
          artists.push(group.artist);
        }
      }
    }
    return artists;
  }

  // Get artist details + albums
  async getArtist(artistId) {
    const res = await this.request('getArtist', { id: artistId });
    return res.artist;
  }

  // Get album details + track list
  async getAlbum(albumId) {
    const res = await this.request('getAlbum', { id: albumId });
    return res.album;
  }

  // Get albums by list type (newest, frequent, recent, random, alphabetical)
  async getAlbumList2(type = 'recent', size = 50, offset = 0) {
    const res = await this.request('getAlbumList2', { type, size, offset });
    return res.albumList2?.album || [];
  }

  // Search tracks, albums, artists
  async search(query, artistCount = 10, albumCount = 10, songCount = 20) {
    const res = await this.request('search3', {
      query,
      artistCount,
      albumCount,
      songCount
    });
    return res.searchResult3 || { artist: [], album: [], song: [] };
  }

  // Get user playlists
  async getPlaylists() {
    const res = await this.request('getPlaylists');
    return res.playlists?.playlist || [];
  }

  // Get playlist tracks
  async getPlaylist(playlistId) {
    const res = await this.request('getPlaylist', { id: playlistId });
    return res.playlist;
  }

  // Get full stream URL for audio track
  getStreamUrl(songId, maxBitRate = null) {
    if (!this.serverUrl) return '';
    const params = this.getAuthParams();
    params.append('id', songId);
    if (maxBitRate) params.append('maxBitRate', maxBitRate);
    return `${this.serverUrl}/rest/stream.view?${params.toString()}`;
  }

  // Get album art / cover art URL
  getCoverArtUrl(coverArtId, size = 600) {
    if (!coverArtId || !this.serverUrl) return '';
    const params = this.getAuthParams();
    params.append('id', coverArtId);
    if (size) params.append('size', size);
    return `${this.serverUrl}/rest/getCoverArt.view?${params.toString()}`;
  }

  // Scrobble song playback to Navidrome / Last.fm
  async scrobble(songId, submission = true) {
    return this.request('scrobble', { id: songId, submission });
  }

  // Star / unstar song
  async setStarred(songId, isStarred = true) {
    const endpoint = isStarred ? 'star' : 'unstar';
    return this.request(endpoint, { id: songId });
  }
}

// Built-in Demo Library for immediate out-of-the-box preview and testing
const DEMO_LIBRARY = {
  artists: [
    { id: 'art-1', name: 'Celestial Echoes', albumCount: 2 },
    { id: 'art-2', name: 'Aurora Synth', albumCount: 1 },
    { id: 'art-3', name: 'Velvet Horizon', albumCount: 1 }
  ],
  albums: [
    {
      id: 'alb-1',
      title: 'Neon Constellations',
      artist: 'Celestial Echoes',
      artistId: 'art-1',
      year: 2024,
      genre: 'Synthwave / Ambient',
      songCount: 3,
      coverArt: 'cover-1'
    },
    {
      id: 'alb-2',
      title: 'Solar Winds',
      artist: 'Aurora Synth',
      artistId: 'art-2',
      year: 2023,
      genre: 'Lo-Fi / Chill',
      songCount: 2,
      coverArt: 'cover-2'
    },
    {
      id: 'alb-3',
      title: 'Midnight Reverie',
      artist: 'Velvet Horizon',
      artistId: 'art-3',
      year: 2024,
      genre: 'Dream Pop / Electronic',
      songCount: 2,
      coverArt: 'cover-3'
    }
  ],
  songs: [
    {
      id: 'song-1',
      title: 'Starlight Drift',
      artist: 'Celestial Echoes',
      album: 'Neon Constellations',
      albumId: 'alb-1',
      duration: 198,
      track: 1,
      year: 2024,
      // High quality royalty-free synth ambient audio streams
      streamUrl: 'https://cdn.freesound.org/previews/682/682052_11861866-lq.mp3',
      coverArt: 'cover-1',
      accentColor: '#3a86ff'
    },
    {
      id: 'song-2',
      title: 'Cybernetic Dreams',
      artist: 'Celestial Echoes',
      album: 'Neon Constellations',
      albumId: 'alb-1',
      duration: 165,
      track: 2,
      year: 2024,
      streamUrl: 'https://cdn.freesound.org/previews/650/650843_12151124-lq.mp3',
      coverArt: 'cover-1',
      accentColor: '#8338ec'
    },
    {
      id: 'song-3',
      title: 'Orbit Resonance',
      artist: 'Celestial Echoes',
      album: 'Neon Constellations',
      albumId: 'alb-1',
      duration: 210,
      track: 3,
      year: 2024,
      streamUrl: 'https://cdn.freesound.org/previews/625/625348_11861866-lq.mp3',
      coverArt: 'cover-1',
      accentColor: '#ff006e'
    },
    {
      id: 'song-4',
      title: 'Golden Hour Dust',
      artist: 'Aurora Synth',
      album: 'Solar Winds',
      albumId: 'alb-2',
      duration: 184,
      track: 1,
      year: 2023,
      streamUrl: 'https://cdn.freesound.org/previews/587/587896_11861866-lq.mp3',
      coverArt: 'cover-2',
      accentColor: '#fb5607'
    },
    {
      id: 'song-5',
      title: 'Twilight Glow',
      artist: 'Velvet Horizon',
      album: 'Midnight Reverie',
      albumId: 'alb-3',
      duration: 205,
      track: 1,
      year: 2024,
      streamUrl: 'https://cdn.freesound.org/previews/563/563604_11861866-lq.mp3',
      coverArt: 'cover-3',
      accentColor: '#06d6a0'
    }
  ]
};

if (typeof window !== 'undefined') {
  window.SubsonicClient = SubsonicClient;
  window.DEMO_LIBRARY = DEMO_LIBRARY;
}
