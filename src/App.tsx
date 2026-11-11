/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Task, Tag, MeetingRecord, UserSettings, TaskStatus } from './types';
import {
  loadTasks,
  saveTasks,
  loadTags,
  loadMeetings,
  saveMeetings,
  loadSettings,
  saveSettings,
} from './utils/storage';
import {
  transitionTaskStatus,
  calculateNextRecurringDate,
  getNextWorkflowStage,
  getStageLabel,
  resolveTaskStatus,
} from './utils/workflow';
import { Navbar } from './components/Navbar';
import { TaskBoard } from './components/TaskBoard';
import { DashboardView } from './components/DashboardView';
import { TaskModal } from './components/TaskModal';
import { MeetingRecorder } from './components/MeetingRecorder';
import { WeeklyReportView } from './components/WeeklyReportView';
import { VoiceAssistantModal } from './components/VoiceAssistantModal';
import { GoogleTasksSyncModal } from './components/GoogleTasksSyncModal';
import { McpIntegrationModal } from './components/McpIntegrationModal';
import { SettingsView } from './components/SettingsView';
import { NotificationBanner } from './components/NotificationBanner';
import { FocusProjectsModal } from './components/FocusProjectsModal';
import {
  FileText,
  Plus,
  Calendar,
  UserCheck,
  CheckCircle2,
  LayoutDashboard,
  ClipboardList,
  BarChart3,
  Settings,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  onAuthUserChanged,
  signInWithGoogle,
  signOutUser,
  subscribeUserTasks,
  saveUserTaskToFirestore,
  deleteUserTaskFromFirestore,
  bulkSyncTasksToFirestore,
  subscribeUserTags,
  bulkSyncTagsToFirestore,
  subscribeUserMeetings,
  saveUserMeetingToFirestore,
  subscribeUserSettings,
  saveUserSettingsToFirestore,
  runFirestoreSyncVerification,
  FirestoreVerificationReport,
} from './services/firebase';

