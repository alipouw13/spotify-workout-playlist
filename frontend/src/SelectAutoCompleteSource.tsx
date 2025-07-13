import React, { useState, useEffect } from 'react';
import './App.css';

interface SourceItem {
  id: string;
  name: string;
  type: 'playlist' | 'album';
  image: string;
}

const SelectAutoCompleteSource: React.FC<{
  onSelect: (source: SourceItem) => void;
}> = ({ onSelect }) => {
  const [playlists, setPlaylists] = useState<SourceItem[]>([]);
  const [albums, setAlbums] = useState<SourceItem[]>([]);
  const [selected, setSelected] = useState<SourceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSources = async () => {
      setLoading(true);
      setError(null);
      try {
        const [plRes, alRes] = await Promise.all([
          fetch('/api/user/playlists'),
          fetch('/api/user/albums'),
        ]);
        if (!plRes.ok || !alRes.ok) throw new Error('Failed to fetch sources');
        const plData = await plRes.json();
        const alData = await alRes.json();
        setPlaylists(
          (plData.items || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            type: 'playlist',
            image: p.image || (p.images && p.images[0]?.url) || '',
          }))
        );
        setAlbums(
          (alData.items || []).map((a: any) => ({
            id: a.id,
            name: a.name,
            type: 'album',
            image: a.image || (a.images && a.images[0]?.url) || '',
          }))
        );
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };
    fetchSources();
  }, []);

  return (
    <div className="select-source-container">
      <h2>Select Playlist or Album for Auto-complete</h2>
      {loading && <div>Loading...</div>}
      {error && <div className="error">{error}</div>}
      <div className="source-list">
        <h3>Your Playlists</h3>
        <div className="source-items">
          {playlists.map((item) => (
            <div
              key={item.id}
              className={`source-item${selected?.id === item.id ? ' selected' : ''}`}
              onClick={() => setSelected(item)}
            >
              <img src={item.image} alt={item.name} className="source-image" />
              <div className="source-name">{item.name}</div>
            </div>
          ))}
        </div>
        <h3>Your Albums</h3>
        <div className="source-items">
          {albums.map((item) => (
            <div
              key={item.id}
              className={`source-item${selected?.id === item.id ? ' selected' : ''}`}
              onClick={() => setSelected(item)}
            >
              <img src={item.image} alt={item.name} className="source-image" />
              <div className="source-name">{item.name}</div>
            </div>
          ))}
        </div>
      </div>
      <button
        className="continue-btn"
        onClick={() => selected && onSelect(selected)}
        disabled={!selected}
      >
        Continue
      </button>
    </div>
  );
};

export default SelectAutoCompleteSource; 