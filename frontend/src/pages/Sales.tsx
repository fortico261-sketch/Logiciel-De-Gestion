import React, { useState, useMemo } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../redux/store'
import { selectMyProducts, selectMyPoints, selectMySales } from '../redux/inventorySelectors'
import { recordSale } from '../redux/inventorySlice'
import { getTenantId } from '../redux/authSlice'
import { formatMGA } from '../utils/formatCurrency'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, ShoppingCart, Trash2, Plus, Minus,
  CreditCard, Banknote, Wallet, Receipt, X, CheckCircle,
  Package, TrendingUp, DollarSign, Percent,
} from 'lucide-react'
import toast from 'react-hot-toast'

type CartItem = {
  productId: string
  name: string
  sku: string
  price: number
  quantity: number
  stock: number
}

export const Sales: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const profile = useSelector((s: RootState) => s.auth.profile)
  const products = useSelector(selectMyProducts)
  const pointsOfSale = useSelector(selectMyPoints)
  const sales = useSelector(selectMySales)
  const tenantId = getTenantId(profile)

  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedPointId, setSelectedPointId] = useState<string>(pointsOfSale[0]?.id || '')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'mobile'>('cash')
  const [discount, setDiscount] = useState<number>(0)
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)

  const pointId = profile?.role === 'vendeur' ? profile?.pointDeVenteId : selectedPointId

  const availableProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = pointId ? (p.stockByPoint[pointId] ?? 0) : 0
      const matchesSearch = !searchQuery ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase())
      return stock > 0 && matchesSearch
    })
  }, [products, pointId, searchQuery])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const discountAmount = (subtotal * discount) / 100
  const total = subtotal - discountAmount

  const addToCart = (product: typeof products[number]) => {
    if (!pointId) { toast.error('Aucun point de vente sélectionné'); return }
    const stock = product.stockByPoint[pointId] ?? 0
    const existing = cart.find((item) => item.productId === product.id)
    if (existing) {
      if (existing.quantity >= stock) { toast.error('Stock insuffisant'); return }
      setCart(cart.map((item) => item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item))
    } else {
      setCart([...cart, { productId: product.id, name: product.name, sku: product.sku, price: product.price, quantity: 1, stock }])
    }
  }

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.productId === productId) {
        const newQty = item.quantity + delta
        if (newQty <= 0) return item
        if (newQty > item.stock) { toast.error('Stock insuffisant'); return item }
        return { ...item, quantity: newQty }
      }
      return item
    }))
  }

  const removeFromCart = (productId: string) => setCart(cart.filter((item) => item.productId !== productId))

  const handleCheckout = async () => {
    if (cart.length === 0) { toast.error('Le panier est vide'); return }
    if (!pointId || !profile || !tenantId) { toast.error('Configuration manquante'); return }
    for (const item of cart) {
      dispatch(recordSale({ productId: item.productId, pointDeVenteId: pointId, sellerId: profile.id, quantity: item.quantity, adminId: tenantId }))
    }
    setLastSale({ items: [...cart], total, paymentMethod, discount, date: new Date().toISOString() })
    setShowReceipt(true); setCart([]); setDiscount(0)
    toast.success('Vente enregistrée avec succès')
  }

  const todaySales = sales.filter((s) => s.date.split('T')[0] === new Date().toISOString().split('T')[0])
  const todayRevenue = todaySales.reduce((sum, s) => sum + s.total, 0)

  return (
    <section className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">Point de vente</h1>
        <p className="text-sm text-slate-500">Interface POS moderne pour enregistrer vos ventes rapidement.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-success-50 text-success-600"><DollarSign className="w-4 h-4" /></div>
            <div><div className="text-[10px] font-semibold text-slate-400 uppercase">CA du jour</div><div className="text-lg font-bold text-slate-900">{formatMGA(todayRevenue)}</div></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary-50 text-primary-600"><ShoppingCart className="w-4 h-4" /></div>
            <div><div className="text-[10px] font-semibold text-slate-400 uppercase">Ventes</div><div className="text-lg font-bold text-slate-900">{todaySales.length}</div></div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-accent-50 text-accent-600"><TrendingUp className="w-4 h-4" /></div>
            <div><div className="text-[10px] font-semibold text-slate-400 uppercase">Panier moyen</div><div className="text-lg font-bold text-slate-900">{formatMGA(todaySales.length > 0 ? Math.round(todayRevenue / todaySales.length) : 0)}</div></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Rechercher par nom ou SKU..." className="w-full h-11 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50/50 text-sm outline-none focus:border-primary-500 focus:bg-white focus:ring-2 focus:ring-primary-100" />
            </div>
            {profile?.role === 'admin' && (
              <select value={selectedPointId} onChange={(e) => setSelectedPointId(e.target.value)} className="h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100">
                <option value="">Sélectionner un point</option>
                {pointsOfSale.map((pt) => <option key={pt.id} value={pt.id}>{pt.name}</option>)}
              </select>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[500px] overflow-y-auto pr-1">
            {availableProducts.length === 0 ? (
              <div className="col-span-full text-center py-12 text-sm text-slate-400"><Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />Aucun produit disponible</div>
            ) : (
              availableProducts.map((product) => {
                const stock = pointId ? (product.stockByPoint[pointId] ?? 0) : 0
                return (
                  <motion.button key={product.id} whileHover={{ y: -2 }} whileTap={{ scale: 0.97 }} onClick={() => addToCart(product)} className="text-left rounded-xl border border-slate-200/60 bg-white p-3 hover:border-primary-300 hover:shadow-soft transition-all group">
                    <div className="w-full h-20 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mb-2"><Package className="w-8 h-8 text-slate-400 group-hover:text-primary-500 transition-colors" /></div>
                    <div className="text-xs font-bold text-slate-900 truncate">{product.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{product.sku}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-xs font-bold text-primary-600">{formatMGA(product.price)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock <= 10 ? 'bg-warning-50 text-warning-600' : 'bg-slate-100 text-slate-500'}`}>{stock} u</span>
                    </div>
                  </motion.button>
                )
              })
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft flex flex-col max-h-[700px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-primary-500" /><h2 className="text-base font-bold text-slate-900 font-display">Panier</h2></div>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs font-semibold text-danger-600 hover:text-danger-700">Vider</button>}
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-sm text-slate-400"><ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />Panier vide</div>
            ) : (
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div key={item.productId} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1"><div className="text-xs font-bold text-slate-900 truncate">{item.name}</div><div className="text-[10px] text-slate-400 font-mono">{item.sku}</div></div>
                      <button onClick={() => removeFromCart(item.productId)} className="p-1 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => updateQuantity(item.productId, -1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"><Minus className="w-3 h-3" /></button>
                        <span className="text-xs font-bold text-slate-900 w-8 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.productId, 1)} className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"><Plus className="w-3 h-3" /></button>
                      </div>
                      <div className="text-sm font-bold text-slate-900">{formatMGA(item.price * item.quantity)}</div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
              <div className="flex items-center gap-2">
                <Percent className="w-4 h-4 text-slate-400" />
                <input type="number" min="0" max="100" value={discount || ''} onChange={(e) => setDiscount(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} placeholder="Remise %" className="flex-1 h-9 px-3 rounded-lg border border-slate-200 text-xs font-semibold outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100" />
              </div>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500"><span>Sous-total</span><span className="font-semibold">{formatMGA(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-between text-slate-500"><span>Remise ({discount}%)</span><span className="font-semibold text-danger-600">-{formatMGA(discountAmount)}</span></div>}
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-1.5 border-t border-slate-100"><span>Total</span><span className="text-primary-600">{formatMGA(total)}</span></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([{ id: 'cash', label: 'Espèces', icon: Banknote }, { id: 'card', label: 'Carte', icon: CreditCard }, { id: 'mobile', label: 'Mobile', icon: Wallet }] as const).map((m) => {
                  const Icon = m.icon
                  return <button key={m.id} onClick={() => setPaymentMethod(m.id)} className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border text-[10px] font-bold transition-all ${paymentMethod === m.id ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}><Icon className="w-4 h-4" />{m.label}</button>
                })}
              </div>
              <button onClick={handleCheckout} className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.98]"><Receipt className="w-4 h-4" />Encaisser {formatMGA(total)}</button>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showReceipt && lastSale && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowReceipt(false)} />
            <motion.div initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.96 }} transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-md z-10 rounded-2xl bg-white border border-slate-100 p-6 shadow-elevated">
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2"><CheckCircle className="w-5 h-5 text-success-500" /><h3 className="text-base font-bold text-slate-900">Vente enregistrée</h3></div>
                <button onClick={() => setShowReceipt(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100"><X className="w-4 h-4" /></button>
              </div>
              <div className="mt-4 space-y-3">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-success-50 text-success-600 flex items-center justify-center mx-auto mb-3"><CheckCircle className="w-7 h-7" /></div>
                  <div className="text-2xl font-extrabold text-slate-900">{formatMGA(lastSale.total)}</div>
                  <div className="text-xs text-slate-400 mt-1">{new Date(lastSale.date).toLocaleString('fr-FR')}</div>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2">
                  {lastSale.items.map((item: CartItem, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs"><span className="text-slate-600">{item.name} × {item.quantity}</span><span className="font-bold text-slate-900">{formatMGA(item.price * item.quantity)}</span></div>
                  ))}
                </div>
                <div className="flex items-center justify-between text-xs"><span className="text-slate-400">Mode de paiement</span><span className="font-bold text-slate-900 capitalize">{lastSale.paymentMethod === 'cash' ? 'Espèces' : lastSale.paymentMethod === 'card' ? 'Carte' : 'Mobile'}</span></div>
                <button onClick={() => setShowReceipt(false)} className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors">Nouvelle vente</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default Sales
