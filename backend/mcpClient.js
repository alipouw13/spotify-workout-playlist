const axios = require('axios');
const querystring = require('querystring');

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI;

function getSpotifyAuthUrl() {
  const params = querystring.stringify({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    scope: [
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-private',
      'user-read-email',
    ].join(' '),
  });
  return `https://accounts.spotify.com/authorize?${params}`;
}

async function exchangeCodeForToken(code) {
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = querystring.stringify({
    grant_type: 'authorization_code',
    code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    client_secret: SPOTIFY_CLIENT_SECRET,
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  const response = await axios.post(tokenUrl, data, { headers });
  return response.data;
}

// Example: Get user playlists
async function getUserPlaylists(accessToken) {
  const response = await axios.get(`https://api.spotify.com/v1/me/playlists`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

// Get current user's Spotify ID
async function getCurrentUserId(accessToken) {
  const res = await axios.get('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data.id;
}

// Create a new playlist for the user
async function createPlaylist(userId, name, accessToken) {
  const res = await axios.post(
    `https://api.spotify.com/v1/users/${userId}/playlists`,
    { name, public: false },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  return res.data.id;
}

// Add tracks to a playlist
async function addTracksToPlaylist(playlistId, trackUris, accessToken) {
  await axios.post(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks`,
    { uris: trackUris },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
}

// Refresh the access token using the refresh token
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
  const response = await axios.post(tokenUrl, data, { headers });
  return response.data;
}

// Search for tracks by genre and (optionally) BPM
async function searchTracks({ genre, bpm }, accessToken, limit = 20) {
  let query = `genre:"${genre}"`;
  if (bpm && bpm !== 'Any') {
    if (bpm === 'Fast') query += ' bpm:120-200';
    if (bpm === 'Slow') query += ' bpm:60-90';
  }
  const res = await axios.get('https://api.spotify.com/v1/search', {
    headers: { Authorization: `Bearer ${accessToken}` },
    params: {
      q: query,
      type: 'track',
      limit,
    },
  });
  return res.data.tracks.items.map(track => track.uri);
}

// Main function to generate a playlist with real track search
async function generatePlaylist(params, accessToken) {
  // 1. Get user ID
  const userId = await getCurrentUserId(accessToken);

  // 2. Create a new playlist
  const playlistName = `Workout: ${params.activity} (${params.genre})`;
  const playlistId = await createPlaylist(userId, playlistName, accessToken);

  // 3. Search for tracks
  console.log('Searching for genre:', params.genre, 'with params:', params);
  const trackUris = await searchTracks(params, accessToken, 20);
  console.log('Found tracks:', trackUris.length, trackUris);

  // 4. Add tracks to the playlist if any
  if (trackUris.length > 0) {
    await addTracksToPlaylist(playlistId, trackUris, accessToken);
  }

  // 5. Return playlist info
  return { playlistId, playlistName, tracks: trackUris };
}

// Fetch available genres from Spotify
async function getAvailableGenres(accessToken) {
  const res = await axios.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  return res.data.genres;
}

module.exports = {
  getSpotifyAuthUrl,
  exchangeCodeForToken,
  getUserPlaylists,
  generatePlaylist,
  refreshAccessToken,
  getAvailableGenres,
}; 