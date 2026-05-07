import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useMutation, gql } from '@apollo/client'
import { BookOpen, Plus, X } from 'lucide-react'
import { ImageWithFallback } from '../components/figma/ImageWithFallback'
import registerImage from '../assets/landing/benefits-campus.jpg'
import { isValidEmail, isValidPassword, getErrorMessage } from '../utils/helpers'
import { GET_ME } from '../hooks/useSession'

const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      message
      token
      user {
        id
        name
        email
      }
    }
  }
`

export default function SignUp() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    university: '',
    academicYear: '',
    bio: '',
    courses: [],
    studyTopics: []
  })
  const [newCourse, setNewCourse] = useState('')
  const [newTopic, setNewTopic] = useState('')
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState(null)

  const [register, { loading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: () => {
      navigate('/study-preferences', { replace: true })
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

  const addCourse = () => {
    const course = newCourse.trim()
    if (course && !formData.courses.includes(course)) {
      setFormData(prev => ({
        ...prev,
        courses: [...prev.courses, course]
      }))
      setNewCourse('')
    }
  }

  const removeCourse = (course) => {
    setFormData(prev => ({
      ...prev,
      courses: prev.courses.filter(item => item !== course)
    }))
  }

  const addTopic = () => {
    const topic = newTopic.trim()
    if (topic && !formData.studyTopics.includes(topic)) {
      setFormData(prev => ({
        ...prev,
        studyTopics: [...prev.studyTopics, topic]
      }))
      setNewTopic('')
    }
  }

  const removeTopic = (topic) => {
    setFormData(prev => ({
      ...prev,
      studyTopics: prev.studyTopics.filter(item => item !== topic)
    }))
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Full name is required'
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters'
    }

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

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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
      await register({
        variables: {
          input: {
            name: formData.name,
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
    <div className="min-h-screen w-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src={registerImage}
          alt="University library"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-[#C76B4F]/75" />
      </div>

      <div className="relative z-10 w-full max-w-5xl mx-4">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-[#C76B4F]" />
              <span className="text-xl font-bold text-[#C76B4F]" style={{ fontFamily: 'Poppins, sans-serif' }}>
                StudyBuddy
              </span>
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-[#2B2B2B] leading-tight" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Create Your Account
              </h1>
              <p className="text-xs text-[#5A5A5A]">Join thousands of students studying smarter</p>
            </div>
            <div className="text-right text-xs text-[#5A5A5A]">
              Already have an account?{' '}
              <Link to="/login" className="text-[#C76B4F] font-medium hover:underline">
                Sign in
              </Link>
            </div>
          </div>

          {serverError && (
            <div className="mx-6 mt-3 p-2 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
              {serverError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 px-6 py-4">
            <div className="md:pr-6 md:border-r border-gray-100 space-y-3">
              <h2 className="text-sm font-semibold text-[#C76B4F] uppercase tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Account Details
              </h2>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="e.g. Sarah Johnson"
                  disabled={loading}
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Email Address</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="your.email@university.edu"
                  disabled={loading}
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">
                  Phone Number <span className="text-[#5A5A5A] font-normal">(optional)</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                  placeholder="+1 (555) 000-0000"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Password</label>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${
                    errors.password ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="At least 8 characters"
                  disabled={loading}
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Confirm Password</label>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent ${
                    errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Confirm your password"
                  disabled={loading}
                />
                {errors.confirmPassword && <p className="mt-1 text-xs text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>

            <div className="md:pl-6 space-y-3 mt-4 md:mt-0">
              <h2 className="text-sm font-semibold text-[#C76B4F] uppercase tracking-wide" style={{ fontFamily: 'Poppins, sans-serif' }}>
                Academic Profile
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">University</label>
                  <input
                    type="text"
                    name="university"
                    value={formData.university}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                    placeholder="e.g. Stanford"
                    disabled={loading}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Academic Year</label>
                  <select
                    name="academicYear"
                    value={formData.academicYear}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                    disabled={loading}
                  >
                    <option value="">Select year</option>
                    <option value="Freshman">Freshman</option>
                    <option value="Sophomore">Sophomore</option>
                    <option value="Junior">Junior</option>
                    <option value="Senior">Senior</option>
                    <option value="Graduate">Graduate</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Short Bio <span className="text-[#5A5A5A] font-normal">(optional)</span></label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent resize-none"
                  placeholder="Tell us a bit about yourself and your study goals..."
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Courses <span className="text-[#5A5A5A] font-normal">(optional)</span></label>
                <div className="flex gap-1.5 mb-1.5">
                  <input
                    type="text"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addCourse()
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                    placeholder="e.g. Computer Science 101"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={addCourse}
                    className="px-2.5 py-1.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors disabled:opacity-60"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[24px]">
                  {formData.courses.map(course => (
                    <span key={course} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F4E3C8] text-[#2B2B2B] rounded-full text-xs">
                      {course}
                      <button type="button" onClick={() => removeCourse(course)} className="hover:text-[#C76B4F]" disabled={loading}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#2B2B2B] mb-1">Study Topics <span className="text-[#5A5A5A] font-normal">(optional)</span></label>
                <div className="flex gap-1.5 mb-1.5">
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTopic()
                      }
                    }}
                    className="flex-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                    placeholder="e.g. Machine Learning"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={addTopic}
                    className="px-2.5 py-1.5 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors disabled:opacity-60"
                    disabled={loading}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1 min-h-[24px]">
                  {formData.studyTopics.map(topic => (
                    <span key={topic} className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#F4E3C8] text-[#2B2B2B] rounded-full text-xs">
                      {topic}
                      <button type="button" onClick={() => removeTopic(topic)} className="hover:text-[#C76B4F]" disabled={loading}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="px-6 pb-5 pt-2 border-t border-gray-100 flex items-center gap-4 flex-col sm:flex-row">
            <Link to="/" className="text-sm text-[#5A5A5A] hover:text-[#C76B4F] transition-colors">
              ← Back to Home
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="w-full sm:flex-1 py-2.5 bg-[#C76B4F] text-white rounded-xl hover:bg-[#B55A3E] transition-colors font-semibold text-sm tracking-wide disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: 'Poppins, sans-serif' }}
            >
              {loading ? 'Creating Account...' : 'Join StudyBuddy — Continue to Study Preferences'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
