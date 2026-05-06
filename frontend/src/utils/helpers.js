// Session/auth note:
// Authentication is cookie-based; do not persist auth tokens in localStorage.
export const hasSessionCookie = () => {
  // This only detects non-httpOnly cookies. Real auth checks should be validated by backend responses.
  return document.cookie.length > 0
}

// Date formatting
export const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export const formatDateTime = (date) => {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Error handling
export const getErrorMessage = (error) => {
  if (error.graphQLErrors && error.graphQLErrors.length > 0) {
    return error.graphQLErrors[0].message
  }
  if (error.networkError) {
    return 'Network error. Please check your connection.'
  }
  return error.message || 'An error occurred'
}

// Validation
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const isValidPassword = (password) => {
  return password && password.length >= 8
}
