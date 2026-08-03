import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import { useDispatch } from 'react-redux'
import { setCredentials } from '../../redux/authSlice'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff, Sparkles, AlertCircle, TrendingUp, Package, ShoppingCart, UserPlus, Mail as MailIcon } from 'lucide-react'

const schema = z.object({
  email: z.string().email({ message: 'Email invalide' }),
  password: z.string().min(6, { message: 'Mot de passe trop court (min 6)' }),
  remember: z.boolean().optional(),
})

type FormData = z.infer<typeof schema>

type MockUser = {
  email: string
  password: string
  profile: {
    id: string
    nom: string
    prenom: string
    role: 'admin' | 'vendeur'
    pointDeVenteId?: string
    statut: 'actif' | 'inactif'
    adminId: string
  }
}

const mockUsers: MockUser[] = [
  { email: 'admin@example.mg', password: 'Admin123', profile: { id: 'admin-1', nom: 'Rajaonarivelo', prenom: 'Andry', role: 'admin', statut: 'actif', adminId: 'admin-1' } },
  { email: 'vendeur@example.mg', password: 'Vendeur123', profile: { id: 'vendeur-1', nom: 'Rabe', prenom: 'Lova', role: 'vendeur', pointDeVenteId: 'pdv-1', statut: 'actif', adminId: 'admin-1' } },
]

type LocalLoginResult = | { success: true; user: MockUser } | { success: false; reason: 'account_not_found' | 'incorrect_password' | 'inactive' }

// Dans la fonction localLogin, ajouter la vérification des comptes admin

