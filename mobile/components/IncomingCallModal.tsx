import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, FontSize, Spacing, BorderRadius } from '../constants/theme';
import { useAuth } from '../contexts/AuthContext';

export default function IncomingCallModal() {
  const { incomingCall, acceptCall, rejectCall } = useAuth();
  const [timeLeft, setTimeLeft] = useState(30);

  useEffect(() => {
    if (!incomingCall) {
      setTimeLeft(30);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          rejectCall();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingCall, rejectCall]);

  if (!incomingCall) return null;

  return (
    <Modal visible={!!incomingCall} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Ionicons name="videocam" size={32} color={Colors.primary} />
            <Text style={styles.title}>Incoming Video Call</Text>
          </View>
          
          <Text style={styles.callerName}>{incomingCall.fromUsername || 'Unknown User'}</Text>
          <Text style={styles.timer}>Auto-declining in {timeLeft}s</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[styles.button, styles.acceptButton]} 
              onPress={acceptCall}
              activeOpacity={0.8}
            >
              <Ionicons name="call" size={24} color="#fff" />
              <Text style={styles.buttonText}>Accept</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.button, styles.rejectButton]} 
              onPress={rejectCall}
              activeOpacity={0.8}
            >
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.buttonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  container: {
    backgroundColor: Colors.backgroundLight,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  title: {
    fontSize: FontSize.lg,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  callerName: {
    fontSize: FontSize.title,
    color: Colors.textPrimary,
    fontWeight: 'bold',
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  timer: {
    fontSize: FontSize.md,
    color: Colors.warning,
    marginBottom: Spacing.xl,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  acceptButton: {
    backgroundColor: Colors.success,
  },
  rejectButton: {
    backgroundColor: Colors.error,
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: 'bold',
  },
});
