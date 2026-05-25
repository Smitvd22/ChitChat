import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, Platform } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_UPLOAD_PRESET } from '../constants/config';
import { Colors, Spacing, BorderRadius, FontSize } from '../constants/theme';
import { MediaUploadResult } from '../types';

interface VoiceRecorderProps {
  onUploadSuccess: (data: MediaUploadResult) => void;
  onCancel: () => void;
}

export default function VoiceRecorder({ onUploadSuccess, onCancel }: VoiceRecorderProps) {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [duration, setDuration] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Start recording immediately when mounted
  useEffect(() => {
    startRecording();
    return () => {
      stopRecordingAndDiscard();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startRecording = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission denied', 'Please grant microphone access to record audio.');
        onCancel();
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);

      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Failed to start recording');
      onCancel();
    }
  };

  const stopRecordingAndDiscard = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
      }
      setRecording(null);
    } catch (err) {
      // ignore
    }
  };

  const handleCancel = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    await stopRecordingAndDiscard();
    onCancel();
  };

  const handleSend = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (!recording) return;

    setIsUploading(true);

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) throw new Error('No audio URI found');

      // Upload to Cloudinary
      const formData = new FormData();

      if (Platform.OS === 'web') {
        const response = await fetch(uri);
        const blob = await response.blob();
        formData.append('file', blob);
      } else {
        const fileType = uri.endsWith('.m4a') ? 'm4a' : '3gp';
        formData.append('file', {
          uri,
          type: `audio/${fileType}`,
          name: `voice_message.${fileType}`,
        } as any);
      }
      
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
      formData.append('resource_type', 'auto'); // Cloudinary requires 'auto' or 'video' for audio

      const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      onUploadSuccess({
        url: response.data.secure_url,
        publicId: response.data.public_id,
        resourceType: response.data.resource_type || 'audio',
        format: response.data.format,
      });
    } catch (error) {
      console.error('Failed to upload audio', error);
      Alert.alert('Upload Failed', 'Could not send voice message.');
      onCancel();
    } finally {
      setIsUploading(false);
      setRecording(null);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <View style={styles.container}>
      <View style={styles.recordingIndicator}>
        <View style={styles.redDot} />
        <Text style={styles.timerText}>{formatTime(duration)}</Text>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={handleCancel} disabled={isUploading}>
          <Ionicons name="trash" size={24} color={Colors.error} />
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.sendBtn, isUploading && styles.disabledBtn]} 
          onPress={handleSend} 
          disabled={isUploading || duration < 1}
        >
          {isUploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="send" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.inputBackground,
    borderRadius: BorderRadius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginHorizontal: Spacing.sm,
    maxHeight: 50,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  redDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.error,
  },
  timerText: {
    color: Colors.inputText,
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.lg,
  },
  cancelBtn: {
    padding: Spacing.xs,
  },
  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.round,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  disabledBtn: {
    backgroundColor: Colors.buttonDisabled,
  },
});
