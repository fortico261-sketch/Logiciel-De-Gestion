import React, { useEffect, useState } from 'react'
import Modal from '../../components/ui/Modal'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import generatePassword from '../../utils/passwordGenerator'
import api from '../../services/api'
import toast from 'react-hot-toast'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../redux/store'
import { createPoint } from '../../redux/inventorySlice'
import { getTenantId } from '../../redux/authSlice'
import Button from '../../components/ui/Button'
import { 
  UserPlus, 
  Eye, 
  Edit3, 
  Trash2, 
  Store, 
  Shield, 
  Key, 
  CheckCircle,
  Copy,
  Mail,
  Phone,
  Briefcase
} from 'lucide-react'

const vendorSchema = z.object({
  nom: z.string().min(1, 'Nom requis'),
  prenom: z.string().min(1, 'Prénom requis'),
  email: z.string().email('Email invalide'),
  telephone: z.string().min(8, 'Téléphone invalide'),
  motDePasse: z.string().min(6, 'Minimum 6 caractères'),
  confirm: z.string().min(6, 'Minimum 6 caractères'),
  pointDeVenteId: z.string().min(1, 'Nom du point de vente requis'),
  departement: z.string().optional(),
  fonction: z.string().optional(),
  statut: z.enum(['actif', 'inactif']).default('actif'),
})

type Form = z.infer<typeof vendorSchema>

type PointDeVente = {
  id: string
  name: string
  location: string
}

const initialPointDeVenteOptions: PointDeVente[] = []

