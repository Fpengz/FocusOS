
import React, { useState, useMemo } from 'react';
import { Project, SubTask, TaskStatus, Priority } from '../types';
import { 
    Plus, Play, CheckCircle2, Circle, Clock, Calendar as CalendarIcon, 
    ChevronRight, ChevronDown, Flag, Layout, Kanban, List as ListIcon, 
    Inbox, CalendarDays, Layers, MoreHorizontal, Hash, Search, Filter,
    GripVertical, Trash2, PieChart, Sparkles, Loader2
} from 'lucide-react';
import ProjectWizard from './planner/ProjectWizard';
import { suggestSubtasks } from '../services/geminiService';

interface PlannerProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onStartFocus: (project: Project, subtask?: SubTask) => void;
}

type FilterType = 'INBOX' | 'TODAY' | 'UPCOMING' | string; // string is Project ID
type ViewType = 'LIST' | 'BOARD';

// --- Helper Functions ---

const recursiveUpdate = (tasks: SubTask[], targetId: string, updater: (t: SubTask) => SubTask): SubTask[] => {
    return tasks.map(t => {
        if (t.id === targetId) return updater(t);
        if (t.subtasks && t.subtasks.length > 0) {
            return { ...t, subtasks: recursiveUpdate(t.subtasks, targetId, updater) };
        }
        return t;
    });
};

const getPriorityColor = (p?: Priority) => {
    switch(p) {
        case 'P1': return 'text-red-500 fill-red-500/10';
        case 'P2': return 'text-orange-500 fill-orange-500/10';
        case 'P3': return 'text-blue-500 fill-blue-500/10';
        case 'P4': default: return 'text-slate-400 dark:text-slate-500';
    }
};

const getPriorityFlag = (p?: Priority) => {
    switch(p) {
        case 'P1': return <Flag className="w-3.5 h-3.5 fill-current" />;
        case 'P2': return <Flag className="w-3.5 h-3.5 fill-current" />;
        case 'P3': return <Flag className="w-3.5 h-3.5 fill-current" />;
        default: return <Flag className="w-3.5 h-3.5" />;
    }
};

const calculateProjectStats = (subtasks: SubTask[]) => {
    let total = 0;
    let completed = 0;
    let totalMinutes = 0;
    let completedMinutes = 0;

    const traverse = (tasks: SubTask[]) => {
        tasks.forEach(t => {
            // Only count leaf nodes for progress to avoid double counting
            if (!t.subtasks || t.subtasks.length === 0) {
                total++;
                totalMinutes += t.estimatedMinutes || 0;
                if (t.status === TaskStatus.COMPLETED) {
                    completed++;
                    completedMinutes += t.estimatedMinutes || 0;
                }
            }
            if (t.subtasks && t.subtasks.length > 0) traverse(t.subtasks);
        });
    };
    traverse(subtasks);
    
    return {
        total,
        completed,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        totalHours: Math.round(totalMinutes / 60 * 10) / 10,
        completedHours: Math.round(completedMinutes / 60 * 10) / 10
    };
};

// --- Sub-Component: Task Item (Todoist Style Row) ---

