import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../redux/store'
import { selectMyProducts, selectMyCategories, selectMyPoints } from '../redux/inventorySelectors'
import { formatMGA } from '../utils/formatCurrency'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Package, AlertTriangle, CheckCircle2, TrendingDown, Layers, Store, Search, Filter, BarChart3, ChevronDown } from 'lucide-react'

export const Stocks: React.FC = () => {
  const profile = useSelector((s: RootState) => s.auth.profile)
  const products = useSelector(selectMyProducts)
  const categories = useSelector(selectMyCategories)
  const pointsOfSale = useSelector(selectMyPoints)

  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical' | 'low' | 'ok'>('all')
  const [adminViewMode, setAdminViewMode] = useState<string>('all')

  const activePointId = profile?.role === 'vendeur' ? profile?.pointDeVenteId : (adminViewMode === 'all' ? undefined : adminViewMode)

  const getProductTotalStock = (product: typeof products[number]) => Object.values(product.stockByPoint).reduce((acc, qty) => acc + qty, 0)

  const getStockStatus = (qty: number) => {
    if (qty === 0) return { label: 'Rupture', color: 'bg-danger-50 text-danger-600 border-danger-200', level: 'critical' as const }
    if (qty <= 10) return { label: 'Faible', color: 'bg-warning-50 text-warning-600 border-warning-200', level: 'low' as const }
    return { label: 'Optimal', color: 'bg-success-50 text-success-600 border-success-200', level: 'ok' as const }
  }

  const stats = useMemo(() => {
    let totalUnits = 0, totalValue = 0, criticalCount = 0, lowCount = 0, okCount = 0
    products.forEach((p) => {
      const stock = activePointId ? (p.stockByPoint[activePointId] ?? 0) : getProductTotalStock(p)
      totalUnits += stock; totalValue += stock * p.price
      if (stock === 0) criticalCount++; else if (stock <= 10) lowCount++; else okCount++
    })
    return { totalUnits, totalValue, criticalCount, lowCount, okCount }
  }, [products, activePointId])

  const categoryStats = useMemo(() => {
    return categories.map((cat) => {
      const catProducts = products.filter((p) => p.categoryId === cat.id)
      const totalStock = catProducts.reduce((sum, p) => sum + (activePointId ? (p.stockByPoint[activePointId] ?? 0) : getProductTotalStock(p)), 0)
      return { id: cat.id, name: cat.name, count: catProducts.length, stock: totalStock }
    })
  }, [categories, products, activePointId])

  const chartData = categoryStats.filter((c) => c.stock > 0).map((c) => ({ name: c.name, stock: c.stock }))

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = activePointId ? (p.stockByPoint[activePointId] ?? 0) : getProductTotalStock(p)
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase())
      let matchesStatus = true
      if (statusFilter === 'critical') matchesStatus = stock === 0
      if (statusFilter === 'low') matchesStatus = stock > 0 && stock <= 10
      if (statusFilter === 'ok') matchesStatus = stock > 10
      return matchesSearch && matchesStatus
    })
  }, [products, searchTerm, statusFilter, activePointId])

  return (
    <section className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">Gestion des Stocks</h1>
          <p className="text-sm text-slate-500 mt-1">Analyse de l'inventaire en temps réel — vue réseau ou par magasin.</p>
        </div>
        <div className="flex items-center gap-2.5 bg-white pl-4 pr-2 py-2 rounded-xl border border-slate-200/60 shadow-soft self-start">
          <Store className="w-4 h-4 text-primary-500 shrink-0" />
          {profile?.role === 'admin' ? (
            <div className="relative flex items-center">
              <select value={adminViewMode} onChange={(e) => setAdminViewMode(e.target.value)} className="appearance-none text-xs font-bold text-slate-700 bg-transparent pr-6 outline-none cursor-pointer hover:text-primary-600 transition-colors z-10">
                <option value="all">Vue Réseau Global</option>
                <optgroup label="Points de vente">
                  {pointsOfSale.map(pt => <option key={pt.id} value={pt.id}>Stock : {pt.name}</option>)}
                </optgroup>
              </select>
              <ChevronDown className="w-3 h-3 text-slate-400 absolute right-1 pointer-events-none" />
            </div>
          ) : (
            <span className="text-xs font-bold text-slate-700 pr-2">{activePointId ? `Point : ${pointsOfSale.find(p => p.id === activePointId)?.name || 'Magasin'}` : 'Magasin non assigné'}</span>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total en stock', value: `${stats.totalUnits}`, unit: 'unités', icon: Package, color: 'bg-primary-50 text-primary-600' },
          { label: 'Valeur marchande', value: formatMGA(stats.totalValue), unit: '', icon: BarChart3, color: 'bg-success-50 text-success-600' },
          { label: 'Ruptures', value: `${stats.criticalCount}`, unit: 'articles', icon: TrendingDown, color: 'bg-danger-50 text-danger-600' },
          { label: 'Stocks faibles', value: `${stats.lowCount}`, unit: 'articles', icon: AlertTriangle, color: 'bg-warning-50 text-warning-600' },
        ].map((stat, idx) => {
          const Icon = stat.icon
          return (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }} className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft">
              <div className="flex items-start justify-between">
                <div><div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{stat.label}</div><div className="mt-2 text-2xl font-extrabold text-slate-900 font-display">{stat.value}</div>{stat.unit && <div className="text-xs text-slate-400 mt-0.5">{stat.unit}</div>}</div>
                <div className={`p-3 rounded-xl ${stat.color} shrink-0`}><Icon className="w-5 h-5" /></div>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Charts + Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Health */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 font-display">Santé du stock</h2>
            <span className="text-xs text-slate-400">{products.length} réf.</span>
          </div>
          <div className="mt-6 space-y-4">
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex">
              <div style={{ width: `${products.length ? (stats.okCount / products.length) * 100 : 0}%` }} className="bg-success-500 transition-all duration-500" />
              <div style={{ width: `${products.length ? (stats.lowCount / products.length) * 100 : 0}%` }} className="bg-warning-400 transition-all duration-500" />
              <div style={{ width: `${products.length ? (stats.criticalCount / products.length) * 100 : 0}%` }} className="bg-danger-500 transition-all duration-500" />
            </div>
            <div className="space-y-2.5 pt-2">
              {[
                { label: 'Optimal (> 10 u)', count: stats.okCount, color: 'bg-success-500' },
                { label: 'Faible (1 à 10 u)', count: stats.lowCount, color: 'bg-warning-400' },
                { label: 'Rupture (0 u)', count: stats.criticalCount, color: 'bg-danger-500' },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2"><span className={`w-2.5 h-2.5 rounded-full ${s.color}`} /><span className="font-semibold text-slate-700">{s.label}</span></div>
                  <span className="font-bold text-slate-900">{s.count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-success-500 shrink-0" />
            <span>Actualisé sur base {activePointId ? 'du magasin' : 'du réseau'}.</span>
          </div>
        </div>

        {/* Category Bar Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 font-display flex items-center gap-2"><Layers className="w-4 h-4 text-primary-500" />Répartition par catégorie</h2>
            <span className="text-xs text-slate-400">Unités cumulées</span>
          </div>
          <div className="mt-6 h-56">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                  <Bar dataKey="stock" radius={[8, 8, 0, 0]}>
                    {chartData.map((_, idx) => <Cell key={idx} fill={['#2563eb', '#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4'][idx % 6]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-full flex items-center justify-center text-sm text-slate-400">Aucune donnée</div>}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input type="text" placeholder="Rechercher par nom ou SKU..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <div className="flex rounded-xl bg-slate-200/60 p-1 text-xs font-bold">
              {([{ id: 'all', label: 'Tous' }, { id: 'ok', label: 'Bon' }, { id: 'low', label: 'Faible' }, { id: 'critical', label: 'Rupture' }] as const).map((f) => (
                <button key={f.id} onClick={() => setStatusFilter(f.id)} className={`px-3 py-1.5 rounded-lg transition ${statusFilter === f.id ? 'bg-white shadow-sm ' + (f.id === 'ok' ? 'text-success-600' : f.id === 'low' ? 'text-warning-600' : f.id === 'critical' ? 'text-danger-600' : 'text-slate-900') : 'text-slate-600 hover:text-slate-900'}`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4 hidden sm:table-cell">SKU</th>
                <th className="px-6 py-4 hidden lg:table-cell">Catégorie</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">État</th>
                <th className="px-6 py-4 text-right">Valeur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs font-semibold">Aucun produit ne correspond à vos critères.</td></tr>
              ) : (
                filteredProducts.map((product) => {
                  const totalStock = getProductTotalStock(product)
                  const displayStock = activePointId ? (product.stockByPoint[activePointId] ?? 0) : totalStock
                  const status = getStockStatus(displayStock)
                  return (
                    <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{product.name}</div>
                        {activePointId && <div className="text-[10px] text-slate-400 mt-0.5">Réseau : <span className="font-bold text-slate-600">{totalStock} u</span></div>}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-500 hidden sm:table-cell">{product.sku}</td>
                      <td className="px-6 py-4 hidden lg:table-cell"><span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600">{categories.find((c) => c.id === product.categoryId)?.name || '—'}</span></td>
                      <td className="px-6 py-4 text-center"><span className="font-extrabold text-slate-900 text-base">{displayStock}</span><span className="text-xs text-slate-400 ml-1">u</span></td>
                      <td className="px-6 py-4 text-center"><span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${status.color}`}>{status.level === 'critical' && <AlertTriangle className="w-3 h-3" />}{status.label}</span></td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">{formatMGA(displayStock * product.price)}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

export default Stocks
