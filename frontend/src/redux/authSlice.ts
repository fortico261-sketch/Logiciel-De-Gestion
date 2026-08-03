import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

type Role = 'admin' | 'vendeur'

export type UserProfile = {
  id: string
  nom?: string
  prenom?: string
  email: string
  role: Role
  pointDeVenteId?: string
  statut?: 'actif' | 'inactif'
  // adminId identifie l'espace de données ("tenant") auquel appartient cet
  // utilisateur :
  // - Pour un admin, adminId === son propre id (il est le propriétaire de
  //   son propre espace de données).
  // - Pour un vendeur, adminId est l'id de l'admin qui l'a créé — c'est ce
  //   qui permet de savoir dans quel espace (produits, ventes, stocks) il
  //   doit travailler.
  adminId?: string
}

type AuthState = {
  token?: string | null
  profile?: UserProfile | null
}

const stored = typeof window !== 'undefined' ? localStorage.getItem('auth') : null
const initialState: AuthState = stored ? JSON.parse(stored) : { token: null, profile: null }

const slice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; profile: UserProfile }>) {
      state.token = action.payload.token
      state.profile = action.payload.profile
      try {
        localStorage.setItem('auth', JSON.stringify({ token: state.token, profile: state.profile }))
      } catch (e) {
        // ignore
      }
    },
    logout(state) {
      state.token = null
      state.profile = null
      try {
        localStorage.removeItem('auth')
      } catch (e) {}
    },
    setProfile(state, action: PayloadAction<UserProfile>) {
      state.profile = action.payload
      try {
        localStorage.setItem('auth', JSON.stringify({ token: state.token, profile: state.profile }))
      } catch (e) {}
    },
    // ✅ Ajout du reducer updateProfile pour les mises à jour partielles ou complètes
    updateProfile(state, action: PayloadAction<Partial<UserProfile>>) {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload }
        try {
          localStorage.setItem('auth', JSON.stringify({ token: state.token, profile: state.profile }))
        } catch (e) {}
      }
    },
  },
})

// ✅ Export de l'action updateProfile
export const { setCredentials, logout, setProfile, updateProfile } = slice.actions
export default slice.reducer

// Petit utilitaire pratique : donne l'id de l'espace de données ("tenant")
// auquel appartient l'utilisateur connecté, qu'il soit admin ou vendeur.
// À utiliser partout où on filtre products / pointsOfSale / categories / sales.
export const getTenantId = (profile?: UserProfile | null): string | undefined => {
  if (!profile) return undefined
  return profile.role === 'admin' ? profile.id : profile.adminId
}
