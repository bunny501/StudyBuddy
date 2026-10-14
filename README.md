# Study Buddy 📚

A modern peer-to-peer collaborative learning platform built with React, Node.js, Express, MongoDB, and Socket.io.

---

## 🚀 Direct Deployment Options

### Option 1: Unified 1-Click Deployment (Recommended — Render or Railway)
Deploy both the frontend and backend together as a single full-stack service with zero CORS hassle!

#### On Render:
1. Push your repository to GitHub.
2. In [Render](https://dashboard.render.com/), click **New** → **Blueprint** (or **Web Service**).
   - If using **Blueprint**: Render detects the included `render.yaml` automatically.
   - If using **Web Service**:
     - **Build Command**: `npm run build`
     - **Start Command**: `npm start`
3. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB Atlas connection string (`mongodb+srv://...`)
   - `JWT_SECRET`: Any random secure secret key (Render generates one automatically if using Blueprint)
4. Deploy! Your app will be live at `https://your-service.onrender.com`.

#### On Railway:
1. In Railway, click **New Project** → **Deploy from GitHub repo**.
2. Railway will automatically detect the root `package.json`, execute `npm run build`, and run `npm start`.
3. Add your `MONGO_URI` and `JWT_SECRET` variables in the Railway dashboard.

---

### Option 2: Split Deployment (Backend on Render + Frontend on Vercel)

#### Backend (Render):
1. In Render, create a **Web Service** connected to your repo.
2. Set **Root Directory** to `server`.
3. **Build Command**: `npm install`
4. **Start Command**: `npm start`
5. Add Environment Variables:
   - `MONGO_URI`: Your MongoDB connection string
   - `JWT_SECRET`: Secret key for authentication
   - `CLIENT_URL`: `https://your-frontend.vercel.app` (optional, CORS permits `.vercel.app` automatically)

#### Frontend (Vercel):
1. In Vercel, import your GitHub repository.
2. Set **Root Directory** to `client` (or leave default root — `vercel.json` will build `client/dist`).
3. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend-api.onrender.com`
4. Deploy!

---

## 💻 Local Development

### 1. Backend
```bash
cd server
npm install
# Configure MONGO_URI in server/.env (see server/.env.example)
npm run dev
```

### 2. Frontend
```bash
cd client
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

---

## ✨ Features
- **User Authentication**: Secure token-based registration & login.
- **My Notes**: Rich study notes with confusion tagging (❓ Confusing, ⚠️ Important, 💡 Insight) and real-time thread discussion.
- **Study Groups**: Group chats, group notes, shared task assignment with completion tracking.
- **Peer Matching**: Subject-based peer finder with real-time direct messaging.
- **Live Peer Tests**: Peer-created quizzes with synchronized timers, automatic scoring, and question review.
- **Battle of Groups**: Timed competitive quiz battles between groups with live discussion boards.
- **Doubts & Peer Help**: Campus/subject doubt feed with live answers, instant notification badges, and resolution toggling.
- **Interactive Profile**: Level progression, study stats, friend requests management (Accept/Decline), and study partners list.
- **Dark Mode**: Toggleable light and dark theme with persistent styling.
