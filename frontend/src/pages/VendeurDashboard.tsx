import React, { useMemo, useState, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../redux/store'
import { recordSale } from '../redux/inventorySlice'
import { selectMyProducts, selectMyPoints, selectMySales } from '../redux/inventorySelectors'
import { getTenantId } from '../redux/authSlice'
import { formatMGA } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ShoppingBag, 
  DollarSign, 
  Activity, 
  QrCode, 
  Search, 
  CheckCircle, 
  Store,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Receipt,
  X,
  XCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

type CartItem = {
  productId: string
  name: string
  sku: string
  barcode?: string
  price: number
  quantity: number
  stock: number
  maxStock: number
}

export const VendeurDashboard: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const profile = useSelector((s: RootState) => s.auth.profile)
  const products = useSelector(selectMyProducts)
  const points = useSelector(selectMyPoints)
  const sales = useSelector(selectMySales)

  const tenantId = getTenantId(profile)
  
  // États du scanner
  const [isScanning, setIsScanning] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null)
  const controlsRef = useRef<any>(null)

  // État du panier
  const [cart, setCart] = useState<CartItem[]>([])
  const [showReceipt, setShowReceipt] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  // État pour la recherche
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<typeof products>([])

  // Initialisation du scanner
  useEffect(() => {
    codeReaderRef.current = new BrowserMultiFormatReader()
    return () => {
      controlsRef.current?.stop()
    }
  }, [])

  // Scanner caméra
  useEffect(() => {
    if (!isScanning) return

    let cancelled = false

    const startScan = async () => {
      try {
        if (!videoRef.current || !codeReaderRef.current) return

        const controls = await codeReaderRef.current.decodeFromVideoDevice(
          undefined,
          videoRef.current,
          (result) => {
            if (result && !cancelled) {
              const scannedCode = result.getText()
              // Chercher le produit par barcode ou SKU
              const product = products.find(
                p => p.barcode === scannedCode || p.sku === scannedCode
              )
              if (product) {
                addToCart(product)
                setSearchQuery('')
                setSearchResults([])
              } else {
                toast.error('Produit non trouvé')
                setSearchQuery(scannedCode)
              }
              controlsRef.current?.stop()
              setIsScanning(false)
            }
          }
        )

        if (cancelled) {
          controls.stop()
        } else {
          controlsRef.current = controls
        }
      } catch (err) {
        console.error("Erreur scanner:", err)
        toast.error("Impossible d'accéder à la caméra")
        setIsScanning(false)
      }
    }

    startScan()

    return () => {
      cancelled = true
      controlsRef.current?.stop()
    }
  }, [isScanning, products])

  const toggleScanner = () => setIsScanning(prev => !prev)

  const pointId = profile?.pointDeVenteId
  const point = points.find((p) => p.id === pointId)

  // Produits disponibles (avec stock > 0)
  const availableProducts = useMemo(
    () => products.filter((product) => (pointId ? (product.stockByPoint[pointId] ?? 0) > 0 : true)),
    [products, pointId],
  )

  // Recherche de produits par nom, SKU ou barcode
  const handleSearch = (query: string) => {
    setSearchQuery(query)
    const trimmed = query.trim().toLowerCase()
    
    if (!trimmed) {
      setSearchResults([])
      return
    }

    const results = availableProducts.filter(product => 
      product.name.toLowerCase().includes(trimmed) ||
      product.sku.toLowerCase().includes(trimmed) ||
      (product.barcode && product.barcode.toLowerCase().includes(trimmed))
    )
    setSearchResults(results)
  }

  // Effacer la recherche
  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
  }

  // Statistiques
  const salesForSeller = useMemo(
    () => sales.filter((sale) => sale.sellerId === profile?.id),
    [sales, profile?.id],
  )

  const totalRevenue = salesForSeller.reduce((sum, sale) => sum + sale.total, 0)
  const totalTransactions = salesForSeller.length
  const totalProductsScanned = salesForSeller.reduce((sum, sale) => sum + sale.quantity, 0)

  // Calcul du panier
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0)

  // Ajouter au panier
  const addToCart = (product: typeof products[number]) => {
    if (!pointId) {
      toast.error('Aucun point de vente sélectionné')
      return
    }
    
    const stock = product.stockByPoint[pointId] ?? 0
    if (stock <= 0) {
      toast.error('Stock insuffisant')
      return
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.productId === product.id)
      if (existing) {
        if (existing.quantity >= existing.maxStock) {
          toast.error('Stock insuffisant')
          return prevCart
        }
        return prevCart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      return [...prevCart, {
        productId: product.id,
        name: product.name,
        sku: product.sku,
        barcode: product.barcode,
        price: product.price,
        quantity: 1,
        stock: stock,
        maxStock: stock
      }]
    })
    
    toast.success(`${product.name} ajouté au panier`)
    // Effacer la recherche après ajout
    clearSearch()
  }

  // Mettre à jour la quantité
  const updateQuantity = (productId: string, delta: number) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.productId === productId) {
          const newQty = item.quantity + delta
          if (newQty <= 0) return item
          if (newQty > item.maxStock) {
            toast.error('Stock insuffisant')
            return item
          }
          return { ...item, quantity: newQty }
        }
        return item
      }).filter(item => item.quantity > 0)
    })
  }

  // Supprimer du panier
  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.productId !== productId))
  }

  // Vider le panier
  const clearCart = () => {
    if (cart.length === 0) return
    if (window.confirm('Vider le panier ?')) {
      setCart([])
    }
  }

  // Valider la vente
  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Le panier est vide')
      return
    }
    if (!pointId || !profile || !tenantId) {
      toast.error('Configuration manquante')
      return
    }

    setIsProcessing(true)

    try {
      // Enregistrer chaque produit du panier
      for (const item of cart) {
        await new Promise(resolve => setTimeout(resolve, 100))
        dispatch(recordSale({
          productId: item.productId,
          pointDeVenteId: pointId,
          sellerId: profile.id,
          quantity: item.quantity,
          adminId: tenantId,
        }))
      }

      // Sauvegarder le reçu
      setLastSale({
        items: [...cart],
        total: subtotal,
        date: new Date().toISOString(),
        seller: profile.prenom || profile.nom || 'Vendeur'
      })

      setShowReceipt(true)
      setCart([])
      toast.success('Vente enregistrée avec succès')
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement')
    } finally {
      setIsProcessing(false)
    }
  }

  // Rechercher par code ou SKU (touche Enter)
  const handleManualSearch = (value: string) => {
    const trimmed = value.trim()
    if (!trimmed) return

    // Chercher un produit exact par barcode ou SKU
    const exactProduct = products.find(
      p => p.barcode === trimmed || p.sku === trimmed
    )
    if (exactProduct) {
      addToCart(exactProduct)
      clearSearch()
    } else {
      // Sinon faire une recherche par texte
      handleSearch(trimmed)
    }
  }

  // Produits à afficher (résultats de recherche ou tous les produits disponibles)
  const displayProducts = useMemo(() => {
    if (searchQuery.trim()) {
      return searchResults
    }
    return availableProducts
  }, [searchQuery, searchResults, availableProducts])

  return (
    <section className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-primary-500" />
            Espace vendeur
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Scanner les produits, ajouter au panier et finaliser la vente.
          </p>
        </div>
        
        <div className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200/60 p-4 shadow-soft">
          <div className="p-2.5 rounded-xl bg-primary-50 text-primary-600 shrink-0">
            <Store className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Point de vente</div>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{point?.name || 'Non assigné'}</div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total vendu', value: totalRevenue, isMoney: true, icon: DollarSign, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Transactions', value: totalTransactions, icon: Activity, color: 'text-blue-600 bg-blue-50' },
          { label: 'Unités vendues', value: totalProductsScanned, icon: ShoppingBag, color: 'text-violet-600 bg-violet-50' },
          { label: 'Panier actuel', value: totalItems, icon: ShoppingCart, color: 'text-amber-600 bg-amber-50' },
        ].map((item) => {
          const Icon = item.icon
          return (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-soft flex items-center justify-between"
            >
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{item.label}</div>
                <div className="mt-1 text-xl font-extrabold text-slate-900 font-display">
                  {item.isMoney ? formatMGA(item.value) : item.value}
                </div>
              </div>
              <div className={`p-2.5 rounded-xl ${item.color} border shrink-0`}>
                <Icon className="w-5 h-5" />
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Scanner et recherche */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">Scanner / Recherche</h2>
              <p className="text-xs text-slate-500 mt-0.5">Scannez un code-barres ou saisissez le SKU</p>
            </div>
            <span className="inline-flex rounded-full bg-primary-50 text-primary-700 px-3 py-1 text-xs font-bold">Temps réel</span>
          </div>

          <div className="space-y-4">
            {/* Scanner */}
            <div className="relative overflow-hidden h-48 w-full rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center shadow-inner group">
              {isScanning ? (
                <>
                  <video ref={videoRef} className="absolute inset-0 w-full h-full object-cover" muted playsInline />
                  <div className="absolute top-0 left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_10px_#ef4444] animate-scan pointer-events-none" />
                  <div className="absolute inset-4 border border-dashed border-white/30 rounded-xl pointer-events-none" />
                  <button 
                    onClick={toggleScanner}
                    className="absolute bottom-3 z-10 bg-slate-900/80 text-white px-4 py-1.5 rounded-full text-xs font-bold hover:bg-slate-800 transition"
                  >
                    Arrêter le scan
                  </button>
                </>
              ) : (
                <div 
                  className="flex flex-col items-center justify-center w-full h-full cursor-pointer hover:bg-slate-800/50 transition" 
                  onClick={toggleScanner}
                >
                  <QrCode className="w-14 h-14 text-slate-400 mb-3 group-hover:scale-105 transition-transform duration-300" />
                  <div className="text-sm font-bold uppercase tracking-widest text-slate-300">Scanner un code</div>
                  <div className="text-xs text-slate-400 mt-1">Code-barres ou QR Code</div>
                </div>
              )}
            </div>

            {/* Recherche manuelle avec filtre en temps réel */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleManualSearch(searchQuery)
                    }
                    if (e.key === 'Escape') {
                      clearSearch()
                    }
                  }}
                  placeholder="Rechercher par nom, SKU ou code-barres..."
                  className="w-full h-11 pl-10 pr-10 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}
              </div>
              <Button 
                onClick={() => handleManualSearch(searchQuery)}
                variant="primary"
                size="md"
              >
                Rechercher
              </Button>
            </div>

            {/* Résultat de recherche ou produits disponibles */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  {searchQuery.trim() ? `Résultats (${displayProducts.length})` : 'Produits en stock'}
                </h3>
                {searchQuery.trim() && displayProducts.length === 0 && (
                  <span className="text-xs text-amber-600 font-semibold">Aucun résultat</span>
                )}
                {searchQuery.trim() && displayProducts.length > 0 && (
                  <button
                    onClick={clearSearch}
                    className="text-xs text-primary-600 font-semibold hover:text-primary-700 transition-colors"
                  >
                    Voir tous les produits
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                {displayProducts.slice(0, 12).map((product) => {
                  const stock = product.stockByPoint[pointId!] ?? 0
                  return (
                    <button
                      key={product.id}
                      onClick={() => addToCart(product)}
                      className="p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/30 transition text-left group"
                    >
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-primary-700 transition-colors">
                        {product.name}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">{product.sku}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-bold text-primary-600">{formatMGA(product.price)}</span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock <= 10 ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'}`}>
                          {stock} u
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Panier */}
        <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-soft flex flex-col max-h-[700px]">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary-500" />
              <h2 className="text-base font-bold text-slate-900 font-display">Panier</h2>
              {cart.length > 0 && (
                <span className="text-xs font-bold text-white bg-primary-500 rounded-full px-2 py-0.5">
                  {totalItems}
                </span>
              )}
            </div>
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs font-semibold text-danger-600 hover:text-danger-700 transition"
              >
                Vider
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto mt-4 space-y-2">
            {cart.length === 0 ? (
              <div className="text-center py-12">
                <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <div className="text-sm text-slate-400">Panier vide</div>
                <div className="text-xs text-slate-300 mt-1">Scannez ou recherchez un produit</div>
              </div>
            ) : (
              <AnimatePresence>
                {cart.map((item) => (
                  <motion.div
                    key={item.productId}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="rounded-xl border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-900 truncate">{item.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{item.sku}</div>
                        <div className="text-xs font-bold text-primary-600 mt-1">{formatMGA(item.price)}</div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="p-1 rounded-lg text-slate-400 hover:text-danger-600 hover:bg-danger-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateQuantity(item.productId, -1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-sm font-bold text-slate-900 w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.productId, 1)}
                          className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-sm font-bold text-slate-900">
                        {formatMGA(item.price * item.quantity)}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {cart.length > 0 && (
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Total</span>
                <span className="font-bold text-primary-600 text-lg">{formatMGA(subtotal)}</span>
              </div>
              <Button
                onClick={handleCheckout}
                variant="primary"
                size="lg"
                className="w-full"
                isLoading={isProcessing}
                loadingText="Traitement..."
              >
                <Receipt className="w-4 h-4" />
                Valider la vente
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Reçu */}
      <AnimatePresence>
        {showReceipt && lastSale && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setShowReceipt(false)} />
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.96 }}
              className="relative w-full max-w-md z-10 rounded-2xl bg-white border border-slate-100 p-6 shadow-elevated"
            >
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-success-500" />
                  <h3 className="text-base font-bold text-slate-900">Vente enregistrée</h3>
                </div>
                <button onClick={() => setShowReceipt(false)} className="p-2 rounded-full text-slate-400 hover:bg-slate-100">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="mt-4 space-y-3">
                <div className="text-center py-4">
                  <div className="w-14 h-14 rounded-full bg-success-50 text-success-600 flex items-center justify-center mx-auto mb-3">
                    <CheckCircle className="w-7 h-7" />
                  </div>
                  <div className="text-2xl font-extrabold text-slate-900">{formatMGA(lastSale.total)}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    {new Date(lastSale.date).toLocaleString('fr-FR')}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Vendeur: {lastSale.seller}</div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-2 max-h-[200px] overflow-y-auto">
                  {lastSale.items.map((item: CartItem, idx: number) => (
                    <div key={idx} className="flex justify-between text-xs">
                      <span className="text-slate-600">{item.name} × {item.quantity}</span>
                      <span className="font-bold text-slate-900">{formatMGA(item.price * item.quantity)}</span>
                    </div>
                  ))}
                </div>

                <button
                  onClick={() => setShowReceipt(false)}
                  className="w-full h-11 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold transition-colors"
                >
                  Nouvelle vente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  )
}

export default VendeurDashboard