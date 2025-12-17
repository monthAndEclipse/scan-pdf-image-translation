import { SupportedLocale } from './types';
import { FileText, Image as ImageIcon, CheckCircle, AlertTriangle, Loader2, UploadCloud } from 'lucide-react';

export const COLORS = {
  background: "#F7F8FA",
  primary: "#1F2937",
  accent: "#2563EB",
  border: "#E5E7EB",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
};

export const I18N_STRINGS: Record<string, Record<string, string>> = {
  [SupportedLocale.EN]: {
    app_title: "ScanTranslate Pro",
    upload_title: "Upload Scanned Document",
    upload_subtitle: "Supports PDF & Images (JPEG, PNG)",
    drop_files: "Drop files here or click to browse",
    batch_queue: "Batch Queue",
    processing: "Processing...",
    completed: "Completed",
    pending: "Pending",
    source_preview: "Original Scan",
    target_preview: "Translated Preview",
    download_btn: "Download PDF",
    auto_detect: "Auto Detect",
    select_target: "Target Language",
    no_files: "No files in queue",
    analyzing: "Analyzing document structure...",
  },
  [SupportedLocale.ZH_CN]: {
    app_title: "ScanTranslate Pro",
    upload_title: "上传扫描文档",
    upload_subtitle: "支持 PDF 和图像 (JPEG, PNG)",
    drop_files: "拖放文件到此处或点击浏览",
    batch_queue: "批量队列",
    processing: "处理中...",
    completed: "已完成",
    pending: "等待中",
    source_preview: "原始扫描件",
    target_preview: "翻译预览",
    download_btn: "下载 PDF",
    auto_detect: "自动检测",
    select_target: "目标语言",
    no_files: "队列中无文件",
    analyzing: "正在分析文档结构...",
  },
  // Other locales fall back to EN for this demo for brevity
};

export const TARGET_LANG_OPTIONS = [
  { value: SupportedLocale.EN, label: "English" },
  { value: SupportedLocale.ZH_CN, label: "Chinese (Simplified)" },
  { value: SupportedLocale.ZH_TW, label: "Chinese (Traditional)" },
  { value: SupportedLocale.JA, label: "Japanese" },
  { value: SupportedLocale.KO, label: "Korean" },
  { value: SupportedLocale.FR, label: "French" },
  { value: SupportedLocale.DE, label: "German" },
  { value: SupportedLocale.ES, label: "Spanish" },
];
