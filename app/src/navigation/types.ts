import type { NavigatorScreenParams } from '@react-navigation/native';

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  Legal: { document: 'terms' | 'privacy' };
};

export type MainTabParamList = {
  Descubrir: undefined;
  Solicitudes: undefined;
  Chats: undefined;
  Cuenta: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<MainTabParamList>;
  Profile: { userId: string };
  InterestedProfiles: undefined;
  ReceivedLikes: undefined;
  BlockedUsers: undefined;
  SentPhotoRequests: undefined;
  EditProfile: undefined;
  ChatDetail: { userId: string; name: string; avatar?: string | null; initialMessage?: string };
  ArchivedChats: undefined;
  Legal: { document: 'terms' | 'privacy' };
};
