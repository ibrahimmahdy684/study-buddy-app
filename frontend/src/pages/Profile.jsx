import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client'
import { Edit, BookOpen, Users, Calendar, Clock } from 'lucide-react'
import { useSession } from '../hooks/useSession'
import { GET_PROFILE } from '../lib/graphql/queries'
import {
  STUDY_MODE_LABELS,
  GROUP_SIZE_LABELS,
  ACADEMIC_YEAR_LABELS,
} from '../lib/constants'
import { Card, Spinner } from '../components'

const ProfilePage = () => {
  const navigate = useNavigate()
  const { user, loading: userLoading } = useSession()

  const {
    data,
    loading: profileLoading,
    error,
  } = useQuery(GET_PROFILE, {
    variables: { userId: user?.id },
    skip: !user?.id,
    errorPolicy: 'all',
  })

  const isLoading = userLoading || profileLoading
  const profile = data?.profile

  return (
    <div className="max-w-5xl mx-auto space-y-6">
        {isLoading && (
          <div className="flex justify-center items-center h-64">
            <Spinner size="lg" />
          </div>
        )}

        {!isLoading && error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700 text-sm">
              {error.message || 'Failed to load your profile'}
            </p>
          </div>
        )}

        {!isLoading && user && (
          <>
            {(!profile || !profile.studyMode || !profile.courses?.length) && (
              <div className="flex items-center justify-between p-5 bg-[#FEF3F0] border border-[#E76F51]/30 rounded-xl">
                <div>
                  <h3 className="font-semibold text-[#2B2B2B] mb-1">Complete Your Profile</h3>
                  <p className="text-[#5A5A5A] text-sm">
                    Set up your study preferences and courses to get matched with study partners.
                  </p>
                </div>
                <button
                  onClick={() => navigate('/profile-setup?edit=true')}
                  className="px-5 py-2 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors font-medium whitespace-nowrap ml-4"
                >
                  Complete Profile
                </button>
              </div>
            )}

            {/* Profile Header */}
            <div className="bg-gradient-to-r from-[#C76B4F] to-[#E76F51] rounded-xl shadow-lg p-8 text-white">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center text-[#C76B4F] text-4xl font-bold flex-shrink-0">
                    {(user.name || '?').trim().charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h1
                      className="text-3xl font-bold mb-2 truncate"
                      style={{ fontFamily: 'Poppins, sans-serif' }}
                    >
                      {user.name}
                    </h1>
                    <p className="text-white/90 text-lg break-all">
                      {user.email}
                    </p>
                    <p className="text-white/90">
                      {user.university || 'University not set'}
                      {user.academicYear
                        ? ` • ${ACADEMIC_YEAR_LABELS[user.academicYear] || `Year ${user.academicYear}`}`
                        : ''}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate('/profile-setup?edit=true')}
                  className="px-4 py-2 bg-white text-[#C76B4F] rounded-lg hover:bg-white/90 transition-colors flex items-center gap-2 self-start"
                >
                  <Edit className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>

              {profile?.bio && (
                <div className="mt-6 pt-6 border-t border-white/20">
                  <p className="text-white/90">{profile.bio}</p>
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid sm:grid-cols-3 gap-4">
              <Card padding="md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#E76F51]/10 rounded-lg flex items-center justify-center">
                    <BookOpen className="w-6 h-6 text-[#E76F51]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#2B2B2B]">
                      {profile?.courses?.length ?? 0}
                    </h3>
                    <p className="text-[#5A5A5A] text-sm">Courses</p>
                  </div>
                </div>
              </Card>

              <Card padding="md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#4F7CAC]/10 rounded-lg flex items-center justify-center">
                    <Users className="w-6 h-6 text-[#4F7CAC]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#2B2B2B]">
                      {profile?.helpTopics?.length ?? 0}
                    </h3>
                    <p className="text-[#5A5A5A] text-sm">Help Topics</p>
                  </div>
                </div>
              </Card>

              <Card padding="md">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-lg flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-[#4CAF50]" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-[#2B2B2B]">
                      {profile?.studyMode
                        ? STUDY_MODE_LABELS[profile.studyMode]
                        : '—'}
                    </h3>
                    <p className="text-[#5A5A5A] text-sm">Study Mode</p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Account Details */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xl font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Account Details
                </h2>
                <button
                  onClick={() => navigate('/profile-setup?edit=true')}
                  className="text-[#C76B4F] hover:underline text-sm"
                >
                  Edit
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#F4E3C8] rounded-lg">
                  <p className="text-sm text-[#5A5A5A] mb-1">University</p>
                  <p className="font-semibold text-[#2B2B2B]">
                    {user.university || 'Not specified'}
                  </p>
                </div>
                <div className="p-4 bg-[#F4E3C8] rounded-lg">
                  <p className="text-sm text-[#5A5A5A] mb-1">Academic Year</p>
                  <p className="font-semibold text-[#2B2B2B]">
                    {user.academicYear
                      ? ACADEMIC_YEAR_LABELS[user.academicYear] ||
                        `Year ${user.academicYear}`
                      : 'Not specified'}
                  </p>
                </div>
                {user.phone && (
                  <div className="p-4 bg-[#F4E3C8] rounded-lg">
                    <p className="text-sm text-[#5A5A5A] mb-1">Phone</p>
                    <p className="font-semibold text-[#2B2B2B]">{user.phone}</p>
                  </div>
                )}
                {user.contactEmail && (
                  <div className="p-4 bg-[#F4E3C8] rounded-lg">
                    <p className="text-sm text-[#5A5A5A] mb-1">Contact Email</p>
                    <p className="font-semibold text-[#2B2B2B] break-all">
                      {user.contactEmail}
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Courses */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xl font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  My Courses
                </h2>
                <button
                  onClick={() => navigate('/profile-setup?edit=true')}
                  className="text-[#C76B4F] hover:underline text-sm"
                >
                  Edit
                </button>
              </div>
              {profile?.courses && profile.courses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.courses.map((course) => (
                    <span
                      key={course.id}
                      className="px-4 py-2 bg-[#F4E3C8] text-[#2B2B2B] rounded-lg"
                    >
                      {course.name}
                      {course.code ? (
                        <span className="ml-2 text-xs text-[#5A5A5A]">
                          {course.code}
                        </span>
                      ) : null}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[#5A5A5A]">No courses added yet</p>
              )}
            </Card>

            {/* Help Topics */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xl font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Topics I Can Help With
                </h2>
                <button
                  onClick={() => navigate('/profile-setup?edit=true')}
                  className="text-[#C76B4F] hover:underline text-sm"
                >
                  Edit
                </button>
              </div>
              {profile?.helpTopics && profile.helpTopics.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profile.helpTopics.map((topic) => (
                    <span
                      key={topic.id}
                      className="px-4 py-2 bg-[#E76F51]/10 text-[#E76F51] rounded-lg border border-[#E76F51]/20"
                    >
                      {topic.topic}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-[#5A5A5A]">No study topics added yet</p>
              )}
            </Card>

            {/* Study Preferences */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-xl font-semibold text-[#2B2B2B]"
                  style={{ fontFamily: 'Poppins, sans-serif' }}
                >
                  Study Preferences
                </h2>
                <button
                  onClick={() => navigate('/profile-setup?edit=true')}
                  className="text-[#C76B4F] hover:underline text-sm"
                >
                  Edit
                </button>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-[#F4E3C8] rounded-lg">
                  <p className="text-sm text-[#5A5A5A] mb-1">Study Pace</p>
                  <p className="font-semibold text-[#2B2B2B]">
                    {profile?.studyPace || 'Not set'}
                  </p>
                </div>
                <div className="p-4 bg-[#F4E3C8] rounded-lg">
                  <p className="text-sm text-[#5A5A5A] mb-1">Study Mode</p>
                  <p className="font-semibold text-[#2B2B2B]">
                    {profile?.studyMode
                      ? STUDY_MODE_LABELS[profile.studyMode]
                      : 'Not set'}
                  </p>
                </div>
                <div className="p-4 bg-[#F4E3C8] rounded-lg">
                  <p className="text-sm text-[#5A5A5A] mb-1">
                    Preferred Group Size
                  </p>
                  <p className="font-semibold text-[#2B2B2B]">
                    {profile?.preferredGroupSize
                      ? GROUP_SIZE_LABELS[profile.preferredGroupSize] ||
                        `${profile.preferredGroupSize}`
                      : 'Not set'}
                  </p>
                </div>
                <div className="p-4 bg-[#F4E3C8] rounded-lg">
                  <p className="text-sm text-[#5A5A5A] mb-1">Study Style</p>
                  <p className="font-semibold text-[#2B2B2B]">
                    {profile?.studyStyle || 'Not set'}
                  </p>
                </div>
              </div>
            </Card>

            {/* Availability shortcut */}
            <Card padding="md">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#C76B4F]" />
                  <h2
                    className="text-xl font-semibold text-[#2B2B2B]"
                    style={{ fontFamily: 'Poppins, sans-serif' }}
                  >
                    My Availability
                  </h2>
                </div>
                <button
                  onClick={() => navigate('/study-preferences')}
                  className="text-[#C76B4F] hover:underline text-sm"
                >
                  Manage
                </button>
              </div>
              <p className="text-[#5A5A5A] text-sm">
                Manage the days and time slots when you&apos;re free to study
                with others.
              </p>
            </Card>
          </>
        )}
    </div>
  )
}

export default ProfilePage
