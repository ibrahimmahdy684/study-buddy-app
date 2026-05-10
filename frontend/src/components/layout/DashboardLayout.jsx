import React, { useMemo, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Bell, BookOpen, Calendar, ChevronLeft, ChevronRight, Home, LogOut, Menu, MessageCircle, UserCircle, Users } from 'lucide-react'

export const defaultMenuItems = [
  { icon: Home, label: 'Dashboard', path: '/dashboard' },
  { icon: Users, label: 'Find Buddies', path: '/matching' },
  { icon: Calendar, label: 'Study Sessions', path: '/sessions' },
  { icon: MessageCircle, label: 'Messages', path: '/messages', badge: true },
  { icon: Bell, label: 'Notifications', path: '/notifications', badge: true },
  { icon: UserCircle, label: 'Profile', path: '/profile' },
]

export function Navbar({ user, onLogout, sidebarOpen, onToggleSidebar }) {
  return (
    <header className="h-16 sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="h-full px-4 lg:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button type="button" className="lg:hidden p-2 rounded-lg hover:bg-[#F4E3C8] transition-colors" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <Menu className="w-5 h-5 text-[#2B2B2B]" />
          </button>
          <Link to="/dashboard" className="flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-[#C76B4F]" />
            <span className="text-xl font-bold text-[#C76B4F]" style={{ fontFamily: 'Poppins, sans-serif' }}>StudyBuddy</span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {user && (
            <div className="hidden md:block text-right">
              <p className="text-sm font-semibold text-[#2B2B2B]">{user.name}</p>
              {user.university && <p className="text-xs text-[#5A5A5A]">{user.university}</p>}
            </div>
          )}
          <button type="button" onClick={onLogout} className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[#5A5A5A] hover:bg-gray-100 hover:text-[#C76B4F] transition-colors">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </div>
    </header>
  )
}

function NavItem({ item, collapsed, isActive }) {
  const Icon = item.icon

  return (
    <NavLink
      to={item.path}
      className={({ isActive: active }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors relative ${active ? 'bg-[#C76B4F] text-white' : 'text-[#2B2B2B] hover:bg-[#F4E3C8]'} ${collapsed ? 'justify-center' : ''}`}
      title={collapsed ? item.label : ''}
    >
      <Icon className="w-4 h-4 flex-shrink-0" />
      {!collapsed && <span className="text-sm">{item.label}</span>}
      {item.badge && !collapsed && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E76F51]" />}
      {item.badge && collapsed && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E76F51]" />}
    </NavLink>
  )
}

export function Sidebar({ isOpen, isCollapsed, onToggleCollapse, menuItems = defaultMenuItems, unreadCount = 0, user, className = '' }) {
  const location = useLocation()
  const isCollapsedDesktop = isCollapsed

  const settingsLabel = useMemo(() => (
    <div className="flex items-center gap-2 px-1 mb-2">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[9px] font-bold text-[#5A5A5A] uppercase tracking-widest">Settings</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  ), [])

  return (
    <>
      <aside className={`fixed top-16 bottom-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transition-all duration-300 ease-in-out ${isCollapsedDesktop ? 'lg:w-20' : 'lg:w-64'} ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 ${className}`}>
        <div className="h-full flex flex-col p-4">
          <div className="hidden lg:flex items-center justify-end mb-4">
            <button type="button" onClick={onToggleCollapse} className="p-2 rounded-lg hover:bg-[#F4E3C8] text-[#5A5A5A] hover:text-[#C76B4F] transition-colors" aria-label="Toggle sidebar width">
              {isCollapsedDesktop ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {user && !isCollapsedDesktop && (
            <div className="mb-4 px-3 py-3 bg-[#F4E3C8]/40 border border-[#C76B4F]/15 rounded-xl overflow-hidden">
              <p className="text-sm font-semibold text-[#2B2B2B] truncate">{user.name}</p>
              {user.university && <p className="text-xs text-[#5A5A5A] truncate">{user.university}</p>}
            </div>
          )}

          <nav className="flex-1 space-y-1 overflow-y-auto pr-1">
            {menuItems.map((item) => (
              <NavItem key={item.path} item={item} collapsed={isCollapsedDesktop} isActive={location.pathname === item.path} />
            ))}

            <div className="pt-4">
              {settingsLabel}
              <NavLink
                to="/study-preferences"
                className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${isActive ? 'bg-[#C76B4F] text-white' : 'text-[#2B2B2B] hover:bg-[#F4E3C8]'}`}
                title={isCollapsedDesktop ? 'Study Preferences' : ''}
              >
                <Calendar className="w-4 h-4 flex-shrink-0" />
                {!isCollapsedDesktop && <span className="text-sm">Study Preferences</span>}
                {unreadCount > 0 && !isCollapsedDesktop && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#E76F51]" />}
                {unreadCount > 0 && isCollapsedDesktop && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#E76F51]" />}
              </NavLink>
            </div>
          </nav>
        </div>
      </aside>

      {isOpen && <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={onToggleCollapse} />}
    </>
  )
}

export function DashboardLayout({ user, onLogout, menuItems = defaultMenuItems, unreadCount = 0, children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  return (
    <div className="min-h-screen bg-[#F4E3C8]">
      <Navbar user={user} onLogout={onLogout} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen((value) => !value)} />
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((value) => !value)}
        menuItems={menuItems}
        unreadCount={unreadCount}
        user={user}
      />
      <main className={`min-h-[calc(100vh-4rem)] transition-all duration-300 p-4 lg:p-8 ${sidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        {children}
      </main>
    </div>
  )
}
