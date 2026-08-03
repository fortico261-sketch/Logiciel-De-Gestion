import { createSlice, nanoid } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

// Chaque entité porte désormais un champ `adminId` : c'est ce qui isole les
// données d'un admin par rapport à un autre. Toute lecture affichée à
// l'écran DOIT être filtrée par cet adminId (voir inventorySelectors.ts).

export type PointDeVente = {
  id: string
  adminId: string
  name: string
  city: string
}

const generateBarcode = (sku: string): string => {
  // Génère un code-barres basé sur le SKU + timestamp
  const base = sku.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  const timestamp = Date.now().toString().slice(-6)
  return `${base}${timestamp}`
}

export type Category = {
  id: string
  adminId: string
  name: string
}

export type Product = {
  id: string
  adminId: string
  name: string
  sku: string
  barcode?: string
  categoryId: string
  price: number
  stockByPoint: Record<string, number>
  description?: string
}

export type Sale = {
  id: string
  adminId: string
  productId: string
  pointDeVenteId: string
  sellerId: string
  quantity: number
  total: number
  date: string
}

export type StockMovement = {
  id: string
  adminId: string
  productId: string
  productName: string
  productSku: string
  pointDeVenteId: string
  pointDeVenteName: string
  type: 'entree' | 'sortie'
  quantity: number
  previousStock: number
  newStock: number
  reason: string // 'achat', 'retour', 'vente', 'ajustement', 'reapprovisionnement', 'perte', 'retour_fournisseur'
  userId: string
  userName: string
  date: string
  note?: string
}

export type InventoryState = {
  pointsOfSale: PointDeVente[]
  categories: Category[]
  products: Product[]
  sales: Sale[]
  stockMovements: StockMovement[] // AJOUTÉ
}

// =======================
// LocalStorage
// =======================

const load = <T>(key: string, defaultValue: T): T => {
  if (typeof window === 'undefined') return defaultValue

  try {
    const data = localStorage.getItem(key)
    if (!data) return defaultValue

    const parsed = JSON.parse(data)

    // MIGRATION: Ajouter adminId aux points de vente
    if (key === 'pointsOfSale' && Array.isArray(parsed)) {
      let adminId = 'admin-default'
      try {
        const authData = localStorage.getItem('auth')
        if (authData) {
          const auth = JSON.parse(authData)
          const profile = auth?.profile
          if (profile) {
            adminId = profile.role === 'admin' ? profile.id : profile.adminId
          }
        }
      } catch (e) {}

      return parsed.map((point: any) => ({
        id: point.id,
        adminId: point.adminId || adminId,
        name: point.name || 'Point inconnu',
        city: point.city || point.location || '',
      })) as T
    }

    // MIGRATION: Ajouter adminId aux produits
    if (key === 'products' && Array.isArray(parsed)) {
      let adminId = 'admin-default'
      try {
        const authData = localStorage.getItem('auth')
        if (authData) {
          const auth = JSON.parse(authData)
          const profile = auth?.profile
          if (profile) {
            adminId = profile.role === 'admin' ? profile.id : profile.adminId
          }
        }
      } catch (e) {}

      return parsed.map((product: any) => ({
        ...product,
        adminId: product.adminId || adminId,
      })) as T
    }

    // MIGRATION: Ajouter adminId aux ventes
    if (key === 'sales' && Array.isArray(parsed)) {
      let adminId = 'admin-default'
      try {
        const authData = localStorage.getItem('auth')
        if (authData) {
          const auth = JSON.parse(authData)
          const profile = auth?.profile
          if (profile) {
            adminId = profile.role === 'admin' ? profile.id : profile.adminId
          }
        }
      } catch (e) {}

      return parsed.map((sale: any) => ({
        ...sale,
        adminId: sale.adminId || adminId,
      })) as T
    }

    return parsed
  } catch (error) {
    console.error(`Erreur de chargement de ${key}:`, error)
    return defaultValue
  }
}

const save = (key: string, value: any) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(key, JSON.stringify(value))
}

// =======================

const initialState: InventoryState = {
  pointsOfSale: load<PointDeVente[]>('pointsOfSale', []),
  categories: load<Category[]>('categories', []),
  products: load<Product[]>('products', []),
  sales: load<Sale[]>('sales', []),
  stockMovements: load<StockMovement[]>('stockMovements', []),
}

