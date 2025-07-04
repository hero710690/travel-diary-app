# 🌍 Travel Diary App

A comprehensive full-stack travel planning and diary application built with modern serverless architecture.

## 🏗️ Architecture

- **Frontend**: React.js with TypeScript, hosted on AWS S3 + CloudFront
- **Backend**: Python Lambda handler with API Gateway
- **Database**: DynamoDB with optimized table design
- **Maps Integration**: Google Maps API with Places service
- **Authentication**: JWT-based user authentication
- **Infrastructure**: AWS serverless stack
- **Deployment**: Automated CI/CD pipeline

## ✨ Features Implemented

### 🎯 **Core Functionality**
- ✅ **User Authentication** - Secure JWT-based login/registration
- ✅ **Trip Management** - Create, edit, and organize trips
- ✅ **Interactive Trip Planning** - Drag-and-drop itinerary builder
- ✅ **Google Maps Integration** - Interactive map with place selection
- ✅ **Place Search & Selection** - Search places and add to itinerary
- ✅ **Hotel Search** - Dedicated hotel search and booking integration
- ✅ **Flight Integration** - Add flights to daily itinerary
- ✅ **Collaborative Planning** - Multi-user trip collaboration
- ✅ **Wish Level Rating** - Personal rating system for places (1-5 hearts)

### 🗺️ **Map & Places Features**
- ✅ **Interactive Google Maps** - Click to select places directly on map
- ✅ **Smart Place Detection** - Prioritizes establishments over generic locations
- ✅ **Place Details** - Google ratings, reviews, place types, and photos
- ✅ **Exact Place Selection** - Click on specific places (not nearby search)
- ✅ **Visual Feedback** - Temporary markers with color coding
- ✅ **Places Search** - Autocomplete search with detailed place information

### 📱 **User Interface**
- ✅ **Responsive Design** - Mobile-first approach with Tailwind CSS
- ✅ **Clean Modern UI** - Professional travel-themed design
- ✅ **Drag & Drop Interface** - Intuitive itinerary building
- ✅ **Real-time Updates** - Live collaboration features
- ✅ **Toast Notifications** - User feedback system
- ✅ **Loading States** - Smooth user experience

### 🤝 **Collaboration & Sharing** ✅ **NEW**
- ✅ **Advanced Share Links** - Generate secure, customizable share links
- ✅ **Permission Management** - View-only or full editing permissions
- ✅ **Password Protection** - Secure sharing with optional passwords
- ✅ **Public/Private Sharing** - Control link visibility and access
- ✅ **Collaborative Editing** - Real-time trip planning with others
- ✅ **Share Link Management** - Create, update, and revoke share links
- ✅ **Seamless Access** - Direct links to view or edit shared trips
- ✅ **Copy-to-Clipboard** - Easy link sharing with visual feedback

### 📊 **Trip Planning Tools**
- ✅ **Daily Itinerary** - Organize activities by day and time
- ✅ **Activity Cards** - Rich information cards with Google data
- ✅ **Duration Tracking** - Estimated time for each activity
- ✅ **Notes System** - Personal notes for each activity
- ✅ **Trip Statistics** - Overview of places, days, and activities

## 🚀 Deployment Workflow

### **Latest Deployment** ✅ **2025-06-29**
- **Version**: Hotel Address Cleanup v1.5
- **Frontend Bundle**: main.7814f360.js (166.21 kB gzipped)
- **New Features**: Cleaned hotel addresses by removing status text suffixes
- **Status**: ✅ **LIVE** - Clean hotel address display implemented
- **CloudFront**: Cache invalidated and updated

### **Recent Updates**
- ✅ **Hotel Address Cleanup** - Removed status text from hotel addresses
- ✅ **Status Badge Positioning** - Status badges appear only after hotel names
- ✅ **Flight Badge Removal** - Cleaner flight cards without status badges
- ✅ **No Duplication** - Hotel names appear only once with proper status badges

### **Production Environment**
- **Frontend URL**: https://d16hcqzmptnoh8.cloudfront.net
- **Backend API**: https://api.travel-diary.com (API Gateway)
- **Region**: Asia Pacific (Tokyo) - ap-northeast-1

### **Deployment Process**

#### **Frontend Deployment**
```bash
# 1. Build React application
cd client
npm run build

# 2. Deploy to S3
aws s3 sync build/ s3://travel-diary-prod-frontend --region ap-northeast-1 --delete

# 3. Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1JD48IT5LNOGJ \
  --paths "/*"
```

