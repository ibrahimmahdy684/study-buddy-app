import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useMutation, useQuery, useApolloClient } from '@apollo/client'
import { ChevronLeft, ChevronRight, AlertCircle, X } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import {
  UPDATE_STUDY_PREFERENCES,
  SET_COURSES,
  SET_HELP_TOPICS,
  UPDATE_ME,
} from '../lib/graphql/mutations'
import { GET_PROFILE } from '../lib/graphql/queries'
import {
  STUDY_MODE_LABELS,
  GROUP_SIZE_LABELS,
  ACADEMIC_YEAR_LABELS,
} from '../lib/constants'

// ─── Shared sub-sections ────────────────────────────────────────────────────

function AccountSection({ name, setName, university, setUniversity, academicYear, setAcademicYear }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">University</label>
        <input
          type="text"
          value={university}
          onChange={(e) => setUniversity(e.target.value)}
          placeholder="e.g., Cairo University"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        />
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Academic Year</label>
        <select
          value={academicYear ?? ''}
          onChange={(e) => setAcademicYear(e.target.value ? Number(e.target.value) : null)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        >
          <option value="">Select year</option>
          {Object.entries(ACADEMIC_YEAR_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}

function StudyPrefsSection({ studyMode, setStudyMode, preferredGroupSize, setPreferredGroupSize, studyPace, setStudyPace, studyStyle, setStudyStyle }) {
  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Study Mode</label>
        <div className="grid grid-cols-3 gap-3">
          {Object.entries(STUDY_MODE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setStudyMode(value)}
              className={`p-3 rounded-lg border-2 font-medium transition-all ${
                studyMode === value
                  ? 'border-[#C76B4F] bg-[#FEF3F0] text-[#C76B4F]'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-2">Preferred Group Size</label>
        <div className="grid grid-cols-2 gap-3">
          {Object.entries(GROUP_SIZE_LABELS).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setPreferredGroupSize(Number(value))}
              className={`p-3 rounded-lg border-2 font-medium transition-all ${
                preferredGroupSize === Number(value)
                  ? 'border-[#C76B4F] bg-[#FEF3F0] text-[#C76B4F]'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Study Pace</label>
        <select
          value={studyPace}
          onChange={(e) => setStudyPace(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        >
          <option value="SLOW">Slow</option>
          <option value="MODERATE">Moderate</option>
          <option value="FAST">Fast</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-1">Study Style</label>
        <select
          value={studyStyle}
          onChange={(e) => setStudyStyle(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        >
          <option value="VISUAL">Visual</option>
          <option value="LISTENING">Listening</option>
          <option value="DISCUSSION">Discussion</option>
          <option value="QUIET_STUDY">Quiet Study</option>
          <option value="WRITING">Writing</option>
          <option value="PROBLEM_SOLVING">Problem Solving</option>
        </select>
      </div>
    </div>
  )
}

function CoursesSection({ courses, setCourses }) {
  const [courseInput, setCourseInput] = useState({ name: '', code: '' })

  const addCourse = () => {
    if (courseInput.name.trim()) {
      setCourses([...courses, { id: Math.random().toString(), ...courseInput }])
      setCourseInput({ name: '', code: '' })
    }
  }

  return (
    <div className="space-y-3">
      {courses.map((course) => (
        <div key={course.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
          <div>
            <p className="font-semibold text-gray-800">{course.name}</p>
            {course.code && <p className="text-sm text-gray-500">{course.code}</p>}
          </div>
          <button
            type="button"
            onClick={() => setCourses(courses.filter((c) => c.id !== course.id))}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <input
          type="text"
          placeholder="Course Name (e.g., Advanced Calculus)"
          value={courseInput.name}
          onChange={(e) => setCourseInput({ ...courseInput, name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && addCourse()}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        />
        <input
          type="text"
          placeholder="Course Code (e.g., MATH 401)"
          value={courseInput.code}
          onChange={(e) => setCourseInput({ ...courseInput, code: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && addCourse()}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        />
        <button
          type="button"
          onClick={addCourse}
          disabled={!courseInput.name.trim()}
          className="w-full p-3 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40] disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
        >
          + Add Course
        </button>
      </div>
    </div>
  )
}

function TopicsSection({ topics, setTopics }) {
  const [topicInput, setTopicInput] = useState('')

  const addTopic = () => {
    if (topicInput.trim() && !topics.includes(topicInput.trim())) {
      setTopics([...topics, topicInput.trim()])
      setTopicInput('')
    }
  }

  return (
    <div className="space-y-3">
      {topics.map((topic, index) => (
        <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center">
          <p className="font-semibold text-gray-800">{topic}</p>
          <button
            type="button"
            onClick={() => setTopics(topics.filter((_, i) => i !== index))}
            className="text-gray-400 hover:text-red-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
      <div className="p-4 bg-gray-50 rounded-lg space-y-2">
        <input
          type="text"
          placeholder="Enter a topic (e.g., Organic Chemistry)"
          value={topicInput}
          onChange={(e) => setTopicInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addTopic()}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
        />
        <button
          type="button"
          onClick={addTopic}
          disabled={!topicInput.trim()}
          className="w-full p-3 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40] disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
        >
          + Add Topic
        </button>
      </div>
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

const ProfileSetup = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isEditMode = searchParams.get('edit') === 'true'

  const apolloClient = useApolloClient()
  const { user, loading: userLoading, refetch: refetchSession } = useSession()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Account fields
  const [name, setName] = useState('')
  const [university, setUniversity] = useState('')
  const [academicYear, setAcademicYear] = useState(null)

  // Study preference fields
  const [studyMode, setStudyMode] = useState('BOTH')
  const [preferredGroupSize, setPreferredGroupSize] = useState(2)
  const [studyPace, setStudyPace] = useState('MODERATE')
  const [studyStyle, setStudyStyle] = useState('VISUAL')

  // Courses & topics
  const [courses, setCourses] = useState([])
  const [topics, setTopics] = useState([])

  const { data: profileData, loading: profileLoading } = useQuery(GET_PROFILE, {
    variables: { userId: user?.id },
    skip: !user?.id || !isEditMode,
    fetchPolicy: 'network-only',
  })

  // Pre-fill from existing data in edit mode
  useEffect(() => {
    if (!isEditMode) return
    if (user) {
      setName(user.name || '')
      setUniversity(user.university || '')
      setAcademicYear(user.academicYear || null)
    }
    const profile = profileData?.profile
    if (profile) {
      setStudyMode(profile.studyMode || 'BOTH')
      setPreferredGroupSize(profile.preferredGroupSize || 2)
      setStudyPace(profile.studyPace || 'MODERATE')
      setStudyStyle(profile.studyStyle || 'VISUAL')
      setCourses((profile.courses || []).map((c) => ({ id: c.id, name: c.name, code: c.code || '' })))
      setTopics((profile.helpTopics || []).map((t) => t.topic))
    }
  }, [isEditMode, user, profileData])

  const [updateMe] = useMutation(UPDATE_ME)
  const [updateStudyPreferences] = useMutation(UPDATE_STUDY_PREFERENCES)
  const [setCoursesMutation] = useMutation(SET_COURSES)
  const [setHelpTopicsMutation] = useMutation(SET_HELP_TOPICS)

  // ── Edit mode: single save ─────────────────────────────────────────────────
  const handleEditSave = async () => {
    setError('')
    setIsSubmitting(true)
    try {
      await Promise.all([
        updateMe({
          variables: {
            input: {
              name: name.trim() || undefined,
              university: university.trim() || undefined,
              academicYear: academicYear || undefined,
            },
          },
        }),
        setCoursesMutation({
          variables: {
            userId: user.id,
            courses: courses.filter((c) => c.name.trim()).map((c) => ({ name: c.name, code: c.code || undefined })),
          },
        }),
        setHelpTopicsMutation({
          variables: {
            userId: user.id,
            topics: topics.filter((t) => t.trim()),
          },
        }),
      ])
      await apolloClient.refetchQueries({ include: 'active' })
      navigate('/profile')
    } catch (err) {
      setError(err.message || 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Setup mode: step-by-step ───────────────────────────────────────────────
  const handleNextStep = async () => {
    setError('')
    if (step === 1) {
      try {
        setIsSubmitting(true)
        await Promise.all([
          updateMe({
            variables: {
              input: {
                name: name.trim() || undefined,
                university: university.trim() || undefined,
                academicYear: academicYear || undefined,
              },
            },
          }),
          updateStudyPreferences({
            variables: {
              userId: user?.id,
              input: { studyMode, preferredGroupSize, studyPace, studyStyle },
            },
          }),
        ])
        setStep(2)
      } catch (err) {
        setError(err.message || 'Failed to save preferences')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 2) {
      try {
        setIsSubmitting(true)
        const courseInputs = courses.filter((c) => c.name.trim()).map((c) => ({ name: c.name, code: c.code || undefined }))
        if (courseInputs.length > 0) {
          await setCoursesMutation({ variables: { userId: user?.id, courses: courseInputs } })
        }
        setStep(3)
      } catch (err) {
        setError(err.message || 'Failed to save courses')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 3) {
      try {
        setIsSubmitting(true)
        const filtered = topics.filter((t) => t.trim())
        if (filtered.length > 0) {
          await setHelpTopicsMutation({ variables: { userId: user?.id, topics: filtered } })
        }
        setStep(4)
      } catch (err) {
        setError(err.message || 'Failed to save help topics')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 4) {
      navigate('/dashboard')
    }
  }

  const handlePrevStep = () => {
    if (step > 1) { setError(''); setStep(step - 1) }
  }

  if (userLoading || (isEditMode && profileLoading)) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C76B4F]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center text-center">
        <div>
          <p className="text-gray-600 mb-4">Please log in to set up your profile</p>
          <button onClick={() => navigate('/login')} className="px-6 py-2 bg-[#C76B4F] text-white rounded-lg">Go to Login</button>
        </div>
      </div>
    )
  }

  // ── Edit mode render ───────────────────────────────────────────────────────
  if (isEditMode) {
    return (
      <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-[#2B2B2B]" style={{ fontFamily: 'Poppins, sans-serif' }}>
            Edit Profile
          </h1>
          <button onClick={() => navigate('/profile')} className="text-sm text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-[#2B2B2B]">Account Info</h2>
          <AccountSection
            name={name} setName={setName}
            university={university} setUniversity={setUniversity}
            academicYear={academicYear} setAcademicYear={setAcademicYear}
          />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-[#2B2B2B]">My Courses</h2>
          <CoursesSection courses={courses} setCourses={setCourses} />
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 space-y-4">
          <h2 className="text-lg font-semibold text-[#2B2B2B]">Topics I Can Help With</h2>
          <TopicsSection topics={topics} setTopics={setTopics} />
        </div>

        <button
          type="button"
          onClick={handleEditSave}
          disabled={isSubmitting}
          className="w-full py-3 bg-[#C76B4F] text-white rounded-xl hover:bg-[#B85A40] disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold text-base flex items-center justify-center gap-2"
          style={{ fontFamily: 'Poppins, sans-serif' }}
        >
          {isSubmitting ? (
            <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
          ) : 'Save Changes'}
        </button>
      </div>
    )
  }

  // ── Setup mode render (step-by-step) ───────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto py-6 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Profile Setup</h1>
          <span className="text-lg font-semibold text-gray-600">Step {step} of 4</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-[#C76B4F] h-2 rounded-full transition-all duration-300" style={{ width: `${(step / 4) * 100}%` }} />
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-800">Error</h3>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200 space-y-8">
          <div>
            <h2 className="text-xl font-bold mb-4">Account Info</h2>
            <AccountSection
              name={name} setName={setName}
              university={university} setUniversity={setUniversity}
              academicYear={academicYear} setAcademicYear={setAcademicYear}
            />
          </div>
          <div>
            <h2 className="text-xl font-bold mb-4">Study Preferences</h2>
            <StudyPrefsSection
              studyMode={studyMode} setStudyMode={setStudyMode}
              preferredGroupSize={preferredGroupSize} setPreferredGroupSize={setPreferredGroupSize}
              studyPace={studyPace} setStudyPace={setStudyPace}
              studyStyle={studyStyle} setStudyStyle={setStudyStyle}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold mb-6">Your Courses</h2>
          <CoursesSection courses={courses} setCourses={setCourses} />
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold mb-6">Topics You Can Help With</h2>
          <TopicsSection topics={topics} setTopics={setTopics} />
        </div>
      )}

      {step === 4 && (
        <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
          <h2 className="text-2xl font-bold mb-6">Review Your Profile</h2>
          <div className="space-y-4">
            <div className="p-4 bg-[#FEF3F0] rounded-lg border border-[#E76F51]">
              <h3 className="font-semibold text-gray-800 mb-2">Account</h3>
              <div className="space-y-1 text-sm text-gray-700">
                {name && <p><span className="font-medium">Name:</span> {name}</p>}
                {university && <p><span className="font-medium">University:</span> {university}</p>}
                {academicYear && <p><span className="font-medium">Year:</span> {ACADEMIC_YEAR_LABELS[academicYear]}</p>}
              </div>
            </div>
            <div className="p-4 bg-[#FEF3F0] rounded-lg border border-[#E76F51]">
              <h3 className="font-semibold text-gray-800 mb-2">Study Preferences</h3>
              <div className="space-y-1 text-sm text-gray-700">
                <p><span className="font-medium">Study Mode:</span> {STUDY_MODE_LABELS[studyMode]}</p>
                <p><span className="font-medium">Group Size:</span> {GROUP_SIZE_LABELS[preferredGroupSize]}</p>
                <p><span className="font-medium">Study Pace:</span> {studyPace}</p>
                <p><span className="font-medium">Study Style:</span> {studyStyle}</p>
              </div>
            </div>
            {courses.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Courses ({courses.length})</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  {courses.map((c) => <li key={c.id}>{c.name}{c.code ? ` (${c.code})` : ''}</li>)}
                </ul>
              </div>
            )}
            {topics.length > 0 && (
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Topics ({topics.length})</h3>
                <ul className="text-sm text-gray-700 space-y-1">
                  {topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              </div>
            )}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
              You can update your availability and preferences anytime from your dashboard.
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handlePrevStep}
          disabled={step === 1 || isSubmitting}
          className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            disabled={isSubmitting}
            className="px-6 py-2 text-gray-500 hover:text-gray-700 font-medium"
          >
            Skip for Now
          </button>
          <button
            onClick={handleNextStep}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40] disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
          >
            {isSubmitting ? (
              <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> Saving...</>
            ) : step === 4 ? (
              <>Complete <ChevronRight className="w-4 h-4" /></>
            ) : (
              <>Next <ChevronRight className="w-4 h-4" /></>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProfileSetup
