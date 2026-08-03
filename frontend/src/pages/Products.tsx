import React, { useMemo, useState, useCallback } from 'react'
import Modal from '../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '../redux/store'
import { createCategory, createProduct, updateProduct, deleteProduct, restockProduct as restockProductAction } from '../redux/inventorySlice'
import { selectMyProducts, selectMyCategories, selectMyPoints } from '../redux/inventorySelectors'
import { getTenantId } from '../redux/authSlice'
import { formatMGA } from '../utils/formatCurrency'
import Button from '../components/ui/Button'
import { Plus, Filter, Eye, Tag, Package, Store, Edit3, Trash2, LayoutList, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import QRCode from 'react-qr-code'

const categorySchema = z.object({
  name: z.string().min(1, 'Nom requis'),
})

const productSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  sku: z.string().min(1, 'Code produit requis'),
  categoryId: z.string().min(1, 'Catégorie requise'),
  pointId: z.string().optional(),
  price: z.number().min(0, 'Le prix doit être positif'),
  stock: z.number().min(0, 'Le stock doit être positif'),
  description: z.string().optional(),
})

const editProductSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  sku: z.string().min(1, 'Code produit requis'),
  categoryId: z.string().min(1, 'Catégorie requise'),
  price: z.number().min(0, 'Le prix doit être positif'),
  description: z.string().optional(),
})

type CategoryForm = z.infer<typeof categorySchema>
type ProductForm = z.infer<typeof productSchema>
type EditProductForm = z.infer<typeof editProductSchema>

