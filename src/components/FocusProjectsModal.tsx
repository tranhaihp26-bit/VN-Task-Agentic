import React, { useState } from 'react';
import { Task } from '../types';
import { X, Sparkles, Loader2, Calendar, CheckCircle2, Layers } from 'lucide-react';

interface FocusProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
}

export const FocusProjectsModal: React.FC<FocusProjectsModalProps> = ({ isOpen, onClose, tasks }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  if (!isOpen) return null;

  const generateDeterministicProjects = () => {
    const byCategory: Record<string, Task[]> = {};
    tasks.forEach((t) => {
      if (!byCategory[t.category]) byCategory[t.category] = [];
      byCategory[t.category].push(t);
    });
    const slots = [
      'Thứ Hai · 08:30 - 11:00',
      'Thứ Ba · 14:00 - 16:30',
      'Thứ Tư · 08:30 - 11:00',
      'Thứ Năm · 14:00 - 16:30',
    ];
    return Object.keys(byCategory).map((cat, idx) => ({
      projectName: `Chuyên đề: ${cat}`,
      description: `Tập trung giải quyết dứt điểm các hồ sơ thuộc lĩnh vực ${cat} theo cùng một đợt thụ lý để tối ưu hiệu quả tham mưu.`,
      taskIds: byCategory[cat].map((t) => t.id),
      suggestedTimeBlock: slots[idx % slots.length],
    }));
  };

  const handleGenerateProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/focus-projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      const data = await res.json();
      if (data.projects && Array.isArray(data.projects) && data.projects.length > 0) {
        setProjects(data.projects);
      } else {
        setProjects(generateDeterministicProjects());
      }
    } catch {
      setProjects(generateDeterministicProjects());
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 my-8 max-h-[90vh] overflow-y-auto space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Nhóm Chuyên đề Trọng tâm & Phân bổ Khung giờ Thụ lý
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
            Hệ thống tự động rà soát các hồ sơ nhiệm vụ có cùng lĩnh vực chuyên môn và thời hạn trình ký, gom nhóm thành các <strong>Chuyên đề Trọng tâm</strong> kèm đề xuất khung giờ xử lý tập trung.
          </p>

          <button
            type="button"
            onClick={handleGenerateProjects}
            disabled={isLoading}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang phân tích và gom nhóm chuyên đề...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Lập Kế hoạch Nhóm Chuyên đề Trọng tâm</span>
              </>
            )}
          </button>

          {projects.length > 0 && (
            <div className="space-y-4 mt-4">
              {projects.map((proj, idx) => {
                const projTasks = tasks.filter((t) => proj.taskIds?.includes(t.id));
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                        0{idx + 1}. {proj.projectName}
                      </h4>
                      <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 flex items-center gap-1.5 tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Khung giờ: {proj.suggestedTimeBlock}</span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{proj.description}</p>

                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-700">
                      <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                        Hồ sơ nhiệm vụ thuộc chuyên đề ({projTasks.length}):
                      </span>
                      {projTasks.map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-2 text-xs text-slate-800 dark:text-slate-200 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 tabular-nums"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400 shrink-0" />
                          <span className="truncate font-medium">
                            {t.documentNumber ? `[${t.documentNumber}] ` : ''}
                            {t.title}
                          </span>
                          <span className="ml-auto text-[11px] text-slate-500 shrink-0">Hạn: {t.dueDate}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