#### **Backend Deployment**
```bash
# 1. Package Lambda function
cd python-backend
zip -r travel-diary-lambda.zip working_complete_handler.py

# 2. Update Lambda function
aws lambda update-function-code \
  --function-name travel-diary-api \
  --zip-file fileb://travel-diary-lambda.zip \
  --region ap-northeast-1

# 3. Update function configuration if needed
aws lambda update-function-configuration \
  --function-name travel-diary-api \
  --handler working_complete_handler.lambda_handler \
  --runtime python3.11 \
  --environment Variables='{
    "JWT_SECRET_KEY":"your-secret",
    "AWS_REGION":"ap-northeast-1"
  }'
```

### **Infrastructure Components**

#### **AWS Resources**
- **S3 Bucket**: `travel-diary-prod-frontend` (Static website hosting)
- **CloudFront Distribution**: `E1JD48IT5LNOGJ` (CDN)
- **Lambda Function**: `travel-diary-api` (Backend API handler)
- **API Gateway**: REST API with CORS enabled
- **DynamoDB Tables**: 
  - `travel-diary-users` (User data)
  - `travel-diary-trips` (Trip data)
  - `travel-diary-itinerary` (Itinerary items)

#### **Environment Variables**
```bash
# Backend (Lambda)
JWT_SECRET_KEY=your-jwt-secret-key
AWS_REGION=ap-northeast-1

# Frontend (React)
REACT_APP_API_URL=https://your-api-gateway-url
REACT_APP_GOOGLE_MAPS_API_KEY=your-google-maps-key
```

## 🛠️ Local Development

### **Prerequisites**
- Node.js 18+
- Python 3.11+
- AWS CLI configured
- Google Maps API key

### **Setup**
```bash
# Clone repository
git clone <repository-url>
cd travel-diary-app

# Frontend setup
cd client
npm install
cp .env.example .env.local
# Add your Google Maps API key to .env.local

# Backend setup
cd ../python-backend
# No virtual environment needed for Lambda handler
# Dependencies are minimal (boto3 is provided by Lambda runtime)
```

### **Run Locally**
```bash
# Start frontend
cd client
npm start

# For backend testing, you can use AWS SAM or test the handler directly
# The Lambda handler is designed to run in AWS Lambda environment
```

### **Testing Lambda Handler Locally**
```bash
# Install AWS SAM CLI for local testing
pip install aws-sam-cli

# Create a simple test event
echo '{
  "httpMethod": "GET",
  "path": "/health",
  "headers": {},
  "body": null
}' > test-event.json

# Test the handler
python -c "
import json
from working_complete_handler import lambda_handler
with open('test-event.json') as f:
    event = json.load(f)
result = lambda_handler(event, {})
print(json.dumps(result, indent=2))
"
```

## 🧪 Testing

### **Frontend Testing**
```bash
cd client
npm test                    # Run tests
npm run test:coverage      # Run with coverage
```

### **Backend Testing**
```bash
cd python-backend
# Test individual functions
python -c "
from working_complete_handler import *
# Test specific functions
print('Testing health endpoint...')
"
```

## 📦 Project Structure

```
travel-diary-app/
├── client/                           # React frontend
│   ├── src/
│   │   ├── components/              # Reusable components
│   │   ├── pages/                   # Page components
│   │   ├── services/                # API services
│   │   ├── types/                   # TypeScript types
│   │   └── utils/                   # Utility functions
│   ├── public/                      # Static assets
│   └── package.json
├── python-backend/                  # Lambda backend
│   └── working_complete_handler.py  # Main Lambda handler
├── infrastructure/                  # Infrastructure as code
└── README.md
```

## 🔧 Key Technologies

### **Frontend Stack**
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Query** for state management
- **React Router** for navigation
- **React DnD** for drag-and-drop
- **Google Maps API** for maps integration
- **Axios** for API calls

### **Backend Stack**
- **Python 3.11** Lambda handler
- **Boto3** for AWS DynamoDB operations
- **JSON** for request/response handling
- **Hashlib** for password hashing
- **UUID** for token generation
- **Built-in CORS** handling

### **AWS Services**
- **Lambda** - Serverless compute (Python 3.11 runtime)
- **API Gateway** - REST API management with CORS
- **DynamoDB** - NoSQL database
- **S3** - Static file hosting
- **CloudFront** - Content delivery network
- **IAM** - Identity and access management

## 🔍 Backend API Endpoints

The Lambda handler supports the following endpoints:

### **Authentication**
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user info

### **Trips**
- `GET /trips` - Get user's trips
- `POST /trips` - Create new trip
- `GET /trips/{trip_id}` - Get specific trip
- `PUT /trips/{trip_id}` - Update trip
- `DELETE /trips/{trip_id}` - Delete trip

