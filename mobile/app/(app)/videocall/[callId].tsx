import React, { useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Camera } from 'expo-camera';
import { useAuth } from '../../../contexts/AuthContext';
import { Colors } from '../../../constants/theme';
import { API_URL, WEB_APP_URL } from '../../../constants/config';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

export default function VideoCallScreen() {
  const { callId, isInitiator, receiverId, callerId } = useLocalSearchParams<{
    callId: string;
    isInitiator: string;
    receiverId?: string;
    callerId?: string;
  }>();
  
  const { user } = useAuth();
  const router = useRouter();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [permissionsGranted, setPermissionsGranted] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const cameraStatus = await Camera.requestCameraPermissionsAsync();
        const micStatus = await Camera.requestMicrophonePermissionsAsync();
        setPermissionsGranted(
          cameraStatus.status === 'granted' && micStatus.status === 'granted'
        );
      } catch (err) {
        console.error('Failed to request permissions', err);
        setPermissionsGranted(false);
      }
    })();
  }, []);

  // URL to load in WebView with a query param to hide the Navbar
  const callUrl = `${WEB_APP_URL}/videocall/${callId}?webview=true`;

  // Inject authentication state into the WebView before it loads!
  // We also inject the location state (isInitiator) into sessionStorage
  // so the Web App's VideoCall.jsx knows its role accurately.
  const injectedJavaScript = `
    try {
      // Forward console logs to React Native
      const originalLog = console.log;
      const originalError = console.error;
      const originalWarn = console.warn;
      
      // Helper to serialize arguments safely, extracting Error properties
      const serializeArgs = function(args) {
        return Array.from(args).map(arg => {
          if (arg instanceof Error) {
            return { message: arg.message, name: arg.name, stack: arg.stack };
          }
          return arg;
        });
      };
      
      console.log = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'log', data: serializeArgs(arguments) }));
        originalLog.apply(console, arguments);
      };
      console.error = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'error', data: serializeArgs(arguments) }));
        originalError.apply(console, arguments);
      };
      console.warn = function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'warn', data: serializeArgs(arguments) }));
        originalWarn.apply(console, arguments);
      };

      // 1. Inject Auth User
      const userStr = '${JSON.stringify(user)}';
      localStorage.setItem('user', userStr);
      
      // 2. Inject Role State
      sessionStorage.setItem('isInitiator:${callId}', '${isInitiator}');
      
      // 3. Prevent annoying alert dialogs inside the WebView
      window.alert = function() {};
      
      true; // Required for injectedJavaScript
    } catch (e) {
      console.error(e);
      true;
    }
  `;

  return (
    <SafeAreaView style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: 'white', marginTop: 10 }}>Connecting...</Text>
        </View>
      )}

      {!permissionsGranted ? (
        <View style={styles.loadingContainer}>
          <Text style={{ color: 'white', textAlign: 'center', padding: 20 }}>
            Camera and Microphone permissions are required for video calls.
          </Text>
        </View>
      ) : (
        <WebView
        ref={webViewRef}
        source={{ uri: callUrl }}
        style={styles.webview}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScript}
        onLoadEnd={() => setLoading(false)}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsInlineMediaPlayback={true}
        mediaPlaybackRequiresUserAction={false}
        originWhitelist={['*']}
        mediaCapturePermissionGrantType="grantIfSameHostElsePrompt"
        onMessage={(event) => {
          try {
            const msg = JSON.parse(event.nativeEvent.data);
            if (msg.type === 'log') console.log('WEBVIEW LOG:', ...msg.data);
            else if (msg.type === 'error') console.error('WEBVIEW ERROR:', ...msg.data);
            else if (msg.type === 'warn') console.warn('WEBVIEW WARN:', ...msg.data);
            else console.log('WebView message:', event.nativeEvent.data);
          } catch(e) {
            console.log('WebView message (raw):', event.nativeEvent.data);
          }
        }}
        onError={(syntheticEvent) => {
          const { nativeEvent } = syntheticEvent;
          console.error('WebView error: ', nativeEvent);
          Alert.alert('Connection Error', 'Could not load video call interface.');
        }}
      />
      )}
      
      {/* Fallback back button in case the WebView fails or gets stuck */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Black background for video calls
  },
  webview: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backButton: {
    position: 'absolute',
    top: 40,
    left: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});
