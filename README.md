# 🎵 Spotify Workout Playlist Generator

A modern web application that creates personalized workout playlists using Spotify's API. The app features a secure PKCE authorization flow, real-time track recommendations, and a beautiful Spotify-inspired UI.

## ✨ Features

- **🔐 Secure Authentication**: PKCE (Proof Key for Code Exchange) authorization flow with Spotify
- **🎯 Smart Playlist Generation**: Creates playlists based on activity type, duration, genre, and BPM preferences
- **🔄 Automatic Token Refresh**: Seamless token management with automatic refresh
- **🎨 Modern UI**: Beautiful Spotify-inspired interface with responsive design
- **📱 User Preferences**: Save and manage user preferences for personalized experiences
- **🎵 Real Track Data**: Uses Spotify's Search and Recommendations APIs for real music
- **📊 Activity Tracking**: Log user activities and playlist generation history

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Modern CSS** with Spotify-inspired design
- **Responsive design** for all devices

### Backend
- **Node.js** with Express
- **PKCE Authorization** for secure Spotify integration
- **RESTful API** with comprehensive endpoints
- **Token refresh** with automatic retry logic

### Database (Planned)
- **Azure Cosmos DB** for user preferences and activity tracking
- **NoSQL schema** optimized for user data and analytics

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Spotify Developer Account
- (Optional) Azure Cosmos DB for data persistence

### 1. Clone the Repository
```bash
git clone https://github.com/yourusername/spotify-workout-playlist.git
cd spotify-workout-playlist
```

### 2. Set Up Spotify App
1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Create a new app
3. Add redirect URI: `http://localhost:3000`
4. Copy your Client ID and Client Secret

### 3. Configure Environment Variables

Create `.env` file in the backend directory:
```env
SPOTIFY_CLIENT_ID=your_spotify_client_id
SPOTIFY_CLIENT_SECRET=your_spotify_client_secret
SPOTIFY_REDIRECT_URI=http://localhost:3000
PORT=4000
```

### 4. Install Dependencies
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 5. Start the Servers

**Terminal 1 - Backend:**
```bash
cd backend
npm start
```
Backend will run on `http://localhost:4000`

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
Frontend will run on `http://localhost:3000`

### 6. Use the App
1. Open `http://localhost:3000` in your browser
2. Click "Connect with Spotify"
3. Authorize the app
4. Create your first workout playlist!

## 🔧 API Endpoints

### Authentication
- `GET /api/auth/start` - Start PKCE authorization flow
- `POST /api/auth/token` - Exchange code for tokens
- `POST /api/auth/refresh` - Refresh access token

### User Management
- `GET /api/user` - Get current user profile
- `GET /api/user/albums` - Get user's saved albums
- `GET /api/user/playlists` - Get user's playlists

### Playlist Generation
- `GET /api/genres` - Get available genres
- `POST /api/generate-playlist` - Generate workout playlist
- `POST /api/playlists` - Create custom playlist
- `POST /api/playlists/:playlistId/tracks` - Add tracks to playlist

### Search & Recommendations
- `GET /api/search/tracks` - Search tracks by genre/BPM
- `GET /api/recommendations` - Get track recommendations

## 🗄️ Database Schema

The app is designed to work with Azure Cosmos DB for storing:
- **User profiles** and preferences
- **Generated playlists** history
- **User activity** logs
- **Popular preferences** analytics

See `backend/database-schema.md` for detailed schema documentation.

## 🔐 Security Features

- **PKCE Authorization**: Secure OAuth 2.0 flow without client secret exposure
- **Token Management**: Automatic refresh with secure storage
- **State Verification**: CSRF protection in authorization flow
- **Error Handling**: Comprehensive error handling and logging

## 🎨 UI/UX Features

- **Spotify-inspired Design**: Familiar interface matching Spotify's aesthetic
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Typeahead Search**: Intelligent genre search with dropdown
- **Loading States**: Smooth loading indicators and transitions
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Clear confirmation of playlist creation

## 🛠️ Development

### Project Structure
```
spotify-workout-playlist/
├── backend/
│   ├── index.js          # Express server
│   ├── mcpClient.js      # Spotify API client
│   ├── package.json
│   └── database-schema.md
├── frontend/
│   ├── src/
│   │   ├── App.tsx       # Main React component
│   │   ├── App.css       # Styles
│   │   └── main.tsx      # React entry point
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

### Available Scripts

**Backend:**
```bash
npm start          # Start development server
npm test           # Run tests (when implemented)
```

**Frontend:**
```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

## 🔮 Future Enhancements

- [ ] **Cosmos DB Integration**: Store user preferences and activity
- [ ] **Playlist Templates**: Pre-defined workout templates
- [ ] **Social Features**: Share playlists with friends
- [ ] **Analytics Dashboard**: View workout and music preferences
- [ ] **Mobile App**: React Native version
- [ ] **AI Recommendations**: Machine learning for better track selection
- [ ] **Workout Integration**: Connect with fitness apps
- [ ] **Offline Mode**: Cache playlists for offline listening

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Spotify Web API](https://developer.spotify.com/documentation/web-api/) for music data
- [Spotify PKCE Example](https://github.com/spotify/web-api-examples/tree/master/authorization/authorization_code_pkce) for authorization flow
- [React](https://reactjs.org/) and [Vite](https://vitejs.dev/) for the frontend framework
- [Express](https://expressjs.com/) for the backend framework

## 📞 Support

If you encounter any issues or have questions:
1. Check the [Issues](https://github.com/yourusername/spotify-workout-playlist/issues) page
2. Create a new issue with detailed information
3. Include your environment details and error logs

---

**Happy Workout Playlist Generation! 🎵💪**
