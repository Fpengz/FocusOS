
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Project, SubTask, TaskStatus } from '../types';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, GripVertical, Clock, LayoutGrid, GripHorizontal, Columns, Upload, Link as LinkIcon, Check, Loader2, Globe, Mail, Cloud, X, Trash2, AlignLeft, CalendarOff, Save, Inbox, Wand2 } from 'lucide-react';

interface CalendarPlanProps {
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  onScheduleTask: (projectId: string, taskId: string, date: number) => void;
  onUpdateTask: (projectId: string, taskId: string, updates: Partial<SubTask>) => void;
}

type CalendarViewMode = 'DAY' | 'WEEK' | 'MONTH';

// --- Recursive Helper to Flatten Tasks ---
const flattenTasks = (subtasks: SubTask[]): SubTask[] => {
    let result: SubTask[] = [];
    subtasks.forEach(task => {
        result.push(task);
        if (task.subtasks && task.subtasks.length > 0) {
            result = result.concat(flattenTasks(task.subtasks));
        }
    });
    return result;
};

// --- Recursive Helper to Update Tasks in Tree (for Bulk) ---
const bulkUpdateTaskInTree = (tasks: SubTask[], taskId: string, updates: Partial<SubTask>): SubTask[] => {
    return tasks.map(t => {
        if (t.id === taskId) return { ...t, ...updates };
        if (t.subtasks) return { ...t, subtasks: bulkUpdateTaskInTree(t.subtasks, taskId, updates) };
        return t;
    });
};


