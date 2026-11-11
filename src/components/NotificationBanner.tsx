import React, { useEffect, useState } from 'react';
import { Task } from '../types';
import { Bell, CheckCircle2, Clock, X } from 'lucide-react';
import { requestNotificationPermission, sendDeadlineNotification } from '../services/notificationService';
import { resolveTaskStatus } from '../utils/workflow';

interface NotificationBannerProps {
  tasks: Task[];
  onToggleTask: (id: string) => void;
  onSnoozeTask: (id: string, hours: number) => void;
}

export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  tasks,
  onToggleTask,
  onSnoozeTask,
}) => {
  const [activeAlertTask, setActiveAlertTask] = useState<Task | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);

  useEffect(() => {
    requestNotificationPermission();

    // Delay alert banner by 12s to respect arrival-popup governance
    const timer = setTimeout(() => {
      const today = new Date().toISOString().split('T')[0];
      const urgentSoon = tasks.find(
        (t) =>
          resolveTaskStatus(t) !== 'completed' &&
          !dismissedIds.includes(t.id) &&
          t.dueDate <= today
      );
      if (urgentSoon) {
        setActiveAlertTask(urgentSoon);
        sendDeadlineNotification(urgentSoon);
      }
    }, 12000);

    return () => clearTimeout(timer);
  }, [tasks, dismissedIds]);

  if (!activeAlertTask) return null;

  const handleComplete = () => {
    onToggleTask(activeAlertTask.id);
    setDismissedIds([...dismissedIds, activeAlertTask.id]);
    setActiveAlertTask(null);
  };

  const handleSnooze = () => {
    onSnoozeTask(activeAlertTask.id, 1);
    setDismissedIds([...dismissedIds, activeAlertTask.id]);
    setActiveAlertTask(null);
  };

  const handleDismiss = () => {
    setDismissedIds([...dismissedIds, activeAlertTask.id]);
    setActiveAlertTask(null);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-md w-full bg-slate-900 text-white p-4 rounded-xl shadow-2xl border border-slate-800 flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-blue-600/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
        <Bell className="w-4 h-4" />
      </div>

      <div className="flex-1 space-y-1">
        <div className="flex items-center justify-between">
          <h4 className="font-bold text-xs sm:text-sm text-white">Cảnh báo Hồ sơ Đến hạn Xử lý</h4>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Đóng thông báo"
            className="text-slate-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-200 font-medium">
          {activeAlertTask.documentNumber ? `[${activeAlertTask.documentNumber}] ` : ''}
          {activeAlertTask.title}
        </p>
        <p className="text-[11px] text-slate-400 tabular-nums">
          Hạn hoàn thành: {activeAlertTask.dueDate} · Lĩnh vực: {activeAlertTask.category}
        </p>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleComplete}
            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Xác nhận hoàn thành</span>
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Gia hạn 01 giờ</span>
          </button>
        </div>
      </div>
    </div>
  );
};
