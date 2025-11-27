
// Data Models

export enum TaskStatus {
  TODO = 'TODO',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
}

export type Priority = 'P1' | 'P2' | 'P3' | 'P4'; // Todoist style priorities

export type PriorityQuadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4' | null;

export interface SubTask {
  id: string;
  title: string;
  status: TaskStatus;
  estimatedMinutes: number;
  priority?: Priority; // Added Priority
  tags?: string[]; // Added Tags
  actualMinutes?: number; // Track actual time spent
  scheduledDate?: number; // Timestamp for calendar scheduling
  deadline?: number; // Timestamp for task deadline
  priorityQuadrant?: PriorityQuadrant; // Eisenhower Matrix
  subtasks?: SubTask[]; // Recursive nesting for Stages/Phases
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  attachments?: {
    mimeType: string;
    data: string; // Base64
  }[];
}

export interface Project {
  id: string;
  title: string;
  description: string;
  subtasks: SubTask[];
  createdAt: number;
  status: TaskStatus;
  suggestedResources?: string[];
  chatHistory: ChatMessage[]; // Store chat history per project
  totalEstimatedMinutes?: number; // Project-level estimation
}

export interface FocusSession {
  id: string;
  projectId: string;
  subtaskId?: string;
  startTime: number;
  endTime?: number;
  durationMinutes: number;
  actualDurationMinutes: number;
  interruptionReason?: string;
  completed: boolean;
}

export type ViewMode = 'PLANNER' | 'CALENDAR' | 'FOCUS' | 'DASHBOARD';

export type Theme = 'light' | 'dark' | 'system';

export interface DistractionLog {
  timestamp: number;
  reason: string;
}

// Stats for dashboard
export interface DailyStats {
  date: string;
  minutesFocused: number;
  tasksCompleted: number;
}

export interface AgentAnalysisResponse {
  text: string;
  chartData?: { name: string; value: number }[];
  chartType?: 'bar' | 'line' | 'pie';
  chartTitle?: string;
}

export interface AudioState {
  isPlaying: boolean;
  isMuted: boolean;
  currentSoundId: string;
  currentSoundUrl: string;
  volume: number;
}

export interface CustomSound {
  id: string;
  name: string;
  url: string;
}
