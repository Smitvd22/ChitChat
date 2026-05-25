// App group layout - authenticated screens with header
import { Stack } from 'expo-router';
import { Colors } from '../../constants/theme';

export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.background },
        headerTintColor: Colors.textPrimary,
        headerTitleStyle: { fontWeight: '600' },
        contentStyle: { backgroundColor: Colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen
        name="friends"
        options={{ title: 'ChitChat', headerBackVisible: false }}
      />
      <Stack.Screen
        name="chat/[friendId]"
        options={{ title: 'Chat', headerShown: false }}
      />
    </Stack>
  );
}
