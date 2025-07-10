# Database Schema for Spotify Workout Playlist App

## Cosmos DB Collections

### Users Collection
```json
{
  "id": "user-123",
  "spotifyUserId": "spotify-user-id",
  "displayName": "John Doe",
  "email": "john@example.com",
  "createdAt": "2024-01-01T00:00:00Z",
  "lastLoginAt": "2024-01-01T00:00:00Z",
  "preferences": {
    "defaultActivity": "Running",
    "defaultDuration": 30,
    "defaultGenre": "Pop",
    "defaultBpm": "Any",
    "favoriteGenres": ["Pop", "Rock", "Electronic"],
    "favoriteActivities": ["Running", "Gym"]
  },
  "type": "user"
}
```

### User Preferences Collection
```json
{
  "id": "pref-123",
  "userId": "user-123",
  "spotifyUserId": "spotify-user-id",
  "activity": "Running",
  "duration": 30,
  "genre": "Pop",
  "bpm": "Fast",
  "createdAt": "2024-01-01T00:00:00Z",
  "usedCount": 5,
  "lastUsedAt": "2024-01-01T00:00:00Z",
  "type": "preference"
}
```

### Generated Playlists Collection
```json
{
  "id": "playlist-123",
  "userId": "user-123",
  "spotifyUserId": "spotify-user-id",
  "spotifyPlaylistId": "spotify-playlist-id",
  "playlistName": "Workout: Running (Pop)",
  "playlistUrl": "https://open.spotify.com/playlist/...",
  "activity": "Running",
  "duration": 30,
  "genre": "Pop",
  "bpm": "Fast",
  "trackCount": 20,
  "tracks": [
    {
      "uri": "spotify:track:...",
      "name": "Song Name",
      "artist": "Artist Name",
      "album": "Album Name",
      "duration_ms": 180000
    }
  ],
  "createdAt": "2024-01-01T00:00:00Z",
  "type": "playlist"
}
```

### User Activity Log Collection
```json
{
  "id": "activity-123",
  "userId": "user-123",
  "spotifyUserId": "spotify-user-id",
  "action": "generate_playlist",
  "details": {
    "activity": "Running",
    "duration": 30,
    "genre": "Pop",
    "bpm": "Fast",
    "playlistId": "playlist-123"
  },
  "timestamp": "2024-01-01T00:00:00Z",
  "type": "activity"
}
```

## Indexes

### Users Collection
- Partition Key: `spotifyUserId`
- Indexes:
  - `email` (for user lookup)
  - `createdAt` (for analytics)

### User Preferences Collection
- Partition Key: `userId`
- Indexes:
  - `activity` (for filtering by activity)
  - `genre` (for filtering by genre)
  - `usedCount` (for popular preferences)
  - `lastUsedAt` (for recent preferences)

### Generated Playlists Collection
- Partition Key: `userId`
- Indexes:
  - `spotifyPlaylistId` (for playlist lookup)
  - `activity` (for filtering by activity)
  - `genre` (for filtering by genre)
  - `createdAt` (for recent playlists)

### User Activity Log Collection
- Partition Key: `userId`
- Indexes:
  - `action` (for filtering by action type)
  - `timestamp` (for time-based queries)

## API Endpoints for Database Operations

### Save User Preference
```
POST /api/user/preferences
{
  "activity": "Running",
  "duration": 30,
  "genre": "Pop",
  "bpm": "Fast"
}
```

### Get User Preferences
```
GET /api/user/preferences
```

### Get Popular Preferences
```
GET /api/preferences/popular?limit=10
```

### Save Generated Playlist
```
POST /api/playlists/save
{
  "spotifyPlaylistId": "...",
  "playlistName": "...",
  "playlistUrl": "...",
  "activity": "...",
  "duration": 30,
  "genre": "...",
  "bpm": "...",
  "tracks": [...]
}
```

### Get User's Generated Playlists
```
GET /api/user/playlists/generated?limit=20&offset=0
```

### Log User Activity
```
POST /api/user/activity
{
  "action": "generate_playlist",
  "details": {...}
}
```

## Environment Variables for Cosmos DB

```env
COSMOS_DB_ENDPOINT=your-cosmos-db-endpoint
COSMOS_DB_KEY=your-cosmos-db-key
COSMOS_DB_DATABASE=spotify-workout-playlist
COSMOS_DB_USERS_CONTAINER=users
COSMOS_DB_PREFERENCES_CONTAINER=preferences
COSMOS_DB_PLAYLISTS_CONTAINER=playlists
COSMOS_DB_ACTIVITY_CONTAINER=activity
``` 