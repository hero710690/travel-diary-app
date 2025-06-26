# Google Maps API Setup Guide

## Current Issue
The Google Maps functionality is currently not working because the API key is invalid. The application will show fallback components with manual place entry until a valid API key is configured.

## How to Fix Google Maps

### Step 1: Get a Google Maps API Key

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/

2. **Create or Select a Project**
   - Create a new project or select an existing one

3. **Enable Required APIs**
   - Go to "APIs & Services" > "Library"
   - Enable these APIs:
     - **Maps JavaScript API**
     - **Places API**
     - **Geocoding API** (optional, for reverse geocoding)

4. **Create API Key**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "API Key"
   - Copy the generated API key

### Step 2: Configure API Key Restrictions (Recommended)

1. **Application Restrictions**
   - Set "HTTP referrers (web sites)"
   - Add your domain: `https://d16hcqzmptnoh8.cloudfront.net/*`
   - Add localhost for development: `http://localhost:3000/*`

2. **API Restrictions**
   - Restrict key to only the APIs you enabled:
     - Maps JavaScript API
     - Places API
     - Geocoding API

### Step 3: Update Environment Variables

1. **Update .env file**
   ```bash
   # Replace the invalid key with your new key
   REACT_APP_GOOGLE_MAPS_API_KEY=YOUR_NEW_API_KEY_HERE
   ```

2. **Rebuild and Deploy**
   ```bash
   npm run build
   aws s3 sync build/ s3://travel-diary-prod-frontend --region ap-northeast-1 --delete
   # Create CloudFront invalidation
   ```

### Step 4: Test the Integration

1. **Visit the Trip Planning Page**
   - Go to any trip and click "Plan Trip"
   - The map should now load properly
   - Places search should work

2. **Verify Functionality**
   - ✅ Map displays correctly
   - ✅ Places search returns results
   - ✅ Clicking on map shows location details
   - ✅ Markers appear for planned locations

## Current Fallback Features

While Google Maps is not working, the application provides:

### Map Fallback
- Shows location coordinates
- Lists planned locations
- Provides setup instructions

### Places Search Fallback
- Manual place entry form
- Add places by name and address
- Still integrates with itinerary

## Cost Considerations

Google Maps APIs have usage-based pricing:
- **Maps JavaScript API**: $7 per 1,000 loads
- **Places API**: $17 per 1,000 requests
- **Geocoding API**: $5 per 1,000 requests

**Free Tier**: $200 credit per month (covers ~28K map loads)

## Security Best Practices

1. **Always restrict your API key**
2. **Monitor usage in Google Cloud Console**
3. **Set up billing alerts**
4. **Use environment variables (never commit keys to code)**

## Troubleshooting

### Common Issues:
1. **"REQUEST_DENIED"** - API key invalid or APIs not enabled
2. **"OVER_QUERY_LIMIT"** - Exceeded quota limits
3. **"INVALID_REQUEST"** - Check API restrictions
4. **Map not loading** - Check browser console for errors

### Debug Steps:
1. Test API key with curl:
   ```bash
   curl "https://maps.googleapis.com/maps/api/js?key=YOUR_KEY&libraries=places"
   ```
2. Check browser network tab for failed requests
3. Verify API key restrictions match your domain
4. Check Google Cloud Console for quota usage

## Support

If you need help setting up Google Maps:
1. Check the browser console for error messages
2. Verify API key configuration in Google Cloud Console
3. Test with a simple HTML page first
4. Contact Google Cloud Support for API-specific issues
