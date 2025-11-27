
import React, { useState, useEffect, useRef } from 'react';
import { Project, SubTask, FocusSession, TaskStatus, AudioState, CustomSound } from '../types';
import { Play, Pause, Square, AlertCircle, Check, X, Music, ChevronDown, Volume2, VolumeX, CloudRain, Coffee, Wind, Waves, Briefcase, Zap, Plus, CornerDownRight } from 'lucide-react';
import { getContextualAssistance } from '../services/geminiService';
import { TimerState } from '../App'; 

interface FocusTimerProps {
  projects: Project[];
  
  // Global Timer State Props
  timerState: TimerState;
  setTimerState: React.Dispatch<React.SetStateAction<TimerState>>;
  
  // Global Audio State Props
  audioState: AudioState;
  setAudioState: React.Dispatch<React.SetStateAction<AudioState>>;
  customSounds: CustomSound[];
  setCustomSounds: React.Dispatch<React.SetStateAction<CustomSound[]>>;

  // UI Context Props
  activeContextProject: Project;
  activeContextSubtask?: SubTask;
  setActiveContextProject: (p: Project) => void;
  setActiveContextSubtask: (t: SubTask | undefined) => void;

  onSessionComplete: (session: FocusSession) => void;
  onExit: () => void;
}

const SOUNDSCAPES = [
    { id: 'rain', name: "Heavy Rain", url: "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg", icon: <CloudRain className="w-4 h-4" /> },
    { id: 'coffee', name: "Coffee Shop", url: "https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg", icon: <Coffee className="w-4 h-4" /> },
    { id: 'stream', name: "Forest Stream", url: "https://actions.google.com/sounds/v1/water/stream_water_flowing.ogg", icon: <Wind className="w-4 h-4" /> },
    { id: 'white', name: "White Noise", url: "https://actions.google.com/sounds/v1/ambiences/industrial_hum.ogg", icon: <Waves className="w-4 h-4" /> },
];

const DEFAULT_REASONS = ['Distracted by social media', 'Urgent email/Slack', 'Physical break needed', 'Task completed early'];