export default function App() {
  const [activeTab, setActiveTab] = useState<'tasks' | 'meetings' | 'reports' | 'settings' | 'dashboard'>('dashboard');
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks());
  const [tags, setTags] = useState<Tag[]>(() => loadTags());
  const [meetings, setMeetings] = useState<MeetingRecord[]>(() => loadMeetings());
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncReport, setSyncReport] = useState<FirestoreVerificationReport | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isMcpModalOpen, setIsMcpModalOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3600);
  }, []);

  // Debounced localStorage cache write (300ms) so high-frequency timer ticks never block the main thread
  useEffect(() => {
    const timer = setTimeout(() => {
      saveTasks(tasks);
    }, 300);
    return () => clearTimeout(timer);
  }, [tasks]);

  useEffect(() => {
    saveMeetings(meetings);
  }, [meetings]);

  useEffect(() => {
    saveSettings(settings);
    if (settings.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings]);

  // Global keyboard shortcut: press 'N' (when not typing in an input) to open New Task modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (
        !isInputFocused &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        (e.key === 'n' || e.key === 'N') &&
        !isTaskModalOpen &&
        !isMeetingModalOpen &&
        !isVoiceModalOpen
      ) {
        e.preventDefault();
        setEditingTask(null);
        setIsTaskModalOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTaskModalOpen, isMeetingModalOpen, isVoiceModalOpen]);

  // Firebase Auth & Real-Time Firestore Sync (supports both personal user & default unit workspace)
  useEffect(() => {
    let unsubs: (() => void)[] = [];
    let isCancelled = false;

    const attachFirestoreListeners = async (user: User | null) => {
      unsubs.forEach((unsub) => unsub());
      unsubs = [];

      const activeScopeId = user?.uid ?? null;
      setIsSyncing(true);

      // 1. Subscribe to Tasks
      const unsubTasks = subscribeUserTasks(
        activeScopeId,
        async (firestoreTasks) => {
          if (firestoreTasks.length > 0) {
            setTasks(firestoreTasks);
          } else {
            const localTasks = loadTasks();
            if (localTasks.length > 0) {
              await bulkSyncTasksToFirestore(activeScopeId, localTasks);
            }
          }
          setIsSyncing(false);
        },
        (err) => {
          console.error('Firestore Tasks sync error:', err);
          setIsSyncing(false);
        }
      );
      unsubs.push(unsubTasks);

      // 2. Subscribe to Tags
      const unsubTags = subscribeUserTags(activeScopeId, async (firestoreTags) => {
        if (firestoreTags.length > 0) {
          setTags(firestoreTags);
        } else {
          const localTags = loadTags();
          if (localTags.length > 0) {
            await bulkSyncTagsToFirestore(activeScopeId, localTags);
          }
        }
      });
      unsubs.push(unsubTags);

      // 3. Subscribe to Meetings
      const unsubMeetings = subscribeUserMeetings(activeScopeId, async (firestoreMeetings) => {
        if (firestoreMeetings.length > 0) {
          setMeetings(firestoreMeetings);
        } else {
          const localMeetings = loadMeetings();
          for (const m of localMeetings) {
            await saveUserMeetingToFirestore(activeScopeId, m);
          }
        }
      });
      unsubs.push(unsubMeetings);

      // 4. Subscribe to Settings
      const unsubSettings = subscribeUserSettings(activeScopeId, (firestoreSettings) => {
        setSettings(firestoreSettings);
      });
      unsubs.push(unsubSettings);

      // 5. Run initial end-to-end verification report
      try {
        const report = await runFirestoreSyncVerification(activeScopeId, {
          tasks: loadTasks(),
          tags: loadTags(),
          meetings: loadMeetings(),
          settings: loadSettings(),
        });
        if (!isCancelled) {
          setSyncReport(report);
        }
      } catch (err) {
        console.error('Initial sync verification failed:', err);
      }
    };

    const unsubscribeAuth = onAuthUserChanged((user) => {
      setFirebaseUser(user);
      attachFirestoreListeners(user);
    });

    return () => {
      isCancelled = true;
      unsubscribeAuth();
      unsubs.forEach((unsub) => unsub());
    };
  }, []);

  const handleSignInGoogle = async () => {
    try {
      setIsSyncing(true);
      const user = await signInWithGoogle();
      setFirebaseUser(user);
      showToast('Đã xác thực tài khoản Google và kết nối cơ sở dữ liệu Firebase Firestore.');
    } catch (error) {
      console.error('Sign In failed:', error);
      showToast('Đang sử dụng Không gian Cơ quan Mặc định trên Cloud Firestore.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOutGoogle = async () => {
    try {
      await signOutUser();
      setFirebaseUser(null);
      showToast('Đã chuyển về Không gian Cơ quan Mặc định trên Cloud Firestore.');
    } catch (error) {
      console.error('Sign Out failed:', error);
    }
  };

  const handleManualCloudSync = async () => {
    try {
      setIsSyncing(true);
      const report = await runFirestoreSyncVerification(firebaseUser?.uid, {
        tasks,
        tags,
        meetings,
        settings,
      });
      setSyncReport(report);
      if (report.connected) {
        showToast(
          `Đã kiểm tra & đồng bộ thành công ${report.serverCounts.tasks} hồ sơ nhiệm vụ lên Cloud Firestore (${report.latencyMs} ms).`
        );
      } else {
        showToast('Phát hiện lỗi kết nối khi đối soát máy chủ Firestore.');
      }
    } catch (err) {
      console.error('Manual sync error:', err);
      showToast('Lỗi đồng bộ dữ liệu lên đám mây. Vui lòng kiểm tra kết nối.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleAddTask = (newTaskData: Omit<Task, 'id' | 'createdAt'>) => {
    const newTask: Task = {
      ...newTaskData,
      id: 'task-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    saveUserTaskToFirestore(firebaseUser?.uid, newTask);
    showToast(`Đã tiếp nhận & đồng bộ hồ sơ công việc: "${newTask.title}"`);
  };

  const handleToggleTask = (id: string) => {
    setTasks((prevTasks) => {
      const taskIndex = prevTasks.findIndex((t) => t.id === id);
      if (taskIndex === -1) return prevTasks;

      const task = prevTasks[taskIndex];
      const newCompleted = !task.completed;
      const targetStatus: TaskStatus = newCompleted ? 'completed' : 'in_progress';
      const updatedTask = transitionTaskStatus(task, targetStatus);

      let updatedTasks = prevTasks.map((t) => (t.id === id ? updatedTask : t));
      saveUserTaskToFirestore(firebaseUser?.uid, updatedTask);

      if (newCompleted && task.recurrence && task.recurrence !== 'none') {
        const nextDueDate = calculateNextRecurringDate(task.dueDate, task.recurrence);
        const nextRecurringTask: Task = {
          ...task,
          id: 'task-' + Date.now(),
          dueDate: nextDueDate,
          status: 'pending',
          completed: false,
          subtasks: task.subtasks ? task.subtasks.map((st) => ({ ...st, completed: false })) : undefined,
          createdAt: new Date().toISOString(),
        };

        updatedTasks = [nextRecurringTask, ...updatedTasks];
        saveUserTaskToFirestore(firebaseUser?.uid, nextRecurringTask);
      }

      return updatedTasks;
    });
  };

  const handleAdvanceTask = useCallback(
    (task: Task) => {
      const currentStatus = resolveTaskStatus(task);
      const nextStatus = getNextWorkflowStage(currentStatus);
      const updatedTask = transitionTaskStatus(task, nextStatus);
      setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)));
      saveUserTaskToFirestore(firebaseUser?.uid, updatedTask);
      const stageLabel = getStageLabel(nextStatus);
      showToast(`Đã chuyển hồ sơ "${task.documentNumber || task.title}" sang bước: ${stageLabel}`);
    },
    [firebaseUser?.uid, showToast]
  );

  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
    deleteUserTaskFromFirestore(firebaseUser?.uid, id);
    showToast('Đã xóa hồ sơ nhiệm vụ khỏi sổ theo dõi và Cloud Firestore.');
  };

  const handleUpdateTask = useCallback(
    (updatedTask: Task, options?: { isTimerTick?: boolean }) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      // When ticking the timer every 1 second, throttle Firestore network writes to once every 10s
      if (options?.isTimerTick) {
        if ((updatedTask.timeSpent || 0) % 10 === 0) {
          saveUserTaskToFirestore(firebaseUser?.uid, updatedTask);
        }
      } else {
        saveUserTaskToFirestore(firebaseUser?.uid, updatedTask);
      }
    },
    [firebaseUser?.uid]
  );

  const handleReorderTasks = (newTasks: Task[]) => {
    setTasks(newTasks);
    bulkSyncTasksToFirestore(firebaseUser?.uid, newTasks);
  };

  const handleSnoozeTask = (id: string, hours: number) => {
    const updated = tasks.map((t) => {
      if (t.id === id) {
        const snoozeDate = new Date(Date.now() + hours * 3600000).toISOString().split('T')[0];
        const modified = { ...t, dueDate: snoozeDate };
        saveUserTaskToFirestore(firebaseUser?.uid, modified);
        return modified;
      }
      return t;
    });
    setTasks(updated);
    showToast('Đã gia hạn thời gian xử lý nhiệm vụ và đồng bộ lên Firestore.');
  };

  const handleSaveMeeting = (newMeeting: MeetingRecord) => {
    setMeetings((prev) => [newMeeting, ...prev]);
    saveUserMeetingToFirestore(firebaseUser?.uid, newMeeting);
    showToast('Đã lưu biên bản kết luận hội nghị lên Cloud Firestore.');
  };

  const handleUpdateSettings = (newSettings: UserSettings) => {
    setSettings(newSettings);
    saveUserSettingsToFirestore(firebaseUser?.uid, newSettings);
  };

  const openCreateTaskModal = () => {
    setEditingTask(null);
    setIsTaskModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        darkMode={settings.darkMode}
        setDarkMode={(val) => handleUpdateSettings({ ...settings, darkMode: val })}
        onOpenNewTask={openCreateTaskModal}
        onOpenVoice={() => setIsVoiceModalOpen(true)}
        onOpenSync={() => setIsSyncModalOpen(true)}
        onOpenMeeting={() => setIsMeetingModalOpen(true)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        currentUser={firebaseUser}
        onSignInGoogle={handleSignInGoogle}
        onSignOutGoogle={handleSignOutGoogle}
        onCheckCloudSync={handleManualCloudSync}
        isSyncing={isSyncing}
        isCloudConnected={Boolean(syncReport?.connected)}
      />

      {/* Mobile Navigation Bar */}
      <div className="lg:hidden bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 py-2 flex items-center gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'Tổng quan', icon: LayoutDashboard },
          { id: 'tasks', label: 'Sổ nhiệm vụ', icon: ClipboardList },
          { id: 'meetings', label: 'Hội nghị', icon: FileText },
          { id: 'reports', label: 'Thống kê', icon: BarChart3 },
          { id: 'settings', label: 'Cấu hình', icon: Settings },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                isActive
                  ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>

      {toastMessage && (
        <div
          key={toastMessage}
          className="animate-toast-enter bg-emerald-900 text-white px-4 py-2.5 text-xs font-medium flex items-center justify-between max-w-7xl w-full mx-auto mt-3 rounded-lg shadow-sm"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-emerald-200 hover:text-white text-[11px] font-semibold ml-4"
          >
            Đóng
          </button>
        </div>
      )}

      {settings.notificationsEnabled && (
        <NotificationBanner
          tasks={tasks}
          onToggleTask={handleToggleTask}
          onSnoozeTask={handleSnoozeTask}
        />
      )}

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6">
        {activeTab === 'dashboard' && (
          <div key="tab-dashboard" className="animate-view-enter">
            <DashboardView
              tasks={tasks}
              tags={tags}
              setActiveTab={setActiveTab}
              onSelectStatusFilter={setStatusFilter}
              onEditTask={openEditTaskModal}
              onAdvanceTask={handleAdvanceTask}
              onOpenNewTask={openCreateTaskModal}
              onOpenMeeting={() => setIsMeetingModalOpen(true)}
              onOpenVoice={() => setIsVoiceModalOpen(true)}
              onOpenSync={() => setIsSyncModalOpen(true)}
            />
          </div>
        )}

        {activeTab === 'tasks' && (
          <div key="tab-tasks" className="animate-view-enter">
            <TaskBoard
              tasks={tasks}
              tags={tags}
              onAddTask={openCreateTaskModal}
              onEditTask={openEditTaskModal}
              onToggleTask={handleToggleTask}
              onDeleteTask={handleDeleteTask}
              onReorderTasks={handleReorderTasks}
              onUpdateTask={handleUpdateTask}
              onOpenFocusProjects={() => setIsFocusModalOpen(true)}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
            />
          </div>
        )}

        {activeTab === 'meetings' && (
          <div key="tab-meetings" className="animate-view-enter max-w-5xl mx-auto space-y-6 pb-12">
            <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/60">
                    Lưu trữ Văn thư & Hội nghị
                  </span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                  Sổ Biên bản & Thông báo Kết luận Hội nghị
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Quản lý hồ sơ biên bản cuộc họp giao ban, tự động trích xuất kết luận chỉ đạo và phân giao nhiệm vụ cho các đơn vị.
                </p>
              </div>

              <button
                onClick={() => setIsMeetingModalOpen(true)}
                className="btn-interactive flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs transition shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Lập biên bản hội nghị mới</span>
              </button>
            </div>

            <div className="space-y-4">
              {meetings.length === 0 ? (
                <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-8 shadow-xs">
                  <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
                    Chưa có hồ sơ biên bản hội nghị nào
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Nhấn nút &ldquo;Lập biên bản hội nghị mới&rdquo; để ghi âm hoặc trích xuất thông báo kết luận cuộc họp.
                  </p>
                </div>
              ) : (
                meetings.map((meet) => (
                  <div
                    key={meet.id}
                    className="card-interactive p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400 shrink-0" />
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {meet.title}
                        </h3>
                      </div>
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 tabular-nums">
                        <Calendar className="w-3.5 h-3.5" />
                        Ngày họp: {meet.date}
                      </span>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        1. Tóm tắt nội dung điều hành:
                      </span>
                      <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-3.5 rounded-lg border border-slate-200/60 dark:border-slate-800 mt-1.5 leading-relaxed">
                        {meet.summary}
                      </p>
                    </div>

                    <div>
                      <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        2. Các kết luận chỉ đạo trọng tâm:
                      </span>
                      <ul className="list-disc list-inside text-xs text-slate-700 dark:text-slate-300 mt-1.5 space-y-1.5">
                        {meet.keyPoints?.map((kp, idx) => (
                          <li key={idx} className="leading-relaxed">
                            {kp}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {meet.actionItems && meet.actionItems.length > 0 && (
                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                          3. Nhiệm vụ giao đơn vị triển khai ({meet.actionItems.length}):
                        </span>
                        <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                          {meet.actionItems.map((item, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between gap-3 text-xs p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-800"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                                  {item.title}
                                </p>
                                <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                                  <UserCheck className="w-3 h-3 text-blue-600" />
                                  Đơn vị thực hiện: {item.assignee}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  handleAddTask({
                                    title: item.title,
                                    description: `Triển khai thông báo kết luận tại hội nghị: ${meet.title} (${meet.date})`,
                                    assignee: item.assignee,
                                    dueDate: new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
                                    priority: 'high',
                                    category: 'Văn bản - Hồ sơ',
                                    tags: ['tag-1'],
                                    status: 'pending',
                                    completed: false,
                                  })
                                }
                                className="btn-interactive px-2.5 py-1 rounded bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 text-blue-700 dark:text-blue-300 font-semibold text-[11px] shrink-0 transition"
                              >
                                + Vào sổ nhiệm vụ
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div key="tab-reports" className="animate-view-enter">
            <WeeklyReportView tasks={tasks} />
          </div>
        )}

        {activeTab === 'settings' && (
          <div key="tab-settings" className="animate-view-enter">
            <SettingsView
              settings={settings}
              onUpdateSettings={handleUpdateSettings}
              onOpenSync={() => setIsSyncModalOpen(true)}
              onOpenMcp={() => setIsMcpModalOpen(true)}
              currentUser={firebaseUser}
              onSignInGoogle={handleSignInGoogle}
              onSignOutGoogle={handleSignOutGoogle}
              onManualCloudSync={handleManualCloudSync}
              isSyncing={isSyncing}
              syncReport={syncReport}
            />
          </div>
        )}
      </main>

      {/* Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleAddTask}
        onUpdate={(t) => handleUpdateTask(t)}
        editingTask={editingTask}
        tags={tags}
      />

      <MeetingRecorder
        isOpen={isMeetingModalOpen}
        onClose={() => setIsMeetingModalOpen(false)}
        onSaveMeeting={handleSaveMeeting}
        onAddTaskFromMeeting={handleAddTask}
        tags={tags}
      />

      <VoiceAssistantModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onAddQuickTask={handleAddTask}
      />

      <GoogleTasksSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        tasks={tasks}
        onImportTasks={(newTasks) => {
          const merged = [...newTasks, ...tasks];
          setTasks(merged);
          bulkSyncTasksToFirestore(firebaseUser?.uid, merged);
        }}
      />

      <McpIntegrationModal
        isOpen={isMcpModalOpen}
        onClose={() => setIsMcpModalOpen(false)}
        settings={settings}
        onSaveSettings={handleUpdateSettings}
      />

      <FocusProjectsModal
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        tasks={tasks}
      />
    </div>
  );
}

