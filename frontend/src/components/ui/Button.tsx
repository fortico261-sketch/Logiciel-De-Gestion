import React from 'react'
import { Loader2 } from 'lucide-react'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'success' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  leftIcon?: React.ReactNode // Ajouté pour la compatibilité avec Products.tsx et VendorAccounts.tsx
}

export const Button: React.FC<ButtonProps> = ({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  isLoading = false,
  loadingText,
  icon,
  leftIcon,
  disabled,
  type = 'button',
  ...props
}) => {
  // Styles de base de qualité supérieure avec focus-visible, transitions et toucher minimum
  const baseStyles = 'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]'

  // Variantes de couleur
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white shadow-soft focus-visible:ring-primary-500',
    secondary: 'bg-slate-100 hover:bg-slate-200 text-slate-700 focus-visible:ring-slate-500',
    outline: 'border border-slate-200 bg-transparent hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-500',
    danger: 'bg-danger-500 hover:bg-danger-600 text-white shadow-soft focus-visible:ring-danger-500',
    success: 'bg-success-500 hover:bg-success-600 text-white shadow-soft focus-visible:ring-success-500',
    ghost: 'bg-transparent hover:bg-slate-50 text-slate-700 focus-visible:ring-slate-500'
  }

  // Tailles du bouton (sm: min 36px, md: 44px standard tactile, lg: 48px)
  const sizes: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-xs h-9 gap-1.5 rounded-xl',
    md: 'px-5 py-2.5 text-sm h-11 gap-2 rounded-2xl',
    lg: 'px-6 py-3 text-base h-12 gap-2 rounded-2xl'
  }

  const displayIcon = leftIcon || icon

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-current" />
          <span>{loadingText || children}</span>
        </>
      ) : (
        <>
          {displayIcon && <span className="flex items-center justify-center">{displayIcon}</span>}
          <span>{children}</span>
        </>
      )}
    </button>
  )
}

export default Button