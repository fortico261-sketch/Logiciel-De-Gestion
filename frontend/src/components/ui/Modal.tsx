import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  onClose: () => void
  title?: string
  children?: React.ReactNode
}

export const Modal: React.FC<Props> = ({ open, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop avec flou verre premium */}
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300" onClick={onClose} />
          
          <motion.div
            className="relative w-full max-w-lg z-10 overflow-hidden rounded-3xl bg-white border border-slate-100 p-6 md:p-8 shadow-card flex flex-col max-h-[90vh]"
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header du modal */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
              <button
                onClick={onClose}
                aria-label="Fermer"
                className="rounded-full p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors duration-150 h-9 w-9 flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Contenu du modal */}
            <div className="overflow-y-auto pr-1 -mr-2 space-y-4 flex-1">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default Modal