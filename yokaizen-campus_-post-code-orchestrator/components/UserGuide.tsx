import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ArrowLeft, BookOpen, Clock, Globe } from 'lucide-react';
import { Language } from '../types';
import { ARTICLES } from '../content/articles';

interface UserGuideProps {
    language: Language;
    onBack: () => void;
    setLanguage: (lang: Language) => void;
}

export const UserGuide: React.FC<UserGuideProps> = ({ language, onBack, setLanguage }) => {
    const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

    // Scroll to top when article changes
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [selectedArticleId]);

    const articles = ARTICLES[language] || ARTICLES[Language.EN];
    const selectedArticle = articles.find(a => a.id === selectedArticleId);

    return (
        <div className="min-h-screen bg-[#030712] text-white font-sans selection:bg-neon-blue selection:text-black">
            {/* Header */}
            <nav className="sticky top-0 w-full z-50 px-6 py-4 flex items-center justify-between backdrop-blur-md border-b border-white/5 bg-[#030712]/80">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => selectedArticleId ? setSelectedArticleId(null) : onBack()}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors group flex items-center gap-2"
                    >
                        <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        <span className="text-sm font-bold text-slate-400 group-hover:text-white hidden md:inline">
                            {selectedArticleId ? 'Back to Guide' : 'Home'}
                        </span>
                    </button>
                    <div className="h-6 w-px bg-white/20 mx-2"></div>
                    <div className="font-bold tracking-widest text-lg flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-neon-blue" />
                        YOKAIZEN <span className="text-slate-500 font-mono">GUIDE</span>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-xs font-bold text-slate-300">
                    <Globe className="w-3 h-3 text-purple-400" />
                    {language}
                </div>
            </nav>

            <main className="max-w-4xl mx-auto px-6 py-12">
                {!selectedArticle ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <header className="mb-16 text-center">
                            <div className="inline-flex items-center gap-2 bg-neon-blue/10 border border-neon-blue/30 px-3 py-1 rounded-full text-neon-blue text-xs font-bold uppercase tracking-wider mb-6">
                                Yokaizen Paradigm
                            </div>
                            <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">The Mental Dojo</h1>
                            <p className="text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                                Essays, documentation, and the philosophical framework behind the post-code generation.
                            </p>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {articles.map((article) => (
                                <article
                                    key={article.id}
                                    onClick={() => setSelectedArticleId(article.id)}
                                    className="group cursor-pointer bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden hover:border-purple-500/50 transition-all shadow-xl hover:-translate-y-1 flex flex-col"
                                >
                                    <div className="h-48 w-full overflow-hidden relative">
                                        <img
                                            src={article.image}
                                            alt={article.title}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent"></div>
                                    </div>
                                    <div className="p-6 flex flex-col flex-1">
                                        <div className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3">
                                            {article.category}
                                        </div>
                                        <h2 className="text-xl font-bold mb-3 leading-tight group-hover:text-neon-blue transition-colors">
                                            {article.title}
                                        </h2>
                                        <p className="text-slate-400 text-sm leading-relaxed mb-6 flex-1">
                                            {article.summary}
                                        </p>
                                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 mt-auto">
                                            <Clock className="w-3 h-3" /> 5 min read
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 max-w-3xl mx-auto">
                        <header className="mb-12 text-center">
                            <div className="text-sm font-bold text-neon-blue uppercase tracking-widest mb-4">
                                {selectedArticle.category}
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black mb-8 leading-tight text-balance">
                                {selectedArticle.title}
                            </h1>
                            <div className="w-full h-[400px] rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative mb-12">
                                <img
                                    src={selectedArticle.image}
                                    alt={selectedArticle.title}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-[#030712] to-transparent"></div>
                            </div>
                        </header>

                        <article className="prose prose-invert prose-lg max-w-none 
              prose-headings:font-black prose-headings:tracking-tight 
              prose-h1:text-3xl prose-h1:mb-6 prose-h1:text-white
              prose-h2:text-2xl prose-h2:mb-4 prose-h2:text-purple-400 prose-h2:mt-12
              prose-p:text-slate-300 prose-p:leading-relaxed prose-p:mb-6
              prose-strong:text-white prose-strong:font-bold
              prose-li:text-slate-300">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {selectedArticle.content}
                            </ReactMarkdown>
                        </article>

                        <footer className="mt-24 pt-8 border-t border-white/10 text-center">
                            <button
                                onClick={() => setSelectedArticleId(null)}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-sm font-bold transition-colors inline-flex items-center gap-2"
                            >
                                <ArrowLeft className="w-4 h-4" /> Back to Articles
                            </button>
                        </footer>
                    </div>
                )}
            </main>
        </div>
    );
};
