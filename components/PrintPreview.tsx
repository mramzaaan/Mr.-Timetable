import React, { useState, useEffect, useRef } from 'react';
import type { DownloadLanguage } from '../types';

declare const html2canvas: any;
declare const jspdf: any;

interface PrintPreviewProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  title: string;
  generateHtml: (lang: DownloadLanguage, fontSize: number) => string | string[];
  onGenerateExcel?: (lang: DownloadLanguage, fontSize: number) => void;
  fileNameBase: string;
  children?: React.ReactNode;
}

// Icon Components
const PrintIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>;
const PdfIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" /></svg>;
const ExcelIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M2 3a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1-1H3a1 1 0 01-1-1V3zm2 2v2h3V5H4zm0 3v2h3V8H4zm0 3v2h3v-2H4zm4 2v-2h3v2H8zm0-3v-2h3v2H8zm0-3V5h3v3H8zm4 5v-2h3v2h-3zm0-3v-2h3v2h-3zm0-3V5h3v3h-3z" /></svg>;
const LangIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m4 13l4-16M12 19l2-5M3 10h12M3 15h12" /><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
const FontIncreaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.428A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /><path d="M17 11a1 1 0 100-2h-1a1 1 0 100 2h1zM11 11a1 1 0 100-2H9a1 1 0 100 2h2z" /></svg>;
const FontDecreaseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M8.433 13.917l1.262-3.155A4 4 0 007.58 9.42l-2.5-2.5a4 4 0 00-5.656 5.656l2.5 2.5a4 4 0 003.496-1.517z" /><path d="M17 11a1 1 0 100-2h-1a1 1 0 100 2h1z" /></svg>;


const IconButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {className?: string}> = ({ children, className, ...props }) => (
  <button
    {...props}
    className={`p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-secondary-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${className}`}
  >
    {children}
  </button>
);

const ToolbarButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }> = ({ children, label, ...props }) => (
    <button
      {...props}
      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-primary)] bg-transparent hover:bg-[var(--accent-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] focus:ring-offset-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {children}
      <span>{label}</span>
    </button>
);

const ControlGroup: React.FC<{ label: string, children: React.ReactNode }> = ({ label, children }) => (
    <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-[var(--text-secondary)] hidden lg:inline">{label}</span>
        {children}
    </div>
);

const ZoomControl: React.FC<{ scale: number; onIncrease: () => void; onDecrease: () => void; }> = ({ scale, onIncrease, onDecrease }) => (
    <div className="flex items-center gap-1 bg-white rounded-full border border-[var(--border-secondary)] p-0.5 shadow-sm">
        <IconButton onClick={onDecrease} title="Zoom out" className="w-8 h-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg></IconButton>
        <span className="text-xs font-semibold w-10 text-center text-[var(--text-secondary)]">{scale}%</span>
        <IconButton onClick={onIncrease} title="Zoom in" className="w-8 h-8"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg></IconButton>
    </div>
);

const FontControl: React.FC<{ scale: number; onIncrease: () => void; onDecrease: () => void; }> = ({ scale, onIncrease, onDecrease }) => (
    <div className="flex items-center gap-1 bg-white rounded-full border border-[var(--border-secondary)] p-0.5 shadow-sm">
        <IconButton onClick={onDecrease} title="Decrease font size" className="w-8 h-8"><FontDecreaseIcon /></IconButton>
        <span className="text-xs font-semibold w-10 text-center text-[var(--text-secondary)]">{scale}%</span>
        <IconButton onClick={onIncrease} title="Increase font size" className="w-8 h-8"><FontIncreaseIcon /></IconButton>
    </div>
);

