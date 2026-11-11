import { Task, TaskStatus, Priority, RecurrencePattern } from '../types';

export interface WorkflowStageMeta {
  id: TaskStatus;
  label: string;
  shortLabel: string;
  description: string;
}

export const WORKFLOW_STAGES: WorkflowStageMeta[] = [
  {
    id: 'pending',
    label: 'Chờ tiếp nhận',
    shortLabel: 'Chờ tiếp nhận',
    description: 'Nhiệm vụ mới giao, chờ phân công thụ lý',
  },
  {
    id: 'in_progress',
    label: 'Đang thụ lý',
    shortLabel: 'Đang thụ lý',
    description: 'Đơn vị hoặc chuyên viên đang triển khai thực hiện',
  },
  {
    id: 'review',
    label: 'Trình duyệt / Thẩm định',
    shortLabel: 'Trình duyệt',
    description: 'Đã hoàn thiện dự thảo, chờ lãnh đạo thẩm định và ký duyệt',
  },
  {
    id: 'completed',
    label: 'Đã hoàn thành / Ban hành',
    shortLabel: 'Đã hoàn thành',
    description: 'Đã ban hành văn bản kết quả và đóng hồ sơ công việc',
  },
];

export const PRIORITY_LABELS: Record<Priority, string> = {
  urgent: 'Hỏa tốc',
  high: 'Trọng tâm',
  medium: 'Thường quy',
  low: 'Phối hợp',
};

export const RECURRENCE_LABELS: Record<RecurrencePattern, string> = {
  none: 'Không định kỳ',
  daily: 'Định kỳ hàng ngày',
  weekly: 'Định kỳ hàng tuần',
  monthly: 'Định kỳ hàng tháng',
};

export const ADMIN_CATEGORIES: string[] = [
  'Chỉ đạo điều hành',
  'Văn bản - Hồ sơ',
  'Hội nghị - Họp',
  'Đề án - Dự án',
  'Tổ chức - Cán bộ',
  'Tổng hợp - Báo cáo',
];

export function resolveTaskStatus(task: Task): TaskStatus {
  if (task.completed || task.status === 'completed') return 'completed';
  if (task.status === 'review') return 'review';
  if (task.status === 'in_progress') return 'in_progress';
  if ((task.timeSpent ?? 0) > 0) return 'in_progress';
  const subtasks = task.subtasks || [];
  if (subtasks.length > 0 && subtasks.some((s) => s.completed)) {
    return 'in_progress';
  }
  return task.status || 'pending';
}

export function transitionTaskStatus(task: Task, nextStatus: TaskStatus): Task {
  return {
    ...task,
    status: nextStatus,
    completed: nextStatus === 'completed',
  };
}

export function getNextWorkflowStage(current: TaskStatus): TaskStatus {
  switch (current) {
    case 'pending':
      return 'in_progress';
    case 'in_progress':
      return 'review';
    case 'review':
      return 'completed';
    case 'completed':
      return 'pending';
  }
}

export function getStageLabel(status: TaskStatus): string {
  const found = WORKFLOW_STAGES.find((s) => s.id === status);
  return found ? found.label : 'Chờ tiếp nhận';
}

export function calculateNextRecurringDate(dueDate: string, recurrence: RecurrencePattern): string {
  const parts = dueDate.split('-').map(Number);
  const dateObj =
    parts.length === 3 && !parts.some(isNaN)
      ? new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]))
      : new Date();

  if (recurrence === 'daily') {
    dateObj.setUTCDate(dateObj.getUTCDate() + 1);
  } else if (recurrence === 'weekly') {
    dateObj.setUTCDate(dateObj.getUTCDate() + 7);
  } else if (recurrence === 'monthly') {
    dateObj.setUTCMonth(dateObj.getUTCMonth() + 1);
  }

  return dateObj.toISOString().split('T')[0];
}

export function formatDurationVN(totalSeconds: number = 0): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')} giờ ${minutes.toString().padStart(2, '0')} phút`;
  }
  if (minutes > 0) {
    return `${minutes.toString().padStart(2, '0')} phút ${seconds.toString().padStart(2, '0')} giây`;
  }
  return `${seconds} giây`;
}

export interface WorkflowMetrics {
  total: number;
  pending: number;
  inProgress: number;
  review: number;
  completed: number;
  overdue: number;
  urgentPending: number;
  completionRate: number;
  totalHoursSpent: number;
}

export function computeWorkflowMetrics(tasks: Task[], todayStr?: string): WorkflowMetrics {
  const refDate = todayStr || new Date().toISOString().split('T')[0];
  let pending = 0;
  let inProgress = 0;
  let review = 0;
  let completed = 0;
  let overdue = 0;
  let urgentPending = 0;
  let totalSeconds = 0;

  for (const task of tasks) {
    const status = resolveTaskStatus(task);
    if (status === 'completed') {
      completed += 1;
    } else if (status === 'review') {
      review += 1;
    } else if (status === 'in_progress') {
      inProgress += 1;
    } else {
      pending += 1;
    }

    if (status !== 'completed') {
      if (task.dueDate < refDate) {
        overdue += 1;
      }
      if (task.priority === 'urgent') {
        urgentPending += 1;
      }
    }

    totalSeconds += task.timeSpent || 0;
  }

  const total = tasks.length;
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
  const totalHoursSpent = Math.round((totalSeconds / 3600) * 10) / 10;

  return {
    total,
    pending,
    inProgress,
    review,
    completed,
    overdue,
    urgentPending,
    completionRate,
    totalHoursSpent,
  };
}

export interface TaskFilterCriteria {
  searchQuery?: string;
  category?: string;
  priority?: string;
  status?: string;
}

export function filterTasks(tasks: Task[], criteria: TaskFilterCriteria): Task[] {
  const query = (criteria.searchQuery || '').trim().toLowerCase();
  const category = criteria.category || 'all';
  const priority = criteria.priority || 'all';
  const statusFilter = criteria.status || 'all';

  return tasks.filter((task) => {
    const taskStatus = resolveTaskStatus(task);

    const matchesSearch =
      !query ||
      task.title.toLowerCase().includes(query) ||
      (task.documentNumber && task.documentNumber.toLowerCase().includes(query)) ||
      (task.assignee && task.assignee.toLowerCase().includes(query)) ||
      (task.description && task.description.toLowerCase().includes(query)) ||
      task.category.toLowerCase().includes(query);

    const matchesCategory = category === 'all' || task.category === category;
    const matchesPriority = priority === 'all' || task.priority === priority;
    const matchesStatus = statusFilter === 'all' || taskStatus === statusFilter;

    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });
}
