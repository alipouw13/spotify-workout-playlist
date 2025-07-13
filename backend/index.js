const express = require('express');
const cors = require('cors');
require('dotenv').config();
const mcpClient = require('./mcpClient');
// const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:8000',
    'http://localhost:8000',
    'http://localhost:3000',
  ],
  credentials: true
}));
app.use(express.json());
// app.use(cookieParser());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Start Spotify auth with PKCE
app.get('/api/auth/start', (req, res) => {
  try {
    const authData = mcpClient.getSpotifyAuthUrl();
    res.json(authData);
  } catch (error) {
    console.error('Auth start error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Exchange code for token with PKCE
app.post('/api/auth/token', async (req, res) => {
  try {
    const { code, state } = req.body;
    if (!code || !state) {
      return res.status(400).json({ error: 'Missing code or state' });
    }
    const tokenData = await mcpClient.exchangeCodeForToken(code, state);
    res.json(tokenData);
  } catch (error) {
    console.error('Token exchange error:', error);
    res.status(error.status || 500).json({ error: error.message });
  }
});

// Refresh access token
app.post('/api/auth/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: 'Missing refresh token' });
    }
    
    const data = await mcpClient.refreshAccessToken(refresh_token);
    res.json(data);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user profile
app.get('/api/user', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const user = await withTokenRefresh(
      (token) => mcpClient.getCurrentUser(token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user's saved albums
app.get('/api/user/albums', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    
    const albums = await withTokenRefresh(
      (token) => mcpClient.getUserSavedAlbums(token, limit, offset),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json(albums);
  } catch (error) {
    console.error('Get user albums error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update: Get user's playlists (id, name, image)
app.get('/api/user/playlists', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    const playlists = await mcpClient.getUserPlaylistsWithImages(accessToken);
    res.json({ items: playlists });
  } catch (error) {
    console.error('Get user playlists error:', error);
    res.status(500).json({ error: error.message });
  }
});

// New: Get tracks for a playlist
app.get('/api/playlists/:playlistId/tracks', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    const { playlistId } = req.params;
    const tracks = await mcpClient.getTracksForPlaylist(playlistId, accessToken);
    res.json({ tracks });
  } catch (error) {
    console.error('Get playlist tracks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get available genres from Spotify
app.get('/api/genres', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const genres = await withTokenRefresh(
      (token) => mcpClient.getAvailableGenres(token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json({ genres });
  } catch (error) {
    console.error('Get genres error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate playlist with selected songs and auto-complete
app.post('/api/generate-playlist', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    const params = req.body;
    // New flow: selectedSongUris and autoCompleteSource
    if (params.selectedSongUris && params.autoCompleteSourceId && params.autoCompleteSourceType) {
      const playlistData = await withTokenRefresh(
        (token) => mcpClient.generateCustomPlaylist(params, token),
        accessToken,
        req.headers['x-refresh-token'],
        res
      );
      return res.json(playlistData);
    }
    // Old flow: sourcePlaylistId only
    if (!params.activity || !params.sourcePlaylistId) {
      return res.status(400).json({ error: 'Missing required parameter: activity or sourcePlaylistId' });
    }
    const playlistData = await withTokenRefresh(
      (token) => mcpClient.generateWorkoutPlaylist(params, token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json(playlistData);
  } catch (error) {
    console.error('Generate playlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a custom playlist
app.post('/api/playlists', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const { name, description, public: isPublic, trackUris } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Playlist name is required' });
    }
    
    // Get current user first
    const user = await withTokenRefresh(
      (token) => mcpClient.getCurrentUser(token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    
    // Create playlist
    const playlist = await withTokenRefresh(
      (token) => mcpClient.createPlaylist(user.id, name, description || '', isPublic || false, token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    
    // Add tracks if provided
    if (trackUris && trackUris.length > 0) {
      await withTokenRefresh(
        (token) => mcpClient.addTracksToPlaylist(playlist.id, trackUris, token),
        accessToken,
        req.headers['x-refresh-token'],
        res
      );
    }
    
    res.json(playlist);
  } catch (error) {
    console.error('Create playlist error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add tracks to existing playlist
app.post('/api/playlists/:playlistId/tracks', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const { playlistId } = req.params;
    const { trackUris } = req.body;
    
    if (!trackUris || !Array.isArray(trackUris)) {
      return res.status(400).json({ error: 'trackUris array is required' });
    }
    
    const result = await withTokenRefresh(
      (token) => mcpClient.addTracksToPlaylist(playlistId, trackUris, token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json(result);
  } catch (error) {
    console.error('Add tracks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get playlist cover image
app.get('/api/playlists/:playlistId/cover', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const { playlistId } = req.params;
    
    const cover = await withTokenRefresh(
      (token) => mcpClient.getPlaylistCover(playlistId, token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json({ cover });
  } catch (error) {
    console.error('Get playlist cover error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search for tracks
app.get('/api/search/tracks', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const { genre, bpm, limit } = req.query;
    if (!genre) {
      return res.status(400).json({ error: 'Genre parameter is required' });
    }
    
    const tracks = await withTokenRefresh(
      (token) => mcpClient.searchTracks({ genre, bpm }, token, parseInt(limit) || 20),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json({ tracks });
  } catch (error) {
    console.error('Search tracks error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Search user's saved tracks and playlists
app.get('/api/search/songs', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    const { q = '', limit = 20, offset = 0 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Missing search query' });
    }
    // Use mcpClient to search user's library and playlists
    const tracks = await withTokenRefresh(
      (token) => mcpClient.searchUserSongs(q, parseInt(limit), parseInt(offset), token),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json({ tracks });
  } catch (error) {
    console.error('Search user songs error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get track recommendations
app.get('/api/recommendations', async (req, res) => {
  try {
    const accessToken = req.headers['authorization']?.split(' ')[1];
    if (!accessToken) {
      return res.status(401).json({ error: 'No access token provided' });
    }
    
    const { seedGenres, limit, targetEnergy } = req.query;
    if (!seedGenres) {
      return res.status(400).json({ error: 'seedGenres parameter is required' });
    }
    
    const genres = seedGenres.split(',');
    const tracks = await withTokenRefresh(
      (token) => mcpClient.getTrackRecommendations(
        genres, 
        token, 
        parseInt(limit) || 20, 
        parseFloat(targetEnergy) || 0.8
      ),
      accessToken,
      req.headers['x-refresh-token'],
      res
    );
    res.json({ tracks });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Helper function to handle token refresh and retry
async function withTokenRefresh(apiCall, accessToken, refreshToken, res) {
  try {
    return await apiCall(accessToken);
  } catch (error) {
    if (error.response && error.response.status === 401 && refreshToken) {
      try {
        console.log('Token expired, attempting refresh...');
        const newTokenData = await mcpClient.refreshAccessToken(refreshToken);
        if (newTokenData.access_token) {
          console.log('Token refreshed successfully');
          const result = await apiCall(newTokenData.access_token);
          
          // Set new access token in response headers
          res.set('x-new-access-token', newTokenData.access_token);
          
          // If refresh token was also returned, update it
          if (newTokenData.refresh_token) {
            res.set('x-new-refresh-token', newTokenData.refresh_token);
          }
          
          return result;
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        throw new Error('Authentication failed - please log in again');
      }
    }
    throw error;
  }
}

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
}); 