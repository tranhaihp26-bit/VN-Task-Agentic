import { Task } from '../types';

export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('Browser does not support desktop notifications');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
};

export const sendDeadlineNotification = (task: Task, onComplete?: () => void, onSnooze?: () => void) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const title = `⏰ Nhắc nhở hạn chót: ${task.title}`;
  const options: NotificationOptions = {
    body: `Danh mục: ${task.category} — Hạn chót: ${task.dueDate} ${task.dueTime ? task.dueTime : ''}`,
    icon: '/icon.svg',
    tag: `task-${task.id}`,
    requireInteraction: true,
  };

  try {
    const notification = new Notification(title, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch (e) {
    console.error('Notification error:', e);
  }
};
