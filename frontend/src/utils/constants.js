// API endpoints
export const API_ENDPOINTS = {
  GRAPHQL:
    import.meta.env.VITE_GRAPHQL_ENDPOINT ||
    import.meta.env.REACT_APP_GATEWAY_URL ||
    'http://localhost:4000/graphql',
  API_BASE:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.REACT_APP_GATEWAY_URL?.replace(/\/graphql$/, '') ||
    'http://localhost:4000',
}

// Local storage keys
export const STORAGE_KEYS = {
  USER_ID: 'userId',
  USER_EMAIL: 'userEmail',
  THEME: 'theme',
}

// Study pace options
export const STUDY_PACE_OPTIONS = [
  { value: 'slow', label: 'Slow' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'fast', label: 'Fast' },
]

// Study mode options
export const STUDY_MODE_OPTIONS = [
  { value: 'individual', label: 'Individual' },
  { value: 'group', label: 'Group' },
  { value: 'flexible', label: 'Flexible' },
]

// Study style options
export const STUDY_STYLE_OPTIONS = [
  { value: 'visual', label: 'Visual' },
  { value: 'auditory', label: 'Auditory' },
  { value: 'reading', label: 'Reading/Writing' },
  { value: 'kinesthetic', label: 'Kinesthetic' },
]

// Group size options
export const GROUP_SIZE_OPTIONS = [
  { value: 1, label: '1 (Just me)' },
  { value: 2, label: '2 people' },
  { value: 3, label: '3-4 people' },
  { value: 5, label: '5+ people' },
]

// Session status
export const SESSION_STATUS = {
  SCHEDULED: 'scheduled',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
}
