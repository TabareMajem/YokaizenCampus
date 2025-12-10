
import React, { useState, useRef } from 'react';
import { Button } from '../ui/Button';
import { analyzeImage } from '../../services/geminiService';
import { Eye, Upload, Scan, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { TRANSLATIONS } from '../../translations';
import { Language } from '../../types';

export const VisionEye: React.FC = () => {
    const { user } = useAuth();
    const lang: Language = user?.language || 'EN';
    const t = (key: string) => TRANSLATIONS[lang]?.[key] || TRANSLATIONS['EN']?.[key] || key;

    const [image, setImage] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<{ description: string, tags: string[] } | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setAnalysis(null);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setIsAnalyzing(true);
        const result = await analyzeImage(image);
        setAnalysis(result);
        setIsAnalyzing(false);
    };

    return (
        <div className="h-full flex flex-col p-6 bg-gray-900/50">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
                <Eye className="mr-2 text-cyan" /> {t('tool.VISION_EYE.name')}
            </h2>

            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
                {image ? (
                    <div className="relative w-full max-w-sm rounded-xl overflow-hidden border border-cyan/30 shadow-[0_0_20px_rgba(0,255,255,0.1)]">
                        <img src={image} className="w-full h-auto object-cover" alt="Analysis Target" />
                        {isAnalyzing && (
                            <div className="absolute inset-0 bg-cyan/10 animate-pulse flex items-center justify-center">
                                <div className="w-full h-1 bg-cyan absolute top-0 animate-scan"></div>
                                <Scan size={48} className="text-cyan animate-spin-slow" />
                            </div>
                        )}
                        <button 
                            onClick={() => { setImage(null); setAnalysis(null); }}
                            className="absolute top-2 right-2 bg-black/50 rounded-full p-1 text-white hover:bg-red-500"
                        >
                            <X size={16} />
                        </button>
                    </div>
                ) : (
                    <div 
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full max-w-sm aspect-video border-2 border-dashed border-gray-700 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-cyan hover:bg-white/5 transition-colors"
                    >
                        <Upload className="text-gray-500 mb-2" size={32} />
                        <span className="text-gray-500 text-xs">{t('vision.upload_prompt')}</span>
                    </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" />
            </div>

            {analysis && (
                <div className="mt-6 bg-black/60 border border-white/10 p-4 rounded-xl animate-in slide-in-from-bottom">
                    <div className="text-xs text-cyan font-mono uppercase mb-2">{t('vision.result')}</div>
                    <p className="text-sm text-gray-300 mb-3">{analysis.description}</p>
                    <div className="flex flex-wrap gap-2">
                        {analysis.tags.map((tag, i) => (
                            <span key={i} className="text-[10px] bg-cyan/20 text-cyan px-2 py-1 rounded border border-cyan/30">
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="mt-4">
                <Button fullWidth variant="primary" onClick={handleAnalyze} disabled={!image || isAnalyzing}>
                    {isAnalyzing ? t('vision.analyzing') : t('vision.scan_btn')}
                </Button>
            </div>
        </div>
    );
};
