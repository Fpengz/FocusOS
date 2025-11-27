
import React, { useState, useRef, useEffect } from 'react';
import { Project, SubTask, TaskStatus, ChatMessage } from '../../types';
import { consultProjectAgent } from '../../services/geminiService';
import { Loader2, Plus, ArrowLeft, Send, ChevronRight, Paperclip, Edit2, Sparkles, Clock, Calendar as CalendarIcon, ListTodo, Trash2, ChevronDown, GripVertical, Folder, FolderOpen, Check } from 'lucide-react';
import { Markdown } from '../Markdown';

interface ProjectWizardProps {
    onComplete: (p: Project) => void;
    onCancel: () => void;
}

// --- Recursive Helper to find and update a task in a deep tree ---
const updateTaskInTree = (tasks: SubTask[], targetId: string, updater: (t: SubTask) => SubTask): SubTask[] => {
    return tasks.map(task => {
        if (task.id === targetId) {
            return updater(task);
        }
        if (task.subtasks && task.subtasks.length > 0) {
            return { ...task, subtasks: updateTaskInTree(task.subtasks, targetId, updater) };
        }
        return task;
    });
};

const deleteTaskInTree = (tasks: SubTask[], targetId: string): SubTask[] => {
    return tasks
        .filter(t => t.id !== targetId)
        .map(t => ({
            ...t,
            subtasks: t.subtasks ? deleteTaskInTree(t.subtasks, targetId) : undefined
        }));
};

const addTaskToTree = (tasks: SubTask[], parentId: string, newTask: SubTask): SubTask[] => {
    return tasks.map(task => {
        if (task.id === parentId) {
            return { ...task, subtasks: [...(task.subtasks || []), newTask] };
        }
        if (task.subtasks) {
            return { ...task, subtasks: addTaskToTree(task.subtasks, parentId, newTask) };
        }
        return task;
    });
};

// --- Component: Recursive Task Node ---
interface TaskNodeProps {
    task: SubTask;
    depth: number;
    onUpdate: (id: string, updates: Partial<SubTask>) => void;
    onDelete: (id: string) => void;
    onAddSubtask: (parentId: string) => void;
}

