# LenteXhibit Frontend-Backend Integration Guide

## Overview
Successfully integrated the HomepageUI frontend files with the Backend API. All pages now properly communicate with the Express.js backend and MongoDB database.

---

## Key Changes Made

### 1. **Backend Fixes**
- ✅ Server is configured with proper CORS support for localhost and production
- ✅ Session management with MongoDB session store
- ✅ All API routes properly protected with authentication middleware
- ✅ Active theme endpoint at `/api/themes/active` (placed before `/:id` route)

### 2. **Homepage (index.html)**
- ✅ Added `loadCurrentTheme()` function to fetch and display active voting theme
- ✅ Improved error handling for all async operations
- ✅ Added voting functionality with `toggleVote()` function
- ✅ Works properly display featured badge and vote counts
- ✅ Rankings section updates dynamically

### 3. **Frontend JavaScript (homepage.js)**
- ✅ All API calls include `credentials: 'include'` for session cookies
- ✅ Proper error handling and user feedback
- ✅ Authentication checking on page load
- ✅ Vote tracking with immediate UI updates
- ✅ Search functionality works with backend

### 4. **CSS Enhancements (homepage-styles.css)**
- ✅ Added `.featured-badge` styles for work cards
- ✅ Added `.vote-btn` styles for voting buttons
- ✅ Responsive design maintained

### 5. **New Common Media Script (media-common.js)**
- ✅ Reusable script for Photos, Graphics, and Videos pages
- ✅ Centralized API configuration (development vs production)
- ✅ Authentication, voting, and search functionality
- ✅ Sorting and filtering support
- ✅ Statistics updates

### 6. **Shared Media Styles (media-styles.css)**
- ✅ Consistent styling for all media pages
- ✅ Responsive grid layout
- ✅ Vote button and featured badge styling

### 7. **Updated Portfolio Page (portfolio.html)**
- ✅ Proper API integration for loading portfolios
- ✅ Filter by cluster functionality
- ✅ Search portfolios feature
- ✅ Create portfolio modal for members

---

## API Endpoints Used

### Authentication
- `GET /api/auth/verify` - Check current user session
- `POST /api/auth/signup` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user

### Works
- `GET /api/works` - Get all works with filters (category, featured, search)
- `GET /api/works/rankings/:category` - Get ranked works by category
- `POST /api/works` - Create new work (members only)
- `PUT /api/works/:id` - Update work
- `DELETE /api/works/:id` - Delete work
- `PATCH /api/works/:id/featured` - Toggle featured status (admin only)

### Portfolios
- `GET /api/portfolios` - Get all portfolios
- `GET /api/portfolios/user/:userId` - Get portfolio by user ID
- `POST /api/portfolios` - Create portfolio (members only)
- `PUT /api/portfolios/:id` - Update portfolio
- `DELETE /api/portfolios/:id` - Delete portfolio

### Themes
- `GET /api/themes` - Get all themes
- `GET /api/themes/active` - Get currently active theme
- `GET /api/themes/:id` - Get theme by ID
- `POST /api/themes` - Create theme (admin only)
- `PUT /api/themes/:id` - Update theme (admin only)
- `DELETE /api/themes/:id` - Delete theme (admin only)

### Votes
- `POST /api/votes` - Vote for a work
- `DELETE /api/votes/:workId` - Remove vote
- `GET /api/votes/check/:workId` - Check if user voted
- `GET /api/votes/stats/overview` - Get voting statistics

---

## How to Use

### Development Environment
1. Make sure MongoDB is running locally or connected to MongoDB Atlas
2. Update `.env` file with correct `MONGODB_URI`
3. Start backend: `node server.js` (runs on `http://localhost:5000`)
4. Open frontend files in browser at `http://localhost:3000` or open HTML files directly
5. The frontend will auto-detect development environment and use `http://localhost:5000/api`

### Production Environment
1. Backend deployed to Render or similar hosting
2. Update `.env` with production `MONGODB_URI` and `FRONTEND_URL`
3. Frontend automatically uses production API URL when deployed
4. Session cookies work across domains with CORS configuration

