// Entry point redirect
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Redirect href="/(app)/friends" />;
  }

  return <Redirect href="/(auth)/login" />;
}
