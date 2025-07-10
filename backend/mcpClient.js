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
    throw new Error('Invalid state parameter or code verifier not found');
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
      `https://api.spotify.com/v1/playlists/${playlistId}/images`,
      {
        headers: { Authorization: `Bearer ${accessToken}` }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Get playlist cover error:', error.response?.data || error.message);
    return null; // Return null if no cover image
  }
}

// Upload playlist cover image
async function uploadPlaylistCover(playlistId, imageData, accessToken) {
  try {
    const response = await axios.put(
      `https://api.spotify.com/v1/playlists/${playlistId}/images`,
      imageData,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'image/jpeg'
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Upload playlist cover error:', error.response?.data || error.message);
    throw new Error('Failed to upload playlist cover');
  }
}

// Get available genres from Spotify
async function getAppAccessToken() {
  const response = await axios.post('https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          SPOTIFY_CLIENT_ID + ':' + SPOTIFY_CLIENT_SECRET
        ).toString('base64')
      }
    }
  );
  return response.data.access_token;
}

async function getAvailableGenres(accessToken) {
  try {
    let token = accessToken;
    // If no accessToken, use app token (Client Credentials Flow)
    if (!token) {
      token = await getAppAccessToken();
    }
    const response = await axios.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.genres;
  } catch (error) {
    // If unauthorized and we haven't tried app token yet, try fallback
    if (accessToken && error.response && error.response.status === 401) {
      try {
        const appToken = await getAppAccessToken();
        const response = await axios.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
          headers: { Authorization: `Bearer ${appToken}` }
        });
        return response.data.genres;
      } catch (err) {
        console.error('Get available genres fallback error:', err.response?.data || err.message);
      }
    }
    console.error('Get available genres error:', error.response?.data || error.message);
    throw new Error('Failed to get available genres');
  }
}

// Search for tracks by genre and BPM
async function searchTracks({ genre, bpm }, accessToken, limit = 20) {
  try {
    let query = `genre:"${genre}"`;
    if (bpm && bpm !== 'Any') {
      if (bpm === 'Fast') query += ' bpm:120-200';
      if (bpm === 'Slow') query += ' bpm:60-90';
    }
    
    const response = await axios.get('https://api.spotify.com/v1/search', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        q: query,
        type: 'track',
        limit: limit,
        market: 'US' // Add market parameter for better results
      }
    });
    
    return response.data.tracks.items.map(track => ({
      uri: track.uri,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      duration_ms: track.duration_ms
    }));
  } catch (error) {
    console.error('Search tracks error:', error.response?.data || error.message);
    throw new Error('Failed to search tracks');
  }
}

// Get track recommendations based on seed genres
async function getTrackRecommendations(seedGenres, accessToken, limit = 20, targetEnergy = 0.8) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/recommendations', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: {
        seed_genres: seedGenres.join(','),
        limit: limit,
        target_energy: targetEnergy,
        market: 'US'
      }
    });
    
    return response.data.tracks.map(track => ({
      uri: track.uri,
      name: track.name,
      artist: track.artists[0].name,
      album: track.album.name,
      duration_ms: track.duration_ms
    }));
  } catch (error) {
    console.error('Get recommendations error:', error.response?.data || error.message);
    throw new Error('Failed to get track recommendations');
  }
}

// Main function to generate a workout playlist
async function generateWorkoutPlaylist(params, accessToken) {
  try {
    // 1. Get current user
    const user = await getCurrentUser(accessToken);
    
    // 2. Create playlist name and description
    const playlistName = `Workout: ${params.activity} (${params.genre})`;
    const playlistDescription = `Generated workout playlist for ${params.activity.toLowerCase()} with ${params.genre} music. Duration: ${params.duration} minutes.`;
    
    // 3. Create the playlist
    const playlist = await createPlaylist(
      user.id,
      playlistName,
      playlistDescription,
      false, // private playlist
      accessToken
    );
    
    // 4. Get track recommendations based on genre
    const seedGenres = [params.genre.toLowerCase()];
    let tracks;
    
    if (params.bpm === 'Any') {
      // Use recommendations API for better results
      tracks = await getTrackRecommendations(seedGenres, accessToken, 20);
    } else {
      // Use search API for BPM-specific results
      tracks = await searchTracks(params, accessToken, 20);
    }
    
    // 5. Add tracks to playlist if any found
    if (tracks.length > 0) {
      const trackUris = tracks.map(track => track.uri);
      await addTracksToPlaylist(playlist.id, trackUris, accessToken);
    }
    
    // 6. Return playlist info
    return {
      playlistId: playlist.id,
      playlistName: playlist.name,
      playlistUrl: playlist.external_urls.spotify,
      tracks: tracks,
      user: {
        id: user.id,
        displayName: user.display_name
      }
    };
  } catch (error) {
    console.error('Generate playlist error:', error);
    throw error;
  }
}

module.exports = {
  getSpotifyAuthUrl,
  exchangeCodeForToken,
  refreshAccessToken,
  getCurrentUser,
  getUserSavedAlbums,
  getUserPlaylists,
  createPlaylist,
  addTracksToPlaylist,
  getPlaylistCover,
  uploadPlaylistCover,
  getAvailableGenres,
  searchTracks,
  getTrackRecommendations,
  generateWorkoutPlaylist,
}; 