const inventorySlice = createSlice({
  name: 'inventory',
  initialState,

  reducers: {
    createCategory(
      state,
      action: PayloadAction<{
        name: string
        adminId: string
      }>
    ) {
      state.categories.unshift({
        id: `cat-${Date.now()}`,
        adminId: action.payload.adminId,
        name: action.payload.name,
      })

      save('categories', state.categories)
    },

    createPoint(
      state,
      action: PayloadAction<{
        id: string
        name: string
        city?: string
        adminId: string
      }>
    ) {
      state.pointsOfSale.unshift({
        id: action.payload.id,
        adminId: action.payload.adminId,
        name: action.payload.name,
        city: action.payload.city || '',
      })

      save('pointsOfSale', state.pointsOfSale)
    },

    createProduct(
      state,
      action: PayloadAction<{
        name: string
        sku: string
        categoryId: string
        price: number
        stock: number
        description?: string
        pointId?: string
        adminId: string
        generateBarcode?: boolean
      }>
    ) {
      const stockByPoint: Record<string, number> = {}

      state.pointsOfSale
        .filter((point) => point.adminId === action.payload.adminId)
        .forEach((point) => {
          if (action.payload.pointId) {
            stockByPoint[point.id] =
              point.id === action.payload.pointId
                ? action.payload.stock
                : 0
          } else {
            stockByPoint[point.id] = action.payload.stock
          }
        })

      const product: Product = {
        id: `prod-${Date.now()}`,
        adminId: action.payload.adminId,
        name: action.payload.name,
        sku: action.payload.sku,
        barcode: action.payload.generateBarcode !== false ? generateBarcode(action.payload.sku) : undefined,
        categoryId: action.payload.categoryId,
        price: action.payload.price,
        stockByPoint,
        description: action.payload.description,
      }

      state.products.unshift(product)

      save('products', state.products)
    },

    updateProduct(
      state,
      action: PayloadAction<{
        id: string
        name: string
        sku: string
        price: number
        categoryId: string
        description?: string
        adminId: string
      }>
    ) {
      const prod = state.products.find(
        (p) => p.id === action.payload.id && p.adminId === action.payload.adminId
      )
      if (prod) {
        prod.name = action.payload.name
        prod.sku = action.payload.sku
        prod.price = action.payload.price
        prod.categoryId = action.payload.categoryId
        prod.description = action.payload.description

        save('products', state.products)
      }
    },

    restockProduct(
      state,
      action: PayloadAction<{
        productId: string
        pointDeVenteId: string
        quantity: number
        adminId: string
      }>
    ) {
      const product = state.products.find(
        (p) => p.id === action.payload.productId && p.adminId === action.payload.adminId
      )
      if (!product) return

      const point = state.pointsOfSale.find(
        (p) => p.id === action.payload.pointDeVenteId && p.adminId === action.payload.adminId
      )
      if (!point) {
        console.error('Point de vente non trouvé:', action.payload.pointDeVenteId)
        return
      }

      const previousStock = product.stockByPoint[action.payload.pointDeVenteId] ?? 0
      const newStock = previousStock + action.payload.quantity

      product.stockByPoint[action.payload.pointDeVenteId] = newStock

      const movement: StockMovement = {
        id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: action.payload.adminId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        pointDeVenteId: action.payload.pointDeVenteId,
        pointDeVenteName: point.name,
        type: 'entree',
        quantity: action.payload.quantity,
        previousStock,
        newStock,
        reason: 'reapprovisionnement',
        userId: action.payload.adminId,
        userName: 'Administrateur',
        date: new Date().toISOString(),
      }
      state.stockMovements.unshift(movement)

      save('products', state.products)
      save('stockMovements', state.stockMovements)
    },

    deleteProduct(
      state,
      action: PayloadAction<{ id: string; adminId: string }>
    ) {
      state.products = state.products.filter(
        (p) => !(p.id === action.payload.id && p.adminId === action.payload.adminId)
      )
      save('products', state.products)
    },

    recordSale(
      state,
      action: PayloadAction<{
        productId: string
        pointDeVenteId: string
        sellerId: string
        quantity: number
        adminId: string
      }>
    ) {
      const product = state.products.find(
        (p) => p.id === action.payload.productId && p.adminId === action.payload.adminId
      )

      if (!product) return

      const currentStock = product.stockByPoint[action.payload.pointDeVenteId] ?? 0
      const quantity = Math.min(action.payload.quantity, currentStock)

      const previousStock = currentStock
      const newStock = currentStock - quantity

      product.stockByPoint[action.payload.pointDeVenteId] = newStock

      state.sales.unshift({
        id: nanoid(),
        adminId: action.payload.adminId,
        productId: action.payload.productId,
        pointDeVenteId: action.payload.pointDeVenteId,
        sellerId: action.payload.sellerId,
        quantity,
        total: product.price * quantity,
        date: new Date().toISOString(),
      })

      const pointName = state.pointsOfSale.find(
        (p) => p.id === action.payload.pointDeVenteId
      )?.name || 'Point inconnu'

      const sellerName = 'Vendeur'

      const movement: StockMovement = {
        id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: action.payload.adminId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        pointDeVenteId: action.payload.pointDeVenteId,
        pointDeVenteName: pointName,
        type: 'sortie',
        quantity: quantity,
        previousStock,
        newStock,
        reason: 'vente',
        userId: action.payload.sellerId,
        userName: sellerName,
        date: new Date().toISOString(),
      }
      state.stockMovements.unshift(movement)

      save('products', state.products)
      save('sales', state.sales)
      save('stockMovements', state.stockMovements)
    },

    // === NOUVEAUX REDUCERS POUR LES MOUVEMENTS DE STOCK ===

    addStockEntry(
      state,
      action: PayloadAction<{
        productId: string
        pointDeVenteId: string
        quantity: number
        reason: 'achat' | 'retour' | 'ajustement' | 'reapprovisionnement'
        note?: string
        userId: string
        userName?: string
      }>
    ) {
      const product = state.products.find(
        (p) => p.id === action.payload.productId
      )
      if (!product) return

      const point = state.pointsOfSale.find(
        (p) => p.id === action.payload.pointDeVenteId && p.adminId === product.adminId
      )
      if (!point) {
        console.error('Point de vente non trouvé:', action.payload.pointDeVenteId)
        return
      }

      const previousStock = product.stockByPoint[action.payload.pointDeVenteId] ?? 0
      const newStock = previousStock + action.payload.quantity

      product.stockByPoint[action.payload.pointDeVenteId] = newStock

      const userName = action.payload.userName || 'Utilisateur'

      const movement: StockMovement = {
        id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: product.adminId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        pointDeVenteId: action.payload.pointDeVenteId,
        pointDeVenteName: point.name,
        type: 'entree',
        quantity: action.payload.quantity,
        previousStock,
        newStock,
        reason: action.payload.reason,
        userId: action.payload.userId,
        userName: userName,
        date: new Date().toISOString(),
        note: action.payload.note,
      }
      state.stockMovements.unshift(movement)

      save('products', state.products)
      save('stockMovements', state.stockMovements)
    },

    addStockExit(
      state,
      action: PayloadAction<{
        productId: string
        pointDeVenteId: string
        quantity: number
        reason: 'perte' | 'ajustement' | 'retour_fournisseur'
        note?: string
        userId: string
        userName?: string
      }>
    ) {
      const product = state.products.find(
        (p) => p.id === action.payload.productId
      )
      if (!product) return

      const point = state.pointsOfSale.find(
        (p) => p.id === action.payload.pointDeVenteId && p.adminId === product.adminId
      )
      if (!point) {
        console.error('Point de vente non trouvé:', action.payload.pointDeVenteId)
        return
      }

      const previousStock = product.stockByPoint[action.payload.pointDeVenteId] ?? 0
      if (previousStock < action.payload.quantity) {
        console.error('Stock insuffisant pour la sortie')
        return
      }

      const newStock = previousStock - action.payload.quantity

      product.stockByPoint[action.payload.pointDeVenteId] = newStock

      const userName = action.payload.userName || 'Utilisateur'

      const movement: StockMovement = {
        id: `mv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        adminId: product.adminId,
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        pointDeVenteId: action.payload.pointDeVenteId,
        pointDeVenteName: point.name,
        type: 'sortie',
        quantity: action.payload.quantity,
        previousStock,
        newStock,
        reason: action.payload.reason,
        userId: action.payload.userId,
        userName: userName,
        date: new Date().toISOString(),
        note: action.payload.note,
      }
      state.stockMovements.unshift(movement)

      save('products', state.products)
      save('stockMovements', state.stockMovements)
    },

    // Reducer pour importer des mouvements existants
    importStockMovements: (
      state,
      action: PayloadAction<StockMovement[]>
    ) => {
      state.stockMovements = [...action.payload, ...state.stockMovements]
      save('stockMovements', state.stockMovements)
    },
  },
})

export const {
  createCategory,
  createProduct,
  updateProduct,
  deleteProduct,
  createPoint,
  recordSale,
  restockProduct,
  addStockEntry,
  addStockExit,
  importStockMovements,
} = inventorySlice.actions

export default inventorySlice.reducer