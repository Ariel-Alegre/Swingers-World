export type Photo = { url: string };

export type Profile = {
  id: string;
  userId: string;
  displayName?: string | null;
  profileType?: 'single' | 'couple';
  partnerFirstName?: string | null;
  partnerLastName?: string | null;
  coupleType?: 'woman_man' | 'two_women' | 'two_men' | 'other' | null;
  gender?: string | null;
  lookingFor?: string | null;
  lookingForProfileType?: 'single' | 'couple' | 'both';
  lookingForCoupleType?: 'woman_man' | 'two_women' | 'two_men' | 'other' | 'all' | null;
  birthDate?: string | null;
  address?: string | null;
  city?: string | null;
  region?: string | null;
  countryCode?: string | null;
  timezone?: string | null;
  locationTrackingEnabled?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  radius?: number | null;
  description?: string | null;
  photos?: Photo[] | null;
  photosVisible?: boolean;
  publicProfile?: boolean;
  privacyEnabled?: boolean;
  verified?: boolean;
};

export type User = {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  country?: string | null;
  backgroundColor?: string | null;
  status?: string;
  plan?: string | null;
  profileComplete?: boolean;
  canViewPrivatePhotos?: boolean;
  photoRequestStatus?: 'pending' | 'accepted' | null;
  Profile?: Profile | null;
};

export type LoginResponse = { token: string; user: User };

export type PhotoRequest = {
  id: string;
  requesterId: string;
  targetUserId: string;
  status: 'pending' | 'accepted' | 'rejected';
  permissionExpiresAt?: string | null;
  requester?: User;
  targetUser?: User;
};

export type AppNotification = {
  id: string;
  type: 'photo_request' | 'photo_request_accepted' | 'profile_incomplete';
  description?: string | null;
  read: boolean;
  relatedId?: string | null;
  createdAt: string;
};

export type Conversation = {
  participantId: string;
  firstName: string;
  lastName: string;
  avatar?: string | null;
  lastMessage?: string | null;
  lastMessageAt?: string;
  isIncoming?: boolean;
  read?: boolean;
  unreadCount?: number;
};

export type Message = {
  id: string;
  content?: string | null;
  imageUrl?: string | null;
  senderId: string;
  receiverId: string;
  sentAt: string;
  read?: boolean;
  deliveredAt?: string | null;
  readAt?: string | null;
  type?: 'text' | 'image';
};
