import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string; // Additional classes for sizing, margins, border-radius etc.
    type?: 'text' | 'title' | 'avatar' | 'card' | 'thumbnail';
    animate?: boolean;
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className = '',
    type = 'text',
    animate = true
}) => {

    const baseClasses = `relative overflow-hidden bg-white/5 border border-white/5 ${type === 'avatar' ? 'rounded-full' :
            type === 'card' ? 'rounded-xl' :
                'rounded-md'
        }`;

    const typeClasses = {
        text: 'h-4 w-full',
        title: 'h-8 w-3/4',
        avatar: 'h-12 w-12',
        card: 'h-48 w-full',
        thumbnail: 'h-24 w-24 rounded-lg'
    };

    return (
        <div className={`${baseClasses} ${typeClasses[type]} ${className}`}>
            {animate && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-[-20deg]"
                    initial={{ left: '-100%' }}
                    animate={{ left: '200%' }}
                    transition={{
                        repeat: Infinity,
                        duration: 1.5,
                        ease: 'easeInOut',
                    }}
                />
            )}

            {/* Cyberpunk accent lines behind the shimmer */}
            <div className="absolute top-0 left-0 w-full h-px bg-white/5"></div>
            <div className="absolute bottom-0 left-0 w-full h-px bg-white/5"></div>
        </div>
    );
};