const PrintPreview: React.FC<PrintPreviewProps> = ({ t, isOpen, onClose, title, generateHtml, onGenerateExcel, fileNameBase, children }) => {
  const [lang, setLang] = useState<DownloadLanguage>('en');
  const [htmlPages, setHtmlPages] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);
  const [fontSize, setFontSize] = useState(100);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  const initialDistanceRef = useRef<number | null>(null);
  const initialZoomRef = useRef<number>(100);

  // Effect to reset all settings to their default state when the modal is first opened.
  useEffect(() => {
    if (isOpen) {
      setLang('en');
      setFontSize(100);
      setZoomLevel(100);
      setCurrentPage(0);
    }
  }, [isOpen]);

  // Effect to regenerate the HTML content whenever the language or font size changes.
  // This does not reset the zoom level, preserving user adjustments.
  useEffect(() => {
    if (isOpen) {
      const content = generateHtml(lang, fontSize);
      const pages = Array.isArray(content) ? content : (content ? [content] : []);
      setHtmlPages(pages);
      // Ensure the current page index is valid if the number of pages changes.
      setCurrentPage(p => Math.min(p, Math.max(0, pages.length - 1)));
    }
  }, [isOpen, lang, fontSize, generateHtml]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setIsLangMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  if (!isOpen) return null;

  const handleZoomIn = () => setZoomLevel(z => Math.min(z + 10, 200));
  const handleZoomOut = () => setZoomLevel(z => Math.max(z - 10, 20));
  const handleFontIncrease = () => setFontSize(f => Math.min(f + 10, 150));
  const handleFontDecrease = () => setFontSize(f => Math.max(f - 10, 50));

  const handlePrint = () => {
    if (htmlPages.length === 0) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlPages.join(''));
      printWindow.document.close();
      printWindow.focus();
      // Use a timeout to ensure content is rendered before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handleDownloadPdf = async () => {
    if (htmlPages.length === 0) return;
    setIsGenerating(true);
    try {
        const { jsPDF } = jspdf;
        const firstPageDiv = document.createElement('div');
        firstPageDiv.innerHTML = htmlPages[0];
        const firstPageElement = firstPageDiv.querySelector('.page-landscape, .page-portrait');
        const isLandscape = firstPageElement?.classList.contains('page-landscape');
        const orientation = isLandscape ? 'landscape' : 'portrait';
        
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = orientation === 'portrait' ? '794px' : '1123px';
        document.body.appendChild(tempContainer);

        for (let i = 0; i < htmlPages.length; i++) {
            tempContainer.innerHTML = htmlPages[i];
            const pageElement = tempContainer.children[0] as HTMLElement;
            if (!pageElement) continue;
            const canvas = await html2canvas(pageElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
            const imgData = canvas.toDataURL('image/jpeg', 0.98);
            if (i > 0) pdf.addPage(undefined, orientation);
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
        }
        document.body.removeChild(tempContainer);
        pdf.save(`${fileNameBase}_${lang}.pdf`);
    } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handleLangChange = (newLang: DownloadLanguage) => {
    setLang(newLang);
    setIsLangMenuOpen(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
          e.preventDefault();
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          initialDistanceRef.current = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          initialZoomRef.current = zoomLevel;
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialDistanceRef.current !== null) {
          e.preventDefault();
          const touch1 = e.touches[0];
          const touch2 = e.touches[1];
          const currentDistance = Math.hypot(touch1.clientX - touch2.clientX, touch1.clientY - touch2.clientY);
          const scaleRatio = currentDistance / initialDistanceRef.current;
          let newZoom = initialZoomRef.current * scaleRatio;
          newZoom = Math.max(20, Math.min(newZoom, 200));
          setZoomLevel(newZoom);
      }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
      if (e.touches.length < 2) {
          initialDistanceRef.current = null;
      }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex flex-col items-center justify-center z-[100] p-4 animate-scale-in no-print" onClick={onClose}>
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-2xl w-full h-full flex flex-col" onClick={e => e.stopPropagation()}>
            <header className="flex-shrink-0 p-3 bg-[var(--bg-tertiary)] border-b border-[var(--border-primary)] flex items-center justify-between gap-4">
                <h3 className="text-lg font-bold text-[var(--text-primary)] truncate">{title}</h3>
                
                <div className="flex items-center gap-2 flex-wrap justify-center">
                    {children}
                    <ControlGroup label="Font Size"><FontControl scale={fontSize} onIncrease={handleFontIncrease} onDecrease={handleFontDecrease} /></ControlGroup>
                    <ControlGroup label="Page Zoom"><ZoomControl scale={Math.round(zoomLevel)} onIncrease={handleZoomIn} onDecrease={handleZoomOut} /></ControlGroup>

                    <div ref={langMenuRef} className="relative">
                        <button onClick={() => setIsLangMenuOpen(prev => !prev)} className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium text-[var(--text-primary)] bg-transparent hover:bg-[var(--accent-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] focus:ring-offset-[var(--bg-tertiary)] transition-colors"><LangIcon /><span>{lang === 'en' ? 'English' : lang === 'ur' ? 'اردو' : 'Both'}</span><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></button>
                        {isLangMenuOpen && ( <div className="absolute right-0 mt-2 w-32 origin-top-right rounded-md shadow-lg bg-[var(--bg-secondary)] ring-1 ring-black ring-opacity-5 focus:outline-none z-10 animate-scale-in"><div className="py-1"><button onClick={() => handleLangChange('en')} className={`w-full text-left px-4 py-2 text-sm ${lang === 'en' ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>English</button><button onClick={() => handleLangChange('ur')} className={`w-full text-left px-4 py-2 text-sm font-urdu ${lang === 'ur' ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>اردو</button><button onClick={() => handleLangChange('both')} className={`w-full text-left px-4 py-2 text-sm ${lang === 'both' ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}>Both</button></div></div> )}
                    </div>
                    <div className="h-6 w-px bg-[var(--border-primary)] mx-1 hidden sm:block"></div>
                    <ToolbarButton onClick={handlePrint} label={t.print}><PrintIcon /></ToolbarButton>
                    <ToolbarButton onClick={handleDownloadPdf} disabled={isGenerating} label={isGenerating ? t.generating : t.downloadPdf}><PdfIcon /></ToolbarButton>
                    {onGenerateExcel && (<ToolbarButton onClick={() => onGenerateExcel(lang, fontSize)} label={t.downloadExcel}><ExcelIcon /></ToolbarButton>)}
                </div>

                <div className="flex-grow sm:flex-grow-0"></div>
                <IconButton onClick={onClose} title={t.close} className="hover:bg-red-100 hover:text-red-600 focus:ring-red-500"><CloseIcon /></IconButton>
            </header>
            
            <main className="flex-grow bg-gray-400 p-4 overflow-auto flex flex-col items-center" onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                {htmlPages.length > 1 && ( <div className="flex-shrink-0 flex items-center gap-4 mb-4 bg-white/80 backdrop-blur-sm p-1.5 rounded-full shadow-md"><button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-4 py-1.5 rounded-full disabled:opacity-50 text-sm font-semibold text-[var(--text-secondary)] hover:bg-gray-200/50 transition">&lt;</button><span className="text-sm font-medium text-gray-800">Page {currentPage + 1} of {htmlPages.length}</span><button onClick={() => setCurrentPage(p => Math.min(htmlPages.length - 1, p + 1))} disabled={currentPage === htmlPages.length - 1} className="px-4 py-1.5 rounded-full disabled:opacity-50 text-sm font-semibold text-[var(--text-secondary)] hover:bg-gray-200/50 transition">&gt;</button></div> )}
                <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center top' }}><div ref={previewRef} className="w-fit mx-auto shadow-lg" dangerouslySetInnerHTML={{ __html: htmlPages[currentPage] || '' }} /></div>
            </main>
        </div>
    </div>
  );
};
export default PrintPreview;
