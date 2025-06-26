export interface Intent {
  id: string
  text: string
  user: string
  category?: string
  location?: string
  tags?: string[]
  isActive?: boolean
  createdAt?: Date
  similarity?: number
}

export interface User {
  id: string
  username: string
  email?: string
  firstName?: string
  lastName?: string
  bio?: string
  avatar?: string
  location?: string
  interests?: string[]
  isActive: boolean
  lastSeen: Date
  createdAt: Date
}

export interface Connection {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'BLOCKED'
  requester: User
  receiver: User
  createdAt: Date
}

export interface Activity {
  id: string
  type: 'SPORTS' | 'DINING' | 'ENTERTAINMENT' | 'SOCIAL' | 'LEARNING' | 'TRAVEL' | 'WORK' | 'OTHER'
  title: string
  description?: string
  location?: string
  dateTime?: Date
  maxParticipants?: number
  currentParticipants: string[]
  tags: string[]
  isActive: boolean
  creator: User
  createdAt: Date
}

export interface Notification {
  id: string
  type: 'CONNECTION_REQUEST' | 'CONNECTION_ACCEPTED' | 'ACTIVITY_INVITATION' | 'ACTIVITY_UPDATE' | 'GENERAL'
  title: string
  message: string
  isRead: boolean
  data?: any
  createdAt: Date
}

