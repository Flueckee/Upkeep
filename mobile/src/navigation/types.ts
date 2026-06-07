import { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type BikeStackParamList = {
  Home: undefined;
  BikeDetail: { bikeId: string };
  AddBike: undefined;
  ComponentDetail: { componentId: string; bikeId: string; highlight?: boolean };
  AddLog: { componentId: string; bikeTotalKm: number };
  LogDetail: { logId: string };
  EditComponent: { componentId: string; bikeId: string };
  Export: { bikeId: string; bikeName: string };
};

export type DueSoonStackParamList = {
  DueSoon: undefined;
  ComponentDetail: { componentId: string; bikeId: string; highlight?: boolean };
  EditComponent: { componentId: string; bikeId: string };
  AddLog: { componentId: string; bikeTotalKm: number };
  LogDetail: { logId: string };
};

export type SettingsStackParamList = {
  Profile: undefined;
  ColorPicker: undefined;
  ChangePassword: undefined;
  Strava: undefined;
};

export type TabParamList = {
  BikesTab: NavigatorScreenParams<BikeStackParamList>;
  DueSoonTab: NavigatorScreenParams<DueSoonStackParamList>;
  SettingsTab: NavigatorScreenParams<SettingsStackParamList>;
};
