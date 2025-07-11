// This currently doesn't work - WIP
// Dependencies: npm install dotenv axios uuid
const axios = require('axios');
const querystring = require('querystring');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI_2;

// Use a separate storage for test script to avoid conflicts with main backend
const testCodeVerifiers = new Map();

// Generate PKCE code verifier and challenge
function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  return { codeVerifier, codeChallenge };
}

// Get Spotify authorization URL with PKCE
function getSpotifyAuthUrl() {
  const { codeVerifier, codeChallenge } = generatePKCE();
  const state = `test-${uuidv4()}`; // Add 'test-' prefix to avoid conflicts
  testCodeVerifiers.set(state, codeVerifier);
  const params = querystring.stringify({
    client_id: SPOTIFY_CLIENT_ID,
    response_type: 'code',
    redirect_uri: SPOTIFY_REDIRECT_URI,
    state: state,
    code_challenge_method: 'S256',
    code_challenge: codeChallenge,
    scope: [
      'playlist-read-private',
      'playlist-modify-public',
      'playlist-modify-private',
      'user-read-private',
      'user-read-email',
      'user-library-read',
      'user-library-modify',
      'user-read-playback-state',
      'user-modify-playback-state',
      'user-read-currently-playing',
      'user-read-recently-played',
      'user-top-read',
      'ugc-image-upload',
    ].join(' '),
  });
  return {
    url: `https://accounts.spotify.com/authorize?${params}`,
    state: state
  };
}

// Exchange authorization code for tokens using PKCE
async function exchangeCodeForToken(code, state) {
  const codeVerifier = testCodeVerifiers.get(state);
  if (!codeVerifier) {
    throw new Error('Invalid state parameter or code verifier not found');
  }
  testCodeVerifiers.delete(state);
  const tokenUrl = 'https://accounts.spotify.com/api/token';
  const data = querystring.stringify({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: SPOTIFY_REDIRECT_URI,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  try {
    const response = await axios.post(tokenUrl, data, { headers });
    return response.data;
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    throw new Error('Failed to exchange code for token');
  }
}

// Get user's playlists
async function getUserPlaylists(accessToken, limit = 50, offset = 0) {
  try {
    const response = await axios.get('https://api.spotify.com/v1/me/playlists', {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { limit, offset }
    });
    return response.data;
  } catch (error) {
    console.error('Get user playlists error:', error.response?.data || error.message);
    throw new Error('Failed to get user playlists');
  }
}

// Delete a playlist
async function deletePlaylist(playlistId, accessToken) {
  try {
    await axios.delete(`https://api.spotify.com/v1/playlists/${playlistId}/followers`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    console.log(`Deleted playlist: ${playlistId}`);
    return true;
  } catch (error) {
    console.error(`Failed to delete playlist ${playlistId}:`, error.response?.data || error.message);
    return false;
  }
}

// Main function to delete test playlists
async function deleteTestPlaylists(hoursAgo = 24) {
  console.log(`\n🔍 Searching for playlists created in the last ${hoursAgo} hours...`);
  
  // Get authorization URL
  const authData = getSpotifyAuthUrl();
  console.log('\n📋 Please visit this URL to authorize the script:');
  console.log(authData.url);
  console.log('\n⚠️  IMPORTANT: After authorization, you will be redirected to your main app.');
  console.log('   Look at the URL in your browser - it will contain a "code" parameter.');
  console.log('   Copy the entire code value (everything after "code=" and before "&" or the end of URL).');
  console.log('   Example: If URL is "http://localhost:4000/api/auth/callback?code=AQD...xyz&state=...",');
  console.log('   copy "AQD...xyz" (the part between "code=" and "&state=")');
  
  // Wait for user input
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  const code = await new Promise((resolve) => {
    rl.question('\nEnter the authorization code from the URL: ', (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
  
  try {
    // Exchange code for token
    console.log('\n🔄 Exchanging code for access token...');
    const tokenData = await exchangeCodeForToken(code, authData.state);
    const accessToken = tokenData.access_token;
    
    // Get all user playlists
    console.log('\n📋 Fetching your playlists...');
    let allPlaylists = [];
    let offset = 0;
    let hasMore = true;
    
    while (hasMore) {
      const playlistsData = await getUserPlaylists(accessToken, 50, offset);
      allPlaylists = allPlaylists.concat(playlistsData.items);
      hasMore = playlistsData.next !== null;
      offset += 50;
    }
    
    console.log(`Found ${allPlaylists.length} total playlists`);
    
    // Filter playlists by creation time
    const cutoffTime = new Date(Date.now() - (hoursAgo * 60 * 60 * 1000));
    const testPlaylists = allPlaylists.filter(playlist => {
      // Note: Spotify doesn't provide creation time directly, so we'll use a naming pattern
      // Look for playlists that start with "Workout:" or contain "test" in the name
      const name = playlist.name.toLowerCase();
      return name.startsWith('workout:') || name.includes('test') || name.includes('generated');
    });
    
    console.log(`\n🎯 Found ${testPlaylists.length} potential test playlists:`);
    testPlaylists.forEach(playlist => {
      console.log(`  - ${playlist.name} (ID: ${playlist.id})`);
    });
    
    if (testPlaylists.length === 0) {
      console.log('\n✅ No test playlists found to delete.');
      return;
    }
    
    // Confirm deletion
    const confirmRl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    const confirm = await new Promise((resolve) => {
      confirmRl.question(`\n⚠️  Do you want to delete these ${testPlaylists.length} playlists? (yes/no): `, (answer) => {
        confirmRl.close();
        resolve(answer.toLowerCase().trim());
      });
    });
    
    if (confirm !== 'yes' && confirm !== 'y') {
      console.log('\n❌ Deletion cancelled.');
      return;
    }
    
    // Delete playlists
    console.log('\n🗑️  Deleting playlists...');
    let deletedCount = 0;
    for (const playlist of testPlaylists) {
      const success = await deletePlaylist(playlist.id, accessToken);
      if (success) {
        deletedCount++;
      }
      // Add a small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\n✅ Successfully deleted ${deletedCount} out of ${testPlaylists.length} playlists.`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const hoursAgo = args[0] ? parseInt(args[0]) : 24;

console.log('🎵 Spotify Test Playlist Cleanup Script');
console.log('=====================================');

// Check if environment variables are set
if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET || !SPOTIFY_REDIRECT_URI) {
  console.error('❌ Error: Missing environment variables.');
  console.error('Please set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, and SPOTIFY_REDIRECT_URI');
  console.error('Make sure your backend/.env file exists and contains these variables');
  process.exit(1);
}

// Run the cleanup
deleteTestPlaylists(hoursAgo)
  .then(() => {
    console.log('\n🎉 Cleanup completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error.message);
    process.exit(1);
  }); 