const localLogin = (data: { email: string; password: string }): LocalLoginResult => {
  // Récupérer les comptes vendeurs
  let vendorAccounts: Array<any> = []
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('vendorAccounts') : null
    if (saved) vendorAccounts = JSON.parse(saved)
  } catch {}

  // Récupérer les comptes administrateurs
  let adminAccounts: Array<any> = []
  try {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('adminAccounts') : null
    if (saved) adminAccounts = JSON.parse(saved)
  } catch {}

  // Chercher dans les comptes admin d'abord
  const adminAccount = adminAccounts.find((acc) => acc.email === data.email)
  if (adminAccount) {
    const pwd = adminAccount.motDePasse || adminAccount.password
    if (pwd !== data.password) return { success: false, reason: 'incorrect_password' }
    if (adminAccount.statut === 'inactif') return { success: false, reason: 'inactive' }
    return { 
      success: true, 
      user: { 
        email: adminAccount.email, 
        password: pwd || '', 
        profile: { 
          id: adminAccount.id || `admin-${adminAccount.email}`,
          nom: adminAccount.nom || 'Admin',
          prenom: adminAccount.prenom || '',
          role: 'admin',
          statut: adminAccount.statut || 'actif',
          adminId: adminAccount.adminId || adminAccount.id || `admin-${adminAccount.email}`
        } 
      } 
    }
  }

  // Puis chercher dans les comptes vendeurs
  const vendorAccount = vendorAccounts.find((acc) => acc.email === data.email)
  if (vendorAccount) {
    const pwd = vendorAccount.motDePasse || vendorAccount.password
    if (pwd !== data.password) return { success: false, reason: 'incorrect_password' }
    if (vendorAccount.statut === 'inactif') return { success: false, reason: 'inactive' }
    return { 
      success: true, 
      user: { 
        email: vendorAccount.email, 
        password: pwd || '', 
        profile: { 
          id: `vendeur-${vendorAccount.email}`,
          nom: vendorAccount.nom || 'Vendeur',
          prenom: vendorAccount.prenom || '',
          role: 'vendeur',
          pointDeVenteId: vendorAccount.pointDeVenteId,
          statut: vendorAccount.statut || 'actif',
          adminId: vendorAccount.adminId || ''
        } 
      } 
    }
  }

  // Enfin chercher dans les comptes mock
  const mockAccount = mockUsers.find((user) => user.email === data.email)
  if (mockAccount) {
    if (mockAccount.password !== data.password) return { success: false, reason: 'incorrect_password' }
    if (mockAccount.profile.statut === 'inactif') return { success: false, reason: 'inactive' }
    return { success: true, user: mockAccount }
  }

  return { success: false, reason: 'account_not_found' }
}
export const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState } = useForm<FormData>({ resolver: zodResolver(schema) })
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const useMockAuth = import.meta.env.VITE_USE_MOCK_AUTH !== 'false'

  const onSubmit = async (data: FormData) => {
    setLoading(true)
    setErrorMessage(null)
    try {
      if (useMockAuth) {
        await new Promise((resolve) => setTimeout(resolve, 800))
        const res = localLogin(data)
        if (res.success) {
          if (!res.user.profile.adminId) {
            const msg = "Ce compte n'est rattaché à aucun espace administrateur valide."
            setErrorMessage(msg); toast.error(msg); return
          }
          dispatch(setCredentials({ token: 'local-dev-token', profile: { ...res.user.profile, email: res.user.email } }))
          toast.success('Connecté avec succès')
          if (res.user.profile.role === 'admin') navigate('/admin/dashboard')
          else navigate('/vendeur/dashboard')
        } else {
          let msg = "Email ou mot de passe incorrect"
          if (res.reason === 'account_not_found') msg = "Aucun compte associé à cet email."
          else if (res.reason === 'incorrect_password') msg = "Mot de passe incorrect."
          else if (res.reason === 'inactive') msg = "Votre compte est désactivé."
          setErrorMessage(msg); toast.error(msg)
        }
        return
      }
      const res = await api.post('/auth/login', { email: data.email, password: data.password })
      const payload = res.data
      if (payload?.token && payload?.profile) {
        if (payload.profile.statut === 'inactif') { const msg = "Votre compte a été désactivé"; setErrorMessage(msg); toast.error(msg); return }
        dispatch(setCredentials({ token: payload.token, profile: payload.profile }))
        toast.success('Connecté avec succès')
        if (payload.profile.role === 'admin') navigate('/admin/dashboard')
        else navigate('/vendeur/dashboard')
      } else { const msg = "Réponse inattendue du serveur"; setErrorMessage(msg); toast.error(msg) }
    } catch (err: any) {
      const status = err?.response?.status
      let msg = err?.response?.data?.message
      if (!msg) { if (status === 404) msg = "Aucun compte trouvé avec cet email"; else if (status === 401) msg = "Mot de passe incorrect"; else msg = "Une erreur est survenue lors de la connexion" }
      setErrorMessage(msg); toast.error(msg)
    } finally { setLoading(false) }
  }

  // Connexion avec Google (simulation)
  const handleGoogleLogin = () => {
    toast.success('Connexion avec Google (simulation)')
    // TODO: Implémenter OAuth Google
    // window.location.href = 'http://localhost:3000/api/auth/google'
  }

  // Connexion avec Email (simulation)
  const handleEmailLogin = () => {
    toast.success('Connexion avec Email (simulation)')
    // TODO: Implémenter OAuth Email
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel — Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary-600 via-primary-700 to-accent-700 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20 w-72 h-72 rounded-full bg-white blur-3xl" />
          <div className="absolute bottom-20 right-20 w-96 h-96 rounded-full bg-white blur-3xl" />
        </div>
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xl font-bold font-display">NaryStock</div>
              <div className="text-xs text-white/70">Gestion de Stock & Ventes</div>
            </div>
          </div>

          <div className="space-y-8">
            <div>
              <h2 className="text-4xl font-extrabold font-display leading-tight">Pilotez votre business<br />en temps réel.</h2>
              <p className="mt-4 text-white/80 text-sm max-w-md">La plateforme tout-en-un pour gérer vos stocks, ventes, points de vente et performances — pensée pour les entreprises modernes.</p>
            </div>
            <div className="grid grid-cols-3 gap-4 max-w-md">
              {[
                { icon: Package, label: 'Stocks', value: 'Illimités' },
                { icon: ShoppingCart, label: 'Ventes', value: 'Temps réel' },
                { icon: TrendingUp, label: 'Analytics', value: 'Avancés' },
              ].map((f) => {
                const Icon = f.icon
                return (
                  <div key={f.label} className="rounded-2xl bg-white/10 backdrop-blur-md p-4 border border-white/10">
                    <Icon className="w-5 h-5 mb-2 text-white/90" />
                    <div className="text-xs font-bold">{f.label}</div>
                    <div className="text-[10px] text-white/60">{f.value}</div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="text-xs text-white/50">© 2026 NaryStock. Tous droits réservés.</div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-card">
            <h1 className="text-2xl font-extrabold text-slate-900 font-display">Bienvenue</h1>
            <p className="text-sm text-slate-500 mt-1">Connectez-vous pour accéder à votre espace.</p>

            {errorMessage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            {/* === BOUTONS DE CONNEXION RAPIDE === */}
            <div className="mt-6 space-y-3">
              {/* Bouton Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuer avec Google
              </button>

              {/* Bouton Email */}
              <button
                type="button"
                onClick={handleEmailLogin}
                className="w-full flex items-center justify-center gap-3 h-12 rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all duration-200"
              >
                <MailIcon className="w-5 h-5 text-slate-400" />
                Continuer avec Email
              </button>
            </div>

            {/* Séparateur */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-slate-400 font-medium">OU</span>
              </div>
            </div>

            {/* Formulaire Email/Mot de passe */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adresse Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="email" placeholder="nom@exemple.mg" className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${formState.errors.email || errorMessage ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`} {...register('email')} />
                </div>
                {formState.errors.email && <p className="text-xs text-danger-500 mt-1">{formState.errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type={show ? 'text' : 'password'} placeholder="••••••••" className={`w-full h-12 pl-10 pr-10 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${formState.errors.password || errorMessage ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`} {...register('password')} />
                  <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors">
                    {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formState.errors.password && <p className="text-xs text-danger-500 mt-1">{formState.errors.password.message}</p>}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer select-none">
                  <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500 bg-white" {...register('remember')} />
                  <span>Se souvenir de moi</span>
                </label>
                <a className="text-sm font-semibold text-primary-600 hover:text-primary-700 hover:underline" href="/forgot-password">Mot de passe oublié ?</a>
              </div>

              <Button type="submit" variant="primary" size="lg" className="w-full mt-2" isLoading={loading} loadingText="Connexion en cours...">
                Se connecter
              </Button>
            </form>

            {/* === BOUTON CRÉER UN COMPTE === */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm text-slate-500 text-center">
                Vous n'avez pas encore de compte ?
              </p>
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="mt-3 w-full flex items-center justify-center gap-2 h-12 rounded-xl border-2 border-primary-200 bg-primary-50 text-sm font-bold text-primary-700 hover:bg-primary-100 hover:border-primary-300 transition-all duration-200"
              >
                <UserPlus className="w-5 h-5" />
                Créer un compte Administrateur
              </button>
            </div>
          </div>

          {/* Comptes de démonstration */}
          <div className="mt-4 text-center text-xs text-slate-400 bg-slate-100/60 border border-slate-200/60 rounded-2xl p-4">
            <p className="font-semibold text-slate-600 mb-1.5"> Comptes de démonstration :</p>
            <p>Admin : <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">admin@example.mg</code> / <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">Admin123</code></p>
            <p className="mt-1">Vendeur : <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">vendeur@example.mg</code> / <code className="bg-slate-200 text-slate-800 px-1.5 py-0.5 rounded">Vendeur123</code></p>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default LoginPage