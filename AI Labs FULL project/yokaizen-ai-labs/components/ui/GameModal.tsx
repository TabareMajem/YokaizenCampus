import React, { useEffect, useState } from 'react';
import { X, AlertTriangle, CheckCircle, Info, Zap } from 'lucide-react';
import { Button } from './Button';

interface GameModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    autoClose?: number; // Auto close after ms
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
}

export const GameModal: React.FC<GameModalProps> = ({
    isOpen,
    onClose,
    title,
    message,
    type = 'info',
    autoClose,
    confirmText,
    cancelText,
    onConfirm
}) => {
    const [visible, setVisible] = useState(isOpen);

    useEffect(() => {
        setVisible(isOpen);
        if (isOpen && autoClose) {
            const timer = setTimeout(() => {
                setVisible(false);
                onClose();
            }, autoClose);
            return () => clearTimeout(timer);
        }
    }, [isOpen, autoClose, onClose]);

    if (!visible) return null;

    const icons = {
        success: <CheckCircle size={32} className="text-green-400" />,
        error: <AlertTriangle size={32} className="text-red-400" />,
        warning: <Zap size={32} className="text-yellow-400" />,
        info: <Info size={32} className="text-cyan-400" />,
    };

    const colors = {
        success: 'border-green-500/50 bg-green-950/50',
        error: 'border-red-500/50 bg-red-950/50',
        warning: 'border-yellow-500/50 bg-yellow-950/50',
        info: 'border-cyan-500/50 bg-cyan-950/50',
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className={`relative w-full max-w-sm rounded-2xl border-2 ${colors[type]} p-6 shadow-2xl animate-in zoom-in-95`}>
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                        {icons[type]}
                    </div>

                    {title && (
                        <h3 className="text-xl font-black text-white mb-2 uppercase tracking-wide">
                            {title}
                        </h3>
                    )}

                    <p className="text-sm text-gray-300 mb-6 font-mono">
                        {message}
                    </p>

                    <div className="flex space-x-3 w-full">
                        {cancelText && (
                            <Button
                                variant="ghost"
                                onClick={onClose}
                                className="flex-1"
                            >
                                {cancelText}
                            </Button>
                        )}
                        <Button
                            variant="primary"
                            onClick={() => {
                                onConfirm?.();
                                onClose();
                            }}
                            className="flex-1"
                        >
                            {confirmText || 'OK'}
                        </Button>
                    </div>
                </div>

                {/* Auto-close progress bar */}
                {autoClose && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800 rounded-b-2xl overflow-hidden">
                        <div
                            className={`h-full ${type === 'error' ? 'bg-red-500' : type === 'success' ? 'bg-green-500' : 'bg-cyan-500'} animate-shrink-x`}
                            style={{ animationDuration: `${autoClose}ms` }}
                        />
                    </div>
                )}
            </div>
        </div>
    );
};

// Hook for easier usage
export const useGameModal = () => {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        message: string;
        title?: string;
        type?: 'success' | 'error' | 'info' | 'warning';
        autoClose?: number;
        onConfirm?: () => void;
    }>({
        isOpen: false,
        message: '',
    });

    const showModal = (config: Omit<typeof modalState, 'isOpen'>) => {
        setModalState({ ...config, isOpen: true });
    };

    const hideModal = () => {
        setModalState(prev => ({ ...prev, isOpen: false }));
    };

    const ModalComponent = () => (
        <GameModal
            isOpen={modalState.isOpen}
            onClose={hideModal}
            message={modalState.message}
            title={modalState.title}
            type={modalState.type}
            autoClose={modalState.autoClose}
            onConfirm={modalState.onConfirm}
        />
    );

    return { showModal, hideModal, ModalComponent };
};

export default GameModal;
