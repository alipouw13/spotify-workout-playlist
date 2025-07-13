import React, { useState, useEffect } from 'react';
import './App.css';

export interface Track {
  id: string;
  name: string;
  artists: string[];
  album: string;
  uri: string;
  duration_ms: number;
  image: string;
}

interface Playlist {
  id: string;
  name: string;
  image: string;
}

const SelectSongs: React.FC<{
  selectedSongs: Track[];
  setSelectedSongs: (tracks: Track[]) => void;
  onDone: () => void;
}> = ({ selectedSongs, setSelectedSongs, onDone }) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<Track[]>([]);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Helper to get access token
  const getAccessToken = () => localStorage.getItem('spotify_access_token');

  // Fetch playlists on mount
  useEffect(() => {
    const fetchPlaylists = async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = getAccessToken();
        const res = await fetch('/api/user/playlists', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch playlists');
        const data = await res.json();
        const items = Array.isArray(data) ? data : data.items;
        setPlaylists(
          (items || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            image: p.image || (p.images && p.images[0]?.url) || '',
          }))
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPlaylists();
  }, []);

  // Fetch tracks for selected playlist
  useEffect(() => {
    if (!selectedPlaylist) return;
    const fetchTracks = async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = getAccessToken();
        const res = await fetch(`/api/playlists/${selectedPlaylist.id}/tracks`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error('Failed to fetch playlist tracks');
        const data = await res.json();
        setPlaylistTracks(data.tracks || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchTracks();
  }, [selectedPlaylist]);

  // Search globally for tracks
  useEffect(() => {
    if (!search) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const accessToken = getAccessToken();
        const res = await fetch(`/api/search/songs?q=${encodeURIComponent(search)}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (!res.ok) throw new Error('Failed to search tracks');
        const data = await res.json();
        setSearchResults(data.tracks || []);
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  const toggleTrack = (track: Track) => {
    if (selectedSongs.find((t) => t.id === track.id)) {
      setSelectedSongs(selectedSongs.filter((t) => t.id !== track.id));
    } else {
      setSelectedSongs([...selectedSongs, track]);
    }
  };

  return (
    <div className="select-songs-container">
      <h2>Select Songs</h2>
      <input
        className="search-bar"
        type="text"
        placeholder="Search artists, songs, or albums"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      <div style={{ margin: '10px 0', color: '#fff' }}>
        Selected: {selectedSongs.length}
      </div>
      {/* Show search results if searching */}
      {search ? (
        <div className="track-list">
          {searchResults.map((track) => (
            <div key={track.id} className="track-item">
              <input
                type="checkbox"
                checked={!!selectedSongs.find((t) => t.id === track.id)}
                onChange={() => toggleTrack(track)}
              />
              <img src={track.image} alt={track.name} className="track-image" />
              <div className="track-info">
                <div className="track-name">{track.name}</div>
                <div className="track-artists">{track.artists.join(', ')}</div>
                <div className="track-album">{track.album}</div>
              </div>
            </div>
          ))}
        </div>
      ) : selectedPlaylist ? (
        <>
          <button className="back-btn" onClick={() => setSelectedPlaylist(null)}>
            ← Back to Playlists
          </button>
          <div className="track-list">
            {playlistTracks.map((track) => (
              <div key={track.id} className="track-item">
                <input
                  type="checkbox"
                  checked={!!selectedSongs.find((t) => t.id === track.id)}
                  onChange={() => toggleTrack(track)}
                />
                <img src={track.image} alt={track.name} className="track-image" />
                <div className="track-info">
                  <div className="track-name">{track.name}</div>
                  <div className="track-artists">{track.artists.join(', ')}</div>
                  <div className="track-album">{track.album}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="playlist-list">
          {playlists.map((playlist) => (
            <div
              key={playlist.id}
              className="playlist-item"
              onClick={() => setSelectedPlaylist(playlist)}
              style={{ cursor: 'pointer' }}
            >
              <img src={playlist.image} alt={playlist.name} className="playlist-image" />
              <div className="playlist-name">{playlist.name}</div>
            </div>
          ))}
        </div>
      )}
      <button
        className="done-btn"
        onClick={onDone}
        disabled={selectedSongs.length === 0}
      >
        Done
      </button>
    </div>
  );
};

export default SelectSongs; 