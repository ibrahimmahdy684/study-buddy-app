# Study Buddy Frontend

A React-based frontend for the Study Buddy platform, allowing users to find study partners and manage study sessions.

## Project Structure

```
frontend/
├── public/                 # Static assets
├── src/
│   ├── components/         # Reusable React components
│   ├── pages/              # Page components (routes)
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API services (Apollo Client, etc.)
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions and constants
│   ├── styles/             # Global styles
│   ├── assets/             # Images, icons, fonts
│   ├── App.jsx             # Root App component
│   └── main.jsx            # Entry point
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── package.json            # Dependencies and scripts
├── .env.example            # Environment variables template
└── .gitignore              # Git ignore rules
```

## Setup

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your backend URL:
```
VITE_GRAPHQL_ENDPOINT=http://localhost:4000/graphql
VITE_API_BASE_URL=http://localhost:4000
```

## Development

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## Build

Build for production:
```bash
npm run build
```

Output will be in the `dist/` directory.

## Features to Implement

- [ ] Authentication (Login/Register)
- [ ] User Profile Management
- [ ] Match Discovery
- [ ] Study Session Management
- [ ] Messaging/Chat
- [ ] User Availability Management
- [ ] Notifications

## Technologies

- **React 18** - UI library
- **Vite** - Build tool
- **Apollo Client** - GraphQL client
- **React Router** - Client-side routing
- **CSS** - Styling

## Environment Variables

- `VITE_GRAPHQL_ENDPOINT` - GraphQL API endpoint
- `VITE_API_BASE_URL` - Base API URL
- `VITE_APP_NAME` - Application name
