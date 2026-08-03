import React, { useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../redux/store'
import { selectMyProducts, selectMyPoints, selectMyStockMovements } from '../redux/inventorySelectors'
import { addStockEntry } from '../redux/inventorySlice'
import { getTenantId } from '../redux/authSlice'
import { formatMGA } from '../utils/formatCurrency'
import { motion } from 'framer-motion'
import {
  ArrowDownToLine, Package, Store, Search, Filter,
  Plus, User,
  CheckCircle, TrendingUp
} from 'lucide-react'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import toast from 'react-hot-toast'

type EntryReason = 'achat' | 'retour' | 'ajustement' | 'reapprovisionnement'

const reasonLabels: Record<EntryReason, string> = {
  achat: 'Achat fournisseur',
  retour: 'Retour client',
  ajustement: 'Ajustement stock',
  reapprovisionnement: 'Réapprovisionnement'
}

const reasonColors: Record<EntryReason, string> = {
  achat: 'bg-blue-50 text-blue-600 border-blue-200',
  retour: 'bg-green-50 text-green-600 border-green-200',
  ajustement: 'bg-amber-50 text-amber-600 border-amber-200',
  reapprovisionnement: 'bg-purple-50 text-purple-600 border-purple-200'
}

export const Entrees: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const profile = useSelector((s: RootState) => s.auth.profile)
  const products = useSelector(selectMyProducts)
  const pointsOfSale = useSelector(selectMyPoints)
  const movements = useSelector(selectMyStockMovements)
  const tenantId = getTenantId(profile)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterPoint, setFilterPoint] = useState<string>('all')
  const [filterReason, setFilterReason] = useState<EntryReason | 'all'>('all')
  const [dateRange, setDateRange] = useState<{ from: string; to: string }>({ from: '', to: '' })

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [selectedPoint, setSelectedPoint] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(1)
  const [reason, setReason] = useState<EntryReason>('achat')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Filtrer les mouvements d'entrée
  const entrees = useMemo(() => {
    let filtered = movements.filter(m => m.type === 'entree')
    
    if (searchTerm) {
      filtered = filtered.filter(m => 
        m.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.productSku.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    if (filterPoint !== 'all') {
      filtered = filtered.filter(m => m.pointDeVenteId === filterPoint)
    }
    
    if (filterReason !== 'all') {
      filtered = filtered.filter(m => m.reason === filterReason)
    }
    
    if (dateRange.from) {
      filtered = filtered.filter(m => m.date >= dateRange.from)
    }
    if (dateRange.to) {
      filtered = filtered.filter(m => m.date <= dateRange.to + 'T23:59:59')
    }
    
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  }, [movements, searchTerm, filterPoint, filterReason, dateRange])

  // Statistiques
  const stats = useMemo(() => {
    const totalEntries = entrees.reduce((sum, m) => sum + m.quantity, 0)
    const totalValue = entrees.reduce((sum, m) => {
      const product = products.find(p => p.id === m.productId)
      return sum + (product?.price || 0) * m.quantity
    }, 0)
    const byReason = entrees.reduce((acc, m) => {
      acc[m.reason] = (acc[m.reason] || 0) + m.quantity
      return acc
    }, {} as Record<string, number>)
    
    return { totalEntries, totalValue, byReason }
  }, [entrees, products])

  const handleSubmit = async () => {
    if (!selectedProduct || !selectedPoint || quantity <= 0) {
      toast.error('Veuillez remplir tous les champs')
      return
    }
    if (!tenantId) {
      toast.error('Impossible de déterminer votre espace')
      return
    }

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 500))

    dispatch(addStockEntry({
      productId: selectedProduct,
      pointDeVenteId: selectedPoint,
      quantity: quantity,
      reason: reason,
      note: note || undefined,
      userId: profile?.id || '',
    }))

    setIsSubmitting(false)
    setIsModalOpen(false)
    setSelectedProduct('')
    setSelectedPoint('')
    setQuantity(1)
    setReason('achat')
    setNote('')
    toast.success('Entrée de stock enregistrée avec succès')
  }

    

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-3">
            <ArrowDownToLine className="w-8 h-8 text-success-500" />
            Entrées de stock
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Suivi des entrées : achats, retours, réapprovisionnements et ajustements.
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setIsModalOpen(true)}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Nouvelle entrée
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-success-50 text-success-600">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Total entrées</div>
              <div className="text-2xl font-extrabold text-slate-900">{stats.totalEntries} unités</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-primary-50 text-primary-600">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Valeur totale</div>
              <div className="text-2xl font-extrabold text-slate-900">{formatMGA(stats.totalValue)}</div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft"
        >
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
              <Filter className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase">Transactions</div>
              <div className="text-2xl font-extrabold text-slate-900">{entrees.length}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/60 bg-white p-5 shadow-soft">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher par produit ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100"
            />
          </div>

          <select
            value={filterPoint}
            onChange={(e) => setFilterPoint(e.target.value)}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 min-w-[160px]"
          >
            <option value="all">Tous les points</option>
            {pointsOfSale.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <select
            value={filterReason}
            onChange={(e) => setFilterReason(e.target.value as EntryReason | 'all')}
            className="h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 min-w-[160px]"
          >
            <option value="all">Tous les motifs</option>
            {Object.entries(reasonLabels).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <div className="flex gap-2">
            <input
              type="date"
              value={dateRange.from}
              onChange={(e) => setDateRange({ ...dateRange, from: e.target.value })}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
            <input
              type="date"
              value={dateRange.to}
              onChange={(e) => setDateRange({ ...dateRange, to: e.target.value })}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Produit</th>
                <th className="px-6 py-4 hidden md:table-cell">Point de vente</th>
                <th className="px-6 py-4 text-center">Quantité</th>
                <th className="px-6 py-4 text-center">Motif</th>
                <th className="px-6 py-4 text-right">Utilisateur</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {entrees.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                    Aucune entrée de stock enregistrée
                  </td>
                </tr>
              ) : (
                entrees.map((movement) => (
                  <tr key={movement.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-xs font-semibold text-slate-900">
                        {new Date(movement.date).toLocaleDateString('fr-FR')}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(movement.date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">{movement.productName}</div>
                      <div className="text-[10px] font-mono text-slate-400">{movement.productSku}</div>
                    </td>
                    <td className="px-6 py-4 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {movement.pointDeVenteName}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-bold bg-success-100 text-success-700">
                        +{movement.quantity}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${reasonColors[movement.reason as EntryReason] || 'bg-slate-100 text-slate-600'}`}>
                        {reasonLabels[movement.reason as EntryReason] || movement.reason}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-600">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {movement.userName}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Nouvelle Entrée */}
      <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nouvelle entrée de stock">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Produit</label>
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              required
            >
              <option value="">Sélectionner un produit</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Point de vente</label>
              <select
                value={selectedPoint}
                onChange={(e) => setSelectedPoint(e.target.value)}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                required
              >
                <option value="">Sélectionner</option>
                {pointsOfSale.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Quantité</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-bold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Motif de l'entrée</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as EntryReason)}
              className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
            >
              {Object.entries(reasonLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Note (optionnelle)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Information supplémentaire..."
              className="w-full min-h-[80px] px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting} leftIcon={<CheckCircle className="w-4 h-4" />}>
              Enregistrer l'entrée
            </Button>
          </div>
        </form>
      </Modal>
    </section>
  )
}

export default Entrees