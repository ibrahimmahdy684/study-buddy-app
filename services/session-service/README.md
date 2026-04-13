# Session Service

The Study Session Management service handles the creation, management, and lifecycle of study sessions. It allows users to create sessions, join existing ones, and track participants.

## Features

- ✅ Create study sessions with topic, date, duration, and type (online/in-person)
- ✅ Join/leave sessions with role-based participation tracking
- ✅ Cancel and mark sessions as completed
- ✅ Automatic event publishing to Kafka for notifications and other services
- ✅ Session participant management with timestamps
- ✅ Contact info storage (creator email/phone) for when messaging isn't implemented

## Architecture

### Database (Prisma)

**StudySession**
- Core session data: topic, description, date, duration
- Session type: ONLINE or IN_PERSON
- Status tracking: SCHEDULED, CANCELLED, COMPLETED
- Creator info with contact details

**SessionParticipant**
- Join table linking sessions and users
- Role-based: CREATOR or PARTICIPANT
- Tracks when participants joined

### GraphQL API

#### Queries
- `getSession(id)` - Get session details with participants
- `getMySessions()` - Get all sessions user created or joined
- `getUpcomingSessions(limit)` - Get scheduled sessions in the future

#### Mutations
- `createSession(input)` - Create new session, auto-adds creator
- `joinSession(sessionId)` - Join an existing session
- `leaveSession(sessionId)` - Leave a session (not allowed for creator)
- `cancelSession(sessionId)` - Cancel session (creator only)
- `completeSession(sessionId)` - Mark session as completed (creator only)

### Kafka Events

The service publishes three events:

1. **StudySessionCreated**
   - When: Session is created
   - Consumed by: Notification Service
   - Payload: sessionId, creatorId, topic, date, type

2. **StudySessionJoined**
   - When: User joins session
   - Consumed by: Notification Service
   - Payload: sessionId, userId, creatorId

3. **StudySessionCancelled**
   - When: Creator cancels session
   - Consumed by: Notification Service
   - Payload: sessionId, creatorId

## Setup

### 1. Environment Variables

```bash
cp .env.example .env
```

Configure in `.env`:
```
DATABASE_URL=postgresql://user:password@host:5432/session_db
PORT=4005
KAFKA_BROKER=localhost:9092
```

### 2. Database Setup

```bash
npm install
npm run db:push        # Push schema to database
npm run db:generate    # Generate Prisma client
```

### 3. Run Service

**Development:**
```bash
npm run dev
```

**Production:**
```bash
npm start
```

## API Examples

### Create Session
```graphql
mutation {
  createSession(input: {
    topic: "Database Design"
    description: "Study MongoDB and SQL design patterns"
    date: "2026-04-15T18:00:00Z"
    duration: 120
    type: ONLINE
  }) {
    id
    topic
    participantCount
  }
}
```

### Join Session
```graphql
mutation {
  joinSession(sessionId: "abc123") {
    id
    topic
    participants {
      userId
      role
      joinedAt
    }
  }
}
```

### Get My Sessions
```graphql
query {
  getMySessions {
    id
    topic
    date
    type
    status
    participantCount
  }
}
```

## Integration Points

### With User Service
- Receives user ID from auth context
- Caller should provide user email/phone in headers

### With Notification Service
- Publishes StudySessionCreated → triggers notification
- Publishes StudySessionJoined → triggers notification
- Publishes StudySessionCancelled → triggers notification

### With Gateway
- Gateway forwards requests to this service
- Gateway provides auth context (X-User-ID, X-User-Email headers)

## Port

Default: `4005`

(Configured in `package.json` dev/start scripts and `.env`)

## Error Handling

- **UNAUTHENTICATED**: User not logged in
- **NOT_FOUND**: Session doesn't exist
- **BAD_USER_INPUT**: Invalid input (invalid duration, past date, already participant)
- **FORBIDDEN**: User lacks permission (non-creator trying to cancel)

## Development Tips

- Use `npm run db:studio` to browse database with Prisma Studio
- Set `SKIP_KAFKA=true` to develop without Kafka running
- All timestamps are stored as ISO strings in GraphQL responses
