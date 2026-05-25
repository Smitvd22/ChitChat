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
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
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

  // Audio state
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  // Clean up sound on unmount
  React.useEffect(() => {
    return sound
      ? () => {
          sound.unloadAsync();
        }
      : undefined;
  }, [sound]);

  const toggleAudioPlay = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
        } else {
          // If finished, replay from start
          if (position >= duration && duration > 0) {
            await sound.replayAsync();
          } else {
            await sound.playAsync();
          }
        }
      } else {
        setIsLoading(true);
        await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
        const { sound: newSound } = await Audio.Sound.createAsync(
          { uri: media.url },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPosition(status.positionMillis);
              setDuration(status.durationMillis || 0);
              if (status.didJustFinish) {
                setIsPlaying(false);
                setPosition(status.durationMillis || 0);
              }
            }
          }
        );
        setSound(newSound);
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Failed to play audio', err);
      setIsLoading(false);
    }
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
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
  if (resourceType.includes('audio') || ['mp3', 'wav', 'ogg', 'm4a', '3gp'].includes(resourceType)) {
    const progressPercent = duration > 0 ? (position / duration) * 100 : 0;
    
    return (
      <View style={[styles.container, styles.audioContainer]}>
        <TouchableOpacity style={styles.playBtn} onPress={toggleAudioPlay} disabled={isLoading}>
          {isLoading ? (
            <ActivityIndicator size="small" color={Colors.primary} />
          ) : (
            <Ionicons name={isPlaying ? "pause" : "play"} size={24} color={Colors.primary} />
          )}
        </TouchableOpacity>
        
        <View style={styles.audioWaveform}>
          <View style={styles.audioProgressBar}>
            <View style={[styles.audioProgressFill, { width: `${progressPercent}%` }]} />
          </View>
          <View style={styles.audioTimeRow}>
            <Text style={styles.audioTime}>{formatTime(position)}</Text>
            <Text style={styles.audioTime}>{formatTime(duration)}</Text>
          </View>
        </View>
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
  audioContainer: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.xl,
    padding: Spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    width: MAX_MEDIA_WIDTH,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  audioWaveform: {
    flex: 1,
    justifyContent: 'center',
  },
  audioProgressBar: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    width: '100%',
    marginBottom: 4,
  },
  audioProgressFill: {
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: 2,
  },
  audioTimeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  audioTime: {
    color: Colors.textSecondary,
    fontSize: 10,
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
