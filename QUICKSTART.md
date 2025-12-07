# LenteXhibit - Quick Start Guide

## Starting the Application

### Prerequisites
- Node.js (v14+) installed
- MongoDB (local or Atlas connection string)
- npm or yarn package manager

### Backend Setup

1. **Navigate to backend directory:**
   ```powershell
   cd Backend
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Configure environment (.env file already configured):**
   ```
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb+srv://lentexhibit_db:lentexhibit_pass@lentexhibit.da4auec.mongodb.net/lentexhibit?retryWrites=true&w=majority
   SESSION_SECRET=LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO
   FRONTEND_URL=http://localhost:3000
   ```

4. **Start the backend server:**
   ```powershell
   node server.js
   ```
   
   Expected output:
   ```
   🚀 Server running on port 5000
   ✅ MongoDB connected successfully
   🌐 Environment: development
   🔗 Local: http://localhost:5000
   ```

### Frontend Setup

1. **Open frontend files in browser:**
   - Simply open `HomepageUI/index.html` in your browser
   - Or use a local server (recommended):
     ```powershell
     # Using Python 3
     python -m http.server 3000
     
     # Using Node.js (http-server)
     npx http-server -p 3000
     ```

2. **Navigate to:**
   ```
   http://localhost:3000/HomepageUI/index.html
   ```

---

## Testing the Integration

### 1. Test Authentication
1. Click "Sign Up / Log In"
2. Try registering as a guest
3. Verify you're logged in (see username in dropdown)
4. Click "Log Out"

### 2. Test Data Loading
1. Check if featured works load
2. View current voting theme
3. Check rankings section
4. Verify works display votes

### 3. Test Voting (Members Only)
1. Register as a member with UP email (user@up.edu.ph)
2. Click vote button on a work
3. Verify vote count increases
4. Try voting again (should show message)

### 4. Test Portfolio (Members Only)
1. Log in as member
2. Click "My Portfolio" or navigate to portfolio.html
3. Create a new portfolio
4. Verify portfolio appears in list

### 5. Test Media Pages
1. Navigate to Photos gallery
2. Test search functionality
3. Test sorting and filtering
4. Verify vote functionality works

---

## API Testing with Postman/Thunder Client

### Test Auth Endpoints

**1. Verify Session:**
```
GET http://localhost:5000/api/auth/verify
Headers: (cookies will be sent automatically)
```

**2. Sign Up:**
```
POST http://localhost:5000/api/auth/signup
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "userType": "guest"
}
```

**3. Login:**
```
POST http://localhost:5000/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com"
}
```

### Test Works Endpoints

**1. Get All Works:**
```
GET http://localhost:5000/api/works?category=Photos&limit=10
```

**2. Get Rankings:**
```
GET http://localhost:5000/api/works/rankings/Photos
```

**3. Vote on Work:**
```
POST http://localhost:5000/api/votes
Content-Type: application/json

