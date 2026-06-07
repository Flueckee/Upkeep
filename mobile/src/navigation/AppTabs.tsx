import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Text } from 'react-native';
import { TabParamList, BikeStackParamList, DueSoonStackParamList, SettingsStackParamList } from './types';
import { Colors } from '../theme';
import { useTheme } from '../context/ThemeContext';

import HomeScreen from '../screens/HomeScreen';
import BikeDetailScreen from '../screens/BikeDetailScreen';
import AddBikeScreen from '../screens/AddBikeScreen';
import ComponentDetailScreen from '../screens/ComponentDetailScreen';
import AddLogScreen from '../screens/AddLogScreen';
import EditComponentScreen from '../screens/EditComponentScreen';
import LogDetailScreen from '../screens/LogDetailScreen';
import ExportScreen from '../screens/ExportScreen';
import DueSoonScreen from '../screens/DueSoonScreen';
import ProfileScreen from '../screens/ProfileScreen';
import ColorPickerScreen from '../screens/ColorPickerScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import StravaSettingsScreen from '../screens/StravaSettingsScreen';

const Tab = createBottomTabNavigator<TabParamList>();
const BikeStack = createNativeStackNavigator<BikeStackParamList>();
const DueSoonStack = createNativeStackNavigator<DueSoonStackParamList>();
const SettingsStack = createNativeStackNavigator<SettingsStackParamList>();

// ── Shared header options factory ─────────────────────────────────────────────

function makeHeaderTheme(primary: string) {
  return {
    headerStyle: { backgroundColor: Colors.surface },
    headerTitleStyle: { color: Colors.text, fontWeight: '700' as const, fontSize: 17 },
    headerTintColor: primary,
    headerShadowVisible: false,
    contentStyle: { backgroundColor: Colors.background },
  };
}

// ── Bikes stack ───────────────────────────────────────────────────────────────

function BikesNavigator() {
  const { primaryColor: primary } = useTheme();
  return (
    <BikeStack.Navigator screenOptions={makeHeaderTheme(primary)}>
      <BikeStack.Screen name="Home"            component={HomeScreen}            options={{ title: 'Meine Bikes' }} />
      <BikeStack.Screen name="BikeDetail"      component={BikeDetailScreen}      options={{ title: 'Bike' }} />
      <BikeStack.Screen name="AddBike"         component={AddBikeScreen}         options={{ title: 'Bike hinzufügen' }} />
      <BikeStack.Screen name="ComponentDetail" component={ComponentDetailScreen} options={{ title: 'Komponente' }} />
      <BikeStack.Screen name="AddLog"          component={AddLogScreen}          options={{ title: 'Wartung eintragen' }} />
      <BikeStack.Screen name="EditComponent"   component={EditComponentScreen}   options={{ title: 'Komponente bearbeiten' }} />
      <BikeStack.Screen name="LogDetail"       component={LogDetailScreen}       options={{ title: 'Wartungseintrag' }} />
      <BikeStack.Screen name="Export"          component={ExportScreen}          options={{ title: 'PDF exportieren' }} />
    </BikeStack.Navigator>
  );
}

// ── Fällig stack ──────────────────────────────────────────────────────────────

function DueSoonNavigator() {
  const { primaryColor: primary } = useTheme();
  return (
    <DueSoonStack.Navigator screenOptions={makeHeaderTheme(primary)}>
      <DueSoonStack.Screen name="DueSoon"        component={DueSoonScreen}        options={{ title: 'Fällig' }} />
      <DueSoonStack.Screen name="ComponentDetail" component={ComponentDetailScreen} options={{ title: 'Komponente' }} />
      <DueSoonStack.Screen name="EditComponent"   component={EditComponentScreen}   options={{ title: 'Komponente bearbeiten' }} />
      <DueSoonStack.Screen name="AddLog"          component={AddLogScreen}          options={{ title: 'Wartung eintragen' }} />
      <DueSoonStack.Screen name="LogDetail"       component={LogDetailScreen}       options={{ title: 'Wartungseintrag' }} />
    </DueSoonStack.Navigator>
  );
}

// ── Profile / Settings stack ──────────────────────────────────────────────────

function ProfileNavigator() {
  const { primaryColor: primary } = useTheme();
  return (
    <SettingsStack.Navigator screenOptions={makeHeaderTheme(primary)}>
      <SettingsStack.Screen name="Profile"        component={ProfileScreen}        options={{ title: 'Profil' }} />
      <SettingsStack.Screen name="ColorPicker"    component={ColorPickerScreen}    options={{ title: 'Akzentfarbe' }} />
      <SettingsStack.Screen name="ChangePassword" component={ChangePasswordScreen} options={{ title: 'Passwort ändern' }} />
      <SettingsStack.Screen name="Strava"         component={StravaSettingsScreen} options={{ title: 'Strava' }} />
    </SettingsStack.Navigator>
  );
}

// ── Tab navigator ─────────────────────────────────────────────────────────────

export default function AppTabs() {
  const { primaryColor: primary } = useTheme();

  const tabTheme = {
    tabBarStyle: {
      backgroundColor: Colors.surface,
      borderTopColor: Colors.border,
      borderTopWidth: 1,
      elevation: 0,
      shadowOpacity: 0,
    },
    tabBarActiveTintColor: primary,
    tabBarInactiveTintColor: Colors.textMuted,
  };

  return (
    <Tab.Navigator screenOptions={tabTheme}>
      <Tab.Screen
        name="BikesTab"
        component={BikesNavigator}
        options={{ headerShown: false, title: 'Bikes', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🚴</Text> }}
      />
      <Tab.Screen
        name="DueSoonTab"
        component={DueSoonNavigator}
        options={{ headerShown: false, title: 'Fällig', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🔔</Text> }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={ProfileNavigator}
        options={{ headerShown: false, title: 'Profil', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👤</Text> }}
      />
    </Tab.Navigator>
  );
}
