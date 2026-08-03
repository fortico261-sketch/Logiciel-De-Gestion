import React from 'react'
import { Navigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'

type Props = {
  children: React.ReactNode
  requiredRole?: 'admin' | 'vendeur'
}

export const ProtectedRoute: React.FC<Props> = ({ children, requiredRole }) => {
  const auth = useSelector((state: RootState) => state.auth)
  const token = auth?.token
  const role = auth?.profile?.role

  if (!token) return <Navigate to="/login" replace />
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />
  if (auth.profile?.statut === 'inactif') return <div className="p-6">Votre compte a été désactivé. Contactez l'administrateur.</div>

  return <>{children}</>
}

export default ProtectedRoute
