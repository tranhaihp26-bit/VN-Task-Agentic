import React, { useRef, useEffect } from 'react';
import { Sun, Moon, Plus, Search, Cloud, Check, Loader2, LogOut, X } from 'lucide-react';
import { PWAInstallWidget } from './PWAInstallButton';
import { User } from 'firebase/auth';

interface NavbarProps {
  activeTab: 'tasks' | 'meetings' | 'reports' | 'settings' | 'dashboard';
  setActiveTab: (tab: 'tasks' | 'meetings' | 'reports' | 'settings' | 'dashboard') => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  onOpenNewTask: () => void;
  onOpenVoice: () => void;
  onOpenSync: () => void;
  onOpenMeeting: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  currentUser?: User | null;
  onSignInGoogle?: () => void;
  onSignOutGoogle?: () => void;
  onCheckCloudSync?: () => void;
  isSyncing?: boolean;
  isCloudConnected?: boolean;
}

const NAV_ITEMS: {
  id: 'dashboard' | 'tasks' | 'meetings' | 'reports' | 'settings';
  label: string;
}[] = [
  { id: 'dashboard', label: 'Tổng quan điều hành' },
  { id: 'tasks', label: 'Sổ theo dõi nhiệm vụ' },
  { id: 'meetings', label: 'Biên bản hội nghị' },
  { id: 'reports', label: 'Báo cáo thống kê' },
  { id: 'settings', label: 'Cấu hình hệ thống' },
];

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  darkMode,
  setDarkMode,
  onOpenNewTask,
  searchQuery,
  setSearchQuery,
  currentUser,
  onSignOutGoogle,
  onCheckCloudSync,
  isSyncing,
  isCloudConnected,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header className="border-b border-slate-200/90 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md sticky top-0 z-40 transition-colors">
      <div className="max-w-[1440px] mx-auto w-full flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className="text-sm xl:text-base font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap shrink-0 text-left focus:outline-none hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
        >
          Hệ thống Điều hành Công vụ
        </button>

        {/* Zone 2: 5 concise single-line navigation links with animated active indicator */}
        <nav
          aria-label="Điều hướng chính"
          className="hidden lg:flex items-center gap-3 xl:gap-5 text-xs font-medium text-slate-600 dark:text-slate-300"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`relative py-1.5 transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'text-blue-700 dark:text-blue-400 font-semibold'
                    : 'hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span>{item.label}</span>
                {isActive && (
                  <span className="animate-tab-underline absolute left-0 right-0 -bottom-[13px] h-0.5 bg-blue-700 dark:bg-blue-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Quick Search & Primary Action */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative hidden md:block w-40 xl:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              aria-label="Tra cứu hồ sơ nhiệm vụ"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (activeTab !== 'tasks') {
                  setActiveTab('tasks');
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setSearchQuery('');
                  searchInputRef.current?.blur();
                }
              }}
              placeholder="Tra cứu số hiệu..."
              className="w-full pl-8 pr-7 py-1.5 rounded-lg bg-slate-100/90 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-600 text-xs text-slate-900 dark:text-white focus:outline-none transition-all duration-150"
            />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Xóa từ khóa tra cứu"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <kbd className="hidden xl:inline-block absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-700 px-1 py-0.5 rounded border border-slate-200 dark:border-slate-600 pointer-events-none">
                /
              </kbd>
            )}
          </div>

          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Chuyển đổi giao diện sáng tối"
            className="btn-interactive p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200"
            title={darkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          >
            {darkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>

          <div className="relative group">
            <button
              type="button"
              onClick={() => {
                setActiveTab('settings');
                if (onCheckCloudSync) onCheckCloudSync();
              }}
              className={`btn-interactive flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium whitespace-nowrap shrink-0 ${
                isCloudConnected
                  ? 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
                  : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
              }`}
              title="Kiểm tra trạng thái đồng bộ Firebase Firestore"
            >
              {isSyncing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
              ) : (
                <Cloud
                  className={`w-3.5 h-3.5 ${
                    isCloudConnected ? 'text-emerald-600' : 'text-blue-700 dark:text-blue-400'
                  }`}
                />
              )}
              <span>{isCloudConnected ? 'Đã đồng bộ' : 'Đồng bộ'}</span>
              {isCloudConnected && !isSyncing && <Check className="w-3 h-3 text-emerald-600" />}
            </button>

            {currentUser && (
              <div className="absolute right-0 top-full mt-2 w-52 p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition z-50">
                <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                  {currentUser.displayName || 'Cán bộ sử dụng'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentUser.email}
                </p>
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    type="button"
                    onClick={onSignOutGoogle}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg transition"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Ngắt kết nối tài khoản</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onOpenNewTask}
            title="Lập hồ sơ giao nhiệm vụ mới (Phím tắt: N)"
            className="btn-interactive flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Giao nhiệm vụ mới</span>
          </button>

          <PWAInstallWidget />
        </div>
      </div>
    </header>
  );
};
