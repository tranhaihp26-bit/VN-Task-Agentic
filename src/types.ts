export type Priority = 'urgent' | 'high' | 'medium' | 'low';
export type RecurrencePattern = 'none' | 'daily' | 'weekly' | 'monthly';
export type TaskStatus = 'pending' | 'in_progress' | 'review' | 'completed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface Task {
  id: string;
  documentNumber?: string; // Số hiệu văn bản / Mã hồ sơ (VD: 142/BC-UBND)
  title: string;
  description?: string;
  category: string; // Lĩnh vực công tác
  assignee?: string; // Đơn vị / Cán bộ chủ trì
  priority: Priority;
  status?: TaskStatus; // Trạng thái xử lý hồ sơ
  dueDate: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  completed: boolean;
  tags: string[]; // tag ids
  subtasks?: SubTask[];
  recurrence?: RecurrencePattern;
  googleTaskId?: string;
  timeSpent?: number; // total seconds spent working on this task
  createdAt: string;
}

export interface MeetingRecord {
  id: string;
  title: string;
  date: string;
  transcript: string;
  summary: string;
  keyPoints: string[];
  actionItems: { title: string; assignee: string; priority: Priority }[];
  sentiment: string;
}

export interface WeeklyReport {
  productivityScore: number;
  performanceSummary: string;
  strengths: string[];
  improvements: string[];
  recommendations: string[];
}

export interface UserSettings {
  darkMode: boolean;
  notificationsEnabled: boolean;
  reminderMinutesBefore: number;
  mcpEndpoint?: string;
  mcpApiKey?: string;
  autoSyncGoogleTasks: boolean;
}
