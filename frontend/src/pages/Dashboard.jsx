import { useNavigate } from 'react-router-dom';
import { useSession } from '../hooks/useSession';
import { Users, Calendar, Bell, TrendingUp, BookOpen, Clock } from 'lucide-react';

export function Dashboard() {
  const navigate = useNavigate();
  const { user, loading } = useSession();

  // Mock data for UI placeholders
  const upcomingSessions = [
    { id: 1, topic: 'Advanced Calculus', type: 'online', date: new Date(Date.now() + 86400000).toISOString(), time: '14:00' },
    { id: 2, topic: 'Physics Lab Prep', type: 'in-person', date: new Date(Date.now() + 172800000).toISOString(), time: '10:00' }
  ];
  const recentNotifications = [
    { id: 1, message: 'Sarah accepted your study session request', timestamp: new Date(Date.now() - 3600000).toISOString(), read: false },
    { id: 2, message: 'New match found: John (Computer Science)', timestamp: new Date(Date.now() - 86400000).toISOString(), read: true }
  ];
  const recommendedBuddies = [
    { id: 1, name: 'Alex Johnson', university: 'State University', academicYear: 'Junior', matchPercentage: 92 },
    { id: 2, name: 'Emma Davis', university: 'State University', academicYear: 'Senior', matchPercentage: 88 }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#C76B4F]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto p-6 text-center text-[#5A5A5A]">
        Please log in to view your dashboard.
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[#C76B4F] to-[#E76F51] rounded-xl shadow-lg p-6 md:p-8 text-white">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Welcome back, {user?.name}!
        </h1>
        <p className="text-white/90">
          You have {upcomingSessions.length} upcoming study sessions and {recentNotifications.filter(n => !n.read).length} new notifications
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-[#E76F51]/10 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-[#E76F51]" />
            </div>
            <TrendingUp className="w-5 h-5 text-[#4CAF50]" />
          </div>
          <h3 className="text-2xl font-bold text-[#2B2B2B]">{recommendedBuddies.length}</h3>
          <p className="text-[#5A5A5A] text-sm">Study Buddies</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-[#4F7CAC]/10 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-[#4F7CAC]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#2B2B2B]">{upcomingSessions.length}</h3>
          <p className="text-[#5A5A5A] text-sm">Upcoming Sessions</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-[#F4A261]/10 rounded-lg flex items-center justify-center">
              <Bell className="w-6 h-6 text-[#F4A261]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#2B2B2B]">{recentNotifications.filter(n => !n.read).length}</h3>
          <p className="text-[#5A5A5A] text-sm">New Notifications</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <div className="w-12 h-12 bg-[#4CAF50]/10 rounded-lg flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#4CAF50]" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-[#2B2B2B]">0</h3>
          <p className="text-[#5A5A5A] text-sm">Courses</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recommended Study Buddies */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#2B2B2B]">
              Recommended Study Buddies
            </h2>
            <button
              onClick={() => {}}
              className="text-[#C76B4F] hover:underline text-sm"
            >
              View All
            </button>
          </div>

          <div className="space-y-3">
            {recommendedBuddies.map((buddy) => (
              <div
                key={buddy.id}
                className="flex items-center gap-4 p-4 bg-[#F4E3C8] rounded-lg hover:bg-[#EDD9B8] transition-colors cursor-pointer"
              >
                <div className="w-12 h-12 bg-[#C76B4F] rounded-full flex items-center justify-center text-white font-semibold">
                  {buddy.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-[#2B2B2B] truncate">{buddy.name}</h3>
                  <p className="text-sm text-[#5A5A5A] truncate">{buddy.university} • {buddy.academicYear}</p>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-[#4CAF50]">{buddy.matchPercentage}%</div>
                  <p className="text-xs text-[#5A5A5A]">Match</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Sessions */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-[#2B2B2B]">
              Upcoming Sessions
            </h2>
            <button
              onClick={() => {}}
              className="text-[#C76B4F] hover:underline text-sm"
            >
              View All
            </button>
          </div>

          {upcomingSessions.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-[#5A5A5A] mx-auto mb-2 opacity-50" />
              <p className="text-[#5A5A5A]">No upcoming sessions</p>
              <button
                className="mt-4 px-4 py-2 bg-[#E76F51] text-white rounded-lg hover:bg-[#D65F41] transition-colors text-sm"
              >
                Create a Session
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingSessions.map((session) => (
                <div key={session.id} className="p-4 bg-[#F4E3C8] rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-[#2B2B2B]">{session.topic}</h3>
                    <span className={`px-2 py-1 rounded text-xs ${
                      session.type === 'online' 
                        ? 'bg-[#4F7CAC] text-white' 
                        : 'bg-[#4CAF50] text-white'
                    }`}>
                      {session.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-[#5A5A5A]">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(session.date).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {session.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Notifications */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#2B2B2B]">
            Recent Notifications
          </h2>
          <button
            onClick={() => {}}
            className="text-[#C76B4F] hover:underline text-sm"
          >
            View All
          </button>
        </div>

        <div className="space-y-3">
          {recentNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-4 rounded-lg border ${
                notification.read 
                  ? 'bg-white border-gray-200' 
                  : 'bg-[#F4E3C8] border-[#E76F51]'
              }`}
            >
              <p className="text-[#2B2B2B]">{notification.message}</p>
              <p className="text-xs text-[#5A5A5A] mt-1">
                {new Date(notification.timestamp).toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <button
          onClick={() => {}}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#E76F51] hover:shadow-md transition-all text-left group"
        >
          <Users className="w-8 h-8 text-[#E76F51] mb-3" />
          <h3 className="font-semibold text-[#2B2B2B] mb-1">Find Study Partners</h3>
          <p className="text-sm text-[#5A5A5A]">Discover students with similar courses</p>
        </button>

        <button
          onClick={() => {}}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#4F7CAC] hover:shadow-md transition-all text-left group"
        >
          <Calendar className="w-8 h-8 text-[#4F7CAC] mb-3" />
          <h3 className="font-semibold text-[#2B2B2B] mb-1">Create Study Session</h3>
          <p className="text-sm text-[#5A5A5A]">Schedule a new study session</p>
        </button>

        <button
          onClick={() => navigate('/study-preferences')}
          className="p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:border-[#4CAF50] hover:shadow-md transition-all text-left group"
        >
          <BookOpen className="w-8 h-8 text-[#4CAF50] mb-3" />
          <h3 className="font-semibold text-[#2B2B2B] mb-1">Update Profile</h3>
          <p className="text-sm text-[#5A5A5A]">Edit your preferences and courses</p>
        </button>
      </div>
    </div>
  );
}
