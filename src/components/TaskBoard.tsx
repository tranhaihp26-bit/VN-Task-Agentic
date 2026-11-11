import React, { useState, useEffect, useMemo, useDeferredValue, useRef } from 'react';
import { Task, Tag, Priority, TaskStatus } from '../types';
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  Trash2,
  AlertCircle,
  GripVertical,
  LayoutList,
  Kanban as KanbanIcon,
  BarChart2,
  Sparkles,
  Loader2,
  Layers,
  Play,
  Square,
  ArrowRight,
  FileEdit,
  RotateCcw,
  X,
} from 'lucide-react';
import {
  WORKFLOW_STAGES,
  PRIORITY_LABELS,
  RECURRENCE_LABELS,
  ADMIN_CATEGORIES,
  resolveTaskStatus,
  transitionTaskStatus,
  getNextWorkflowStage,
  getStageLabel,
  formatDurationVN,
  computeWorkflowMetrics,
  filterTasks,
} from '../utils/workflow';

interface TaskBoardProps {
  tasks: Task[];
  tags: Tag[];
  onAddTask: () => void;
  onEditTask?: (task: Task) => void;
  onToggleTask: (id: string) => void;
  onDeleteTask: (id: string) => void;
  onReorderTasks: (newTasks: Task[]) => void;
  onUpdateTask?: (task: Task, options?: { isTimerTick?: boolean }) => void;
  onOpenFocusProjects: () => void;
  searchQuery?: string;
  setSearchQuery?: (q: string) => void;
  statusFilter?: TaskStatus | 'all';
  setStatusFilter?: (s: TaskStatus | 'all') => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  tasks,
  tags,
  onAddTask,
  onEditTask,
  onToggleTask,
  onDeleteTask,
  onReorderTasks,
  onUpdateTask,
  onOpenFocusProjects,
  searchQuery = '',
  setSearchQuery,
  statusFilter = 'all',
  setStatusFilter,
}) => {
  const [internalSearch, setInternalSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [internalStatus, setInternalStatus] = useState<TaskStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<TaskStatus | null>(null);
  const [isSmartPrioritizing, setIsSmartPrioritizing] = useState(false);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [quickStepInputs, setQuickStepInputs] = useState<Record<string, string>>({});
  const [expandedQuickStepTaskId, setExpandedQuickStepTaskId] = useState<string | null>(null);

  const activeSearch = searchQuery !== undefined ? searchQuery : internalSearch;
  const setActiveSearch = setSearchQuery || setInternalSearch;
  const deferredSearch = useDeferredValue(activeSearch);

  const activeStatusFilter = statusFilter !== undefined ? statusFilter : internalStatus;
  const setActiveStatusFilter = setStatusFilter || setInternalStatus;

  // Ref-backed timer so setInterval never tears down on every second
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const onUpdateTaskRef = useRef(onUpdateTask);
  onUpdateTaskRef.current = onUpdateTask;

  useEffect(() => {
    if (!activeTimerTaskId) return;
    const interval = setInterval(() => {
      const currentTasks = tasksRef.current;
      const updateFn = onUpdateTaskRef.current;
      if (!updateFn) return;
      const task = currentTasks.find((t) => t.id === activeTimerTaskId);
      if (task) {
        const currentSpent = task.timeSpent || 0;
        const nextStatus = resolveTaskStatus(task) === 'pending' ? 'in_progress' : resolveTaskStatus(task);
        updateFn(
          { ...task, timeSpent: currentSpent + 1, status: nextStatus },
          { isTimerTick: true }
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimerTaskId]);

  const handleToggleTimer = (taskId: string) => {
    if (activeTimerTaskId === taskId) {
      // Flush final timeSpent to Firestore when stopping timer
      const task = tasks.find((t) => t.id === taskId);
      if (task && onUpdateTask) {
        onUpdateTask(task, { isTimerTick: false });
      }
      setActiveTimerTaskId(null);
    } else {
      setActiveTimerTaskId(taskId);
    }
  };

  const allCategories = useMemo(
    () => Array.from(new Set(['all', ...ADMIN_CATEGORIES, ...tasks.map((t) => t.category)])),
    [tasks]
  );

  const filteredTasks = useMemo(
    () =>
      filterTasks(tasks, {
        searchQuery: deferredSearch,
        category: selectedCategory,
        priority: selectedPriority,
        status: activeStatusFilter,
      }),
    [tasks, deferredSearch, selectedCategory, selectedPriority, activeStatusFilter]
  );

  const metrics = useMemo(() => computeWorkflowMetrics(tasks), [tasks]);

  const stageCounts = useMemo(() => {
    const counts: Record<TaskStatus, number> = {
      pending: 0,
      in_progress: 0,
      review: 0,
      completed: 0,
    };
    tasks.forEach((t) => {
      counts[resolveTaskStatus(t)] += 1;
    });
    return counts;
  }, [tasks]);

  const categoryStats = useMemo(
    () =>
      allCategories
        .filter((c) => c !== 'all')
        .map((cat) => {
          const catTasks = tasks.filter((t) => t.category === cat);
          const total = catTasks.length;
          const completed = catTasks.filter((t) => resolveTaskStatus(t) === 'completed').length;
          const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
          return { category: cat, total, completed, percent };
        })
        .filter((stat) => stat.total > 0),
    [allCategories, tasks]
  );

  const hasActiveFilters =
    Boolean(activeSearch.trim()) ||
    selectedCategory !== 'all' ||
    selectedPriority !== 'all' ||
    activeStatusFilter !== 'all';

  const handleResetFilters = () => {
    setActiveSearch('');
    setSelectedCategory('all');
    setSelectedPriority('all');
    setActiveStatusFilter('all');
  };

  const getPriorityTextClass = (pri: Priority) => {
    switch (pri) {
      case 'urgent':
        return 'text-rose-700 dark:text-rose-400 font-bold';
      case 'high':
        return 'text-amber-700 dark:text-amber-400 font-semibold';
      case 'medium':
        return 'text-blue-700 dark:text-blue-400 font-medium';
      case 'low':
        return 'text-slate-600 dark:text-slate-400';
    }
  };

  const handleToggleSubtaskInTask = (taskId: string, subtaskId: string) => {
    if (!onUpdateTask) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.subtasks) return;
    const updatedSubtasks = task.subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    const allSubtasksDone = updatedSubtasks.length > 0 && updatedSubtasks.every((st) => st.completed);
    const anySubtaskDone = updatedSubtasks.some((st) => st.completed);
    let nextStatus = resolveTaskStatus(task);
    if (allSubtasksDone && nextStatus !== 'completed') {
      nextStatus = 'review';
    } else if (anySubtaskDone && nextStatus === 'pending') {
      nextStatus = 'in_progress';
    }
    onUpdateTask({ ...task, subtasks: updatedSubtasks, status: nextStatus });
  };

  const handleAddQuickSubtask = (taskId: string) => {
    const stepText = (quickStepInputs[taskId] || '').trim();
    if (!stepText || !onUpdateTask) return;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const currentSubtasks = task.subtasks || [];
    const updatedSubtasks = [
      ...currentSubtasks,
      {
        id: `sub-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: stepText,
        completed: false,
      },
    ];
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
    setQuickStepInputs((prev) => ({ ...prev, [taskId]: '' }));
    setExpandedQuickStepTaskId(null);
  };

  const handleAdvanceWorkflowStage = (task: Task) => {
    const currentStatus = resolveTaskStatus(task);
    const nextStatus = getNextWorkflowStage(currentStatus);
    if (nextStatus === 'completed' || currentStatus === 'completed') {
      onToggleTask(task.id);
    } else if (onUpdateTask) {
      onUpdateTask(transitionTaskStatus(task, nextStatus));
    }
  };

  const handleSelectWorkflowStage = (task: Task, targetStatus: TaskStatus) => {
    const currentStatus = resolveTaskStatus(task);
    if (currentStatus === targetStatus) return;
    if (targetStatus === 'completed' || currentStatus === 'completed') {
      if (onUpdateTask) {
        onUpdateTask(transitionTaskStatus(task, targetStatus));
      } else {
        onToggleTask(task.id);
      }
    } else if (onUpdateTask) {
      onUpdateTask(transitionTaskStatus(task, targetStatus));
    }
  };

  const sortTasksDeterministically = (list: Task[]) => {
    const priorityRank: Record<Priority, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    return [...list].sort((a, b) => {
      const aDone = resolveTaskStatus(a) === 'completed' ? 1 : 0;
      const bDone = resolveTaskStatus(b) === 'completed' ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      if (priorityRank[a.priority] !== priorityRank[b.priority]) {
        return priorityRank[a.priority] - priorityRank[b.priority];
      }
      return a.dueDate.localeCompare(b.dueDate);
    });
  };

  const handleSmartPriorityAI = async () => {
    if (tasks.length === 0) return;
    setIsSmartPrioritizing(true);
    setAiExplanation(null);
    try {
      const res = await fetch('/api/gemini/smart-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tasks }),
      });
      const data = await res.json();
      if (data.orderedTaskIds && Array.isArray(data.orderedTaskIds) && data.orderedTaskIds.length > 0) {
        const idMap = new Map(tasks.map((t) => [t.id, t]));
        const reordered: Task[] = [];
        for (const id of data.orderedTaskIds) {
          if (idMap.has(id)) {
            reordered.push(idMap.get(id)!);
            idMap.delete(id);
          }
        }
        for (const [, task] of idMap) {
          reordered.push(task);
        }
        onReorderTasks(reordered);
        setAiExplanation(
          data.explanation ||
            'Hệ thống đã thẩm định và sắp xếp lại danh mục hồ sơ theo mức độ khẩn (Hỏa tốc → Trọng tâm) và thời hạn trình ký.'
        );
      } else {
        const sorted = sortTasksDeterministically(tasks);
        onReorderTasks(sorted);
        setAiExplanation(
          'Đã sắp xếp thứ tự xử lý hồ sơ ưu tiên nhiệm vụ Hỏa tốc, Trọng tâm và các văn bản có thời hạn hoàn thành gần nhất.'
        );
      }
    } catch {
      const sorted = sortTasksDeterministically(tasks);
      onReorderTasks(sorted);
      setAiExplanation(
        'Đã sắp xếp thứ tự xử lý hồ sơ ưu tiên nhiệm vụ Hỏa tốc, Trọng tâm và các văn bản có thời hạn hoàn thành gần nhất.'
      );
    } finally {
      setIsSmartPrioritizing(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedItemId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetId) return;

    const draggedIndex = tasks.findIndex((t) => t.id === draggedItemId);
    const targetIndex = tasks.findIndex((t) => t.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updatedTasks = [...tasks];
    const [movedItem] = updatedTasks.splice(draggedIndex, 1);
    updatedTasks.splice(targetIndex, 0, movedItem);

    onReorderTasks(updatedTasks);
    setDraggedItemId(null);
  };

  const handleDropOnStageColumn = (e: React.DragEvent, targetStage: TaskStatus) => {
    e.preventDefault();
    setDragOverStageId(null);
    if (!draggedItemId) return;
    const task = tasks.find((t) => t.id === draggedItemId);
    if (task) {
      handleSelectWorkflowStage(task, targetStage);
    }
    setDraggedItemId(null);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      {/* Administrative Summary & Action Header */}
      <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
            Sổ Theo dõi & Điều phối Nhiệm vụ
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 tabular-nums">
            Tổng số: <strong className="text-slate-900 dark:text-white">{metrics.total}</strong> hồ sơ · Chờ tiếp nhận:{' '}
            <strong className="text-slate-900 dark:text-white">{metrics.pending}</strong> · Đang thụ lý:{' '}
            <strong className="text-blue-700 dark:text-blue-400">{metrics.inProgress}</strong> · Trình duyệt:{' '}
            <strong className="text-amber-700 dark:text-amber-400">{metrics.review}</strong> · Đã hoàn thành:{' '}
            <strong className="text-emerald-700 dark:text-emerald-400">
              {metrics.completed} ({metrics.completionRate}%)
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onOpenFocusProjects}
            className="btn-interactive px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            <Layers className="w-4 h-4 text-blue-700 dark:text-blue-400" />
            <span>Nhóm Chuyên đề Trọng tâm</span>
          </button>

          <button
            type="button"
            onClick={handleSmartPriorityAI}
            disabled={isSmartPrioritizing}
            className="btn-interactive px-3.5 py-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-indigo-800 dark:text-indigo-200 font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap"
          >
            {isSmartPrioritizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>Thẩm định & Sắp xếp Ưu tiên</span>
          </button>

          <button
            type="button"
            onClick={onAddTask}
            className="btn-interactive px-4 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-xs flex items-center gap-1.5 whitespace-nowrap shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Giao nhiệm vụ mới</span>
          </button>
        </div>
      </div>

      {/* Explanation Banner if available */}
      {aiExplanation && (
        <div className="animate-toast-enter p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 text-xs flex items-start gap-3">
          <Sparkles className="w-4 h-4 text-indigo-700 dark:text-indigo-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold block mb-0.5">Kết quả thẩm định & điều phối thứ tự ưu tiên:</span>
            {aiExplanation}
          </div>
          <button
            type="button"
            onClick={() => setAiExplanation(null)}
            aria-label="Đóng thông báo"
            className="text-indigo-500 hover:text-indigo-800 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* Category Productivity Progress Bars */}
      {categoryStats.length > 0 && (
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <h2 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Tỷ lệ hoàn thành hồ sơ theo lĩnh vực công tác
              </h2>
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
              Hoàn thành chung: {metrics.completionRate}%
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
            {categoryStats.map((stat) => {
              const isSelectedCat = selectedCategory === stat.category;
              return (
                <button
                  key={stat.category}
                  type="button"
                  onClick={() => setSelectedCategory(isSelectedCat ? 'all' : stat.category)}
                  className={`card-interactive text-left space-y-1.5 p-3 rounded-lg border ${
                    isSelectedCat
                      ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600'
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-800 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{stat.category}</span>
                    <span className="text-slate-600 dark:text-slate-400 font-medium tabular-nums">
                      {stat.completed}/{stat.total} ({stat.percent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        stat.percent === 100 ? 'bg-emerald-600' : 'bg-blue-700'
                      }`}
                      style={{ width: `${stat.percent}%` }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Search, View Switcher, and 4-Stage Workflow Status Tabs */}
      <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={activeSearch}
              onChange={(e) => setActiveSearch(e.target.value)}
              placeholder="Tìm theo số hiệu văn bản (VD: 142/BC-UBND), trích yếu nhiệm vụ, đơn vị chủ trì..."
              className="w-full pl-10 pr-9 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 transition-Fast"
            />
            {activeSearch && (
              <button
                type="button"
                onClick={() => setActiveSearch('')}
                aria-label="Xóa nội dung tìm kiếm"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              aria-label="Lọc theo cấp độ khẩn"
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              <option value="all">Tất cả cấp độ khẩn</option>
              <option value="urgent">Hỏa tốc</option>
              <option value="high">Trọng tâm</option>
              <option value="medium">Thường quy</option>
              <option value="low">Phối hợp</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-interactive flex items-center gap-1 px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-600 dark:text-slate-300 whitespace-nowrap"
                title="Đặt lại toàn bộ bộ lọc"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Đặt lại</span>
              </button>
            )}

            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                  viewMode === 'list'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Danh mục hồ sơ</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                className={`btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                  viewMode === 'kanban'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <KanbanIcon className="w-3.5 h-3.5" />
                <span>Bảng điều phối</span>
              </button>
            </div>
          </div>
        </div>

        {/* Workflow Stage Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">Trạng thái xử lý:</span>
          <button
            type="button"
            onClick={() => setActiveStatusFilter('all')}
            className={`btn-interactive px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap tabular-nums ${
              activeStatusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Tất cả ({tasks.length})
          </button>
          {WORKFLOW_STAGES.map((stage) => {
            const count = stageCounts[stage.id];
            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setActiveStatusFilter(stage.id)}
                className={`btn-interactive px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap tabular-nums ${
                  activeStatusFilter === stage.id
                    ? 'bg-blue-700 text-white font-semibold'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {stage.shortLabel} ({count})
              </button>
            );
          })}
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 mr-2">Lĩnh vực:</span>
          {allCategories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`btn-interactive px-2.5 py-1 rounded-md text-xs font-medium whitespace-nowrap ${
                selectedCategory === cat
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-800 font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {cat === 'all' ? 'Tất cả lĩnh vực' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* View Mode Content with Smooth Transition */}
      {viewMode === 'list' ? (
        <div key="list-view" className="animate-view-enter space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-14 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8">
                <AlertCircle className="w-9 h-9 text-slate-400 mx-auto mb-3" />
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  Không tìm thấy hồ sơ nhiệm vụ phù hợp
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Đề nghị điều chỉnh bộ lọc tra cứu hoặc lập hồ sơ giao nhiệm vụ mới.
                </p>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="btn-interactive mt-3 px-3.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 text-xs font-semibold"
                  >
                    Hiển thị toàn bộ hồ sơ
                  </button>
                )}
              </div>
            ) : (
              filteredTasks.map((task) => {
                const taskTags = tags.filter((t) => task.tags.includes(t.id));
                const subtasks = task.subtasks || [];
                const completedSubtasks = subtasks.filter((st) => st.completed).length;
                const currentStatus = resolveTaskStatus(task);
                const isCompleted = currentStatus === 'completed';

                return (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, task.id)}
                    className={`card-interactive flex flex-col gap-3 p-4 rounded-xl bg-white dark:bg-slate-900 border cursor-grab active:cursor-grabbing ${
                      isCompleted
                        ? 'border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-600 dark:hover:border-blue-500'
                    } ${draggedItemId === task.id ? 'opacity-50 border-dashed border-blue-600' : ''}`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className="text-slate-300 dark:text-slate-600 hover:text-slate-500 cursor-grab mt-1">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        <button
                          type="button"
                          onClick={() => onToggleTask(task.id)}
                          aria-label={
                            isCompleted ? `Mở lại hồ sơ ${task.title}` : `Đánh dấu hoàn thành ${task.title}`
                          }
                          className="btn-interactive text-slate-400 hover:text-blue-700 dark:hover:text-blue-400 shrink-0 mt-0.5"
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>

                        <div className="space-y-1.5 flex-1 min-w-0">
                          {/* Title Line */}
                          <div className="flex items-baseline gap-2 flex-wrap">
                            {task.documentNumber && (
                              <span className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-400 shrink-0">
                                [{task.documentNumber}]
                              </span>
                            )}
                            <h4
                              className={`text-sm font-bold text-slate-900 dark:text-white ${
                                isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
                              }`}
                            >
                              {task.title}
                            </h4>
                          </div>

                          {task.description && (
                            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                              {task.description}
                            </p>
                          )}

                          {/* Zero-Pill Unboxed Metadata Line with typographic separators */}
                          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 pt-0.5 flex-wrap tabular-nums">
                            <span className={getPriorityTextClass(task.priority)}>
                              Cấp độ: {PRIORITY_LABELS[task.priority]}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span>Đơn vị: {task.assignee || 'Văn phòng Cơ quan'}</span>
                            <span aria-hidden="true">·</span>
                            <span>Lĩnh vực: {task.category}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              Hạn xử lý: {task.dueDate}
                              {task.dueTime ? ` (${task.dueTime})` : ''}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                              Thời lượng thụ lý: {formatDurationVN(task.timeSpent)}
                            </span>
                            {task.recurrence && task.recurrence !== 'none' && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>{RECURRENCE_LABELS[task.recurrence]}</span>
                              </>
                            )}
                            {subtasks.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span className="text-indigo-700 dark:text-indigo-400 font-medium">
                                  Quy trình: {completedSubtasks}/{subtasks.length} bước
                                </span>
                              </>
                            )}
                            {taskTags.length > 0 && (
                              <>
                                <span aria-hidden="true">·</span>
                                <span>Nhãn: {taskTags.map((t) => t.name).join(', ')}</span>
                              </>
                            )}
                            <span aria-hidden="true">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedQuickStepTaskId(
                                  expandedQuickStepTaskId === task.id ? null : task.id
                                )
                              }
                              className="text-blue-700 dark:text-blue-400 hover:underline font-medium"
                            >
                              + Thêm bước thụ lý
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Workflow & Action Controls */}
                      <div className="flex flex-wrap items-center gap-2 shrink-0 pl-8 lg:pl-0">
                        {/* Workflow Status Selector */}
                        <select
                          aria-label={`Trạng thái hồ sơ ${task.title}`}
                          value={currentStatus}
                          onChange={(e) => handleSelectWorkflowStage(task, e.target.value as TaskStatus)}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 transition-Fast"
                        >
                          {WORKFLOW_STAGES.map((st) => (
                            <option key={st.id} value={st.id}>
                              {st.shortLabel}
                            </option>
                          ))}
                        </select>

                        {/* One-click Next Step Transition */}
                        {!isCompleted && (
                          <button
                            type="button"
                            onClick={() => handleAdvanceWorkflowStage(task)}
                            className="btn-interactive flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-100 text-xs font-semibold whitespace-nowrap"
                            title="Chuyển sang bước xử lý tiếp theo"
                          >
                            <span>Chuyển bước</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Start/Stop Working Timer */}
                        <button
                          type="button"
                          onClick={() => handleToggleTimer(task.id)}
                          className={`btn-interactive flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap ${
                            activeTimerTaskId === task.id
                              ? 'bg-rose-600 text-white'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100'
                          }`}
                        >
                          {activeTimerTaskId === task.id ? (
                            <>
                              <Square className="w-3.5 h-3.5 fill-current" />
                              <span>Dừng tính giờ</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3.5 h-3.5 fill-current" />
                              <span>Bấm giờ thụ lý</span>
                            </>
                          )}
                        </button>

                        {/* Edit Task Button */}
                        {onEditTask && (
                          <button
                            type="button"
                            onClick={() => onEditTask(task)}
                            aria-label={`Cập nhật hồ sơ ${task.title}`}
                            className="btn-interactive p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Cập nhật hồ sơ nhiệm vụ"
                          >
                            <FileEdit className="w-4 h-4" />
                          </button>
                        )}

                        {/* Inline Delete Confirmation */}
                        {confirmDeleteId === task.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-800 px-2 py-1 rounded-lg">
                            <span className="text-[11px] font-semibold text-rose-700 dark:text-rose-300">Xóa?</span>
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteTask(task.id);
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 rounded bg-rose-600 text-white text-[11px] font-semibold"
                            >
                              Đồng ý
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium"
                            >
                              Hủy
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(task.id)}
                            aria-label={`Xóa hồ sơ ${task.title}`}
                            className="btn-interactive p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                            title="Xóa hồ sơ nhiệm vụ"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Inline Quick Add Subtask Input */}
                    {expandedQuickStepTaskId === task.id && (
                      <div className="ml-8 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
                        <input
                          type="text"
                          value={quickStepInputs[task.id] || ''}
                          onChange={(e) =>
                            setQuickStepInputs((prev) => ({ ...prev, [task.id]: e.target.value }))
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddQuickSubtask(task.id);
                            } else if (e.key === 'Escape') {
                              setExpandedQuickStepTaskId(null);
                            }
                          }}
                          placeholder="Nhập nội dung bước thụ lý bổ sung và nhấn Enter..."
                          className="flex-1 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-blue-600"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAddQuickSubtask(task.id)}
                          className="btn-interactive px-3 py-1.5 rounded-lg bg-blue-700 text-white text-xs font-semibold whitespace-nowrap"
                        >
                          Lưu bước
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedQuickStepTaskId(null)}
                          className="px-2.5 py-1.5 rounded-lg text-xs text-slate-500 hover:text-slate-800"
                        >
                          Đóng
                        </button>
                      </div>
                    )}

                    {/* Nested Subtasks Process Checklist */}
                    {subtasks.length > 0 && (
                      <div className="ml-8 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {subtasks.map((st, idx) => (
                          <label
                            key={st.id}
                            className="flex items-center gap-2 text-xs cursor-pointer p-1.5 rounded-md hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-Fast"
                          >
                            <input
                              type="checkbox"
                              checked={st.completed}
                              onChange={() => handleToggleSubtaskInTask(task.id, st.id)}
                              className="rounded border-slate-300 text-blue-700 focus:ring-blue-600 w-3.5 h-3.5"
                            />
                            <span
                              className={
                                st.completed
                                  ? 'line-through text-slate-400 dark:text-slate-500'
                                  : 'text-slate-700 dark:text-slate-300'
                              }
                            >
                              Bước {idx + 1}: {st.title}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
        </div>
      ) : (
        /* 4-Column Administrative Workflow Board */
        <div
          key="kanban-view"
          className="animate-view-enter grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"
        >
            {WORKFLOW_STAGES.map((stage) => {
              const colTasks = filteredTasks.filter((t) => resolveTaskStatus(t) === stage.id);
              const isDragTarget = dragOverStageId === stage.id;

              return (
                <div
                  key={stage.id}
                  onDragOver={(e) => {
                    handleDragOver(e);
                    if (dragOverStageId !== stage.id) {
                      setDragOverStageId(stage.id);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverStageId === stage.id) {
                      setDragOverStageId(null);
                    }
                  }}
                  onDrop={(e) => handleDropOnStageColumn(e, stage.id)}
                  className={`p-4 rounded-xl bg-white dark:bg-slate-900 border space-y-3 flex flex-col transition-Fast ${
                    isDragTarget
                      ? 'border-blue-600 dark:border-blue-400 bg-blue-50/30 dark:bg-blue-950/30'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-200 dark:border-slate-800">
                    <div>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                        {stage.shortLabel}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                        {stage.description}
                      </p>
                    </div>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tabular-nums font-mono">
                      {colTasks.length}
                    </span>
                  </div>

                  <div className="space-y-2.5 min-h-[320px] flex-1">
                    {colTasks.length === 0 ? (
                      <div className="h-40 flex items-center justify-center rounded-lg border border-dashed border-slate-200 dark:border-slate-800">
                        <p className="text-xs text-slate-400 text-center px-4">
                          Kéo thả hồ sơ vào cột này hoặc bấm &ldquo;Chuyển bước&rdquo;
                        </p>
                      </div>
                    ) : (
                      colTasks.map((task) => {
                        const subtasks = task.subtasks || [];
                        const completedSubtasks = subtasks.filter((st) => st.completed).length;

                        return (
                          <div
                            key={task.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, task.id)}
                            className="card-interactive p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 hover:border-blue-500 space-y-2 cursor-grab active:cursor-grabbing"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <button
                                type="button"
                                onClick={() => onEditTask && onEditTask(task)}
                                className="text-xs font-bold text-slate-900 dark:text-white text-left hover:text-blue-700 dark:hover:text-blue-400 line-clamp-2 transition-colors"
                              >
                                {task.documentNumber ? `[${task.documentNumber}] ` : ''}
                                {task.title}
                              </button>
                            </div>

                            <div className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 tabular-nums">
                              <p>Đơn vị: {task.assignee || 'Văn phòng Cơ quan'}</p>
                              <p>
                                <span className={getPriorityTextClass(task.priority)}>
                                  {PRIORITY_LABELS[task.priority]}
                                </span>{' '}
                                · Hạn: {task.dueDate}
                              </p>
                              {subtasks.length > 0 && (
                                <p className="text-indigo-700 dark:text-indigo-400 font-medium">
                                  Quy trình: {completedSubtasks}/{subtasks.length} bước
                                </p>
                              )}
                            </div>

                            <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700 flex items-center justify-between gap-2">
                              <span className="text-[11px] text-slate-500 tabular-nums">
                                {formatDurationVN(task.timeSpent)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleAdvanceWorkflowStage(task)}
                                className="btn-interactive text-[11px] font-semibold text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-0.5"
                              >
                                <span>
                                  {stage.id === 'completed'
                                    ? 'Mở lại hồ sơ'
                                    : `Chuyển: ${getStageLabel(getNextWorkflowStage(stage.id))}`}
                                </span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
};
