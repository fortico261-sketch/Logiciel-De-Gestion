import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useNavigate, Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import Button from '../../components/ui/Button'
import { motion } from 'framer-motion'
import { Lock, Mail, Eye, EyeOff, Sparkles, AlertCircle, User, ArrowLeft, Shield } from 'lucide-react'

const registerSchema = z.object({
  nom: z.string().min(2, 'Nom requis (min 2 caractères)'),
  prenom: z.string().min(2, 'Prénom requis (min 2 caractères)'),
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Mot de passe trop court (min 6)'),
  confirmPassword: z.string().min(6, 'Confirmation requise'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirmPassword'],
})

type RegisterForm = z.infer<typeof registerSchema>

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true)
    setErrorMessage(null)

    try {
      // Simulation d'inscription
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Récupérer les comptes existants
      const existingAccounts = JSON.parse(localStorage.getItem('vendorAccounts') || '[]')
      const existingAdmins = JSON.parse(localStorage.getItem('adminAccounts') || '[]')
      
      // Vérifier si l'email existe déjà (parmi les admins ou les vendeurs)
      const allAccounts = [...existingAccounts, ...existingAdmins]
      if (allAccounts.some((acc: any) => acc.email === data.email)) {
        setErrorMessage('Cet email est déjà utilisé')
        toast.error('Cet email est déjà utilisé')
        setLoading(false)
        return
      }

      // Créer le nouveau compte ADMIN
      const newAdminAccount = {
        id: `admin-${Date.now()}`,
        email: data.email,
        motDePasse: data.password,
        nom: data.nom,
        prenom: data.prenom,
        role: 'admin', // ← ROLE ADMIN
        statut: 'actif',
        adminId: `admin-${Date.now()}`, // L'admin est son propre admin
        createdAt: new Date().toISOString()
      }

      existingAdmins.push(newAdminAccount)
      localStorage.setItem('adminAccounts', JSON.stringify(existingAdmins))

      toast.success('🎉 Compte Administrateur créé avec succès !')
      
      // Rediriger vers la page de connexion après 2 secondes
      setTimeout(() => {
        navigate('/login')
      }, 2000)

    } catch (error) {
      setErrorMessage('Une erreur est survenue lors de la création du compte')
      toast.error('Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
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
              <h2 className="text-4xl font-extrabold font-display leading-tight">Créez votre espace<br />Administrateur</h2>
              <p className="mt-4 text-white/80 text-sm max-w-md">Inscrivez-vous en tant qu'administrateur pour gérer vos stocks, points de vente et équipe.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10 max-w-sm">
              <div className="flex items-center gap-3 text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-sm font-bold">Compte Administrateur</div>
                  <div className="text-xs text-white/70">Accès complet à toutes les fonctionnalités</div>
                </div>
              </div>
            </div>
          </div>

          <div className="text-xs text-white/50">© 2025 NaryStock. Tous droits réservés.</div>
        </div>
      </div>

      {/* Right Panel — Register Form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-slate-50">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600 to-accent-600 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/60 p-8 shadow-card">
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => navigate('/login')}
                className="p-2 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-slate-500" />
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900 font-display">Créer un compte Admin</h1>
                <p className="text-sm text-slate-500 mt-0.5">Inscrivez-vous en tant qu'administrateur</p>
              </div>
            </div>

            {/* Badge Admin */}
            <div className="mb-4 p-3 rounded-xl bg-primary-50 border border-primary-200 flex items-center gap-3">
              <Shield className="w-5 h-5 text-primary-600" />
              <div className="text-xs text-primary-700">
                <span className="font-bold">Compte Administrateur</span> - Vous aurez accès à toutes les fonctionnalités de gestion.
              </div>
            </div>

            {errorMessage && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mb-4 p-3.5 rounded-xl bg-danger-50 border border-danger-200 text-danger-700 text-sm flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rajaonarivelo"
                      className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${errors.nom ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`}
                      {...register('nom')}
                    />
                  </div>
                  {errors.nom && <p className="text-xs text-danger-500 mt-1">{errors.nom.message}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prénom</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Andry"
                      className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${errors.prenom ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`}
                      {...register('prenom')}
                    />
                  </div>
                  {errors.prenom && <p className="text-xs text-danger-500 mt-1">{errors.prenom.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adresse Email</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="nom@exemple.mg"
                    className={`w-full h-12 pl-10 pr-4 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${errors.email ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`}
                    {...register('email')}
                  />
                </div>
                {errors.email && <p className="text-xs text-danger-500 mt-1">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`w-full h-12 pl-10 pr-10 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${errors.password ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`}
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-danger-500 mt-1">{errors.password.message}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirmer le mot de passe</label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className={`w-full h-12 pl-10 pr-10 rounded-xl border bg-slate-50/50 text-sm outline-none transition-all focus:bg-white focus:ring-2 ${errors.confirmPassword ? 'border-danger-300 focus:border-danger-500 focus:ring-danger-100' : 'border-slate-200 focus:border-primary-500 focus:ring-primary-100'}`}
                    {...register('confirmPassword')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.confirmPassword && <p className="text-xs text-danger-500 mt-1">{errors.confirmPassword.message}</p>}
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full mt-2"
                isLoading={loading}
                loadingText="Création en cours..."
              >
    
                Créer mon compte Administrateur
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-200 text-center">
              <p className="text-sm text-slate-500">
                Vous avez déjà un compte ?{' '}
                <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 hover:underline">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>

          {/* Info supplémentaire */}
          <div className="mt-4 text-center text-xs text-slate-400 bg-slate-100/60 border border-slate-200/60 rounded-2xl p-4">
            <p className="font-semibold text-slate-600 mb-1.5"> Compte Administrateur</p>
            <p>En créant un compte administrateur, vous pourrez :</p>
            <ul className="mt-1 space-y-0.5 text-slate-500">
              <li>• Gérer vos produits et catégories</li>
              <li>• Créer des points de vente</li>
              <li>• Ajouter des vendeurs</li>
              <li>• Suivre vos ventes et rapports</li>
            </ul>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default RegisterPage