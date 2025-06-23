# 🗺️ Google Maps API Setup Guide

To use the Trip Planning feature with Google Maps integration, you need to set up a Google Maps API key.

## Step 1: Get Google Maps API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/
2. **Create a new project** or select an existing one
3. **Enable the following APIs**:
   - Maps JavaScript API
   - Places API
   - Geocoding API
4. **Create credentials**:
   - Go to "Credentials" in the left sidebar
   - Click "Create Credentials" → "API Key"
   - Copy your API key

## Step 2: Configure API Key Restrictions (Recommended)

1. **Click on your API key** to edit it
2. **Set Application restrictions**:
   - Choose "HTTP referrers (web sites)"
   - Add: `http://localhost:3000/*` and `https://yourdomain.com/*`
3. **Set API restrictions**:
   - Choose "Restrict key"
   - Select: Maps JavaScript API, Places API, Geocoding API

## Step 3: Add API Key to Your App

1. **Create environment file**:
   ```bash
   cd /Users/jeanlee/travel-diary-app/client
   cp .env.example .env
   ```

2. **Edit the .env file**:
   ```bash
   REACT_APP_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
   REACT_APP_API_URL=http://localhost:5001/api
   ```

3. **Restart the application**:
   ```bash
   cd /Users/jeanlee/travel-diary-app
   docker-compose down
   docker-compose up -d
   ```

## Step 4: Test the Trip Planning Feature

1. **Go to your app**: http://localhost:3000
2. **Create or open a trip**
3. **Click "Plan Trip"** button
4. **You should see**:
   - Google Maps interface
   - Places search functionality
   - Drag and drop itinerary planning

## 🎯 Features Available:

### 🔍 **Places Search**
- Search for restaurants, attractions, hotels
- Auto-complete suggestions
- Place details with ratings

### 🗺️ **Interactive Map**
- Click on map to select locations
- View selected places as markers
- Zoom and pan around your destination

### 📅 **Drag & Drop Itinerary**
- Drag places from search results
- Drop onto specific days
- Organize your daily schedule
- Set times and durations

### 💾 **Save & Sync**
- Save your itinerary to the trip
- Sync across all devices
- Share with travel companions

## 🚨 Important Notes:

- **Free Tier**: Google Maps API has a generous free tier
- **Billing**: Set up billing account for production use
- **Quotas**: Monitor your API usage in Google Cloud Console
- **Security**: Never commit API keys to version control

## 🔧 Troubleshooting:

### Map not loading?
- Check if API key is correctly set in `.env`
- Verify APIs are enabled in Google Cloud Console
- Check browser console for error messages

### Places search not working?
- Ensure Places API is enabled
- Check API key restrictions
- Verify network connectivity

### Need help?
- Check Google Maps Platform documentation
- Review API quotas and billing
- Test with a simple HTML page first

## 🎉 You're Ready!

Once configured, your Travel Diary app will have full Google Maps integration for trip planning!
