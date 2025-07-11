import { useState, useEffect, useRef } from 'react'
import './App.css'
import spotifyLogo from './assets/spotify-logo.png'; // Use the PNG logo from src/assets

const API_BASE_URL = 'http://localhost:4000/api';

const activities = ['Running', 'Cycling', 'Gym', 'Yoga']

// Type definitions
interface SpotifyUser {
  id: string;
  display_name?: string;
  email?: string;
  images?: Array<{ url: string; height?: number; width?: number }>;
}

interface Track {
  uri: string;
  name: string;
  artist: string;
  album: string;
  duration_ms: number;
}

interface GeneratedPlaylist {
  playlistId: string;
  playlistName: string;
  playlistUrl?: string;
  tracks: Track[];
  user: {
    id: string;
    displayName?: string;
  };
}

// Add a function to refresh the access token
async function refreshToken(setAccessToken: (token: string) => void) {
  const refresh_token = localStorage.getItem('spotify_refresh_token');
  if (!refresh_token) return null;
  
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token }),
    });
    
    if (!res.ok) {
      throw new Error('Failed to refresh token');
    }
    
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      if (data.refresh_token) {
        localStorage.setItem('spotify_refresh_token', data.refresh_token);
      }
      setAccessToken(data.access_token);
      return data.access_token;
    }
    return null;
  } catch (error) {
    console.error('Token refresh failed:', error);
    return null;
  }
}

