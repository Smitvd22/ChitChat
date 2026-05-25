// ChitChat Mobile - Friends Screen
// Adapted from client/src/pages/Friends.jsx
// Same API calls: GET /api/friends, GET /api/friends/requests,
//   POST /api/friends/:userId, DELETE /api/friends/:userId,
//   PUT /api/friends/requests/:id/accept, PUT /api/friends/requests/:id/reject
//   GET /api/users/search?q=

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Friend, FriendRequest, SearchUser } from '../../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function FriendsScreen() {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searching, setSearching] = useState(false);
  const router = useRouter();
  const { logout, user } = useAuth();

  // Fetch friends list - same as web
  const fetchFriends = useCallback(async () => {
    try {
      const response = await api.get('/friends');
      setFriends(response.data);
    } catch (err: any) {
      console.error('Error fetching friends:', err);
      if (err.response?.status === 401) {
        await logout();
      }
    }
  }, [logout]);

  // Fetch friend requests - same as web
  const fetchFriendRequests = useCallback(async () => {
    try {
      const response = await api.get('/friends/requests');
      setFriendRequests(response.data);
    } catch (err) {
      console.error('Error fetching friend requests:', err);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchFriends(), fetchFriendRequests()]);
      setLoading(false);
    };
    loadData();
  }, [fetchFriends, fetchFriendRequests]);

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchFriends(), fetchFriendRequests()]);
    setRefreshing(false);
  };

  // Search users - same API as web
  const searchUsers = async () => {
    if (!searchTerm || searchTerm.length < 2) return;

    try {
      setSearching(true);
      const response = await api.get(`/users/search?q=${searchTerm}`);
      // Filter out existing friends (same as web)
      const filtered = response.data.filter(
        (u: SearchUser) => !friends.some((f) => f.id === u.id)
      );
      setSearchResults(filtered);
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to search');
    } finally {
      setSearching(false);
    }
  };

  // Send friend request - same as web
  const sendFriendRequest = async (userId: number) => {
    try {
      await api.post(`/friends/${userId}`);
      setSearchResults((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, requestSent: true } : u))
      );
      Alert.alert('Success', 'Friend request sent!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to send request');
    }
  };

  // Accept friend request - same as web
  const acceptFriendRequest = async (requestId: number) => {
    try {
      await api.put(`/friends/requests/${requestId}/accept`);
      await Promise.all([fetchFriendRequests(), fetchFriends()]);
      Alert.alert('Success', 'Friend request accepted!');
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to accept');
    }
  };

  // Reject friend request - same as web
  const rejectFriendRequest = async (requestId: number) => {
    try {
      await api.put(`/friends/requests/${requestId}/reject`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to reject');
    }
  };

  // Remove friend - same as web
  const removeFriend = async (friendId: number) => {
    Alert.alert('Remove Friend', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/friends/${friendId}`);
            setFriends((prev) => prev.filter((f) => f.id !== friendId));
          } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to remove');
          }
        },
      },
    ]);
  };

  // Navigate to chat - same as web
  const startChat = (friendId: number) => {
    router.push(`/(app)/chat/${friendId}`);
  };

  const getInitial = (name: string) => name.charAt(0).toUpperCase();

  // Render a friend request item
  const renderFriendRequest = ({ item }: { item: FriendRequest }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(item.username)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.username}</Text>
        <Text style={styles.cardEmail}>{item.email}</Text>
      </View>
      <View style={styles.requestActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.acceptBtn]}
          onPress={() => acceptFriendRequest(item.id)}
        >
          <Ionicons name="checkmark" size={18} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.rejectBtn]}
          onPress={() => rejectFriendRequest(item.id)}
        >
          <Ionicons name="close" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render a friend item
  const renderFriend = ({ item }: { item: Friend }) => (
    <TouchableOpacity style={styles.card} onPress={() => startChat(item.id)} activeOpacity={0.7}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(item.username)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.username}</Text>
        <Text style={styles.cardEmail}>{item.email}</Text>
      </View>
      <View style={styles.friendActions}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.chatBtn]}
          onPress={() => startChat(item.id)}
        >
          <Ionicons name="chatbubble" size={16} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, styles.removeBtn]}
          onPress={() => removeFriend(item.id)}
        >
          <Ionicons name="person-remove" size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render search result
  const renderSearchResult = ({ item }: { item: SearchUser }) => (
    <View style={styles.card}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{getInitial(item.username)}</Text>
      </View>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{item.username}</Text>
        <Text style={styles.cardEmail}>{item.email}</Text>
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, item.requestSent ? styles.sentBtn : styles.addBtn]}
        onPress={() => !item.requestSent && sendFriendRequest(item.id)}
        disabled={item.requestSent}
      >
        <Text style={styles.actionBtnText}>
          {item.requestSent ? 'Sent' : 'Add'}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Header component with search and requests
  const ListHeader = () => (
    <View>
      {/* User info bar */}
      <View style={styles.userBar}>
        <View style={styles.userInfo}>
          <View style={styles.userAvatar}>
            <Text style={styles.userAvatarText}>
              {user?.username ? getInitial(user.username) : 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.username || 'User'}</Text>
        </View>
        <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Friend Requests */}
      {friendRequests.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Friend Requests ({friendRequests.length})
          </Text>
          {friendRequests.map((req) => (
            <View key={req.id}>{renderFriendRequest({ item: req })}</View>
          ))}
        </View>
      )}

      {/* Search */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Find Friends</Text>
        <View style={styles.searchBar}>
          <TextInput
            style={styles.searchInput}
            value={searchTerm}
            onChangeText={setSearchTerm}
            placeholder="Search by username or email"
            placeholderTextColor={Colors.placeholder}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={searchUsers}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={searchUsers}
            disabled={!searchTerm || searching}
          >
            {searching ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>

        {searchResults.length > 0 && (
          <View style={styles.searchResults}>
            {searchResults.map((u) => (
              <View key={u.id}>{renderSearchResult({ item: u })}</View>
            ))}
          </View>
        )}
      </View>

      {/* Friends list header */}
      <Text style={styles.sectionTitle}>My Friends</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading friends...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={friends}
        renderItem={renderFriend}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          <Text style={styles.emptyText}>You don't have any friends yet</Text>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    fontSize: FontSize.md,
  },
  listContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  userBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  userAvatarText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  userName: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  logoutBtn: {
    padding: Spacing.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarText: {
    color: Colors.primary,
    fontSize: FontSize.lg,
    fontWeight: 'bold',
  },
  cardInfo: {
    flex: 1,
  },
  cardName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  cardEmail: {
    color: Colors.textMuted,
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  friendActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 40,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  acceptBtn: {
    backgroundColor: Colors.success,
  },
  rejectBtn: {
    backgroundColor: Colors.error,
  },
  chatBtn: {
    backgroundColor: Colors.primary,
  },
  removeBtn: {
    backgroundColor: Colors.error,
    opacity: 0.8,
  },
  addBtn: {
    backgroundColor: Colors.primary,
  },
  sentBtn: {
    backgroundColor: Colors.buttonDisabled,
  },
  searchBar: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    color: Colors.inputText,
    fontSize: FontSize.md,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  },
  searchBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchResults: {
    marginTop: Spacing.md,
  },
  emptyText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: FontSize.md,
    marginTop: Spacing.xl,
  },
});
