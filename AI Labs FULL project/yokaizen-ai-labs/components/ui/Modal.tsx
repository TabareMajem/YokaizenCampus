
import React from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  type?: 'DEFAULT' | 'ALERT' | 'REWARD';
  icon?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, type = 'DEFAULT', icon }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className={`
        relative bg-void border border-white/10 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200
        ${type === 'REWARD' ? 'border-amber-500/50 shadow-[0_0_30px_rgba(245,158,11,0.2)]' : ''}
        ${type === 'ALERT' ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : ''}
      `}>
        {/* Decorative gradient */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-electric via-cyan to-electric"></div>

        <div className="p-6 text-center">
            {icon && (
                <div className="mb-4 flex justify-center">
                   <div className={`p-4 rounded-full bg-black/40 border ${
                       type === 'REWARD' ? 'border-amber-500 text-amber-500' : 
                       type === 'ALERT' ? 'border-red-500 text-red-500' : 'border-electric text-electric'
                   } shadow-lg`}>
                       {icon}
                   </div>
                </div>
            )}
            
            {title && (
                <h3 className={`text-xl font-black uppercase tracking-wide mb-2 ${
                    type === 'REWARD' ? 'text-amber-400' : 'text-white'
                }`}>
                    {title}
                </h3>
            )}
            
            <div className="text-gray-300 text-sm mb-6">
                {children}
            </div>

            <Button fullWidth variant={type === 'ALERT' ? 'danger' : 'primary'} onClick={onClose}>
                {type === 'REWARD' ? 'CLAIM' : 'ACKNOWLEDGE'}
            </Button>
        </div>
        
        {/* Close X */}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-white">
            <X size={20} />
        </button>
      </div>
    </div>
  );
};
