import React, { useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell,
  LogOut,
  Menu,
  Search,
  MessageSquare,
  Calendar,
  Sun,
  Moon,
  Globe,
  ChevronDown,
  User,
  Settings,
  HelpCircle,
} from 'lucide-react'
import type { RootState, AppDispatch } from '../../redux/store'
import { logout } from '../../redux/authSlice'

interface NavbarProps {
  onMenuClick: () => void
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const dispatch = useDispatch<AppDispatch>()
  const navigate = useNavigate()
  const profile = useSelector((state: RootState) => state.auth.profile)

  const [showProfile, setShowProfile] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const profileRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setShowProfile(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifications(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    dispatch(logout())
    navigate('/login')
  }

  const initials =
    profile?.prenom && profile?.nom
      ? `${profile.prenom[0]}${profile.nom[0]}`.toUpperCase()
      : profile?.email?.slice(0, 2).toUpperCase() || 'U'

  const roleLabel = profile?.role === 'admin' ? 'Administrateur' : 'Vendeur'

  const notifications = [
    { id: 1, title: 'Stock faible', message: '3 produits en alerte de stock', time: 'Il y a 5 min', type: 'warning' },
    { id: 2, title: 'Nouvelle vente', message: 'Vente enregistrée sur Boutique Analakely', time: 'Il y a 1h', type: 'success' },
    { id: 3, title: 'Nouveau vendeur', message: 'Un compte vendeur a été créé', time: 'Il y a 3h', type: 'info' },
  ]

  return (
    <header className="sticky top-0 z-30 w-full flex items-center justify-between gap-4 py-3 px-4 sm:px-6 bg-white/80 border-b border-slate-200/80 backdrop-blur-md transition-colors duration-200">
      {/* Left: Menu + Search */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors duration-200 h-10 w-10 flex items-center justify-center border border-slate-200"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Search bar */}
        <div className="relative flex-1 max-w-md hidden sm:block">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher produits, ventes, clients..."
            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none transition-all duration-200 focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100 text-slate-700 placeholder:text-slate-400"
          />
          <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-white border border-slate-200 rounded">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Calendar */}
        <button className="hidden md:flex p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-200 h-10 w-10 items-center justify-center" aria-label="Calendrier">
          <Calendar className="w-4 h-4" />
        </button>

        {/* Messages */}
        <button className="relative hidden md:flex p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-200 h-10 w-10 items-center justify-center" aria-label="Messages">
          <MessageSquare className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent-500" />
        </button>

        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-200 h-10 w-10 flex items-center justify-center"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-danger-500 rounded-full">
              3
            </span>
          </button>

          <AnimatePresence>
            {showNotifications && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white border border-slate-200 shadow-elevated overflow-hidden z-50"
              >
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Notifications</h3>
                    <span className="text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">3 nouvelles</span>
                  </div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.map((n) => (
                    <div key={n.id} className="p-4 border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                          n.type === 'warning' ? 'bg-warning-500' : n.type === 'success' ? 'bg-success-500' : 'bg-primary-500'
                        }`} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-slate-900">{n.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{n.message}</div>
                          <div className="text-[10px] text-slate-400 mt-1">{n.time}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 border-t border-slate-100">
                  <button className="w-full text-center text-xs font-semibold text-primary-600 hover:text-primary-700 py-1.5 rounded-lg hover:bg-primary-50 transition-colors">
                    Voir toutes les notifications
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dark Mode Toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="hidden md:flex p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-200 h-10 w-10 items-center justify-center"
          aria-label="Mode sombre"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* Language */}
        <button className="hidden lg:flex p-2.5 rounded-xl text-slate-500 hover:bg-slate-100 transition-colors duration-200 h-10 w-10 items-center justify-center" aria-label="Langue">
          <Globe className="w-4 h-4" />
        </button>

        {/* Divider */}
        <div className="hidden sm:block w-px h-6 bg-slate-200 mx-1" />

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setShowProfile(!showProfile)}
            className="flex items-center gap-2.5 rounded-xl pl-1.5 pr-2 py-1.5 hover:bg-slate-100 transition-colors duration-200"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-bold text-slate-900 leading-tight max-w-[120px] truncate">
                {profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email : 'Utilisateur'}
              </div>
              <div className="text-[10px] text-slate-400">{roleLabel}</div>
            </div>
            <ChevronDown className="hidden sm:block w-3.5 h-3.5 text-slate-400" />
          </button>

          <AnimatePresence>
            {showProfile && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.96 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 top-full mt-2 w-64 rounded-2xl bg-white border border-slate-200 shadow-elevated overflow-hidden z-50"
              >
                <div className="p-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-sm font-bold shrink-0">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate">
                        {profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email : 'Utilisateur'}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{profile?.email}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
                        {roleLabel}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="p-2">
                  <button
                    onClick={() => { navigate('/profile'); setShowProfile(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    Mon profil
                  </button>
                  <button
                    onClick={() => { navigate('/parametres'); setShowProfile(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" />
                    Paramètres
                  </button>
                  <button
                    onClick={() => { navigate('/support'); setShowProfile(false) }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                    Aide & Support
                  </button>
                </div>
                <div className="p-2 border-t border-slate-100">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-danger-600 hover:bg-danger-50 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    Se déconnecter
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  )
}

export default Navbar