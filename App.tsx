
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Planner from './components/Planner';
import FocusTimer from './components/FocusTimer';
import Dashboard from './components/Dashboard';
import CalendarPlan from './components/CalendarPlan';
import { ViewMode, Project, SubTask, FocusSession, TaskStatus, Theme, AudioState, CustomSound } from './types';

// Recursive helper to find all sessions from nested tasks
const getAllSessionsFromProject = (project: Project): SubTask[] => {
    const tasks: SubTask[] = [];
    const traverse = (subtasks: SubTask[]) => {
        subtasks.forEach(t => {
            tasks.push(t);
            if (t.subtasks) traverse(t.subtasks);
        });
    };
    traverse(project.subtasks);
    return tasks;
};

// Helper to generate mock data
const generateMockHistory = (): FocusSession[] => {
    const history: FocusSession[] = [];
    const now = Date.now();
    const day = 86400000;
    
    // 1. Today (3 sessions)
    history.push(
        { id: 't1', projectId: 'general', startTime: now - (1000 * 60 * 30), durationMinutes: 25, actualDurationMinutes: 25, completed: true },
        { id: 't2', projectId: 'general', startTime: now - (1000 * 60 * 90), durationMinutes: 25, actualDurationMinutes: 25, completed: true },
        { id: 't3', projectId: 'general', startTime: now - (1000 * 60 * 150), durationMinutes: 50, actualDurationMinutes: 20, completed: false, interruptionReason: 'Slack Message' }
    );

    // 2. This Week (Last 7 Days)
    for (let i = 1; i < 7; i++) {
        const sessionsPerDay = Math.floor(Math.random() * 4) + 1; // 1-4 sessions
        for (let j = 0; j < sessionsPerDay; j++) {
            history.push({
                id: `w${i}-${j}`,
                projectId: 'general',
                startTime: now - (day * i) - (j * 3600000), // Spread out
                durationMinutes: 25,
                actualDurationMinutes: Math.random() > 0.8 ? 15 : 25, // Occasional distractions
                completed: Math.random() > 0.2,
                interruptionReason: Math.random() > 0.8 ? 'Social Media' : undefined
            });
        }
    }

    // 3. This Month (Previous 3 weeks)
    for (let i = 7; i < 30; i++) {
        if (Math.random() > 0.3) { // Skip some days
             const sessionsPerDay = Math.floor(Math.random() * 3) + 1;
             for (let j = 0; j < sessionsPerDay; j++) {
                history.push({
                    id: `m${i}-${j}`,
                    projectId: 'general',
                    startTime: now - (day * i) - (j * 3600000),
                    durationMinutes: 25,
                    actualDurationMinutes: 25,
                    completed: true
                });
             }
        }
    }

    // 4. This Year (Previous months)
    for (let i = 1; i < 12; i++) {
        // Add bulk sessions for previous months to show trends
        const sessionsInMonth = Math.floor(Math.random() * 10) + 5;
        const monthOffset = day * 30 * i;
        for (let j = 0; j < sessionsInMonth; j++) {
             history.push({
                id: `y${i}-${j}`,
                projectId: 'general',
                startTime: now - monthOffset - (j * day),
                durationMinutes: 25,
                actualDurationMinutes: 25,
                completed: true
            });
        }
    }

    return history;
};

const GENERAL_PROJECT: Project = {
  id: 'general',
  title: 'Deep Work',
  description: 'Unstructured high-focus session',
  subtasks: [],
  createdAt: Date.now(),
  status: TaskStatus.IN_PROGRESS,
  chatHistory: []
};

const INBOX_PROJECT: Project = {
  id: 'inbox',
  title: 'Inbox',
  description: 'Default container for simple tasks',
  subtasks: [],
  createdAt: Date.now(),
  status: TaskStatus.IN_PROGRESS,
  chatHistory: []
};