{
  "workId": "WORK_ID_HERE",
  "themeId": null
}
```

### Test Portfolio Endpoints

**1. Get All Portfolios:**
```
GET http://localhost:5000/api/portfolios
```

**2. Get User Portfolio:**
```
GET http://localhost:5000/api/portfolios/user/USER_ID_HERE
```

### Test Theme Endpoints

**1. Get Active Theme:**
```
GET http://localhost:5000/api/themes/active
```

**2. Get All Themes:**
```
GET http://localhost:5000/api/themes
```

---

## Common Issues & Solutions

### Issue: "Cannot GET /api/auth/verify"
**Solution:** Backend server not running. Run `node server.js` in Backend folder.

### Issue: "MongoDB connection error"
**Solution:** Check MONGODB_URI in .env file. Verify connection string is correct and IP whitelist is configured.

### Issue: Session not persisting
**Solution:** Ensure cookies are enabled. Check browser console for cookie warnings.

### Issue: CORS errors
**Solution:** Backend CORS is configured for localhost. Check frontend URL matches allowed origins in server.js.

### Issue: "Cannot find property '_id' of undefined"
**Solution:** Ensure user is authenticated before accessing portfolio. Check checkAuth() function.

---

## File Descriptions

### Backend Files
- **server.js** - Main Express server with CORS, session, and route setup
- **.env** - Environment variables for MongoDB, session, and URLs
- **models/index.js** - Mongoose schemas for User, Work, Portfolio, Theme, Vote
- **routes/auth.js** - Authentication endpoints (signup, login, logout, verify)
- **routes/works.js** - Work CRUD and ranking endpoints
- **routes/portfolios.js** - Portfolio management endpoints
- **routes/themes.js** - Theme management endpoints
- **routes/votes.js** - Voting endpoints

### Frontend Files
- **index.html** - Homepage with featured works and rankings
- **homepage.js** - Homepage logic (UPDATED with full API integration)
- **homepage-styles.css** - Homepage styling
- **portfolio.html** - Portfolio listings page
- **portfolio_detail.html** - Individual portfolio detail page
- **theme.html** - Voting themes page
- **photos.html** - Photography gallery (use photos-new.html as template)
- **graphics.html** - Graphics gallery
- **videos.html** - Videos gallery
- **media-common.js** - Shared script for media pages (NEW)
- **media-styles.css** - Shared styles for media pages (NEW)

---

## Configuration Files

### .env (Backend)
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
SESSION_SECRET=LNZPf6DIUbSyVKQd5vqylXEtCmDZOZDO
FRONTEND_URL=http://localhost:3000
```

### API Base URLs (Frontend)
```javascript
const PRODUCTION_API_URL = 'https://lentexhibit.onrender.com/api';
const DEVELOPMENT_API = 'http://localhost:5000/api';
```

---

## Database Models

### User
```
{
  name: String,
  email: String (unique),
  userType: 'guest' | 'member' | 'admin',
  batchName: String,
  cluster: 'Photography' | 'Graphics' | 'Videography',
  position: String,
  isApproved: Boolean
}
```

### Work
```
{
  title: String,
  description: String,
  category: 'Photos' | 'Graphics' | 'Videos',
  fileUrl: String,
  userId: ObjectId (ref: User),
  featured: Boolean,
  voteCount: Number,
  themeId: ObjectId (ref: Theme),
  createdAt: Date
}
```

### Portfolio
```
{
  userId: ObjectId (ref: User),
  title: String,
  bio: String,
  works: [ObjectId] (ref: Work),
  totalVotes: Number,
  createdAt: Date
}
```

### Vote
```
{
  userId: ObjectId (ref: User),
  workId: ObjectId (ref: Work),
  themeId: ObjectId (ref: Theme),
  createdAt: Date
}
```

### Theme
```
{
  title: String,
  description: String,
  category: String,
  startDate: Date,
  endDate: Date,
  status: 'Upcoming' | 'Active' | 'Ended',
  submissions: [ObjectId] (ref: Work),
  createdBy: ObjectId (ref: User)
}
```

---

## Next Steps

1. ✅ Verify backend and frontend are working
2. ⬜ Test all features using the checklist above
3. ⬜ Update remaining media pages (graphics.html, videos.html)
4. ⬜ Deploy to production (Render for backend, Netlify/Vercel for frontend)
5. ⬜ Configure production URLs in environment variables
6. ⬜ Set up SSL certificates if needed
7. ⬜ Monitor logs and performance

---

## Support & Debugging

### Enable Debug Logging
Frontend: Check browser console (F12)
Backend: Console output shows all requests and errors

### Common Debug Commands
```powershell
# Check if port 5000 is in use
netstat -ano | findstr :5000

# Kill process on port 5000
taskkill /PID <PID> /F

# Check MongoDB connection
mongo "mongodb+srv://lentexhibit_db:password@host/lentexhibit"
```

---

**Happy coding! The LenteXhibit application is now fully integrated! 🎉**
