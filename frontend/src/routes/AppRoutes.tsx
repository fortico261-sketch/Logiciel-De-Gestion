import React from 'react'
import { Routes, Route } from 'react-router-dom'
import AppLayout from '../layouts/AppLayout'
import LoginPage from '../pages/Auth/Login'
import Dashboard from '../pages/Dashboard'
import Products from '../pages/Products'
import Stocks from '../pages/Stocks'
import Sales from '../pages/Sales'
import Reports from '../pages/Reports'
import VendorAccounts from '../pages/admin/VendorAccounts'
import VendeurDashboard from '../pages/VendeurDashboard'
import ProtectedRoute from './ProtectedRoute'
import ProfilePage from '../pages/ProfilePage';
import { Entrees } from '../pages/Entrees'
import { Sorties } from '../pages/Sorties'
import { RegisterPage } from '../pages/Auth/Register'

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/login"
       element={<LoginPage />}
       />
       <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vendeur/dashboard"
        element={
          <ProtectedRoute requiredRole="vendeur">
            <AppLayout>
              <VendeurDashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/produits"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Products />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/stocks"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Stocks />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/ventes"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Sales />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/rapports"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Reports />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/comptes-vendeurs"
        element={
          <ProtectedRoute requiredRole="admin">
            <AppLayout>
              <VendorAccounts />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <AppLayout>
              <ProfilePage />
            </AppLayout>
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={
          <ProtectedRoute>
            <AppLayout>
              <Dashboard />
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/entrees" element={
        <ProtectedRoute>
          <AppLayout>
            <Entrees />
          </AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/sorties" element={
        <ProtectedRoute>
          <AppLayout>
            <Sorties />
          </AppLayout>
        </ProtectedRoute>
      } />
    </Routes>
  )
}

export default AppRoutes
