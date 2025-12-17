import React, { useState, useEffect, useCallback } from 'react';
import { FileTask, SupportedLocale, TranslatedBlock } from './types';
import { SplitView } from './components/SplitView';
import { FileUpload } from './components/FileUpload';
import { I18N_STRINGS, TARGET_LANG_OPTIONS, COLORS } from './constants';
import { analyzeAndTranslateImage } from './services/geminiService';
import { Settings, FileText, CheckCircle, AlertTriangle, Loader2, Download, Languages, Trash2, Github, X } from 'lucide-react';

// Toast Component
interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

const ToastNotification: React.FC<{ toast: Toast; onClose: (id: string) => void }> = ({ toast, onClose }) => {
  return (
    <div className={`
      flex items-center w-full max-w-xs p-4 mb-4 text-gray-500 bg-white rounded-lg shadow dark:text-gray-400 dark:bg-gray-800 animate-slide-in-right border-l-4
      ${toast.type === 'success' ? 'border-green-500' : toast.type === 'error' ? 'border-red-500' : 'border-blue-500'}
    `} role="alert">
      <div className={`inline-flex items-center justify-center flex-shrink-0 w-8 h-8 rounded-lg 
        ${toast.type === 'success' ? 'text-green-500 bg-green-100' : toast.type === 'error' ? 'text-red-500 bg-red-100' : 'text-blue-500 bg-blue-100'}
      `}>
        {toast.type === 'success' ? <CheckCircle size={20} /> : toast.type === 'error' ? <AlertTriangle size={20} /> : <FileText size={20} />}
      </div>
      <div className="ml-3 text-sm font-normal break-words flex-1">{toast.message}</div>
      <button 
        onClick={() => onClose(toast.id)}
        className="ml-auto -mx-1.5 -my-1.5 bg-white text-gray-400 hover:text-gray-900 rounded-lg focus:ring-2 focus:ring-gray-300 p-1.5 hover:bg-gray-100 inline-flex items-center justify-center h-8 w-8 dark:text-gray-500 dark:hover:text-white dark:bg-gray-800 dark:hover:bg-gray-700" 
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default function App() {
  const [tasks, setTasks] = useState<FileTask[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [currentLocale, setCurrentLocale] = useState<SupportedLocale>(SupportedLocale.EN);
  const [defaultTargetLang, setDefaultTargetLang] = useState<SupportedLocale>(SupportedLocale.ZH_CN);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const t = (key: string) => I18N_STRINGS[currentLocale]?.[key] || I18N_STRINGS[SupportedLocale.EN][key];

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleFilesSelected = (files: File[]) => {
    if (files.length === 0) return;

    addToast(`Added ${files.length} file(s) to queue`, 'info');

    const newTasks: FileTask[] = files.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'pending',
      detailedStatus: 'Waiting to start...',
      progress: 0,
      totalPages: 1, 
      processedPages: 0,
      warnings: [],
      translatedBlocks: [],
      targetLanguage: defaultTargetLang,
    }));

    setTasks(prev => [...prev, ...newTasks]);
    if (!activeTaskId && newTasks.length > 0) {
      setActiveTaskId(newTasks[0].id);
    }
  };

  // Process Queue Effect
  useEffect(() => {
    const processQueue = async () => {
      const pendingTask = tasks.find(t => t.status === 'pending');
      if (!pendingTask) return;

      // Start Processing: Phase 1 - OCR / Analysis
      setTasks(prev => prev.map(t => t.id === pendingTask.id ? { 
        ...t, 
        status: 'processing', 
        detailedStatus: 'Performing OCR Analysis...',
        progress: 5 
      } : t));

      try {
        const isPdf = pendingTask.file.type === 'application/pdf';
        const base64 = await fileToBase64(pendingTask.file);
        
        setTasks(prev => prev.map(t => t.id === pendingTask.id ? { 
          ...t, 
          progress: 20,
          detailedStatus: 'Extracting text layout...'
        } : t));
        
        // Call Gemini
        const result = await analyzeAndTranslateImage(
          base64, 
          pendingTask.file.type, 
          TARGET_LANG_OPTIONS.find(o => o.value === pendingTask.targetLanguage)?.label || 'English'
        );

        if (!result || !result.blocks) {
          throw new Error("Invalid response format from Analysis Engine");
        }

        const blocks = result.blocks || [];
        const totalBlocks = blocks.length;

        // Phase 2: Simulating Block-by-Block Translation / Rendering
        // Update status to show specific progress
        setTasks(prev => prev.map(t => t.id === pendingTask.id ? { 
          ...t, 
          detailedStatus: 'Translating content (Page 1)...'
        } : t));

        // Simulate streaming
        for (let i = 0; i < totalBlocks; i++) {
            await new Promise(resolve => setTimeout(resolve, 30)); 
            setTasks(prev => prev.map(t => {
                if (t.id !== pendingTask.id) return t;
                const blockData = blocks[i];
                const newBlock: TranslatedBlock = {
                    id: `b-${i}-${Date.now()}`,
                    pageIndex: 0,
                    text: blockData.text,
                    translatedText: blockData.translatedText,
                    box: blockData.box,
                    isBold: blockData.isBold,
                    type: blockData.type as any
                };
                
                // Calculate detailed percentage for the "Translating" phase (30% to 90%)
                const currentProgress = 30 + Math.floor(((i + 1) / totalBlocks) * 60);

                return {
                    ...t,
                    translatedBlocks: [...t.translatedBlocks, newBlock],
                    progress: currentProgress,
                    detailedStatus: `Translating block ${i + 1}/${totalBlocks} (${currentProgress}%)`
                };
            }));
        }

        // Complete
        setTasks(prev => prev.map(t => t.id === pendingTask.id ? { 
          ...t, 
          status: 'completed', 
          detailedStatus: 'Translation Completed',
          progress: 100 
        } : t));
        addToast(`Processed ${pendingTask.name} successfully`, 'success');

      } catch (error: any) {
        console.error("Processing failed", error);
        let errorMessage = "Analysis failed";
        if (error.message && error.message.includes("API key")) errorMessage = "Invalid API Key";
        else if (error.message) errorMessage = error.message;

        setTasks(prev => prev.map(t => t.id === pendingTask.id ? { 
          ...t, 
          status: 'error', 
          detailedStatus: 'Error encountered',
          warnings: [errorMessage] 
        } : t));
        addToast(`Failed to process ${pendingTask.name}: ${errorMessage}`, 'error');
      }
    };

    const processing = tasks.some(t => t.status === 'processing');
    if (!processing) {
      processQueue();
    }
  }, [tasks]);

  const activeTask = tasks.find(t => t.id === activeTaskId) || null;

  return (
    <div className="h-screen w-screen flex flex-col bg-[#F7F8FA] text-slate-800 font-sans">
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end space-y-2 pointer-events-none">
        <div className="pointer-events-auto">
          {toasts.map(toast => (
            <ToastNotification key={toast.id} toast={toast} onClose={removeToast} />
          ))}
        </div>
      </div>

      {/* Header */}
      <header className="h-16 bg-white border-b flex items-center justify-between px-6 shrink-0 z-20 shadow-sm transition-all">
        <div className="flex items-center space-x-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white shadow-md">
            <Languages size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{t('app_title')}</h1>
        </div>
        
        <div className="flex items-center space-x-4">
           {/* Global Target Language Selector */}
           <div className="flex items-center space-x-2 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-100">
             <span className="text-sm font-medium text-slate-500">{t('select_target')}:</span>
             <select 
               value={defaultTargetLang}
               onChange={(e) => setDefaultTargetLang(e.target.value as SupportedLocale)}
               className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer"
             >
               {TARGET_LANG_OPTIONS.map(opt => (
                 <option key={opt.value} value={opt.value}>{opt.label}</option>
               ))}
             </select>
           </div>
           
           <div className="h-6 w-px bg-gray-200 mx-2"></div>
           
           {/* UI Locale */}
           <select 
             value={currentLocale}
             onChange={(e) => setCurrentLocale(e.target.value as SupportedLocale)}
             className="text-xs font-medium text-slate-500 bg-transparent border-none focus:ring-0 cursor-pointer hover:text-blue-600 uppercase tracking-wide"
           >
              <option value="en">English</option>
              <option value="zh-CN">简体中文</option>
              <option value="ja">日本語</option>
              <option value="ko">한국어</option>
           </select>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar: Batch List */}
        <aside className="w-80 bg-white border-r flex flex-col z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
          <div className="p-6 border-b">
            <FileUpload 
              onFilesSelected={handleFilesSelected}
              labelTitle={t('upload_title')}
              labelSubtitle={t('upload_subtitle')}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 flex items-center justify-between">
              {t('batch_queue')}
              {tasks.length > 0 && <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full">{tasks.length}</span>}
            </h3>
            
            {tasks.length === 0 && (
              <div className="text-center py-10 text-gray-400 text-sm animate-fade-in">
                {t('no_files')}
              </div>
            )}

            {tasks.map((task, index) => (
              <div 
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                className={`group relative rounded-xl p-3 cursor-pointer transition-all duration-200 border animate-slide-in-up ${
                  activeTaskId === task.id 
                    ? 'bg-blue-50 border-blue-200 shadow-md translate-x-1' 
                    : 'bg-white border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className={`p-2 rounded-lg transition-colors ${activeTaskId === task.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      <FileText size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate transition-colors ${activeTaskId === task.id ? 'text-blue-900' : 'text-gray-700'}`}>
                        {task.name}
                      </p>
                      <p className="text-xs text-gray-400 truncate flex items-center">
                         {task.file.type === 'application/pdf' ? 'PDF' : 'Image'} • {TARGET_LANG_OPTIONS.find(o => o.value === task.targetLanguage)?.label}
                      </p>
                    </div>
                  </div>
                  {task.status === 'completed' && <CheckCircle size={16} className="text-green-500" />}
                  {task.status === 'processing' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                  {task.status === 'error' && <AlertTriangle size={16} className="text-red-500" />}
                  {task.status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-300" />}
                </div>
                
                {/* Progress Bar & Detailed Status */}
                <div className="space-y-1.5">
                   <div className="flex justify-between text-[10px] text-gray-500">
                      <span className="truncate max-w-[150px]">{task.detailedStatus}</span>
                      <span>{task.progress}%</span>
                   </div>
                   <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-500 ease-out ${
                        task.status === 'error' ? 'bg-red-500' : 
                        task.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${task.progress}%` }}
                    />
                   </div>
                </div>
                
                {activeTaskId === task.id && (
                    <button 
                        onClick={(e) => { e.stopPropagation(); setTasks(ts => ts.filter(t => t.id !== task.id)); addToast('Removed file', 'info'); }}
                        className="absolute -top-2 -right-2 bg-white rounded-full p-1 shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border text-red-500 hover:bg-red-50 z-10"
                        title="Remove file"
                    >
                        <Trash2 size={14} />
                    </button>
                )}
              </div>
            ))}
          </div>

          {/* Batch Actions */}
          <div className="p-4 border-t bg-gray-50">
             <button 
               className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:text-gray-900 hover:border-gray-400 py-2.5 rounded-lg text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-[0.98]"
               disabled={tasks.length === 0}
             >
                <Download size={16} />
                <span>{t('download_btn')}</span>
             </button>
          </div>
        </aside>

        {/* Workspace: Split View */}
        <main className="flex-1 bg-white relative">
            <SplitView task={activeTask} activeLocale={currentLocale} />
        </main>
      </div>
    </div>
  );
}

// Helper
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error("Failed to read file"));
      }
    };
    reader.onerror = error => reject(error);
  });
};