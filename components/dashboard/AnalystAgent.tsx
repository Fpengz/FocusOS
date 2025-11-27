
import React, { useState } from 'react';
import { FocusSession, AgentAnalysisResponse } from '../../types';
import { analyzeProductivityData } from '../../services/geminiService';
import { Sparkles, ArrowRight, Loader2 } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, LineChart, CartesianGrid, XAxis, YAxis, Line, BarChart, Bar } from 'recharts';
import { Markdown } from '../Markdown';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#3b82f6', '#10b981'];

export const AnalystAgent = ({ history }: { history: FocusSession[] }) => {
    const [query, setQuery] = useState('');
    const [analysis, setAnalysis] = useState<AgentAnalysisResponse | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (!query.trim()) return;
        setIsAnalyzing(true);
        setAnalysis(null);
        try {
            const result = await analyzeProductivityData(history, query);
            setAnalysis(result);
        } catch (e) {
            setAnalysis({ text: "Sorry, I encountered an issue analyzing your data." });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="relative p-[1px] rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 shadow-lg">
            <div className="bg-white dark:bg-slate-950 rounded-2xl p-6 h-full flex flex-col relative overflow-hidden">
                {/* Decorative BG */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10"></div>

                <div className="flex items-center gap-3 mb-6 relative z-10">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                        <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg leading-tight">AI Analyst</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Ask specifically about your trends</p>
                    </div>
                </div>

                <div className="relative mb-6 z-10">
                    <input 
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                        placeholder="e.g., 'How does Monday compare to Friday?'..."
                        className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl pl-4 pr-24 py-4 text-sm outline-none focus:ring-2 ring-indigo-500/20 focus:border-indigo-500 transition-all"
                    />
                    <button 
                        onClick={handleAnalyze}
                        disabled={isAnalyzing || !query}
                        className="absolute right-2 top-2 bottom-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 rounded-lg text-xs font-bold transition-colors disabled:opacity-70 flex items-center gap-2 shadow-md shadow-indigo-500/20"
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    </button>
                </div>

                {analysis && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 z-10">
                        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-5">
                            <div className="flex gap-3 mb-4">
                                <div className="w-1 self-stretch bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full"></div>
                                <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed py-1 w-full">
                                    <Markdown content={analysis.text} />
                                </div>
                            </div>

                            {analysis.chartData && analysis.chartData.length > 0 && (
                                <div className="mt-4 bg-white dark:bg-slate-950 rounded-lg p-4 border border-slate-200 dark:border-slate-800 shadow-sm">
                                    {analysis.chartTitle && (
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-4">{analysis.chartTitle}</h4>
                                    )}
                                    <div className="h-[200px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            {analysis.chartType === 'pie' ? (
                                                <PieChart>
                                                    <Pie 
                                                        data={analysis.chartData} 
                                                        dataKey="value" 
                                                        nameKey="name" 
                                                        cx="50%" 
                                                        cy="50%" 
                                                        innerRadius={40} 
                                                        outerRadius={70} 
                                                        paddingAngle={5}
                                                    >
                                                        {analysis.chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '12px' }}
                                                        itemStyle={{ color: '#f8fafc' }}
                                                    />
                                                </PieChart>
                                            ) : analysis.chartType === 'line' ? (
                                                <LineChart data={analysis.chartData}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                    <Tooltip 
                                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '12px' }}
                                                        cursor={{ stroke: '#6366f1', strokeWidth: 2 }}
                                                    />
                                                    <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={{r: 4, fill: '#8b5cf6', strokeWidth: 2, stroke: '#fff'}} activeDot={{r: 6}} />
                                                </LineChart>
                                            ) : (
                                                <BarChart data={analysis.chartData} barSize={20}>
                                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} dy={10} />
                                                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                                                    <Tooltip 
                                                        cursor={{ fill: '#334155', opacity: 0.1 }}
                                                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc', fontSize: '12px' }}
                                                    />
                                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]}>
                                                        {analysis.chartData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                        ))}
                                                    </Bar>
                                                </BarChart>
                                            )}
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
