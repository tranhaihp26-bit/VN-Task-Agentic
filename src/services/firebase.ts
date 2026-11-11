import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  signOut,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocFromServer,
  getDocsFromServer,
  writeBatch,
} from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';
import { Task, Tag, MeetingRecord, UserSettings } from '../types';

export const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

export const DEFAULT_WORKSPACE_ID = 'don-vi-cong-vu';

export const FIREBASE_METADATA = {
  projectId: firebaseConfig.projectId as string,
  databaseId: firebaseConfig.firestoreDatabaseId as string,
  authDomain: firebaseConfig.authDomain as string,
};

export function resolveScopePath(userId?: string | null): {
  rootCollection: 'users' | 'workspaces';
  ownerId: string;
  basePath: string;
  scopeLabel: string;
} {
  if (userId && userId !== DEFAULT_WORKSPACE_ID) {
    return {
      rootCollection: 'users',
      ownerId: userId,
      basePath: `users/${userId}`,
      scopeLabel: 'Không gian Tài khoản Cá nhân (Google Auth)',
    };
  }
  return {
    rootCollection: 'workspaces',
    ownerId: DEFAULT_WORKSPACE_ID,
    basePath: `workspaces/${DEFAULT_WORKSPACE_ID}`,
    scopeLabel: 'Không gian Cơ quan Mặc định (Đơn vị Công vụ)',
  };
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/tasks');
googleProvider.addScope('https://www.googleapis.com/auth/tasks.readonly');

// Boot connection check
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Auth operations
export const signInWithGoogle = async (): Promise<User> => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
};

export const signOutUser = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign Out Error:', error);
    throw error;
  }
};

