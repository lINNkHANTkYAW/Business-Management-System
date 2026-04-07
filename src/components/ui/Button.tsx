import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  onClick?: (e: any) => void;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  loading = false, 
  icon, 
  children, 
  className, 
  disabled, 
  ...props 
}: ButtonProps) {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-200',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-200',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={loading || disabled}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" size={18} /> : icon}
      {children}
    </button>
  );
}
