import test from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveTaskStatus,
  transitionTaskStatus,
  getNextWorkflowStage,
  calculateNextRecurringDate,
  formatDurationVN,
  computeWorkflowMetrics,
  filterTasks,
} from './workflow';
import { Task } from '../types';

const sampleTask: Task = {
  id: 'task-101',
  documentNumber: '142/BC-UBND',
  title: 'Báo cáo tổng kết công tác cải cách hành chính Quý I',
  description: 'Rà soát số liệu giải quyết thủ tục hành chính đúng hạn tại các phòng chuyên môn.',
  category: 'Chỉ đạo điều hành',
  assignee: 'Văn phòng HĐND & UBND',
  priority: 'urgent',
  status: 'pending',
  dueDate: '2026-11-15',
  dueTime: '10:00',
  completed: false,
  tags: ['tag-1'],
  timeSpent: 0,
  createdAt: '2026-11-10T08:00:00.000Z',
};

test('resolveTaskStatus synchronizes status and completed flag accurately', () => {
  assert.equal(resolveTaskStatus(sampleTask), 'pending');
  assert.equal(resolveTaskStatus({ ...sampleTask, timeSpent: 120 }), 'in_progress');
  assert.equal(resolveTaskStatus({ ...sampleTask, status: 'review' }), 'review');
  assert.equal(resolveTaskStatus({ ...sampleTask, completed: true, status: 'in_progress' }), 'completed');
});

test('transitionTaskStatus and getNextWorkflowStage follow 4-step administrative lifecycle', () => {
  assert.equal(getNextWorkflowStage('pending'), 'in_progress');
  assert.equal(getNextWorkflowStage('in_progress'), 'review');
  assert.equal(getNextWorkflowStage('review'), 'completed');
  assert.equal(getNextWorkflowStage('completed'), 'pending');

  const inReview = transitionTaskStatus(sampleTask, 'review');
  assert.equal(inReview.status, 'review');
  assert.equal(inReview.completed, false);

  const done = transitionTaskStatus(inReview, 'completed');
  assert.equal(done.status, 'completed');
  assert.equal(done.completed, true);
});

test('calculateNextRecurringDate advances daily, weekly, and monthly dates deterministically', () => {
  assert.equal(calculateNextRecurringDate('2026-11-10', 'daily'), '2026-11-11');
  assert.equal(calculateNextRecurringDate('2026-11-10', 'weekly'), '2026-11-17');
  assert.equal(calculateNextRecurringDate('2026-11-10', 'monthly'), '2026-12-10');
});

test('formatDurationVN formats elapsed seconds in Vietnamese administrative format', () => {
  assert.equal(formatDurationVN(45), '45 giây');
  assert.equal(formatDurationVN(125), '02 phút 05 giây');
  assert.equal(formatDurationVN(3665), '01 giờ 01 phút');
});

test('computeWorkflowMetrics aggregates counts, overdue items, and completion rate', () => {
  const tasks: Task[] = [
    sampleTask,
    { ...sampleTask, id: 't2', status: 'in_progress', dueDate: '2026-11-01', priority: 'high', timeSpent: 1800 },
    { ...sampleTask, id: 't3', status: 'review', dueDate: '2026-11-12', priority: 'medium', timeSpent: 1800 },
    { ...sampleTask, id: 't4', status: 'completed', completed: true, dueDate: '2026-11-05', priority: 'low' },
  ];

  const metrics = computeWorkflowMetrics(tasks, '2026-11-10');
  assert.equal(metrics.total, 4);
  assert.equal(metrics.pending, 1);
  assert.equal(metrics.inProgress, 1);
  assert.equal(metrics.review, 1);
  assert.equal(metrics.completed, 1);
  assert.equal(metrics.overdue, 1);
  assert.equal(metrics.urgentPending, 1);
  assert.equal(metrics.completionRate, 25);
  assert.equal(metrics.totalHoursSpent, 1);
});

test('filterTasks matches documentNumber, assignee, category, priority, and workflow status', () => {
  const tasks: Task[] = [
    sampleTask,
    {
      ...sampleTask,
      id: 't2',
      documentNumber: '88/KH-STC',
      title: 'Thẩm định dự toán ngân sách năm 2027',
      assignee: 'Phòng Kế hoạch - Tài chính',
      category: 'Đề án - Dự án',
      priority: 'high',
      status: 'review',
    },
  ];

  assert.equal(filterTasks(tasks, { searchQuery: '88/KH-STC' }).length, 1);
  assert.equal(filterTasks(tasks, { searchQuery: 'Kế hoạch - Tài chính' }).length, 1);
  assert.equal(filterTasks(tasks, { status: 'review' }).length, 1);
  assert.equal(filterTasks(tasks, { priority: 'urgent' }).length, 1);
});