---

## Features Implemented

### For All Users
- ✅ View featured works
- ✅ Browse works by category (Photos, Graphics, Videos)
- ✅ View rankings
- ✅ Search works
- ✅ View current voting theme
- ✅ Browse member portfolios

### For Logged-In Users
- ✅ Vote for works
- ✅ View personal portfolio (members only)
- ✅ Create/edit/delete works (members only)
- ✅ Create portfolio (members only)
- ✅ Access theme submissions (members only)

### For Admins
- ✅ Manage users
- ✅ Approve member accounts
- ✅ Create/edit/delete themes
- ✅ Toggle featured works
- ✅ View statistics

---

## File Structure

```
HomepageUI/
├── index.html                 # Homepage
├── portfolio.html             # Portfolio listings
├── portfolio_detail.html      # Portfolio detail page
├── theme.html                 # Themes page
├── photos-new.html            # Photos gallery (NEW)
├── graphics.html              # Graphics gallery
├── videos.html                # Videos gallery
├── about.html                 # About page
├── homepage.js                # Homepage script (UPDATED)
├── homepage-styles.css        # Homepage styles (UPDATED)
├── media-common.js            # Shared media script (NEW)
├── media-styles.css           # Shared media styles (NEW)
└── portfolio.html             # Portfolio script (UPDATED)

Backend/
├── server.js                  # Express server (PRODUCTION READY)
├── .env                       # Configuration (UPDATED)
├── models/
│   └── index.js              # MongoDB schemas
├── routes/
│   ├── auth.js               # Authentication routes
│   ├── users.js              # User routes
│   ├── works.js              # Work CRUD routes
│   ├── portfolios.js         # Portfolio routes
│   ├── themes.js             # Theme routes
│   └── votes.js              # Voting routes
└── scripts/
    └── seed.js               # Database seeding
```

---

## Session Management

- Session secret stored in `.env` (SESSION_SECRET)
- Sessions stored in MongoDB using `connect-mongo`
- Session cookies:
  - Name: `lentexhibit.sid`
  - Max age: 1 week
  - HTTP only: true (secure)
  - Secure: true in production only
  - SameSite: 'none' in production, 'lax' in development
  - Rolling: true (resets on each request)

---

## Error Handling

All frontend pages now have comprehensive error handling:
- Try-catch blocks for all API calls
- User-friendly error messages
- Fallback UI states for loading and empty states
- Console logging for debugging

---

## Testing Checklist

- [ ] Test user registration (guest and member)
- [ ] Test user login/logout
- [ ] Test viewing works (all categories)
- [ ] Test voting on works
- [ ] Test searching for works
- [ ] Test portfolio creation (members only)
- [ ] Test viewing portfolio details
- [ ] Test theme submissions
- [ ] Test admin approval workflow
- [ ] Test production deployment

---

## Next Steps

1. **Replace photos.html**: Rename `photos-new.html` to `photos.html` when ready
2. **Update graphics.html and videos.html**: Use same pattern as photos-new.html
3. **Deploy to production**: Push to Render or hosting platform
4. **Configure environment variables**: Set production URLs in `.env`
5. **Test all features**: Verify session persistence, voting, and portfolio management

---

## Troubleshooting

### Sessions Not Persisting
- Check CORS credentials settings
- Verify SESSION_SECRET in .env
- Ensure MongoDB connection is working
- Check browser cookie settings

### API 404 Errors
- Verify backend routes are correct
- Check API_BASE_URL in frontend JavaScript
- Ensure backend is running on correct port

### Voting Not Working
- Verify user is authenticated (checkAuth() returns success)
- Check MongoDB Vote schema
- Verify workId is valid ObjectId format

### Portfolio Not Loading
- Check userId is valid ObjectId
- Verify portfolio exists for user
- Check MongoDB connection

---

## Support

For questions or issues, please refer to:
- Backend: `Backend/server.js` and route files
- Frontend: `HomepageUI/` HTML and JavaScript files
- Database: MongoDB Atlas connection in `.env`