// Global Timer State Interface
export interface TimerState {
    isActive: boolean;
    startTime: number | null; // When the current session started
    endTime: number | null;   // When the timer is targeted to end
    duration: number;         // Total duration in seconds
    projectId: string;
    subtaskId?: string;
}

const DEFAULT_SOUND_URL = "https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg";

// Helper to Recursively Find and Update a Task
const recursiveUpdate = (tasks: SubTask[], targetId: string, updater: (t: SubTask) => SubTask): SubTask[] => {
    return tasks.map(t => {
        if (t.id === targetId) return updater(t);
        if (t.subtasks) return { ...t, subtasks: recursiveUpdate(t.subtasks, targetId, updater) };
        return t;
    });
};

// Helper to Find a Task by ID recursively
const findTaskById = (tasks: SubTask[], id: string): SubTask | undefined => {
    for (const t of tasks) {
        if (t.id === id) return t;
        if (t.subtasks) {
            const found = findTaskById(t.subtasks, id);
            if (found) return found;
        }
    }
    return undefined;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewMode>('PLANNER');
  const [projects, setProjects] = useState<Project[]>([INBOX_PROJECT]);
  const [history, setHistory] = useState<FocusSession[]>(generateMockHistory());
  const [theme, setTheme] = useState<Theme>('system');

  // --- Hoisted Global Timer State ---
  const [timerState, setTimerState] = useState<TimerState>({
      isActive: false,
      startTime: null,
      endTime: null,
      duration: 25 * 60, // Default 25m
      projectId: 'general',
      subtaskId: undefined
  });

  // --- Hoisted Global Audio State ---
  const [audioState, setAudioState] = useState<AudioState>({
      isPlaying: false,
      isMuted: false,
      currentSoundId: 'rain',
      currentSoundUrl: DEFAULT_SOUND_URL,
      volume: 1
  });
  const [customSounds, setCustomSounds] = useState<CustomSound[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Active Context for UI (which project is "selected" in the timer view, even if timer not running)
  const [activeContextProject, setActiveContextProject] = useState<Project>(GENERAL_PROJECT);
  const [activeContextSubtask, setActiveContextSubtask] = useState<SubTask | undefined>(undefined);

  // Audio Sync Effect
  useEffect(() => {
    if (audioRef.current) {
        // Sync Volume
        audioRef.current.volume = audioState.volume;
        // Sync Mute
        audioRef.current.muted = audioState.isMuted;
        
        // Sync Source if changed (handled mostly by React prop update, but ensuring logic)
        
        // Sync Play/Pause
        if (audioState.isPlaying) {
            // Promise handling to avoid race conditions
            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.catch(error => {
                    console.warn("Audio playback failed:", error);
                    // Optional: revert state if autoplay blocked
                });
            }
        } else {
            audioRef.current.pause();
        }
    }
  }, [audioState.isPlaying, audioState.isMuted, audioState.volume, audioState.currentSoundUrl]);

  // Theme Handling
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
        if (theme === 'dark') {
            root.classList.add('dark');
        } else if (theme === 'light') {
            root.classList.remove('dark');
        } else if (theme === 'system') {
            if (mediaQuery.matches) {
                root.classList.add('dark');
            } else {
                root.classList.remove('dark');
            }
        }
    };

    applyTheme();

    // Listener for system changes
    const handleChange = () => {
        if (theme === 'system') applyTheme();
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const handleStartFocus = (project: Project, subtask?: SubTask) => {
    // Switch view and set the UI context
    setActiveContextProject(project);
    setActiveContextSubtask(subtask);
    
    // If timer is NOT running, prep it with this task's duration
    if (!timerState.isActive) {
        setTimerState(prev => ({
            ...prev,
            projectId: project.id,
            subtaskId: subtask?.id,
            duration: subtask ? subtask.estimatedMinutes * 60 : 25 * 60
        }));
    }
    setView('FOCUS');
  };

  const handleSessionComplete = (session: FocusSession) => {
    setHistory(prev => [session, ...prev]);
    
    // Update task status and ACTUAL time taken
    if (session.projectId && session.subtaskId) {
      setProjects(prev => prev.map(p => {
        if (p.id !== session.projectId) return p;
        
        // Recursive update to find the task deep in the tree
        const newSubtasks = recursiveUpdate(p.subtasks, session.subtaskId!, (t) => ({
            ...t,
            status: session.completed ? TaskStatus.COMPLETED : t.status,
            actualMinutes: (t.actualMinutes || 0) + session.actualDurationMinutes
        }));

        return { ...p, subtasks: newSubtasks };
      }));
    }

    // Reset Timer State
    setTimerState({
        isActive: false,
        startTime: null,
        endTime: null,
        duration: 25 * 60,
        projectId: 'general',
        subtaskId: undefined
    });
    
    // Stop audio on session complete (optional, but good UX)
    setAudioState(prev => ({ ...prev, isPlaying: false }));

    setView('DASHBOARD');
  };

  const handleScheduleTask = (projectId: string, taskId: string, date: number) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
            ...p,
            subtasks: recursiveUpdate(p.subtasks, taskId, (t) => ({ ...t, scheduledDate: date }))
        };
    }));
  };

  const handleUpdateTask = (projectId: string, taskId: string, updates: Partial<SubTask>) => {
    setProjects(prev => prev.map(p => {
        if (p.id !== projectId) return p;
        return {
            ...p,
            subtasks: recursiveUpdate(p.subtasks, taskId, (t) => ({ ...t, ...updates }))
        };
    }));
  };

  // Check if we need to sync activeContext with running timer
  useEffect(() => {
      if (timerState.isActive) {
          // If timer is running, ensure the UI reflects the running project
          const runningProject = projects.find(p => p.id === timerState.projectId) || GENERAL_PROJECT;
          let runningSubtask = undefined;
          if (timerState.subtaskId) {
              runningSubtask = findTaskById(runningProject.subtasks, timerState.subtaskId);
          }
          setActiveContextProject(runningProject);
          setActiveContextSubtask(runningSubtask);
      }
  }, [timerState.isActive, timerState.projectId, timerState.subtaskId, projects]);

  const renderContent = () => {
    switch (view) {
      case 'PLANNER':
        return (
          <Planner 
            projects={projects} 
            setProjects={setProjects} 
            onStartFocus={handleStartFocus} 
          />
        );
      case 'CALENDAR':
        return (
            <CalendarPlan 
                projects={projects} 
                setProjects={setProjects}
                onScheduleTask={handleScheduleTask}
                onUpdateTask={handleUpdateTask}
            />
        );
      case 'FOCUS':
        return (
          <FocusTimer 
            projects={projects}
            // Pass the Hoisted Timer State
            timerState={timerState}
            setTimerState={setTimerState}
            // Pass Hoisted Audio State
            audioState={audioState}
            setAudioState={setAudioState}
            customSounds={customSounds}
            setCustomSounds={setCustomSounds}
            // Pass UI Context
            activeContextProject={activeContextProject}
            activeContextSubtask={activeContextSubtask}
            setActiveContextProject={setActiveContextProject}
            setActiveContextSubtask={setActiveContextSubtask}
            
            onSessionComplete={handleSessionComplete}
            onExit={() => setView('PLANNER')}
          />
        );
      case 'DASHBOARD':
        return <Dashboard history={history} />;
      default:
        return <div>Not Found</div>;
    }
  };

  return (
    <Layout 
        currentView={view} 
        setView={setView} 
        theme={theme} 
        setTheme={setTheme} 
        isTimerActive={timerState.isActive}
    >
      {/* Global Persisted Audio Element */}
      <audio 
        ref={audioRef} 
        src={audioState.currentSoundUrl} 
        loop 
        crossOrigin="anonymous" 
      />
      
      {renderContent()}
    </Layout>
  );
};

export default App;