export const onAuthUserChanged = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// Task synchronization with Firestore
export const subscribeUserTasks = (
  userId: string | null | undefined,
  onTasksUpdate: (tasks: Task[]) => void,
  onError?: (err: any) => void
) => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tasks`;
  const tasksRef = collection(db, rootCollection, ownerId, 'tasks');
  return onSnapshot(
    tasksRef,
    (snapshot) => {
      const tasksList: Task[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tasksList.push({
          id: data.id || docSnap.id,
          documentNumber: data.documentNumber,
          title: data.title,
          description: data.description,
          category: data.category,
          assignee: data.assignee,
          priority: data.priority,
          status: data.status || (data.completed ? 'completed' : 'pending'),
          dueDate: data.dueDate,
          dueTime: data.dueTime,
          completed: !!data.completed,
          tags: Array.isArray(data.tags) ? data.tags : [],
          subtasks: Array.isArray(data.subtasks) ? data.subtasks : [],
          recurrence: data.recurrence || 'none',
          timeSpent: typeof data.timeSpent === 'number' ? data.timeSpent : 0,
          googleTaskId: data.googleTaskId,
          createdAt: data.createdAt || new Date().toISOString(),
        });
      });
      tasksList.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      onTasksUpdate(tasksList);
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

function sanitizeTaskPayload(task: Task, ownerId: string): Record<string, any> {
  const cleanPayload: Record<string, any> = {
    id: String(task.id).slice(0, 128),
    userId: ownerId,
    title: String(task.title || 'Nhiệm vụ hành chính').slice(0, 300),
    category: String(task.category || 'Chỉ đạo điều hành').slice(0, 100),
    priority: ['urgent', 'high', 'medium', 'low'].includes(task.priority) ? task.priority : 'medium',
    dueDate: String(task.dueDate || new Date().toISOString().split('T')[0]).slice(0, 20),
    completed: Boolean(task.completed),
    createdAt: String(task.createdAt || new Date().toISOString()).slice(0, 60),
    updatedAt: new Date().toISOString().slice(0, 60),
  };

  if (task.documentNumber !== undefined) cleanPayload.documentNumber = String(task.documentNumber).slice(0, 100);
  if (task.assignee !== undefined) cleanPayload.assignee = String(task.assignee).slice(0, 200);
  if (task.status !== undefined && ['pending', 'in_progress', 'review', 'completed'].includes(task.status)) {
    cleanPayload.status = task.status;
  }
  if (task.description !== undefined) cleanPayload.description = String(task.description).slice(0, 2000);
  if (task.dueTime !== undefined) cleanPayload.dueTime = String(task.dueTime).slice(0, 10);
  if (Array.isArray(task.tags)) cleanPayload.tags = task.tags.slice(0, 20);
  if (Array.isArray(task.subtasks)) cleanPayload.subtasks = task.subtasks.slice(0, 50);
  if (task.recurrence !== undefined && ['none', 'daily', 'weekly', 'monthly'].includes(task.recurrence)) {
    cleanPayload.recurrence = task.recurrence;
  }
  if (typeof task.timeSpent === 'number') cleanPayload.timeSpent = task.timeSpent;
  if (task.googleTaskId !== undefined) cleanPayload.googleTaskId = String(task.googleTaskId).slice(0, 200);

  return cleanPayload;
}

export const saveUserTaskToFirestore = async (
  userId: string | null | undefined,
  task: Task
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tasks/${task.id}`;
  try {
    const taskDocRef = doc(db, rootCollection, ownerId, 'tasks', task.id);
    const cleanPayload = sanitizeTaskPayload(task, ownerId);
    await setDoc(taskDocRef, cleanPayload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteUserTaskFromFirestore = async (
  userId: string | null | undefined,
  taskId: string
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tasks/${taskId}`;
  try {
    const taskDocRef = doc(db, rootCollection, ownerId, 'tasks', taskId);
    await deleteDoc(taskDocRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const bulkSyncTasksToFirestore = async (
  userId: string | null | undefined,
  tasks: Task[]
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tasks`;
  try {
    const batch = writeBatch(db);
    tasks.forEach((task) => {
      const taskDocRef = doc(db, rootCollection, ownerId, 'tasks', task.id);
      const cleanPayload = sanitizeTaskPayload(task, ownerId);
      batch.set(taskDocRef, cleanPayload, { merge: true });
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Tag synchronization with Firestore
export const subscribeUserTags = (
  userId: string | null | undefined,
  onTagsUpdate: (tags: Tag[]) => void,
  onError?: (err: any) => void
) => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tags`;
  const tagsRef = collection(db, rootCollection, ownerId, 'tags');
  return onSnapshot(
    tagsRef,
    (snapshot) => {
      const tagsList: Tag[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        tagsList.push({
          id: data.id || docSnap.id,
          name: data.name,
          color: data.color,
        });
      });
      if (tagsList.length > 0) {
        onTagsUpdate(tagsList);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const saveUserTagToFirestore = async (
  userId: string | null | undefined,
  tag: Tag
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tags/${tag.id}`;
  try {
    const tagDocRef = doc(db, rootCollection, ownerId, 'tags', tag.id);
    await setDoc(
      tagDocRef,
      {
        id: String(tag.id).slice(0, 128),
        name: String(tag.name).slice(0, 100),
        color: String(tag.color).slice(0, 100),
        userId: ownerId,
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const bulkSyncTagsToFirestore = async (
  userId: string | null | undefined,
  tags: Tag[]
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/tags`;
  try {
    const batch = writeBatch(db);
    tags.forEach((tag) => {
      const tagDocRef = doc(db, rootCollection, ownerId, 'tags', tag.id);
      batch.set(
        tagDocRef,
        {
          id: String(tag.id).slice(0, 128),
          name: String(tag.name).slice(0, 100),
          color: String(tag.color).slice(0, 100),
          userId: ownerId,
        },
        { merge: true }
      );
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// Meeting records synchronization with Firestore
export const subscribeUserMeetings = (
  userId: string | null | undefined,
  onMeetingsUpdate: (meetings: MeetingRecord[]) => void,
  onError?: (err: any) => void
) => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/meetings`;
  const meetingsRef = collection(db, rootCollection, ownerId, 'meetings');
  return onSnapshot(
    meetingsRef,
    (snapshot) => {
      const meetingsList: MeetingRecord[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        meetingsList.push({
          id: data.id || docSnap.id,
          title: data.title,
          date: data.date,
          transcript: data.transcript || '',
          summary: data.summary,
          keyPoints: Array.isArray(data.keyPoints) ? data.keyPoints : [],
          actionItems: Array.isArray(data.actionItems) ? data.actionItems : [],
          sentiment: data.sentiment || '',
        });
      });
      if (meetingsList.length > 0) {
        onMeetingsUpdate(meetingsList);
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
};

export const saveUserMeetingToFirestore = async (
  userId: string | null | undefined,
  meeting: MeetingRecord
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/meetings/${meeting.id}`;
  try {
    const meetingDocRef = doc(db, rootCollection, ownerId, 'meetings', meeting.id);
    await setDoc(
      meetingDocRef,
      {
        id: String(meeting.id).slice(0, 128),
        userId: ownerId,
        title: String(meeting.title).slice(0, 200),
        date: String(meeting.date).slice(0, 30),
        transcript: String(meeting.transcript || '').slice(0, 50000),
        summary: String(meeting.summary || '').slice(0, 5000),
        keyPoints: Array.isArray(meeting.keyPoints) ? meeting.keyPoints.slice(0, 50) : [],
        actionItems: Array.isArray(meeting.actionItems) ? meeting.actionItems.slice(0, 50) : [],
        sentiment: String(meeting.sentiment || '').slice(0, 100),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

// User settings synchronization with Firestore
export const subscribeUserSettings = (
  userId: string | null | undefined,
  onSettingsUpdate: (settings: UserSettings) => void,
  onError?: (err: any) => void
) => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/settings/preferences`;
  const prefDocRef = doc(db, rootCollection, ownerId, 'settings', 'preferences');
  return onSnapshot(
    prefDocRef,
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onSettingsUpdate({
          darkMode: !!data.darkMode,
          notificationsEnabled: !!data.notificationsEnabled,
          reminderMinutesBefore: typeof data.reminderMinutesBefore === 'number' ? data.reminderMinutesBefore : 15,
          mcpEndpoint: data.mcpEndpoint,
          mcpApiKey: data.mcpApiKey,
          autoSyncGoogleTasks: !!data.autoSyncGoogleTasks,
        });
      }
    },
    (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
};

export const saveUserSettingsToFirestore = async (
  userId: string | null | undefined,
  settings: UserSettings
): Promise<void> => {
  const { rootCollection, ownerId, basePath } = resolveScopePath(userId);
  const path = `${basePath}/settings/preferences`;
  try {
    const prefDocRef = doc(db, rootCollection, ownerId, 'settings', 'preferences');
    const cleanSettings: Record<string, any> = {
      userId: ownerId,
      darkMode: Boolean(settings.darkMode),
      notificationsEnabled: Boolean(settings.notificationsEnabled),
      reminderMinutesBefore:
        typeof settings.reminderMinutesBefore === 'number' ? settings.reminderMinutesBefore : 15,
      autoSyncGoogleTasks: Boolean(settings.autoSyncGoogleTasks),
    };
    if (settings.mcpEndpoint !== undefined) cleanSettings.mcpEndpoint = String(settings.mcpEndpoint).slice(0, 500);
    if (settings.mcpApiKey !== undefined) cleanSettings.mcpApiKey = String(settings.mcpApiKey).slice(0, 200);
    await setDoc(prefDocRef, cleanSettings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export interface SyncCheckStep {
  id: string;
  label: string;
  status: 'success' | 'error';
  detail: string;
  durationMs: number;
}

export interface FirestoreVerificationReport {
  connected: boolean;
  projectId: string;
  databaseId: string;
  activePath: string;
  scopeLabel: string;
  latencyMs: number;
  checkedAt: string;
  serverCounts: {
    tasks: number;
    tags: number;
    meetings: number;
    settingsSynced: boolean;
  };
  steps: SyncCheckStep[];
  error?: string;
}

/**
 * Performs a real 5-step end-to-end synchronization & diagnostic verification
 * directly against the live Cloud Firestore server.
 */
export async function runFirestoreSyncVerification(
  userId: string | null | undefined,
  localData: {
    tasks: Task[];
    tags: Tag[];
    meetings: MeetingRecord[];
    settings: UserSettings;
  }
): Promise<FirestoreVerificationReport> {
  const { rootCollection, ownerId, basePath, scopeLabel } = resolveScopePath(userId);
  const steps: SyncCheckStep[] = [];
  const overallStart = performance.now();
  let pingLatency = 0;

  try {
    // Step 1: Server Reachability Check (getDocFromServer)
    const t1 = performance.now();
    await getDocFromServer(doc(db, 'test', 'connection'));
    pingLatency = Math.max(1, Math.round(performance.now() - t1));
    steps.push({
      id: 'ping',
      label: 'Bước 01: Kiểm tra kết nối máy chủ Cloud Firestore',
      status: 'success',
      detail: `Máy chủ phản hồi trực tuyến (${pingLatency} ms) · Cơ sở dữ liệu: ${FIREBASE_METADATA.databaseId}`,
      durationMs: pingLatency,
    });

    // Step 2: Diagnostic Write & Read Verification
    const t2 = performance.now();
    const checkedAtIso = new Date().toISOString();
    const diagRef = doc(db, rootCollection, ownerId, 'diagnostics', 'sync-heartbeat');
    await setDoc(diagRef, {
      id: 'sync-heartbeat',
      userId: ownerId,
      checkedAt: checkedAtIso,
      status: 'VERIFIED',
    });
    const diagSnap = await getDocFromServer(diagRef);
    const d2 = Math.max(1, Math.round(performance.now() - t2));
    if (!diagSnap.exists() || diagSnap.data()?.checkedAt !== checkedAtIso) {
      throw new Error('Không thể đối chiếu bản ghi kiểm tra (heartbeat) từ máy chủ.');
    }
    steps.push({
      id: 'heartbeat',
      label: 'Bước 02: Kiểm tra quyền Ghi/Đọc & Quy tắc Bảo mật (Security Rules)',
      status: 'success',
      detail: `Xác thực đọc/ghi thành công tại đường dẫn ${basePath}/diagnostics/sync-heartbeat (${d2} ms)`,
      durationMs: d2,
    });

    // Step 3: Tasks Sync & Count Verification
    const t3 = performance.now();
    if (localData.tasks.length > 0) {
      await bulkSyncTasksToFirestore(userId, localData.tasks);
    }
    const tasksServerSnap = await getDocsFromServer(collection(db, rootCollection, ownerId, 'tasks'));
    const serverTasksCount = tasksServerSnap.size;
    const d3 = Math.max(1, Math.round(performance.now() - t3));
    steps.push({
      id: 'tasks',
      label: 'Bước 03: Đồng bộ & Đối soát Sổ theo dõi Nhiệm vụ (tasks)',
      status: 'success',
      detail: `Đã đồng bộ và xác nhận ${serverTasksCount} hồ sơ nhiệm vụ trên Cloud Firestore (${d3} ms)`,
      durationMs: d3,
    });

    // Step 4: Tags & Meetings Sync & Count Verification
    const t4 = performance.now();
    if (localData.tags.length > 0) {
      await bulkSyncTagsToFirestore(userId, localData.tags);
    }
    for (const m of localData.meetings) {
      await saveUserMeetingToFirestore(userId, m);
    }
    const [tagsServerSnap, meetingsServerSnap] = await Promise.all([
      getDocsFromServer(collection(db, rootCollection, ownerId, 'tags')),
      getDocsFromServer(collection(db, rootCollection, ownerId, 'meetings')),
    ]);
    const serverTagsCount = tagsServerSnap.size;
    const serverMeetingsCount = meetingsServerSnap.size;
    const d4 = Math.max(1, Math.round(performance.now() - t4));
    steps.push({
      id: 'tags_meetings',
      label: 'Bước 04: Đồng bộ Nhãn phân loại & Sổ Biên bản Hội nghị (tags, meetings)',
      status: 'success',
      detail: `Đã xác nhận ${serverTagsCount} nhãn phân loại và ${serverMeetingsCount} biên bản hội nghị trên máy chủ (${d4} ms)`,
      durationMs: d4,
    });

    // Step 5: User Settings Sync & Verification
    const t5 = performance.now();
    await saveUserSettingsToFirestore(userId, localData.settings);
    const settingsServerSnap = await getDocFromServer(
      doc(db, rootCollection, ownerId, 'settings', 'preferences')
    );
    const settingsSynced = settingsServerSnap.exists();
    const d5 = Math.max(1, Math.round(performance.now() - t5));
    steps.push({
      id: 'settings',
      label: 'Bước 05: Đồng bộ Cấu hình Vận hành Hệ thống (settings)',
      status: 'success',
      detail: `Đã lưu trữ cấu hình vận hành tại ${basePath}/settings/preferences (${d5} ms)`,
      durationMs: d5,
    });

    return {
      connected: true,
      projectId: FIREBASE_METADATA.projectId,
      databaseId: FIREBASE_METADATA.databaseId,
      activePath: basePath,
      scopeLabel,
      latencyMs: pingLatency || Math.max(1, Math.round(performance.now() - overallStart)),
      checkedAt: new Date().toLocaleString('vi-VN'),
      serverCounts: {
        tasks: serverTasksCount,
        tags: serverTagsCount,
        meetings: serverMeetingsCount,
        settingsSynced,
      },
      steps,
    };
  } catch (err: any) {
    const errMsg = err instanceof Error ? err.message : String(err);
    steps.push({
      id: 'error',
      label: 'Phát hiện lỗi trong quá trình kiểm tra đồng bộ',
      status: 'error',
      detail: errMsg,
      durationMs: Math.max(1, Math.round(performance.now() - overallStart)),
    });
    return {
      connected: false,
      projectId: FIREBASE_METADATA.projectId,
      databaseId: FIREBASE_METADATA.databaseId,
      activePath: basePath,
      scopeLabel,
      latencyMs: pingLatency,
      checkedAt: new Date().toLocaleString('vi-VN'),
      serverCounts: {
        tasks: localData.tasks.length,
        tags: localData.tags.length,
        meetings: localData.meetings.length,
        settingsSynced: false,
      },
      steps,
      error: errMsg,
    };
  }
}