### **Itinerary**
- `GET /trips/{trip_id}/itinerary` - Get trip itinerary
- `POST /trips/{trip_id}/itinerary` - Add itinerary item
- `PUT /itinerary/{item_id}` - Update itinerary item
- `DELETE /itinerary/{item_id}` - Delete itinerary item

### **Utility**
- `GET /health` - Health check
- `OPTIONS /*` - CORS preflight handling

## 🚀 Recent Updates

### **2025-07-03 - Flight Card Date Display Enhancement** ✅ **ENHANCED**

#### **✈️ Complete Flight Schedule Information**
- **Added Departure & Arrival Dates**: Flight cards now show both dates and times for complete schedule context
- **Smart Date Formatting**: Displays dates as "Mon, Jan 15" format for compact, readable presentation
- **Cross-Page Consistency**: Enhancement applies to all flight cards across trip planning, detail, and shared pages
- **Multi-Day Flight Support**: Clear indication of flights spanning multiple days or time zones

#### **📅 Enhanced Flight Display**
- **Before**: Only showed "Dep: 10:30 AM" and "Arr: 2:45 PM"
- **After**: Shows "Mon, Jan 15" above times for both departure and arrival
- **Professional Layout**: Maintains clean card design while adding essential date information
- **Conditional Display**: Dates only appear when available, graceful handling of missing data

#### **🌍 Real-World Flight Scenarios**
- **Red-Eye Flights**: Clear distinction between departure and arrival dates
- **International Travel**: Better context for cross-timezone flight schedules
- **Multi-Day Trips**: Easy identification of which day each flight occurs
- **Complex Itineraries**: Improved coordination between connecting flights

#### **📊 Technical Implementation**
- **Bundle Size**: 167.63 kB gzipped (+86B for date formatting functionality)
- **Safe Date Parsing**: Error handling and fallbacks for robust date display
- **Responsive Design**: Maintains card layout integrity across all screen sizes

### **2025-07-03 - Flight Form Flexibility Enhancement** ✅ **IMPROVED**

#### **✈️ Cross-Day Flight Support**
- **Removed Arrival Date Constraints**: Flight arrival dates no longer restricted to trip end date
- **Real-World Flight Scenarios**: Now supports overnight flights, long-haul international travel, and multi-day journeys
- **Maintained Validation**: Required field validation preserved while removing restrictive constraints
- **User Experience**: No more "invalid date" errors for legitimate cross-day flights

#### **🌍 Supported Flight Types**
- **Red-Eye Flights**: Depart late night, arrive early morning next day
- **International Long-Haul**: Flights crossing multiple time zones and days
- **Multi-Stop Journeys**: Extended travel time with layovers
- **Charter/Private Flights**: Flexible scheduling not bound by trip dates
- **Delayed Flights**: Accommodates schedule changes extending beyond trip dates

#### **📊 Technical Improvements**
- **Bundle Optimization**: 167.5 kB gzipped (-4B for removed constraints)
- **Form Flexibility**: Departure dates still constrained (logical), arrival dates unrestricted
- **Data Integrity**: All validation maintained except restrictive date limits

### **2025-06-30 - Hyperlink Functionality in Notes** ✅ **NEW**

#### **🔗 Smart URL Detection & Conversion**
- **Automatic Link Detection**: URLs in notes automatically converted to clickable hyperlinks
- **Multiple URL Formats**: Supports http://, https://, and www. URLs
- **Security Features**: Links open in new tab with `noopener noreferrer` for security
- **Visual Design**: Blue color with hover effects, proper text wrapping for long URLs

#### **📝 Enhanced Note Experience**
- **Activity Notes**: All activity notes now support clickable links
- **Hotel Notes**: Hotel booking links and references now clickable
- **Trip Detail Notes**: Notes in trip detail view support hyperlinks
- **Itinerary Notes**: Planning notes with links are now interactive

#### **🛠️ Technical Implementation**
- **New Utility**: `linkUtils.tsx` with regex-based URL detection
- **React Components**: Converts text to React elements with proper link handling
- **Click Prevention**: Prevents parent element clicks when clicking links
- **Bundle Size**: 167.5 kB gzipped (+170B for hyperlink functionality)

### **2025-06-30 - Hotel Status Badge Logic & UI Consistency Fixes** ✅ **FIXED**

