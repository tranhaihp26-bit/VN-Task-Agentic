import React, { useState, useEffect } from 'react';
import { Task, Tag, Priority, SubTask, RecurrencePattern, TaskStatus } from '../types';
import { X, Sparkles, Loader2, Plus, Trash2, CheckSquare, FileText } from 'lucide-react';
import { ADMIN_CATEGORIES, WORKFLOW_STAGES, resolveTaskStatus } from '../utils/workflow';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onUpdate?: (task: Task) => void;
  editingTask?: Task | null;
  tags: Tag[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onUpdate,
  editingTask,
  tags,
}) => {
  const [documentNumber, setDocumentNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(ADMIN_CATEGORIES[0]);
  const [assignee, setAssignee] = useState('Văn phòng Cơ quan');
  const [priority, setPriority] = useState<Priority>('medium');
  const [status, setStatus] = useState<TaskStatus>('pending');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueTime, setDueTime] = useState('09:00');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [recurrence, setRecurrence] = useState<RecurrencePattern>('none');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isAiBreaking, setIsAiBreaking] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (editingTask) {
      setDocumentNumber(editingTask.documentNumber || '');
      setTitle(editingTask.title || '');
      setDescription(editingTask.description || '');
      setCategory(editingTask.category || ADMIN_CATEGORIES[0]);
      setAssignee(editingTask.assignee || 'Văn phòng Cơ quan');
      setPriority(editingTask.priority || 'medium');
      setStatus(resolveTaskStatus(editingTask));
      setDueDate(editingTask.dueDate || new Date().toISOString().split('T')[0]);
      setDueTime(editingTask.dueTime || '09:00');
      setSelectedTags(editingTask.tags || []);
      setSubtasks(editingTask.subtasks || []);
      setRecurrence(editingTask.recurrence || 'none');
      setValidationError(null);
    } else {
      setDocumentNumber(`${Math.floor(100 + Math.random() * 899)}/VB-ĐH`);
      setTitle('');
      setDescription('');
      setCategory(ADMIN_CATEGORIES[0]);
      setAssignee('Văn phòng Cơ quan');
      setPriority('medium');
      setStatus('pending');
      setDueDate(new Date().toISOString().split('T')[0]);
      setDueTime('09:00');
      setSelectedTags([]);
      setSubtasks([]);
      setRecurrence('none');
      setValidationError(null);
    }
  }, [editingTask, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleGenerateDocNumber = () => {
    const num = Math.floor(100 + Math.random() * 899);
    const suffix = category.includes('Báo cáo')
      ? 'BC-UBND'
      : category.includes('Hội nghị')
      ? 'GM-VP'
      : category.includes('Đề án')
      ? 'KH-KHTC'
      : 'CV-ĐH';
    setDocumentNumber(`${num}/${suffix}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setValidationError('Đề nghị nhập trích yếu nội dung nhiệm vụ trước khi lưu hồ sơ.');
      return;
    }

    const isCompleted = status === 'completed';

    if (editingTask && onUpdate) {
      onUpdate({
        ...editingTask,
        documentNumber: documentNumber.trim() || undefined,
        title: title.trim(),
        description: description.trim(),
        category,
        assignee: assignee.trim() || 'Văn phòng Cơ quan',
        priority,
        status,
        dueDate,
        dueTime,
        completed: isCompleted,
        tags: selectedTags,
        subtasks,
        recurrence,
      });
    } else {
      onSave({
        documentNumber: documentNumber.trim() || undefined,
        title: title.trim(),
        description: description.trim(),
        category,
        assignee: assignee.trim() || 'Văn phòng Cơ quan',
        priority,
        status,
        dueDate,
        dueTime,
        completed: isCompleted,
        tags: selectedTags,
        subtasks,
        recurrence,
        timeSpent: 0,
      });
    }

    onClose();
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    setSubtasks([
      ...subtasks,
      { id: 'sub-' + Date.now(), title: newSubtaskTitle.trim(), completed: false },
    ]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const handleToggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((st) => (st.id === id ? { ...st, completed: !st.completed } : st)));
  };

  const handleAiBreakdown = async () => {
    if (!title.trim()) {
      setValidationError('Đề nghị nhập trích yếu nội dung nhiệm vụ trước khi phân rã quy trình xử lý.');
      return;
    }
    setValidationError(null);
    setIsAiBreaking(true);
    try {
      const res = await fetch('/api/gemini/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal: title }),
      });
      const data = await res.json();
      if (data.subtasks && data.subtasks.length > 0) {
        const generatedSubtasks: SubTask[] = data.subtasks.map((st: any, idx: number) => ({
          id: 'sub-ai-' + Date.now() + '-' + idx,
          title: st.title,
          completed: false,
        }));
        setSubtasks([...subtasks, ...generatedSubtasks]);
      } else {
        // Deterministic administrative fallback steps if offline/unavailable
        const fallbackSteps: SubTask[] = [
          { id: `sub-f1-${Date.now()}`, title: 'Tiếp nhận văn bản, phân công chuyên viên thụ lý hồ sơ', completed: false },
          { id: `sub-f2-${Date.now()}`, title: 'Tổng hợp số liệu, lấy ý kiến phối hợp các đơn vị liên quan', completed: false },
          { id: `sub-f3-${Date.now()}`, title: 'Hoàn thiện dự thảo văn bản trình Lãnh đạo ký ban hành', completed: false },
        ];
        setSubtasks([...subtasks, ...fallbackSteps]);
      }
    } catch {
      const fallbackSteps: SubTask[] = [
        { id: `sub-f1-${Date.now()}`, title: 'Tiếp nhận văn bản, phân công chuyên viên thụ lý hồ sơ', completed: false },
        { id: `sub-f2-${Date.now()}`, title: 'Tổng hợp số liệu, lấy ý kiến phối hợp các đơn vị liên quan', completed: false },
        { id: `sub-f3-${Date.now()}`, title: 'Hoàn thiện dự thảo văn bản trình Lãnh đạo ký ban hành', completed: false },
      ];
      setSubtasks([...subtasks, ...fallbackSteps]);
    } finally {
      setIsAiBreaking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="animate-modal-backdrop fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="animate-modal-panel w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 my-8 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 id="task-modal-title" className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              {editingTask ? 'Cập nhật Hồ sơ & Tiến độ Nhiệm vụ' : 'Lập Hồ sơ Giao Nhiệm vụ Mới'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {validationError && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {validationError}
            </div>
          )}

          {/* Document Number & Assignee */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số hiệu văn bản / Mã hồ sơ
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  placeholder="VD: 142/BC-UBND"
                  className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono"
                />
                <button
                  type="button"
                  onClick={handleGenerateDocNumber}
                  className="px-2.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-xs font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap"
                >
                  Cấp số
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Đơn vị / Cán bộ chủ trì
              </label>
              <input
                type="text"
                value={assignee}
                onChange={(e) => setAssignee(e.target.value)}
                placeholder="VD: Văn phòng Cơ quan, Phòng Kế hoạch..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          {/* Title / Abstract */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Trích yếu nội dung nhiệm vụ <span className="text-rose-600">*</span>
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Nhập trích yếu văn bản hoặc nội dung nhiệm vụ được giao..."
                className="flex-1 px-3.5 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
              <button
                type="button"
                onClick={handleAiBreakdown}
                disabled={isAiBreaking}
                className="px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-semibold hover:bg-indigo-100 transition flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap"
                title="Đề xuất quy trình các bước thực hiện tự động"
              >
                {isAiBreaking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>Đề xuất quy trình xử lý</span>
              </button>
            </div>
          </div>

          {/* Detailed Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ý kiến chỉ đạo / Yêu cầu xử lý chi tiết
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi rõ nội dung chỉ đạo, yêu cầu phối hợp hoặc căn cứ pháp lý..."
              className="w-full px-3.5 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-600 resize-none"
            />
          </div>

          {/* Workflow Steps / Subtasks */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
              <CheckSquare className="w-4 h-4 text-blue-700 dark:text-blue-400" />
              <span>Các bước thực hiện trong quy trình thụ lý ({subtasks.length} bước)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder="Nhập bước công việc cụ thể (VD: Dự thảo tờ trình, lấy ý kiến thẩm định)..."
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                aria-label="Thêm bước thực hiện"
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition flex items-center gap-1 whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm bước</span>
              </button>
            </div>

            {subtasks.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                {subtasks.map((st, index) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                  >
                    <label className="flex items-center gap-2 text-xs flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded border-slate-300 text-blue-700 focus:ring-blue-600"
                      />
                      <span className={st.completed ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}>
                        Bước {index + 1}: {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      aria-label={`Xóa bước ${st.title}`}
                      className="p-1 text-slate-400 hover:text-rose-600 transition"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Category, Priority, Status */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Lĩnh vực công tác
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {ADMIN_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                {!ADMIN_CATEGORIES.includes(category) && <option value={category}>{category}</option>}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cấp độ khẩn
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="urgent">Hỏa tốc (Khẩn cấp)</option>
                <option value="high">Trọng tâm (Mức độ cao)</option>
                <option value="medium">Thường quy (Kế hoạch)</option>
                <option value="low">Phối hợp (Thường xuyên)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Trạng thái xử lý hồ sơ
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as TaskStatus)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {WORKFLOW_STAGES.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates & Recurrence */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Hạn hoàn thành
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Giờ trình ký / Hạn định
              </label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white tabular-nums"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Chu kỳ định kỳ
              </label>
              <select
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrencePattern)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="none">Không định kỳ</option>
                <option value="daily">Định kỳ hàng ngày</option>
                <option value="weekly">Định kỳ hàng tuần</option>
                <option value="monthly">Định kỳ hàng tháng</option>
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Nhãn phân loại hồ sơ
            </label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <button
                    type="button"
                    key={tag.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedTags(selectedTags.filter((id) => id !== tag.id));
                      } else {
                        setSelectedTags([...selectedTags, tag.id]);
                      }
                    }}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition border ${
                      isSelected
                        ? 'border-blue-700 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {tag.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="btn-interactive px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              Đóng lại
            </button>
            <button
              type="submit"
              className="btn-interactive px-5 py-2 text-xs font-semibold rounded-lg bg-blue-700 hover:bg-blue-800 text-white transition"
            >
              {editingTask ? 'Lưu cập nhật hồ sơ' : 'Ban hành & Giao nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
