export type Photo = { url: string };

export type Profile = {
  id: string;
  userId: string;
  displayName?: string | null;
  gender?: string | null;
  lookingFor?: string | null;
  birthDate?: string | null;
  address?: string | null;
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
  phone?: string | null;
  country?: string | null;
  backgroundColor?: string | null;
  status?: string;
  plan?: string | null;
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
};

export type Message = {
  id: string;
  content?: string | null;
  imageUrl?: string | null;
  senderId: string;
  receiverId: string;
  sentAt: string;
  read?: boolean;
  type?: 'text' | 'image';
};
