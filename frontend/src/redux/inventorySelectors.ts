

// Ces sélecteurs sont le SEUL point d'accès recommandé aux données
// d'inventaire dans les composants. Ils garantissent qu'un admin (ou un
// vendeur rattaché à cet admin) ne voit jamais que les données de son
// propre espace ("tenant").
//
// Ils sont en plus "memoïsés" via `createSelector` : la fonction de
// dérivation (le `.filter`) n'est réexécutée que lorsque l'une des
// entrées change, et la RÉFÉRENCE du tableau renvoyé reste stable tant
// que le résultat est identique. Cela évite les rerenders inutiles et
// les avertissements "Selector returned a different result when called
// with the same parameters".
//
// Usage dans un composant :
//   const products = useSelector(selectMyProducts)
//   const points = useSelector(selectMyPoints)
//   const sales = useSelector(selectMySales)
//   const categories = useSelector(selectMyCategories)

// Entrée "tenant" : renvoie l'id de l'espace de données de l'utilisateur
// connecté (l'admin lui-même, ou l'admin auquel un vendeur est rattaché).
// `undefined` si personne n'est connecté.
import { createSelector } from '@reduxjs/toolkit'
import type { RootState } from './store'
import { getTenantId } from './authSlice'

// Entrée "tenant" : renvoie l'id de l'espace de données de l'utilisateur
const selectTenantId = (state: RootState) => getTenantId(state.auth.profile)

// Entrées brutes de l'inventaire
const selectAllPoints = (state: RootState) => state.inventory.pointsOfSale
const selectAllCategories = (state: RootState) => state.inventory.categories
const selectAllProducts = (state: RootState) => state.inventory.products
const selectAllSales = (state: RootState) => state.inventory.sales
const selectAllStockMovements = (state: RootState) => state.inventory.stockMovements // AJOUTÉ

export const selectMyPoints = createSelector(
  [selectTenantId, selectAllPoints],
  (tenantId, points) => {
    if (!tenantId) return [] as typeof points
    return points.filter((p) => p.adminId === tenantId)
  }
)

export const selectMyCategories = createSelector(
  [selectTenantId, selectAllCategories],
  (tenantId, categories) => {
    if (!tenantId) return [] as typeof categories
    return categories.filter((c) => c.adminId === tenantId)
  }
)

export const selectMyProducts = createSelector(
  [selectTenantId, selectAllProducts],
  (tenantId, products) => {
    if (!tenantId) return [] as typeof products
    return products.filter((p) => p.adminId === tenantId)
  }
)

export const selectMySales = createSelector(
  [selectTenantId, selectAllSales],
  (tenantId, sales) => {
    if (!tenantId) return [] as typeof sales
    return sales.filter((s) => s.adminId === tenantId)
  }
)

// NOUVEAU SÉLECTEUR POUR LES MOUVEMENTS DE STOCK
export const selectMyStockMovements = createSelector(
  [selectTenantId, selectAllStockMovements],
  (tenantId, movements) => {
    if (!tenantId) return [] as typeof movements
    return movements.filter((m) => m.adminId === tenantId)
  }
)

// Sélecteur pour les entrées uniquement
export const selectMyEntrees = createSelector(
  [selectMyStockMovements],
  (movements) => movements.filter((m) => m.type === 'entree')
)

// Sélecteur pour les sorties uniquement
export const selectMySorties = createSelector(
  [selectMyStockMovements],
  (movements) => movements.filter((m) => m.type === 'sortie')
)

// Sélecteur pour obtenir le stock d'un produit dans un point donné
export const selectProductStock = createSelector(
  [selectMyProducts, (_state: RootState, productId: string) => productId],
  (products, productId) => {
    const product = products.find((p) => p.id === productId)
    return product?.stockByPoint || {}
  }
)

export const selectProductMovements = createSelector(
  [selectMyStockMovements, (_state: RootState, productId: string) => productId],
  (movements, productId) => movements.filter((m) => m.productId === productId)
)