$pair = "31b203dd44d14a17830e87d8017a072e:59857d53d34249e1b7586b8aa71be169"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pair))
curl -X POST -H "Authorization: Basic $encoded" -d "grant_type=client_credentials" https://accounts.spotify.com/api/token

# then run 
# curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" https://api.spotify.com/v1/recommendations/available-genre-seeds