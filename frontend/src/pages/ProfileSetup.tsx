import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@apollo/client'
import { ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import {
  UPDATE_STUDY_PREFERENCES,
  SET_COURSES,
  SET_HELP_TOPICS,
} from '../lib/graphql/mutations'
import {
  STUDY_MODE_LABELS,
  GROUP_SIZE_LABELS,
  ACADEMIC_YEAR_LABELS,
} from '../lib/constants'
import { StudyMode, Course } from '../lib/types'

const ProfileSetup = () => {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()
  const [step, setStep] = useState(1)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Step 1: Study Preferences
  const [studyMode, setStudyMode] = useState<StudyMode>('BOTH')
  const [preferredGroupSize, setPreferredGroupSize] = useState<number>(2)
  const [studyPace, setStudyPace] = useState('MODERATE')
  const [studyStyle, setStudyStyle] = useState('VISUAL')

  // Step 2: Courses
  const [courses, setCourses] = useState<Course[]>([])
  const [courseInput, setCourseInput] = useState({ name: '', code: '' })

  // Step 3: Help Topics
  const [topics, setTopics] = useState<string[]>([])
  const [topicInput, setTopicInput] = useState('')

  // Mutations
  const [updateStudyPreferences] = useMutation(UPDATE_STUDY_PREFERENCES)
  const [setCoursesMutation] = useMutation(SET_COURSES)
  const [setHelpTopicsMutation] = useMutation(SET_HELP_TOPICS)

  const handleNextStep = async () => {
    setError('')

    if (step === 1) {
      try {
        setIsSubmitting(true)
        await updateStudyPreferences({
          variables: {
            userId: user?.id,
            input: {
              studyMode,
              preferredGroupSize,
              studyPace,
              studyStyle,
            },
          },
        })
        setStep(2)
      } catch (err: any) {
        setError(err.message || 'Failed to save study preferences')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 2) {
      try {
        setIsSubmitting(true)
        const courseInputs = courses
          .filter((c) => c.name.trim())
          .map((c) => ({
            name: c.name,
            code: c.code || undefined,
          }))
        if (courseInputs.length > 0) {
          await setCoursesMutation({
            variables: {
              userId: user?.id,
              courses: courseInputs,
            },
          })
        }
        setStep(3)
      } catch (err: any) {
        setError(err.message || 'Failed to save courses')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 3) {
      try {
        setIsSubmitting(true)
        const filteredTopics = topics.filter((t) => t.trim())
        if (filteredTopics.length > 0) {
          await setHelpTopicsMutation({
            variables: {
              userId: user?.id,
              topics: filteredTopics,
            },
          })
        }
        setStep(4)
      } catch (err: any) {
        setError(err.message || 'Failed to save help topics')
      } finally {
        setIsSubmitting(false)
      }
    } else if (step === 4) {
      // Final submit - redirect to dashboard
      navigate('/dashboard')
    }
  }

  const handlePrevStep = () => {
    if (step > 1) {
      setError('')
      setStep(step - 1)
    }
  }

  const addCourse = () => {
    if (courseInput.name.trim()) {
      setCourses([...courses, { id: Math.random().toString(), ...courseInput }])
      setCourseInput({ name: '', code: '' })
    }
  }

  const removeCourse = (id: string) => {
    setCourses(courses.filter((c) => c.id !== id))
  }

  const addTopic = () => {
    if (topicInput.trim()) {
      setTopics([...topics, topicInput])
      setTopicInput('')
    }
  }

  const removeTopic = (index: number) => {
    setTopics(topics.filter((_, i) => i !== index))
  }

  if (userLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C76B4F]" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">
            Please log in to set up your profile
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40]"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex">
      <aside className="w-64 shrink-0" />
      <main className="flex-1 min-w-0 p-6">
        <div className="max-w-2xl mx-auto">
          {/* Step Indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold">Profile Setup</h1>
              <span className="text-lg font-semibold text-gray-600">
                Step {step} of 4
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-[#C76B4F] h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
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

          {/* Step 1: Study Preferences */}
          {step === 1 && (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6">Study Preferences</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Preferred Study Mode
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {Object.entries(STUDY_MODE_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => setStudyMode(value as StudyMode)}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Preferred Group Size
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(GROUP_SIZE_LABELS).map(([value, label]) => (
                      <button
                        key={value}
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
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Study Pace
                  </label>
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
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Study Style
                  </label>
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
            </div>
          )}

          {/* Step 2: Courses */}
          {step === 2 && (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6">Your Courses</h2>

              <div className="space-y-4 mb-6">
                {courses.map((course) => (
                  <div
                    key={course.id}
                    className="p-4 bg-gray-50 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-gray-800">
                        {course.name}
                      </p>
                      {course.code && (
                        <p className="text-sm text-gray-600">{course.code}</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeCourse(course.id)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  placeholder="Course Name (e.g., Advanced Calculus)"
                  value={courseInput.name}
                  onChange={(e) =>
                    setCourseInput({ ...courseInput, name: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                />
                <input
                  type="text"
                  placeholder="Course Code (e.g., MATH 401)"
                  value={courseInput.code}
                  onChange={(e) =>
                    setCourseInput({ ...courseInput, code: e.target.value })
                  }
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                />
                <button
                  onClick={addCourse}
                  disabled={!courseInput.name.trim()}
                  className="w-full p-3 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40] disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  + Add Course
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Help Topics */}
          {step === 3 && (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6">
                Topics You Can Help With
              </h2>

              <div className="space-y-3 mb-6">
                {topics.map((topic, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-50 rounded-lg flex justify-between items-center"
                  >
                    <p className="font-semibold text-gray-800">{topic}</p>
                    <button
                      onClick={() => removeTopic(index)}
                      className="text-red-600 hover:text-red-700 font-semibold"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>

              <div className="p-4 bg-gray-50 rounded-lg space-y-3">
                <input
                  type="text"
                  placeholder="Enter a topic (e.g., Organic Chemistry)"
                  value={topicInput}
                  onChange={(e) => setTopicInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      addTopic()
                    }
                  }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#C76B4F] focus:border-transparent"
                />
                <button
                  onClick={addTopic}
                  disabled={!topicInput.trim()}
                  className="w-full p-3 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40] disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
                >
                  + Add Topic
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {step === 4 && (
            <div className="bg-white rounded-lg p-8 shadow-sm border border-gray-200">
              <h2 className="text-2xl font-bold mb-6">Review Your Profile</h2>

              <div className="space-y-6">
                <div className="p-4 bg-[#FEF3F0] rounded-lg border border-[#E76F51]">
                  <h3 className="font-semibold text-gray-800 mb-2">
                    Study Preferences
                  </h3>
                  <div className="space-y-1 text-sm text-gray-700">
                    <p>
                      <span className="font-medium">Study Mode:</span>{' '}
                      {STUDY_MODE_LABELS[studyMode]}
                    </p>
                    <p>
                      <span className="font-medium">Group Size:</span>{' '}
                      {GROUP_SIZE_LABELS[preferredGroupSize]}
                    </p>
                    <p>
                      <span className="font-medium">Study Pace:</span>{' '}
                      {studyPace}
                    </p>
                    <p>
                      <span className="font-medium">Study Style:</span>{' '}
                      {studyStyle}
                    </p>
                  </div>
                </div>

                {courses.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Courses ({courses.length})
                    </h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {courses.map((course) => (
                        <li key={course.id}>
                          {course.name} {course.code && `(${course.code})`}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {topics.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">
                      Topics ({topics.length})
                    </h3>
                    <ul className="text-sm text-gray-700 space-y-1">
                      {topics.map((topic, index) => (
                        <li key={index}>{topic}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800">
                  <p>
                    You can update your availability and preferences anytime
                    from your dashboard.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="mt-8 flex justify-between items-center">
            <button
              onClick={handlePrevStep}
              disabled={step === 1 || isSubmitting}
              className="flex items-center gap-2 px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
            >
              <ChevronLeft className="w-4 h-4" />
              Back
            </button>

            <button
              onClick={handleNextStep}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B85A40] disabled:bg-gray-400 disabled:cursor-not-allowed font-semibold"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Saving...
                </>
              ) : step === 4 ? (
                <>
                  Complete
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}

export default ProfileSetup