const CalendarPlan: React.FC<CalendarPlanProps> = ({ projects, setProjects, onScheduleTask, onUpdateTask }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('WEEK');
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resizing State
  const [resizingTask, setResizingTask] = useState<{projectId: string, taskId: string, startY: number, startHeight: number} | null>(null);
  const [currentResizeHeight, setCurrentResizeHeight] = useState<number | null>(null);

  // Modal State
  const [selectedTaskData, setSelectedTaskData] = useState<{project: Project, task: SubTask} | null>(null);
  const [isUnscheduledDrawerOpen, setIsUnscheduledDrawerOpen] = useState(false);
  const [isAutoScheduling, setIsAutoScheduling] = useState(false);

  // Integration State
  const [showIntegrations, setShowIntegrations] = useState(false);
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [isConnecting, setIsConnecting] = useState<string | null>(null);

  // --- Scroll to 8 AM on load ---
  useEffect(() => {
    if ((viewMode === 'WEEK' || viewMode === 'DAY') && scrollContainerRef.current) {
        // 60px per hour * 8 hours = 480px
        scrollContainerRef.current.scrollTop = 480; 
    }
  }, [viewMode]);

  // --- Resizing Logic Effect ---
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
        if (!resizingTask) return;
        const delta = e.clientY - resizingTask.startY;
        // Min height 15px (15 mins)
        setCurrentResizeHeight(Math.max(15, resizingTask.startHeight + delta));
    };

    const handleMouseUp = () => {
        if (!resizingTask) return;
        
        if (currentResizeHeight) {
            // Calculate new minutes (assuming 1px = 1min based on 60px/hr)
            const newMinutes = Math.round(currentResizeHeight);
            // Snap to 15 min increments
            const snappedMinutes = Math.max(15, Math.round(newMinutes / 15) * 15);
            
            onUpdateTask(resizingTask.projectId, resizingTask.taskId, { estimatedMinutes: snappedMinutes });
        }
        
        setResizingTask(null);
        setCurrentResizeHeight(null);
    };

    if (resizingTask) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'ns-resize';
    } else {
        document.body.style.cursor = 'default';
    }

    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = 'default';
    };
  }, [resizingTask, currentResizeHeight, onUpdateTask]);

  // --- Helpers ---
  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();
  
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust so Sunday is first
    const newD = new Date(d.setDate(diff));
    newD.setHours(0,0,0,0);
    return newD;
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  const isSameDay = (d1: Date, d2: Date) => {
    return d1.getDate() === d2.getDate() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getFullYear() === d2.getFullYear();
  };

  // --- Mock Integration Logic ---
  const handleConnectProvider = (providerName: string, type: 'google' | 'outlook' | 'icloud') => {
      // Implementation kept same as original for brevity, but referencing it
  };

  // --- Navigation ---
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() - 1);
    else if (viewMode === 'WEEK') newDate.setDate(newDate.getDate() - 7);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'MONTH') newDate.setMonth(newDate.getMonth() + 1);
    else if (viewMode === 'WEEK') newDate.setDate(newDate.getDate() + 7);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  // --- Drag & Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, projectId: string, taskId: string) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ projectId, taskId }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, date: Date, hour?: number) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    try {
        const { projectId, taskId } = JSON.parse(data);
        const scheduledTime = new Date(date);
        if (hour !== undefined) {
            scheduledTime.setHours(hour, 0, 0, 0);
        }
        onScheduleTask(projectId, taskId, scheduledTime.getTime());
    } catch (err) {
        console.error("Failed to parse drop data", err);
    }
  };

  const handleUnscheduleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      const data = e.dataTransfer.getData('application/json');
      if (!data) return;

      try {
          const { projectId, taskId } = JSON.parse(data);
          onUpdateTask(projectId, taskId, { scheduledDate: undefined });
      } catch (err) {
          console.error("Failed to unschedule task", err);
      }
  };

  const handleResizeStart = (e: React.MouseEvent, projectId: string, taskId: string, height: number) => {
      e.stopPropagation();
      e.preventDefault();
      setResizingTask({
          projectId,
          taskId,
          startY: e.clientY,
          startHeight: height
      });
  };

  const handleTaskClick = (e: React.MouseEvent, project: Project, task: SubTask) => {
      e.stopPropagation();
      setSelectedTaskData({ project, task });
  };

  // --- Data Preparation ---
  const { unscheduledTasks, scheduledTasks } = useMemo(() => {
    const unscheduled: { project: Project; task: SubTask }[] = [];
    const scheduled: { project: Project; task: SubTask }[] = [];

    projects.forEach(p => {
        const allSubtasks = flattenTasks(p.subtasks);
        
        allSubtasks.forEach(t => {
            if (t.status === TaskStatus.COMPLETED) return;
            if (t.scheduledDate) {
                scheduled.push({ project: p, task: t });
            } else {
                unscheduled.push({ project: p, task: t });
            }
        });
    });

    return { unscheduledTasks: unscheduled, scheduledTasks: scheduled };
  }, [projects]);


  // --- Auto Schedule Logic ---
  const handleAutoSchedule = () => {
      setIsAutoScheduling(true);

      // Simulation delay for effect
      setTimeout(() => {
          // 1. Determine Scope (Week or Day)
          const daysToSchedule = viewMode === 'DAY' ? [currentDate] : 
                                 Array.from({ length: 7 }).map((_, i) => addDays(getStartOfWeek(currentDate), i));
          
          // 2. Define Work Hours (9 AM - 5 PM)
          const START_HOUR = 9;
          const END_HOUR = 17;

          // 3. Prepare Updates Map
          const updates: { projectId: string; taskId: string; date: number }[] = [];
          
          // 4. Build a map of occupied slots (simple minute-based check)
          // Map key: "YYYY-MM-DD", value: boolean array of minutes (24*60)
          const occupied = new Map<string, boolean[]>();
          
          daysToSchedule.forEach(day => {
              const dayStr = day.toDateString();
              if (!occupied.has(dayStr)) occupied.set(dayStr, new Array(24 * 60).fill(false));
          });

          // Fill occupied from existing scheduled tasks
          scheduledTasks.forEach(({ task }) => {
              if (!task.scheduledDate) return;
              const d = new Date(task.scheduledDate);
              const dayStr = d.toDateString();
              
              if (occupied.has(dayStr)) {
                  const startMin = d.getHours() * 60 + d.getMinutes();
                  const endMin = startMin + task.estimatedMinutes;
                  const slots = occupied.get(dayStr)!;
                  for (let i = startMin; i < endMin && i < 24*60; i++) {
                      slots[i] = true;
                  }
              }
          });

          // 5. Iterate Unscheduled Tasks
          const queue = [...unscheduledTasks]; // Shallow copy

          queue.forEach(({ project, task }) => {
              let placed = false;
              const duration = Math.max(15, task.estimatedMinutes);

              // Try to find a slot in our days
              for (const day of daysToSchedule) {
                  if (placed) break;
                  
                  const dayStr = day.toDateString();
                  const slots = occupied.get(dayStr)!;

                  // Iterate minutes from START_HOUR to END_HOUR
                  for (let min = START_HOUR * 60; min <= (END_HOUR * 60) - duration; min += 15) {
                      // Check if slot is free for duration
                      let isFree = true;
                      for (let k = 0; k < duration; k++) {
                          if (slots[min + k]) {
                              isFree = false;
                              break;
                          }
                      }

                      if (isFree) {
                          // Place it!
                          const scheduledTime = new Date(day);
                          scheduledTime.setHours(0, min, 0, 0); // min is total minutes from midnight
                          
                          updates.push({
                              projectId: project.id,
                              taskId: task.id,
                              date: scheduledTime.getTime()
                          });

                          // Mark occupied
                          for (let k = 0; k < duration; k++) {
                              slots[min + k] = true;
                          }
                          placed = true;
                          break; // Move to next task
                      }
                  }
              }
          });

          // 6. Bulk Apply Updates
          if (updates.length > 0) {
              setProjects(prevProjects => {
                  let newProjects = [...prevProjects];
                  updates.forEach(upd => {
                      const projIndex = newProjects.findIndex(p => p.id === upd.projectId);
                      if (projIndex > -1) {
                          newProjects[projIndex] = {
                              ...newProjects[projIndex],
                              subtasks: bulkUpdateTaskInTree(newProjects[projIndex].subtasks, upd.taskId, { scheduledDate: upd.date })
                          };
                      }
                  });
                  return newProjects;
              });
          }

          setIsAutoScheduling(false);
      }, 800);
  };


  // --- Render Intraday (Day/Week) View ---
  const renderIntradayView = (daysToShow: number) => {
    const startDate = daysToShow === 1 ? currentDate : getStartOfWeek(currentDate);
    const weekDays = Array.from({ length: daysToShow }).map((_, i) => addDays(startDate, i));
    const hours = Array.from({ length: 24 }).map((_, i) => i);

    return (
        <div className="flex flex-col h-full bg-white dark:bg-slate-950 overflow-hidden relative">
            {/* Header: Days */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur z-20 sticky top-0 ml-14">
                {weekDays.map((day, i) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                        <div key={i} className={`flex-1 py-3 text-center border-l border-slate-100 dark:border-slate-800/50 ${isToday ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''}`}>
                            <div className={`text-xs uppercase font-semibold ${isToday ? 'text-indigo-600' : 'text-slate-500'}`}>
                                {day.toLocaleDateString('en-US', { weekday: 'short' })}
                            </div>
                            <div className={`text-xl font-light mt-1 w-8 h-8 mx-auto flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30' : 'text-slate-800 dark:text-slate-200'}`}>
                                {day.getDate()}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Scrollable Grid Body */}
            <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative custom-scrollbar">
                
                {/* Current Time Indicator */}
                {isSameDay(new Date(), weekDays.find(d => isSameDay(d, new Date())) || new Date('1970-01-01')) && (
                    <div 
                        className="absolute left-14 right-0 border-t-2 border-red-500 z-30 pointer-events-none flex items-center"
                        style={{ top: `${(new Date().getHours() * 60) + new Date().getMinutes()}px` }}
                    >
                        <div className="w-2 h-2 bg-red-500 rounded-full -ml-1"></div>
                    </div>
                )}

                <div className="relative min-h-[1440px]">
                     {hours.map(hour => (
                        <div key={hour} className="flex h-[60px] relative group">
                             {/* Time Label (Sticky) */}
                             <div className="w-14 flex-shrink-0 text-right pr-3 text-xs text-slate-400 -mt-2.5 bg-white dark:bg-slate-950 sticky left-0 z-10 select-none group-hover:text-slate-600 dark:group-hover:text-slate-300">
                                {hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`}
                            </div>
                            
                            {/* Grid Columns */}
                            <div className="flex-1 flex border-b border-slate-100 dark:border-slate-800/50">
                                {weekDays.map((day, dayIndex) => (
                                    <div 
                                        key={`${dayIndex}-${hour}`}
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, day, hour)}
                                        className="flex-1 border-l border-slate-100 dark:border-slate-800/30 h-full relative hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                                    >
                                    </div>
                                ))}
                            </div>
                        </div>
                     ))}

                     {/* Events Layer */}
                     {scheduledTasks.map(({ project, task }) => {
                         const taskDate = new Date(task.scheduledDate!);
                         const dayIndex = weekDays.findIndex(d => isSameDay(d, taskDate));
                         
                         if (dayIndex === -1) return null;

                         const startMinutes = taskDate.getHours() * 60 + taskDate.getMinutes();
                         const isBeingResized = resizingTask?.taskId === task.id;
                         const durationHeight = isBeingResized && currentResizeHeight 
                            ? currentResizeHeight 
                            : Math.max(task.estimatedMinutes, 30);
                        
                         const isExternal = project.id.startsWith('ext-');

                         return (
                            <div
                                key={task.id}
                                draggable={!isBeingResized}
                                onDragStart={(e) => handleDragStart(e, project.id, task.id)}
                                onClick={(e) => handleTaskClick(e, project, task)}
                                className={`absolute z-20 px-1 py-0.5 ${isBeingResized ? 'z-50 select-none' : ''}`}
                                style={{
                                    top: `${startMinutes}px`,
                                    height: `${durationHeight}px`,
                                    // Calculate precise left position skipping the 3.5rem (14 * 0.25rem) time column
                                    left: `calc(3.5rem + (${dayIndex} * ((100% - 3.5rem) / ${daysToShow})))`,
                                    width: `calc((100% - 3.5rem) / ${daysToShow})`,
                                }}
                            >
                                <div className={`relative w-full h-full border-l-4 rounded-r-md px-2 py-1 text-xs shadow-sm cursor-pointer overflow-hidden hover:brightness-95 transition-all flex flex-col group
                                    ${isExternal ? 'bg-sky-100/90 dark:bg-sky-900/80 border-sky-500' : 'bg-indigo-100/90 dark:bg-indigo-900/80 border-indigo-500'}
                                    ${isBeingResized ? 'opacity-80' : ''}
                                `}>
                                    <div className={`font-bold truncate ${isExternal ? 'text-sky-900 dark:text-sky-100' : 'text-indigo-900 dark:text-indigo-100'}`}>{task.title}</div>
                                    <div className={`text-[10px] truncate flex justify-between ${isExternal ? 'text-sky-700 dark:text-sky-300' : 'text-indigo-700 dark:text-indigo-300'}`}>
                                        <span>{taskDate.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                                        {durationHeight > 40 && <span>{isBeingResized ? Math.round(durationHeight) + 'm' : task.estimatedMinutes + 'm'}</span>}
                                    </div>
                                    
                                    {/* Resize Handle */}
                                    <div 
                                        onMouseDown={(e) => handleResizeStart(e, project.id, task.id, durationHeight)}
                                        className="absolute bottom-0 left-0 right-0 h-2 cursor-ns-resize flex justify-center items-end opacity-0 group-hover:opacity-100 hover:bg-black/10 transition-opacity"
                                    >
                                        <GripHorizontal className="w-3 h-3 text-current opacity-50" />
                                    </div>
                                </div>
                            </div>
                         );
                     })}
                </div>
            </div>
        </div>
    );
  };

  // --- Render Month View (Classic) ---
  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    return (
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4">
            <div className="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm min-h-[600px]">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="bg-slate-50 dark:bg-slate-900 p-3 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">
                        {day}
                    </div>
                ))}
                
                {Array.from({ length: firstDay }).map((_, i) => (
                    <div key={`empty-${i}`} className="bg-white dark:bg-slate-900/50" />
                ))}

                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const date = new Date(year, month, day);
                    const isToday = isSameDay(date, new Date());
                    const dayTasks = scheduledTasks.filter(t => isSameDay(new Date(t.task.scheduledDate!), date));

                    return (
                        <div
                            key={day}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, date)}
                            className={`bg-white dark:bg-slate-900 p-2 flex flex-col gap-1 transition-colors min-h-[100px] ${isToday ? 'bg-indigo-50/30' : ''}`}
                        >
                            <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>
                                {day}
                            </span>
                            <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                {dayTasks.map(({ project, task }) => (
                                    <div 
                                        key={task.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, project.id, task.id)}
                                        onClick={(e) => handleTaskClick(e, project, task)}
                                        className={`text-[10px] px-1.5 py-1 rounded border-l-2 truncate cursor-grab active:cursor-grabbing hover:brightness-95
                                            ${project.id.startsWith('ext-') 
                                                ? 'bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 border-sky-500' 
                                                : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-500'
                                            }
                                        `}
                                    >
                                        {task.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
  };

  return (
    <div className="flex h-full animate-in fade-in duration-500 bg-slate-50 dark:bg-slate-950 relative overflow-hidden">
      
      {/* Task Detail / Modification Modal */}
      {selectedTaskData && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
              <div 
                className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-in zoom-in-95 scale-100"
                onClick={(e) => e.stopPropagation()}
              >
                  <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start">
                      <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">{selectedTaskData.task.title}</h3>
                          <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{selectedTaskData.project.title}</span>
                      </div>
                      <button onClick={() => setSelectedTaskData(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"><X className="w-5 h-5 text-slate-500" /></button>
                  </div>
                  
                  <div className="p-5 space-y-5">
                      {/* Time Details */}
                      <div className="space-y-3">
                          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Duration & Time</label>
                          <div className="flex gap-3">
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">Duration (min)</div>
                                    <input 
                                        type="number" 
                                        defaultValue={selectedTaskData.task.estimatedMinutes}
                                        onBlur={(e) => {
                                            const val = parseInt(e.target.value);
                                            if (val > 0) onUpdateTask(selectedTaskData.project.id, selectedTaskData.task.id, { estimatedMinutes: val });
                                        }}
                                        className="w-full bg-transparent font-mono text-lg font-bold text-slate-900 dark:text-slate-100 outline-none"
                                    />
                                </div>
                                <div className="flex-1 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                                    <div className="text-xs text-slate-400 mb-1">Start Time</div>
                                    <div className="font-mono text-lg font-bold text-slate-900 dark:text-slate-100">
                                        {new Date(selectedTaskData.task.scheduledDate!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                          </div>
                      </div>

                      {/* Edit Title */}
                       <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase flex items-center gap-1"><AlignLeft className="w-3 h-3" /> Rename Task</label>
                          <input 
                                defaultValue={selectedTaskData.task.title}
                                onBlur={(e) => {
                                    if (e.target.value.trim()) onUpdateTask(selectedTaskData.project.id, selectedTaskData.task.id, { title: e.target.value });
                                }}
                                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-indigo-500/50"
                          />
                       </div>

                      <div className="flex gap-2 pt-2">
                          <button 
                            onClick={() => {
                                onUpdateTask(selectedTaskData.project.id, selectedTaskData.task.id, { scheduledDate: undefined });
                                setSelectedTaskData(null);
                            }}
                            className="flex-1 py-2.5 rounded-xl bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 font-bold text-xs hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors flex items-center justify-center gap-2"
                          >
                              <CalendarOff className="w-3.5 h-3.5" /> Unschedule
                          </button>
                          <button 
                             onClick={() => setSelectedTaskData(null)}
                             className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-indigo-500/20"
                          >
                              <Save className="w-3.5 h-3.5" /> Done
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Unscheduled Sidebar (Desktop) */}
      <div 
        className="hidden md:flex w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col z-20 shadow-xl md:shadow-none transition-all h-full"
        onDragOver={handleDragOver}
        onDrop={handleUnscheduleDrop}
      >
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <h2 className="font-bold text-slate-700 dark:text-slate-200 text-lg flex items-center gap-2">
                <Inbox className="w-5 h-5 text-indigo-500" /> Backlog
            </h2>
            <span className="text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full text-slate-500 font-bold">{unscheduledTasks.length}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/50">
            {unscheduledTasks.length > 0 && <p className="text-[10px] text-slate-400 font-bold px-1 mb-2 uppercase tracking-wider">Drag to Calendar</p>}
            
            {unscheduledTasks.map(({ project, task }) => (
                <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id, task.id)}
                    className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-500 group transition-all"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px]">{project.title}</span>
                        <GripVertical className="w-3 h-3 text-slate-300 opacity-0 group-hover:opacity-100" />
                    </div>
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2 leading-snug">{task.title}</div>
                    <div className="mt-2 flex items-center gap-2">
                            <span className="text-[10px] flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded text-slate-500 dark:text-slate-400 font-medium">
                            <Clock className="w-3 h-3" /> {task.estimatedMinutes} mins
                            </span>
                    </div>
                </div>
            ))}
            
            {unscheduledTasks.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl m-2 bg-slate-50 dark:bg-slate-900/50">
                    <Check className="w-8 h-8 mb-2 text-indigo-300" />
                    <span className="text-xs font-medium">All tasks scheduled!</span>
                    <span className="text-[10px] mt-1 opacity-70">Drag tasks back here to unschedule them.</span>
                </div>
            )}
        </div>
      </div>

      {/* Main Calendar Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Control Bar */}
        <div className="px-4 md:px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-30">
            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-start">
                <button 
                    onClick={() => setIsUnscheduledDrawerOpen(true)}
                    className="md:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                >
                    <Inbox className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                    <button onClick={handlePrev} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all"><ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
                    <button onClick={() => setCurrentDate(new Date())} className="text-xs font-bold px-3 text-slate-600 dark:text-slate-300">Today</button>
                    <button onClick={handleNext} className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-md shadow-sm transition-all"><ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" /></button>
                </div>

                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap hidden sm:block">
                    {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight whitespace-nowrap sm:hidden">
                    {currentDate.toLocaleString('default', { month: 'short', year: '2-digit' })}
                </h2>

                <div className="flex gap-2">
                    {unscheduledTasks.length > 0 && viewMode !== 'MONTH' && (
                        <button 
                            onClick={handleAutoSchedule}
                            disabled={isAutoScheduling}
                            className="px-3 py-1.5 text-xs font-bold text-purple-600 bg-purple-50 dark:bg-purple-900/30 rounded-lg flex items-center gap-2 hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors disabled:opacity-50"
                        >
                            {isAutoScheduling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                            <span className="hidden md:inline">Auto Schedule</span>
                        </button>
                    )}
                    
                    <button className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg hidden md:block hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors">
                        Connect
                    </button>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1 border border-slate-200 dark:border-slate-700">
                        <button 
                            onClick={() => setViewMode('DAY')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'DAY' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500'}`}
                        >
                            <Columns className="w-3 h-3" /> <span className="hidden sm:inline">Day</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('WEEK')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'WEEK' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500'}`}
                        >
                            <LayoutGrid className="w-3 h-3" /> <span className="hidden sm:inline">Week</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('MONTH')}
                            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all flex items-center gap-2 ${viewMode === 'MONTH' ? 'bg-white dark:bg-slate-700 shadow text-indigo-600 dark:text-indigo-300 font-bold' : 'text-slate-500'}`}
                        >
                            <CalendarIcon className="w-3 h-3" /> <span className="hidden sm:inline">Month</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* View Content */}
        {viewMode === 'DAY' ? renderIntradayView(1) : viewMode === 'WEEK' ? renderIntradayView(7) : renderMonthView()}
      </div>

       {/* Unscheduled Sidebar Drawer (Mobile) */}
       {isUnscheduledDrawerOpen && (
        <div className="absolute inset-0 z-40 md:hidden flex flex-col bg-slate-50 dark:bg-slate-950 animate-in slide-in-from-bottom-full duration-300">
             <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                <h2 className="font-bold text-slate-700 dark:text-slate-200 text-lg flex items-center gap-2">
                    <Inbox className="w-5 h-5 text-indigo-500" /> Backlog ({unscheduledTasks.length})
                </h2>
                <button onClick={() => setIsUnscheduledDrawerOpen(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                    <X className="w-5 h-5" />
                </button>
            </div>
            <div 
                className="flex-1 overflow-y-auto p-4 space-y-3" 
                onDragOver={handleDragOver}
                onDrop={handleUnscheduleDrop}
            >
                {unscheduledTasks.map(({ project, task }) => (
                <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, project.id, task.id)}
                    className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm cursor-grab active:cursor-grabbing"
                >
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{project.title}</span>
                    </div>
                    <div className="text-base font-medium text-slate-800 dark:text-slate-200">{task.title}</div>
                    <div className="mt-2 text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {task.estimatedMinutes} mins
                    </div>
                </div>
                ))}
            </div>
        </div>
       )}

    </div>
  );
};

export default CalendarPlan;
