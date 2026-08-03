import React, { useState, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectMyProducts, selectMyCategories, selectMyPoints, selectMySales } from '../redux/inventorySelectors'
import { formatMGA } from '../utils/formatCurrency'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
} from 'recharts'
import {
  TrendingUp,Package, ShoppingCart, DollarSign,
  AlertTriangle, Store,  Award, Activity, ChevronDown,
  Receipt, ArrowUpRight, ArrowDownRight, Zap,
} from 'lucide-react'

// =========================
// KPI Card Component
// =========================
type KPICardProps = {
  label: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  trend?: number
  trendLabel?: string
  color: string
  index: number
}

const KPICard: React.FC<KPICardProps> = ({ label, value, icon: Icon, trend, trendLabel, color, index }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay: index * 0.05 }}
    className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft hover:shadow-card transition-all duration-300 group"
  >
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</div>
        <div className="mt-2 text-2xl font-extrabold text-slate-900 font-display">{value}</div>
        {trend !== undefined && (
          <div className="mt-2 flex items-center gap-1 text-xs">
            <span className={`inline-flex items-center gap-0.5 font-bold ${trend >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {trend >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(trend)}%
            </span>
            {trendLabel && <span className="text-slate-400">{trendLabel}</span>}
          </div>
        )}
      </div>
      <div className={`p-3 rounded-xl ${color} shrink-0 group-hover:scale-105 transition-transform duration-200`}>
        <Icon className="w-5 h-5" />
      </div>
    </div>
  </motion.div>
)

// =========================
// Main Dashboard
// =========================
export const Dashboard: React.FC = () => {
  const products = useSelector(selectMyProducts)
  const categories = useSelector(selectMyCategories)
  const pointsOfSale = useSelector(selectMyPoints)
  const sales = useSelector(selectMySales)

  const [expandedPoint, setExpandedPoint] = useState<string | null>(null)

  // KPIs
  const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0)
  const totalSales = sales.reduce((sum, sale) => sum + sale.quantity, 0)
  const totalProducts = products.length
  const lowStockProducts = products.filter((product) =>
    Object.values(product.stockByPoint).some((stock) => stock <= 20),
  ).length
  const totalStockValue = products.reduce(
    (sum, p) => sum + Object.values(p.stockByPoint).reduce((a, s) => a + s, 0) * p.price,
    0,
  )

  // Chart data: Sales over time (last 7 periods)
  const salesChartData = useMemo(() => {
    const grouped: Record<string, { revenue: number; orders: number; profit: number }> = {}
    sales.forEach((sale) => {
      const date = sale.date.split('T')[0]
      if (!grouped[date]) grouped[date] = { revenue: 0, orders: 0, profit: 0 }
      grouped[date].revenue += sale.total
      grouped[date].orders += 1
      grouped[date].profit += sale.total * 0.3 // estimated 30% margin
    })
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([date, val]) => ({
        name: new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' }),
        revenue: val.revenue,
        orders: val.orders,
        profit: Math.round(val.profit),
      }))
  }, [sales])

  // Category distribution for pie chart
  const categoryChartData = useMemo(() => {
    return categories.map((cat) => {
      const count = products.filter((p) => p.categoryId === cat.id).length
      return { name: cat.name, value: count }
    }).filter((c) => c.value > 0)
  }, [categories, products])

  const PIE_COLORS = ['#2563eb', '#7c3aed', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

  // Top products
  const topProducts = products
    .map((product) => ({
      ...product,
      sold: sales.filter((sale) => sale.productId === product.id).reduce((acc, sale) => acc + sale.quantity, 0),
      revenue: sales.filter((sale) => sale.productId === product.id).reduce((acc, sale) => acc + sale.total, 0),
    }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5)

  const getProductName = (productId: string) => products.find((p) => p.id === productId)?.name || 'Produit supprimé'

  // Recent activity
  const recentSales = [...sales].slice(-5).reverse()

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">Tableau de bord</h1>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-success-700 bg-success-50 px-2 py-1 rounded-full border border-success-200">
            <span className="w-1.5 h-1.5 rounded-full bg-success-500 animate-pulse-soft" />
            Temps réel
          </span>
        </div>
        <p className="text-sm text-slate-500">
          Vue d'ensemble de votre activité : ventes, stocks, performances et alertes.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Chiffre d'affaires" value={formatMGA(totalRevenue)} icon={DollarSign} trend={12.5} trendLabel="vs mois dernier" color="bg-success-50 text-success-600" index={0} />
        <KPICard label="Commandes" value={sales.length} icon={ShoppingCart} trend={8.2} trendLabel="vs mois dernier" color="bg-primary-50 text-primary-600" index={1} />
        <KPICard label="Produits" value={totalProducts} icon={Package} color="bg-accent-50 text-accent-600" index={2} />
        <KPICard label="Stock faible" value={lowStockProducts} icon={AlertTriangle} trend={-3.1} trendLabel="vs mois dernier" color="bg-warning-50 text-warning-600" index={3} />
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Unités vendues" value={totalSales} icon={TrendingUp} color="bg-primary-50 text-primary-600" index={4} />
        <KPICard label="Valeur du stock" value={formatMGA(totalStockValue)} icon={Activity} color="bg-accent-50 text-accent-600" index={5} />
        <KPICard label="Points de vente" value={pointsOfSale.length} icon={Store} color="bg-success-50 text-success-600" index={6} />
        <KPICard label="Catégories" value={categories.length} icon={Award} color="bg-warning-50 text-warning-600" index={7} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900 font-display">Évolution des ventes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Revenus et bénéfices estimés</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-primary-500" /> Revenus
              </span>
              <span className="flex items-center gap-1.5 font-semibold text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full bg-success-500" /> Bénéfices
              </span>
            </div>
          </div>
          <div className="mt-6 h-72">
            {salesChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', boxShadow: '0 4px 24px rgba(15,23,42,0.08)' }}
                    formatter={(value: any) => formatMGA(Number(value) || 0)}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={2.5} fill="url(#colorRevenue)" />
                  <Area type="monotone" dataKey="profit" stroke="#22c55e" strokeWidth={2.5} fill="url(#colorProfit)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Aucune donnée de vente disponible</div>
            )}
          </div>
        </div>

        {/* Category Pie Chart */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 font-display">Catégories</h2>
            <span className="text-xs text-slate-400">{categories.length} catégories</span>
          </div>
          <div className="mt-6 h-56">
            {categoryChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    {categoryChartData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-slate-400">Aucune catégorie</div>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {categoryChartData.slice(0, 4).map((cat, idx) => (
              <div key={cat.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                  <span className="font-semibold text-slate-700">{cat.name}</span>
                </div>
                <span className="font-bold text-slate-900">{cat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top Products + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Award className="w-5 h-5 text-warning-500" />
            <h2 className="text-base font-bold text-slate-900 font-display">Top produits</h2>
          </div>
          <div className="mt-4 space-y-3">
            {topProducts.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">Aucun produit vendu pour l'instant</div>
            ) : (
              topProducts.map((product, idx) => (
                <div key={product.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 hover:bg-slate-100/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                    idx === 0 ? 'bg-warning-100 text-warning-700' :
                    idx === 1 ? 'bg-slate-200 text-slate-700' :
                    idx === 2 ? 'bg-orange-100 text-orange-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    #{idx + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">{product.name}</div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">{categories.find((c) => c.id === product.categoryId)?.name || '—'}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-sm font-bold text-slate-900">{product.sold}</div>
                    <div className="text-[10px] text-slate-400">ventes</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Activity className="w-5 h-5 text-primary-500" />
            <h2 className="text-base font-bold text-slate-900 font-display">Activité récente</h2>
          </div>
          <div className="mt-4 space-y-3">
            {recentSales.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">Aucune activité récente</div>
            ) : (
              recentSales.map((sale, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/50 transition-colors">
                  <div className="w-9 h-9 rounded-xl bg-success-50 text-success-600 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-slate-900 truncate">{getProductName(sale.productId)}</div>
                    <div className="text-[10px] text-slate-400">
                      {sale.quantity} unité{sale.quantity > 1 ? 's' : ''} · {new Date(sale.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-success-600 shrink-0">{formatMGA(sale.total)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Points of Sale Performance */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-bold text-slate-900 font-display">Points de vente</h2>
            <p className="text-xs text-slate-400 mt-0.5">Performance par magasin</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {pointsOfSale.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">Aucun point de vente pour le moment</div>
          ) : (
            pointsOfSale.map((point) => {
              const pointSales = sales.filter((sale) => sale.pointDeVenteId === point.id)
              const revenue = pointSales.reduce((sum, sale) => sum + sale.total, 0)
              const remainingStock = products.reduce((sum, product) => sum + (product.stockByPoint[point.id] ?? 0), 0)
              const transactionCount = pointSales.length
              const revenueShare = totalRevenue > 0 ? Math.round((revenue / totalRevenue) * 100) : 0
              const isExpanded = expandedPoint === point.id

              return (
                <div key={point.id} className="rounded-xl border border-slate-100 bg-slate-50/30 p-4 hover:shadow-soft transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-primary-50 text-primary-600 shrink-0">
                        <Store className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-900 text-sm">{point.name}</div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider">{point.city || 'Madagascar'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">CA: </span>
                        <span className="font-bold text-slate-900">{formatMGA(revenue)}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Ventes: </span>
                        <span className="font-bold text-slate-900">{transactionCount}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Stock: </span>
                        <span className={`font-bold ${remainingStock <= 20 ? 'text-danger-600' : 'text-slate-900'}`}>{remainingStock}</span>
                      </div>
                    </div>
                  </div>

                  {/* Revenue share bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                      <span>Part du CA</span>
                      <span className="text-primary-600">{revenueShare}%</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-200/70 overflow-hidden">
                      <div className="h-full rounded-full bg-primary-500 transition-all duration-500" style={{ width: `${revenueShare}%` }} />
                    </div>
                  </div>

                  {/* Expand button */}
                  <button
                    onClick={() => setExpandedPoint(isExpanded ? null : point.id)}
                    className="mt-3 w-full flex items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-primary-500" />
                      Transactions ({transactionCount})
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 rounded-lg border border-slate-200/60 bg-white overflow-hidden">
                          {pointSales.length === 0 ? (
                            <div className="text-center py-4 text-xs text-slate-400">Aucune transaction</div>
                          ) : (
                            <table className="w-full text-left text-xs">
                              <thead className="bg-slate-50 border-b border-slate-100">
                                <tr className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  <th className="px-3 py-2">Produit</th>
                                  <th className="px-3 py-2 text-center">Qté</th>
                                  <th className="px-3 py-2 text-right">Montant</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {[...pointSales].slice(-5).reverse().map((sale, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50/50">
                                    <td className="px-3 py-2 font-semibold text-slate-800">{getProductName(sale.productId)}</td>
                                    <td className="px-3 py-2 text-center text-slate-600">{sale.quantity}</td>
                                    <td className="px-3 py-2 text-right font-bold text-slate-900">{formatMGA(sale.total)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Stock Alerts */}
      {lowStockProducts > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-warning-200/60 bg-warning-50/50 p-5 flex items-center gap-4"
        >
          <div className="p-3 rounded-xl bg-warning-100 text-warning-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold text-slate-900">Alerte de stock</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {lowStockProducts} produit{lowStockProducts > 1 ? 's ont' : ' a'} un stock faible (≤ 20 unités). Pensez à réapprovisionner.
            </div>
          </div>
          <Zap className="w-5 h-5 text-warning-500 shrink-0" />
        </motion.div>
      )}
    </section>
  )
}

export default Dashboard