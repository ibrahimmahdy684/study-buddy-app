import React from 'react'
import { Calendar, Check, MapPin, Star, Users } from 'lucide-react'
import { Avatar, Badge, Card } from '../ui/Primitives'

export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`text-center py-10 bg-[#F4E3C8]/30 rounded-xl border border-dashed border-[#C76B4F]/20 ${className}`}>
      <Icon className="w-12 h-12 text-[#5A5A5A] mx-auto mb-3 opacity-40" />
      <p className="text-sm text-[#5A5A5A] mb-1">{title}</p>
      {description && <p className="text-xs text-[#5A5A5A]">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors text-sm">
          {action.label}
        </button>
      )}
    </div>
  )
}

const statColors = {
  terracotta: 'bg-[#C76B4F]/10 text-[#C76B4F]',
  blue: 'bg-[#4F7CAC]/10 text-[#4F7CAC]',
  green: 'bg-[#4CAF50]/10 text-[#4CAF50]',
  orange: 'bg-[#F4A261]/10 text-[#F4A261]',
}

export function StatCard({ label, value, icon: Icon, color = 'terracotta', trend }) {
  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${statColors[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className={`text-xs font-medium ${trend.direction === 'up' ? 'text-[#4CAF50]' : 'text-red-600'}`}>
            {trend.direction === 'up' ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold text-[#2B2B2B] mb-1" style={{ fontFamily: 'Poppins, sans-serif' }}>{value}</p>
      <p className="text-sm text-[#5A5A5A]">{label}</p>
    </Card>
  )
}

export function SectionHeader({ title, subtitle, action, className = '' }) {
  return (
    <div className={`flex items-center justify-between mb-6 ${className}`}>
      <div>
        <h1 className="text-3xl font-bold text-[#2B2B2B] mb-2" style={{ fontFamily: 'Poppins, sans-serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-[#5A5A5A]">{subtitle}</p>}
      </div>
      {action && (
        <button onClick={action.onClick} className="flex items-center gap-2 px-4 py-2 bg-[#C76B4F] text-white rounded-lg hover:bg-[#B55A3E] transition-colors">
          {action.icon && <action.icon className="w-4 h-4" />}
          {action.label}
        </button>
      )}
    </div>
  )
}

export function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 rounded-lg bg-[#F4E3C8] flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-[#C76B4F]" />
      </div>
      <div className="flex-1">
        <p className="text-xs text-[#5A5A5A] font-medium uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm text-[#2B2B2B] font-medium">{value}</p>
      </div>
    </div>
  )
}

export function BuddyCard({ buddy, onClick, actions }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200 hover:shadow-md transition-shadow cursor-pointer" onClick={onClick} role="button" tabIndex={0}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-4">
          <Avatar name={buddy.name} size="lg" />
          <div>
            <h3 className="text-xl font-semibold text-[#2B2B2B]">{buddy.name}</h3>
            {buddy.university && <p className="text-[#5A5A5A] text-sm">{buddy.university}</p>}
            {buddy.academicYear && <p className="text-[#5A5A5A] text-sm">{buddy.academicYear}</p>}
          </div>
        </div>
        {typeof buddy.matchPercentage === 'number' && (
          <div className="text-right">
            <div className="flex items-center gap-1 mb-1">
              <Star className="w-5 h-5 text-[#4CAF50] fill-current" />
              <span className="text-2xl font-bold text-[#4CAF50]">{buddy.matchPercentage}%</span>
            </div>
            <p className="text-xs text-[#5A5A5A]">Match</p>
          </div>
        )}
      </div>

      {buddy.bio && <p className="text-[#2B2B2B] text-sm mb-4">{buddy.bio}</p>}

      {buddy.courses?.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2 text-sm text-[#5A5A5A]">
            <Check className="w-4 h-4" />
            <span>Courses</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {buddy.courses.slice(0, 3).map((course) => <Badge key={course}>{course}</Badge>)}
            {buddy.courses.length > 3 && <Badge>+{buddy.courses.length - 3} more</Badge>}
          </div>
        </div>
      )}

      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  )
}

export function SessionCard({ session, currentUserId, onJoin, onLeave }) {
  const isCreator = session.creatorId === currentUserId
  const isParticipant = session.participants?.includes(currentUserId)
  const isOnline = session.type === 'online'

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#2B2B2B] mb-1">{session.topic}</h3>
          <div className="flex items-center gap-2 text-sm text-[#5A5A5A] flex-wrap">
            <Calendar className="w-4 h-4" />
            <span>{session.date}</span>
            <span>·</span>
            <span>{session.time}</span>
            <span>·</span>
            <span>{session.duration}</span>
          </div>
        </div>
        <span className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${isOnline ? 'bg-[#4F7CAC]/10 text-[#4F7CAC]' : 'bg-[#4CAF50]/10 text-[#4CAF50]'}`}>
          {isOnline ? 'Online' : 'In-Person'}
        </span>
      </div>

      {session.type === 'in-person' && session.location && (
        <div className="flex items-center gap-2 mb-3 text-sm text-[#5A5A5A]">
          <MapPin className="w-4 h-4" />
          <span>{session.location}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4 text-sm text-[#5A5A5A]">
        <Users className="w-4 h-4" />
        <span>{session.participants.length} participant(s)</span>
      </div>

      <div className="flex gap-2">
        {isCreator ? (
          <span className="flex-1 px-4 py-2 bg-[#C76B4F]/10 text-[#C76B4F] rounded-lg text-sm font-medium text-center">You created this session</span>
        ) : isParticipant ? (
          <button onClick={onLeave} className="flex-1 px-4 py-2 border-2 border-gray-200 text-[#2B2B2B] rounded-lg hover:bg-gray-50 transition-colors text-sm">Leave Session</button>
        ) : (
          <button onClick={onJoin} className="flex-1 px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45A049] transition-colors text-sm font-medium flex items-center justify-center gap-2">Join Session</button>
        )}
      </div>
    </div>
  )
}

export function RequestCard({ request, userInfo, onAccept, onReject, type = 'incoming' }) {
  return (
    <div className="flex items-center justify-between p-4 bg-[#F4E3C8] rounded-lg">
      <div className="flex items-center gap-4">
        <Avatar name={userInfo.name} size="md" variant="solid" color="#C76B4F" />
        <div>
          <h3 className="font-semibold text-[#2B2B2B]">{userInfo.name}</h3>
          <p className="text-sm text-[#5A5A5A]">{new Date(request.timestamp).toLocaleDateString()}</p>
        </div>
      </div>

      {type === 'incoming' && (
        <div className="flex gap-2">
          <button onClick={onAccept} className="px-4 py-2 bg-[#4CAF50] text-white rounded-lg hover:bg-[#45A049] transition-colors flex items-center gap-2">
            <Check className="w-4 h-4" /> Accept
          </button>
          <button onClick={onReject} className="px-4 py-2 bg-[#F4A261] text-white rounded-lg hover:bg-[#E39151] transition-colors flex items-center gap-2">
            <X className="w-4 h-4" /> Decline
          </button>
        </div>
      )}

      {type === 'outgoing' && <span className="px-4 py-2 bg-[#4F7CAC]/10 text-[#4F7CAC] rounded-lg text-sm font-medium">Pending</span>}
    </div>
  )
}
