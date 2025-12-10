
import React, { useState } from 'react';
import { X, CheckCircle, CreditCard, Lock, Sparkles, Loader2 } from 'lucide-react';
import { Language, SubscriptionTier, AIProvider } from '../types';
import { TERMS } from '../translations';
import { API } from '../services/api';

interface SubscriptionModalProps {
   isOpen: boolean;
   onClose: () => void;
   language: Language;
   onSuccess: () => void;
}

export const SubscriptionModal: React.FC<SubscriptionModalProps> = ({ isOpen, onClose, language, onSuccess }) => {
   const [loading, setLoading] = useState(false);
   const [success, setSuccess] = useState(false);
   const [error, setError] = useState('');
   const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'yearly'>('monthly');
   const T = TERMS[language].SUBSCRIPTION;

   if (!isOpen) return null;

   const handleSubscribe = async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');

      try {
         const productKey = selectedPlan === 'monthly' ? 'PRO_MONTHLY' : 'PRO_YEARLY';
         const successUrl = `${window.location.origin}?payment=success`;
         const cancelUrl = `${window.location.origin}?payment=cancel`;

         const result = await API.payment.createCheckout(productKey, successUrl, cancelUrl);

         // Redirect to Stripe Checkout
         if (result.url) {
            window.location.href = result.url;
         } else {
            throw new Error('Failed to create checkout session');
         }
      } catch (err: any) {
         console.error('Checkout error:', err);
         setError(err.message || 'Failed to start checkout. Please try again.');
         setLoading(false);
      }
   };

   const prices = {
      monthly: { amount: '$12', interval: '/month', savings: '' },
      yearly: { amount: '$99', interval: '/year', savings: 'Save 31%' }
   };

   return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 font-sans text-white">
         <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-black border border-slate-700 rounded-2xl shadow-2xl overflow-hidden relative">

            {/* Decorative Gradients */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-neon-purple/20 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-neon-blue/20 rounded-full blur-[100px] pointer-events-none" />

            <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
               <X className="w-5 h-5" />
            </button>

            <div className="p-8 relative z-10">
               <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-neon-blue to-neon-purple rounded-xl flex items-center justify-center mb-4 shadow-lg">
                     <Sparkles className="w-8 h-8 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold">{T.TITLE}</h2>
                  <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                     {T.DESC}
                  </p>
               </div>

               {success ? (
                  <div className="py-12 flex flex-col items-center animate-in zoom-in">
                     <CheckCircle className="w-16 h-16 text-emerald-500 mb-4" />
                     <div className="text-xl font-bold text-emerald-500">{T.SUCCESS}</div>
                  </div>
               ) : (
                  <>
                     {/* Plan Selection */}
                     <div className="grid grid-cols-2 gap-3 mb-6">
                        <button
                           type="button"
                           onClick={() => setSelectedPlan('monthly')}
                           className={`p-4 rounded-xl border-2 transition-all ${selectedPlan === 'monthly'
                                 ? 'border-neon-blue bg-neon-blue/10'
                                 : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                              }`}
                        >
                           <div className="text-xs uppercase font-bold text-slate-400">Monthly</div>
                           <div className="text-2xl font-bold mt-1">{prices.monthly.amount}</div>
                           <div className="text-xs text-slate-500">{prices.monthly.interval}</div>
                        </button>
                        <button
                           type="button"
                           onClick={() => setSelectedPlan('yearly')}
                           className={`p-4 rounded-xl border-2 transition-all relative ${selectedPlan === 'yearly'
                                 ? 'border-neon-purple bg-neon-purple/10'
                                 : 'border-slate-700 bg-slate-900/50 hover:border-slate-500'
                              }`}
                        >
                           {prices.yearly.savings && (
                              <div className="absolute -top-2 -right-2 bg-emerald-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full">
                                 {prices.yearly.savings}
                              </div>
                           )}
                           <div className="text-xs uppercase font-bold text-slate-400">Yearly</div>
                           <div className="text-2xl font-bold mt-1">{prices.yearly.amount}</div>
                           <div className="text-xs text-slate-500">{prices.yearly.interval}</div>
                        </button>
                     </div>

                     <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
                        <ul className="space-y-3">
                           {T.FEATURES.map((feat: string, i: number) => (
                              <li key={i} className="flex items-center gap-2 text-sm text-slate-300">
                                 <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {feat}
                              </li>
                           ))}
                        </ul>
                     </div>

                     {error && (
                        <div className="mb-4 p-3 bg-rose-900/20 border border-rose-500/50 rounded-lg text-rose-400 text-sm">
                           {error}
                        </div>
                     )}

                     <form onSubmit={handleSubscribe}>
                        <button
                           type="submit"
                           disabled={loading}
                           className="w-full py-4 bg-white hover:bg-slate-200 text-black font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                        >
                           {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                           {loading ? T.PROCESSING : `${T.BTN_PAY} ${selectedPlan === 'monthly' ? prices.monthly.amount : prices.yearly.amount}`}
                        </button>

                        <div className="text-center mt-4">
                           <span className="text-[10px] text-slate-600 flex items-center justify-center gap-1">
                              <Lock className="w-3 h-3" /> Secured by Stripe
                           </span>
                        </div>
                     </form>
                  </>
               )}
            </div>
         </div>
      </div>
   );
};