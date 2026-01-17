import React from 'react';

export const Button = ({ children, variant = 'primary', size = 'md', onClick, className = '', icon, disabled, type = 'button' }) => {
    const variants = {
        primary: 'bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-700 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/30',
        secondary: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700',
        outline: 'border-2 border-cyan-500 text-cyan-400 hover:bg-cyan-500 hover:text-slate-900',
        accent: 'bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold shadow-lg shadow-cyan-500/30',
        // Fallbacks
        yellow: 'bg-cyan-500 hover:bg-cyan-600 text-slate-900 font-bold shadow-lg shadow-cyan-500/30', // Mapped to accent
        danger: 'bg-red-500 hover:bg-red-600 text-white',
        success: 'bg-emerald-500 hover:bg-emerald-600 text-white'
    };

    const sizes = {
        sm: 'px-4 py-2 text-sm',
        md: 'px-6 py-3',
        lg: 'px-8 py-4 text-lg'
    };

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`${variants[variant] || variants.primary} ${sizes[size]} rounded-lg font-semibold transition-all transform hover:scale-105 flex items-center justify-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
        >
            {icon && icon}
            {children}
        </button>
    );
};

