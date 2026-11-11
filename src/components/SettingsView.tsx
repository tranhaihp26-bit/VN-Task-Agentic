import React from 'react';
import { UserSettings } from '../types';
import {
  Bell,
  Moon,
  Sun,
  Network,
  FolderSync,
  Cloud,
  LogIn,
  LogOut,
  Loader2,
  Database,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  Server,
  Activity,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { FirestoreVerificationReport, FIREBASE_METADATA } from '../services/firebase';

interface SettingsViewProps {
  settings: UserSettings;
  onUpdateSettings: (newSettings: UserSettings) => void;
  onOpenSync: () => void;
  onOpenMcp: () => void;
  currentUser?: User | null;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
  onManualCloudSync?: () => void;
  isSyncing?: boolean;
  syncReport?: FirestoreVerificationReport | null;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  onUpdateSettings,
  onOpenSync,
  onOpenMcp,
  currentUser,
  onSignInGoogle,
  onSignOutGoogle,
  onManualCloudSync,
  isSyncing,
  syncReport,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      <div className="pb-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Cấu hình Hệ thống & Kiểm tra Đồng bộ Dữ liệu
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Giám sát kết nối thời gian thực với Google Cloud Firestore, đối soát số lượng bản ghi và thiết lập vận hành
          </p>
        </div>

        <button
          type="button"
          onClick={onManualCloudSync}
          disabled={isSyncing}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition disabled:opacity-50 whitespace-nowrap shrink-0 shadow-xs"
        >
          {isSyncing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4" />
          )}
          <span>{isSyncing ? 'Đang kiểm tra & đồng bộ...' : 'Kiểm tra & Đồng bộ ngay'}</span>
        </button>
      </div>

      {/* Firebase Firestore Live Verification & Diagnostics Panel */}
      <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/70 flex items-center justify-center text-blue-700 dark:text-blue-400 shrink-0 border border-blue-200/60 dark:border-blue-800/60">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-bold text-base text-slate-900 dark:text-white">
                  Trạng thái Đồng bộ Cơ sở Dữ liệu Tập trung (Firebase Firestore)
                </h2>
                {syncReport?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Trực tuyến · Đã đồng bộ
                  </span>
                ) : isSyncing ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang đối soát máy chủ...
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Chưa đối soát
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                Tự động đồng bộ hai chiều thời gian thực (onSnapshot) toàn bộ hồ sơ nhiệm vụ, biên bản hội nghị, nhãn phân loại và cấu hình hệ thống.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentUser ? (
              <button
                type="button"
                onClick={onSignOutGoogle}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất tài khoản cá nhân</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSignInGoogle}
                className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                <span>Đăng nhập Tài khoản Google Cá nhân</span>
              </button>
            )}
          </div>
        </div>

        {/* Technical Connection Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-200/70 dark:border-slate-800 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Server className="w-3.5 h-3.5 text-blue-600" />
              Mã Dự án (Project ID)
            </span>
            <p className="font-mono font-semibold text-slate-900 dark:text-white truncate">
              {syncReport?.projectId || FIREBASE_METADATA.projectId}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              Định danh Cơ sở dữ liệu
            </span>
            <p
              className="font-mono font-semibold text-slate-900 dark:text-white truncate"
              title={syncReport?.databaseId || FIREBASE_METADATA.databaseId}
            >
              {syncReport?.databaseId || FIREBASE_METADATA.databaseId}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Phân vùng lưu trữ hoạt động
            </span>
            <p className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 truncate">
              /{syncReport?.activePath || (currentUser ? `users/${currentUser.uid}` : 'workspaces/don-vi-cong-vu')}
            </p>
          </div>

          <div className="space-y-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              Độ trễ & Thời điểm đối soát
            </span>
            <p className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {syncReport ? `${syncReport.latencyMs} ms · ${syncReport.checkedAt}` : 'Đang khởi tạo...'}
            </p>
          </div>
        </div>

        {/* Verified Server Document Counts */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5">
            Số lượng Bản ghi Đã Xác thực Lưu trữ trên Máy chủ Cloud Firestore
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">Hồ sơ Nhiệm vụ (tasks)</p>
              <p className="text-xl font-bold text-blue-700 dark:text-blue-400 mt-1 tabular-nums">
                {syncReport ? `${syncReport.serverCounts.tasks} bản ghi` : '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">Nhãn phân loại (tags)</p>
              <p className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mt-1 tabular-nums">
                {syncReport ? `${syncReport.serverCounts.tags} bản ghi` : '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">Biên bản Hội nghị (meetings)</p>
              <p className="text-xl font-bold text-emerald-700 dark:text-emerald-400 mt-1 tabular-nums">
                {syncReport ? `${syncReport.serverCounts.meetings} bản ghi` : '—'}
              </p>
            </div>
            <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <p className="text-xs text-slate-500 dark:text-slate-400">Cấu hình Vận hành (settings)</p>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">
                {syncReport?.serverCounts.settingsSynced ? 'Đã đồng bộ' : 'Đang kiểm tra'}
              </p>
            </div>
          </div>
        </div>

        {/* 5-Step Verification Log */}
        {syncReport && syncReport.steps.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nhật ký Kiểm tra & Đối soát Máy chủ Trực tiếp (05 Bước)
            </h3>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 rounded-lg border border-slate-200 dark:border-slate-800 overflow-hidden">
              {syncReport.steps.map((step) => (
                <div
                  key={step.id}
                  className="p-3 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="flex items-start gap-2.5">
                    {step.status === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{step.label}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{step.detail}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-mono font-semibold text-slate-500 dark:text-slate-400 shrink-0 tabular-nums">
                    {step.durationMs} ms
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Other System Settings */}
      <div className="space-y-4">
        {/* Appearance */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
              {settings.darkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">Chế độ Hiển thị Giao diện Tối</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Điều chỉnh độ tương phản màn hình phù hợp điều kiện ánh sáng làm việc
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.darkMode}
            aria-label="Bật tắt giao diện tối"
            onClick={() => onUpdateSettings({ ...settings, darkMode: !settings.darkMode })}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
              settings.darkMode ? 'bg-blue-700' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.darkMode ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Notifications */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-950 flex items-center justify-center text-amber-700 dark:text-amber-400 shrink-0">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Cảnh báo Đôn đốc Hồ sơ Sắp đến Hạn
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Hiển thị thông báo nhắc nhở đối với các nhiệm vụ đến hạn xử lý trong ngày
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={settings.notificationsEnabled}
            aria-label="Bật tắt cảnh báo hạn xử lý"
            onClick={() => onUpdateSettings({ ...settings, notificationsEnabled: !settings.notificationsEnabled })}
            className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
              settings.notificationsEnabled ? 'bg-blue-700' : 'bg-slate-300'
            }`}
          >
            <span
              className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${
                settings.notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Sync & Backup */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-700 dark:text-indigo-400 shrink-0">
              <FolderSync className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Đồng bộ Tác vụ Trực tuyến & Sao lưu Hồ sơ Dự phòng
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Kết nối dịch vụ Google hoặc trích xuất tệp dữ liệu dự phòng định dạng chuẩn (JSON)
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenSync}
            className="px-4 py-2 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0"
          >
            Quản lý sao lưu
          </button>
        </div>

        {/* System Interoperability */}
        <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-950 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0">
              <Network className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-900 dark:text-white">
                Cổng Kết nối Liên thông Hệ thống (Giao thức Tích hợp)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Khai báo địa chỉ máy chủ và khóa xác thực phục vụ tích hợp dữ liệu điều hành nội bộ
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenMcp}
            className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition whitespace-nowrap shrink-0"
          >
            Cấu hình liên thông
          </button>
        </div>
      </div>
    </div>
  );
};
