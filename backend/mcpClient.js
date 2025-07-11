const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

// In-memory storage for PKCE code verifiers (in production, use Redis or database)
const codeVerifiers = new Map();

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

// Get Spotify authorization URL with PKCE
function getSpotifyAuthUrl() {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = uuidv4();
  // Store code verifier with state for later retrieval
  codeVerifiers.set(state, codeVerifier);
  const params = querystring.stringify({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: [
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-library-modify',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-top-read',
      'ugc-image-upload',
    ].join(' '),
  });
  return {
    url: `https://accounts.spotify.com/authorize?${params}`,
    state: state
  };
}

// Exchange authorization code for tokens using PKCE
async function exchangeCodeForToken(code, state) {
  const codeVerifier = codeVerifiers.get(state);
  if (!codeVerifier) {
    // Instead of throwing, return a 400 error with a clear message
    const err = new Error('Invalid state parameter or code verifier not found. This usually happens if you refresh the page after login or the login session expired. Please try logging in again.');
    err.status = 400;
    throw err;
  }
  // Clean up the code verifier
  codeVerifiers.delete(state);
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = querystring.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  try {
    const response = await axios.post(tokenUrl, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange code for token');
  }
}

// Refresh access token
async function refreshAccessToken(refreshToken) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = querystring.stringify({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET,
  });
  
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  
  try {
    const response = await axios.post(tokenUrl, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Token refresh error:', error.response?.data || error.message);
    throw new Error('Failed to refresh access token');
  }
}

// Get current user's profile
async function getCurrentUser(accessToken) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me', {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    return response.data;
  } catch (error) {
    console.error('Get current user error:', error.response?.data || error.message);
    throw new Error('Failed to get current user');
  }
}

// Get user's saved albums
async function getUserSavedAlbums(accessToken, limit = 20, offset = 0) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/albums', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Get user albums error:', error.response?.data || error.message);
    throw new Error('Failed to get user albums');
  }
}

// Get user's playlists
async function getUserPlaylists(accessToken, limit = 20, offset = 0) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Get user playlists error:', error.response?.data || error.message);
    throw new Error('Failed to get user playlists');
  }
}

// Create a new playlist
async function createPlaylist(userId, name, description = '', public = false, accessToken) {
  try {
    const response = await axios.post(
      `https://api.spotify.com/v1/users/${userId}/playlists`,
      {
        name: name,
        description: description,
        public: public
      },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Create playlist error:', error.response?.data || error.message);
    throw new Error('Failed to create playlist');
  }
}

// Add tracks to a playlist
async function addTracksToPlaylist(playlistId, trackUris, accessToken) {
  try {
    const response = await axios.post(
      `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
      { uris: trackUris },
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Add tracks to playlist error:', error.response?.data || error.message);
    throw new Error('Failed to add tracks to playlist');
  }
}

// Get playlist cover image
async function getPlaylistCover(playlistId, accessToken) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}/images`
    );
    return response.data;
  } catch (error) {
    console.error('Get playlist cover error:', error.response?.data || error.message);
    throw new Error('Failed to get playlist cover');
  }
}

// Upload a new cover image for a playlist
async function uploadPlaylistCover(playlistId, imageBuffer, accessToken) {
  try {
    const response = await axios.put(
      `https://api.spotify.com/v1/playlists/${playlistId}/images`,
      imageBuffer,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg' // Assuming JPEG for simplicity, adjust if needed
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Upload playlist cover error:', error.response?.data || error.message);
    throw new Error('Failed to upload playlist cover');
  }
}

// Get available genres
async function getAvailableGenres(accessToken) {
  try {
    const response = await axios.get(
      'https://api.spotify.com/v1/recommendations/available-genre-seeds'
    );
    return response.data;
  } catch (error) {
    console.error('Get available genres error:', error.response?.data || error.message);
    throw new Error('Failed to get available genres');
  }
}

// Search for tracks
async function searchTracks(query, type = 'track', limit = 10, offset = 0, accessToken) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/search`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          q: query,
          type: type,
          limit: limit,
          offset: offset
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Search tracks error:', error.response?.data || error.message);
    throw new Error('Failed to search tracks');
  }
}

// Get track recommendations
async function getTrackRecommendations(seedArtists = [], seedGenres = [], seedTracks = [], limit = 10, accessToken) {
  try {
    const response = await axios.get(
      `https://api.spotify.com/v1/recommendations`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: {
          limit: limit,
          seed_artists: seedArtists.join(','),
          seed_genres: seedGenres.join(','),
          seed_tracks: seedTracks.join(',')
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Get track recommendations error:', error.response?.data || error.message);
    throw new Error('Failed to get track recommendations');
  }
}