#### **🏨 Hotel Status Badge Logic Improvements**
- **Fixed Poor Logic**: Replaced flawed hotel status detection with sophisticated analysis
- **Proper Status Display**: Hotel badges now correctly show Check-in, Check-out, or Stay
- **Smart Analysis**: Analyzes all hotel occurrences across entire itinerary to determine sequence
- **Cross-Page Consistency**: Same logic applied to both Trip Detail and Shared Trip pages

#### **🎨 UI Consistency & Polish**
- **Review Count Fix**: Eliminated "Google0" and "(0 reviews)" displays
- **Text Overflow Prevention**: All note fields and descriptions now wrap properly within cards
- **Card Padding Standardization**: Uniform 24px padding across all card types
- **Clean Rating Displays**: Shows "4.5" instead of "4.5 Google" or "4.5 (0 reviews)"

#### **📊 Technical Improvements**
- **Bundle Optimization**: 167.33 kB gzipped (-105B after debug cleanup)
- **Code Quality**: Removed debug messages following development guidelines
- **Component Updates**: Enhanced TripDetailPage, SharedTripPage, HotelCard components
- **Guideline Compliance**: Followed all must_follow.md rules for clean production code

### **2025-06-28 - Enhanced Sharing Features** ✅ **NEW**
- ✅ **Advanced Share Links** - Generate secure, customizable share links with permissions
- ✅ **Collaborative Editing** - Real-time trip planning with shared edit access
- ✅ **Password Protection** - Optional password security for sensitive trips
- ✅ **Public/Private Sharing** - Control link visibility and access levels
- ✅ **ShareModal Component** - Comprehensive sharing interface with copy-to-clipboard
- ✅ **SharedTripEditPage** - Full editing capabilities for shared users
- ✅ **Permission Management** - View-only vs full editing permissions
- ✅ **Share Link Management** - Create, update, and revoke share links
- ✅ **System Documentation** - Updated inventory and component status

### **Previous Updates**

### **Latest Features Added**
- ✅ **Exact Place Selection** - Click directly on places instead of nearby search
- ✅ **Enhanced Place Data** - Google ratings and place types in activity cards
- ✅ **Left-Aligned Text** - Consistent text alignment throughout UI
- ✅ **Hotel Search Integration** - Dedicated hotel search functionality
- ✅ **Pencil Icon Removal** - Cleaner trip detail page design
- ✅ **Smart Place Filtering** - Prioritizes actual establishments over geographic areas

### **Performance Optimizations**
- Bundle size optimization (151.67 kB gzipped)
- Efficient Lambda handler with minimal dependencies
- Optimized Google Maps integration
- Fast CloudFront CDN delivery
- DynamoDB optimized queries

## 🔮 Future Enhancements

### **Planned Features**
- 📱 Mobile app (React Native)
- 🌐 Offline functionality
- 📊 Advanced trip analytics
- 🎨 Custom themes
- 🔗 Social sharing
- 📧 Email itinerary export
- 💰 Budget tracking
- 🌤️ Weather integration

### **Backend Improvements**
- Enhanced error handling
- Request validation middleware
- Rate limiting
- Caching layer
- Database connection pooling

## 🚧 Future Features & Roadmap

### 🗺️ **Map View Integration** 
**Status**: 📋 **PLANNED** - Under consideration

**Description**: Add interactive map views to trip detail and shared trip pages for enhanced spatial understanding and better trip visualization.

**Proposed Features**:
- ✅ **Trip Detail Page Map** - Interactive map showing all trip locations with color-coded markers
- ✅ **Shared Trip Page Map** - Read-only map view for trip participants and viewers
- ✅ **Day-by-Day Filtering** - Toggle map markers by specific days
- ✅ **Responsive Design** - Adaptive layouts for desktop, tablet, and mobile
- ✅ **Location Details** - Click markers to view activity details
- ✅ **Route Visualization** - Optional routes between consecutive locations

**Benefits**:
- 🎯 **Enhanced Trip Management** - Visual context for editing and planning
- 🤝 **Better Collaboration** - Shared visual reference for trip discussions
- 📍 **Spatial Understanding** - See distances and relationships between locations
- 🗺️ **Professional Presentation** - More engaging trip sharing experience

**Technical Considerations**:
- Reuse existing GoogleMap component with marker conversion logic
- Implement responsive UI patterns (side-by-side, toggle, collapsible)
- Consider performance impact of rendering multiple markers
- Maintain consistency with existing map functionality

**Priority**: Medium - Valuable enhancement but not critical for core functionality

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Google Maps Platform for mapping services
- AWS for serverless infrastructure
- React community for excellent tooling
- Python community for simple, elegant solutions

---

**Built with ❤️ for travelers who love to plan and explore the world** 🌍✈️
