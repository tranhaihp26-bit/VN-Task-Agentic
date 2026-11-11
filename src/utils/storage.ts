import { Task, Tag, UserSettings, MeetingRecord } from '../types';
import { resolveTaskStatus, getStageLabel, PRIORITY_LABELS, formatDurationVN } from './workflow';

export const INITIAL_TAGS: Tag[] = [
  { id: 'tag-1', name: 'Trọng tâm Quý IV', color: 'bg-blue-600' },
  { id: 'tag-2', name: 'Báo cáo định kỳ', color: 'bg-indigo-600' },
  { id: 'tag-3', name: 'Chỉ đạo UBND', color: 'bg-amber-600' },
  { id: 'tag-4', name: 'Phối hợp liên ngành', color: 'bg-emerald-600' },
  { id: 'tag-5', name: 'Văn bản Hỏa tốc', color: 'bg-rose-600' },
];

export const INITIAL_TASKS: Task[] = [
  {
    id: 'task-1',
    documentNumber: '142/BC-UBND',
    title: 'Hoàn thiện Báo cáo tổng kết công tác cải cách hành chính và chuyển đổi số Quý IV trình Thường trực',
    description: 'Rà soát số liệu giải quyết thủ tục hành chính đúng hạn, tỷ lệ hồ sơ trực tuyến toàn trình và đề xuất phương hướng nhiệm vụ kỳ tới.',
    category: 'Chỉ đạo điều hành',
    assignee: 'Văn phòng Cơ quan',
    priority: 'urgent',
    status: 'in_progress',
    dueDate: new Date().toISOString().split('T')[0],
    dueTime: '10:30',
    completed: false,
    tags: ['tag-2', 'tag-5'],
    timeSpent: 2700,
    subtasks: [
      { id: 'sub-101', title: 'Tổng hợp số liệu từ các phòng ban chuyên môn trực thuộc', completed: true },
      { id: 'sub-102', title: 'Đối chiếu tỷ lệ giải quyết hồ sơ dịch vụ công trực tuyến', completed: true },
      { id: 'sub-103', title: 'Hoàn thiện dự thảo Tờ trình và trình Lãnh đạo ký ban hành', completed: false },
    ],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'task-2',
    documentNumber: '88/GM-VP',
    title: 'Hội nghị giao ban đánh giá tiến độ triển khai Đề án Cơ sở dữ liệu dùng chung và trục liên thông văn bản',
    description: 'Thảo luận phương án tháo gỡ vướng mắc kỹ thuật kết nối liên thông dữ liệu và phân công đầu mối đôn đốc thực hiện.',
    category: 'Hội nghị - Họp',
    assignee: 'Trung tâm Công nghệ Thông tin',
    priority: 'high',
    status: 'pending',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    dueTime: '14:00',
    completed: false,
    tags: ['tag-1', 'tag-4'],
    timeSpent: 900,
    subtasks: [
      { id: 'sub-201', title: 'Chuẩn bị tài liệu hội nghị và báo cáo tóm tắt tiến độ', completed: true },
      { id: 'sub-202', title: 'Gửi giấy mời và xác nhận đại biểu tham dự các đơn vị', completed: false },
    ],
    createdAt: new Date(Date.now() - 72000000).toISOString(),
  },
  {
    id: 'task-3',
    documentNumber: '205/TTr-TCCB',
    title: 'Thẩm định hồ sơ quy hoạch, đào tạo và bồi dưỡng cán bộ, công chức năm công tác kế tiếp',
    description: 'Kiểm tra tiêu chuẩn ngạch công chức, danh sách đăng ký bồi dưỡng nghiệp vụ quản lý nhà nước và trình Hội đồng xét duyệt.',
    category: 'Tổ chức - Cán bộ',
    assignee: 'Phòng Tổ chức - Cán bộ',
    priority: 'medium',
    status: 'completed',
    dueDate: new Date(Date.now() - 86400000).toISOString().split('T')[0],
    dueTime: '16:30',
    completed: true,
    tags: ['tag-4'],
    timeSpent: 5400,
    subtasks: [
      { id: 'sub-301', title: 'Rà soát danh sách cử đi bồi dưỡng quản lý nhà nước', completed: true },
      { id: 'sub-302', title: 'Ban hành Quyết định phê duyệt danh sách chính thức', completed: true },
    ],
    createdAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'task-4',
    documentNumber: '312/KH-KHTC',
    title: 'Thẩm tra dự toán ngân sách và kế hoạch phân bổ vốn đầu tư công trung hạn',
    description: 'Đối chiếu định mức chi thường xuyên, danh mục dự án trọng điểm và hoàn thiện phụ lục thuyết minh dự toán.',
    category: 'Đề án - Dự án',
    assignee: 'Phòng Kế hoạch - Tài chính',
    priority: 'high',
    status: 'review',
    dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0],
    dueTime: '09:00',
    completed: false,
    tags: ['tag-1', 'tag-3'],
    timeSpent: 4200,
    subtasks: [
      { id: 'sub-401', title: 'Thẩm định thuyết minh dự toán của các đơn vị dự toán cấp dưới', completed: true },
      { id: 'sub-402', title: 'Trình Lãnh đạo xem xét ký duyệt trước khi gửi cơ quan tài chính', completed: false },
    ],
    createdAt: new Date(Date.now() - 43200000).toISOString(),
  },
  {
    id: 'task-5',
    documentNumber: '419/CV-TH',
    title: 'Tổng hợp báo cáo kết quả thực hiện nhiệm vụ do Lãnh đạo giao trong tháng',
    description: 'Thống kê các nhiệm vụ hoàn thành đúng hạn, các hồ sơ đang trong hạn và giải trình nguyên nhân đối với hồ sơ chậm muộn.',
    category: 'Tổng hợp - Báo cáo',
    assignee: 'Phòng Tổng hợp - Hành chính',
    priority: 'medium',
    status: 'in_progress',
    dueDate: new Date(Date.now() + 259200000).toISOString().split('T')[0],
    dueTime: '11:00',
    completed: false,
    tags: ['tag-2'],
    recurrence: 'monthly',
    timeSpent: 1500,
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_MEETINGS: MeetingRecord[] = [
  {
    id: 'meet-1',
    title: 'Hội nghị Giao ban Điều hành Công tác Trọng tâm Tuần - Thường trực Cơ quan',
    date: new Date().toISOString().split('T')[0],
    transcript:
      'Tại phiên họp giao ban tuần, Lãnh đạo cơ quan yêu cầu các phòng chuyên môn tập trung rà soát tỷ lệ giải quyết hồ sơ hành chính đúng hạn, kiên quyết không để tồn đọng hồ sơ quá hạn. Giao Phòng Kế hoạch - Tài chính hoàn thiện dự thảo phân bổ dự toán kinh phí hoạt động thường xuyên. Giao Văn phòng tổng hợp kết quả thực hiện nhiệm vụ trọng tâm và trình ký báo cáo định kỳ trước 16 giờ thứ Sáu.',
    summary:
      'Hội nghị giao ban định kỳ đánh giá tình hình thực hiện nhiệm vụ chính trị, đôn đốc tiến độ giải quyết hồ sơ hành chính và phân công chuẩn bị các báo cáo tổng hợp trình Lãnh đạo.',
    keyPoints: [
      'Đảm bảo 100% hồ sơ thủ tục hành chính được thụ lý và trả kết quả đúng thời hạn quy định',
      'Hoàn thiện phương án phân bổ dự toán ngân sách và kiểm soát chi thường xuyên',
      'Thời hạn trình ký báo cáo kết quả thực hiện nhiệm vụ trước 16:00 thứ Sáu hàng tuần',
    ],
    actionItems: [
      { title: 'Rà soát, hoàn thiện phương án phân bổ dự toán kinh phí hoạt động', assignee: 'Phòng Kế hoạch - Tài chính', priority: 'high' },
      { title: 'Đôn đốc, tổng hợp báo cáo kết quả giải quyết hồ sơ hành chính đúng hạn', assignee: 'Văn phòng Cơ quan', priority: 'urgent' },
    ],
    sentiment: 'Nghiêm túc, Khẩn trương & Quyết liệt',
  },
];

const STORAGE_VERSION_KEY = 'taskflow_admin_v2';

export const loadTasks = (): Task[] => {
  const version = localStorage.getItem(STORAGE_VERSION_KEY);
  const saved = localStorage.getItem('taskflow_tasks');
  if (!saved || !version) {
    localStorage.setItem(STORAGE_VERSION_KEY, 'true');
    localStorage.setItem('taskflow_tasks', JSON.stringify(INITIAL_TASKS));
    return INITIAL_TASKS;
  }
  try {
    const parsed: Task[] = JSON.parse(saved);
    return parsed.map((t, idx) => ({
      ...t,
      documentNumber: t.documentNumber || `${100 + idx + 1}/VB-ĐH`,
      assignee: t.assignee || 'Văn phòng Cơ quan',
      status: resolveTaskStatus(t),
    }));
  } catch {
    return INITIAL_TASKS;
  }
};

export const saveTasks = (tasks: Task[]) => {
  localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
};

export const loadTags = (): Tag[] => {
  const saved = localStorage.getItem('taskflow_tags');
  return saved ? JSON.parse(saved) : INITIAL_TAGS;
};

export const saveTags = (tags: Tag[]) => {
  localStorage.setItem('taskflow_tags', JSON.stringify(tags));
};

export const loadMeetings = (): MeetingRecord[] => {
  const saved = localStorage.getItem('taskflow_meetings');
  return saved ? JSON.parse(saved) : INITIAL_MEETINGS;
};

export const saveMeetings = (meetings: MeetingRecord[]) => {
  localStorage.setItem('taskflow_meetings', JSON.stringify(meetings));
};

export const loadSettings = (): UserSettings => {
  const saved = localStorage.getItem('taskflow_settings');
  return saved
    ? JSON.parse(saved)
    : {
        darkMode: false,
        notificationsEnabled: true,
        reminderMinutesBefore: 15,
        autoSyncGoogleTasks: false,
      };
};

export const saveSettings = (settings: UserSettings) => {
  localStorage.setItem('taskflow_settings', JSON.stringify(settings));
};

export const exportToCSV = (tasks: Task[]) => {
  const headers = [
    'Mã nhiệm vụ',
    'Số hiệu văn bản',
    'Nội dung nhiệm vụ',
    'Lĩnh vực công tác',
    'Đơn vị chủ trì',
    'Mức độ khẩn',
    'Trạng thái xử lý',
    'Hạn hoàn thành',
    'Giờ hẹn',
    'Thời lượng thụ lý',
  ];
  const rows = tasks.map((t) => [
    t.id,
    `"${(t.documentNumber || '').replace(/"/g, '""')}"`,
    `"${t.title.replace(/"/g, '""')}"`,
    `"${t.category.replace(/"/g, '""')}"`,
    `"${(t.assignee || 'Văn phòng Cơ quan').replace(/"/g, '""')}"`,
    PRIORITY_LABELS[t.priority] || t.priority,
    getStageLabel(resolveTaskStatus(t)),
    t.dueDate,
    t.dueTime || '',
    formatDurationVN(t.timeSpent || 0),
  ]);

  const csvContent =
    'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `so_theo_doi_nhiem_vu_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
