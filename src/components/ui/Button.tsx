import React from 'react';
import { Spinner } from './Spinner';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outlined';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm',
  secondary:
    'bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 border border-gray-300 shadow-sm',
  outlined:
    'bg-transparent hover:bg-blue-50 active:bg-blue-100 text-blue-600 border border-blue-300',
  danger:
    'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm',
  ghost:
    'bg-transparent hover:bg-gray-100 active:bg-gray-200 text-gray-600',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-md',
  md: 'px-4 py-2 text-sm gap-2 rounded-lg',
  lg: 'px-6 py-2.5 text-base gap-2 rounded-lg',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  loading = false,
  icon,
  children,
  disabled,
  className = '',
  ...props
}) => {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-150 cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {loading ? <Spinner size="sm" /> : icon ? <span className="shrink-0">{icon}</span> : null}
      {children}
    </button>
  );
};
