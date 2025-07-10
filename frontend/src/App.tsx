import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:4000/api';

const activities = ['Running', 'Cycling', 'Gym', 'Yoga']
const bpms = ['Any', 'Fast', 'Slow']

// Add a function to refresh the access token
async function refreshToken(setAccessToken: (token: string) => void) {
  const refresh_token = localStorage.getItem('spotify_refresh_token');
  if (!refresh_token) return null;
  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token }),
  });
  const data = await res.json();
  if (data.access_token) {
    localStorage.setItem('spotify_access_token', data.access_token);
    setAccessToken(data.access_token);
    return data.access_token;
  }
  return null;
}

function App() {
  const [activity, setActivity] = useState('Running')
  const [duration, setDuration] = useState(30)
  const [genre, setGenre] = useState('Pop')
  const [bpm, setBpm] = useState('Any')
  const [step, setStep] = useState(1)
  const [generatedPlaylist, setGeneratedPlaylist] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [genresList, setGenresList] = useState<string[]>([])
  const [genreInput, setGenreInput] = useState('')
  const genreInputRef = useRef<HTMLInputElement>(null)
  const [genreWarning, setGenreWarning] = useState('');
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);

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
    if (code) {
      fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
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
          }
        })
        .catch(() => setError('Failed to authenticate with Spotify'));
    }
  }, []);

  // Fetch genres from backend when authenticated
  useEffect(() => {
    if (isAuthenticated && accessToken) {
      fetch(`${API_BASE_URL}/genres`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      })
        .then(res => res.json())
        .then(data => {
          if (data.genres) setGenresList(data.genres);
        });
    }
  }, [isAuthenticated, accessToken]);

  // Filter genres for typeahead
  const filteredGenres = genresList.filter(g =>
    g.toLowerCase().includes(genreInput.toLowerCase())
  );

  // Login handler
  const handleLogin = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/start`)
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  // Logout handler
  const handleLogout = () => {
    localStorage.removeItem('spotify_access_token');
    localStorage.removeItem('spotify_refresh_token');
    setAccessToken(null);
    setIsAuthenticated(false);
    window.location.reload();
  };

  async function handleGeneratePlaylist(e: React.FormEvent) {
    e.preventDefault();
    setGenreWarning('');
    setLoading(true);
    setError(null);
    setGeneratedPlaylist([]);
    // Only allow valid genres
    if (!genresList.includes(genre)) {
      setLoading(false);
      setGenreWarning('Please select a genre from the dropdown.');
      return;
    }
    try {
      const params = {
        activity,
        duration,
        genre,
        bpm,
      }
      let token = accessToken;
      let res = await fetch(`${API_BASE_URL}/generate-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      })
      if (res.status === 401) {
        // Try to refresh token and retry
        token = await refreshToken(setAccessToken);
        if (token) {
          res = await fetch(`${API_BASE_URL}/generate-playlist`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(params),
          });
        }
      }
      if (!res.ok) throw new Error('Failed to generate playlist')
      const data = await res.json()
      setGeneratedPlaylist((data.songs as string[]) || [])
      setStep(2)
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Unknown error')
      }
    } finally {
      setLoading(false)
    }
  }

  // Shared Spotify-style background and card wrapper for all pages
  const spotifyBg = (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      zIndex: 0,
      opacity: 0.18,
      background: 'url(/spotify-bg-demo.jpg) center/cover no-repeat',
      filter: 'blur(2px)',
    }} />
  );

  const cardStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 1,
    background: 'rgba(0,0,0,0.7)',
    borderRadius: 32,
    padding: 36,
    width: 400,
    maxWidth: '98vw',
    color: '#fff',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    boxShadow: '0 4px 32px rgba(0,0,0,0.3)',
  };

  // Shared style for all input/select boxes
  const inputBoxStyle: React.CSSProperties = {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    border: '1px solid #333',
    marginTop: 4,
    background: '#191414',
    color: '#fff',
    fontSize: 16,
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  };

  // Spotify-style login page
  if (!isAuthenticated) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #191414 0%, #1DB954 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'Circular, system-ui, Arial, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {spotifyBg}
        <div style={cardStyle}>
          <div style={{ margin: '32px 0 24px 0' }}>
            <img src="/spotify-logo.png" alt="Spotify" style={{ width: 56, display: 'block', margin: '0 auto' }} />
          </div>
          <h1 style={{ fontWeight: 900, fontSize: 28, marginBottom: 24, letterSpacing: -1, textAlign: 'center' }}>
            Millions of Songs.<br />Free on Spotify.
          </h1>
          <button
            style={{
              background: '#1DB954',
              color: '#222',
              border: 'none',
              borderRadius: 999,
              padding: '16px 0',
              fontWeight: 700,
              fontSize: 18,
              marginBottom: 18,
              width: '100%',
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 2px 8px rgba(30,185,84,0.15)',
            }}
          >
            Sign up free
          </button>
          <button style={{
            background: '#111',
            color: '#fff',
            border: '2px solid #333',
            borderRadius: 999,
            padding: '14px 0',
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 12,
            width: '100%',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>🌐</span> Continue with Google
          </button>
          <button style={{
            background: '#111',
            color: '#fff',
            border: '2px solid #333',
            borderRadius: 999,
            padding: '14px 0',
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 12,
            width: '100%',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}>📘</span> Continue with Facebook
          </button>
          <button style={{
            background: '#111',
            color: '#fff',
            border: '2px solid #333',
            borderRadius: 999,
            padding: '14px 0',
            fontWeight: 700,
            fontSize: 17,
            marginBottom: 18,
            width: '100%',
            cursor: 'pointer',
            fontFamily: 'inherit',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <span style={{ fontSize: 20 }}></span> Continue with Apple
          </button>
          <button
            onClick={handleLogin}
            style={{
              background: 'transparent',
              color: '#fff',
              border: 'none',
              borderRadius: 999,
              padding: '10px 0',
              fontWeight: 700,
              fontSize: 17,
              width: '100%',
              cursor: 'pointer',
              fontFamily: 'inherit',
              textDecoration: 'underline',
              marginTop: 8,
            }}
          >
            Log in
          </button>
        </div>
      </div>
    );
  }

  // Authenticated pages use the same background and card
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #191414 0%, #1DB954 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Circular, system-ui, Arial, sans-serif', position: 'relative', overflow: 'hidden' }}>
      {spotifyBg}
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, width: '100%' }}>
          <button onClick={handleLogout} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 999, padding: '8px 20px', fontWeight: 600, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>Log out</button>
        </div>
        <h1 style={{ fontWeight: 900, fontSize: 32, marginBottom: 8, letterSpacing: -1 }}>Spotify Workout Playlist</h1>
        <div style={{ color: '#1DB954', fontWeight: 700, marginBottom: 24, fontSize: 18 }}>Generator</div>
        {step === 1 && (
          <form onSubmit={handleGeneratePlaylist} style={{ display: 'flex', flexDirection: 'column', gap: 18, width: 320, alignSelf: 'center' }}>
            <label style={{ fontWeight: 600, marginBottom: 2 }}>Activity
              <select value={activity} onChange={e => setActivity(e.target.value)} style={inputBoxStyle}>
                {activities.map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </label>
            <label style={{ fontWeight: 600, marginBottom: 2 }}>Duration (minutes)
              <input
                type="number"
                min={5}
                max={180}
                value={duration}
                onChange={e => setDuration(Number(e.target.value))}
                style={inputBoxStyle}
              />
            </label>
            <label style={{ fontWeight: 600, marginBottom: 2, position: 'relative' }}>Genre
              <input
                ref={genreInputRef}
                type="text"
                value={genreInput}
                onChange={e => {
                  setGenreInput(e.target.value);
                  setGenre('');
                  setGenreWarning('');
                  setGenreDropdownOpen(true);
                }}
                placeholder="Type or select a genre"
                style={{ ...inputBoxStyle, boxSizing: 'border-box', height: 48 }}
                autoComplete="off"
                onFocus={() => {
                  setGenreDropdownOpen(true);
                  genreInputRef.current?.select();
                }}
                onBlur={() => setTimeout(() => setGenreDropdownOpen(false), 150)}
              />
              {genreDropdownOpen && (
                <ul style={{
                  background: '#191414',
                  border: '1px solid #333',
                  borderRadius: 8,
                  margin: 0,
                  padding: 0,
                  listStyle: 'none',
                  maxHeight: 180,
                  overflowY: 'auto',
                  position: 'absolute',
                  zIndex: 10,
                  width: '100%',
                  left: 0,
                  top: 52,
                }}>
                  {(genreInput ? filteredGenres : genresList).length > 0 ? (
                    (genreInput ? filteredGenres : genresList).map(g => (
                      <li
                        key={g}
                        style={{ padding: 10, cursor: 'pointer', fontSize: 16 }}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => {
                          setGenreInput(g);
                          setGenre(g);
                          setGenreWarning('');
                          setGenreDropdownOpen(false);
                        }}
                      >
                        {g}
                      </li>
                    ))
                  ) : (
                    <li style={{ padding: 10, color: '#aaa' }}>No genres available</li>
                  )}
                </ul>
              )}
            </label>
            <label style={{ fontWeight: 600, marginBottom: 2 }}>BPM
              <select value={bpm} onChange={e => setBpm(e.target.value)} style={inputBoxStyle}>
                {bpms.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </label>
            <button type="submit" disabled={loading} style={{ background: '#1DB954', color: '#fff', border: 'none', borderRadius: 999, padding: '14px 0', fontWeight: 700, fontSize: 20, marginTop: 12, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, fontFamily: 'inherit' }}>
              {loading ? 'Generating...' : 'Generate Playlist'}
            </button>
            {error && <div style={{ color: '#ff4d4f', fontWeight: 600, marginTop: 8 }}>{error}</div>}
            {genreWarning && <div style={{ color: '#ff4d4f', fontWeight: 600, marginTop: 4 }}>{genreWarning}</div>}
          </form>
        )}
        {step === 2 && (
          <div style={{ marginTop: 24 }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, marginBottom: 16, color: '#1DB954' }}>Generated Playlist</h2>
            {loading && <div style={{ color: '#fff' }}>Loading...</div>}
            {error && <div style={{ color: '#ff4d4f', fontWeight: 600 }}>{error}</div>}
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {generatedPlaylist.length > 0 ? (
                generatedPlaylist.map((uri, idx) => (
                  <li key={uri || idx} style={{ background: '#191414', borderRadius: 12, marginBottom: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.12)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                      {/* Playlist cover image placeholder (can be replaced with real image if available) */}
                      <div style={{ width: 48, height: 48, background: '#333', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#1DB954' }}>
                        <span role="img" aria-label="music">🎵</span>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 16 }}>{uri}</div>
                        {/* You can fetch and display track name/artist if desired */}
                      </div>
                    </div>
                  </li>
                ))
              ) : (
                <li style={{ color: '#aaa', textAlign: 'center', padding: 16 }}>No songs found.</li>
              )}
            </ul>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
              <button onClick={() => setStep(1)} style={{ background: '#333', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
              <button style={{ background: '#1DB954', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 24px', fontWeight: 600, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit' }}>Accept Playlist</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