const TaskNode: React.FC<TaskNodeProps> = ({ task, depth, onUpdate, onDelete, onAddSubtask }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [tempTitle, setTempTitle] = useState(task.title);

    const hasChildren = task.subtasks && task.subtasks.length > 0;
    const isStage = depth === 0; // Top level items are "Stages"

    const handleBlur = () => {
        setIsEditing(false);
        if (tempTitle.trim() !== task.title) {
            onUpdate(task.id, { title: tempTitle });
        }
    };

    return (
        <div className={`transition-all duration-300 ${isStage ? 'mb-4' : 'mt-1'}`}>
            {/* Task Row */}
            <div 
                className={`
                    group flex items-center gap-2 py-2 px-3 rounded-xl border transition-all duration-200
                    ${isStage 
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' 
                        : 'border-transparent hover:bg-white dark:hover:bg-slate-800/80 ml-6'
                    }
                `}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            >
                {/* Drag Handle (Visual only for now) */}
                <div className={`cursor-grab text-slate-300 dark:text-slate-600 ${isHovered ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                    <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Expand Toggle */}
                <button 
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-transform ${hasChildren ? '' : 'invisible'}`}
                >
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? '' : '-rotate-90'}`} />
                </button>

                {/* Icon based on Type */}
                <div className={`mr-1 ${isStage ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400'}`}>
                    {isStage ? (isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />) : (
                        <div className="w-2 h-2 rounded-full border border-slate-400 dark:border-slate-500" />
                    )}
                </div>

                {/* Content Area */}
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {isEditing ? (
                        <input 
                            autoFocus
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onBlur={handleBlur}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') handleBlur();
                            }}
                            className="bg-transparent outline-none text-sm font-medium w-full border-b-2 border-indigo-500 pb-0.5"
                        />
                    ) : (
                        <div className="flex items-center gap-2 cursor-text" onClick={() => setIsEditing(true)}>
                            <span className={`text-sm truncate transition-colors ${isStage ? 'font-bold text-slate-800 dark:text-slate-100' : 'font-medium text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400'}`}>
                                {task.title}
                            </span>
                        </div>
                    )}
                    
                    {/* Metadata Badges */}
                    {!isEditing && (
                        <div className="flex items-center gap-2 mt-0.5 opacity-60 group-hover:opacity-100 transition-opacity">
                            <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                <Clock className="w-3 h-3" />
                                {task.estimatedMinutes}m
                            </div>
                            {task.deadline && (
                                <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                                    <CalendarIcon className="w-3 h-3" />
                                    {new Date(task.deadline).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className={`flex items-center gap-1 ${isHovered || isStage ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
                    <button 
                        onClick={() => onAddSubtask(task.id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-all"
                        title="Add Subtask"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button 
                        onClick={() => onDelete(task.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"
                        title="Delete"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            {/* Recursive Children */}
            {isExpanded && hasChildren && (
                <div className="relative">
                    {/* Vertical Line for hierarchy visual */}
                    <div className="absolute left-7 top-0 bottom-4 w-px bg-slate-200 dark:bg-slate-800" />
                    {task.subtasks!.map(sub => (
                        <TaskNode 
                            key={sub.id} 
                            task={sub} 
                            depth={depth + 1} 
                            onUpdate={onUpdate} 
                            onDelete={onDelete}
                            onAddSubtask={onAddSubtask}
                        />
                    ))}
                </div>
            )}
        </div>
    );
};


// --- Main Component ---
const ProjectWizard: React.FC<ProjectWizardProps> = ({ onComplete, onCancel }) => {
    const [mode, setMode] = useState<'AI' | 'MANUAL'>('AI');
    const [mobileTab, setMobileTab] = useState<'CHAT' | 'DRAFT'>('CHAT');
    
    // AI Mode State
    const [messages, setMessages] = useState<ChatMessage[]>([{
        id: 'init', role: 'model', text: 'Hi! I can help you plan your next project. Tell me your goal, and I\'ll break it down into stages for you.', timestamp: Date.now()
    }]);
    const [input, setInput] = useState('');
    const [attachments, setAttachments] = useState<{name: string, mimeType: string, data: string}[]>([]);
    const [isThinking, setIsThinking] = useState(false);
    
    // Shared State (The Draft)
    const [draftProject, setDraftProject] = useState<Project>({
        id: crypto.randomUUID(),
        title: "",
        description: "",
        subtasks: [],
        createdAt: Date.now(),
        status: TaskStatus.TODO,
        suggestedResources: [],
        chatHistory: [],
        totalEstimatedMinutes: 0
    });

    const fileInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, mobileTab]);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files) return;
        Array.from(files).forEach((file: File) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = (reader.result as string).split(',')[1];
                setAttachments(prev => [...prev, { name: file.name, mimeType: file.type, data: base64String }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleSend = async () => {
        if (!input.trim() && attachments.length === 0) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            text: input,
            timestamp: Date.now(),
            attachments: attachments.map(a => ({ mimeType: a.mimeType, data: a.data }))
        };

        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setAttachments([]);
        setIsThinking(true);

        try {
            const { text, projectDraft } = await consultProjectAgent(messages, userMsg.text, userMsg.attachments || []);
            
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'model',
                text: text,
                timestamp: Date.now()
            }]);

            if (projectDraft) {
                setDraftProject(prev => ({
                    ...prev,
                    title: projectDraft.title || prev.title,
                    description: projectDraft.description || prev.description,
                    suggestedResources: projectDraft.suggestedResources || [],
                    // Recursively map the new structure to ensure IDs, handle if subtasks is undefined
                    subtasks: (projectDraft.subtasks || []).map((st: any) => mapIncomingTask(st))
                }));
                if (window.innerWidth < 768) {
                    setMobileTab('DRAFT');
                }
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: crypto.randomUUID(),
                role: 'model',
                text: "Sorry, I encountered an error processing that. Please try again.",
                timestamp: Date.now()
            }]);
        } finally {
            setIsThinking(false);
        }
    };

    // Helper to add IDs to incoming AI JSON
    const mapIncomingTask = (t: any): SubTask => ({
        id: crypto.randomUUID(),
        title: t.title,
        estimatedMinutes: t.estimatedMinutes || 30,
        status: TaskStatus.TODO,
        deadline: t.deadline ? new Date(t.deadline).getTime() : undefined,
        subtasks: t.subtasks ? t.subtasks.map((st: any) => mapIncomingTask(st)) : []
    });

    // --- Tree Manipulation Handlers ---

    const handleUpdateTask = (id: string, updates: Partial<SubTask>) => {
        setDraftProject(prev => ({
            ...prev,
            subtasks: updateTaskInTree(prev.subtasks, id, (t) => ({ ...t, ...updates }))
        }));
    };

    const handleDeleteTask = (id: string) => {
        setDraftProject(prev => ({
            ...prev,
            subtasks: deleteTaskInTree(prev.subtasks, id)
        }));
    };

    const handleAddSubtask = (parentId: string) => {
        const newTask: SubTask = {
            id: crypto.randomUUID(),
            title: "New Subtask",
            status: TaskStatus.TODO,
            estimatedMinutes: 15,
            subtasks: []
        };
        setDraftProject(prev => ({
            ...prev,
            subtasks: addTaskToTree(prev.subtasks, parentId, newTask)
        }));
    };

    const handleAddRootStage = () => {
        const newStage: SubTask = {
            id: crypto.randomUUID(),
            title: "New Stage",
            status: TaskStatus.TODO,
            estimatedMinutes: 0,
            subtasks: []
        };
        setDraftProject(prev => ({
            ...prev,
            subtasks: [...prev.subtasks, newStage]
        }));
    };

    return (
        <div className="flex flex-col h-[calc(100vh-20px)] md:h-[90vh] bg-white dark:bg-slate-950 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-2xl animate-in zoom-in-95 duration-300 relative">
            
            {/* --- Header --- */}
            <div className="absolute top-0 left-0 right-0 z-20 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800/50 flex justify-between items-center px-6">
                 <div className="flex items-center gap-4">
                    <button onClick={onCancel} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors group">
                        <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-900 dark:group-hover:text-slate-100" />
                    </button>
                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800"></div>
                    
                    {/* Mode Toggle Pills */}
                    <div className="flex bg-slate-100 dark:bg-slate-900 rounded-full p-1 border border-slate-200 dark:border-slate-800">
                        <button 
                            onClick={() => setMode('AI')}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                                mode === 'AI' 
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <Sparkles className="w-3.5 h-3.5" /> AI Planner
                        </button>
                        <button 
                            onClick={() => { setMode('MANUAL'); setMobileTab('DRAFT'); }}
                            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-bold rounded-full transition-all ${
                                mode === 'MANUAL' 
                                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                            }`}
                        >
                            <Edit2 className="w-3.5 h-3.5" /> Manual
                        </button>
                    </div>
                </div>

                <button 
                    onClick={() => onComplete(draftProject)} 
                    disabled={!draftProject.title}
                    className="flex items-center gap-2 px-5 py-2.5 text-sm font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-105 active:scale-95"
                >
                    Create Project <ChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* --- Mobile Tabs --- */}
            {mode === 'AI' && (
                <div className="md:hidden flex border-b border-slate-200 dark:border-slate-800 mt-16 bg-white dark:bg-slate-950 z-10 relative">
                    <button 
                        onClick={() => setMobileTab('CHAT')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${mobileTab === 'CHAT' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                    >
                        Chat
                    </button>
                    <button 
                        onClick={() => setMobileTab('DRAFT')}
                        className={`flex-1 py-3 text-sm font-medium border-b-2 ${mobileTab === 'DRAFT' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
                    >
                        Draft
                    </button>
                </div>
            )}

            <div className="flex flex-1 overflow-hidden pt-16 md:pt-16">
                
                {/* --- LEFT COLUMN: CHAT INTERFACE --- */}
                <div className={`
                    flex flex-col flex-1 bg-slate-50/50 dark:bg-slate-950/50 border-r border-slate-200 dark:border-slate-800 relative
                    ${mode === 'MANUAL' ? 'hidden' : ''}
                    ${mode === 'AI' && mobileTab === 'DRAFT' ? 'hidden md:flex' : 'flex'}
                `}>
                    <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                        {messages.map(msg => (
                            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 fade-in duration-300`}>
                                <div className={`max-w-[85%] p-4 shadow-sm leading-relaxed ${
                                    msg.role === 'user' 
                                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-2xl rounded-tr-sm shadow-indigo-500/10' 
                                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-2xl rounded-tl-sm'
                                }`}>
                                    <Markdown content={msg.text} />
                                    {msg.attachments && (
                                        <div className="mt-3 flex gap-2 flex-wrap">
                                            {msg.attachments.map((a, i) => (
                                                <div key={i} className="text-xs bg-black/20 text-white/90 px-2 py-1 rounded-md flex items-center gap-1">
                                                    <Paperclip className="w-3 h-3" /> {a.mimeType.split('/')[1]}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isThinking && (
                            <div className="flex justify-start animate-in fade-in">
                                <div className="bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl rounded-tl-sm border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2">
                                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                                    <span className="text-xs text-slate-500">Thinking...</span>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <div className="p-4 bg-white dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
                         {attachments.length > 0 && (
                            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                                {attachments.map((att, i) => (
                                    <span key={i} className="text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 px-2 py-1 rounded-md flex items-center gap-1 border border-indigo-100 dark:border-indigo-800">
                                        {att.name} <button onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))} className="hover:text-red-500 ml-1">×</button>
                                    </span>
                                ))}
                            </div>
                        )}
                        <div className="flex items-end gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-3xl border border-slate-200 dark:border-slate-800 focus-within:ring-2 ring-indigo-500/20 transition-all">
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                multiple 
                                onChange={handleFileUpload} 
                            />
                            <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="p-2.5 text-slate-400 hover:text-indigo-500 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-all"
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            <textarea 
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        handleSend();
                                    }
                                }}
                                placeholder="Describe your project..."
                                className="flex-1 bg-transparent border-none text-sm outline-none text-slate-900 dark:text-white max-h-32 resize-none py-3 px-1 font-medium"
                                rows={1}
                            />
                            <button 
                                onClick={handleSend} 
                                disabled={!input && attachments.length === 0}
                                className="p-2.5 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 disabled:opacity-50 disabled:scale-90 transition-all shadow-md shadow-indigo-500/20 active:scale-95"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* --- RIGHT COLUMN: TREE EDITOR --- */}
                <div className={`
                    flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden
                    ${mode === 'MANUAL' ? 'items-center w-full' : ''}
                    ${mode === 'AI' && mobileTab === 'DRAFT' ? 'flex' : 'hidden md:flex'}
                `}>
                    <div className={`
                        flex-1 w-full overflow-y-auto p-4 md:p-8 custom-scrollbar
                        ${mode === 'MANUAL' ? 'max-w-4xl' : ''}
                    `}>
                        {/* Paper Sheet Effect */}
                        <div className="bg-white dark:bg-slate-900 min-h-full md:min-h-[800px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 md:p-12 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
                            {/* Decorative Corner Fold or element */}
                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-slate-100 to-transparent dark:from-slate-800 rounded-bl-3xl opacity-50 pointer-events-none" />

                            {/* Title & Description (Clean) */}
                            <div className="space-y-4 text-center md:text-left">
                                <input 
                                    value={draftProject.title}
                                    onChange={(e) => setDraftProject({...draftProject, title: e.target.value})}
                                    placeholder="Project Title"
                                    className="w-full bg-transparent text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-700 outline-none border-none p-0 tracking-tight"
                                />
                                <textarea 
                                    value={draftProject.description}
                                    onChange={(e) => setDraftProject({...draftProject, description: e.target.value})}
                                    placeholder="Add a description or executive summary..."
                                    className="w-full bg-transparent text-lg text-slate-600 dark:text-slate-400 placeholder-slate-300 dark:placeholder-slate-700 outline-none border-none p-0 resize-none leading-relaxed"
                                    rows={2}
                                />
                            </div>

                            <div className="border-b border-slate-100 dark:border-slate-800" />

                            {/* Structure Section */}
                            <div>
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                                        <ListTodo className="w-4 h-4" /> Project Plan
                                    </h3>
                                    <button 
                                        onClick={handleAddRootStage}
                                        className="px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1 transition-colors"
                                    >
                                        <Plus className="w-3 h-3" /> Add Stage
                                    </button>
                                </div>

                                <div className="space-y-4 pb-20">
                                    {draftProject.subtasks.map((task) => (
                                        <TaskNode 
                                            key={task.id} 
                                            task={task} 
                                            depth={0}
                                            onUpdate={handleUpdateTask}
                                            onDelete={handleDeleteTask}
                                            onAddSubtask={handleAddSubtask}
                                        />
                                    ))}
                                    
                                    {draftProject.subtasks.length === 0 && (
                                        <div className="text-center py-16 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
                                            <Sparkles className="w-8 h-8 mx-auto mb-3 text-indigo-200" />
                                            <p className="mb-2 font-medium">Your canvas is empty.</p>
                                            <div className="flex justify-center gap-2 text-sm">
                                                <button onClick={handleAddRootStage} className="text-indigo-600 hover:underline">Add a Stage</button>
                                                <span className="text-slate-400">or</span>
                                                <span className="text-slate-500">chat to auto-generate.</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProjectWizard;
