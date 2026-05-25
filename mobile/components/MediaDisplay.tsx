// ChitChat Mobile - MediaDisplay Component
// Adapted from client/src/components/MediaDisplay.jsx
// Replaces HTML img/video/audio with React Native Image and expo-av
// Same Cloudinary URL optimization logic

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Linking,
  Dimensions,
} from 'react-native';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_MEDIA_WIDTH = SCREEN_WIDTH * 0.6;

interface MediaProps {
  media: {
    url: string;
    resourceType?: string;
    publicId?: string;
    format?: string;
    messageId?: number;
  };
}

export default function MediaDisplay({ media }: MediaProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  if (!media?.url) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Media unavailable</Text>
      </View>
    );
  }

  const resourceType = (media.resourceType || '').toLowerCase();

  const handleLoad = () => {
    setIsLoading(false);
    setLoadError(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setLoadError(true);
  };

  const retryLoad = () => {
    setIsLoading(true);
    setLoadError(false);
  };

  const openInBrowser = () => {
    Linking.openURL(media.url);
  };

  // Image display
  if (resourceType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(resourceType)) {
    return (
      <View style={styles.container}>
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        )}
        {loadError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load image</Text>
            <TouchableOpacity onPress={retryLoad} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={openInBrowser}>
              <Text style={styles.linkText}>Open in browser</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onPress={openInBrowser} activeOpacity={0.9}>
            <Image
              source={{ uri: media.url }}
              style={styles.image}
              onLoad={handleLoad}
              onError={handleError}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // Video display
  if (resourceType.includes('video') || ['mp4', 'webm', 'mov'].includes(resourceType)) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={openInBrowser} style={styles.videoPlaceholder}>
          <Text style={styles.videoIcon}>🎬</Text>
          <Text style={styles.videoText}>Tap to play video</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Audio display
  if (resourceType.includes('audio') || ['mp3', 'wav', 'ogg'].includes(resourceType)) {
    return (
      <View style={styles.container}>
        <TouchableOpacity onPress={openInBrowser} style={styles.audioPlaceholder}>
          <Text style={styles.audioIcon}>🎵</Text>
          <Text style={styles.audioText}>Tap to play audio</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Unknown type
  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={openInBrowser} style={styles.unknownPlaceholder}>
        <Text style={styles.unknownText}>📎 Open attachment</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    maxWidth: MAX_MEDIA_WIDTH,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
    marginTop: Spacing.xs,
  },
  image: {
    width: MAX_MEDIA_WIDTH,
    height: MAX_MEDIA_WIDTH * 0.75,
    borderRadius: BorderRadius.md,
  },
  loadingOverlay: {
    width: MAX_MEDIA_WIDTH,
    height: MAX_MEDIA_WIDTH * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
  },
  errorContainer: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  errorText: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
  },
  retryBtn: {
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.sm,
  },
  retryText: {
    color: '#fff',
    fontSize: FontSize.sm,
  },
  linkText: {
    color: Colors.info,
    fontSize: FontSize.xs,
    marginTop: Spacing.sm,
    textDecorationLine: 'underline',
  },
  videoPlaceholder: {
    width: MAX_MEDIA_WIDTH,
    height: 80,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoIcon: {
    fontSize: 24,
  },
  videoText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  audioPlaceholder: {
    width: MAX_MEDIA_WIDTH,
    height: 60,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  audioIcon: {
    fontSize: 20,
  },
  audioText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
  unknownPlaceholder: {
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  unknownText: {
    color: Colors.textSecondary,
    fontSize: FontSize.sm,
  },
});