interface TaskItemProps {
    task: SubTask;
    projectTitle?: string;
    onToggle: () => void;
    onFocus: () => void;
    onUpdate: (updates: Partial<SubTask>) => void;
    onDelete: () => void;
    onIterate: () => void;
    isIterating?: boolean;
    depth?: number;
    hasChildren?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, projectTitle, onToggle, onFocus, onUpdate, onDelete, onIterate, isIterating, depth = 0, hasChildren, isExpanded, onToggleExpand }) => {
    const [isHovered, setIsHovered] = useState(false);

    return (
        <div 
            className="group relative flex items-center gap-2 py-2.5 px-3 border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
            style={{ paddingLeft: `${(depth * 24) + 12}px` }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Drag Handle (Visual) */}
            <div className={`absolute left-1 text-slate-300 dark:text-slate-600 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity`}>
                 <GripVertical className="w-3 h-3" />
            </div>

            {/* Expand Arrow */}
            <button 
                onClick={(e) => { e.stopPropagation(); onToggleExpand?.(); }}
                className={`p-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 transition-opacity ${hasChildren ? 'opacity-100' : 'opacity-0'}`}
            >
                <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? '' : '-rotate-90'}`} />
            </button>

            {/* Checkbox */}
            <button 
                onClick={(e) => { e.stopPropagation(); onToggle(); }}
                className={`flex-shrink-0 transition-all ${task.status === TaskStatus.COMPLETED ? 'text-emerald-500' : getPriorityColor(task.priority)}`}
            >
                {task.status === TaskStatus.COMPLETED ? (
                    <CheckCircle2 className="w-5 h-5 fill-emerald-500/20" />
                ) : (
                    <Circle className="w-5 h-5 hover:fill-current transition-colors" />
                )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-center gap-2">
                    <span className={`text-sm truncate font-medium ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                        {task.title}
                    </span>
                    {projectTitle && (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 opacity-60 flex-shrink-0">
                            #{projectTitle}
                        </span>
                    )}
                </div>
                
                {/* Metadata Row */}
                <div className="flex items-center gap-3 mt-0.5 h-4">
                    {task.estimatedMinutes > 0 && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                            <Clock className="w-3 h-3" /> {task.estimatedMinutes}m
                        </div>
                    )}
                    {task.scheduledDate && (
                        <div className={`flex items-center gap-1 text-[10px] ${new Date(task.scheduledDate).setHours(0,0,0,0) === new Date().setHours(0,0,0,0) ? 'text-green-600 dark:text-green-400' : 'text-slate-500'}`}>
                            <CalendarIcon className="w-3 h-3" />
                            {new Date(task.scheduledDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                    )}
                    {task.tags && task.tags.map(tag => (
                        <div key={tag} className="text-[10px] text-indigo-500 dark:text-indigo-400 flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" /> {tag}
                        </div>
                    ))}
                </div>
            </div>

            {/* Actions (Hover) */}
            <div className={`flex items-center gap-1 transition-opacity ${isHovered || isIterating ? 'opacity-100' : 'opacity-0'}`}>
                {/* Iteration Button (AI Breakdown) */}
                <button 
                    onClick={(e) => { e.stopPropagation(); onIterate(); }} 
                    disabled={isIterating || task.status === TaskStatus.COMPLETED}
                    className={`p-1.5 rounded-md transition-all ${isIterating ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 animate-pulse' : 'text-slate-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20'}`} 
                    title="AI Breakdown (Iterate)"
                >
                    {isIterating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>

                <button onClick={(e) => { e.stopPropagation(); onFocus(); }} className="p-1.5 text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 rounded-md" title="Focus">
                    <Play className="w-3.5 h-3.5 fill-current" />
                </button>
                
                <div className="relative group/prio">
                    <button className={`p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 ${getPriorityColor(task.priority)}`}>
                        {getPriorityFlag(task.priority)}
                    </button>
                    {/* Priority Picker */}
                    <div className="absolute right-0 top-full mt-1 hidden group-hover/prio:flex flex-col bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 rounded-lg p-1 z-50 min-w-[80px]">
                        {(['P1', 'P2', 'P3', 'P4'] as Priority[]).map(p => (
                            <button 
                                key={p} 
                                onClick={() => onUpdate({ priority: p })}
                                className={`flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-slate-100 dark:hover:bg-slate-800 rounded ${getPriorityColor(p)}`}
                            >
                                {getPriorityFlag(p)} {p}
                            </button>
                        ))}
                    </div>
                </div>

                <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md">
                    <Trash2 className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

// --- Sub-Component: Board Column (ClickUp Style) ---

const BoardColumn = ({ title, tasks, status, onUpdateStatus, onStartFocus }: { title: string, tasks: { task: SubTask, project: Project }[], status: TaskStatus, onUpdateStatus: (projectId: string, taskId: string, status: TaskStatus) => void, onStartFocus: (p: Project, t: SubTask) => void }) => {
    return (
        <div className="flex-shrink-0 w-80 flex flex-col h-full mr-4">
            <div className={`mb-3 pb-2 border-b-2 flex justify-between items-center
                ${status === TaskStatus.TODO ? 'border-slate-300 dark:border-slate-700' : status === TaskStatus.IN_PROGRESS ? 'border-indigo-500' : 'border-emerald-500'}
            `}>
                <span className="font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</span>
                <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-2 py-0.5 rounded text-[10px] font-bold">{tasks.length}</span>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pb-10">
                {tasks.map(({ task, project }) => (
                    <div key={task.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all group cursor-default">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium truncate max-w-[120px]">
                                {project.title}
                            </span>
                            <div className={getPriorityColor(task.priority)}>
                                {getPriorityFlag(task.priority)}
                            </div>
                        </div>
                        
                        <p className={`text-sm font-medium mb-3 line-clamp-2 ${task.status === TaskStatus.COMPLETED ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {task.title}
                        </p>
                        
                        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-2 mt-2">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3" /> {task.estimatedMinutes}m
                                </span>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => onStartFocus(project, task)} 
                                    className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                                >
                                    <Play className="w-3 h-3 fill-current" />
                                </button>
                                {status !== TaskStatus.COMPLETED && (
                                    <button 
                                        onClick={() => onUpdateStatus(project.id, task.id, TaskStatus.COMPLETED)} 
                                        className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
                                    >
                                        <CheckCircle2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- Main Planner Component ---

const Planner: React.FC<PlannerProps> = ({ projects, setProjects, onStartFocus }) => {
    const [activeFilter, setActiveFilter] = useState<FilterType>('TODAY');
    const [viewType, setViewType] = useState<ViewType>('LIST');
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [quickAddTask, setQuickAddTask] = useState('');
    const [iteratingTasks, setIteratingTasks] = useState<Record<string, boolean>>({});
    
    // UI State for recursive lists
    const [expandedTasks, setExpandedTasks] = useState<Record<string, boolean>>({});

    // --- Actions ---

    const updateTask = (projectId: string, taskId: string, updates: Partial<SubTask>) => {
        setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            return { ...p, subtasks: recursiveUpdate(p.subtasks, taskId, (t) => ({ ...t, ...updates })) };
        }));
    };

    const toggleStatus = (projectId: string, taskId: string, currentStatus: TaskStatus) => {
        const newStatus = currentStatus === TaskStatus.COMPLETED ? TaskStatus.TODO : TaskStatus.COMPLETED;
        updateTask(projectId, taskId, { status: newStatus });
    };
    
    const deleteTask = (projectId: string, taskId: string) => {
         setProjects(prev => prev.map(p => {
            if (p.id !== projectId) return p;
            const deleteRecursive = (tasks: SubTask[]): SubTask[] => {
                return tasks.filter(t => t.id !== taskId).map(t => ({
                    ...t,
                    subtasks: t.subtasks ? deleteRecursive(t.subtasks) : undefined
                }));
            };
            return { ...p, subtasks: deleteRecursive(p.subtasks) };
        }));
    };

    // AI Iteration: Breakdown a task into subtasks
    const handleAutoBreakdown = async (projectId: string, task: SubTask) => {
        if (iteratingTasks[task.id]) return;
        
        setIteratingTasks(prev => ({ ...prev, [task.id]: true }));
        
        try {
            const suggested = await suggestSubtasks(task.title);
            
            if (suggested.length > 0) {
                const newSubtasks: SubTask[] = suggested.map(s => ({
                    id: crypto.randomUUID(),
                    title: s.title,
                    estimatedMinutes: s.estimatedMinutes,
                    status: TaskStatus.TODO,
                    subtasks: []
                }));
                
                // Append new subtasks to existing ones
                updateTask(projectId, task.id, { 
                    subtasks: [...(task.subtasks || []), ...newSubtasks] 
                });
                
                // Auto-expand the task to show new children
                setExpandedTasks(prev => ({ ...prev, [task.id]: true }));
            }
        } catch (e) {
            console.error("Failed to iterate task", e);
        } finally {
            setIteratingTasks(prev => ({ ...prev, [task.id]: false }));
        }
    };

    const addQuickTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (!quickAddTask.trim()) return;

        let scheduledDate: number | undefined = undefined;
        let title = quickAddTask;
        let priority: Priority = 'P4';
        
        // Target Project Logic
        let targetProjectId = null;
        
        // If currently filtering by Inbox/Today/Upcoming, default to the 'inbox' project
        if (activeFilter === 'INBOX' || activeFilter === 'TODAY' || activeFilter === 'UPCOMING') {
            targetProjectId = 'inbox';
        } else {
            // Otherwise, we are likely in a specific project view
            targetProjectId = activeFilter;
        }

        // Simple Natural Language Processing Mock
        const lower = title.toLowerCase();
        if (activeFilter === 'TODAY' || lower.includes('today')) {
            const d = new Date();
            d.setHours(9, 0, 0, 0);
            scheduledDate = d.getTime();
            title = title.replace(/today/i, '').trim();
        } else if (activeFilter === 'UPCOMING' || lower.includes('tomorrow')) {
             const d = new Date();
             d.setDate(d.getDate() + 1);
             d.setHours(9, 0, 0, 0);
             scheduledDate = d.getTime();
             title = title.replace(/tomorrow/i, '').trim();
        }

        if (title.includes('!p1')) { priority = 'P1'; title = title.replace('!p1', '').trim(); }
        else if (title.includes('!p2')) { priority = 'P2'; title = title.replace('!p2', '').trim(); }
        else if (title.includes('!p3')) { priority = 'P3'; title = title.replace('!p3', '').trim(); }

        // Final fallback if project logic failed or project was deleted
        if (!projects.find(p => p.id === targetProjectId)) {
            // Try finding inbox or first project
            const inbox = projects.find(p => p.id === 'inbox');
            targetProjectId = inbox ? inbox.id : (projects.length > 0 ? projects[0].id : null);
        }

        if (!targetProjectId) {
            // Panic mode: force wizard or create default? 
            // Assuming 'inbox' always exists due to App.tsx changes, this shouldn't happen.
            return;
        }

        const newTask: SubTask = {
            id: crypto.randomUUID(),
            title: title,
            status: TaskStatus.TODO,
            estimatedMinutes: 30, // Default
            scheduledDate: scheduledDate,
            priority: priority,
            subtasks: []
        };

        setProjects(prev => prev.map(p => {
            if (p.id !== targetProjectId) return p;
            return { ...p, subtasks: [...p.subtasks, newTask] };
        }));
        setQuickAddTask('');
    };

    // --- Counts Calculation ---
    const counts = useMemo(() => {
        let inbox = 0;
        let today = 0;
        let upcoming = 0;

        const startToday = new Date();
        startToday.setHours(0,0,0,0);
        const endToday = new Date(startToday).getTime() + 86400000;

        const traverse = (tasks: SubTask[]) => {
            tasks.forEach(t => {
                if (t.status === TaskStatus.COMPLETED) return;
                
                if (!t.scheduledDate) {
                    inbox++;
                } else {
                    if (t.scheduledDate >= startToday.getTime() && t.scheduledDate < endToday) {
                        today++;
                    } else if (t.scheduledDate >= endToday) {
                        upcoming++;
                    }
                }

                if (t.subtasks) traverse(t.subtasks);
            });
        };

        projects.forEach(p => traverse(p.subtasks));
        return { inbox, today, upcoming };
    }, [projects]);


    // --- Data Aggregation ---

    const filteredData = useMemo(() => {
        let tasks: { task: SubTask, project: Project }[] = [];
        let contextTitle = "";
        let contextIcon = ListIcon;

        // Flatten all tasks first
        const allTasks = projects.flatMap(p => {
            const flatten = (items: SubTask[]): SubTask[] => {
                return items.flatMap(i => [i, ...(i.subtasks ? flatten(i.subtasks) : [])]);
            };
            return flatten(p.subtasks).map(t => ({ task: t, project: p }));
        });

        if (activeFilter === 'INBOX') {
            contextTitle = "Inbox";
            contextIcon = Inbox;
            // Show all unscheduled tasks (from ANY project, but mostly Inbox)
            tasks = allTasks.filter(item => !item.task.scheduledDate && item.task.status !== TaskStatus.COMPLETED);
        } else if (activeFilter === 'TODAY') {
            contextTitle = "Today";
            contextIcon = CalendarDays;
            const today = new Date().setHours(0,0,0,0);
            const tomorrow = new Date(today + 86400000).getTime();
            tasks = allTasks.filter(item => {
                if (item.task.status === TaskStatus.COMPLETED) return false;
                if (!item.task.scheduledDate) return false;
                return item.task.scheduledDate >= today && item.task.scheduledDate < tomorrow;
            });
        } else if (activeFilter === 'UPCOMING') {
            contextTitle = "Upcoming";
            contextIcon = CalendarIcon;
            const tomorrow = new Date(new Date().setHours(0,0,0,0) + 86400000).getTime();
            tasks = allTasks.filter(item => {
                if (item.task.status === TaskStatus.COMPLETED) return false;
                return item.task.scheduledDate && item.task.scheduledDate >= tomorrow;
            });
        } else {
            // Project View
            const project = projects.find(p => p.id === activeFilter);
            if (project) {
                contextTitle = project.title;
                contextIcon = Layers;
                // For List View in a Project, we want Hierarchy. 
                // But for Board View, we want flattened cards.
                // We'll return flattened here for BOARD, and use project.subtasks directly for LIST.
                tasks = allTasks.filter(item => item.project.id === activeFilter);
            }
        }

        // Sort by Priority then Date
        tasks.sort((a, b) => {
            const pOrder = { 'P1': 1, 'P2': 2, 'P3': 3, 'P4': 4, undefined: 4 };
            const pA = pOrder[a.task.priority || 'P4'];
            const pB = pOrder[b.task.priority || 'P4'];
            if (pA !== pB) return pA - pB;
            return (a.task.scheduledDate || 0) - (b.task.scheduledDate || 0);
        });

        return { tasks, contextTitle, contextIcon };
    }, [projects, activeFilter]);

    // --- Renderers ---

    const renderHierarchicalList = (subtasks: SubTask[], project: Project, depth = 0) => {
        return subtasks.map(task => (
            <React.Fragment key={task.id}>
                <TaskItem 
                    task={task} 
                    onToggle={() => toggleStatus(project.id, task.id, task.status)}
                    onFocus={() => onStartFocus(project, task)}
                    onUpdate={(updates) => updateTask(project.id, task.id, updates)}
                    onDelete={() => deleteTask(project.id, task.id)}
                    onIterate={() => handleAutoBreakdown(project.id, task)}
                    isIterating={iteratingTasks[task.id]}
                    depth={depth}
                    hasChildren={task.subtasks && task.subtasks.length > 0}
                    isExpanded={expandedTasks[task.id] !== false} // Default true
                    onToggleExpand={() => setExpandedTasks(prev => ({...prev, [task.id]: expandedTasks[task.id] === false ? true : false}))}
                />
                {task.subtasks && task.subtasks.length > 0 && expandedTasks[task.id] !== false && (
                    renderHierarchicalList(task.subtasks, project, depth + 1)
                )}
            </React.Fragment>
        ));
    };

    if (isWizardOpen) {
        return (
            <div className="fixed inset-0 z-50 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-center p-0 md:p-6 animate-in fade-in">
                <div className="w-full h-full max-w-7xl mx-auto">
                    <ProjectWizard 
                        onComplete={(newProject) => {
                            setProjects(prev => [newProject, ...prev]);
                            setIsWizardOpen(false);
                            setActiveFilter(newProject.id); // Switch to new project
                        }}
                        onCancel={() => setIsWizardOpen(false)}
                    />
                </div>
            </div>
        );
    }

    const activeProject = projects.find(p => p.id === activeFilter);
    const isProjectView = !!activeProject;
    
    // Project Specific Stats
    const projectStats = isProjectView ? calculateProjectStats(activeProject.subtasks) : null;

    return (
        <div className="flex h-full bg-white dark:bg-slate-950 animate-in fade-in">
            
            {/* --- Left Sidebar (Todoist Style) --- */}
            <div className="w-64 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col pt-4 hidden md:flex">
                <div className="px-4 mb-6">
                    <button 
                        onClick={() => setIsWizardOpen(true)}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all"
                    >
                        <Plus className="w-4 h-4" /> Add Project
                    </button>
                </div>

                <div className="space-y-1 px-2 mb-6">
                    <button onClick={() => setActiveFilter('INBOX')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${activeFilter === 'INBOX' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><Inbox className="w-4 h-4" /> Inbox</div>
                        {counts.inbox > 0 && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{counts.inbox}</span>}
                    </button>
                    <button onClick={() => setActiveFilter('TODAY')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${activeFilter === 'TODAY' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><CalendarDays className="w-4 h-4" /> Today</div>
                        {counts.today > 0 && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{counts.today}</span>}
                    </button>
                    <button onClick={() => setActiveFilter('UPCOMING')} className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between ${activeFilter === 'UPCOMING' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                        <div className="flex items-center gap-3"><CalendarIcon className="w-4 h-4" /> Upcoming</div>
                        {counts.upcoming > 0 && <span className="text-[10px] bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded-full">{counts.upcoming}</span>}
                    </button>
                </div>

                <div className="px-4 mb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Projects</span>
                    <span className="text-xs text-slate-400">{projects.filter(p => p.id !== 'inbox').length}</span>
                </div>
                
                <div className="flex-1 overflow-y-auto px-2 space-y-0.5 custom-scrollbar">
                    {projects.filter(p => p.id !== 'inbox').map(p => {
                        const stats = calculateProjectStats(p.subtasks);
                        return (
                            <button 
                                key={p.id}
                                onClick={() => setActiveFilter(p.id)}
                                className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between gap-2 truncate group ${activeFilter === p.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                                <div className="flex items-center gap-2 truncate">
                                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                                    <span className="truncate">{p.title}</span>
                                </div>
                                
                                {/* Mini Progress Ring */}
                                {stats.total > 0 && (
                                    <div className="relative w-4 h-4 flex-shrink-0 opacity-40 group-hover:opacity-100">
                                       <svg className="w-full h-full transform -rotate-90">
                                           <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-slate-200 dark:text-slate-700" />
                                           <circle cx="50%" cy="50%" r="40%" stroke="currentColor" strokeWidth="2" fill="transparent" className="text-indigo-500" strokeDasharray="251%" strokeDashoffset={`${251 - (251 * stats.percent) / 100}%`} />
                                       </svg>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* --- Main Content Area --- */}
            <div className="flex-1 flex flex-col min-w-0">
                
                {/* Header */}
                <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 sticky top-0 z-10 p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <filteredData.contextIcon className="w-6 h-6 text-indigo-500" />
                            <h2 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">{filteredData.contextTitle}</h2>
                            <span className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                                {isProjectView ? projectStats?.total : filteredData.tasks.length}
                            </span>
                        </div>

                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                            <button 
                                onClick={() => setViewType('LIST')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewType === 'LIST' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                            >
                                <ListIcon className="w-3.5 h-3.5" /> List
                            </button>
                            <button 
                                onClick={() => setViewType('BOARD')}
                                className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-2 transition-all ${viewType === 'BOARD' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm' : 'text-slate-500'}`}
                            >
                                <Kanban className="w-3.5 h-3.5" /> Board
                            </button>
                        </div>
                    </div>
                    
                    {/* Detailed Stats for Project View */}
                    {isProjectView && projectStats && (
                        <div className="flex items-center gap-8 animate-in fade-in slide-in-from-top-2">
                             {/* Progress Bar */}
                             <div className="flex-1 max-w-xs">
                                <div className="flex justify-between text-xs font-bold mb-1.5">
                                    <span className="text-slate-500 dark:text-slate-400">Progress</span>
                                    <span className="text-indigo-600 dark:text-indigo-400">{projectStats.percent}%</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                    <div 
                                        className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                                        style={{ width: `${projectStats.percent}%` }}
                                    />
                                </div>
                             </div>

                             {/* Time Stats */}
                             <div className="flex gap-6 border-l border-slate-200 dark:border-slate-800 pl-6">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Estimated</div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{projectStats.totalHours}h</div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Completed</div>
                                    <div className="text-sm font-bold text-slate-700 dark:text-slate-200">{projectStats.completedHours}h</div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>

                {/* View Container */}
                <div className="flex-1 overflow-hidden relative flex flex-col">
                    
                    {/* View Content */}
                    <div className="flex-1 overflow-y-auto overflow-x-auto p-4 md:p-8 custom-scrollbar">
                        
                        {viewType === 'LIST' ? (
                            <div className="max-w-4xl mx-auto pb-20">
                                {isProjectView ? (
                                    // Project View: Recursive Tree
                                    renderHierarchicalList(activeProject!.subtasks, activeProject!)
                                ) : (
                                    // Aggregated View: Flat List
                                    filteredData.tasks.length > 0 ? (
                                        filteredData.tasks.map(({ task, project }) => (
                                            <TaskItem 
                                                key={task.id}
                                                task={task}
                                                projectTitle={project.title}
                                                onToggle={() => toggleStatus(project.id, task.id, task.status)}
                                                onFocus={() => onStartFocus(project, task)}
                                                onUpdate={(updates) => updateTask(project.id, task.id, updates)}
                                                onDelete={() => deleteTask(project.id, task.id)}
                                                onIterate={() => handleAutoBreakdown(project.id, task)}
                                                isIterating={iteratingTasks[task.id]}
                                            />
                                        ))
                                    ) : (
                                        <div className="text-center py-20 text-slate-400">
                                            <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 className="w-8 h-8 text-slate-300" />
                                            </div>
                                            <p>All clear! Nothing to do here.</p>
                                        </div>
                                    )
                                )}
                                
                                {/* Quick Add (List Bottom) */}
                                <form onSubmit={addQuickTask} className="mt-4 flex items-center gap-2 group opacity-60 focus-within:opacity-100 hover:opacity-100 transition-opacity">
                                    <Plus className="w-5 h-5 text-indigo-500" />
                                    <input 
                                        value={quickAddTask}
                                        onChange={(e) => setQuickAddTask(e.target.value)}
                                        placeholder="Add task... (Type 'today', '!p1')"
                                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder-slate-400 text-slate-900 dark:text-slate-100 h-10 font-medium"
                                    />
                                    {quickAddTask && (
                                        <button type="submit" className="px-3 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg">Add</button>
                                    )}
                                </form>
                            </div>
                        ) : (
                            // BOARD VIEW
                            <div className="flex h-full pb-6">
                                <BoardColumn 
                                    title="To Do" 
                                    status={TaskStatus.TODO} 
                                    tasks={isProjectView 
                                        // Flatten project tasks for board view
                                        ? projects.find(p => p.id === activeFilter)!.subtasks.flatMap(t => [t, ...(t.subtasks || [])]).filter(t => t.status === TaskStatus.TODO).map(t => ({ task: t, project: activeProject! }))
                                        : filteredData.tasks.filter(t => t.task.status === TaskStatus.TODO)
                                    } 
                                    onUpdateStatus={toggleStatus} 
                                    onStartFocus={onStartFocus}
                                />
                                <BoardColumn 
                                    title="In Progress" 
                                    status={TaskStatus.IN_PROGRESS} 
                                    tasks={isProjectView 
                                        ? projects.find(p => p.id === activeFilter)!.subtasks.flatMap(t => [t, ...(t.subtasks || [])]).filter(t => t.status === TaskStatus.IN_PROGRESS).map(t => ({ task: t, project: activeProject! }))
                                        : filteredData.tasks.filter(t => t.task.status === TaskStatus.IN_PROGRESS)
                                    } 
                                    onUpdateStatus={toggleStatus} 
                                    onStartFocus={onStartFocus}
                                />
                                <BoardColumn 
                                    title="Done" 
                                    status={TaskStatus.COMPLETED} 
                                    tasks={isProjectView 
                                        ? projects.find(p => p.id === activeFilter)!.subtasks.flatMap(t => [t, ...(t.subtasks || [])]).filter(t => t.status === TaskStatus.COMPLETED).map(t => ({ task: t, project: activeProject! }))
                                        : filteredData.tasks.filter(t => t.task.status === TaskStatus.COMPLETED)
                                    } 
                                    onUpdateStatus={toggleStatus} 
                                    onStartFocus={onStartFocus}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Planner;
