# Spotify Workout Playlist Generator

> **Disclaimer:** This project is ongoing and intentionally simple, designed to prove out core functionality. Features and code structure may change as development continues.

A web app to generate custom workout playlists from your Spotify library and personal playlists.

## Features

- **Spotify OAuth login** (PKCE, secure)
- **Select activity type** (Running, Cycling, Gym, Yoga)
- **Select a source playlist** from your Spotify playlists
- **Set playlist duration** (choose from 5 minutes to 12 hours in 5-minute increments)
- **Smart track selection**: The app picks tracks from your chosen playlist to fit your requested duration (±2 minutes)
- **Modern, Spotify-inspired UI**
- **Playlist is created in your Spotify account** with a link to open in Spotify

## Workflow

Follow these steps to generate your custom workout playlist:

**Step 1: Login**

> Log in with your Spotify account to get started.

<p align="center">
  <img src="frontend/src/assets/login.png" alt="Login" width="320" />
</p>

**Step 2: Authentication**

> Authorize the app to access your Spotify data securely.

<p align="center">
  <img src="frontend/src/assets/connection.png" alt="Authentication" width="320" />
</p>

**Step 3: Configure Playlist**

> Select your activity, source playlist, and desired duration.

<p align="center">
  <img src="frontend/src/assets/selection.png" alt="Playlist Generator" width="320" />
</p>

**Step 4: Playlist Created**

> Your new workout playlist is ready! Open it in Spotify and start your workout.

<p align="center">
  <img src="frontend/src/assets/creation.png" alt="Playlist Created" width="320" />
</p>

## Prerequisites

Before you begin, you'll need a Spotify Developer account and a registered app:

1. **Create a Spotify Developer Account**
   - Go to the [Spotify Developer Dashboard](https://developer.spotify.com/) and log in with your Spotify account (or create one if you don't have it).

2. **Create a new app**
   - In the dashboard, click "Create an App".
   
   ![Create Spotify App](frontend/src/assets/create-spotify-app.png)
   
   - Give your app a name and description.
   - After creation, you'll see your **Client ID** and **Client Secret**.
   
   ![Spotify App Client ID and Secret](frontend/src/assets/app-client-id.png)

3. **Set the Redirect URI**
   - In your app settings, add your redirect URI (e.g., `http://localhost:4000/api/auth/callback` or as specified in your `.env`).
   - Save the changes.

4. **Copy your credentials**
   - You'll need the **Client ID**, **Client Secret**, and **Redirect URI** for your `.env` file in the backend.

> For more details, see the [Spotify Developer Documentation](https://developer.spotify.com/).

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

### Running the App Locally (Development)

1. **Set up your development environment**
   
   **For Python scripts and tests:**
   
   If you plan to run Python scripts or tests (e.g., in the `tests/` folder), it's recommended to create a virtual environment in the project root:
   
   ```bash
   # (optional) set pythin verion path if required
   $env:Path = "C:\Users\alisonpouw\AppData\Local\Programs\Python\Python311;$env:Path"

   # Create virtual environment
   python -m venv venv
   
   # Activate on Windows:
   venv\Scripts\activate
   
   # Activate on macOS/Linux:
   source venv/bin/activate
   
   # Install Python dependencies (if any)
   pip install -r requirements.txt  # if you have a requirements.txt file
   ```
   
   **For Node.js scripts and tests:**
   
   The test scripts in the `tests/` folder use Node.js dependencies. Install them:
   
   ```bash
   cd tests
   npm install
   cd ..
   ```

2. **Install dependencies**
   
   Open two terminals (or use tabs):
   
   In the `backend/` directory:
   ```bash
   cd backend
   npm install
   ```
   
   In the `frontend/` directory:
   ```bash
   cd frontend
   npm install
   ```

3. **Start the backend server**
   
   In the `backend/` directory:
   ```bash
   node index.js
   ```
   By default, the backend runs on [http://localhost:4000](http://localhost:4000)

4. **Start the frontend development server**
   
   In the `frontend/` directory:
   ```bash
   npm run dev
   ```
   By default, the frontend runs on [http://127.0.0.1:8000](http://127.0.0.1:8000)

5. **Open the app**
   
   Visit [http://127.0.0.1:8000](http://127.0.0.1:8000) in your browser.

> Make sure your `.env` file is set up in the `backend/` directory with your Spotify credentials.

### Testing and Cleanup

When testing the app, you may generate many playlists. Use the cleanup script to delete test playlists:

```bash
# Delete playlists from the last 24 hours (default)
node tests/delete-test-playlists.js

# Delete playlists from the last 48 hours
node tests/delete-test-playlists.js 48

# Delete playlists from the last 2 hours
node tests/delete-test-playlists.js 2
```

The script will:
1. Authenticate with Spotify
2. Find playlists with names starting with "Workout:" or containing "test"/"generated"
3. Show you the list and ask for confirmation before deleting

> **Note:** The script uses the same environment variables as your backend. Make sure your `backend/.env` file is accessible.
