# Travel Diary Web App

A comprehensive travel planning and diary web application that allows users to plan trips, manage budgets, track expenses, and create travel journals.

## Features

### Core Features (MVP)
- **User Authentication**: Register, login, and profile management
- **Trip Planning**: Create and manage trips with destinations, dates, and budgets
- **Itinerary Management**: Plan daily activities and optimize routes
- **Budget & Expense Tracking**: Set budgets by category and track spending
- **Travel Journal**: Write daily entries with photos and memories
- **Collaboration**: Invite travel companions to collaborate on trips
- **Packing Lists**: Create and manage packing checklists
- **Document Storage**: Store important travel documents
- **Trip Sharing**: Generate shareable links for trip itineraries

### Technical Features
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Collaboration**: Multiple users can edit trips simultaneously
- **Auto-generated Content**: Automatically create journal entries from itinerary and expenses
- **Multi-currency Support**: Handle expenses in different currencies
- **Map Integration**: Visual trip planning with maps
- **Photo Management**: Upload and organize travel photos

## Technology Stack

### Backend
- **Node.js** with Express.js
- **MongoDB** with Mongoose ODM
- **JWT** for authentication
- **Cloudinary** for image storage
- **Google Maps API** for location services

### Frontend
- **React** with TypeScript
- **React Router** for navigation
- **React Query** for data fetching
- **Tailwind CSS** for styling
- **React Hook Form** for form management
- **Recharts** for data visualization

## Project Structure

```
travel-diary-app/
├── server/                 # Backend API
│   ├── controllers/        # Route controllers
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── middleware/        # Custom middleware
│   ├── config/            # Configuration files
│   └── utils/             # Utility functions
├── client/                # Frontend React app
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── contexts/      # React contexts
│   │   ├── services/      # API services
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   └── public/            # Static assets
└── README.md
```

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd travel-diary-app
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install server dependencies
   cd server
   npm install

   # Install client dependencies
   cd ../client
   npm install
   ```

3. **Environment Setup**
   
   Create a `.env` file in the `server` directory:
   ```bash
   cp server/.env.example server/.env
   ```
   
   Update the environment variables:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/travel-diary
   JWT_SECRET=your-super-secret-jwt-key-here
   CLIENT_URL=http://localhost:3000
   GOOGLE_MAPS_API_KEY=your-google-maps-api-key
   CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
   CLOUDINARY_API_KEY=your-cloudinary-api-key
   CLOUDINARY_API_SECRET=your-cloudinary-api-secret
   ```

4. **Database Setup**
   
   Make sure MongoDB is running locally or update the `MONGODB_URI` to point to your cloud database.

5. **Start the Development Servers**
   
   From the root directory:
   ```bash
   npm run dev
   ```
   
   This will start both the backend server (port 5000) and frontend development server (port 3000).

   Alternatively, you can start them separately:
   ```bash
   # Terminal 1 - Backend
   cd server
   npm run dev

   # Terminal 2 - Frontend
   cd client
   npm start
   ```

6. **Access the Application**
   
   Open your browser and navigate to `http://localhost:3000`

## API Documentation

### Authentication Endpoints
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/profile` - Update user profile

### Trip Endpoints
- `GET /api/trips` - Get user's trips
- `POST /api/trips` - Create new trip
- `GET /api/trips/:id` - Get trip details
- `PUT /api/trips/:id` - Update trip
- `DELETE /api/trips/:id` - Delete trip

### Expense Endpoints
- `GET /api/expenses/trip/:tripId` - Get trip expenses
- `POST /api/expenses` - Create expense
- `PUT /api/expenses/:id` - Update expense
- `DELETE /api/expenses/:id` - Delete expense

### Journal Endpoints
- `GET /api/journals/trip/:tripId` - Get trip journals
- `POST /api/journals` - Create journal entry
- `PUT /api/journals/:id` - Update journal entry
- `DELETE /api/journals/:id` - Delete journal entry

## Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow React best practices and hooks patterns
- Use functional components over class components
- Implement proper error handling and loading states

### Database Design
- Use proper indexing for performance
- Implement data validation at both client and server levels
- Use MongoDB aggregation for complex queries

### Security
- All API endpoints require authentication (except public routes)
- Input validation and sanitization
- Rate limiting on API endpoints
- Secure file upload handling

## Deployment

### Backend Deployment
1. Set up a MongoDB Atlas cluster or other cloud database
2. Deploy to platforms like Heroku, Railway, or DigitalOcean
3. Configure environment variables for production
4. Set up proper logging and monitoring

### Frontend Deployment
1. Build the React app: `npm run build`
2. Deploy to platforms like Netlify, Vercel, or AWS S3
3. Configure environment variables for API endpoints

## Future Enhancements

### Phase 2 Features
- OCR for receipt scanning
- Advanced expense splitting
- Video and audio journal entries
- Integration with booking platforms (Klook, KKday)
- Native mobile apps (iOS/Android)
- Real-time flight tracking
- Social features (follow, like, comment)
- Advanced analytics and insights

### Technical Improvements
- Offline support with service workers
- Push notifications
- Advanced caching strategies
- Performance optimizations
- Automated testing suite
- CI/CD pipeline

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions, please open an issue in the GitHub repository or contact the development team.
