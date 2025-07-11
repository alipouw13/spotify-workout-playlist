# Spotify Workout Playlist Generator

A web app to generate custom workout playlists from your Spotify library and playlists.

## Features

- **Spotify OAuth login** (PKCE, secure)
- **Select activity type** (Running, Cycling, Gym, Yoga)
- **Select a source playlist** from your Spotify playlists
- **Set playlist duration** (choose from 5 minutes to 12 hours in 5-minute increments)
- **Smart track selection**: The app picks tracks from your chosen playlist to fit your requested duration (±2 minutes)
- **Modern, Spotify-inspired UI**
- **Playlist is created in your Spotify account** with a link to open in Spotify

## Screenshots

| Login Page | Playlist Generator | Playlist Created |
|---|---|---|
| ![Login](frontend/src/assets/screenshot1.png) | ![Generator](frontend/src/assets/screenshot2.png) | ![Created](frontend/src/assets/screenshot3.png) |

> _Place your screenshots in the `frontend/src/assets/` folder as `screenshot1.png`, `screenshot2.png`, and `screenshot3.png`._

## Getting Started

1. **Clone the repo**
2. **Set up your Spotify Developer credentials** in a `.env` file (see `.env.example`)
3. **Install dependencies** in both `backend/` and `frontend/`
4. **Run the backend and frontend**

## Usage

1. Log in with your Spotify account
2. Select your activity type
3. Choose a source playlist from your Spotify playlists
4. Select the desired playlist duration
5. Click "Generate Playlist"
6. Open your new playlist in Spotify!

## Development

- Frontend: React + Vite (`frontend/`)
- Backend: Node.js + Express (`backend/`)

## Customization

- Add your own screenshots to `frontend/src/assets/` for the README
- Tweak the playlist selection algorithm in `backend/mcpClient.js`

## License

MIT
