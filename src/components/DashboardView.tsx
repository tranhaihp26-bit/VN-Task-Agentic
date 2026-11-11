import React, { useMemo } from 'react';
import { Task, Tag, TaskStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  FileText,
  ArrowRight,
  Mic,
  FolderSync,
  Plus,
  Sparkles,
} from 'lucide-react';
import { PomodoroTimer } from './PomodoroTimer';
import {
  computeWorkflowMetrics,
  WORKFLOW_STAGES,
  resolveTaskStatus,
  getStageLabel,
  getNextWorkflowStage,
  PRIORITY_LABELS,
} from '../utils/workflow';

interface DashboardViewProps {
  tasks: Task[];
  tags: Tag[];
  setActiveTab: (tab: 'tasks' | 'meetings' | 'reports' | 'settings' | 'dashboard') => void;
  onSelectStatusFilter?: (status: TaskStatus | 'all') => void;
  onEditTask?: (task: Task) => void;
  onAdvanceTask?: (task: Task) => void;
  onOpenNewTask?: () => void;
  onOpenMeeting?: () => void;
  onOpenVoice?: () => void;
  onOpenSync?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  tasks,
  setActiveTab,
  onSelectStatusFilter,
  onEditTask,
  onAdvanceTask,
  onOpenNewTask,
  onOpenMeeting,
  onOpenVoice,
  onOpenSync,
}) => {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  const metrics = useMemo(() => computeWorkflowMetrics(tasks, todayStr), [tasks, todayStr]);

  const urgentTasks = useMemo(
    () => tasks.filter((t) => t.priority === 'urgent' && resolveTaskStatus(t) !== 'completed'),
    [tasks]
  );

  // Category chart data memoized
  const categoryChartData = useMemo(() => {
    const categoryMap: { [key: string]: { total: number; completed: number } } = {};
    tasks.forEach((t) => {
      const status = resolveTaskStatus(t);
      if (!categoryMap[t.category]) {
        categoryMap[t.category] = { total: 0, completed: 0 };
      }
      categoryMap[t.category].total += 1;
      if (status === 'completed') {
        categoryMap[t.category].completed += 1;
      }
    });

    return Object.keys(categoryMap).map((cat) => ({
      name: cat,
      'Tổng số giao': categoryMap[cat].total,
      'Đã hoàn thành': categoryMap[cat].completed,
    }));
  }, [tasks]);

  // Priority distribution data memoized
  const priorityChartData = useMemo(() => {
    const priorityCount = {
      urgent: tasks.filter((t) => t.priority === 'urgent').length,
      high: tasks.filter((t) => t.priority === 'high').length,
      medium: tasks.filter((t) => t.priority === 'medium').length,
      low: tasks.filter((t) => t.priority === 'low').length,
    };

    return [
      { name: PRIORITY_LABELS.urgent, value: priorityCount.urgent, color: '#e11d48' },
      { name: PRIORITY_LABELS.high, value: priorityCount.high, color: '#d97706' },
      { name: PRIORITY_LABELS.medium, value: priorityCount.medium, color: '#1d4ed8' },
      { name: PRIORITY_LABELS.low, value: priorityCount.low, color: '#64748b' },
    ].filter((item) => item.value > 0);
  }, [tasks]);

  // Upcoming deadlines memoized
  const upcomingTasks = useMemo(
    () =>
      tasks
        .filter((t) => resolveTaskStatus(t) !== 'completed' && t.dueDate >= todayStr)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
        .slice(0, 5),
    [tasks, todayStr]
  );

  const stageCounts: Record<TaskStatus, number> = useMemo(
    () => ({
      pending: metrics.pending,
      in_progress: metrics.inProgress,
      review: metrics.review,
      completed: metrics.completed,
    }),
    [metrics]
  );

  const handleJumpToStage = (stageId: TaskStatus) => {
    if (onSelectStatusFilter) {
      onSelectStatusFilter(stageId);
    }
    setActiveTab('tasks');
  };

  const stageBarColors: Record<TaskStatus, string> = {
    pending: 'bg-slate-400 dark:bg-slate-500',
    in_progress: 'bg-blue-600 dark:bg-blue-500',
    review: 'bg-amber-500 dark:bg-amber-400',
    completed: 'bg-emerald-600 dark:bg-emerald-500',
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Executive Header & Quick Operations Toolbar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Bàn làm việc Tổng hợp & Chỉ số Điều hành
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Theo dõi tiến độ thụ lý hồ sơ, đôn đốc nhiệm vụ trọng tâm và tổng hợp tình hình thực hiện công vụ
          </p>
        </div>

        <div className="flex flex-wrap lg:flex-nowrap items-center gap-2 shrink-0">
          {onOpenNewTask && (
            <button
              type="button"
              onClick={onOpenNewTask}
              className="btn-interactive flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold whitespace-nowrap shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Lập hồ sơ nhiệm vụ</span>
            </button>
          )}
          {onOpenMeeting && (
            <button
              type="button"
              onClick={onOpenMeeting}
              className="btn-interactive flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
              <span>Lập biên bản hội nghị</span>
            </button>
          )}
          {onOpenVoice && (
            <button
              type="button"
              onClick={onOpenVoice}
              className="btn-interactive flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium whitespace-nowrap"
            >
              <Mic className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Nhập liệu giọng nói</span>
            </button>
          )}
          {onOpenSync && (
            <button
              type="button"
              onClick={onOpenSync}
              className="btn-interactive flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium whitespace-nowrap"
            >
              <FolderSync className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300" />
              <span>Sao lưu & Đồng bộ</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            if (onSelectStatusFilter) onSelectStatusFilter('all');
            setActiveTab('tasks');
          }}
          className="card-interactive text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-600 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tổng số hồ sơ nhiệm vụ</p>
            <p className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white tabular-nums">{metrics.total}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Tổng thời lượng thụ lý: {metrics.totalHoursSpent} giờ
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleJumpToStage('completed')}
          className="card-interactive text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-400 dark:hover:border-emerald-600 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tỷ lệ hoàn thành nhiệm vụ</p>
            <p className="text-2xl sm:text-3xl font-bold text-emerald-700 dark:text-emerald-400 tabular-nums">
              {metrics.completionRate}%
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Đã ban hành kết quả: {metrics.completed}/{metrics.total} hồ sơ
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleJumpToStage('in_progress')}
          className="card-interactive text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-600 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Hồ sơ đang thụ lý & trình duyệt</p>
            <p className="text-2xl sm:text-3xl font-bold text-blue-700 dark:text-blue-400 tabular-nums">
              {metrics.inProgress + metrics.review}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Đang thụ lý: {metrics.inProgress} · Trình duyệt: {metrics.review}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950/70 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            if (onSelectStatusFilter) onSelectStatusFilter('all');
            setActiveTab('tasks');
          }}
          className="card-interactive text-left p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 dark:hover:border-rose-600 flex items-start justify-between gap-4"
        >
          <div className="space-y-1">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Nhiệm vụ Hỏa tốc / Quá hạn</p>
            <p className="text-2xl sm:text-3xl font-bold text-rose-700 dark:text-rose-400 tabular-nums">
              {metrics.urgentPending}
            </p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
              Quá hạn xử lý: {metrics.overdue} · Sắp đến hạn: {upcomingTasks.length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-rose-50 dark:bg-rose-950/70 flex items-center justify-center text-rose-700 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </button>
      </div>

      {/* 4-Stage Administrative Workflow Pipeline */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Quy trình Luân chuyển & Xử lý Hồ sơ Công việc (04 Bước)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chọn từng giai đoạn để tra cứu và điều phối các hồ sơ tương ứng trong sổ theo dõi
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (onSelectStatusFilter) onSelectStatusFilter('all');
              setActiveTab('tasks');
            }}
            className="text-xs font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            <span>Mở toàn bộ Sổ theo dõi nhiệm vụ</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Multi-segment visual pipeline distribution bar */}
        {metrics.total > 0 && (
          <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden flex gap-0.5">
            {WORKFLOW_STAGES.map((stage) => {
              const count = stageCounts[stage.id];
              const pct = Math.round((count / metrics.total) * 100);
              if (count === 0) return null;
              return (
                <div
                  key={stage.id}
                  style={{ width: `${pct}%` }}
                  title={`${stage.label}: ${count} hồ sơ (${pct}%)`}
                  className={`h-full transition-all duration-300 ${stageBarColors[stage.id]}`}
                />
              );
            })}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {WORKFLOW_STAGES.map((stage, index) => {
            const count = stageCounts[stage.id];
            const ratio = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => handleJumpToStage(stage.id)}
                className="card-interactive text-left p-4 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500 bg-slate-50/60 dark:bg-slate-800/40 group"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-semibold">Bước 0{index + 1}</span>
                  <span className="tabular-nums font-mono">{ratio}%</span>
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors">
                  {stage.label}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2 tabular-nums">
                  {count} <span className="text-xs font-normal text-slate-500">hồ sơ</span>
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                  {stage.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Timer & Priority Distribution Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        <div className="lg:col-span-1">
          <PomodoroTimer />
        </div>

        <div className="lg:col-span-2 p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Cơ cấu Nhiệm vụ theo Cấp độ Khẩn
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Tỷ trọng phân bổ giữa văn bản Hỏa tốc, Trọng tâm, Thường quy và Phối hợp
            </p>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {priorityChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Chưa có dữ liệu phân loại cấp độ khẩn
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={priorityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                    isAnimationActive={false}
                    label={({ name, percent }: { name?: string; percent?: number }) =>
                      `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
                    }
                  >
                    {priorityChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '12px',
                    }}
                  />
                  <Legend verticalAlign="bottom" height={28} iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Chart */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            Thống kê Kết quả Thực hiện theo Lĩnh vực Công tác
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            So sánh tổng số nhiệm vụ được giao và số nhiệm vụ đã hoàn thành ban hành theo từng lĩnh vực
          </p>
        </div>
        <div className="h-72 w-full">
          {categoryChartData.length === 0 ? (
            <div className="h-full flex items-center justify-center text-xs text-slate-400">
              Chưa có dữ liệu lĩnh vực công tác
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={categoryChartData}>
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="Tổng số giao" fill="#1d4ed8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                <Bar dataKey="Đã hoàn thành" fill="#059669" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Urgent & Upcoming Deadlines Lists */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Tasks */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Nhiệm vụ Hỏa tốc cần đôn đốc xử lý ({urgentTasks.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Xem sổ theo dõi
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {urgentTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Không có hồ sơ nhiệm vụ Hỏa tốc nào tồn đọng.
              </p>
            ) : (
              urgentTasks.map((t) => (
                <div
                  key={t.id}
                  className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-Fast"
                >
                  <div className="space-y-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => (onEditTask ? onEditTask(t) : setActiveTab('tasks'))}
                      className="text-xs font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 text-left line-clamp-2 transition-colors"
                    >
                      {t.documentNumber ? `[${t.documentNumber}] ` : ''}
                      {t.title}
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{t.assignee || 'Văn phòng Cơ quan'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{getStageLabel(resolveTaskStatus(t))}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-rose-700 dark:text-rose-400 tabular-nums">
                      Hạn: {t.dueDate}
                    </span>
                    {onAdvanceTask && (
                      <button
                        type="button"
                        onClick={() => onAdvanceTask(t)}
                        className="btn-interactive text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Chuyển: {getStageLabel(getNextWorkflowStage(resolveTaskStatus(t)))}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Hồ sơ sắp đến hạn hoàn thành ({upcomingTasks.length})</span>
            </h3>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className="text-xs font-medium text-blue-700 dark:text-blue-400 hover:underline"
            >
              Xem toàn bộ
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingTasks.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">
                Không có hồ sơ nhiệm vụ nào sắp đến hạn trong 07 ngày tới.
              </p>
            ) : (
              upcomingTasks.map((t) => (
                <div
                  key={t.id}
                  className="py-3 flex items-start justify-between gap-4 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 px-2 rounded-lg transition-Fast"
                >
                  <div className="space-y-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => (onEditTask ? onEditTask(t) : setActiveTab('tasks'))}
                      className="text-xs font-semibold text-slate-900 dark:text-white hover:text-blue-700 dark:hover:text-blue-400 text-left line-clamp-2 transition-colors"
                    >
                      {t.documentNumber ? `[${t.documentNumber}] ` : ''}
                      {t.title}
                    </button>
                    <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>{t.assignee || 'Văn phòng Cơ quan'}</span>
                      <span aria-hidden="true">·</span>
                      <span>{t.category}</span>
                      <span aria-hidden="true">·</span>
                      <span>{getStageLabel(resolveTaskStatus(t))}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 tabular-nums">
                      Hạn: {t.dueDate}
                    </span>
                    {onAdvanceTask && (
                      <button
                        type="button"
                        onClick={() => onAdvanceTask(t)}
                        className="btn-interactive text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                      >
                        <span>Chuyển: {getStageLabel(getNextWorkflowStage(resolveTaskStatus(t)))}</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
