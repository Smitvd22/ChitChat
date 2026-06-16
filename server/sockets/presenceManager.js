/**
 * presenceManager.js — Server-side real-time presence tracking.
 *
 * Tracks which users are online/offline using socket connections + heartbeats.
 * Handles: multi-tab, browser close, tab close, backgrounding, internet loss,
 * refreshes, and stale connection cleanup.
 */

import { pool } from '../config/db.js';

// In-memory presence store
// Key: userId (string), Value: { socketIds: Set, lastSeen: Date, status: 'online'|'offline' }
const presenceStore = new Map();

// Cleanup interval reference
let cleanupInterval = null;

// Reference to io instance
let ioInstance = null;

// Friends cache to avoid DB lookups on every status change
// Key: userId, Value: { friendIds: number[], cachedAt: Date }
const friendsCache = new Map();
const FRIENDS_CACHE_TTL = 60000; // 1 minute

/**
 * Initialize the presence manager with the Socket.IO instance.
 */
export function initPresence(io) {
  ioInstance = io;

  // Start stale connection cleanup every 60 seconds
  if (cleanupInterval) clearInterval(cleanupInterval);
  cleanupInterval = setInterval(() => cleanupStaleConnections(), 60000);

  console.log('✅ Presence manager initialized');
}

/**
 * Register a socket for a user (called on join-user-room).
 */
export function registerSocket(userId, socketId) {
  const uid = String(userId);

  let entry = presenceStore.get(uid);
  const wasOffline = !entry || entry.status === 'offline';

  if (!entry) {
    entry = {
      socketIds: new Set(),
      lastSeen: new Date(),
      status: 'online',
    };
    presenceStore.set(uid, entry);
  }

  entry.socketIds.add(socketId);
  entry.status = 'online';
  entry.lastSeen = new Date();

  if (wasOffline) {
    broadcastPresenceChange(uid, 'online');
    updateLastSeenInDb(uid);
  }
}

/**
 * Unregister a socket for a user (called on disconnect).
 * Uses a short delay to handle page refreshes gracefully.
 */
export function unregisterSocket(userId, socketId) {
  const uid = String(userId);
  const entry = presenceStore.get(uid);

  if (!entry) return;

  entry.socketIds.delete(socketId);

  // If user has no more active sockets, start offline countdown
  if (entry.socketIds.size === 0) {
    // 5 second grace period for page refreshes
    setTimeout(() => {
      const current = presenceStore.get(uid);
      if (current && current.socketIds.size === 0) {
        current.status = 'offline';
        current.lastSeen = new Date();
        broadcastPresenceChange(uid, 'offline', current.lastSeen);
        updateLastSeenInDb(uid);
      }
    }, 5000);
  }
}

/**
 * Handle heartbeat from a client.
 */
export function heartbeat(userId) {
  const uid = String(userId);
  const entry = presenceStore.get(uid);

  if (entry) {
    entry.lastSeen = new Date();
    if (entry.status !== 'online') {
      entry.status = 'online';
      broadcastPresenceChange(uid, 'online');
    }
  }
}

/**
 * Handle explicit going-offline signal (beforeunload / visibilitychange).
 */
export function goingOffline(userId, socketId) {
  const uid = String(userId);
  const entry = presenceStore.get(uid);

  if (!entry) return;

  entry.socketIds.delete(socketId);

  if (entry.socketIds.size === 0) {
    entry.status = 'offline';
    entry.lastSeen = new Date();
    broadcastPresenceChange(uid, 'offline', entry.lastSeen);
    updateLastSeenInDb(uid);
  }
}

/**
 * Get presence status for a single user (async to allow DB fallback).
 */
export async function getStatus(userId) {
  const uid = String(userId);
  const entry = presenceStore.get(uid);

  if (entry && entry.lastSeen) {
    return {
      status: entry.status,
      lastSeen: entry.lastSeen,
    };
  }

  // Fallback to DB if not in memory or lastSeen is null
  try {
    const result = await pool.query('SELECT last_seen FROM users WHERE id = $1', [userId]);
    const lastSeen = result.rows[0]?.last_seen || null;
    
    // Cache it in memory so we don't hit the DB again for offline users
    if (!entry) {
      presenceStore.set(uid, {
        socketIds: new Set(),
        status: 'offline',
        lastSeen,
      });
    } else {
      entry.lastSeen = lastSeen;
    }

    return {
      status: 'offline',
      lastSeen,
    };
  } catch (err) {
    console.error('Error fetching last_seen from DB:', err);
    return { status: 'offline', lastSeen: null };
  }
}

