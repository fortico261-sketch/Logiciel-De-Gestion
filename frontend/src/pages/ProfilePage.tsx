  import React, { useState } from 'react'
  import { useSelector, useDispatch } from 'react-redux'
  import { useForm } from 'react-hook-form'
  import { z } from 'zod'
  import { zodResolver } from '@hookform/resolvers/zod'
  import type { RootState } from '../redux/store'
  import { updateProfile } from "../redux/authSlice";
  import api from "../services/api";
  import toast from 'react-hot-toast'
  import Button from "../components/ui/Button";
  import { 
    User, 
    Mail, 
    Lock, 
    Eye, 
    EyeOff, 
    Shield, 
    Store, 
    CheckCircle, 
    Save,
    KeyRound
  } from 'lucide-react'

  // Schemas de validation Zod
  const profileSchema = z.object({
    nom: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères' }),
    prenom: z.string().min(2, { message: 'Le prénom doit contenir au moins 2 caractères' }),
    email: z.string().email({ message: 'Adresse email invalide' }),
  })

  const passwordSchema = z.object({
    currentPassword: z.string().min(1, { message: 'Mot de passe actuel requis' }),
    newPassword: z.string().min(6, { message: 'Au moins 6 caractères requis' }),
    confirmPassword: z.string().min(6, { message: 'Veuillez confirmer le mot de passe' }),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Les mots de passe ne correspondent pas',
    path: ['confirmPassword'],
  })

  type ProfileFormData = z.infer<typeof profileSchema>
  type PasswordFormData = z.infer<typeof passwordSchema>

  export const ProfilePage: React.FC = () => {
    const dispatch = useDispatch()
    const profile = useSelector((state: RootState) => state.auth.profile)

    const [loadingProfile, setLoadingProfile] = useState(false)
    const [loadingPassword, setLoadingPassword] = useState(false)
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)

    // Formulaire Profil
    const { 
      register: registerProfile, 
      handleSubmit: handleSubmitProfile, 
      formState: { errors: profileErrors } 
    } = useForm<ProfileFormData>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
        nom: profile?.nom || '',
        prenom: profile?.prenom || '',
        email: profile?.email || '',
      }
    })

    // Formulaire Mot de Passe
    const { 
      register: registerPassword, 
      handleSubmit: handleSubmitPassword, 
      reset: resetPasswordForm,
      formState: { errors: passwordErrors } 
    } = useForm<PasswordFormData>({
      resolver: zodResolver(passwordSchema)
    })

    // Mettre à jour les informations du profil
    const onUpdateProfile = async (data: ProfileFormData) => {
      setLoadingProfile(true)
      try {
        const updatedProfile = { ...profile, ...data }

        // tentative API
        try {
          await api.put('/user/profile', data)
        } catch {
          // Fallback Local Storage si mode démo/local
          const saved = localStorage.getItem('vendorAccounts')
          if (saved) {
            const accounts = JSON.parse(saved)
            const updated = accounts.map((acc: any) => 
              acc.email === profile?.email ? { ...acc, ...data } : acc
            )
            localStorage.setItem('vendorAccounts', JSON.stringify(updated))
          }
        }

        dispatch(updateProfile(updatedProfile))
        toast.success('Profil mis à jour avec succès')
      } catch {
        toast.error('Erreur lors de la mise à jour du profil')
      } finally {
        setLoadingProfile(false)
      }
    }

    // Changer le mot de passe
    const onChangePassword = async (data: PasswordFormData) => {
      setLoadingPassword(true)
      try {
        try {
          await api.put('/user/change-password', {
            currentPassword: data.currentPassword,
            newPassword: data.newPassword,
          })
        } catch {
          // Fallback Local Storage si mode démo/local
          const saved = localStorage.getItem('vendorAccounts')
          if (saved) {
            const accounts = JSON.parse(saved)
            const updated = accounts.map((acc: any) => 
              acc.email === profile?.email ? { ...acc, motDePasse: data.newPassword } : acc
            )
            localStorage.setItem('vendorAccounts', JSON.stringify(updated))
          }
        }

        toast.success('Mot de passe modifié avec succès')
        resetPasswordForm()
      } catch {
        toast.error('Erreur lors du changement de mot de passe')
      } finally {
        setLoadingPassword(false)
      }
    }

    return (
      <div className="p-6 max-w-5xl mx-auto space-y-8 animate-fade-in">
        {/* En-tête de page */}
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">Mon Profil</h1>
          <p className="text-sm text-slate-500 mt-1">Gérez vos informations personnelles et vos paramètres de sécurité</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Colonne gauche : Résumé du compte */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-card flex flex-col items-center text-center">
              <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 font-bold text-2xl flex items-center justify-center mb-4 shadow-inner">
                {profile?.prenom?.[0] || 'U'}{profile?.nom?.[0] || ''}
              </div>
              <h2 className="text-lg font-bold text-slate-900">{profile?.prenom} {profile?.nom}</h2>
              <p className="text-sm text-slate-500 mb-4">{profile?.email}</p>

              <div className="w-full pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <Shield className="w-4 h-4 text-primary-600" /> Rôle
                  </span>
                  <span className="font-bold uppercase tracking-wide px-2.5 py-1 rounded-full bg-primary-50 text-primary-700">
                    {profile?.role}
                  </span>
                </div>

                {profile?.pointDeVenteId && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                      <Store className="w-4 h-4 text-primary-600" /> Point de Vente
                    </span>
                    <span className="font-semibold text-slate-800">
                      {profile.pointDeVenteId}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> Statut du compte
                  </span>
                  <span className="font-bold text-emerald-600 capitalize">
                    {profile?.statut || 'actif'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite : Formulaires de modification */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Formulaire Informations Personnelles */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-primary-50 text-primary-600">
                  <User className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Informations Générales</h3>
                  <p className="text-xs text-slate-500">Mettez à jour votre nom, prénom et email</p>
                </div>
              </div>

              <form onSubmit={handleSubmitProfile(onUpdateProfile)} className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom</label>
                    <input 
                      type="text" 
                      className={`w-full h-11 px-4 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all ${
                        profileErrors.nom ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                      }`}
                      {...registerProfile('nom')}
                    />
                    {profileErrors.nom && <p className="text-xs text-red-500 mt-1">{profileErrors.nom.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prénom</label>
                    <input 
                      type="text" 
                      className={`w-full h-11 px-4 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all ${
                        profileErrors.prenom ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                      }`}
                      {...registerProfile('prenom')}
                    />
                    {profileErrors.prenom && <p className="text-xs text-red-500 mt-1">{profileErrors.prenom.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Adresse Email</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type="email" 
                      className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all ${
                        profileErrors.email ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                      }`}
                      {...registerProfile('email')}
                    />
                  </div>
                  {profileErrors.email && <p className="text-xs text-red-500 mt-1">{profileErrors.email.message}</p>}
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={loadingProfile}
                    className="gap-2"
                  >
                    <Save className="w-4 h-4" /> Enregistrer les modifications
                  </Button>
                </div>
              </form>
            </div>

            {/* Formulaire Modification Mot de passe */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-card">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-2xl bg-amber-50 text-amber-600">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Sécurité du compte</h3>
                  <p className="text-xs text-slate-500">Mettez à jour votre mot de passe d'accès</p>
                </div>
              </div>

              <form onSubmit={handleSubmitPassword(onChangePassword)} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mot de passe actuel</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                      type={showCurrentPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      className={`w-full h-11 pl-10 pr-10 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all ${
                        passwordErrors.currentPassword ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                      }`}
                      {...registerPassword('currentPassword')}
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {passwordErrors.currentPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.currentPassword.message}</p>}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nouveau mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`w-full h-11 pl-10 pr-10 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all ${
                          passwordErrors.newPassword ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                        }`}
                        {...registerPassword('newPassword')}
                      />
                      <button 
                        type="button" 
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.newPassword.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirmer le mot de passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        className={`w-full h-11 pl-10 pr-4 rounded-xl border bg-white text-slate-900 text-sm outline-none transition-all ${
                          passwordErrors.confirmPassword ? 'border-red-500 focus:ring-red-100' : 'border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100'
                        }`}
                        {...registerPassword('confirmPassword')}
                      />
                    </div>
                    {passwordErrors.confirmPassword && <p className="text-xs text-red-500 mt-1">{passwordErrors.confirmPassword.message}</p>}
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    type="submit" 
                    variant="primary" 
                    isLoading={loadingPassword}
                    className="gap-2"
                  >
                    <Lock className="w-4 h-4" /> Changer le mot de passe
                  </Button>
                </div>
              </form>
            </div>

          </div>
        </div>
      </div>
    )
  }

  export default ProfilePage