$pair = "un:pw"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pair))
curl -X POST -H "Authorization: Basic $encoded" -d "grant_type=client_credentials" https://accounts.spotify.com/api/token

# then run 
# curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.spotify.com/v1/recommendations/available-genre-seeds