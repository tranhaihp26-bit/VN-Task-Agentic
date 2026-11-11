import React, { useState, useEffect } from 'react';
import { X, Mic, MicOff, Sparkles, CheckCircle2 } from 'lucide-react';
import { Task } from '../types';

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddQuickTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantModalProps> = ({
  isOpen,
  onClose,
  onAddQuickTask,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [feedback, setFeedback] = useState('');
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = false;
        rec.interimResults = true;
        rec.lang = 'vi-VN';

        rec.onresult = (event: any) => {
          let text = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            text += event.results[i][0].transcript;
          }
          setTranscript(text);
        };

        rec.onerror = () => {
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
          if (transcript.trim()) {
            processVoiceCommand(transcript);
          }
        };

        setRecognition(rec);
      }
    }
  }, [transcript]);

  if (!isOpen) return null;

  const toggleListen = () => {
    if (!recognition) {
      setFeedback('Trình duyệt hiện tại không hỗ trợ nhận diện giọng nói trực tiếp. Bạn có thể nhập khẩu lệnh vào ô bên dưới.');
      return;
    }

    if (isListening) {
      recognition.stop();
      setIsListening(false);
    } else {
      setTranscript('');
      setFeedback('');
      recognition.start();
      setIsListening(true);
    }
  };

  const processVoiceCommand = (cmd: string) => {
    const cleaned = cmd.replace(/thêm công việc|giao nhiệm vụ|lập hồ sơ|nhắc tôi|thêm/gi, '').trim();
    if (cleaned) {
      onAddQuickTask({
        documentNumber: `${Math.floor(100 + Math.random() * 899)}/VB-GN`,
        title: cleaned,
        description: 'Hồ sơ nhiệm vụ được tiếp nhận qua khẩu lệnh giọng nói',
        category: 'Chỉ đạo điều hành',
        assignee: 'Văn phòng Cơ quan',
        priority: cmd.toLowerCase().includes('hỏa tốc') || cmd.toLowerCase().includes('khẩn') ? 'urgent' : 'medium',
        status: 'pending',
        dueDate: new Date().toISOString().split('T')[0],
        completed: false,
        tags: [],
        timeSpent: 0,
      });
      setFeedback(`Đã lập hồ sơ nhiệm vụ: "${cleaned}"`);
    } else {
      setFeedback('Chưa nhận diện rõ trích yếu nhiệm vụ. Đề nghị đọc lại khẩu lệnh.');
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 text-center space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Tiếp nhận Nhiệm vụ bằng Giọng nói
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

        <div className="py-6 flex flex-col items-center justify-center space-y-4">
          <button
            type="button"
            onClick={toggleListen}
            aria-label={isListening ? 'Dừng thu âm khẩu lệnh' : 'Bắt đầu thu âm khẩu lệnh'}
            className={`w-20 h-20 rounded-full flex items-center justify-center transition shadow-lg ${
              isListening ? 'bg-rose-600 text-white' : 'bg-blue-700 text-white hover:bg-blue-800'
            }`}
          >
            {isListening ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
          </button>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            {isListening ? 'Đang lắng nghe khẩu lệnh công vụ...' : 'Nhấn vào biểu tượng thu âm để đọc trích yếu nhiệm vụ'}
          </p>
          <p className="text-xs text-slate-500">
            Mẫu câu: &ldquo;Giao nhiệm vụ hoàn thiện báo cáo tổng kết cải cách hành chính&rdquo;
          </p>
        </div>

        {/* Manual fallback input for hermetic testing or non-speech browsers */}
        <div className="flex gap-2">
          <input
            type="text"
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            placeholder="Hoặc nhập nhanh khẩu lệnh giao việc tại đây..."
            className="flex-1 px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => processVoiceCommand(transcript)}
            disabled={!transcript.trim()}
            className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold whitespace-nowrap"
          >
            Xử lý lệnh
          </button>
        </div>

        {feedback && (
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 text-left">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{feedback}</span>
          </div>
        )}
      </div>
    </div>
  );
};
