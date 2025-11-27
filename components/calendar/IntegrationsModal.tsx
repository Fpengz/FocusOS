import React, { useState } from 'react';
import { Project, TaskStatus, SubTask } from '../../types';
import { Globe, Mail, Cloud, X, Check, Loader2, Link as LinkIcon, Upload } from 'lucide-react';

interface IntegrationsModalProps {
    onClose: () => void;
    connectedApps: string[];
    setConnectedApps: React.Dispatch<React.SetStateAction<string[]>>;
    setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
    currentDate: Date;
    getStartOfWeek: (date: Date) => Date;
}

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ onClose, connectedApps, setConnectedApps, setProjects, currentDate, getStartOfWeek }) => {
    const [isConnecting, setIsConnecting] = useState<string | null>(null);

    const handleConnectProvider = (providerName: string, type: 'google' | 'outlook' | 'icloud') => {
        if (connectedApps.includes(providerName)) return;
        
        setIsConnecting(providerName);
        
        // Simulate API latency
        setTimeout(() => {
            setConnectedApps(prev => [...prev, providerName]);
            setIsConnecting(null);
            
            // Generate Mock Events relative to current week
            const startOfCurrentWeek = getStartOfWeek(currentDate);
            const mockEvents: SubTask[] = [];
            
            const createEvent = (dayOffset: number, hour: number, title: string, duration: number) => {
                const d = new Date(startOfCurrentWeek);
                d.setDate(d.getDate() + dayOffset);
                d.setHours(hour, 0, 0, 0);
                
                return {
                    id: crypto.randomUUID(),
                    title: title,
                    status: TaskStatus.TODO,
                    estimatedMinutes: duration,
                    scheduledDate: d.getTime(),
                    actualMinutes: 0
                };
            };
  
            if (type === 'google') {
                mockEvents.push(
                    createEvent(1, 10, 'Team Standup (GCal)', 30),
                    createEvent(3, 14, 'Product Review (GCal)', 60),
                    createEvent(4, 11, '1:1 Manager (GCal)', 45)
                );
            } else if (type === 'outlook') {
                mockEvents.push(
                    createEvent(1, 9, 'Weekly Sync (Outlook)', 60),
                    createEvent(2, 15, 'Client Call (Outlook)', 30),
                    createEvent(5, 10, 'All Hands (Outlook)', 60)
                );
            }
  
            if (mockEvents.length > 0) {
                const newProject: Project = {
                    id: `ext-${providerName.toLowerCase()}`,
                    title: `${providerName} (Primary)`,
                    description: 'External calendar integration',
                    subtasks: mockEvents,
                    createdAt: Date.now(),
                    status: TaskStatus.IN_PROGRESS,
                    chatHistory: [],
                    totalEstimatedMinutes: mockEvents.reduce((acc, t) => acc + t.estimatedMinutes, 0)
                };
                setProjects(prev => [...prev, newProject]);
            }
  
        }, 1500);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Connect Calendar</h3>
                    <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                </div>
                <div className="p-6 space-y-4">
                    {/* Google */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><Globe className="w-5 h-5 text-blue-600" /></div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">Google Calendar</div>
                                <div className="text-xs text-slate-500">Syncs events automatically</div>
                            </div>
                        </div>
                        <button 
                           onClick={() => handleConnectProvider('Google', 'google')}
                           disabled={connectedApps.includes('Google') || isConnecting === 'Google'}
                           className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${connectedApps.includes('Google') ? 'bg-green-100 text-green-700' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'}`}
                        >
                            {connectedApps.includes('Google') ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Connected</span> : isConnecting === 'Google' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                        </button>
                    </div>

                    {/* Outlook */}
                    <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><Mail className="w-5 h-5 text-sky-600" /></div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">Outlook</div>
                                <div className="text-xs text-slate-500">Work & Personal</div>
                            </div>
                        </div>
                        <button 
                           onClick={() => handleConnectProvider('Outlook', 'outlook')}
                           disabled={connectedApps.includes('Outlook') || isConnecting === 'Outlook'}
                           className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${connectedApps.includes('Outlook') ? 'bg-green-100 text-green-700' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:opacity-90'}`}
                        >
                            {connectedApps.includes('Outlook') ? <span className="flex items-center gap-1"><Check className="w-3 h-3" /> Connected</span> : isConnecting === 'Outlook' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect'}
                        </button>
                    </div>

                    {/* iCloud */}
                     <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 opacity-60 cursor-not-allowed">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm"><Cloud className="w-5 h-5 text-indigo-400" /></div>
                            <div>
                                <div className="font-bold text-slate-900 dark:text-slate-100">iCloud</div>
                                <div className="text-xs text-slate-500">Coming soon</div>
                            </div>
                        </div>
                        <span className="text-xs font-medium text-slate-400">Soon</span>
                    </div>

                    <div className="relative pt-4">
                        <div className="absolute inset-0 flex items-center" aria-hidden="true">
                          <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center">
                          <span className="px-2 bg-white dark:bg-slate-900 text-xs text-slate-500">Or subscribe via URL</span>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <input placeholder="https://calendar.google.com/..." className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-3 text-xs outline-none focus:border-indigo-500" />
                        <button className="px-3 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg text-xs font-bold hover:bg-slate-300 dark:hover:bg-slate-700">Add</button>
                    </div>
                </div>
            </div>
        </div>
    );
};