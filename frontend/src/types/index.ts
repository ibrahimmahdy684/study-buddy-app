// User types
export interface User {
  id: string
  email: string
  name: string
  avatar?: string
  createdAt: string
  updatedAt: string
}

// Profile types
export interface Profile {
  userId: string
  bio?: string
  studyPace?: string
  studyMode?: string
  preferredGroupSize?: number
  studyStyle?: string
  topics?: string[]
  courses?: string[]
}

// Match types
export interface Match {
  userId: string
  candidateUserId: string
  score: number
  matchedAt: string
}

// Session types
export interface StudySession {
  id: string
  userId: string
  partnerId: string
  topic: string
  startTime: string
  endTime: string
  status: 'scheduled' | 'active' | 'completed' | 'cancelled'
  createdAt: string
  updatedAt: string
}

// Message types
export interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  createdAt: string
  read: boolean
}

// Availability types
export interface Availability {
  id: string
  userId: string
  date: string
  startTime: string
  endTime: string
  isRecurring: boolean
  createdAt: string
  updatedAt: string
}
