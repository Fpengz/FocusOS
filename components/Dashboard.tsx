
import React, { useState, useMemo, useRef } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LineChart, Line, CartesianGrid, BarChart, Bar, Legend } from 'recharts';
import { FocusSession, AgentAnalysisResponse } from '../types';
import { analyzeProductivityData } from '../services/geminiService';
import { LayoutDashboard, TrendingUp, AlertTriangle, Clock, Sparkles, Loader2, Filter, Calendar, ArrowRight, ChevronDown } from 'lucide-react';

// --- Types ---
interface DashboardProps {
  history: FocusSession[];
}

type DateRange = '7D' | 'MONTH' | 'YEAR' | 'CUSTOM';

const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#3b82f6', '#10b981'];

// --- Helper Components ---

interface DashboardCardProps {
    children: React.ReactNode;
    className?: string;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ children, className = "" }) => {
    const divRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [opacity, setOpacity] = useState(0);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!divRef.current) return;
        const rect = divRef.current.getBoundingClientRect();
        setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };

    const handleMouseEnter = () => {
        setOpacity(1);
    };

    const handleMouseLeave = () => {
        setOpacity(0);
    };

    return (
        <div 
            ref={divRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            className={`relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden group ${className}`}
        >
             {/* Flashlight Background */}
             <div 
                className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 z-0"
                style={{
                    opacity,
                    background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(99, 102, 241, 0.06), transparent 40%)`
                }}
             />
             
             {/* Flashlight Border Effect */}
             <div 
                className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition duration-300 z-10"
                style={{
                     opacity,
                     background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, rgba(99, 102, 241, 0.4), transparent 40%)`,
                     maskImage: 'linear-gradient(black, black), linear-gradient(black, black)',
                     maskClip: 'content-box, border-box',
                     padding: '1px',
                     maskComposite: 'exclude',
                     WebkitMaskComposite: 'xor'
                }}
             />

             <div className="relative z-20 h-full">
                {children}
             </div>
        </div>
    );
};

