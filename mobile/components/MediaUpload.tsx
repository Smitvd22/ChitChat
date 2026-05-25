// ChitChat Mobile - MediaUpload Component
// Adapted from client/src/components/MediaUpload.jsx
// Replaces browser file input with expo-image-picker
// Same Cloudinary upload: POST https://api.cloudinary.com/v1_1/{cloud}/upload

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, CLOUDINARY_UPLOAD_URL } from '../constants/config';
import { MediaUploadResult } from '../types';
import { Colors, Spacing, FontSize, BorderRadius } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';

interface MediaUploadProps {
  onUploadSuccess: (data: MediaUploadResult) => void;
  onCancel: () => void;
}

export default function MediaUpload({ onUploadSuccess, onCancel }: MediaUploadProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Pick from gallery
  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant gallery access to share images.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Take photo with camera
  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Please grant camera access to take photos.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  // Upload to Cloudinary - same endpoint and preset as web
  const uploadToCloudinary = async () => {
    if (!selectedImage) return;

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();

    if (Platform.OS === 'web') {
      // On the web, we must fetch the blob and append it directly
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      formData.append('file', blob);
    } else {
      // On iOS/Android, React Native expects this specific object format
      const uriParts = selectedImage.split('.');
      const fileType = uriParts[uriParts.length - 1];
      const mimeType = fileType === 'mp4' ? 'video/mp4' : `image/${fileType}`;

      formData.append('file', {
        uri: selectedImage,
        type: mimeType,
        name: `upload.${fileType}`,
      } as any);
    }
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    formData.append('resource_type', 'auto');

    try {
      const response = await axios.post(CLOUDINARY_UPLOAD_URL, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });

      // Same response shape as web
      onUploadSuccess({
        url: response.data.secure_url,
        publicId: response.data.public_id,
        resourceType: response.data.resource_type,
        format: response.data.format,
      });

      setSelectedImage(null);
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const cancel = () => {
    setSelectedImage(null);
    onCancel();
  };

  return (
    <View style={styles.container}>
      {!selectedImage ? (
        // Selection mode
        <View style={styles.optionsRow}>
          <TouchableOpacity style={styles.optionBtn} onPress={pickImage}>
            <Ionicons name="images" size={24} color={Colors.primary} />
            <Text style={styles.optionText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={24} color={Colors.primary} />
            <Text style={styles.optionText}>Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.optionBtn} onPress={cancel}>
            <Ionicons name="close" size={24} color={Colors.error} />
            <Text style={[styles.optionText, { color: Colors.error }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Preview mode
        <View style={styles.previewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.preview} resizeMode="contain" />

          {isUploading && (
            <View style={styles.progressOverlay}>
              <ActivityIndicator size="large" color={Colors.primary} />
              <Text style={styles.progressText}>{uploadProgress}%</Text>
            </View>
          )}

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.sendBtn, isUploading && styles.btnDisabled]}
              onPress={uploadToCloudinary}
              disabled={isUploading}
            >
              <Ionicons name="send" size={18} color="#fff" />
              <Text style={styles.sendText}>
                {isUploading ? 'Uploading...' : 'Send'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={cancel} disabled={isUploading}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.backgroundLight,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    padding: Spacing.md,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  optionBtn: {
    alignItems: 'center',
    padding: Spacing.md,
  },
  optionText: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
  },
  previewContainer: {
    alignItems: 'center',
  },
  preview: {
    width: '100%',
    height: 200,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  progressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: BorderRadius.md,
  },
  progressText: {
    color: '#fff',
    fontSize: FontSize.lg,
    fontWeight: 'bold',
    marginTop: Spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  sendBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  btnDisabled: {
    backgroundColor: Colors.buttonDisabled,
  },
  sendText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  cancelBtn: {
    paddingHorizontal: Spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelText: {
    color: Colors.textMuted,
    fontSize: FontSize.md,
  },
});
