import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, Timer, CheckCircle2 } from 'lucide-react';

export const PomodoroTimer: React.FC = () => {
  const [mode, setMode] = useState<'focus' | 'shortBreak' | 'longBreak'>('focus');
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [completedSessions, setCompletedSessions] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const times = {
    focus: 25 * 60,
    shortBreak: 5 * 60,
    longBreak: 15 * 60,
  };

  useEffect(() => {
    let timer: any = null;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      if (mode === 'focus') {
        setCompletedSessions((prev) => prev + 1);
        setStatusMessage('Đã hoàn thành 01 phiên làm việc tập trung. Đề nghị chuyển sang chế độ giải lao ngắn.');
      } else {
        setStatusMessage('Đã hết thời gian giải lao. Mời tiếp tục phiên xử lý công việc.');
      }
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft, mode]);

  const switchMode = (newMode: 'focus' | 'shortBreak' | 'longBreak') => {
    setMode(newMode);
    setIsRunning(false);
    setStatusMessage(null);
    setTimeLeft(times[newMode]);
  };

  const toggleTimer = () => {
    setStatusMessage(null);
    setIsRunning(!isRunning);
  };

  const resetTimer = () => {
    setIsRunning(false);
    setStatusMessage(null);
    setTimeLeft(times[mode]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-full flex flex-col justify-between space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Timer className="w-4 h-4 text-blue-700 dark:text-blue-400" />
          <span>Đồng hồ Điều độ Tập trung</span>
        </h3>
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
          Đã hoàn thành: <strong className="text-slate-900 dark:text-white">{completedSessions}</strong> phiên
        </span>
      </div>

      {/* Mode Switches */}
      <div className="grid grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
        <button
          type="button"
          onClick={() => switchMode('focus')}
          className={`py-1.5 px-2 rounded-md text-xs font-semibold transition whitespace-nowrap ${
            mode === 'focus'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Thụ lý (25p)
        </button>
        <button
          type="button"
          onClick={() => switchMode('shortBreak')}
          className={`py-1.5 px-2 rounded-md text-xs font-semibold transition whitespace-nowrap ${
            mode === 'shortBreak'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Giải lao (05p)
        </button>
        <button
          type="button"
          onClick={() => switchMode('longBreak')}
          className={`py-1.5 px-2 rounded-md text-xs font-semibold transition whitespace-nowrap ${
            mode === 'longBreak'
              ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Nghỉ dài (15p)
        </button>
      </div>

      {/* Timer Display */}
      <div className="py-4 text-center space-y-2">
        <div className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 dark:text-white font-mono tabular-nums">
          {formatTime(timeLeft)}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {mode === 'focus'
            ? 'Khung giờ tập trung xử lý dứt điểm hồ sơ nhiệm vụ'
            : 'Thời gian nghỉ ngơi tái tạo năng lượng làm việc'}
        </p>
      </div>

      {statusMessage && (
        <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={toggleTimer}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold text-white transition whitespace-nowrap ${
            isRunning ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-700 hover:bg-blue-800'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          <span>{isRunning ? 'Tạm dừng phiên' : 'Bắt đầu phiên'}</span>
        </button>

        <button
          type="button"
          onClick={resetTimer}
          aria-label="Đặt lại đồng hồ"
          className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-medium transition flex items-center gap-1.5 whitespace-nowrap"
          title="Đặt lại thời gian"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Đặt lại</span>
        </button>
      </div>
    </div>
  );
};
