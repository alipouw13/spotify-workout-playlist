$pair = "31b203dd44d14a17830e87d8017a072e:59857d53d34249e1b7586b8aa71be169"
$encoded = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($pair))
curl -X POST -H "Authorization: Basic $encoded" -d "grant_type=client_credentials" https://accounts.spotify.com/api/token
curl -H "Authorization: Bearer BQBhFQDsLvL9w4fVbwxkqqXyYKcm0dDh17em3swx5atCiTuiae17ZBxCXm3ukSEUd25pCuOC_zV9bHwS5C6NAlYhS-ZzxWd-jDFxn_YTBuAKLzXFA4F0SLgou36NTUzxeZKdgca9w0A" https://api.spotify.com/v1/recommendations/available-genre-seeds