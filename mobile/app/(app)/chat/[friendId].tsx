// ChitChat Mobile - Chat Screen
// Adapted from client/src/pages/Chat.jsx (936 lines → optimized for React Native)
// Same API calls: GET /api/messages/:friendId, POST /api/messages, POST /api/messages/media
// Same Socket events: join-room, new-message, new-reaction, reaction-removed
// Same room format: [userId, friendId].sort().join('-')

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../../contexts/AuthContext';
import api from '../../../services/api';
import MediaDisplay from '../../../components/MediaDisplay';
import MediaUpload from '../../../components/MediaUpload';
import { Message, Reaction, MediaUploadResult, Friend } from '../../../types';
import { MESSAGES_PER_PAGE } from '../../../constants/config';
import { Colors, Spacing, FontSize, BorderRadius } from '../../../constants/theme';
import { Ionicons } from '@expo/vector-icons';

export default function ChatScreen() {
  const { friendId } = useLocalSearchParams<{ friendId: string }>();
  const router = useRouter();
  const { user, socket } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [friendInfo, setFriendInfo] = useState<Friend | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [socketConnected, setSocketConnected] = useState(false);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [sending, setSending] = useState(false);

  const hasJoinedRoom = useRef(false);
  const flatListRef = useRef<FlatList>(null);

  // Fetch friend info - same as web
  const fetchFriendInfo = useCallback(async () => {
    try {
      const response = await api.get('/friends');
      const friend = response.data.find(
        (f: Friend) => f.id === parseInt(friendId!, 10)
      );
      if (friend) {
        setFriendInfo(friend);
      }
    } catch (err) {
      console.error('Error fetching friend info:', err);
    }
  }, [friendId]);

  // Fetch chat history - same pagination as web
  const fetchChatHistory = useCallback(
    async (pageNum: number = 1, append: boolean = false) => {
      try {
        const response = await api.get(
          `/messages/${friendId}?page=${pageNum}&limit=${MESSAGES_PER_PAGE}`
        );

        const fetchedMessages: Message[] = response.data.messages || response.data;

        if (fetchedMessages.length < MESSAGES_PER_PAGE) {
          setHasMore(false);
        }

        if (append) {
          // Prepend older messages (same as web)
          setMessages((prev) => {
            const prevIds = new Set(prev.map((m) => m.id));
            const unique = fetchedMessages.filter((m) => !prevIds.has(m.id));
            return [...unique, ...prev];
          });
        } else {
          setMessages(fetchedMessages);
        }

        setLoading(false);
        setLoadingMore(false);
      } catch (err) {
        console.error('Error fetching messages:', err);
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [friendId]
  );

  // Initial load
  useEffect(() => {
    if (!user || !friendId) return;
    setPage(1);
    setHasMore(true);
    setLoading(true);
    setMessages([]);
    fetchFriendInfo();
    fetchChatHistory(1, false);
  }, [friendId, user, fetchFriendInfo, fetchChatHistory]);

  // Socket connection management - same room joining as web
  useEffect(() => {
    if (!socket || !friendId || !user) return;

    setSocketConnected(socket.connected);

    const roomId = [user.id, parseInt(friendId)].sort().join('-');

    const handleConnect = () => {
      setSocketConnected(true);
      if (!hasJoinedRoom.current) {
        socket.emit('join-room', roomId);
        hasJoinedRoom.current = true;
      }
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      hasJoinedRoom.current = false;
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      hasJoinedRoom.current = false;
    };
  }, [socket, friendId, user]);

  // Listen for new messages - same as web
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });
    };

    socket.on('new-message', handleNewMessage);
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

  // Listen for reactions - same as web
  useEffect(() => {
    if (!socket) return;

    const handleNewReaction = (reaction: Reaction) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === reaction.messageId) {
            const currentReactions = msg.reactions || [];
            const existingIdx = currentReactions.findIndex(
              (r: Reaction) => r.userId === reaction.userId && r.emoji === reaction.emoji
            );
            if (existingIdx >= 0) {
              const updated = [...currentReactions];
              updated[existingIdx] = reaction;
              return { ...msg, reactions: updated };
            }
            return { ...msg, reactions: [...currentReactions, reaction] };
          }
          return msg;
        })
      );
    };

    const handleReactionRemoved = (reaction: Reaction) => {
      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === reaction.messageId && msg.reactions) {
            return {
              ...msg,
              reactions: msg.reactions.filter(
                (r: Reaction) => !(r.userId === reaction.userId && r.emoji === reaction.emoji)
              ),
            };
          }
          return msg;
        })
      );
    };

    socket.on('new-reaction', handleNewReaction);
    socket.on('reaction-removed', handleReactionRemoved);

    return () => {
      socket.off('new-reaction', handleNewReaction);
      socket.off('reaction-removed', handleReactionRemoved);
    };
  }, [socket]);

  // Send message - same API as web
  const sendMessage = async () => {
    if (!messageInput.trim() || sending) return;

    try {
      setSending(true);
      await api.post('/messages', {
        content: messageInput,
        receiverId: friendId,
        senderId: user!.id,
        replyToId: replyingTo?.id || null,
      });

      setMessageInput('');
      setReplyingTo(null);
    } catch (err) {
      console.error('Error sending message:', err);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // Handle media upload success - same API as web
  const handleMediaUploadSuccess = async (mediaData: MediaUploadResult) => {
    try {
      await api.post('/messages/media', {
        mediaUrl: mediaData.url,
        mediaType: mediaData.resourceType,
        publicId: mediaData.publicId,
        format: mediaData.format,
        receiverId: friendId,
      });
      setShowMediaUpload(false);
    } catch (err) {
      console.error('Error sending media message:', err);
      Alert.alert('Error', 'Failed to send media');
    }
  };

  // Load more (pagination) - triggered when scrolling to top
  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    fetchChatHistory(nextPage, true);
  };

  // Add reaction - same API as web
  const addReaction = async (messageId: number, emoji: string) => {
    try {
      await api.post('/messages/reactions', {
        messageId,
        emoji,
        emojiName: emoji,
      });
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  // Quick react with common emojis
  const quickReact = (messageId: number) => {
    const emojis = ['2764-fe0f', '1f44d', '1f602', '1f622', '1f44f'];
    const emojiLabels = ['❤️', '👍', '😂', '😢', '👏'];

    Alert.alert(
      'React',
      'Choose a reaction',
      [
        ...emojiLabels.map((label, i) => ({
          text: label,
          onPress: () => addReaction(messageId, emojis[i]),
        })),
        { text: 'Cancel', style: 'cancel' as const },
      ]
    );
  };

  // Render emoji from unified code - same logic as web
  const renderEmoji = (unified: string): string => {
    try {
      if (unified.includes('-') || unified.length > 6) {
        return String.fromCodePoint(
          ...unified.split('-').map((code) => parseInt(code, 16))
        );
      }
      return String.fromCodePoint(parseInt(unified, 16));
    } catch {
      return '😊';
    }
  };

  // Render a single message
  const renderMessage = ({ item }: { item: Message }) => {
    const isCurrentUser = item.senderId === user?.id;
    const replyToMessage = item.replyToId
      ? messages.find((m) => m.id === item.replyToId)
      : null;

    return (
      <View
        style={[
          styles.messageRow,
          isCurrentUser ? styles.messageRowSent : styles.messageRowReceived,
        ]}
      >
        <TouchableOpacity
          style={[
            styles.messageBubble,
            isCurrentUser ? styles.sentBubble : styles.receivedBubble,
          ]}
          onLongPress={() => {
            Alert.alert('Message Actions', undefined, [
              { text: '↩️ Reply', onPress: () => setReplyingTo(item) },
              { text: '😊 React', onPress: () => quickReact(item.id) },
              { text: 'Cancel', style: 'cancel' },
            ]);
          }}
          activeOpacity={0.8}
        >
          {/* Reply context */}
          {item.replyToId && (
            <View style={styles.replyContext}>
              <Text style={styles.replyLabel}>↩️ Reply to:</Text>
              <Text style={styles.replyContent} numberOfLines={1}>
                {replyToMessage
                  ? replyToMessage.content || '[Media]'
                  : '[Original message not loaded]'}
              </Text>
            </View>
          )}

          {/* Message text */}
          {item.content ? (
            <Text
              style={[
                styles.messageText,
                isCurrentUser ? styles.sentText : styles.receivedText,
              ]}
            >
              {item.content}
            </Text>
          ) : null}

          {/* Media content */}
          {item.mediaUrl && (
            <MediaDisplay
              media={{
                url: item.mediaUrl,
                resourceType: item.mediaType || 'image',
                publicId: item.mediaPublicId || '',
                format: item.mediaFormat || '',
                messageId: item.id,
              }}
            />
          )}

          {/* Reactions */}
          {item.reactions && item.reactions.length > 0 && (
            <View style={styles.reactionsRow}>
              {item.reactions.map((reaction: Reaction, index: number) => (
                <Text key={index} style={styles.reactionEmoji}>
                  {renderEmoji(reaction.emoji)}
                </Text>
              ))}
            </View>
          )}

          {/* Timestamp */}
          <Text
            style={[
              styles.timestamp,
              isCurrentUser ? styles.timestampSent : styles.timestampReceived,
            ]}
          >
            {new Date(item.createdAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/(app)/friends');
            }
          }} 
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <View style={styles.headerAvatar}>
            <Text style={styles.headerAvatarText}>
              {friendInfo ? friendInfo.username.charAt(0).toUpperCase() : '?'}
            </Text>
          </View>
          <Text style={styles.headerName}>
            {friendInfo?.username || 'Loading...'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {!socketConnected && (
            <Ionicons name="cloud-offline" size={20} color={Colors.warning} />
          )}
        </View>
      </View>

      {/* Connection warning */}
      {!socketConnected && !loading && (
        <View style={styles.connectionWarning}>
          <Text style={styles.warningText}>
            ⚠️ Connection lost. Messages may be delayed.
          </Text>
        </View>
      )}

      {/* Messages */}
      <KeyboardAvoidingView
        style={styles.chatArea}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Loading messages...</Text>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id.toString()}
            contentContainerStyle={styles.messagesList}
            onEndReached={loadMore}
            onEndReachedThreshold={0.1}
            inverted={false}
            ListHeaderComponent={
              loadingMore ? (
                <View style={styles.loadingMore}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={styles.loadingMoreText}>Loading older messages...</Text>
                </View>
              ) : !hasMore && messages.length > 0 ? (
                <Text style={styles.noMoreText}>Beginning of conversation</Text>
              ) : null
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No messages yet. Start a conversation!
                </Text>
              </View>
            }
            onContentSizeChange={() => {
              if (messages.length > 0 && !loadingMore) {
                flatListRef.current?.scrollToEnd({ animated: false });
              }
            }}
          />
        )}

        {/* Media upload */}
        {showMediaUpload && (
          <MediaUpload
            onUploadSuccess={handleMediaUploadSuccess}
            onCancel={() => setShowMediaUpload(false)}
          />
        )}

        {/* Reply preview */}
        {replyingTo && (
          <View style={styles.replyPreview}>
            <View style={styles.replyPreviewContent}>
              <Text style={styles.replyPreviewLabel}>Reply to: </Text>
              <Text style={styles.replyPreviewText} numberOfLines={1}>
                {replyingTo.content
                  ? replyingTo.content.substring(0, 30) +
                    (replyingTo.content.length > 30 ? '...' : '')
                  : '[Media]'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close" size={20} color={Colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Message input */}
        <View style={styles.inputBar}>
          <TouchableOpacity
            style={styles.mediaBtn}
            onPress={() => setShowMediaUpload(!showMediaUpload)}
          >
            <Ionicons
              name={showMediaUpload ? 'close' : 'add'}
              size={24}
              color={Colors.primary}
            />
          </TouchableOpacity>

          <TextInput
            style={styles.textInput}
            value={messageInput}
            onChangeText={setMessageInput}
            placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
            placeholderTextColor={Colors.placeholder}
            multiline
            maxLength={2000}
            returnKeyType="send"
            onSubmitEditing={sendMessage}
            blurOnSubmit={false}
          />

          <TouchableOpacity
            style={[
              styles.sendBtn,
              (!messageInput.trim() || sending) && styles.sendBtnDisabled,
            ]}
            onPress={sendMessage}
            disabled={!messageInput.trim() || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Ionicons name="send" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundLight,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    padding: Spacing.sm,
    marginRight: Spacing.sm,
  },
  headerInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  headerAvatarText: {
    color: Colors.primary,
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  headerName: {
    color: Colors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: '600',
  },
  headerRight: {
    padding: Spacing.sm,
  },
  connectionWarning: {
    backgroundColor: 'rgba(255, 152, 0, 0.15)',
    padding: Spacing.sm,
    alignItems: 'center',
  },
  warningText: {
    color: Colors.warning,
    fontSize: FontSize.xs,
  },
  chatArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  messagesList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  loadingMoreText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  noMoreText: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: FontSize.xs,
    padding: Spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: Spacing.xxl,
  },
  emptyText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
  messageRow: {
    marginBottom: Spacing.sm,
  },
  messageRowSent: {
    alignItems: 'flex-end',
  },
  messageRowReceived: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '78%',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },
  sentBubble: {
    backgroundColor: Colors.sentBubble,
    borderBottomRightRadius: BorderRadius.sm,
  },
  receivedBubble: {
    backgroundColor: Colors.receivedBubble,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  messageText: {
    fontSize: FontSize.md,
    lineHeight: 20,
  },
  sentText: {
    color: Colors.sentBubbleText,
  },
  receivedText: {
    color: Colors.receivedBubbleText,
  },
  replyContext: {
    borderLeftWidth: 2,
    borderLeftColor: 'rgba(255,255,255,0.4)',
    paddingLeft: Spacing.sm,
    marginBottom: Spacing.sm,
    opacity: 0.8,
  },
  replyLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: FontSize.xs,
  },
  replyContent: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSize.sm,
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  timestamp: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  timestampSent: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  timestampReceived: {
    color: Colors.textMuted,
  },
  replyPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.backgroundLight,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  replyPreviewContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  replyPreviewLabel: {
    color: Colors.primary,
    fontSize: FontSize.sm,
    fontWeight: '600',
  },
  replyPreviewText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    flex: 1,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  mediaBtn: {
    padding: Spacing.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.inputText,
    fontSize: FontSize.md,
    maxHeight: 100,
    marginHorizontal: Spacing.sm,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
});
