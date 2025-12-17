import React, { useRef } from 'react';
import { UploadCloud, FileText, Image as ImageIcon } from 'lucide-react';

interface FileUploadProps {
  onFilesSelected: (files: File[]) => void;
  labelTitle: string;
  labelSubtitle: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFilesSelected, labelTitle, labelSubtitle }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(Array.from(e.target.files));
      // Reset input so the same file can be selected again if needed
      e.target.value = '';
    }
  };

  return (
    <div 
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onDrop={handleDrop}
      className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all duration-300 group select-none active:scale-[0.98]"
    >
      <input 
        type="file" 
        multiple 
        accept=".pdf,image/png,image/jpeg,image/webp" 
        className="hidden" 
        ref={inputRef}
        onChange={handleChange}
      />
      <div className="bg-blue-100 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
        <UploadCloud className="w-8 h-8 text-blue-600" />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{labelTitle}</h3>
      <p className="text-sm text-gray-500 mb-4">{labelSubtitle}</p>
      <div className="flex gap-2 text-xs text-gray-400">
        <span className="flex items-center"><FileText className="w-3 h-3 mr-1" /> PDF</span>
        <span className="flex items-center"><ImageIcon className="w-3 h-3 mr-1" /> JPEG/PNG</span>
      </div>
    </div>
  );
};