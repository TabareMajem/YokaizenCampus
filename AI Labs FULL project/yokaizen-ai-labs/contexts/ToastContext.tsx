import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Zap, AlertTriangle, Sparkles, ArrowLeft } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
    showToast: (message: string, type: ToastType) => void;
    hideToast: () => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

    const showToast = (message: string, type: ToastType) => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const hideToast = () => setToast(null);

    return (
        <ToastContext.Provider value={{ showToast, hideToast }}>
            {children}
            {toast && (
                <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full border shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center gap-3 animate-in slide-in-from-top duration-300 ${toast.type === 'success' ? 'bg-green-900/90 border-green-500 text-green-100' :
                        toast.type === 'error' ? 'bg-red-900/90 border-red-500 text-red-100' :
                            'bg-blue-900/90 border-blue-500 text-blue-100'
                    }`}>
                    {toast.type === 'success' ? <Zap size={16} className="text-green-400" /> :
                        toast.type === 'error' ? <AlertTriangle size={16} className="text-red-400" /> :
                            <Sparkles size={16} className="text-blue-400" />}
                    <span className="text-sm font-bold tracking-wide">{toast.message}</span>
                    <button onClick={hideToast} className="ml-2 hover:text-white"><ArrowLeft size={14} className="rotate-180" /></button>
                </div>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error("useToast must be used within ToastProvider");
    return context;
};
