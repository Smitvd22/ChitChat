# ChitChat 💬

ChitChat is a full-stack, real-time messaging platform available on the Web and Mobile. It features instant text messaging, rich media sharing, voice messages, video calls, live reactions, multiplayer mini-games, and a robust friends system.

The project is organized as a monorepo consisting of three main parts:
1. **[Backend Server](./server)** — Node.js / Express API with Socket.IO for real-time events.
2. **[Web Client](./client)** — A responsive React.js frontend.
3. **[Mobile App](./mobile)** — A cross-platform mobile app built with React Native and Expo Router.

---

## ✨ Features

- **Real-time Messaging** — Instant message delivery using Socket.IO.
- **Cross-Platform** — Seamless experience across Web, Android, and iOS.
- **Video Calls** — Peer-to-peer video calling powered by PeerJS / WebRTC with incoming-call notifications and in-app ringing.
- **Voice Messages** — Record and send voice notes (mobile, powered by `expo-av` + Cloudinary).
- **Multiplayer Games** — Play real-time games with friends right from the chat:
  - 🟡 Connect 4
  - ❌ Tic-Tac-Toe
  - 🔲 Dots & Boxes
  - 🃏 Memory Cards
- **Media Sharing** — Upload and share images and videos (powered by Cloudinary).
- **Social System** — Search users, send/accept friend requests, and manage your friends list.
- **Reactions** — React to individual messages with emojis.
- **Reply Context** — Reply directly to specific messages in a chat.
- **Light / Dark Theme** — Toggle between light and dark mode on the web client.
- **Secure Authentication** — JWT-based authentication with secure token storage (SecureStore on mobile, LocalStorage on web).
- **Persistent Data** — Powered by a robust PostgreSQL database hosted on Neon, with auto-initializing schema and migrations.

---

## 🏗️ Architecture & Technologies

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: PostgreSQL (hosted on [Neon DB](https://neon.tech/)) with auto-initializing schema (`initDb.js`)
- **Video Signaling**: Socket.IO rooms for call negotiation; PeerJS for WebRTC peer brokering
- **Game Engine**: In-memory game sessions managed via Socket.IO (`gameSocket.js`)
- **File Storage**: [Cloudinary](https://cloudinary.com/) (unsigned presets)
- **Deployment**: Render (`https://chitchat-3l35.onrender.com`)

### Web Client (`/client`)
- **Framework**: React.js
- **Styling**: Vanilla CSS (Modern dark-mode glassmorphism aesthetics)
- **Theming**: React Context-based light/dark theme toggle
- **Real-time**: Socket.IO Client
- **Video Calls**: PeerJS (WebRTC) — uses cloud PeerJS in production, local PeerJS server in development
- **HTTP Client**: Axios

### Mobile App (`/mobile`)
- **Framework**: React Native with [Expo](https://expo.dev/)
- **Routing**: Expo Router (file-based routing)
- **UI Components**: React Native primitives + `@expo/vector-icons`
- **Native Modules**:
  - `expo-image-picker` (Camera & Gallery access)
  - `expo-secure-store` (Encrypted JWT storage)
  - `expo-av` (Audio recording & video playback)
  - `expo-camera` (Camera & microphone permissions for video calls)
  - `react-native-webview` (WebView-based video call interface)
- **Build System**: Expo Application Services (EAS)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
- Node.js (v18+)
- npm or yarn
- Expo Go app on your phone (or an Android Emulator/iOS Simulator)

### 1. Start the Backend Server
Navigate to the `server` directory and install dependencies:
```bash
cd server
npm install
```
Create a `.env` file (see `server/.env.example`) with your Neon DB, Cloudinary, and JWT credentials, then start the server:
```bash
npm run dev
```
*The server will run on `http://localhost:5000`. The database schema is auto-initialized on startup.*

### 2. Start the Web Client (Optional)
Navigate to the `client` directory:
```bash
cd client
npm install
npm start
```
*The web app will run on `http://localhost:3000`.*

### 3. Start the Mobile App
Navigate to the `mobile` directory:
```bash
cd mobile
npm install
npx expo start
```
*Press `a` to open in Android Emulator, `i` for iOS Simulator, or scan the QR code with the Expo Go app on your physical device.*

---

## 🔒 Environment Variables

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret
DATABASE_URL=postgresql://your_neon_db_url
DB_USE_SSL=true
DB_REJECT_UNAUTHORIZED=true
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_preset
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_URL=cloudinary://...
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://localhost:8081
```

### Web Client (`client/.env`)
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_SOCKET_URL=http://localhost:5000
REACT_APP_CLOUDINARY_CLOUD_NAME=your_cloud_name
REACT_APP_CLOUDINARY_UPLOAD_PRESET=your_preset
REACT_APP_PEERJS_HOST=0.peerjs.com
REACT_APP_PEERJS_PORT=443
REACT_APP_PEERJS_PATH=/
REACT_APP_PEERJS_SECURE=true
```
> In development you can point the PeerJS variables to a local PeerJS server instead of the cloud service.

### Mobile App
The mobile app does not require a `.env` file. It uses `constants/config.ts` to automatically switch between the local backend (`http://10.0.2.2:5000` or `http://localhost:5000`) during development, and the production backend (`https://chitchat-3l35.onrender.com`) when built.

---

## 🎮 Games Architecture

Games are implemented as a fully real-time, Socket.IO-driven system:

| Game | Description |
|------|-------------|
| **Connect 4** | Classic vertical disc-drop game on a 7×6 grid |
| **Tic-Tac-Toe** | Traditional 3×3 grid game |
| **Dots & Boxes** | Draw lines to claim boxes on a dot grid |
| **Memory Cards** | Flip and match pairs of cards |

- **Server** (`server/games/`): Each game has its own logic module exporting `createGame`, `makeMove`, and `resetForRematch`. A generic `gameSocket.js` handler manages sessions, turn validation, and broadcasting.
- **Client** (`client/src/features/games/`): A shared `useGameSocket` hook handles socket communication; each game has its own board component and page. The Games Lobby lets players pick a game from a friend's chat.

---

## 📹 Video Calls Architecture

Video calls use a hybrid approach:

1. **Signaling** — Socket.IO rooms manage call initiation, acceptance, and teardown (`join-video-call`, `leave-video-call`, `call-ended-by-peer` events).
2. **Media** — PeerJS (backed by WebRTC) handles the actual peer-to-peer audio/video streams.
3. **Production** — Uses the public PeerJS cloud broker (`0.peerjs.com`) with Google STUN and OpenRelay TURN servers for NAT traversal.
4. **Mobile** — The mobile app opens the web client's video call page inside a `WebView`, injecting the authenticated user's JWT and call role via `injectedJavaScriptBeforeContentLoaded`.

---

## 📦 Production Build

### Mobile App (APK Generation)
To generate an installable `.apk` file for Android using Expo Application Services (EAS), run:
```bash
cd mobile
npx eas-cli build -p android --profile preview
```
This will compress the project, send it to Expo's free cloud builders, and provide you with a direct download link for your compiled APK.

---

## 📝 License
This project is open-source and available under the MIT License.
