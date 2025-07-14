// test-app-token.js
const axios = require('axios');
const clientId = 'client-id-value';
const clientSecret = 'client-sec-value';

async function getAppAccessToken() {
  const response = await axios.post('https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(
          clientId + ':' + clientSecret
        ).toString('base64')
      }
    }
  );
  return response.data.access_token;
}

async function testGenres() {
  const token = await getAppAccessToken();
  const response = await axios.get('https://api.spotify.com/v1/recommendations/available-genre-seeds', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(response.data);
}

testGenres();