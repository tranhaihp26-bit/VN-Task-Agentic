import React, { useEffect, useState } from 'react';
import { Download, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallWidget: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showOfflineBanner, setShowOfflineBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    const handleOnline = () => {
      setShowOfflineBanner(false);
    };

    const handleOffline = () => {
      setShowOfflineBanner(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
    }
  };

  return (
    <>
      {isInstallable(deferredPrompt, isInstalled) && (
        <button
          type="button"
          onClick={handleInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium rounded-lg transition whitespace-nowrap shrink-0"
          title="Cài đặt phần mềm lên máy trạm"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Cài đặt ứng dụng</span>
        </button>
      )}

      {showOfflineBanner && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2.5 bg-amber-700 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium">
          <WifiOff className="w-4 h-4" />
          <span>Chế độ ngoại tuyến — Hồ sơ đang được lưu trữ an toàn tại máy trạm.</span>
          <button
            type="button"
            onClick={() => setShowOfflineBanner(false)}
            aria-label="Đóng thông báo ngoại tuyến"
            className="ml-2 text-white/80 hover:text-white font-bold"
          >
            ×
          </button>
        </div>
      )}
    </>
  );
};

function isInstallable(prompt: BeforeInstallPromptEvent | null, installed: boolean) {
  return !!prompt && !installed;
}