const FocusTimer: React.FC<FocusTimerProps> = ({ 
    projects, 
    timerState, 
    setTimerState,
    audioState,
    setAudioState,
    customSounds,
    setCustomSounds,
    activeContextProject, 
    activeContextSubtask,
    setActiveContextProject,
    setActiveContextSubtask,
    onSessionComplete, 
    onExit 
}) => {
  
  // Local Render State (Visual Ticking only)
  // We initialize timeLeft based on whether the timer is already running in App.tsx
  const calculateInitialTimeLeft = () => {
      if (timerState.isActive && timerState.endTime) {
          const remaining = Math.max(0, Math.ceil((timerState.endTime - Date.now()) / 1000));
          return remaining;
      }
      return timerState.duration;
  };

  const [timeLeft, setTimeLeft] = useState(calculateInitialTimeLeft());
  
  // UX State
  const [showStopModal, setShowStopModal] = useState(false);
  const [showTaskSelector, setShowTaskSelector] = useState(false);
  const [showSoundMenu, setShowSoundMenu] = useState(false);
  
  // Interruption State
  const [interruptionReason, setInterruptionReason] = useState('');
  const [isCustomReason, setIsCustomReason] = useState(false);
  const [customReasonInput, setCustomReasonInput] = useState('');

  // AI Advice
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Refs for Click Outside
  const musicMenuRef = useRef<HTMLDivElement>(null);
  const musicButtonRef = useRef<HTMLButtonElement>(null);
  const taskSelectorRef = useRef<HTMLDivElement>(null);
  const taskSelectorBtnRef = useRef<HTMLButtonElement>(null);

  // --- Click Outside Logic ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showSoundMenu &&
        musicMenuRef.current &&
        !musicMenuRef.current.contains(event.target as Node) &&
        musicButtonRef.current &&
        !musicButtonRef.current.contains(event.target as Node)
      ) {
        setShowSoundMenu(false);
      }
      
      if (
        showTaskSelector &&
        taskSelectorRef.current &&
        !taskSelectorRef.current.contains(event.target as Node) &&
        taskSelectorBtnRef.current &&
        !taskSelectorBtnRef.current.contains(event.target as Node)
      ) {
        setShowTaskSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSoundMenu, showTaskSelector]);

  // Fetch Advice
  useEffect(() => {
    const fetchAdvice = async () => {
      const taskName = activeContextSubtask ? activeContextSubtask.title : activeContextProject.title;
      if (taskName === 'Deep Work') return; 
      try {
        const advice = await getContextualAssistance(taskName);
        setAiAdvice(advice);
      } catch (e) { }
    };
    if (activeContextProject.id !== 'general') {
        fetchAdvice();
    }
  }, [activeContextSubtask?.id, activeContextProject.title, activeContextProject.id]);

  // --- Timer Tick Loop ---
  useEffect(() => {
    let interval: number;

    // If active in global state, tick locally
    if (timerState.isActive && timerState.endTime) {
      // Sync immediately on mount
      const syncTime = () => {
          if (!timerState.endTime) return;
          const now = Date.now();
          const remaining = Math.max(0, Math.ceil((timerState.endTime - now) / 1000));
          setTimeLeft(remaining);
          if (remaining <= 0) {
              handleFinish(true);
          }
      };
      
      syncTime(); // Immediate sync
      interval = window.setInterval(syncTime, 200); // High-res tick
    } else {
        // If not active, ensure timeLeft matches the configured duration
        setTimeLeft(timerState.duration);
    }

    return () => clearInterval(interval);
  }, [timerState.isActive, timerState.endTime, timerState.duration]);

  // --- Control Handlers ---

  const toggleTimer = () => {
    if (!timerState.isActive) {
      // START
      const now = Date.now();
      const targetEndTime = now + (timeLeft * 1000);
      
      setTimerState(prev => ({
          ...prev,
          isActive: true,
          startTime: prev.startTime || now, // Preserve start time if resuming
          endTime: targetEndTime,
          // Lock in the project context to the timer state
          projectId: activeContextProject.id,
          subtaskId: activeContextSubtask?.id
      }));
    } else {
      // PAUSE
      setTimerState(prev => ({
          ...prev,
          isActive: false,
          endTime: null,
          duration: timeLeft // Update duration to current time left for resuming
      }));
      // timeLeft state remains as is for display
    }
  };

  const handleFinish = (completed: boolean, reason?: string) => {
    // Note: Audio stopping is handled in App.tsx handleSessionComplete if needed
    
    // Calculate actual duration
    const startTime = timerState.startTime || Date.now();
    const endTime = Date.now();
    
    const estimateMins = activeContextSubtask && activeContextSubtask.estimatedMinutes > 0 ? activeContextSubtask.estimatedMinutes : 25;
    const elapsedSeconds = completed ? estimateMins * 60 : Math.floor((endTime - startTime) / 1000);

    const session: FocusSession = {
      id: crypto.randomUUID(),
      projectId: timerState.projectId, 
      subtaskId: timerState.subtaskId,
      startTime: startTime,
      endTime: endTime,
      durationMinutes: estimateMins,
      actualDurationMinutes: Math.max(1, Math.floor(elapsedSeconds / 60)),
      completed: completed,
      interruptionReason: reason
    };
    
    onSessionComplete(session);
  };

  const switchContext = (project: Project, task?: SubTask) => {
    if (timerState.isActive) return; 

    setActiveContextProject(project);
    setActiveContextSubtask(task);
    
    // If task has 0 mins (e.g. a stage), default to 25
    const newDuration = task && task.estimatedMinutes > 0 ? task.estimatedMinutes * 60 : 25 * 60;
    
    setTimerState(prev => ({
        ...prev,
        projectId: project.id,
        subtaskId: task?.id,
        duration: newDuration,
        startTime: null, // Reset session start
        endTime: null
    }));
    setTimeLeft(newDuration);
    
    setShowTaskSelector(false);
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    const newSound: CustomSound = {
        id: `custom-${Date.now()}`,
        name: file.name.length > 20 ? file.name.substring(0, 20) + '...' : file.name,
        url: objectUrl,
    };
    setCustomSounds(prev => [...prev, newSound]);
    
    // Auto-play the new sound
    setAudioState(prev => ({
        ...prev,
        currentSoundId: newSound.id,
        currentSoundUrl: newSound.url,
        isPlaying: true
    }));
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSoundSelect = (id: string, url: string) => {
      setAudioState(prev => ({
          ...prev,
          currentSoundId: id,
          currentSoundUrl: url,
          isPlaying: true // Auto play when switching
      }));
  };

  const toggleMute = () => {
      setAudioState(prev => ({ ...prev, isMuted: !prev.isMuted }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Visual Calc
  const totalDurationRef = activeContextSubtask && activeContextSubtask.estimatedMinutes > 0 ? activeContextSubtask.estimatedMinutes * 60 : 25 * 60;
  const progress = ((totalDurationRef - timeLeft) / totalDurationRef) * 100;
  
  const allSounds = [...SOUNDSCAPES, ...customSounds];
  // Determine if the current sound matches one in our lists (for icons etc)
  // We use audioState for source of truth
  const activeProjects = projects.filter(p => p.status !== TaskStatus.COMPLETED);

  // --- Recursive Render Helper ---
  const renderTaskOptions = (tasks: SubTask[], project: Project, depth: number = 0): React.ReactNode => {
      return tasks.map(task => (
          <React.Fragment key={task.id}>
              <button
                  onClick={() => switchContext(project, task)}
                  className={`w-full text-left pr-4 py-2.5 rounded-lg text-sm flex items-center justify-between mb-0.5 transition-colors group
                    ${activeContextSubtask?.id === task.id 
                        ? 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 font-medium' 
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  style={{ paddingLeft: `${16 + (depth * 16)}px` }}
              >
                  <div className="flex items-center gap-2 min-w-0">
                      {depth > 0 && <CornerDownRight className="w-3 h-3 text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                      <span className="truncate">{task.title}</span>
                  </div>
                  {activeContextSubtask?.id === task.id && <Check className="w-3.5 h-3.5 flex-shrink-0 text-indigo-500" />}
              </button>
              {task.subtasks && task.subtasks.length > 0 && renderTaskOptions(task.subtasks, project, depth + 1)}
          </React.Fragment>
      ));
  };

  if (showStopModal) {
    return (
      <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-in fade-in backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 rounded-2xl max-w-md w-full shadow-2xl">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
            <AlertCircle className="text-orange-500" />
            Interrupted?
          </h2>
          <div className="space-y-3 mb-6">
            {DEFAULT_REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => { setInterruptionReason(reason); setIsCustomReason(false); }}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${!isCustomReason && interruptionReason === reason ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'}`}
              >
                {reason}
              </button>
            ))}
            <button
                onClick={() => setIsCustomReason(true)}
                className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${isCustomReason ? 'bg-indigo-50 dark:bg-indigo-600/20 border-indigo-500 text-indigo-700 dark:text-indigo-300' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'}`}
            >
                Other...
            </button>
            {isCustomReason && (
                <div className="animate-in slide-in-from-top-2">
                    <input value={customReasonInput} onChange={(e) => setCustomReasonInput(e.target.value)} placeholder="What happened?" className="w-full bg-transparent border border-indigo-500 rounded-lg px-4 py-2 text-slate-900 dark:text-slate-100 outline-none focus:ring-2 ring-indigo-500/30" autoFocus />
                </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setShowStopModal(false)} className="flex-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Resume</button>
            <button 
                onClick={() => handleFinish(false, isCustomReason ? customReasonInput : interruptionReason || "Unknown")} 
                disabled={isCustomReason && !customReasonInput.trim()}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors"
            >
                End Session
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center justify-center h-full min-h-[100dvh] overflow-hidden bg-white dark:bg-slate-950 transition-colors duration-500 px-4">
      
      {/* --- Top Bar: Task Context --- */}
      <div className="absolute top-0 left-0 right-0 p-4 md:p-6 flex justify-between items-start z-20">
        <div className="relative mx-auto w-full max-w-md flex justify-center">
            <button 
                ref={taskSelectorBtnRef}
                onClick={() => !timerState.isActive && setShowTaskSelector(!showTaskSelector)}
                className={`group flex flex-col items-center gap-1 p-2 rounded-xl transition-all max-w-full ${timerState.isActive ? 'cursor-default' : 'hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer'}`}
            >
                <span className="text-[10px] uppercase tracking-[0.2em] font-bold text-slate-400 group-hover:text-indigo-500 transition-colors">
                    {timerState.isActive ? 'Locked on' : 'Focusing On'}
                </span>
                <div className="flex items-center gap-2 max-w-full">
                    <span className="text-base md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-[200px] md:max-w-xs">
                        {activeContextSubtask?.title || activeContextProject.title}
                    </span>
                    {!timerState.isActive && <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-300 ${showTaskSelector ? 'rotate-180' : ''}`} />}
                </div>
            </button>

            {/* Global Task Selector Dropdown */}
            {!timerState.isActive && (
                <div 
                    ref={taskSelectorRef}
                    className={`absolute top-full left-1/2 -translate-x-1/2 mt-2 w-[90vw] md:w-96 max-h-[60vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-30 p-2 custom-scrollbar transition-all duration-300 cubic-bezier(0.16, 1, 0.3, 1) origin-top ${showTaskSelector ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'}`}
                >
                        <button
                            onClick={() => switchContext({ id: 'general', title: 'Deep Work', description: 'General Focus', subtasks: [], createdAt: Date.now(), status: 'IN_PROGRESS' as any, chatHistory: [] })}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm flex items-center gap-3 font-medium transition-colors mb-2 ${activeContextProject.id === 'general' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                        >
                            <div className="p-1.5 bg-indigo-100 dark:bg-indigo-900/40 rounded-lg"><Zap className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /></div>
                            <span>Unstructured Deep Work</span>
                            {activeContextProject.id === 'general' && <Check className="w-4 h-4 ml-auto" />}
                        </button>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-2" />
                        {activeProjects.length > 0 ? (
                            activeProjects.map(project => (
                                <div key={project.id} className="mb-3">
                                    <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-white dark:bg-slate-900 z-10">
                                        <Briefcase className="w-3 h-3" />{project.title}
                                    </div>
                                    {project.subtasks.length > 0 ? (
                                        renderTaskOptions(project.subtasks, project)
                                    ) : (<div className="px-4 py-2 text-xs text-slate-400 italic pl-8">No tasks</div>)}
                                </div>
                            ))
                        ) : (<div className="px-4 py-4 text-center text-slate-400 text-sm">No active projects</div>)}
                </div>
            )}
        </div>
        <button onClick={onExit} className="absolute right-4 top-4 md:right-6 md:top-6 p-2 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-colors z-30"><X className="w-6 h-6" /></button>
      </div>

      {/* --- Main Timer Ring --- */}
      <div className="relative z-10 flex flex-col items-center w-full">
        <div className="relative w-[70vw] h-[70vw] max-w-[300px] max-h-[300px] md:max-w-[420px] md:max-h-[420px] flex items-center justify-center mb-8 md:mb-12">
            {timerState.isActive && <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-[60px] md:blur-[80px] animate-pulse transition-all duration-1000" />}
            <svg className="absolute w-full h-full transform -rotate-90">
                <circle cx="50%" cy="50%" r="45%" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100 dark:text-slate-800/50" />
                <circle cx="50%" cy="50%" r="45%" stroke="url(#gradient)" strokeWidth="4" fill="transparent" strokeLinecap="round" className={`transition-all duration-1000 ease-linear ${timerState.isActive ? 'opacity-100' : 'opacity-30'}`} style={{ strokeDasharray: '283%', strokeDashoffset: `${(progress / 100) * 283}%` }} />
                <defs><linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor="#6366f1"><animate attributeName="stop-color" values="#6366f1;#ec4899;#6366f1" dur="4s" repeatCount="indefinite" /></stop><stop offset="100%" stopColor="#a855f7"><animate attributeName="stop-color" values="#a855f7;#3b82f6;#a855f7" dur="4s" repeatCount="indefinite" /></stop></linearGradient></defs>
            </svg>
            <div className="flex flex-col items-center z-10 select-none">
                <div className="text-[14vw] md:text-[7rem] font-mono font-medium text-slate-900 dark:text-slate-100 tracking-tighter tabular-nums leading-none">{formatTime(timeLeft)}</div>
            </div>
        </div>

        {/* --- Unified Control Bar --- */}
        <div className="flex items-center gap-4 md:gap-6 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md px-6 py-4 md:px-8 md:py-6 rounded-[2rem] md:rounded-[2.5rem] border border-slate-200/50 dark:border-slate-800/50 shadow-2xl shadow-indigo-500/5 ring-1 ring-white/50 dark:ring-slate-800/50 relative scale-90 md:scale-100">
            <button onClick={() => setShowStopModal(true)} className="w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all border border-transparent hover:border-red-200 dark:hover:border-red-800/50" title="End Session"><Square className="w-5 h-5 md:w-6 md:h-6 fill-current" /></button>
            <button onClick={toggleTimer} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl transition-all shadow-xl active:scale-95 ${timerState.isActive ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-indigo-500 shadow-indigo-500/20' : 'bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/40 hover:shadow-indigo-500/60'}`}>{timerState.isActive ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}</button>
            <div className="relative">
                <button ref={musicButtonRef} onClick={() => setShowSoundMenu(!showSoundMenu)} className={`w-14 h-14 md:w-16 md:h-16 flex items-center justify-center rounded-2xl transition-all border ${audioState.isPlaying ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 border-indigo-200 dark:border-indigo-700' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-indigo-500 hover:bg-slate-50 dark:hover:bg-slate-700 border-transparent hover:border-indigo-200 dark:hover:border-indigo-800'}`} title="Soundscape">{audioState.isPlaying ? <div className="flex gap-1 items-end h-5"><span className="w-1 bg-current animate-[bounce_1s_infinite] h-2"></span><span className="w-1 bg-current animate-[bounce_1.2s_infinite] h-5"></span><span className="w-1 bg-current animate-[bounce_0.8s_infinite] h-3"></span></div> : <Music className="w-5 h-5 md:w-6 md:h-6" />}</button>
                 <div ref={musicMenuRef} className={`absolute left-1/2 -translate-x-1/2 bottom-full mb-4 md:mb-0 md:bottom-0 md:left-full md:ml-4 md:translate-x-0 w-60 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 transition-all duration-200 ease-out origin-bottom md:origin-bottom-left ${showSoundMenu ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-2 md:translate-x-2 pointer-events-none'}`}>
                    <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800 mb-1"><span className="text-[10px] font-bold text-slate-500 uppercase">Ambience</span><button onClick={toggleMute} className={`p-1 rounded-md transition-colors ${audioState.isMuted ? 'text-red-400 bg-red-400/10' : 'text-slate-400 hover:text-indigo-400 hover:bg-slate-800'}`} title={audioState.isMuted ? "Unmute" : "Mute"}>{audioState.isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}</button></div>
                    <div className="max-h-64 overflow-y-auto custom-scrollbar space-y-0.5">
                         {SOUNDSCAPES.map(sound => (
                            <button 
                                key={sound.id} 
                                onClick={() => handleSoundSelect(sound.id, sound.url)} 
                                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${audioState.currentSoundId === sound.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                            >
                                <div className={`${audioState.currentSoundId === sound.id ? 'text-indigo-400' : 'text-slate-500'}`}>{sound.icon}</div>
                                <span className="font-medium flex-1 text-left truncate">{sound.name}</span>
                                {audioState.isPlaying && audioState.currentSoundId === sound.id && !audioState.isMuted && <Volume2 className="w-3 h-3 text-indigo-400" />}
                            </button>
                        ))}
                        
                        {customSounds.length > 0 && (
                            <>
                                <div className="px-3 py-1 mt-2 text-[10px] font-bold text-slate-500 uppercase">Yours</div>
                                {customSounds.map(sound => (
                                    <button 
                                        key={sound.id} 
                                        onClick={() => handleSoundSelect(sound.id, sound.url)} 
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${audioState.currentSoundId === sound.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'}`}
                                    >
                                        <div className={`${audioState.currentSoundId === sound.id ? 'text-indigo-400' : 'text-slate-500'}`}><Music className="w-4 h-4" /></div>
                                        <span className="font-medium flex-1 text-left truncate">{sound.name}</span>
                                    </button>
                                ))}
                            </>
                        )}
                        
                        <div className="h-px bg-slate-800 my-1" />
                        <input type="file" ref={fileInputRef} accept="audio/*" className="hidden" onChange={handleMusicUpload} />
                        <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:bg-slate-800 hover:text-indigo-400 transition-colors"><div className="text-slate-500 group-hover:text-indigo-400"><Plus className="w-4 h-4" /></div><span className="font-medium flex-1 text-left">Add Sound</span></button>
                        {audioState.isPlaying && <button onClick={() => setAudioState(prev => ({ ...prev, isPlaying: false }))} className="w-full text-left px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg transition-colors flex items-center gap-3"><X className="w-4 h-4" /> Stop Music</button>}
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FocusTimer;
