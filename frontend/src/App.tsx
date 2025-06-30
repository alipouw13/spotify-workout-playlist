import { useState, useEffect } from 'react'
import './App.css'

const API_BASE_URL = 'http://localhost:4000/api';

const activities = ['Running', 'Cycling', 'Gym', 'Yoga']
const genres = ['Pop', 'Rock', 'EDM', 'Hip-Hop', 'Classical']
const bpms = ['Any', 'Fast', 'Slow']

interface Song {
  id?: string
  name?: string
  artist?: string
}

function App() {
  const [activity, setActivity] = useState('Running')
  const [duration, setDuration] = useState(30)
  const [genre, setGenre] = useState('Pop')
  const [bpm, setBpm] = useState('Any')
  const [playlist, setPlaylist] = useState('')
  const [step, setStep] = useState(1)
  const [generatedPlaylist, setGeneratedPlaylist] = useState<Song[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Placeholder for playlist selection
  const userPlaylists = [
    { id: '1', name: 'My Favs' },
    { id: '2', name: 'Chill Vibes' },
    { id: '3', name: 'Workout Mix' },
  ]

  // On mount, check for access token in localStorage or URL
  useEffect(() => {
    // 1. Check for access token in localStorage
    const storedToken = localStorage.getItem('spotify_access_token')
    if (storedToken) {
      setAccessToken(storedToken)
      setIsAuthenticated(true)
      return
    }
    // 2. Check for code in URL (OAuth callback)
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      // Exchange code for token
      fetch(`${API_BASE_URL}/auth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
        .then(res => res.json())
        .then(data => {
          if (data.access_token) {
            localStorage.setItem('spotify_access_token', data.access_token)
            setAccessToken(data.access_token)
            setIsAuthenticated(true)
            // Remove code from URL
            window.history.replaceState({}, document.title, window.location.pathname)
          }
        })
        .catch(() => setError('Failed to authenticate with Spotify'))
    }
  }, [])

  // Login handler
  const handleLogin = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/start`)
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    }
  }

  async function handleGeneratePlaylist(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setGeneratedPlaylist([])
    try {
      const params = {
        activity,
        duration,
        genre,
        bpm,
        playlistId: playlist || undefined,
      }
      const res = await fetch(`${API_BASE_URL}/generate-playlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify(params),
      })
      if (!res.ok) throw new Error('Failed to generate playlist')
      const data = await res.json()
      setGeneratedPlaylist((data.songs as Song[]) || [])
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

  return (
    <div className="container">
      <h1>Spotify Workout Playlist Generator</h1>
      {!isAuthenticated ? (
        <button onClick={handleLogin} style={{ marginBottom: 24 }}>
          Login with Spotify
        </button>
      ) : (
        <div style={{ marginBottom: 24 }}>Logged in to Spotify</div>
      )}
      {/* Only show the rest of the app if authenticated */}
      {isAuthenticated && step === 1 && (
        <form onSubmit={handleGeneratePlaylist}>
          <label>
            Activity:
            <select value={activity} onChange={e => setActivity(e.target.value)}>
              {activities.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </label>
          <label>
            Duration (minutes):
            <input
              type="number"
              min={5}
              max={180}
              value={duration}
              onChange={e => setDuration(Number(e.target.value))}
            />
          </label>
          <label>
            Genre:
            <select value={genre} onChange={e => setGenre(e.target.value)}>
              {genres.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </label>
          <label>
            BPM:
            <select value={bpm} onChange={e => setBpm(e.target.value)}>
              {bpms.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </label>
          <label>
            (Optional) Select from your playlists:
            <select value={playlist} onChange={e => setPlaylist(e.target.value)}>
              <option value="">-- None --</option>
              {userPlaylists.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate Playlist'}
          </button>
          {error && <div className="error">{error}</div>}
        </form>
      )}
      {isAuthenticated && step === 2 && (
        <div>
          <h2>Generated Playlist</h2>
          {loading && <div>Loading...</div>}
          {error && <div className="error">{error}</div>}
          <ul>
            {generatedPlaylist.length > 0 ? (
              generatedPlaylist.map((song, idx) => (
                <li key={song.id || idx}>
                  {song.name || `Song ${idx + 1}`} by {song.artist || 'Unknown'}
                  <button style={{ marginLeft: 8 }}>Swap</button>
                </li>
              ))
            ) : (
              <li>No songs found.</li>
            )}
          </ul>
          <button onClick={() => setStep(1)}>Back</button>
          <button style={{ marginLeft: 8 }}>Accept Playlist</button>
        </div>
      )}
      {error && <div className="error">{error}</div>}
    </div>
  )
}

export default App