function App() {
  const [activity, setActivity] = useState('Running')
  const [step, setStep] = useState(1)
  const [generatedPlaylist, setGeneratedPlaylist] = useState<GeneratedPlaylist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<SpotifyUser | null>(null);
  const [playlists, setPlaylists] = useState<{ id: string; name: string }[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('');
  const [duration, setDuration] = useState(30); // default 30 minutes
  const [playlistName, setPlaylistName] = useState('');

  // Generate duration options (5 to 720 minutes)
  const durationOptions = Array.from({ length: (720 - 5) / 5 + 1 }, (_, i) => 5 + i * 5);

  const tokenExchangeAttempted = useRef(false);

  // On mount, check for access token in localStorage or URL
  useEffect(() => {
    if (tokenExchangeAttempted.current) return;
    tokenExchangeAttempted.current = true;

    const storedToken = localStorage.getItem('spotify_access_token');
    if (storedToken) {
      setAccessToken(storedToken);
      setIsAuthenticated(true);
      return;
    }
    
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');
    
    if (code && state) {
      fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, state }),
      })
        .then(res => {
          // Remove code/state from URL immediately
          window.history.replaceState({}, document.title, window.location.pathname);
          return res.json();
        })
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            setAccessToken(data.access_token);
            setIsAuthenticated(true);
          } else {
            // Try to fetch user with any existing token
            const fallbackToken = localStorage.getItem('spotify_access_token');
            if (fallbackToken) {
              fetch(`${API_BASE_URL}/user`, {
                headers: { Authorization: `Bearer ${fallbackToken}` },
              })
                .then(res => {
                  if (res.ok) {
                    setAccessToken(fallbackToken);
                    setIsAuthenticated(true);
                    setError(null);
                  } else {
                    setError('Failed to authenticate with Spotify');
                  }
                })
                .catch(() => setError('Failed to authenticate with Spotify'));
            } else {
              setError('Failed to authenticate with Spotify');
            }
          }
        })
        .catch(() => {
          // Remove code/state from URL immediately
          window.history.replaceState({}, document.title, window.location.pathname);
          // Try to fetch user with any existing token
          const fallbackToken = localStorage.getItem('spotify_access_token');
          if (fallbackToken) {
            fetch(`${API_BASE_URL}/user`, {
              headers: { Authorization: `Bearer ${fallbackToken}` },
            })
              .then(res => {
                if (res.ok) {
                  setAccessToken(fallbackToken);
                  setIsAuthenticated(true);
                  setError(null);
                } else {
                  setError('Failed to authenticate with Spotify');
                }
              })
              .catch(() => setError('Failed to authenticate with Spotify'));
          } else {
            setError('Failed to authenticate with Spotify');
          }
        });
    }
  }, []);

  // Add effect to redirect to root after failed token exchange if not authenticated
  useEffect(() => {
    if (!isAuthenticated && error) {
      const timeout = setTimeout(() => {
        window.location.href = '/';
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [isAuthenticated, error]);

  // Fetch user profile when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetch(`${API_BASE_URL}/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'x-refresh-token': localStorage.getItem('spotify_refresh_token') || '',
        },
      })
        .then(res => {
          const newToken = res.headers.get('x-new-access-token');
          if (newToken) {
            localStorage.setItem('spotify_access_token', newToken);
            setAccessToken(newToken);
          }
          if (!res.ok) throw new Error('Failed to fetch user profile');
          return res.json();
        })
        .then(data => {
          setUser(data);
        })
        .catch(() => {
          // If user fetch fails, try to refresh token
          refreshToken(setAccessToken);
        });
    }
  }, [isAuthenticated, accessToken]);

  // Fetch playlists when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetch(`${API_BASE_URL}/user/playlists`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })
        .then(res => res.json())
        .then(data => {
          setPlaylists(data);
          if (data.length > 0) setSelectedPlaylistId(data[0].id);
        })
        .catch(() => setPlaylists([]));
    }
  }, [isAuthenticated, accessToken]);

  // Filter genres for typeahead
  // const filteredGenres = genresList.filter(g =>
  //   g.toLowerCase().includes(genreInput.toLowerCase())
  // );

  // Login handler
  const handleLogin = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/start`)
      if (!res.ok) throw new Error('Failed to start auth flow');
      
      const data = await res.json()
      if (data.url) {
        // Store state for verification
        localStorage.setItem('spotify_auth_state', data.state);
        window.location.href = data.url
      }
    } catch {
      setError('Failed to start authentication');
    }
  }

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    localStorage.removeItem('spotify_auth_state');
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
    setGeneratedPlaylist(null);
    setStep(1);
    window.location.reload();
  };

  async function handleGeneratePlaylist(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setGeneratedPlaylist(null);

    if (!selectedPlaylistId) {
      setError('Please select a playlist to use as a source.');
      setLoading(false);
      return;
    }

    try {
      const params = {
        activity,
        sourcePlaylistId: selectedPlaylistId,
        duration,
        playlistName: playlistName.trim() || `Workout: ${activity}`,
      };
      
      let token = accessToken;
      const refreshTokenValue = localStorage.getItem('spotify_refresh_token');
      
      let res = await fetch(`${API_BASE_URL}/generate-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-refresh-token': refreshTokenValue || '',
        },
        body: JSON.stringify(params),
      });
      
      // If backend returns a new access token, update it
      const newToken = res.headers.get('x-new-access-token');
      if (newToken) {
        localStorage.setItem('spotify_access_token', newToken);
        setAccessToken(newToken);
      }
      
      if (res.status === 401 && refreshTokenValue) {
        // Try to refresh token and retry
        token = await refreshToken(setAccessToken);
        if (token) {
          res = await fetch(`${API_BASE_URL}/generate-playlist`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
              'x-refresh-token': refreshTokenValue || '',
            },
            body: JSON.stringify(params),
          });
        }
      }
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate playlist');
      }
      
      const data = await res.json();
      setGeneratedPlaylist(data);
      setStep(2);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Unknown error occurred');
      }
    } finally {
      setLoading(false);
    }
  }

  // Login page
  if (!isAuthenticated) {
    return (
      <div className="centered-container">
        <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', zIndex: 10 }}>
          <img src={spotifyLogo} alt="Spotify" style={{ width: 48, height: 48, marginRight: 12 }} />
        </div>
        <div className="spotify-card">
          <div className="spotify-title">Running Assistant</div>
          <div className="spotify-subtitle">Allow Spotify to connect to your account</div>
          {user && (
            <div className="spotify-user">
              {user.images && user.images[0] && (
                <img src={user.images[0].url} alt="avatar" className="spotify-avatar" />
              )}
              <span>{user.display_name || user.id}</span>
            </div>
          )}
          <div className="spotify-permissions">
            <h4>View your Spotify account data</h4>
            <ul>
              <li>Your email</li>
              <li>Your Spotify subscription, account country, and explicit content filter settings.</li>
              <li>Your name, username, profile picture, Spotify followers, and public playlists.</li>
            </ul>
            <h4>View your activity on Spotify</h4>
            <ul>
              <li>What you've saved in Your Library</li>
              <li>Playlists you've created and playlists you follow</li>
            </ul>
            <h4>Take actions in Spotify on your behalf</h4>
            <ul>
              <li>Create, edit, and follow private playlists</li>
              <li>Create, edit, and follow playlists</li>
            </ul>
          </div>
          <button 
            onClick={handleLogin}
            className="spotify-btn"
          >
            Connect with Spotify
          </button>
          <div className="spotify-cancel" onClick={() => window.location.reload()}>Cancel</div>
          <div className="spotify-legal">
            You can remove this access at any time in your account settings.<br />
            For more information about how Running Assistant can use your personal data, please see Running Assistant's privacy policy.
          </div>
          {!isAuthenticated && error && (
            <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '16px' }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // Main app content
  return (
    <div className="centered-container">
      <div style={{ position: 'absolute', top: 24, left: 24, display: 'flex', alignItems: 'center', zIndex: 10 }}>
        <img src={spotifyLogo} alt="Spotify" style={{ width: 48, height: 48, marginRight: 12 }} />
      </div>
      <div className="spotify-card">
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <div className="spotify-title" style={{ textAlign: 'left' }}>Workout Playlist Generator</div>
          {user && (
            <div className="spotify-user" style={{ justifyContent: 'flex-start' }}>
              {user.images && user.images[0] && (
                <img src={user.images[0].url} alt="avatar" className="spotify-avatar" />
              )}
              <span>Welcome, {user.display_name || user.id}!</span>
            </div>
          )}
          <button 
            onClick={handleLogout}
            className="spotify-cancel"
            style={{ float: 'right', marginTop: '-32px', marginRight: '-8px', background: 'none', border: 'none' }}
          >
            Logout
          </button>
        </div>

        {/* Step 1: Playlist Configuration */}
        {step === 1 && (
          <div>
            <h2 className="spotify-title" style={{ fontSize: '1.3rem', marginBottom: '24px', color: '#1db954' }}>
              Create Your Workout Playlist
            </h2>
            <form onSubmit={handleGeneratePlaylist}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#fff' }}>
                Activity Type
              </label>
              <select 
                value={activity} 
                onChange={(e) => setActivity(e.target.value)}
                className="spotify-input"
                style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid #282828', background: '#222', color: '#fff' }}
              >
                {activities.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#fff' }}>
                Source Playlist
              </label>
              <select
                value={selectedPlaylistId}
                onChange={e => setSelectedPlaylistId(e.target.value)}
                className="spotify-input"
                style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid #282828', background: '#222', color: '#fff' }}
              >
                {playlists.length === 0 && <option value="">No playlists found</option>}
                {playlists.map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#fff' }}>
                Playlist Name (optional)
              </label>
              <input
                type="text"
                value={playlistName}
                onChange={e => setPlaylistName(e.target.value)}
                placeholder={`Workout: ${activity}`}
                className="spotify-input"
                style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid #282828', background: '#222', color: '#fff' }}
              />
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#fff' }}>
                Duration (minutes)
              </label>
              <select
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                className="spotify-input"
                style={{ width: '100%', marginBottom: '16px', padding: '12px', borderRadius: '8px', border: '1px solid #282828', background: '#222', color: '#fff' }}
              >
                {durationOptions.map(mins => (
                  <option key={mins} value={mins}>{mins} min</option>
                ))}
              </select>
              <button 
                type="submit"
                disabled={loading}
                className="spotify-btn"
                style={{ opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Creating Playlist...' : 'Generate Playlist'}
              </button>
            </form>
            {error && (
              <p style={{ color: '#e74c3c', textAlign: 'center', marginTop: '16px' }}>
                {error}
              </p>
            )}
          </div>
        )}

        {/* Step 2: Generated Playlist */}
        {step === 2 && generatedPlaylist && (
          <div>
            <h2 className="spotify-title" style={{ color: '#1db954', marginBottom: '24px' }}>
              🎉 Playlist Created Successfully!
            </h2>
            <div style={{ backgroundColor: '#222', padding: '20px', borderRadius: '8px', marginBottom: '24px' }}>
              <h3 style={{ color: '#fff', marginBottom: '12px' }}>
                {generatedPlaylist.playlistName}
              </h3>
              <p style={{ color: '#b3b3b3', marginBottom: '16px' }}>
                Created by: {generatedPlaylist.user?.displayName || generatedPlaylist.user?.id}
              </p>
              <p style={{ color: '#b3b3b3', marginBottom: '16px' }}>
                Tracks added: {generatedPlaylist.tracks?.length || 0}
              </p>
              {generatedPlaylist.playlistUrl && (
                <a 
                  href={generatedPlaylist.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="spotify-btn"
                  style={{ display: 'inline-block', width: 'auto', padding: '12px 32px', margin: '0 auto' }}
                >
                  Open in Spotify
                </a>
              )}
            </div>
            {generatedPlaylist.tracks && generatedPlaylist.tracks.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ color: '#fff', marginBottom: '12px' }}>Added Tracks:</h4>
                <div style={{ maxHeight: '300px', overflowY: 'auto', border: '1px solid #282828', borderRadius: '6px', padding: '12px', background: '#181818' }}>
                  {generatedPlaylist.tracks.map((track: Track, index: number) => (
                    <div key={index} style={{ padding: '8px 0', borderBottom: index < generatedPlaylist.tracks.length - 1 ? '1px solid #222' : 'none', fontSize: '14px', color: '#fff' }}>
                      <div style={{ fontWeight: 'bold' }}>{track.name}</div>
                      <div style={{ color: '#b3b3b3', fontSize: '12px' }}>
                        {track.artist} • {track.album}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={() => {
                  setStep(1);
                  setGeneratedPlaylist(null);
                  setError(null);
                }}
                className="spotify-btn"
                style={{ background: '#282828', color: '#fff', flex: 1 }}
              >
                Create Another Playlist
              </button>
              {generatedPlaylist.playlistUrl && (
                <button 
                  onClick={() => window.open(generatedPlaylist.playlistUrl, '_blank')}
                  className="spotify-btn"
                  style={{ flex: 1 }}
                >
                  Open in Spotify
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App
