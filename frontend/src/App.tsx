import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:4000/api';

const activities = ['Running', 'Cycling', 'Gym', 'Yoga']
const bpms = ['Any', 'Fast', 'Slow']

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
  const [duration, setDuration] = useState(30)
  const [bpm, setBpm] = useState('Any')
  const [step, setStep] = useState(1)
  const [generatedPlaylist, setGeneratedPlaylist] = useState<GeneratedPlaylist | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<SpotifyUser | null>(null);

  // On mount, check for access token in localStorage or URL
  useEffect(() => {
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
        .then(res => res.json())
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('spotify_access_token', data.access_token);
            if (data.refresh_token) {
              localStorage.setItem('spotify_refresh_token', data.refresh_token);
            }
            setAccessToken(data.access_token);
            setIsAuthenticated(true);
            window.history.replaceState({}, document.title, window.location.pathname);
          } else {
            setError('Failed to authenticate with Spotify');
          }
        })
        .catch(() => setError('Failed to authenticate with Spotify'));
    }
  }, []);

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
    
    try {
      const params = {
        activity,
        duration,
        bpm,
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

  // Shared Spotify-style background and card wrapper for all pages
  const spotifyBg = (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'linear-gradient(135deg, #1db954 0%, #1ed760 50%, #1db954 100%)',
      zIndex: -1
    }} />
  );

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    borderRadius: '12px',
    padding: '32px',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    maxWidth: '500px',
    width: '100%',
    margin: '0 auto'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    fontSize: '16px',
    transition: 'border-color 0.3s ease',
    boxSizing: 'border-box' as const,
    marginBottom: '16px'
  };

  const buttonStyle = {
    width: '100%',
    padding: '14px 24px',
    backgroundColor: '#1db954',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background-color 0.3s ease',
    marginBottom: '12px'
  };

  const selectStyle = {
    ...inputStyle,
    backgroundColor: 'white'
  };

  // Login page
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
        {spotifyBg}
        <div style={cardStyle}>
          <h1 style={{ textAlign: 'center', color: '#1db954', marginBottom: '32px', fontSize: '2.5rem' }}>
            🎵 Workout Playlist Generator
          </h1>
          <p style={{ textAlign: 'center', color: '#666', marginBottom: '32px', fontSize: '1.1rem' }}>
            Create personalized workout playlists with your favorite music from Spotify
          </p>
          <button 
            onClick={handleLogin}
            style={buttonStyle}
            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1ed760'}
            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1db954'}
          >
            Connect with Spotify
          </button>
          {error && (
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
    <div style={{ minHeight: '100vh', padding: '20px', position: 'relative' }}>
      {spotifyBg}
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '32px',
        color: 'white'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>🎵 Workout Playlist Generator</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {user && (
            <span style={{ fontSize: '1rem' }}>
              Welcome, {user.display_name || user.id}!
            </span>
          )}
          <button 
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px'
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Step 1: Playlist Configuration */}
      {step === 1 && (
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', color: '#1db954', marginBottom: '24px' }}>
            Create Your Workout Playlist
          </h2>
          
          <form onSubmit={handleGeneratePlaylist}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Activity Type
            </label>
            <select 
              value={activity} 
              onChange={(e) => setActivity(e.target.value)}
              style={selectStyle}
            >
              {activities.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              Duration (minutes)
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 30)}
              min="5"
              max="180"
              style={inputStyle}
            />

            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#333' }}>
              BPM Preference
            </label>
            <select 
              value={bpm} 
              onChange={(e) => setBpm(e.target.value)}
              style={selectStyle}
            >
              {bpms.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>

            <button 
              type="submit"
              disabled={loading}
              style={{
                ...buttonStyle,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
              onMouseOver={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1ed760')}
              onMouseOut={(e) => !loading && (e.currentTarget.style.backgroundColor = '#1db954')}
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
        <div style={cardStyle}>
          <h2 style={{ textAlign: 'center', color: '#1db954', marginBottom: '24px' }}>
            🎉 Playlist Created Successfully!
          </h2>
          
          <div style={{ 
            backgroundColor: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '8px', 
            marginBottom: '24px' 
          }}>
            <h3 style={{ color: '#333', marginBottom: '12px' }}>
              {generatedPlaylist.playlistName}
            </h3>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Created by: {generatedPlaylist.user?.displayName || generatedPlaylist.user?.id}
            </p>
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Tracks added: {generatedPlaylist.tracks?.length || 0}
            </p>
            
            {generatedPlaylist.playlistUrl && (
              <a 
                href={generatedPlaylist.playlistUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-block',
                  backgroundColor: '#1db954',
                  color: 'white',
                  padding: '12px 24px',
                  textDecoration: 'none',
                  borderRadius: '6px',
                  fontWeight: 'bold',
                  marginTop: '8px'
                }}
              >
                Open in Spotify
              </a>
            )}
          </div>

          {generatedPlaylist.tracks && generatedPlaylist.tracks.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ color: '#333', marginBottom: '12px' }}>Added Tracks:</h4>
              <div style={{ 
                maxHeight: '300px', 
                overflowY: 'auto',
                border: '1px solid #e0e0e0',
                borderRadius: '6px',
                padding: '12px'
              }}>
                {generatedPlaylist.tracks.map((track: Track, index: number) => (
                  <div key={index} style={{ 
                    padding: '8px 0', 
                    borderBottom: index < generatedPlaylist.tracks.length - 1 ? '1px solid #f0f0f0' : 'none',
                    fontSize: '14px'
                  }}>
                    <div style={{ fontWeight: 'bold', color: '#333' }}>{track.name}</div>
                    <div style={{ color: '#666', fontSize: '12px' }}>
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
              style={{
                ...buttonStyle,
                backgroundColor: '#6c757d',
                flex: 1
              }}
              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#5a6268'}
              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#6c757d'}
            >
              Create Another Playlist
            </button>
            
            {generatedPlaylist.playlistUrl && (
              <button 
                onClick={() => window.open(generatedPlaylist.playlistUrl, '_blank')}
                style={{
                  ...buttonStyle,
                  flex: 1
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1ed760'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#1db954'}
              >
                Open in Spotify
              </button>
            )}
          </div>
        </div>
      )}

      {/* Click outside to close genre dropdown */}
      {/* genreDropdownOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setGenreDropdownOpen(false)}
        />
      ) */}
    </div>
  );
}

export default App
