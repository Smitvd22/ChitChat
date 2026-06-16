import React from 'react';
import MediaDisplay from '../MediaDisplay';
import VibeTypeCard from '../vibetype/VibeTypeCard';
import EmojiPicker from 'emoji-picker-react';

/**
 * MessageBubble — Renders a single message with reply context,
 * media, reactions, and action buttons.
 * Wrapped with React.memo for render optimization.
 */
const MessageBubble = ({
  message,
  isCurrentUser,
  replyToMessage,
  onReply,
  onReact,
  onSendReaction,
  onScrollToMessage,
  showEmojiPicker,
  activeReactionMessage,
  onCloseEmojiPicker,
}) => {
  // Parse vibe metadata from content
  const parseContent = () => {
    if (!message.content) return { text: '', vibeMeta: null };
    const parts = message.content.split('|VIBE_META:');
    const text = parts[0];
    let vibeMeta = null;
    if (parts.length > 1) {
      try {
        vibeMeta = JSON.parse(parts[1]);
      } catch (e) { /* ignore */ }
    }
    return { text, vibeMeta };
  };

  const { text: messageText, vibeMeta } = parseContent();

  const renderEmoji = (emojiCode) => {
    try {
      if (emojiCode.includes('-') || emojiCode.length > 6) {
        return String.fromCodePoint(
          ...emojiCode.split('-').map(code => parseInt(code, 16))
        );
      }
      return String.fromCodePoint(parseInt(emojiCode, 16));
    } catch (e) {
      return '😊';
    }
  };

  return (
    <div
      className={`message ${isCurrentUser ? 'sent' : 'received'} ${message._optimistic ? 'message-optimistic' : ''} ${message._failed ? 'message-failed' : ''}`}
      data-message-id={message.id}
    >
      <div className="message-bubble">
        {/* Reply context */}
        {message.replyToId && (
          <div
            className="reply-context"
            onClick={() => onScrollToMessage(message.replyToId)}
            style={{ cursor: 'pointer' }}
          >
            <div className="reply-indicator">↩️ Reply to:</div>
            <div className="reply-content">
              {replyToMessage
                ? (replyToMessage.content
                  ? replyToMessage.content.substring(0, 50) + (replyToMessage.content.length > 50 ? '...' : '')
                  : replyToMessage.mediaUrl
                    ? '[Media]'
                    : '[Message]')
                : '[Original message not loaded]'}
            </div>
          </div>
        )}

        {/* Message text */}
        {message.content && (
          <div className="message-content">
            {messageText}
            {vibeMeta && <VibeTypeCard metadata={vibeMeta} />}
          </div>
        )}

        {/* Media */}
        {(message.mediaUrl || (message.hasMedia && !message.mediaUrl)) && (
          <MediaDisplay
            media={{
              url: message.mediaUrl || '',
              resourceType: message.mediaType || 'image',
              publicId: message.mediaPublicId || '',
              format: message.mediaFormat || '',
              messageId: message.id,
              timestamp: message.mediaTimestamp || Date.now(),
            }}
          />
        )}

        {/* Timestamp */}
        <div className="message-time">
          {message._optimistic
            ? (message._failed ? '⚠ Failed' : 'Sending...')
            : (
              <>
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
                {isCurrentUser && (
                  <span className={`message-status ${message.read ? 'read' : 'delivered'}`}>
                    {message.read ? '✓✓' : '✓'}
                  </span>
                )}
              </>
            )
          }
        </div>
      </div>

      {/* Reactions */}
      {message.reactions && message.reactions.length > 0 && (
        <div className="message-reactions">
          {message.reactions.map((reaction, index) => (
            <span key={index} className="reaction" title={reaction.username}>
              {renderEmoji(reaction.emoji)}
            </span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="message-actions">
        <button
          className="action-button reply-button"
          onClick={() => onReply(message)}
          title="Reply"
        >
          ↩️
        </button>
        <button
          className="action-button react-button"
          onClick={() => onReact(message.id)}
          title="React"
        >
          😊
        </button>

        {/* Emoji picker */}
        {showEmojiPicker && activeReactionMessage === message.id && (
          <div className={`emoji-picker-container ${isCurrentUser ? 'emoji-picker-sent' : 'emoji-picker-received'}`}>
            <div className="emoji-picker-close" onClick={onCloseEmojiPicker}>✕</div>
            <EmojiPicker
              onEmojiClick={(emojiObj) => onSendReaction(message.id, emojiObj)}
              disableAutoFocus={true}
              native={true}
              searchPlaceholder="Search emoji..."
              previewConfig={{ showPreview: false }}
              width="min(100vw - 20px, 280px)"
              height="320px"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(MessageBubble, (prev, next) => {
  // Custom comparison: only re-render if relevant props changed
  return (
    prev.message === next.message &&
    prev.isCurrentUser === next.isCurrentUser &&
    prev.replyToMessage === next.replyToMessage &&
    prev.showEmojiPicker === next.showEmojiPicker &&
    prev.activeReactionMessage === next.activeReactionMessage
  );
});
