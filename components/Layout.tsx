
import React, { useState } from 'react';
import { ViewMode, Theme } from '../types';
import { BrainCircuit, ListTodo, Timer, BarChart3, Settings, Moon, Sun, Monitor, Menu, X, CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';

interface LayoutProps {
  currentView: ViewMode;
  setView: (view: ViewMode) => void;
  children: React.ReactNode;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isTimerActive: boolean;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setView, children, theme, setTheme, isTimerActive }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewMode; icon: any; label: string }) => (
    <button
      onClick={() => {
        setView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group relative ${
        currentView === view
          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
      } ${isCollapsed ? 'justify-center px-2' : ''}`}
      title={isCollapsed ? label : undefined}
    >
      <div className="relative flex items-center gap-3 w-full">
        <Icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-200 ${isCollapsed ? 'scale-110' : ''}`} />
        
        <span className={`font-medium whitespace-nowrap overflow-hidden transition-all duration-300 text-left ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100 flex-1'}`}>
          {label}
        </span>

        {/* Active Timer Indicator */}
        {view === 'FOCUS' && isTimerActive && (
           <span className={`flex h-2.5 w-2.5 ${isCollapsed ? 'absolute -top-1 -right-1' : 'relative ml-auto'}`}>
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
            </span>
        )}
      </div>
      
      {/* Tooltip for collapsed state */}
      {isCollapsed && (
          <div className="absolute left-full ml-4 px-3 py-1.5 bg-slate-900 text-white text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap shadow-xl">
              {label}
          </div>
      )}
    </button>
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-200 transition-colors duration-300 font-sans">
      
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 z-40 shadow-sm">
        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-500">
            <BrainCircuit className="w-6 h-6" />
            <span className="text-lg font-bold tracking-tight">FocusCore</span>
        </div>
        <div className="flex items-center gap-2">
            <button 
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
                className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
            >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
        </div>
      </div>

      {/* Mobile Sidebar Overlay Backdrop */}
      {isMobileMenuOpen && (
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col transition-all duration-300 ease-in-out md:relative
        ${isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'}
        ${isCollapsed ? 'md:w-20' : 'md:w-72'}
      `}>
        {/* Desktop Header */}
        <div className={`p-6 hidden md:flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          <div className={`flex items-center gap-3 text-indigo-600 dark:text-indigo-500 transition-all ${isCollapsed ? 'justify-center' : ''}`}>
            <BrainCircuit className="w-8 h-8 flex-shrink-0" />
            <span className={`text-xl font-bold dark:text-slate-100 text-slate-900 tracking-tight overflow-hidden whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
                FocusCore
            </span>
          </div>
        </div>

        {/* Mobile Menu Header */}
        <div className="md:hidden p-5 flex justify-between items-center border-b border-slate-200 dark:border-slate-800">
            <span className="font-bold text-lg">Menu</span>
            <button onClick={() => setIsMobileMenuOpen(false)}>
                <X className="w-5 h-5 text-slate-500" />
            </button>
        </div>
        
        <nav className="space-y-2 p-4 flex-1 overflow-y-auto custom-scrollbar">
          <NavItem view="PLANNER" icon={ListTodo} label="Agent Planner" />
          <NavItem view="CALENDAR" icon={CalendarDays} label="Calendar Plan" />
          <NavItem view="FOCUS" icon={Timer} label="Focus Timer" />
          <NavItem view="DASHBOARD" icon={BarChart3} label="Analytics" />
        </nav>

        {/* Footer */}
        <div className={`p-4 border-t border-slate-200 dark:border-slate-800 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 flex flex-col ${isCollapsed ? 'items-center' : ''}`}>
          
          {/* Theme Toggle */}
          <div className={`space-y-2 ${isCollapsed ? 'w-full flex flex-col items-center' : ''}`}>
            <span className={`text-[10px] font-bold text-slate-400 uppercase tracking-wider transition-opacity duration-300 ${isCollapsed ? 'hidden' : 'block'}`}>Appearance</span>
            
            {isCollapsed ? (
                // Collapsed Theme Button (Cycle)
                 <button 
                    onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                    className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Toggle Theme"
                >
                    {theme === 'light' ? <Sun className="w-5 h-5" /> : theme === 'dark' ? <Moon className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
                </button>
            ) : (
                // Expanded Theme Toggle
                <div className="bg-white dark:bg-slate-900 rounded-lg p-1 flex border border-slate-200 dark:border-slate-800 w-full shadow-sm">
                    <button 
                        onClick={() => setTheme('light')}
                        className={`flex-1 flex justify-center p-1.5 rounded-md text-slate-500 transition-all ${theme === 'light' ? 'bg-slate-100 dark:bg-slate-700 text-indigo-600 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-300'}`}
                        title="Light Mode"
                    >
                        <Sun className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setTheme('system')}
                        className={`flex-1 flex justify-center p-1.5 rounded-md text-slate-500 transition-all ${theme === 'system' ? 'bg-slate-100 dark:bg-slate-700 text-indigo-600 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-300'}`}
                        title="System Mode"
                    >
                        <Monitor className="w-4 h-4" />
                    </button>
                    <button 
                        onClick={() => setTheme('dark')}
                        className={`flex-1 flex justify-center p-1.5 rounded-md text-slate-500 transition-all ${theme === 'dark' ? 'bg-slate-100 dark:bg-slate-700 text-indigo-600 font-bold' : 'hover:text-slate-900 dark:hover:text-slate-300'}`}
                        title="Dark Mode"
                    >
                        <Moon className="w-4 h-4" />
                    </button>
                </div>
            )}
          </div>
          
          <div className={`flex items-center gap-3 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 ${isCollapsed ? 'justify-center w-full' : ''}`} title="Settings">
            <Settings className="w-5 h-5 flex-shrink-0" />
            <span className={`text-sm font-medium transition-all duration-300 whitespace-nowrap overflow-hidden ${isCollapsed ? 'w-0 opacity-0 hidden' : 'w-auto opacity-100'}`}>Settings</span>
          </div>

          {/* Collapse Button (Desktop Only) */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden md:flex w-full items-center justify-center p-2 mt-2 rounded-lg text-slate-400 hover:bg-white dark:hover:bg-slate-800 hover:shadow-sm hover:text-slate-900 dark:hover:text-slate-100 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>

        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden bg-slate-50 dark:bg-slate-950 pt-16 md:pt-0 relative flex flex-col">
        {children}
      </main>

    </div>
  );
};

export default Layout;
