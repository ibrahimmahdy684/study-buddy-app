export type StudyMode = 'ONLINE' | 'IN_PERSON' | 'BOTH'
export type NotificationType =
  | 'match_found'
  | 'buddy_request'
  | 'session_invite'
  | 'session_reminder'

export type User = {
  id: string
  name: string
  email: string
  phone?: string
  contactEmail?: string
  university?: string
  academicYear?: number
  createdAt: string
  updatedAt: string
}

export type Course = {
  id: string
  name: string
  code?: string
}

export type HelpTopic = {
  id: string
  topic: string
}

export type Profile = {
  id: string
  userId: string
  bio?: string
  studyPace?: string
  studyMode?: StudyMode
  preferredGroupSize?: number
  studyStyle?: string
  courses: Course[]
  helpTopics: HelpTopic[]
  createdAt: string
  updatedAt: string
}

export type Notification = {
  id: string
  userId: string
  type: NotificationType
  title: string
  message: string
  relatedId?: string
  read: boolean
  createdAt: string
  updatedAt: string
}

export type Message = {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
}

export type Conversation = {
  id: string
  participant1Id: string
  participant2Id: string
  messages: Message[]
  lastMessage?: Message
  createdAt: string
  updatedAt: string
}

export type SessionType = 'ONLINE' | 'IN_PERSON'
export type SessionStatus = 'SCHEDULED' | 'CANCELLED' | 'COMPLETED'
export type ParticipantRole = 'CREATOR' | 'PARTICIPANT'

export type SessionParticipant = {
  id: string
  userId: string
  role: ParticipantRole
  joinedAt: string
}

export type StudySession = {
  id: string
  topic: string
  description?: string
  date: string
  duration: number
  type: SessionType
  status: SessionStatus
  creatorId: string
  creatorEmail?: string
  creatorPhoneNumber?: string
  participants: SessionParticipant[]
  participantCount: number
  createdAt: string
  updatedAt: string
}

export type MatchCandidate = {
  userId: string
  score: number
  reasons: string[]
  sharedCourses: string[]
  sharedTopics: string[]
  overlapMinutes: number
}