/**
 * Get presence status for multiple users.
 */
export async function getBulkStatus(userIds) {
  const result = {};
  const missingUserIds = [];

  for (const userId of userIds) {
    const uid = String(userId);
    const entry = presenceStore.get(uid);
    if (entry && entry.lastSeen) {
      result[uid] = {
        status: entry.status,
        lastSeen: entry.lastSeen,
      };
    } else {
      missingUserIds.push(userId);
    }
  }

  if (missingUserIds.length > 0) {
    try {
      const dbResult = await pool.query(
        `SELECT id, last_seen FROM users WHERE id = ANY($1)`,
        [missingUserIds]
      );
      
      const dbMap = {};
      for (const row of dbResult.rows) {
        dbMap[String(row.id)] = row.last_seen;
      }

      for (const userId of missingUserIds) {
        const uid = String(userId);
        const lastSeen = dbMap[uid] || null;
        
        result[uid] = { status: 'offline', lastSeen };
        
        const existingEntry = presenceStore.get(uid);
        if (!existingEntry) {
          presenceStore.set(uid, {
            socketIds: new Set(),
            status: 'offline',
            lastSeen,
          });
        } else {
          existingEntry.lastSeen = lastSeen;
        }
      }
    } catch (err) {
      console.error('Error fetching last_seen for bulk status:', err);
      for (const userId of missingUserIds) {
        result[String(userId)] = { status: 'offline', lastSeen: null };
      }
    }
  }

  return result;
}

/**
 * Clean up stale connections (no heartbeat in 45 seconds).
 */
function cleanupStaleConnections() {
  const now = Date.now();
  const STALE_THRESHOLD = 45000; // 45 seconds

  for (const [uid, entry] of presenceStore.entries()) {
    if (entry.status === 'online' && entry.socketIds.size === 0) {
      // No active sockets but still marked online — mark offline
      entry.status = 'offline';
      entry.lastSeen = new Date();
      broadcastPresenceChange(uid, 'offline', entry.lastSeen);
      updateLastSeenInDb(uid);
    } else if (
      entry.status === 'online' &&
      now - entry.lastSeen.getTime() > STALE_THRESHOLD
    ) {
      // Has sockets but no heartbeat — might be stale
      entry.status = 'offline';
      entry.lastSeen = new Date();
      broadcastPresenceChange(uid, 'offline', entry.lastSeen);
      updateLastSeenInDb(uid);
    }
  }
}

/**
 * Broadcast a presence change to all friends of the user.
 */
async function broadcastPresenceChange(userId, status, lastSeen = null) {
  if (!ioInstance) return;

  try {
    const friendIds = await getFriendIds(userId);

    const update = {
      userId: String(userId),
      status,
      lastSeen: lastSeen ? lastSeen.toISOString() : new Date().toISOString(),
    };

    // Send to each friend's personal room
    for (const friendId of friendIds) {
      ioInstance.to(`user-${friendId}`).emit('presence-update', update);
    }
  } catch (err) {
    console.error('Error broadcasting presence change:', err);
  }
}

/**
 * Get friend IDs for a user (with caching).
 */
async function getFriendIds(userId) {
  const cached = friendsCache.get(String(userId));
  if (cached && Date.now() - cached.cachedAt.getTime() < FRIENDS_CACHE_TTL) {
    return cached.friendIds;
  }

  try {
    const result = await pool.query(
      `SELECT CASE 
         WHEN user1_id = $1 THEN user2_id 
         ELSE user1_id 
       END AS friend_id
       FROM friendships
       WHERE (user1_id = $1 OR user2_id = $1) AND status = 'accepted'`,
      [userId]
    );

    const friendIds = result.rows.map(r => r.friend_id);
    friendsCache.set(String(userId), { friendIds, cachedAt: new Date() });
    return friendIds;
  } catch (err) {
    console.error('Error fetching friend IDs for presence:', err);
    return [];
  }
}

/**
 * Update last_seen timestamp in the database.
 */
async function updateLastSeenInDb(userId) {
  try {
    await pool.query(
      'UPDATE users SET last_seen = NOW() WHERE id = $1',
      [userId]
    );
  } catch (err) {
    // Silently fail — the column might not exist yet during migration
    // This will work after the next server restart when initDb runs
    if (!err.message.includes('column "last_seen" of relation "users" does not exist')) {
      console.error('Error updating last_seen:', err);
    }
  }
}

/**
 * Invalidate friends cache for a user (call when friendships change).
 */
export function invalidateFriendsCache(userId) {
  friendsCache.delete(String(userId));
}
