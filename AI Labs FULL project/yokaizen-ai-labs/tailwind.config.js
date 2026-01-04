/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./App.tsx",
        "./index.tsx",
        "./components/**/*.{js,ts,jsx,tsx}",
        "./contexts/**/*.{js,ts,jsx,tsx}",
        "./services/**/*.{js,ts,jsx,tsx}",
        "./*.{js,ts,jsx,tsx}"
    ],
    theme: {
        extend: {
            colors: {
                void: '#020204',
                glass: 'rgba(255, 255, 255, 0.05)',
                'glass-border': 'rgba(255, 255, 255, 0.1)',
                electric: '#C45FFF',
                cyan: '#00FFFF',
                amber: '#F59E0B',
                danger: '#EF4444',
                success: '#10B981',
                metal: '#1C1C22'
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            animation: {
                'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                'float': 'float 6s ease-in-out infinite',
                'glow': 'glow 2s ease-in-out infinite alternate',
                'shake': 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both',
                'scan': 'scan 4s linear infinite',
                'float-fast': 'float 3s ease-in-out infinite',
                'spin-slow': 'spin 8s linear infinite',
                'fall': 'fall 2s linear infinite',
                'shine': 'shine 3s linear infinite',
                'flash': 'flash 0.5s ease-out',
                'grid-flow': 'gridFlow 2s linear infinite',
                'glitch-1': 'glitch1 2.5s infinite',
                'glitch-2': 'glitch2 3s infinite',
                'check-pop': 'checkPop 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards',
            },
            keyframes: {
                checkPop: {
                    '0%': { transform: 'scale(0)', opacity: '0' },
                    '50%': { transform: 'scale(1.2)' },
                    '100%': { transform: 'scale(1)', opacity: '1' }
                },
                float: {
                    '0%, 100%': { transform: 'translateY(0)' },
                    '50%': { transform: 'translateY(-10px)' },
                },
                glow: {
                    'from': { boxShadow: '0 0 10px -5px #C45FFF' },
                    'to': { boxShadow: '0 0 20px 5px #C45FFF' },
                },
                shake: {
                    '10%, 90%': { transform: 'translate3d(-1px, 0, 0)' },
                    '20%, 80%': { transform: 'translate3d(2px, 0, 0)' },
                    '30%, 50%, 70%': { transform: 'translate3d(-4px, 0, 0)' },
                    '40%, 60%': { transform: 'translate3d(4px, 0, 0)' }
                },
                scan: {
                    '0%': { top: '-10%' },
                    '100%': { top: '110%' }
                },
                fall: {
                    '0%': { transform: 'translateY(-100%)' },
                    '100%': { transform: 'translateY(100vh)' }
                },
                shine: {
                    '0%': { backgroundPosition: '200% center' },
                    '100%': { backgroundPosition: '-200% center' }
                },
                flash: {
                    '0%': { opacity: '1' },
                    '100%': { opacity: '0' }
                },
                gridFlow: {
                    '0%': { backgroundPosition: '0 0' },
                    '100%': { backgroundPosition: '0 40px' }
                },
                glitch1: {
                    '0%': { transform: 'none', opacity: '1' },
                    '7%': { transform: 'skew(-0.5deg, -0.9deg)', opacity: '0.75' },
                    '10%': { transform: 'none', opacity: '1' },
                    '27%': { transform: 'none', opacity: '1' },
                    '30%': { transform: 'skew(0.8deg, -0.1deg)', opacity: '0.75' },
                    '35%': { transform: 'none', opacity: '1' },
                    '52%': { transform: 'none', opacity: '1' },
                    '55%': { transform: 'skew(-1deg, 0.2deg)', opacity: '0.75' },
                    '50%': { transform: 'none', opacity: '1' },
                    '72%': { transform: 'none', opacity: '1' },
                    '75%': { transform: 'skew(0.4deg, 1deg)', opacity: '0.75' },
                    '80%': { transform: 'none', opacity: '1' },
                    '100%': { transform: 'none', opacity: '1' }
                },
                glitch2: {
                    '0%': { transform: 'none', opacity: '1' },
                    '7%': { transform: 'translate(-2px, 3px)', opacity: '0.75' },
                    '10%': { transform: 'none', opacity: '1' },
                    '27%': { transform: 'none', opacity: '1' },
                    '30%': { transform: 'translate(2px, -3px)', opacity: '0.75' },
                    '35%': { transform: 'none', opacity: '1' },
                    '52%': { transform: 'none', opacity: '1' },
                    '55%': { transform: 'translate(-1px, 1px)', opacity: '0.75' },
                    '50%': { transform: 'none', opacity: '1' },
                    '72%': { transform: 'none', opacity: '1' },
                    '75%': { transform: 'translate(2px, -6px)', opacity: '0.75' },
                    '80%': { transform: 'none', opacity: '1' },
                    '100%': { transform: 'none', opacity: '1' }
                }
            }
        },
    },
    plugins: [
        require("tailwindcss-animate"),
    ],
}
