# Deployment Guide

This folder contains the Azure deployment templates and scripts for the Spotify Workout Playlist application.

## Architecture

The deployment creates the following Azure resources based on the architecture diagram:

- **Azure Cosmos DB**: NoSQL database for storing user data, preferences, and playlist information
- **Azure Container Registry**: Private registry for storing container images
- **Azure Container Apps**: Serverless container platform for the API backend
- **Azure App Service**: Web hosting for the React frontend
- **Azure Key Vault**: Secure storage for secrets and configuration
- **Azure Application Insights**: Application monitoring and telemetry
- **Azure Log Analytics**: Centralized logging
- **Azure AI Foundry** (optional): For future AI functionality

## Prerequisites

1. Azure CLI installed and configured
2. Docker installed (for building container images)
3. PowerShell (for running deployment scripts)
4. Valid Spotify API credentials

## Environment Variables

Set the following environment variables before deployment:

```powershell
$env:SPOTIFY_CLIENT_ID = "your-spotify-client-id"
$env:SPOTIFY_CLIENT_SECRET = "your-spotify-client-secret"
```

## Quick Deployment

1. **Clone the repository and navigate to the deploy folder:**
   ```powershell
   cd deploy
   ```

2. **Run the deployment script:**
   ```powershell
   .\deploy.ps1 -ResourceGroupName "rg-spotify-workout-playlist" -Location "East US"
   ```

3. **Build and push container images:**
   ```powershell
   # Login to the created container registry
   az acr login --name <container-registry-name>
   
   # Build and push API image
   docker build -t <registry-name>.azurecr.io/spotify-workout-api:latest ../backend
   docker push <registry-name>.azurecr.io/spotify-workout-api:latest
   
   # Build and push frontend image
   docker build -t <registry-name>.azurecr.io/spotify-workout-frontend:latest ../frontend
   docker push <registry-name>.azurecr.io/spotify-workout-frontend:latest
   ```

## Manual Deployment

1. **Create Resource Group:**
   ```bash
   az group create --name rg-spotify-workout-playlist --location "East US"
   ```

2. **Deploy Infrastructure:**
   ```bash
   az deployment group create \
     --resource-group rg-spotify-workout-playlist \
     --template-file main.bicep \
     --parameters main.bicepparam
   ```

## Configuration

### Parameters

Key parameters you can modify in `main.bicepparam`:

- `appName`: Name of your application
- `environment`: Environment (dev, test, prod)
- `location`: Azure region
- `enableAiFoundry`: Enable Azure AI Foundry for future AI features
- `keyVaultAccessObjectId`: Your user object ID for Key Vault access

### Secrets

The following secrets are stored in Azure Key Vault:

- `spotify-client-id`: Your Spotify application client ID
- `spotify-client-secret`: Your Spotify application client secret

## Monitoring

- **Application Insights**: Monitor application performance and errors
- **Log Analytics**: Centralized logging for all components
- **Container App Logs**: Real-time container logs

## Scaling

The deployment is configured for automatic scaling:

- **Container Apps**: Scale based on HTTP requests (1-10 instances)
- **App Service**: Manual scaling on Basic tier (upgrade to Standard/Premium for auto-scale)
- **Cosmos DB**: Serverless mode for automatic scaling

## Security

Security features included:

- All traffic over HTTPS
- Secrets stored in Key Vault
- Managed identities for service authentication
- Network security groups and private endpoints (can be added)

## Costs

Estimated monthly costs (East US, basic usage):

- Cosmos DB (Serverless): ~$5-20
- Container Apps: ~$10-30
- App Service (Basic B1): ~$13
- Container Registry (Basic): ~$5
- Key Vault: ~$3
- Application Insights: ~$5-15

**Total: ~$40-85/month**

## Troubleshooting

### Common Issues

1. **Container images not found**: Ensure images are built and pushed to the container registry
2. **Key Vault access denied**: Verify `keyVaultAccessObjectId` parameter
3. **Spotify API errors**: Check Spotify credentials in Key Vault
4. **Container app not starting**: Check container logs in Azure portal

### Useful Commands

```bash
# Check deployment status
az deployment group show --resource-group rg-spotify-workout-playlist --name <deployment-name>

# View container app logs
az containerapp logs show --name <container-app-name> --resource-group rg-spotify-workout-playlist

# Update container app image
az containerapp update --name <container-app-name> --resource-group rg-spotify-workout-playlist --image <new-image>
```

## Next Steps

1. Set up CI/CD pipeline using the included `azure-pipelines.yml`
2. Configure custom domains and SSL certificates
3. Enable AI functionality by setting `enableAiFoundry: true`
4. Add monitoring alerts and dashboards
5. Implement backup strategies for Cosmos DB