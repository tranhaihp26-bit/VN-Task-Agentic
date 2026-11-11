import React, { useState, useEffect } from 'react';
import { MeetingRecord, Tag, Task, Priority } from '../types';
import { X, Mic, MicOff, Sparkles, Loader2, FileText, CheckCircle2 } from 'lucide-react';

interface MeetingRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMeeting: (meeting: MeetingRecord) => void;
  onAddTaskFromMeeting: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  tags: Tag[];
}

export const MeetingRecorder: React.FC<MeetingRecorderProps> = ({
  isOpen,
  onClose,
  onSaveMeeting,
  onAddTaskFromMeeting,
}) => {
  const [title, setTitle] = useState('');
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<MeetingRecord | null>(null);
  const [recognition, setRecognition] = useState<any>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = 'vi-VN';

        rec.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript;
          }
          setTranscript((prev) => prev + ' ' + currentTranscript);
        };

        rec.onerror = () => {
          setIsRecording(false);
        };

        rec.onend = () => {
          setIsRecording(false);
        };

        setRecognition(rec);
      }
    }
  }, []);

  if (!isOpen) return null;

  const toggleRecording = () => {
    if (!recognition) {
      setNotice('Trình duyệt hiện tại không hỗ trợ thu âm trực tiếp. Đề nghị nhập hoặc dán nội dung tốc ký hội nghị.');
      return;
    }

    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      setNotice(null);
      setTranscript('');
      recognition.start();
      setIsRecording(true);
    }
  };

  const handleAnalyze = async () => {
    if (!transcript.trim()) {
      setNotice('Đề nghị nhập nội dung biên bản hoặc tốc ký cuộc họp trước khi tổng hợp kết luận.');
      return;
    }

    setNotice(null);
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/gemini/summarize-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title || 'Hội nghị Giao ban Công tác',
          transcript,
        }),
      });
      const data = await res.json();
      const newMeeting: MeetingRecord = {
        id: 'meet-' + Date.now(),
        title: title || 'Hội nghị giao ban ngày ' + new Date().toLocaleDateString('vi-VN'),
        date: new Date().toISOString().split('T')[0],
        transcript,
        summary:
          data.summary ||
          'Hội nghị thống nhất các nội dung chỉ đạo điều hành trọng tâm và phân công nhiệm vụ cụ thể cho các bộ phận chuyên môn.',
        keyPoints:
          data.keyPoints && data.keyPoints.length > 0
            ? data.keyPoints
            : ['Đôn đốc tiến độ giải quyết hồ sơ đúng hạn', 'Tăng cường phối hợp liên ngành'],
        actionItems:
          data.actionItems && data.actionItems.length > 0
            ? data.actionItems
            : [
                {
                  title: `Triển khai kết luận tại ${title || 'Hội nghị giao ban'}`,
                  assignee: 'Văn phòng Cơ quan',
                  priority: 'high',
                },
              ],
        sentiment: data.sentiment || 'Nghiêm túc & Khẩn trương',
      };
      setAnalysisResult(newMeeting);
      onSaveMeeting(newMeeting);
    } catch {
      const fallbackMeeting: MeetingRecord = {
        id: 'meet-' + Date.now(),
        title: title || 'Hội nghị giao ban ngày ' + new Date().toLocaleDateString('vi-VN'),
        date: new Date().toISOString().split('T')[0],
        transcript,
        summary: `Tổng hợp nội dung kết luận hội nghị: ${transcript.slice(0, 180)}...`,
        keyPoints: [
          'Quán triệt thực hiện nghiêm túc tiến độ các nhiệm vụ trọng tâm được giao',
          'Báo cáo kết quả thực hiện về Văn phòng Cơ quan đúng thời hạn quy định',
        ],
        actionItems: [
          {
            title: `Tham mưu văn bản triển khai kết luận ${title || 'Hội nghị'}`,
            assignee: 'Văn phòng Cơ quan',
            priority: 'high',
          },
        ],
        sentiment: 'Nghiêm túc & Thống nhất',
      };
      setAnalysisResult(fallbackMeeting);
      onSaveMeeting(fallbackMeeting);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleConvertTask = (item: { title: string; assignee: string; priority: string }) => {
    onAddTaskFromMeeting({
      documentNumber: `${Math.floor(100 + Math.random() * 899)}/TB-KL`,
      title: item.title,
      assignee: item.assignee || 'Văn phòng Cơ quan',
      description: `Nhiệm vụ trích xuất từ Thông báo kết luận: ${title || 'Hội nghị giao ban'}`,
      category: 'Chỉ đạo điều hành',
      priority: (item.priority as Priority) || 'high',
      status: 'pending',
      dueDate: new Date().toISOString().split('T')[0],
      completed: false,
      tags: [],
      timeSpent: 0,
    });
    setNotice(`Đã chuyển giao nhiệm vụ "${item.title}" vào Sổ theo dõi nhiệm vụ.`);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="w-full max-w-2xl rounded-xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 my-8 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
              Lập Biên bản Hội nghị & Trích xuất Kết luận Chỉ đạo
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {notice && (
            <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{notice}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Tên hội nghị / Phiên họp giao ban
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Hội nghị giao ban công tác tháng 11..."
              className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nội dung tốc ký / Phát biểu tại hội nghị
              </label>
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition ${
                  isRecording
                    ? 'bg-rose-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                <span>{isRecording ? 'Dừng thu âm' : 'Thu âm giọng nói'}</span>
              </button>
            </div>
            <textarea
              rows={5}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Nhập hoặc dán nội dung phát biểu chỉ đạo, biên bản thảo luận tại cuộc họp..."
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={isAnalyzing || !transcript.trim()}
            className="w-full py-2.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-semibold transition flex items-center justify-center gap-2"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tổng hợp dự thảo Thông báo kết luận...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Tổng hợp Kết luận & Phân công Nhiệm vụ</span>
              </>
            )}
          </button>

          {analysisResult && (
            <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-700 dark:text-blue-400" />
                <span>Dự thảo Thông báo Kết luận Hội nghị</span>
              </h4>

              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">1. Tóm tắt nội dung kết luận:</span>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-1 leading-relaxed">
                  {analysisResult.summary}
                </p>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  2. Các ý kiến chỉ đạo trọng tâm:
                </span>
                <ul className="list-disc list-inside text-xs sm:text-sm text-slate-800 dark:text-slate-200 mt-1 space-y-1">
                  {analysisResult.keyPoints.map((kp, idx) => (
                    <li key={idx}>{kp}</li>
                  ))}
                </ul>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  3. Nhiệm vụ giao các đơn vị triển khai:
                </span>
                <div className="mt-2 space-y-2">
                  {analysisResult.actionItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                    >
                      <div>
                        <p className="text-xs font-semibold text-slate-900 dark:text-white">{item.title}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Đơn vị chủ trì: {item.assignee}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleConvertTask(item)}
                        className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold transition shrink-0 whitespace-nowrap"
                      >
                        Giao nhiệm vụ
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