// Helper: Get tracks from a playlist
async function getTracksFromPlaylist(playlistId, accessToken) {
  let tracks = [];
  let next = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  while (next) {
    const response = await axios.get(next, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    tracks = tracks.concat(response.data.items.map(item => item.track));
    next = response.data.next;
  }
  return tracks;
}

// Helper: Get tracks from a saved album
async function getTracksFromAlbum(albumId, accessToken) {
  const response = await axios.get(`https://api.spotify.com/v1/albums/${albumId}/tracks?limit=50`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return response.data.items;
}

// Helper: Get audio features (BPM) for a list of track IDs
async function getAudioFeatures(trackIds, accessToken) {
  const features = {};
  // Filter out invalid/empty IDs
  const validTrackIds = trackIds.filter(id => typeof id === 'string' && id.length > 0);
  for (let i = 0; i < validTrackIds.length; i += 100) {
    const batch = validTrackIds.slice(i, i + 100);
    if (batch.length === 0) continue;
    try {
      const response = await axios.get('https://api.spotify.com/v1/audio-features', {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { ids: batch.join(',') }
      });
      for (const feat of response.data.audio_features) {
        if (feat) features[feat.id] = feat;
      }
    } catch (error) {
      console.error('Spotify audio-features error:', error.response?.data || error.message, error.response?.headers || '');
      throw new Error('Failed to fetch audio features from Spotify');
    }
  }
  return features;
}

// Helper: Filter tracks by BPM preference
function filterTracksByBpm(tracks, audioFeatures, bpmPref) {
  let minBpm = 0, maxBpm = 1000;
  if (bpmPref === 'Fast') { minBpm = 120; maxBpm = 1000; }
  else if (bpmPref === 'Slow') { minBpm = 0; maxBpm = 110; }
  // 'Any' or undefined: no filter
  return tracks.filter(track => {
    const feat = audioFeatures[track.id];
    return feat && feat.tempo >= minBpm && feat.tempo <= maxBpm;
  });
}

// Helper: Select tracks to fit duration (±2 min)
function selectTracksForDuration(tracks, durationMin) {
  const durationMs = durationMin * 60 * 1000;
  const minMs = (durationMin - 2) * 60 * 1000;
  const maxMs = (durationMin + 2) * 60 * 1000;
  // Greedy: shuffle and add until close to target
  let best = [], bestDiff = Infinity;
  for (let attempt = 0; attempt < 10; ++attempt) {
    const shuffled = tracks.slice().sort(() => Math.random() - 0.5);
    let sum = 0, selected = [];
    for (const t of shuffled) {
      if (sum + t.duration_ms > maxMs) break;
      selected.push(t);
      sum += t.duration_ms;
      if (sum >= minMs && Math.abs(sum - durationMs) < bestDiff) {
        best = selected.slice();
        bestDiff = Math.abs(sum - durationMs);
      }
    }
  }
  return best.length > 0 ? best : tracks;
}

// New: Get a list of user's playlists (id and name only)
async function getUserPlaylistSummaries(accessToken) {
  let playlists = [];
  let offset = 0, page;
  do {
    page = await getUserPlaylists(accessToken, 50, offset);
    playlists = playlists.concat(page.items.map(p => ({ id: p.id, name: p.name })));
    offset += 50;
  } while (page.next);
  return playlists;
}

// Update generateWorkoutPlaylist to use duration and select tracks accordingly
async function generateWorkoutPlaylist(params, accessToken) {
  const { activity, sourcePlaylistId, duration } = params;
  const playlistName = `Workout: ${activity}`;
  const playlistDescription = `Generated workout playlist for ${activity} using tracks from your playlist.`;
  const user = await getCurrentUser(accessToken);
  // Get all tracks from the selected playlist
  const sourceTracks = await getTracksFromPlaylist(sourcePlaylistId, accessToken);
  // Select tracks to fit the requested duration
  const selectedTracks = selectTracksForDuration(sourceTracks, duration || 30);
  // Create the playlist
  const playlist = await createPlaylist(user.id, playlistName, playlistDescription, false, accessToken);
  // Add tracks to playlist (in one batch)
  const batch = selectedTracks.map(t => `spotify:track:${t.id}`);
  if (batch.length > 0) await addTracksToPlaylist(playlist.id, batch, accessToken);
  return {
    playlistId: playlist.id,
    playlistName: playlist.name,
    playlistUrl: playlist.external_urls?.spotify,
    tracks: selectedTracks.map(t => ({
      uri: `spotify:track:${t.id}`,
      name: t.name,
      artist: t.artists?.map(a => a.name).join(', '),
      album: t.album?.name || '',
      duration_ms: t.duration_ms
    })),
    user: {
      id: user.id,
      displayName: user.display_name
    }
  };
}

module.exports = {
  getSpotifyAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getCurrentUser,
  getUserSavedAlbums,
  getUserPlaylists,
  getUserPlaylistSummaries, // export new function
  createPlaylist,
  addTracksToPlaylist,
  getPlaylistCover,
  uploadPlaylistCover,
  getAvailableGenres,
  searchTracks,
  getTrackRecommendations,
  generateWorkoutPlaylist,
};