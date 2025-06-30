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

// Example: Generate playlist
async function generatePlaylist(params, accessToken) {
  const response = await axios.post(`https://api.spotify.com/v1/users/${params.user_id}/playlists/${params.playlist_id}/tracks`, params, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return response.data;
}

module.exports = {
  getSpotifyAuthUrl,
  exchangeCodeForToken,
  getUserPlaylists,
  generatePlaylist,
}; 