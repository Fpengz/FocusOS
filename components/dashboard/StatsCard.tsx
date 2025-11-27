import React from 'react';

interface DashboardCardProps {
    children: React.ReactNode;
    className?: string;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({ children, className = "" }) => (
    <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-300 ${className}`}>
        {children}
    </div>
);

export const StatsCard = ({ icon: Icon, title, value, subtitle, colorClass }: { icon: any, title: string, value: string, subtitle?: any, colorClass: string }) => (
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