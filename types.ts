export enum SupportedLocale {
  EN = 'en',
  ZH_CN = 'zh-CN',
  ZH_TW = 'zh-TW',
  JA = 'ja',
  KO = 'ko',
  FR = 'fr',
  DE = 'de',
  ES = 'es',
}

export interface FileTask {
  id: string;
  name: string;
  file: File;
  previewUrl: string; // Blob URL for preview
  status: 'pending' | 'processing' | 'completed' | 'error';
  detailedStatus: string; // New field for granular status (e.g., "OCR Processing...", "Translating Page 1")
  progress: number; // 0-100
  totalPages: number;
  processedPages: number;
  warnings: string[];
  translatedBlocks: TranslatedBlock[];
  targetLanguage: SupportedLocale;
}

export interface TranslatedBlock {
  id: string;
  pageIndex: number;
  text: string;
  translatedText: string;
  box: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in %
  isBold?: boolean;
  type?: 'text' | 'heading' | 'table_cell';
}

// WebSocket Message Types (Simulated)
export type WSMessageType =
  | 'batch_init'
  | 'file_ready'
  | 'file_progress'
  | 'segment_translation'
  | 'segment_warning'
  | 'file_complete'
  | 'batch_complete';

export interface WSMessage {
  type: WSMessageType;
  batchId?: string;
  fileId?: string;
  payload?: any;
}

export interface GeminiBlockResponse {
  blocks: {
    text: string;
    translatedText: string;
    box: [number, number, number, number];
    isBold?: boolean;
    type?: 'text' | 'heading' | 'table_cell';
  }[];
}