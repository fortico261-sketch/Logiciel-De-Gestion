import React, { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../../redux/store'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Warehouse,
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  UserCog,
  BarChart3,

  Tag,
  Bell,
  Settings,
  LifeBuoy,

  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

type NavSection = {
  title: string
  items: NavItem[]
}

const adminSections: NavSection[] = [
  {
    title: 'Pilotage',
    items: [
      { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/produits', label: 'Produits', icon: Package },
      { to: '/categories', label: 'Catégories', icon: FolderTree },
    ],
  },
  {
    title: 'Inventaire',
    items: [
      { to: '/stocks', label: 'Stock', icon: Warehouse },
      { to: '/entrees', label: 'Entrées', icon: ArrowDownToLine },
      { to: '/sorties', label: 'Sorties', icon: ArrowUpFromLine },
    ],
  },
   /*
  {
  title: 'Commerce',
    items: [
      { to: '/ventes', label: 'Ventes', icon: ShoppingCart },
      { to: '/achats', label: 'Achats', icon: Receipt },
      { to: '/clients', label: 'Clients', icon: Users },
      { to: '/fournisseurs', label: 'Fournisseurs', icon: Truck },
    ],
  },
  */
  {
    title: 'Gestion',
    items: [
      { to: '/admin/comptes-vendeurs', label: 'Employés', icon: UserCog },
     /* { to: '/factures', label: 'Factures', icon: FileText },*/
    /*  { to: '/paiements', label: 'Paiements', icon: CreditCard },*/
    ],
  },
  {
    title: 'Analyse',
    items: [
      { to: '/rapports', label: 'Rapports', icon: BarChart3 },
    /*   { to: '/marketing', label: 'Marketing', icon: Megaphone }, */
      { to: '/promotions', label: 'Promotions', icon: Tag },
    ],
  },
  {
    title: 'Système',
    items: [
     /* { to: '/historique', label: 'Historique', icon: History },*/
      { to: '/notifications', label: 'Notifications', icon: Bell, badge: '3' },
      { to: '/parametres', label: 'Paramètres', icon: Settings },
    /*  { to: '/support', label: 'Support', icon: LifeBuoy },*/
    ],
  },
]

const vendorSections: NavSection[] = [
  {
    title: 'Vente',
    items: [
      { to: '/vendeur/dashboard', label: 'Vente rapide', icon: ShoppingCart },
    ],
  },
  {
    title: 'Catalogue',
    items: [
      { to: '/produits', label: 'Produits', icon: Package },
      { to: '/stocks', label: 'Stock', icon: Warehouse },
    ],
  },
  {
    title: 'Analyse',
    items: [
      { to: '/rapports', label: 'Rapports', icon: BarChart3 },
    ],
  },
  {
    title: 'Compte',
    items: [
      { to: '/profile', label: 'Mon Profil', icon: UserCog },
      { to: '/support', label: 'Support', icon: LifeBuoy },
    ],
  },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const role = useSelector((state: RootState) => state.auth.profile?.role)
  const profile = useSelector((state: RootState) => state.auth.profile)
  const sections = role === 'admin' ? adminSections : vendorSections
  const [collapsed, setCollapsed] = useState(false)

  const initials =
    profile?.prenom && profile?.nom
      ? `${profile.prenom[0]}${profile.nom[0]}`.toUpperCase()
      : profile?.email?.slice(0, 2).toUpperCase() || 'U'

  return (
    <>
      {/* Overlay Mobile */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Sidebar Container */}
      <aside
        className={`fixed lg:sticky top-0 bottom-0 left-0 z-50 ${
          collapsed ? 'w-20' : 'w-72'
        } bg-white border-r border-slate-200/80 h-screen flex flex-col transition-all duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-5 border-b border-slate-100 ${collapsed ? 'px-3' : ''}`}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center shrink-0 shadow-soft">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <div className="text-sm font-bold tracking-tight text-slate-900 font-display truncate">NaryStock</div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-primary-600">
                  {role === 'admin' ? 'Administrateur' : 'Vendeur'}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors shrink-0"
            aria-label="Fermer le menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          {sections.map((section) => (
            <div key={section.title} className="mb-5">
              {!collapsed && (
                <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {section.title}
                </div>
              )}
              <ul className="space-y-1">
                {section.items.map((it) => {
                  const Icon = it.icon
                  return (
                    <li key={it.to}>
                      <NavLink
                        to={it.to}
                        onClick={() => onClose()}
                        className={({ isActive }) =>
                          `group relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition-all duration-200 text-sm font-medium ${
                            collapsed ? 'justify-center' : ''
                          } ${
                            isActive
                              ? 'bg-primary-50 text-primary-700'
                              : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                          }`
                        }
                        title={collapsed ? it.label : undefined}
                      >
                        {({ isActive }) => (
                          <>
                            {isActive && (
                              <motion.div
                                layoutId="sidebar-active"
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-primary-600"
                              />
                            )}
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                            {!collapsed && <span className="truncate">{it.label}</span>}
                            {!collapsed && it.badge && (
                              <span className="ml-auto inline-flex items-center justify-center px-1.5 py-0.5 text-[9px] font-bold leading-none text-white bg-danger-500 rounded-full">
                                {it.badge}
                              </span>
                            )}
                            {collapsed && it.badge && (
                              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger-500" />
                            )}
                          </>
                        )}
                      </NavLink>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Collapse Toggle (Desktop) */}
        <div className="hidden lg:block px-3 pb-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span>Réduire</span>}
          </button>
        </div>

        {/* User Card */}
        <div className={`p-3 border-t border-slate-100 ${collapsed ? 'px-2' : ''}`}>
          <NavLink
            to="/profile"
            onClick={() => onClose()}
            className={`flex items-center gap-3 rounded-xl p-2 hover:bg-slate-50 transition-colors ${collapsed ? 'justify-center' : ''}`}
            title={collapsed ? `${profile?.prenom || ''} ${profile?.nom || ''}`.trim() : undefined}
          >
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center text-xs font-bold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {profile ? `${profile.prenom || ''} ${profile.nom || ''}`.trim() || profile.email : 'Utilisateur'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {role === 'admin' ? 'Administrateur' : 'Vendeur'}
                </div>
              </div>
            )}
          </NavLink>
        </div>
      </aside>
    </>
  )
}

export default Sidebar