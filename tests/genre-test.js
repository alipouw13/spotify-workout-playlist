// test-app-token.js
const axios = require('axios');
const clientId = '31b203dd44d14a17830e87d8017a072e';
const clientSecret = '59857d53d34249e1b7586b8aa71be169';

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