export const Products: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  const role = useSelector((s: RootState) => s.auth.profile?.role)
  const profile = useSelector((s: RootState) => s.auth.profile)

  const tenantId = getTenantId(profile)

  const categories = useSelector(selectMyCategories)
  const pointsOfSale = useSelector(selectMyPoints)
  const products = useSelector(selectMyProducts)
  
  const vendorPointId = role === 'vendeur' ? profile?.pointDeVenteId : undefined

  const [filterPoint, setFilterPoint] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string | null>(null)
  const [viewFilter, setViewFilter] = useState<'all' | 'low_stock' | 'out_of_stock'>('all')

  const [openCategory, setOpenCategory] = useState(false)
  const [openProduct, setOpenProduct] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any | null>(null)
  const [openDetail, setOpenDetail] = useState<null | any>(null)

  const [restockProduct, setRestockProduct] = useState<any | null>(null)
  const [restockQuantity, setRestockQuantity] = useState<number>(10)
  const [selectedRestockPointId, setSelectedRestockPointId] = useState<string>('')
  const [loadingRestock, setLoadingRestock] = useState(false)

  const [loadingCat, setLoadingCat] = useState(false)
  const [loadingProd, setLoadingProd] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)

  // Option pour générer un code-barres
  const [generateBarcode, setGenerateBarcode] = useState(true)

  const { register: regCat, handleSubmit: handleCatSubmit, reset: resetCat, formState: catState } = useForm<CategoryForm>({ resolver: zodResolver(categorySchema) })
  const { register: regProd, handleSubmit: handleProdSubmit, reset: resetProd, formState: prodState } = useForm<ProductForm>({ resolver: zodResolver(productSchema) })
  const { register: regEdit, handleSubmit: handleEditSubmit, reset: resetEdit, formState: editState } = useForm<EditProductForm>({ resolver: zodResolver(editProductSchema) })

  const activePointId = role === 'vendeur' ? vendorPointId : filterPoint

  const getDisplayStock = useCallback((product: (typeof products)[number]) => {
    if (activePointId) {
      return product.stockByPoint[activePointId] ?? 0
    }
    return Object.values(product.stockByPoint).reduce((acc, value) => acc + value, 0)
  }, [activePointId])

  const scopedProducts = useMemo(() => {
    if (activePointId) {
      return products.filter((p) => Object.prototype.hasOwnProperty.call(p.stockByPoint, activePointId))
    }
    return products
  }, [products, activePointId])

  const visibleProducts = useMemo(() => {
    let filtered = scopedProducts

    if (filterCategory) {
      filtered = filtered.filter((p) => p.categoryId === filterCategory)
    }

    if (viewFilter === 'low_stock') {
      filtered = filtered.filter((p) => {
        const stock = getDisplayStock(p)
        return stock > 0 && stock <= 20
      })
    } else if (viewFilter === 'out_of_stock') {
      filtered = filtered.filter((p) => getDisplayStock(p) === 0)
    }

    return filtered
  }, [scopedProducts, filterCategory, viewFilter, getDisplayStock])

  const activePointName = useMemo(() => {
    if (!activePointId) return null
    return pointsOfSale.find((pt) => pt.id === activePointId)?.name
  }, [pointsOfSale, activePointId])

  const onCreateCategory = async (data: CategoryForm) => {
    if (!tenantId) {
      toast.error("Impossible de déterminer votre espace administrateur. Reconnectez-vous.")
      return
    }
    setLoadingCat(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    dispatch(createCategory({ name: data.name, adminId: tenantId }))
    resetCat()
    setLoadingCat(false)
    setOpenCategory(false)
  }

  const onCreateProduct = async (data: any) => {
    if (!tenantId) {
      toast.error("Impossible de déterminer votre espace administrateur. Reconnectez-vous.")
      return
    }
    setLoadingProd(true)
    await new Promise((resolve) => setTimeout(resolve, 600))
    dispatch(createProduct({
      name: data.name,
      sku: data.sku,
      categoryId: data.categoryId,
      pointId: data.pointId || undefined,
      price: data.price,
      stock: data.stock,
      description: data.description,
      adminId: tenantId,
      generateBarcode: generateBarcode,
    }))
    resetProd()
    setLoadingProd(false)
    setOpenProduct(false)
  }

  const handleOpenEdit = (product: any) => {
    setEditingProduct(product)
    resetEdit({
      name: product.name,
      sku: product.sku,
      categoryId: product.categoryId,
      price: product.price,
      description: product.description || '',
    })
  }

  const handleOpenRestock = (product: any) => {
    setRestockProduct(product)
    setRestockQuantity(10)
    const defaultPoint = activePointId || pointsOfSale[0]?.id || ''
    setSelectedRestockPointId(defaultPoint)
  }

  const onRestockProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restockProduct || !selectedRestockPointId || restockQuantity <= 0) return
    if (!tenantId) {
      toast.error("Impossible de déterminer votre espace administrateur. Reconnectez-vous.")
      return
    }

    setLoadingRestock(true)
    await new Promise((resolve) => setTimeout(resolve, 500))

    dispatch(restockProductAction({
      productId: restockProduct.id,
      pointDeVenteId: selectedRestockPointId,
      quantity: Number(restockQuantity),
      adminId: tenantId,
    }))

    setLoadingRestock(false)
    setRestockProduct(null)
  }

  const onUpdateProduct = async (data: EditProductForm) => {
    if (!editingProduct) return
    if (!tenantId) {
      toast.error("Impossible de déterminer votre espace administrateur. Reconnectez-vous.")
      return
    }
    setLoadingEdit(true)
    await new Promise((resolve) => setTimeout(resolve, 500))
    dispatch(updateProduct({
      id: editingProduct.id,
      ...data,
      adminId: tenantId,
    }))
    setLoadingEdit(false)
    setEditingProduct(null)
  }

  const handleDeleteProduct = (productId: string, productName: string) => {
    if (!tenantId) {
      toast.error("Impossible de déterminer votre espace administrateur. Reconnectez-vous.")
      return
    }
    if (window.confirm(`Voulez-vous vraiment supprimer le produit "${productName}" ?`)) {
      dispatch(deleteProduct({ id: productId, adminId: tenantId }))
    }
  }

  return (
    <section className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 font-display">Produits</h1>
          <p className="mt-1 text-sm text-slate-500">
            {role === 'vendeur'
              ? `Produits disponibles pour ${activePointName || 'votre point de vente'}.`
              : 'Gérez vos produits, catégories et stocks par boutique.'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {role === 'admin' && (
            <>
              <Button 
                variant="outline"
                size="md"
                onClick={() => setOpenCategory(true)}
              >
                Nouvelle catégorie
              </Button>
              <Button 
                variant="primary"
                size="md"
                onClick={() => setOpenProduct(true)}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Ajouter un produit
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Table & Filtres */}
      <div className="rounded-2xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
        
        {/* Barre de Filtres */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col xl:flex-row xl:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Filtrer l'inventaire</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full xl:w-auto">
            
            <div className="w-full relative">
              <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select 
                value={role === 'vendeur' ? (vendorPointId || '') : (filterPoint || '')} 
                onChange={(e) => setFilterPoint(e.target.value || null)} 
                disabled={role === 'vendeur'}
                className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-slate-700 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {role === 'admin' && <option value="">Tous les points de vente</option>}
                {pointsOfSale.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>

            <div className="w-full relative">
              <LayoutList className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select 
                value={viewFilter} 
                onChange={(e) => setViewFilter(e.target.value as any)} 
                className="w-full h-10 pl-9 pr-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-slate-700"
              >
                <option value="all">Vue : Tous les produits</option>
                <option value="low_stock">Vue : Stock faible (≤ 20)</option>
                <option value="out_of_stock">Vue : Rupture de stock</option>
              </select>
            </div>

            <div className="w-full">
              <select 
                value={filterCategory || ''} 
                onChange={(e) => setFilterCategory(e.target.value || null)} 
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 text-slate-700"
              >
                <option value="">Toutes les catégories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

          </div>
        </div>

        {/* Table responsive */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-150">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-450">
                <th className="px-6 py-4">Nom</th>
                <th className="px-6 py-4 hidden sm:table-cell">SKU</th>
                <th className="px-6 py-4 hidden lg:table-cell">Code</th>
                <th className="px-6 py-4 hidden md:table-cell">Catégorie</th>
                <th className="px-6 py-4 text-right">Prix</th>
                <th className="px-6 py-4 text-center">
                  {activePointName ? `Stock (${activePointName})` : 'Stock Global'}
                </th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    {role === 'vendeur' && !vendorPointId
                      ? "Aucun point de vente ne vous est assigné pour le moment."
                      : "Aucun produit ne correspond à ces critères d'affichage."}
                  </td>
                </tr>
              ) : (
                visibleProducts.map((p) => {
                  const displayStock = getDisplayStock(p)
                  return (
                    <tr 
                      key={p.id} 
                      className="hover:bg-slate-50/50 transition-colors duration-150"
                    >
                      <td className="px-6 py-4 font-semibold text-slate-900">
                        {p.name}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500 hidden sm:table-cell">
                        {p.sku}
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        {p.barcode ? (
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                            {p.barcode}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {categories.find((c) => c.id === p.categoryId)?.name || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-extrabold text-slate-900">
                        {formatMGA(p.price)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center justify-center px-3 py-1 rounded-xl text-xs font-bold leading-none ${
                          displayStock === 0
                            ? 'bg-red-100 text-red-700 border border-red-200' 
                            : displayStock <= 20 
                            ? 'bg-amber-50 text-amber-600 border border-amber-100/80' 
                            : 'bg-emerald-50 text-emerald-600 border border-emerald-100/50'
                        }`}>
                          {displayStock} u
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => handleOpenRestock(p)} 
                            title="Ajouter du stock"
                            className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <Upload className="w-4 h-4" />
                          </button>

                          <button 
                            onClick={() => setOpenDetail(p)} 
                            title="Détails"
                            className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {role === 'admin' && (
                            <>
                              <button 
                                onClick={() => handleOpenEdit(p)} 
                                title="Modifier"
                                className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-amber-600 hover:border-amber-200 hover:bg-amber-50 transition hover:-translate-y-0.5 active:translate-y-0"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDeleteProduct(p.id, p.name)} 
                                title="Supprimer"
                                className="inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-white text-red-600 hover:border-red-200 hover:bg-red-50 transition hover:-translate-y-0.5 active:translate-y-0"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Incrémenter le Stock */}
      <Modal open={!!restockProduct} onClose={() => setRestockProduct(null)} title="Réapprovisionner le stock">
        {restockProduct && (
          <form onSubmit={onRestockProduct} className="space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">{restockProduct.name}</h4>
                <p className="text-xs text-slate-500 font-mono">SKU: {restockProduct.sku}</p>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Point de vente</label>
              <select 
                value={selectedRestockPointId}
                onChange={(e) => setSelectedRestockPointId(e.target.value)}
                disabled={role === 'vendeur'}
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100 disabled:bg-slate-100 disabled:text-slate-500"
              >
                {pointsOfSale.map((pt) => (
                  <option key={pt.id} value={pt.id}>{pt.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Quantité à ajouter</label>
              <input 
                type="number" 
                min="1" 
                value={restockQuantity || ''} 
                onChange={(e) => setRestockQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                placeholder="Ex: 10" 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm font-semibold outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              />
            </div>

            {selectedRestockPointId && (
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/60 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500">
                  Stock actuel : <span className="text-slate-900 font-bold">{restockProduct.stockByPoint[selectedRestockPointId] ?? 0} u</span>
                </span>
                <span className="text-emerald-600 font-extrabold text-sm">
                  → Nouveau : {(restockProduct.stockByPoint[selectedRestockPointId] ?? 0) + (restockQuantity || 0)} u
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" onClick={() => setRestockProduct(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary" isLoading={loadingRestock} leftIcon={<Upload className="w-4 h-4" />}>
                Ajouter au stock
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Nouvelle Catégorie */}
      <Modal open={openCategory} onClose={() => setOpenCategory(false)} title="Nouvelle catégorie">
        <form onSubmit={handleCatSubmit(onCreateCategory)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom de la catégorie</label>
            <input 
              placeholder="Ex: Électronique, Vêtements..." 
              className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                catState.errors.name ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
              }`}
              {...regCat('name')} 
            />
            {catState.errors.name && <p className="text-xs text-red-500 mt-1">{catState.errors.name.message}</p>}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpenCategory(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={loadingCat}>
              Créer la catégorie
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Ajouter un Produit */}
      <Modal open={openProduct} onClose={() => setOpenProduct(false)} title="Ajouter un produit">
        <form onSubmit={handleProdSubmit(onCreateProduct)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom du produit</label>
              <input 
                placeholder="Ex: T-Shirt Premium" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  prodState.errors.name ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regProd('name')} 
              />
              {prodState.errors.name && <p className="text-xs text-red-500 mt-1">{prodState.errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">SKU</label>
              <input 
                placeholder="Ex: TS-PREM-001" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  prodState.errors.sku ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regProd('sku')} 
              />
              {prodState.errors.sku && <p className="text-xs text-red-500 mt-1">{prodState.errors.sku.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Catégorie</label>
              <select 
                defaultValue="" 
                className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  prodState.errors.categoryId ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regProd('categoryId')}
              >
                <option value="" disabled>Choisir une catégorie</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {prodState.errors.categoryId && <p className="text-xs text-red-500 mt-1">{prodState.errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Point de vente</label>
              <select 
                defaultValue="" 
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                {...regProd('pointId')}
              >
                {pointsOfSale.length === 0 ? (
                  <option value="" disabled>Aucun point disponible</option>
                ) : (
                  <>
                    <option value="">Tous les points</option>
                    {pointsOfSale.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prix (Ar)</label>
              <input 
                type="number" 
                step="1" 
                placeholder="25000" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  prodState.errors.price ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regProd('price', { valueAsNumber: true })} 
              />
              {prodState.errors.price && <p className="text-xs text-red-500 mt-1">{prodState.errors.price.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Stock initial</label>
              <input 
                type="number" 
                step="1" 
                placeholder="100" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  prodState.errors.stock ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regProd('stock', { valueAsNumber: true })} 
              />
              {prodState.errors.stock && <p className="text-xs text-red-500 mt-1">{prodState.errors.stock.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <textarea 
              placeholder="Spécifications, tailles..." 
              className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              {...regProd('description')} 
            />
          </div>

          <div className="flex items-center gap-3 py-2">
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={generateBarcode}
                onChange={(e) => setGenerateBarcode(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              Générer un code-barres / QR code
            </label>
            <span className="text-[10px] text-slate-400">(Pour scanner en caisse)</span>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpenProduct(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={loadingProd}>
              Ajouter le produit
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Modifier un Produit */}
      <Modal open={!!editingProduct} onClose={() => setEditingProduct(null)} title="Modifier le produit">
        <form onSubmit={handleEditSubmit(onUpdateProduct)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom du produit</label>
              <input 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  editState.errors.name ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regEdit('name')} 
              />
              {editState.errors.name && <p className="text-xs text-red-500 mt-1">{editState.errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">SKU</label>
              <input 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  editState.errors.sku ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regEdit('sku')} 
              />
              {editState.errors.sku && <p className="text-xs text-red-500 mt-1">{editState.errors.sku.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Catégorie</label>
              <select 
                className={`w-full h-11 px-3.5 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  editState.errors.categoryId ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regEdit('categoryId')}
              >
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {editState.errors.categoryId && <p className="text-xs text-red-500 mt-1">{editState.errors.categoryId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prix (Ar)</label>
              <input 
                type="number" 
                step="1" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  editState.errors.price ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...regEdit('price', { valueAsNumber: true })} 
              />
              {editState.errors.price && <p className="text-xs text-red-500 mt-1">{editState.errors.price.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Description</label>
            <textarea 
              className="w-full min-h-[80px] p-3 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              {...regEdit('description')} 
            />
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setEditingProduct(null)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={loadingEdit}>
              Enregistrer
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Détails du Produit */}
      <Modal open={!!openDetail} onClose={() => setOpenDetail(null)} title="Fiche technique produit">
        {openDetail && (
          <div className="space-y-5">
            <div className="flex items-start gap-4">
              <div className="p-3.5 rounded-2xl bg-primary-50 text-primary-600 shrink-0">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">{openDetail.name}</h3>
                <p className="text-xs font-mono text-slate-500 mt-0.5">REF: {openDetail.sku}</p>
                {openDetail.barcode && (
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">Code: {openDetail.barcode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Catégorie</div>
                <div className="mt-1.5 font-bold text-slate-800 text-sm">
                  {categories.find((c) => c.id === openDetail.categoryId)?.name || 'Non spécifiée'}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Prix unitaire</div>
                <div className="mt-1.5 font-extrabold text-slate-900 text-sm">
                  {formatMGA(openDetail.price)}
                </div>
              </div>
            </div>

            {/* QR Code */}
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 flex flex-col items-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Code-barres / QR Code</div>
              {openDetail.barcode ? (
                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <QRCode value={openDetail.barcode} size={120} level="M" />
                </div>
              ) : (
                <div className="text-xs text-slate-400">Aucun code généré</div>
              )}
              <div className="text-[10px] font-mono text-slate-400 mt-2">{openDetail.barcode || openDetail.sku}</div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Store className="w-4 h-4 text-slate-400" />
                <span>{role === 'vendeur' ? 'Stock de votre point de vente' : 'Répartition des stocks'}</span>
              </div>
              
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {(role === 'vendeur' ? pointsOfSale.filter((point) => point.id === vendorPointId) : pointsOfSale).map((point) => {
                  const stock = openDetail.stockByPoint[point.id] ?? 0
                  return (
                    <li key={point.id} className="rounded-2xl border border-slate-200/55 bg-white p-4 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-800 truncate pr-2">{point.name}</div>
                      <div className={`text-xs font-extrabold px-2.5 py-1 rounded-lg shrink-0 ${
                        stock === 0
                          ? 'bg-red-50 text-red-600'
                          : stock <= 10 
                          ? 'bg-amber-50 text-amber-600' 
                          : 'bg-slate-50 text-slate-700'
                      }`}>
                        {stock} u
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>

            {openDetail.description && (
              <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Description</div>
                <p className="text-xs text-slate-600 leading-relaxed">{openDetail.description}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button variant="primary" onClick={() => setOpenDetail(null)} className="w-full sm:w-auto">
                Fermer la fiche
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </section>
  )
}

export default Products