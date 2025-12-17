import React, { useRef, useState, useEffect, useMemo } from 'react';
import { FileTask, TranslatedBlock } from '../types';
import { Maximize, ZoomIn, ZoomOut, FileWarning, Loader2, ExternalLink, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for pdf.js
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface SplitViewProps {
  task: FileTask | null;
  activeLocale: string;
}

export const SplitView: React.FC<SplitViewProps> = ({ task, activeLocale }) => {
  const [zoom, setZoom] = useState(1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);
  
  // Full screen states
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [fullScreenZoom, setFullScreenZoom] = useState(0.9);

  // Keyboard listener for ESC to close full screen
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullScreen(false);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  // Reset and load content when task changes
  useEffect(() => {
    setZoom(1);
    setImageLoaded(false);
    setPreviewSrc(null);
    setIsRenderingPdf(false);
    setIsFullScreen(false);
    setFullScreenZoom(0.9);

    if (!task) return;

    const loadPreview = async () => {
      if (task.file.type === 'application/pdf') {
        setIsRenderingPdf(true);
        try {
          // Load the PDF file
          const loadingTask = pdfjsLib.getDocument(task.previewUrl);
          const pdf = await loadingTask.promise;
          
          // Fetch the first page
          const page = await pdf.getPage(1);
          
          // Determine scale (we want a high quality render for the image)
          const viewport = page.getViewport({ scale: 2.0 });
          
          const canvas = document.createElement('canvas');
          const context = canvas.getContext('2d');
          canvas.height = viewport.height;
          canvas.width = viewport.width;

          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport
            }).promise;

            // Convert canvas to blob URL
            canvas.toBlob((blob) => {
              if (blob) {
                const url = URL.createObjectURL(blob);
                setPreviewSrc(url);
                setImageLoaded(true);
              }
            }, 'image/jpeg', 0.95);
          }
        } catch (error) {
          console.error("Error rendering PDF:", error);
        } finally {
          setIsRenderingPdf(false);
        }
      } else {
        // It's already an image
        setPreviewSrc(task.previewUrl);
        // Pre-load logic handled by img onLoad
      }
    };

    loadPreview();

    // Cleanup blob URLs if we created them locally
    return () => {
      // Cleanup logic if needed
    };
  }, [task?.id, task?.previewUrl, task?.file.type]);

  // Sort blocks by Area (Descending) so larger blocks (backgrounds) render first,
  // and smaller blocks (content) render on top.
  const sortedBlocks = useMemo(() => {
    if (!task) return [];
    return [...task.translatedBlocks].sort((a, b) => {
      const areaA = (a.box[2] - a.box[0]) * (a.box[3] - a.box[1]);
      const areaB = (b.box[2] - b.box[0]) * (b.box[3] - b.box[1]);
      return areaB - areaA; // Big area first -> rendered behind small area
    });
  }, [task?.translatedBlocks]);

  if (!task) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-400 animate-fade-in">
        <div className="text-center">
          <Maximize className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p>Select a file to preview</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in relative">
      {/* Toolbar */}
      <div className="h-12 border-b bg-white flex items-center justify-between px-4 shrink-0 shadow-sm z-10">
        <div className="flex items-center space-x-2 overflow-hidden">
          <span className="text-sm font-medium text-gray-700 truncate max-w-[200px]" title={task.name}>{task.name}</span>
          {/* Detailed Status Badge */}
          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full tracking-wide transition-colors duration-300 flex items-center gap-1 ${
            task.status === 'completed' ? 'bg-green-100 text-green-700' :
            task.status === 'processing' ? 'bg-blue-100 text-blue-700' :
            task.status === 'error' ? 'bg-red-100 text-red-700' :
            'bg-gray-100 text-gray-600'
          }`}>
            {task.status === 'processing' && <Loader2 className="w-3 h-3 animate-spin" />}
            {task.detailedStatus || task.status}
          </span>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={() => setZoom(z => Math.max(0.5, z - 0.1))} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Zoom Out">
              <ZoomOut className="w-4 h-4 text-gray-600" />
            </button>
            <span className="text-xs text-gray-500 w-12 text-center select-none">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-1.5 hover:bg-gray-100 rounded transition-colors" title="Zoom In">
              <ZoomIn className="w-4 h-4 text-gray-600" />
            </button>
        </div>
      </div>

      {/* Split Content */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left: Original */}
        <div className="flex-1 bg-gray-100/50 overflow-auto p-4 md:p-8 border-r relative flex justify-center items-start group/left">
            <div 
              className={`bg-white shadow-lg transition-all duration-300 ease-out origin-top relative ${imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ 
                width: `${595 * zoom}px`, 
                minHeight: `${842 * zoom}px`,
                position: 'relative'
              }}
            >
               {isRenderingPdf && (
                 <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-50 z-20">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                    <span className="text-xs text-gray-500">Rendering PDF...</span>
                 </div>
               )}
               {previewSrc && (
                 <div className="relative w-full h-full group/image cursor-zoom-in" onClick={() => setIsFullScreen(true)}>
                    <img 
                      src={previewSrc} 
                      alt="Original" 
                      className="w-full h-full object-contain"
                      onLoad={() => setImageLoaded(true)}
                    />
                    {/* Hover Overlay for Zoom */}
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover/image:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <div className="bg-black/70 text-white px-4 py-2 rounded-full flex items-center space-x-2 backdrop-blur-sm transform scale-95 group-hover/image:scale-100 transition-transform">
                           <Maximize className="w-4 h-4" />
                           <span className="text-xs font-medium">Click to Full Screen</span>
                        </div>
                    </div>
                 </div>
               )}
            </div>
        </div>

        {/* Right: Translated */}
        <div className="flex-1 bg-white overflow-auto p-4 md:p-8 relative flex justify-center items-start">
            <div 
              className={`bg-white shadow-[0_0_15px_rgba(0,0,0,0.05)] transition-all duration-300 ease-out origin-top border relative ${imageLoaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
              style={{ 
                width: `${595 * zoom}px`, 
                minHeight: `${842 * zoom}px` 
              }}
            >
               {/* Render Translated Blocks */}
               {sortedBlocks.map((block) => {
                 const top = block.box[0];
                 const left = block.box[1];
                 const height = block.box[2] - block.box[0];
                 const width = block.box[3] - block.box[1];
                 
                 // --- SMART FONT SIZING ALGORITHM ---
                 // Calculate pixel dimensions based on A4 standard (595x842pt)
                 const boxWidthPx = width * 5.95 * zoom;
                 const boxHeightPx = height * 8.42 * zoom;
                 const area = boxWidthPx * boxHeightPx;
                 
                 // Character count (protect against 0 division)
                 const charCount = block.translatedText.length || 1;

                 // "Density" formula: sqrt(Area / Chars). 
                 let estimatedFontSize = Math.sqrt((area * 0.90) / charCount);

                 // Sanity Caps
                 if (charCount < 10) {
                     estimatedFontSize = Math.min(estimatedFontSize, boxHeightPx * 0.85);
                 }
                 
                 const minFs = 9 * zoom;
                 const maxFs = 48 * zoom;
                 estimatedFontSize = Math.max(minFs, Math.min(estimatedFontSize, maxFs));

                 // Explicit Type/Format Checks
                 const isBold = block.isBold || block.type === 'heading';
                 const isHeader = block.type === 'heading' || (charCount < 30 && estimatedFontSize > 14 * zoom);
                 const isTable = block.type === 'table_cell';

                 // Header Adjustment
                 if (block.type === 'heading') {
                    // Boost font size slightly for headers if calculated size is average
                    estimatedFontSize = Math.max(estimatedFontSize, 14 * zoom);
                 }

                 return (
                   <div
                     key={block.id}
                     className="absolute hover:z-[100] transition-all duration-150 cursor-text group"
                     style={{
                       top: `${top}%`,
                       left: `${left}%`,
                       width: `${width}%`,
                       minHeight: `${height}%`, // Allow growth
                       // Default styling
                       backgroundColor: isTable ? 'rgba(249, 250, 251, 0.95)' : 'rgba(255, 255, 255, 1)',
                       border: isTable ? '1px solid #e5e7eb' : '1px solid transparent', // Add border for table cells
                       borderRadius: isTable ? '0px' : '2px', // Square corners for table cells
                     }}
                   >
                     {/* Text Container */}
                     <div 
                        className={`w-full h-full overflow-hidden text-gray-900 font-sans p-[1px]
                          group-hover:overflow-visible group-hover:h-auto group-hover:bg-white 
                          group-hover:shadow-xl group-hover:ring-1 group-hover:ring-blue-400 
                          group-hover:rounded-sm group-hover:px-2 group-hover:py-1
                          ${isHeader ? 'flex items-center justify-center' : 'block'}
                        `}
                        style={{ 
                            fontSize: `${estimatedFontSize}px`,
                            lineHeight: isHeader ? '1.1' : '1.3',
                            textAlign: isHeader ? 'center' : (isTable ? 'left' : 'left'),
                            fontWeight: isBold ? '700' : '400',
                            // Table specific styling
                            padding: isTable ? '4px' : '1px'
                        }}
                     >
                       <span className="block break-words whitespace-pre-wrap">
                         {block.translatedText}
                       </span>
                     </div>
                     
                     {/* Tooltip-like popup on hover (Original Text) */}
                     <div className="hidden group-hover:block absolute left-0 -top-6 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow-lg whitespace-nowrap z-[101] pointer-events-none opacity-90">
                       <span className="font-semibold text-gray-400 mr-1">
                          {block.type === 'heading' ? '[Header]' : block.type === 'table_cell' ? '[Cell]' : ''}
                       </span>
                       Original: {block.text.substring(0, 30)}...
                     </div>
                   </div>
                 );
               })}

               {task.status === 'processing' && (
                 <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-[2px] z-10 transition-opacity duration-500">
                   <div className="flex flex-col items-center bg-white p-6 rounded-xl shadow-xl border border-gray-100">
                     <Loader2 className="animate-spin h-8 w-8 text-blue-600 mb-3" />
                     <span className="text-sm text-gray-700 font-medium animate-pulse">{task.detailedStatus || "Processing..."}</span>
                   </div>
                 </div>
               )}
            </div>
        </div>
      </div>

      {/* Full Screen Image Modal */}
      {isFullScreen && previewSrc && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col animate-fade-in backdrop-blur-sm">
           {/* Header / Controls */}
           <div className="flex items-center justify-between px-6 py-4 text-white/90 bg-gradient-to-b from-black/80 to-transparent absolute top-0 left-0 right-0 z-10">
             <div className="flex flex-col">
                <span className="text-base font-medium drop-shadow-md">{task?.name}</span>
                <span className="text-xs text-white/60">Full Screen Preview (Press ESC to close)</span>
             </div>
             
             <div className="flex items-center space-x-6">
               <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 shadow-lg">
                  <button onClick={() => setFullScreenZoom(z => Math.max(0.1, z - 0.1))} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ZoomOut size={18}/></button>
                  <span className="text-xs w-10 text-center font-mono">{Math.round(fullScreenZoom * 100)}%</span>
                  <button onClick={() => setFullScreenZoom(z => Math.min(5, z + 0.1))} className="p-1 hover:bg-white/20 rounded-full transition-colors"><ZoomIn size={18}/></button>
               </div>
               
               <button 
                 onClick={() => setIsFullScreen(false)} 
                 className="p-2 bg-white/10 hover:bg-red-500/80 rounded-full transition-colors border border-white/20 hover:border-red-400 backdrop-blur-md"
                 title="Close (Esc)"
               >
                 <X size={24} className="text-white" />
               </button>
             </div>
           </div>
           
           {/* Image Container */}
           <div className="flex-1 overflow-auto flex items-center justify-center p-4 pt-20" onClick={(e) => {
              // Close if clicking background (not image)
              if (e.target === e.currentTarget) setIsFullScreen(false);
           }}>
             <img 
                src={previewSrc} 
                className="max-w-none shadow-2xl origin-center transition-all duration-100 ease-out cursor-default"
                style={{ height: `${fullScreenZoom * 100}vh` }}
                alt="Full Screen Preview"
                onWheel={(e) => {
                  if (e.ctrlKey) {
                    e.preventDefault();
                    setFullScreenZoom(z => Math.max(0.1, Math.min(5, z - e.deltaY * 0.005)));
                  }
                }}
             />
           </div>
        </div>
      )}
    </div>
  );
};