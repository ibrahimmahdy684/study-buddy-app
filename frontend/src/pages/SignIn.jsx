import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { BookOpen, AlertCircle } from 'lucide-react'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import heroImage from '../assets/landing/hero-study.jpg'
import { isValidEmail, isValidPassword, getErrorMessage } from '../utils/helpers'

const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      message
      user {
        id
        name
        email
      }
    }
  }
`

export default function SignIn() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  const [login, { loading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: () => {
      navigate('/dashboard')
    },
    onError: (error) => {
      setServerError(getErrorMessage(error))
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email'
    }

    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (!isValidPassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setServerError(null)

    const newErrors = validateForm()
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      await login({
        variables: {
          input: {
            email: formData.email,
            password: formData.password
          }
        }
      })
    } catch (err) {
      // Error handled by onError callback
    }
  }

  return (
    <div className="min-h-screen h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src={heroImage}
          alt="Study workspace"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#C76B4F]/80"></div>
      </div>

      <div className="relative z-10 w-full max-w-md mx-4 py-4">
        <div className="bg-white rounded-2xl shadow-2xl p-6 md:p-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <BookOpen className="w-8 h-8 text-[#C76B4F]" />
            <span className="text-2xl font-bold text-[#C76B4F]" style={{ fontFamily: 'Poppins, sans-serif' }}>
              StudyBuddy
            </span>
          </div>

          <h2 className="text-2xl font-bold text-center text-[#2B2B2B] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Welcome Back
          </h2>
          <p className="text-center text-[#5A5A5A] mb-6 text-sm">
            Sign in to continue your study journey
          </p>

          {serverError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-[#2B2B2B] mb-1.5 text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your.email@university.edu"
                disabled={loading}
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-[#2B2B2B] mb-1.5 text-sm font-medium">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full px-4 py-2.5 bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter your password"
                disabled={loading}
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B35A3F] transition-colors font-medium disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <div className="mt-5 text-center">
            <p className="text-[#5A5A5A] text-sm">
              Don't have an account?{' '}
              <Link to="/register" className="text-[#C76B4F] hover:underline font-medium">
                Sign up
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-white hover:underline text-sm">
            ← Back to Home
          </Link>
        </div>
      </div>
    </div>
  )
}
