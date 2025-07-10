# Spotify Workout Playlist Generator

This app lets users authenticate with Spotify, select workout preferences (activity, duration, genre, BPM), and generates a custom playlist using the Spotify API. The UI is inspired by Spotify's mobile design, with a modern login page and dynamic playlist creation.

## Features
- **Spotify OAuth authentication** (with token refresh)
- **Modern, Spotify-style UI** (bold headings, green buttons, rounded controls)
- **Dynamic genre selection**: Dropdown with typeahead search for genres (inclusive of most Spotify types)
- **Playlist generation**: Uses Spotify Search API to find tracks matching genre and BPM
- **Playlist cover images**: (Planned) Show cover images for generated playlists
- **Google/Apple login**: (Planned) Placeholder buttons, can be implemented with OAuth
- **Advanced search logic**: (Planned) Smarter track selection based on activity, mood, and user preferences

## Setup

### Prerequisites
- Node.js (v16 or higher recommended)
- npm (comes with Node.js)
- Spotify Developer account (for API credentials)

### 1. Clone and Install
```sh
# Clone the repo
cd spotify-workout-playlist
npm install
cd backend && npm install
cd ../frontend && npm install
```

### 2. Configure Environment Variables
Create a `.env` file in `backend/` with:
```
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8000
```
Register this redirect URI in your Spotify Developer Dashboard.

### 3. Start the Servers
```sh
# In one terminal (backend)
cd backend
node index.js

# In another terminal (frontend)
cd frontend
npm run dev
```

- Frontend: http://127.0.0.1:8000
- Backend: http://localhost:4000

## Usage
1. Open the frontend in your browser.
2. Log in with Spotify (Google/Apple login coming soon).
3. Select your workout preferences:
   - Activity
   - Duration
   - Genre (type to filter, or select from dropdown)
   - BPM
4. Click "Generate Playlist" to create a new playlist in your Spotify account.
5. (Planned) See playlist cover images and more advanced search options.

## Planned Improvements
- **Google/Apple login**: Implement full OAuth for Google and Apple.
- **Genre selection**: Use Spotify's genre endpoint for a complete, searchable list.
- **Playlist cover images**: Show the cover image for each generated playlist.
- **Advanced search**: Smarter track selection based on activity, mood, and user preferences.
- **UI refinements**: Further match Spotify's font (Circular), spacing, and responsive design.

---

For questions or contributions, open an issue or pull request! 