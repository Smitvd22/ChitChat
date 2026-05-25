// ChitChat Mobile - Type Definitions
// Mirrors the data structures used by the existing backend API

export interface User {
  id: number;
  username: string;
  email: string;
  mobile?: string;
  token?: string;
}

export interface AuthData {
  id: number;
  username: string;
  email: string;
  mobile?: string;
  token: string;
}

export interface LoginPayload {
  identifier: string;
  password: string;
}

export interface RegisterPayload {
  username: string;
  email: string;
  mobile: string;
  password: string;
}

export interface Friend {
  id: number;
  username: string;
  email: string;
}

export interface FriendRequest {
  id: number;
  username: string;
  email: string;
  user_id: number;
}

export interface Message {
  id: number;
  content: string;
  senderId: number;
  receiverId: number;
  replyToId?: number | null;
  mediaUrl?: string | null;
  mediaType?: string | null;
  mediaPublicId?: string | null;
  mediaFormat?: string | null;
  createdAt: string;
  reactions?: Reaction[];
}

export interface Reaction {
  id: number;
  messageId?: number;
  userId: number;
  username: string;
  emoji: string;
  emojiName?: string;
  removed?: boolean;
}

export interface MediaUploadResult {
  url: string;
  publicId: string;
  resourceType: string;
  format: string;
}

export interface MediaMessagePayload {
  mediaUrl: string;
  mediaType: string;
  publicId: string;
  format: string;
  receiverId: string | number;
}

export interface SearchUser {
  id: number;
  username: string;
  email: string;
  requestSent?: boolean;
}
