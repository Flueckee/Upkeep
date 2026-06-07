import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../context/AuthContext';
import AuthStack from './AuthStack';
import AppTabs from './AppTabs';
import { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';

export default function RootNavigator() {
  const { user, isLoading } = useAuth();
  const { primaryColor: primary } = useTheme();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={primary} size="large" />
      </View>
    );
  }

  return user ? <AppTabs /> : <AuthStack />;
}