export const VendorAccounts: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>()
  // On récupère le profil de l'admin connecté pour ne manipuler QUE les
  // vendeurs de SON espace de données (tenant isolation). Sans ce filtrage,
  // tous les admins voient tous les vendeurs — c'est le bug d'isolation.
  const profile = useSelector((s: RootState) => s.auth.profile)
  const tenantId = getTenantId(profile)
  const [open, setOpen] = useState(false)
  const [openDetail, setOpenDetail] = useState<any | null>(null)
  const [openEdit, setOpenEdit] = useState<any | null>(null)
  const [confirmation, setConfirmation] = useState<{ email: string; password: string; point: string } | null>(null)
  
  const [loading, setLoading] = useState(false)

  // On charge TOUS les vendeurs depuis localStorage, mais on ne garde à
  // l'affichage que ceux dont adminId === tenantId (l'admin connecté).
  const [allVendors, setAllVendors] = useState<any[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      return JSON.parse(window.localStorage.getItem('vendorAccounts') || '[]')
    } catch {
      return []
    }
  })

  // Liste filtrée par tenant : SEULS les vendeurs créés par cet admin
  // sont affichés. C'est la correction du bug d'isolation.
  const list = tenantId ? allVendors.filter((v) => v.adminId === tenantId) : []

  const [points, setPoints] = useState<PointDeVente[]>(() => {
    if (typeof window === 'undefined') return initialPointDeVenteOptions
    try {
      return JSON.parse(window.localStorage.getItem('pointsOfSale') || 'null') || initialPointDeVenteOptions
    } catch {
      return initialPointDeVenteOptions
    }
  })

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<Form>({ resolver: zodResolver(vendorSchema) })
  const useMockApi = import.meta.env.VITE_USE_MOCK_API !== 'false'

  // Champ texte séparé pour la localité dans le modal d'édition : on affiche
  // le NOM du point de vente (comme partout ailleurs dans l'UI) plutôt que
  // son ID brut, et on ne résout vers un pointDeVenteId qu'au moment de la
  // sauvegarde (comme le fait déjà onCreate pour la création).
  const [editLocationInput, setEditLocationInput] = useState('')

  // Nouveau mot de passe optionnel saisi dans le modal d'édition. Vide par
  // défaut : si l'admin ne touche pas ce champ, le mot de passe du vendeur
  // reste inchangé.
  const [editNewPassword, setEditNewPassword] = useState('')
  const [editConfirmPassword, setEditConfirmPassword] = useState('')

  useEffect(() => {
    if (openEdit) {
      setEditLocationInput(getPointLabel(openEdit.pointDeVenteId))
      setEditNewPassword('')
      setEditConfirmPassword('')
    }
  }, [openEdit])

  const resolvePointId = (label: string): string | undefined => {
    const entered = label.trim()
    if (!entered) return undefined

    const byId = points.find((p) => p.id === entered)
    if (byId) return byId.id

    const byName = points.find((p) => p.name.toLowerCase() === entered.toLowerCase())
    if (byName) return byName.id

    const newPoint = { id: `pdv-${Date.now()}`, name: entered, location: '' }
    setPoints((prev) => [newPoint, ...prev])
    try {
      // On stamp adminId sur le point de vente pour l'isoler dans l'espace
      // de l'admin connecté (même logique que pour les vendeurs).
      dispatch(createPoint({ id: newPoint.id, name: newPoint.name, city: newPoint.location, adminId: tenantId || '' }))
    } catch {}
    return newPoint.id
  }

  const getPointLabel = (id?: string) => points.find((option) => option.id === id)?.name || id || 'Non défini'

  // On persiste TOUS les vendeurs (tous admins confondus) dans localStorage,
  // mais l'affichage reste filtré par tenant via `list`.
  useEffect(() => {
    window.localStorage.setItem('vendorAccounts', JSON.stringify(allVendors))
  }, [allVendors])

  useEffect(() => {
    window.localStorage.setItem('pointsOfSale', JSON.stringify(points))
  }, [points])

  const onCreate = async (data: Form) => {
    if (data.motDePasse !== data.confirm) {
      toast.error('Les mots de passe ne correspondent pas')
      return
    }

    if (!tenantId) {
      toast.error('Impossible de déterminer votre espace administrateur. Reconnectez-vous.')
      return
    }

    setLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 800)) // loading transition for premium feel

    let resolvedPointId: string | undefined = undefined
    const entered = data.pointDeVenteId?.trim()
    if (entered) {
      const byId = points.find((p) => p.id === entered)
      const byName = points.find((p) => p.name.toLowerCase() === entered.toLowerCase())
      if (byId) resolvedPointId = byId.id
      else if (byName) resolvedPointId = byName.id
      else {
        const newPoint = { id: `pdv-${Date.now()}`, name: data.pointDeVenteId, location: '' }
        setPoints((prev) => [newPoint, ...prev])
        try {
          dispatch(createPoint({ id: newPoint.id, name: newPoint.name, city: newPoint.location, adminId: tenantId }))
        } catch {}
        resolvedPointId = newPoint.id
      }
    }

    // adminId est stampé ici : c'est ce qui rattache le vendeur à l'admin
    // qui le crée. Sans ça, le vendeur serait visible par tous les admins.
    const payload = {
      id: `vendor-${Date.now()}`,
      adminId: tenantId,
      nom: data.nom,
      prenom: data.prenom,
      email: data.email,
      telephone: data.telephone,
      motDePasse: data.motDePasse,
      pointDeVenteId: resolvedPointId,
      departement: data.departement,
      fonction: data.fonction,
      statut: data.statut,
    }

    if (useMockApi) {
      const created = payload
      setAllVendors((s) => [created, ...s])
      setOpen(false)
      setConfirmation({ email: created.email, password: data.motDePasse, point: getPointLabel(created.pointDeVenteId) })
      reset()
      setLoading(false)
      toast.success('Vendeur créé (mode local)')
      return
    }

    try {
      const res = await api.post('/vendeurs', payload)
      const created = res.data || payload
      setAllVendors((s) => [created, ...s])
      setOpen(false)
      setConfirmation({ email: created.email, password: data.motDePasse, point: getPointLabel(created.pointDeVenteId) })
      reset()
      toast.success('Vendeur créé')
    } catch (e: any) {
      if (!e?.response) {
        const created = payload
        setAllVendors((s) => [created, ...s])
        setOpen(false)
        setConfirmation({ email: created.email, password: data.motDePasse, point: getPointLabel(created.pointDeVenteId) })
        reset()
        toast.success('Vendeur créé en mode local')
      } else {
        toast.error(e?.response?.data?.message || 'Erreur création vendeur')
      }
    } finally {
      setLoading(false)
    }
  }

  const genPassword = () => {
    const pwd = generatePassword(10)
    setValue('motDePasse', pwd)
    setValue('confirm', pwd)
    toast.success('Mot de passe généré automatiquement')
  }

  return (
    <section className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 font-display">Comptes vendeurs</h1>
          <p className="mt-1 text-sm text-slate-500">Gérez les profils vendeurs et leurs points d'accès respectifs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="primary" 
            size="md" 
            onClick={() => setOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Créer un vendeur
          </Button>
        </div>
      </div>

      {/* Table responsive */}
      <div className="rounded-3xl border border-slate-200/60 bg-white shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full table-auto border-collapse text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-150">
              <tr className="text-xs font-bold uppercase tracking-wider text-slate-450">
                <th className="px-6 py-4">Vendeur</th>
                <th className="px-6 py-4 hidden sm:table-cell">Email / Tel</th>
                <th className="px-6 py-4">Boutique assignée</th>
                <th className="px-6 py-4 hidden md:table-cell">Département</th>
                <th className="px-6 py-4 hidden lg:table-cell">Fonction</th>
                <th className="px-6 py-4 text-center">Statut</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {list.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">
                    Aucun vendeur enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                list.map((v, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors duration-150">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs shrink-0">
                          {v.prenom[0]?.toUpperCase()}{v.nom[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{v.prenom} {v.nom}</div>
                          <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">{v.fonction || 'Vendeur'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 hidden sm:table-cell">
                      <div className="text-xs font-semibold text-slate-655">{v.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{v.telephone || '—'}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-150 text-slate-700">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {getPointLabel(v.pointDeVenteId)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs font-semibold text-slate-655 hidden md:table-cell">
                      {v.departement || '—'}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500 hidden lg:table-cell">
                      {v.fonction || '—'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide leading-none ${
                        v.statut === 'inactif' 
                          ? 'bg-red-50 text-red-650 border border-red-100/50' 
                          : 'bg-emerald-50 text-emerald-650 border border-emerald-100/50'
                      }`}>
                        {v.statut}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button 
                          onClick={() => setOpenDetail(v)} 
                          className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Voir les détails"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setOpenEdit(v)} 
                          className="p-2 rounded-xl text-slate-500 hover:text-yellow-600 hover:bg-yellow-50 transition-colors"
                          title="Modifier"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            // On supprime par id (et non par index de la liste
                            // filtrée) pour éviter de supprimer le mauvais
                            // vendeur si l'ordre change.
                            setAllVendors((s) => s.filter((acc) => acc.id !== v.id))
                          }} 
                          className="p-2 rounded-xl text-slate-500 hover:text-danger hover:bg-red-50 transition-colors"
                          title="Supprimer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Créer Vendeur */}
      <Modal open={open} onClose={() => setOpen(false)} title="Créer un compte vendeur">
        <form onSubmit={handleSubmit(onCreate)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prénom</label>
              <input 
                placeholder="Ex: Jean" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  errors.prenom ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...register('prenom')} 
              />
              {errors.prenom && <p className="text-xs text-red-500 mt-1">{errors.prenom.message}</p>}
            </div>
            
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom</label>
              <input 
                placeholder="Ex: Rabe" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  errors.nom ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...register('nom')} 
              />
              {errors.nom && <p className="text-xs text-red-500 mt-1">{errors.nom.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
              <input 
                placeholder="Ex: jean.rabe@example.mg" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  errors.email ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...register('email')} 
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Téléphone</label>
              <input 
                placeholder="Ex: +261 34 00 000 00" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  errors.telephone ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...register('telephone')} 
              />
              {errors.telephone && <p className="text-xs text-red-500 mt-1">{errors.telephone.message}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Mot de passe</label>
            <div className="flex gap-2">
              <input 
                placeholder="Mot de passe temporaire" 
                type="text"
                className={`flex-1 h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  errors.motDePasse ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...register('motDePasse')} 
              />
              <Button type="button" variant="outline" onClick={genPassword} leftIcon={<Key className="w-4 h-4" />}>
                Générer
              </Button>
            </div>
            {errors.motDePasse && <p className="text-xs text-red-500 mt-1">{errors.motDePasse.message}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirmer le mot de passe</label>
            <input 
              placeholder="Confirmer" 
              type="text"
              className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                errors.confirm ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
              }`}
              {...register('confirm')} 
            />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Point de vente (Boutique)</label>
              <input 
                placeholder="Ex: Boutique Analakely" 
                className={`w-full h-11 px-4 rounded-xl border bg-white text-sm outline-none transition focus:ring-2 focus:ring-primary-100 ${
                  errors.pointDeVenteId ? 'border-red-500' : 'border-slate-200 focus:border-primary-500'
                }`}
                {...register('pointDeVenteId')} 
              />
              {errors.pointDeVenteId && <p className="text-xs text-red-500 mt-1">{errors.pointDeVenteId.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Département</label>
              <input 
                placeholder="Ex: Ventes" 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                {...register('departement')} 
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fonction</label>
              <input 
                placeholder="Ex: Caissier Principal" 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                {...register('fonction')} 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Statut du compte</label>
              <select 
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                {...register('statut')}
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Créer le vendeur
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmation de Création */}
      <Modal open={!!confirmation} onClose={() => setConfirmation(null)} title="Identifiants générés">
        {confirmation && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-emerald-600 bg-emerald-50 border border-emerald-100/50 rounded-2xl p-4">
              <CheckCircle className="w-6 h-6 shrink-0" />
              <div>
                <div className="font-bold text-sm">Vendeur enregistré avec succès</div>
                <div className="text-xs opacity-90">Transmettez ces informations au collaborateur.</div>
              </div>
            </div>

            <div className="space-y-3.5 rounded-2xl border border-slate-200/55 p-5 bg-slate-50/50">
              <div className="flex items-center justify-between gap-4 pb-3 border-b border-slate-200/30">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Champ</div>
                <div className="text-xs font-bold uppercase tracking-wider text-slate-450">Identifiants de connexion</div>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="font-bold text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Email :</span>
                <span className="font-mono font-bold text-slate-850 select-all">{confirmation.email}</span>
              </div>
              
              <div className="flex items-center justify-between text-xs py-1">
                <span className="font-bold text-slate-500 flex items-center gap-1.5"><Key className="w-3.5 h-3.5" /> Mot de passe :</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-slate-850 select-all">{confirmation.password}</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(confirmation.password)
                      toast.success('Mot de passe copié')
                    }}
                    className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 transition"
                    title="Copier le mot de passe"
                  >
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <span className="font-bold text-slate-500 flex items-center gap-1.5"><Store className="w-3.5 h-3.5" /> Boutique :</span>
                <span className="font-bold text-slate-850">{confirmation.point}</span>
              </div>
            </div>

            <div className="pt-2">
              <Button variant="primary" onClick={() => setConfirmation(null)} className="w-full">
                Terminer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Détails Vendeur */}
      <Modal open={!!openDetail} onClose={() => setOpenDetail(null)} title="Fiche collaborateur vendeur">
        {openDetail && (
          <div className="space-y-5">
            <div className="flex items-center gap-4 pb-4 border-b border-slate-100">
              <div className="w-14 h-14 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center font-extrabold text-lg">
                {openDetail.prenom[0]?.toUpperCase()}{openDetail.nom[0]?.toUpperCase()}
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 font-display">{openDetail.prenom} {openDetail.nom}</h3>
                <span className="inline-flex rounded-full bg-emerald-50 text-emerald-700 px-2.5 py-0.5 text-[10px] font-bold uppercase border border-emerald-100/50 mt-1">
                  {openDetail.statut}
                </span>
              </div>
            </div>

            <div className="space-y-3.5">
              <div className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100">
                <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-550 w-24">Adresse Email:</span>
                <span className="font-semibold text-slate-800">{openDetail.email}</span>
              </div>

              <div className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100">
                <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-550 w-24">Téléphone:</span>
                <span className="font-semibold text-slate-800">{openDetail.telephone || 'Non spécifié'}</span>
              </div>

              <div className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100">
                <Store className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-550 w-24">Point de vente:</span>
                <span className="font-semibold text-slate-800">{getPointLabel(openDetail.pointDeVenteId)}</span>
              </div>

              <div className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100">
                <Briefcase className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-550 w-24">Département:</span>
                <span className="font-semibold text-slate-800">{openDetail.departement || 'Non défini'}</span>
              </div>

              <div className="flex items-center gap-3 text-xs py-1.5 border-b border-slate-100">
                <Shield className="w-4 h-4 text-slate-400 shrink-0" />
                <span className="font-bold text-slate-550 w-24">Fonction:</span>
                <span className="font-semibold text-slate-800">{openDetail.fonction || 'Non définie'}</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <Button variant="outline" onClick={() => setOpenDetail(null)} className="w-full sm:w-auto">
                Fermer le profil
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Modifier Vendeur */}
      <Modal open={!!openEdit} onClose={() => setOpenEdit(null)} title="Modifier le vendeur">
        {openEdit && (
          <form onSubmit={(e) => {
            e.preventDefault()

            // Si l'admin a rempli le champ nouveau mot de passe, on valide
            // qu'il correspond à la confirmation et qu'il respecte la
            // longueur minimale, avant d'autoriser la sauvegarde.
            if (editNewPassword || editConfirmPassword) {
              if (editNewPassword.length < 6) {
                toast.error('Le nouveau mot de passe doit contenir au moins 6 caractères')
                return
              }
              if (editNewPassword !== editConfirmPassword) {
                toast.error('Les mots de passe ne correspondent pas')
                return
              }
            }

            const idx = allVendors.findIndex((v) => v.id === openEdit.id)
            if (idx !== -1) {
              // On résout le texte de localité (nom saisi) vers un pointDeVenteId
              // valide, en créant un nouveau point de vente si nécessaire —
              // exactement comme le fait onCreate à la création d'un vendeur.
              const resolvedPointId = resolvePointId(editLocationInput)
              const updated = {
                ...openEdit,
                pointDeVenteId: resolvedPointId,
                ...(editNewPassword ? { motDePasse: editNewPassword } : {}),
              }
              const newList = [...allVendors]
              newList[idx] = updated
              setAllVendors(newList)
              setOpenEdit(null)

              if (editNewPassword) {
                toast.success('Vendeur modifié — nouveau mot de passe enregistré')
              } else {
                toast.success('Vendeur modifié avec succès')
              }
            }
          }} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Prénom</label>
                <input 
                  placeholder="Prénom" 
                  defaultValue={openEdit.prenom} 
                  onChange={(e) => setOpenEdit({ ...openEdit, prenom: e.target.value })} 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nom</label>
                <input 
                  placeholder="Nom" 
                  defaultValue={openEdit.nom} 
                  onChange={(e) => setOpenEdit({ ...openEdit, nom: e.target.value })} 
                  className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Email</label>
              <input 
                placeholder="Email" 
                defaultValue={openEdit.email} 
                onChange={(e) => setOpenEdit({ ...openEdit, email: e.target.value })} 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Téléphone</label>
              <input 
                placeholder="Téléphone" 
                defaultValue={openEdit.telephone} 
                onChange={(e) => setOpenEdit({ ...openEdit, telephone: e.target.value })} 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Département</label>
              <input 
                placeholder="Département" 
                defaultValue={openEdit.departement} 
                onChange={(e) => setOpenEdit({ ...openEdit, departement: e.target.value })} 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Point de vente (Boutique)</label>
              <input 
                placeholder="Ex: Boutique Analakely" 
                value={editLocationInput} 
                onChange={(e) => setEditLocationInput(e.target.value)} 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Fonction</label>
              <input 
                placeholder="Fonction" 
                defaultValue={openEdit.fonction} 
                onChange={(e) => setOpenEdit({ ...openEdit, fonction: e.target.value })} 
                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100" 
              />
            </div>

            {/* Réinitialisation du mot de passe — optionnelle. Laisser vide
                pour conserver le mot de passe actuel du vendeur. */}
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/50 p-4 space-y-3.5">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600">
                  Réinitialiser le mot de passe (optionnel)
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Nouveau mot de passe</label>
                <div className="flex gap-2">
                  <input
                    placeholder="Laisser vide pour ne pas changer"
                    type="text"
                    value={editNewPassword}
                    onChange={(e) => setEditNewPassword(e.target.value)}
                    className="flex-1 h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const pwd = generatePassword(10)
                      setEditNewPassword(pwd)
                      setEditConfirmPassword(pwd)
                      toast.success('Mot de passe généré automatiquement')
                    }}
                    leftIcon={<Key className="w-4 h-4" />}
                  >
                    Générer
                  </Button>
                </div>
              </div>

              {editNewPassword && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Confirmer le nouveau mot de passe</label>
                  <input
                    placeholder="Confirmer"
                    type="text"
                    value={editConfirmPassword}
                    onChange={(e) => setEditConfirmPassword(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1.5">Statut du compte</label>
              <select 
                defaultValue={openEdit.statut} 
                onChange={(e) => setOpenEdit({ ...openEdit, statut: e.target.value })} 
                className="w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-100"
              >
                <option value="actif">Actif</option>
                <option value="inactif">Inactif</option>
              </select>
            </div>

            <div className="flex justify-end gap-2.5 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenEdit(null)}>
                Annuler
              </Button>
              <Button type="submit" variant="primary">
                Enregistrer les modifications
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </section>
  )
}

export default VendorAccounts
