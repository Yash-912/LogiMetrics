import React from 'react';

export const Card = ({ children, className = '', gradient = false }) => {
    const baseClass = gradient ? 'bg-gradient-to-br from-slate-900 to-blue-900/40' : 'bg-slate-900/60';
    return (
        <div className={`${baseClass} backdrop-blur-xl rounded-2xl p-6 border border-slate-800 hover:border-cyan-500/50 hover:shadow-[0_0_15px_rgba(56,189,248,0.1)] transition-all duration-300 ${className}`}>
            {children}
        </div>
    );
};
