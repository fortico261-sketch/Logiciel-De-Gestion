import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { selectMyProducts, selectMyCategories, selectMyPoints, selectMySales } from '../redux/inventorySelectors'
import { formatMGA } from '../utils/formatCurrency'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import {
  Download, FileText, FileSpreadsheet, Filter, TrendingUp,
  DollarSign, ShoppingCart, Package, Users, Calendar, BarChart3,
  Store, Eye
} from 'lucide-react'
import toast from 'react-hot-toast'

export const Reports: React.FC = () => {
  const profile = useSelector((s: RootState) => s.auth.profile)
  const role = profile?.role
  
  // Sélecteurs filtrés par tenant (adminId)
  const products = useSelector(selectMyProducts)
  const categories = useSelector(selectMyCategories)
  const pointsOfSale = useSelector(selectMyPoints)
  const allSales = useSelector(selectMySales)

  // Filtrer les ventes pour les vendeurs - uniquement ses propres ventes
  const sales = useMemo(() => {
    if (role === 'vendeur' && profile?.id) {
      return allSales.filter(sale => sale.sellerId === profile.id)
    }
    return allSales
  }, [allSales, role, profile?.id])

  // Pour les vendeurs, on ne montre que son point de vente
  const sellerPointId = role === 'vendeur' ? profile?.pointDeVenteId : undefined

  const [period, setPeriod] = useState<'7d' | '30d' | 'all'>('30d')

  // KPIs - uniquement sur les ventes filtrées
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0)
  const totalOrders = sales.length
  const totalUnits = sales.reduce((sum, s) => sum + s.quantity, 0)
  const avgBasket = totalOrders > 0 ? totalRevenue / totalOrders : 0
  const totalStockValue = products.reduce((sum, p) => sum + Object.values(p.stockByPoint).reduce((a, s) => a + s, 0) * p.price, 0)

  // Sales trend - uniquement sur les ventes filtrées
  const salesTrend = useMemo(() => {
    const grouped: Record<string, { revenue: number; orders: number; units: number }> = {}
    sales.forEach((s) => {
      const date = s.date.split('T')[0]
      if (!grouped[date]) grouped[date] = { revenue: 0, orders: 0, units: 0 }
      grouped[date].revenue += s.total
      grouped[date].orders += 1
      grouped[date].units += s.quantity
    })
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 999
    return Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).slice(-days).map(([date, v]) => ({
      name: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
      revenue: v.revenue, orders: v.orders, units: v.units,
    }))
  }, [sales, period])

  // Sales by point - pour les vendeurs, uniquement son point
  const salesByPoint = useMemo(() => {
    const pointsToShow = role === 'vendeur' 
      ? pointsOfSale.filter(p => p.id === sellerPointId)
      : pointsOfSale
    
    return pointsToShow.map((pt) => {
      const ptSales = sales.filter((s) => s.pointDeVenteId === pt.id)
      return { 
        name: pt.name, 
        revenue: ptSales.reduce((sum, s) => sum + s.total, 0), 
        orders: ptSales.length 
      }
    })
  }, [pointsOfSale, sales, role, sellerPointId])

  // Category distribution - uniquement sur les produits vendus
  const categoryData = useMemo(() => {
    // Pour les vendeurs, on ne montre que les catégories des produits qu'il a vendus
    const productIds = new Set(sales.map(s => s.productId))
    
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id)
      // Filtrer les produits par ceux qui ont été vendus (pour les vendeurs)
      const relevantProducts = role === 'vendeur' 
        ? catProducts.filter(p => productIds.has(p.id))
        : catProducts
      
      const catSales = sales.filter((s) => relevantProducts.some((p) => p.id === s.productId))
      return { 
        name: cat.name, 
        revenue: catSales.reduce((sum, s) => sum + s.total, 0), 
        count: relevantProducts.length 
      }
    }).filter((c) => c.revenue > 0 || c.count > 0)
  }, [categories, products, sales, role])

  const PIE_COLORS = ['#2563eb', '#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  // Top products by revenue - uniquement les produits vendus
  const topProducts = useMemo(() => {
    // Pour les vendeurs, uniquement les produits qu'il a vendus
    const productIds = new Set(sales.map(s => s.productId))
    
    const filteredProducts = role === 'vendeur'
      ? products.filter(p => productIds.has(p.id))
      : products
    
    return filteredProducts.map((p) => ({
      name: p.name,
      revenue: sales.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.total, 0),
      units: sales.filter((s) => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0),
    })).filter((p) => p.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5)
  }, [products, sales, role])

  const handleExport = (format: 'csv' | 'pdf' | 'excel') => {
    toast.success(`Export ${format.toUpperCase()} en cours...`)
  }

  // Message pour les vendeurs sans données
  const isVendeurSansDonnees = role === 'vendeur' && sales.length === 0

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-primary-500" />
            Rapports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {role === 'vendeur' 
              ? `📊 Vos performances en tant que vendeur - ${pointsOfSale.find(p => p.id === sellerPointId)?.name || 'Votre point de vente'}`
              : 'Business Intelligence — analysez vos performances en temps réel.'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Badge Rôle */}
          <div className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
            role === 'admin' 
              ? 'bg-primary-50 text-primary-700 border border-primary-200' 
              : 'bg-success-50 text-success-700 border border-success-200'
          }`}>
            {role === 'admin' ? '👑 Admin' : '🛒 Vendeur'}
          </div>

          <div className="flex rounded-xl bg-slate-100 p-1 text-xs font-bold">
            {([{ id: '7d', label: '7 jours' }, { id: '30d', label: '30 jours' }, { id: 'all', label: 'Tout' }] as const).map((p) => (
              <button key={p.id} onClick={() => setPeriod(p.id)} className={`px-3 py-1.5 rounded-lg transition ${period === p.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>{p.label}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={() => handleExport('csv')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"><Download className="w-3.5 h-3.5" />CSV</button>
            <button onClick={() => handleExport('excel')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"><FileSpreadsheet className="w-3.5 h-3.5" />Excel</button>
            <button onClick={() => handleExport('pdf')} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"><FileText className="w-3.5 h-3.5" />PDF</button>
          </div>
        </div>
      </div>

      {/* Si vendeur sans données */}
      {isVendeurSansDonnees && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-6 text-center"
        >
          <Eye className="w-12 h-12 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-900">Aucune vente enregistrée</h3>
          <p className="text-sm text-slate-500 mt-1">
            Vous n'avez pas encore effectué de ventes. Utilisez l'espace vendeur pour commencer.
          </p>
          <button 
            onClick={() => window.location.href = '/vendeur/dashboard'}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary-600 text-white text-sm font-bold hover:bg-primary-700 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Aller à l'espace vendeur
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Chiffre d'affaires", value: formatMGA(totalRevenue), icon: DollarSign, color: 'bg-success-50 text-success-600' },
          { label: 'Commandes', value: totalOrders, icon: ShoppingCart, color: 'bg-primary-50 text-primary-600' },
          { label: 'Unités vendues', value: totalUnits, icon: Package, color: 'bg-accent-50 text-accent-600' },
          { label: 'Panier moyen', value: formatMGA(Math.round(avgBasket)), icon: TrendingUp, color: 'bg-warning-50 text-warning-600' },
        ].map((kpi, idx) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{kpi.label}</div>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900 font-display">{kpi.value}</div>
                  {role === 'vendeur' && totalOrders > 0 && (
                    <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400">
                      <Store className="w-3 h-3" />
                      {pointsOfSale.find(p => p.id === sellerPointId)?.name || 'Votre point'}
                    </div>
                  )}
                </div>
                <div className={`p-3 rounded-xl ${kpi.color} shrink-0`}><Icon className="w-5 h-5" /></div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Revenue Trend Chart */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">
              {role === 'vendeur' ? '📈 Évolution de vos ventes' : 'Évolution du chiffre d\'affaires'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {role === 'vendeur' ? 'Vos revenus, commandes et unités vendues' : 'Revenus, commandes et unités vendues'}
            </p>
          </div>
          {role === 'vendeur' && (
            <div className="text-xs font-semibold text-success-600 bg-success-50 px-3 py-1.5 rounded-full border border-success-200">
              {totalOrders} vente{totalOrders > 1 ? 's' : ''}
            </div>
          )}
        </div>
        <div className="mt-6 h-80">
          {salesTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesTrend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="rRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(value: any) => formatMGA(Number(value) || 0)} />
                <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#rRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              {role === 'vendeur' ? 'Aucune vente enregistrée pour votre compte' : 'Aucune donnée disponible'}
            </div>
          )}
        </div>
      </div>

      {/* Two column charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales by Point */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <BarChart3 className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-bold text-slate-900 font-display">
              {role === 'vendeur' ? 'Votre point de vente' : 'Ventes par point de vente'}
            </h2>
          </div>
          <div className="mt-6 h-64">
            {salesByPoint.length > 0 && salesByPoint.some((s) => s.revenue > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={salesByPoint} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(value: any) => formatMGA(Number(value) || 0)} />
                  <Bar dataKey="revenue" fill="#2563eb" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                {role === 'vendeur' ? 'Aucune vente sur votre point' : 'Aucune donnée'}
              </div>
            )}
          </div>
          {role === 'vendeur' && salesByPoint.length > 0 && (
            <div className="mt-3 text-center text-xs text-slate-400">
              {salesByPoint[0]?.orders || 0} vente{salesByPoint[0]?.orders !== 1 ? 's' : ''} enregistrée{salesByPoint[0]?.orders !== 1 ? 's' : ''}
            </div>
          )}
        </div>

        {/* Category Distribution */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Filter className="w-5 h-5 text-accent-500" />
            <h2 className="text-base font-bold text-slate-900 font-display">
              {role === 'vendeur' ? 'Vos catégories vendues' : 'Répartition par catégorie'}
            </h2>
          </div>
          <div className="mt-6 h-64">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="revenue" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3}>
                    {categoryData.map((_, idx) => <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} formatter={(value: any) => formatMGA(Number(value) || 0)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">
                {role === 'vendeur' ? 'Aucune catégorie vendue' : 'Aucune donnée'}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Top Products Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
        <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
          <TrendingUp className="w-5 h-5 text-success-500" />
          <h2 className="text-base font-bold text-slate-900 font-display">
            {role === 'vendeur' ? 'Vos meilleurs produits' : 'Top produits par revenu'}
          </h2>
          {role === 'vendeur' && topProducts.length > 0 && (
            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {topProducts.length} produit{topProducts.length > 1 ? 's' : ''}
            </span>
          )}
        </div>
        <div className="mt-4 overflow-x-auto">
          {topProducts.length > 0 ? (
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100">
                <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Produit</th>
                  <th className="py-3 px-4 text-center">Unités vendues</th>
                  <th className="py-3 px-4 text-right">Revenu généré</th>
                  <th className="py-3 pl-4 text-right">Part du CA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {topProducts.map((p, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 pr-4 font-bold text-slate-900 flex items-center gap-2">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' :
                        idx === 1 ? 'bg-slate-200 text-slate-700' :
                        idx === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      {p.name}
                    </td>
                    <td className="py-3 px-4 text-center text-slate-600">{p.units}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">{formatMGA(p.revenue)}</td>
                    <td className="py-3 pl-4 text-right">
                      <span className="inline-flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                          <div className="h-full bg-primary-500 rounded-full" style={{ width: `${totalRevenue > 0 ? (p.revenue / totalRevenue) * 100 : 0}%` }} />
                        </div>
                        <span className="text-xs font-bold text-slate-600">{totalRevenue > 0 ? ((p.revenue / totalRevenue) * 100).toFixed(1) : 0}%</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-8 text-sm text-slate-400">
              {role === 'vendeur' ? 'Vous n\'avez pas encore vendu de produits' : 'Aucune vente enregistrée'}
            </div>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Package className="w-4 h-4 text-primary-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Inventaire</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{products.length}</div>
          <div className="text-xs text-slate-400 mt-1">produits référencés</div>
          <div className="mt-3 text-sm font-bold text-slate-700">{formatMGA(totalStockValue)}</div>
          <div className="text-xs text-slate-400">valeur du stock</div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            {role === 'vendeur' ? (
              <Store className="w-4 h-4 text-success-500" />
            ) : (
              <Users className="w-4 h-4 text-accent-500" />
            )}
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {role === 'vendeur' ? 'Votre point' : 'Points de vente'}
            </span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900">
            {role === 'vendeur' 
              ? pointsOfSale.find(p => p.id === sellerPointId)?.name || 'Non assigné'
              : pointsOfSale.length
            }
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {role === 'vendeur' ? 'Votre magasin' : 'magasins actifs'}
          </div>
          {role === 'vendeur' && (
            <div className="mt-3 text-sm font-bold text-success-600">
              {totalOrders} vente{totalOrders > 1 ? 's' : ''}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-success-500" />
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Période</span>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 capitalize">
            {period === '7d' ? '7 jours' : period === '30d' ? '30 jours' : 'Tout'}
          </div>
          <div className="text-xs text-slate-400 mt-1">
            {salesTrend.length} point{ salesTrend.length > 1 ? 's' : '' } de données
          </div>
          {role === 'vendeur' && (
            <div className="mt-3 text-xs text-slate-400">
              {totalRevenue > 0 ? formatMGA(totalRevenue) : 'Aucune vente'}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

export default Reports