const StatsCard = ({ icon: Icon, title, value, subtitle, colorClass }: { icon: any, title: string, value: string, subtitle?: any, colorClass: string }) => (
    <DashboardCard className="p-6 flex flex-col justify-between h-full relative overflow-hidden group">
        <div className={`absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity ${colorClass.replace('bg-', 'text-')}`}>
            <Icon className="w-16 h-16 transform rotate-12 translate-x-4 -translate-y-4" />
        </div>
        <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20`}>
                    <Icon className={`w-5 h-5 ${colorClass.replace('bg-', 'text-')}`} />
                </div>
                <h3 className="text-slate-500 dark:text-slate-400 font-bold text-xs uppercase tracking-wider">{title}</h3>
            </div>
            <div>
                <p className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{value}</p>
                {subtitle && <div className="mt-3">{subtitle}</div>}
            </div>
        </div>
    </DashboardCard>
);

// --- Sub-Component: Analyst Agent ---
const AnalystAgent = ({ history }: { history: FocusSession[] }) => {
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
                                <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed py-1">
                                    {analysis.text}
                                </p>
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

// --- Main Component ---
const Dashboard: React.FC<DashboardProps> = ({ history }) => {
  const [range, setRange] = useState<DateRange>('7D');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  
  // Filter Logic
  const filteredHistory = useMemo(() => {
    const now = new Date();
    let startTime = 0;
    let endTime = now.getTime();

    if (range === '7D') {
        const d = new Date();
        d.setDate(d.getDate() - 6);
        d.setHours(0, 0, 0, 0);
        startTime = d.getTime();
    } else if (range === 'MONTH') {
        startTime = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else if (range === 'YEAR') {
        startTime = new Date(now.getFullYear(), 0, 1).getTime();
    } else if (range === 'CUSTOM') {
        if (!customStart) {
             // If no date selected, return empty or all? Returning empty for safety until selection
             return [] as FocusSession[];
        }
        // Parse YYYY-MM-DD to Local Time Midnight
        const parts = customStart.split('-').map(p => parseInt(p, 10));
        
        const y = parts[0] || 0;
        const m = parts[1] || 1;
        const d = parts[2] || 1;

        // Use default values to prevent "undefined" or arithmetic errors on m
        // Ensure m is treated as number for arithmetic
        const monthIndex = m - 1;
        const s = new Date(y, monthIndex, d);
        s.setHours(0,0,0,0);
        startTime = s.getTime();
        
        if (customEnd) {
            const endParts = customEnd.split('-').map(p => parseInt(p, 10));
            const ey = endParts[0] || 0;
            const em = endParts[1] || 1;
            const ed = endParts[2] || 1;
            const endMonthIndex = em - 1;
            const e = new Date(ey, endMonthIndex, ed);
            e.setHours(23, 59, 59, 999);
            endTime = e.getTime();
        } else {
             // If no end date, assume just the start day
             const e = new Date(s);
             e.setHours(23, 59, 59, 999);
             endTime = e.getTime();
        }
    }
    
    return history
        .filter(h => h.startTime >= startTime && h.startTime <= endTime)
        .sort((a, b) => Number(a.startTime || 0) - Number(b.startTime || 0));
  }, [history, range, customStart, customEnd]);

  // Calculate Metrics
  const totalFocusTime = filteredHistory.reduce((acc, curr) => acc + (curr.actualDurationMinutes || 0), 0);
  const hours = Math.floor(totalFocusTime / 60);
  const minutes = totalFocusTime % 60;
  
  const totalSessions = filteredHistory.length;
  const completedSessions = filteredHistory.filter(h => h.completed).length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  
  // Distractions
  const distractionCounts = filteredHistory
    .filter(h => !h.completed && h.interruptionReason)
    .reduce<Record<string, number>>((acc, curr) => {
        const r = curr.interruptionReason || 'Unknown';
        acc[r] = (acc[r] || 0) + 1;
        return acc;
    }, {});
    
  const topDistraction = Object.entries(distractionCounts).sort((a, b) => b[1] - a[1])[0];
  const distractionChartData = Object.entries(distractionCounts).map(([name, value]) => ({ name, value }));

  // Charts Data Preparation
  const efficiencyData = useMemo(() => {
      const dataMap = new Map<string, number>();

      // Helper to generate a sortable, unique key (YYYY-MM-DD or YYYY-MM) based on local time
      const getKey = (date: Date) => {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          if (range === 'YEAR') {
              return `${y}-${m}`;
          }
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
      };

      // Helper to generate display label
      const getLabel = (key: string) => {
          const parts = key.split('-').map((p) => parseInt(p, 10));
          const y = parts[0] || 0;
          const mRaw = parts[1] || 1;
          const m = mRaw - 1;
          const d = parts[2] || 1;
          const date = new Date(y, m, d);

          if (range === 'YEAR') return date.toLocaleDateString('en-US', { month: 'short' });
          // For Custom/Month/7D, show Day
          return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      };

      // 1. Prefill
      if (range === '7D') {
          for (let i = 6; i >= 0; i--) {
              const d = new Date();
              d.setDate(d.getDate() - i);
              dataMap.set(getKey(d), 0);
          }
      } else if (range === 'YEAR') {
          const year = new Date().getFullYear();
          for (let i = 0; i < 12; i++) {
              const m = String(i + 1).padStart(2, '0');
              dataMap.set(`${year}-${m}`, 0);
          }
      } else if (range === 'CUSTOM' && customStart && customEnd) {
          // Optional: Prefill days in custom range if span < 31 days?
          // For now, let's just show actual data points to avoid huge loops if user selects 10 years
      }

      // 2. Aggregate
      filteredHistory.forEach(h => {
          const d = new Date(h.startTime);
          const key = getKey(d);
          const currentVal = dataMap.get(key) || 0;
          const duration = h.actualDurationMinutes || 0;
          dataMap.set(key, currentVal + duration);
      });

      // 3. Sort & Map (Sort by Key YYYY-MM-DD string to ensure Chronological order)
      return Array.from(dataMap.keys()).sort().map(key => ({
          name: getLabel(key),
          value: dataMap.get(key) || 0
      }));
  }, [filteredHistory, range, customStart, customEnd]);


  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      
      {/* Header & Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
          <div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
                  <LayoutDashboard className="w-8 h-8 md:w-10 md:h-10 text-indigo-600 dark:text-indigo-500" />
                  Performance
              </h1>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">Track your focus metrics and reclaim your time.</p>
          </div>

          <div className="flex flex-col items-end gap-3 w-full lg:w-auto">
              <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm w-full lg:w-auto overflow-x-auto">
                  {(['7D', 'MONTH', 'YEAR', 'CUSTOM'] as DateRange[]).map(r => (
                      <button 
                        key={r}
                        onClick={() => setRange(r)}
                        className={`flex-1 lg:flex-none px-4 py-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${
                            range === r 
                            ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 shadow-sm ring-1 ring-indigo-200 dark:ring-indigo-800' 
                            : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                          {r === '7D' ? 'Last 7 Days' : r === 'MONTH' ? 'This Month' : r === 'YEAR' ? 'This Year' : 'Custom Range'}
                      </button>
                  ))}
              </div>
              
              {range === 'CUSTOM' && (
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm animate-in slide-in-from-top-2">
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                            type="date" 
                            value={customStart} 
                            onChange={e => setCustomStart(e.target.value)} 
                            className="pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs outline-none text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500" 
                        />
                      </div>
                      <span className="text-slate-400 text-xs font-medium">to</span>
                      <div className="relative">
                        <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input 
                            type="date" 
                            value={customEnd} 
                            onChange={e => setCustomEnd(e.target.value)} 
                            className="pl-8 pr-2 py-1.5 bg-slate-50 dark:bg-slate-800 text-xs outline-none text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg focus:border-indigo-500" 
                        />
                      </div>
                  </div>
              )}
          </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <StatsCard 
            icon={Clock} title="Total Focus Time" colorClass="text-blue-500 bg-blue-500"
            value={`${hours}h ${minutes}m`} 
            subtitle={<span className="text-xs font-medium text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">{totalSessions} sessions</span>}
          />
          <StatsCard 
            icon={TrendingUp} title="Completion Rate" colorClass="text-emerald-500 bg-emerald-500"
            value={`${completionRate}%`}
            subtitle={
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 mt-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full transition-all duration-1000 rounded-full" style={{ width: `${completionRate}%` }}></div>
                </div>
            }
          />
          <StatsCard 
            icon={AlertTriangle} title="Primary Distraction" colorClass="text-orange-500 bg-orange-500"
            value={topDistraction ? topDistraction[0] : 'None'}
            subtitle={
                <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    {topDistraction ? <><span className="font-bold text-orange-500">{topDistraction[1]}</span> interruptions recorded</> : 'No distractions logged!'}
                </span>
            }
          />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Charts */}
          <div className="lg:col-span-2 space-y-6">
              {/* Focus Trend Chart (Area Chart) */}
              <DashboardCard className="p-6">
                  <div className="flex justify-between items-center mb-8">
                      <div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Focus Trends</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Daily minutes over selected period</p>
                      </div>
                      <div className="flex items-center gap-2 text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg">
                          <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                          Focus Time
                      </div>
                  </div>
                  <div className="h-[320px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={efficiencyData}>
                              <defs>
                                <linearGradient id="colorFocus" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.1} vertical={false} />
                              <XAxis 
                                dataKey="name" 
                                stroke="#94a3b8" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                                dy={10} 
                                minTickGap={30}
                              />
                              <YAxis 
                                stroke="#94a3b8" 
                                fontSize={11} 
                                tickLine={false} 
                                axisLine={false} 
                                dx={-10}
                              />
                              <Tooltip 
                                cursor={{ stroke: '#6366f1', strokeWidth: 1, strokeDasharray: '5 5' }}
                                contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', border: 'none', color: '#f8fafc', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }}
                              />
                              <Area 
                                type="monotone" 
                                dataKey="value" 
                                stroke="#6366f1" 
                                strokeWidth={3}
                                fillOpacity={1} 
                                fill="url(#colorFocus)" 
                                animationDuration={1500}
                              />
                          </AreaChart>
                      </ResponsiveContainer>
                  </div>
              </DashboardCard>

              {/* Distractions Pie */}
              <DashboardCard className="p-6">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Distraction Breakdown</h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Causes of session interruptions</p>
                      </div>
                  </div>
                  <div className="h-[300px] w-full flex items-center justify-center">
                      {distractionChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                  <Pie 
                                    data={distractionChartData} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    innerRadius={80} 
                                    outerRadius={110} 
                                    paddingAngle={4}
                                    cornerRadius={4}
                                  >
                                      {distractionChartData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} strokeWidth={0} />
                                      ))}
                                  </Pie>
                                  <Tooltip 
                                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#f8fafc' }}
                                    itemStyle={{ color: '#f8fafc' }}
                                  />
                                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                              </PieChart>
                          </ResponsiveContainer>
                      ) : (
                          <div className="text-center text-slate-400 py-10">
                              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Sparkles className="w-8 h-8 text-indigo-300" />
                              </div>
                              <p className="font-medium">No distractions recorded.</p>
                              <p className="text-xs mt-1">You are in flow state!</p>
                          </div>
                      )}
                  </div>
              </DashboardCard>
          </div>

          {/* Right Column: Agent */}
          <div className="lg:col-span-1">
              <div className="sticky top-6">
                  <AnalystAgent history={filteredHistory} />
              </div>
          </div>

      </div>
    </div>
  );
};

export default Dashboard;
