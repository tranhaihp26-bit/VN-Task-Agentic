import React, { useState } from 'react';
import { X, FolderSync, CheckCircle2, Download, Upload, LogIn, LogOut } from 'lucide-react';
import { googleSignIn, logoutGoogle, fetchGoogleTasks, getAccessToken } from '../services/googleTasks';
import { Task } from '../types';

interface GoogleTasksSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: Task[];
  onImportTasks: (newTasks: Task[]) => void;
}

export const GoogleTasksSyncModal: React.FC<GoogleTasksSyncModalProps> = ({
  isOpen,
  onClose,
  tasks,
  onImportTasks,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async () => {
    try {
      const res = await googleSignIn();
      if (res) {
        setIsLoggedIn(true);
        setUserName(res.user.displayName || res.user.email);
        setSyncStatus('Đã xác thực kết nối tài khoản đồng bộ thành công.');
      }
    } catch {
      setSyncStatus('Không thể xác thực tài khoản. Đề nghị kiểm tra quyền truy cập cửa sổ đăng nhập.');
    }
  };

  const handleLogout = async () => {
    await logoutGoogle();
    setIsLoggedIn(false);
    setUserName(null);
    setSyncStatus('Đã ngắt kết nối tài khoản đồng bộ.');
  };

  const handleSyncFromGoogle = async () => {
    setIsSyncing(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        setSyncStatus('Đề nghị đăng nhập tài khoản trước khi thực hiện đồng bộ.');
        setIsSyncing(false);
        return;
      }
      const gTasks = await fetchGoogleTasks(token);
      const converted: Task[] = gTasks.map((gt: any, idx: number) => ({
        id: 'g-task-' + gt.id,
        documentNumber: `${500 + idx}/ĐB-GT`,
        title: gt.title,
        description: gt.notes || '',
        category: 'Chỉ đạo điều hành',
        assignee: 'Văn phòng Cơ quan',
        priority: 'medium',
        status: gt.status === 'completed' ? 'completed' : 'pending',
        dueDate: gt.due ? gt.due.split('T')[0] : new Date().toISOString().split('T')[0],
        completed: gt.status === 'completed',
        tags: [],
        googleTaskId: gt.id,
        createdAt: new Date().toISOString(),
      }));
      onImportTasks(converted);
      setSyncStatus(`Đã tiếp nhận và đồng bộ thành công ${converted.length} hồ sơ nhiệm vụ.`);
    } catch {
      setSyncStatus('Không thể tải danh sách tác vụ từ máy chủ đồng bộ.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(tasks, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `sao_luu_ho_so_nhiem_vu_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    document.body.removeChild(dlAnchor);
    setSyncStatus('Đã trích xuất tệp sao lưu hồ sơ định dạng chuẩn (JSON).');
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], 'UTF-8');
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (Array.isArray(parsed)) {
            onImportTasks(parsed);
            setSyncStatus(`Đã khôi phục thành công ${parsed.length} hồ sơ nhiệm vụ từ tệp sao lưu.`);
          }
        } catch {
          setSyncStatus('Tệp dữ liệu tải lên không đúng định dạng chuẩn.');
        }
      };
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-lg rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FolderSync className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Đồng bộ Dữ liệu Trực tuyến & Sao lưu Hồ sơ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* External Account Sync */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
            1. Liên kết Tài khoản Công vụ Trực tuyến
          </h4>
          {isLoggedIn ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                Đã kết nối: {userName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950 text-rose-700 text-xs font-semibold hover:bg-rose-100 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ngắt kết nối</span>
              </button>
            </div>
          ) : (
            <div>
              <p className="text-xs text-slate-600 dark:text-slate-300 mb-2.5">
                Xác thực tài khoản để tiếp nhận và đồng bộ danh mục công việc cá nhân từ hệ thống trực tuyến.
              </p>
              <button
                type="button"
                onClick={handleLogin}
                className="flex items-center gap-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition"
              >
                <LogIn className="w-4 h-4" />
                <span>Xác thực Tài khoản Đồng bộ</span>
              </button>
            </div>
          )}

          {isLoggedIn && (
            <button
              type="button"
              onClick={handleSyncFromGoogle}
              disabled={isSyncing}
              className="w-full mt-2 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
            >
              <FolderSync className="w-4 h-4" />
              <span>{isSyncing ? 'Đang tải dữ liệu...' : 'Tiếp nhận Nhiệm vụ từ Tài khoản Liên kết'}</span>
            </button>
          )}
        </div>

        {/* Backup & Restore Section */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3">
          <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
            2. Sao lưu & Khôi phục Tệp Hồ sơ Dự phòng
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleExportJSON}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition"
            >
              <Download className="w-4 h-4" />
              <span>Trích xuất tệp sao lưu</span>
            </button>

            <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-100 transition cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>Phục hồi từ tệp</span>
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
          </div>
        </div>

        {syncStatus && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{syncStatus}</span>
          </div>
        )}
      </div>
    </div>
  );
};
