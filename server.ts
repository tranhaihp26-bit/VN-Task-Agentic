import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post('/api/gemini/summarize-meeting', async (req, res) => {
    try {
      const { transcript, title } = req.body;
      if (!transcript) {
        return res.status(400).json({ error: 'Transcript is required' });
      }

      const prompt = `Bạn là một trợ lý thông minh cho dân văn phòng. Hãy phân tích nội dung ghi chép/ghi âm cuộc họp sau đây (${title || 'Cuộc họp'}):
      
      "${transcript}"
      
      Hãy trả về kết quả định dạng JSON với cấu trúc chuẩn:
      {
        "summary": "Tóm tắt ngắn gọn cuộc họp (khoảng 3-4 câu bằng tiếng Việt chuyên nghiệp)",
        "keyPoints": ["Điểm chính 1", "Điểm chính 2", "Điểm chính 3"],
        "actionItems": [
          { "title": "Nhiệm vụ cụ thể cần làm", "assignee": "Người phụ trách (hoặc Cá nhân)", "priority": "high|medium|low" }
        ],
        "sentiment": "Tích cực / Trọng tâm / Căng thẳng nhẹ"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: { type: Type.STRING },
              keyPoints: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              actionItems: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    assignee: { type: Type.STRING },
                    priority: { type: Type.STRING },
                  },
                },
              },
              sentiment: { type: Type.STRING },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Gemini meeting summarize error:', error);
      res.status(500).json({ error: error.message || 'Failed to summarize meeting' });
    }
  });

  app.post('/api/gemini/weekly-insights', async (req, res) => {
    try {
      const { tasks, completedCount, pendingCount } = req.body;

      const prompt = `Dựa trên dữ liệu công việc trong tuần của người dùng:
      - Tổng số nhiệm vụ hoàn thành: ${completedCount}
      - Số nhiệm vụ đang chờ/chưa hoàn thành: ${pendingCount}
      - Danh sách nhiệm vụ mẫu: ${JSON.stringify(tasks?.slice(0, 15) || [])}
      
      Hãy phân tích năng suất làm việc và đưa ra báo cáo hiệu suất hàng tuần bằng tiếng Việt chuyên nghiệp, gồm:
      1. Đánh giá chung (productivityScore: số điểm từ 0-100).
      2. Nhận xét ưu điểm và điểm cần cải thiện.
      3. 3 lời khuyên thiết thực để tuần tới làm việc hiệu quả hơn.
      
      Trả về định dạng JSON:
      {
        "productivityScore": 85,
        "performanceSummary": "Đánh giá hiệu suất tuần...",
        "strengths": ["Điểm mạnh 1", "Điểm mạnh 2"],
        "improvements": ["Điểm cần cải thiện 1"],
        "recommendations": ["Lời khuyên 1", "Lời khuyên 2", "Lời khuyên 3"]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              productivityScore: { type: Type.INTEGER },
              performanceSummary: { type: Type.STRING },
              strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
              improvements: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Weekly insights error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate weekly insights' });
    }
  });

  app.post('/api/gemini/task-breakdown', async (req, res) => {
    try {
      const { goal } = req.body;
      if (!goal) return res.status(400).json({ error: 'Goal is required' });

      const prompt = `Người dùng có mục tiêu hoặc công việc lớn: "${goal}". Hãy chia nhỏ mục tiêu này thành các bước thực tế (sub-tasks) kèm theo thời gian ước tính và mức độ ưu tiên.
      
      Trả về JSON:
      {
        "subtasks": [
          { "title": "Bước 1...", "dueDateOffsetDays": 1, "priority": "high" }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              subtasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    dueDateOffsetDays: { type: Type.INTEGER },
                    priority: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Task breakdown error:', error);
      res.status(500).json({ error: error.message || 'Failed to breakdown task' });
    }
  });

  app.post('/api/gemini/smart-priority', async (req, res) => {
    try {
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Tasks array is required' });
      }

      const prompt = `Bạn là một chuyên gia quản lý năng suất văn phòng (Productivity Coach). Hãy phân tích danh sách các nhiệm vụ sau đây dựa trên hạn chót (dueDate), độ ưu tiên (priority) và nội dung (title/description) để sắp xếp lại thứ tự ưu tiên tối ưu nhất nhằm giúp người dùng hoàn thành công việc hiệu quả nhất.
      
      Danh sách nhiệm vụ:
      ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate, priority: t.priority, description: t.description })))}
      
      Trả về kết quả dưới dạng JSON:
      {
        "orderedTaskIds": ["id1", "id2", ...],
        "explanation": "Giải thích ngắn gọn lý do sắp xếp theo thứ tự này để tối ưu hóa năng suất (bằng tiếng Việt)"
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              orderedTaskIds: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
              explanation: { type: Type.STRING },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Smart priority error:', error);
      res.status(500).json({ error: error.message || 'Failed to calculate smart priority' });
    }
  });

  app.post('/api/gemini/focus-projects', async (req, res) => {
    try {
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Tasks array is required' });
      }

      const prompt = `Bạn là trợ lý quản lý dự án thông minh. Hãy nhóm các nhiệm vụ sau đây thành các "Focus Projects" (Dự án tập trung) có liên quan dựa trên tiêu đề, danh mục và hạn chót. Mỗi Focus Project cần có tên dự án, mô tả ngắn gọn, danh sách các ID nhiệm vụ thuộc dự án đó, và một khung thời gian tập trung gợi ý (Time-block, ví dụ: "Thứ Hai 09:00 - 11:00").
      
      Danh sách nhiệm vụ:
      ${JSON.stringify(tasks.map(t => ({ id: t.id, title: t.title, category: t.category, dueDate: t.dueDate })))}
      
      Trả về JSON:
      {
        "projects": [
          {
            "projectName": "Tên dự án...",
            "description": "Mô tả ngắn...",
            "taskIds": ["id1", "id2"],
            "suggestedTimeBlock": "Thứ Ba 14:00 - 16:00"
          }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    projectName: { type: Type.STRING },
                    description: { type: Type.STRING },
                    taskIds: { type: Type.ARRAY, items: { type: Type.STRING } },
                    suggestedTimeBlock: { type: Type.STRING },
                  },
                },
              },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Focus projects error:', error);
      res.status(500).json({ error: error.message || 'Failed to generate focus projects' });
    }
  });

  app.post('/api/gemini/task-analysis', async (req, res) => {
    try {
      const { tasks } = req.body;
      if (!tasks || !Array.isArray(tasks)) {
        return res.status(400).json({ error: 'Tasks array is required' });
      }

      const prompt = `Bạn là một chuyên gia phân tích dữ liệu hiệu suất làm việc (Workplace Productivity Analyst). Hãy phân tích lịch sử hoàn thành công việc của người dùng để xác định các mẫu hoàn thành, điểm nghẽn (bottlenecks) và các ngày có khối lượng công việc quá tải (peak workload days).
      
      Danh sách nhiệm vụ:
      ${JSON.stringify(tasks.map(t => ({ title: t.title, completed: t.completed, dueDate: t.dueDate, priority: t.priority, category: t.category })))}
      
      Trả về JSON:
      {
        "analysisSummary": "Đánh giá tổng quan về mô hình hoàn thành công việc...",
        "peakWorkloadDays": ["Thứ Hai", "Thứ Năm"],
        "bottlenecks": ["Điểm nghẽn 1...", "Điểm nghẽn 2..."],
        "recommendations": ["Khuyến nghị 1...", "Khuyến nghị 2..."]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              analysisSummary: { type: Type.STRING },
              peakWorkloadDays: { type: Type.ARRAY, items: { type: Type.STRING } },
              bottlenecks: { type: Type.ARRAY, items: { type: Type.STRING } },
              recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
            },
          },
        },
      });

      const result = JSON.parse(response.text || '{}');
      res.json(result);
    } catch (error: any) {
      console.error('Task analysis error:', error);
      res.status(500).json({ error: error.message || 'Failed to analyze tasks' });
    }
  });

  // Vite middleware for frontend development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const port = Number(process.env.PORT || 3000);
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer();
