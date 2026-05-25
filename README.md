# ChitChat 💬

ChitChat is a full-stack, real-time messaging platform available on the Web and Mobile. It features instant text messaging, rich media sharing, live reactions, and a robust friends system.

The project is organized as a monorepo consisting of three main parts:
1. **[Backend Server](./server)**: Node.js / Express API with Socket.IO for real-time events.
2. **[Web Client](./client)**: A responsive React.js frontend.
3. **[Mobile App](./mobile)**: A cross-platform mobile app built with React Native and Expo Router.

---

## ✨ Features

- **Real-time Messaging**: Instant message delivery using Socket.IO.
- **Cross-Platform**: Seamless experience across Web, Android, and iOS.
- **Media Sharing**: Upload and share images and videos (powered by Cloudinary).
- **Social System**: Search users, send/accept friend requests, and manage your friends list.
- **Reactions**: React to individual messages with emojis.
- **Reply Context**: Reply directly to specific messages in a chat.
- **Secure Authentication**: JWT-based authentication with secure token storage (SecureStore on mobile, LocalStorage on web).
- **Persistent Data**: Powered by a robust PostgreSQL database hosted on Neon.

---

## 🏗️ Architecture & Technologies

### Backend (`/server`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Real-time**: Socket.IO
- **Database**: PostgreSQL (hosted on [Neon DB](https://neon.tech/))
- **File Storage**: [Cloudinary](https://cloudinary.com/) (unsigned presets)
- **Deployment**: Render (`https://chitchat-3l35.onrender.com`)

### Web Client (`/client`)
- **Framework**: React.js
- **Styling**: Vanilla CSS (Modern dark-mode glassmorphism aesthetics)
- **Real-time**: Socket.IO Client
- **HTTP Client**: Axios

### Mobile App (`/mobile`)
- **Framework**: React Native with [Expo](https://expo.dev/)
- **Routing**: Expo Router (file-based routing)
- **UI Components**: React Native primitives + `expo-vector-icons`
- **Native Modules**: 
  - `expo-image-picker` (Camera & Gallery access)
  - `expo-secure-store` (Encrypted JWT storage)
  - `expo-av` (Video playback)
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
Create a `.env` file (see `.env.example`) with your Neon DB and Cloudinary credentials, then start the server:
```bash
npm run dev
```
*The server will run on `http://localhost:5000`.*

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
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_UPLOAD_PRESET=your_preset
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000,http://192.168.1.5:3000,http://localhost:8081,http://127.0.0.1:8081,http://192.168.1.5:8081
```

### Mobile App
The mobile app does not require a `.env` file. It uses `constants/config.ts` to automatically switch between the local backend (`http://10.0.2.2:5000` or `http://localhost:5000`) during development, and the production backend (`https://chitchat-3l35.onrender.com`) when built.

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
