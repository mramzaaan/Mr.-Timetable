import React, { useState, useEffect } from 'react';
import type { DownloadFormat, DownloadLanguage, SchoolClass, Teacher } from '../types';

declare const html2canvas: any;
declare const jspdf: any;

interface DownloadModalProps {
  t: any;
  title: string;
  isOpen: boolean;
  onClose: () => void;
  fileNameBase: string;

  // Multi-item props
  items?: (SchoolClass | Teacher)[];
  itemType?: 'class' | 'teacher';
  generateFullPageHtml?: (item: any, lang: DownloadLanguage) => string;
  generateSummaryPageHtml?: (items: any[], lang: DownloadLanguage) => string | string[]; // Can be single or multi-page
  generateExcel?: (items: any[], lang: DownloadLanguage) => void;
  summaryButtonLabel?: string;
  fullPagePdfOrientation?: 'portrait' | 'landscape';
  isWorkloadReport?: boolean;

  // Single-content props
  generateContentHtml?: (lang: DownloadLanguage) => string;
  onGenerateExcel?: (lang: DownloadLanguage) => void;
}

const DownloadModal: React.FC<DownloadModalProps> = ({
  t,
  title,
  isOpen,
  onClose,
  items,
  itemType,
  generateFullPageHtml,
  generateSummaryPageHtml,
  generateExcel,
  fileNameBase,
  generateContentHtml,
  onGenerateExcel,
  summaryButtonLabel,
  fullPagePdfOrientation = 'landscape',
  isWorkloadReport = false,
}) => {
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>(isWorkloadReport ? 'pdf-summary' : 'pdf-full');
  const [downloadLanguage, setDownloadLanguage] = useState<DownloadLanguage>('both');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const isMultiItemMode = !!items;

  useEffect(() => {
    if (!isOpen) {
      setDownloadFormat(isWorkloadReport ? 'pdf-summary' : 'pdf-full');
      setDownloadLanguage('both');
      setSelectedIds([]);
      setIsGenerating(false);
    } else if (!isMultiItemMode) {
      // For single-content downloads, no selection is needed, so pre-fill to enable button.
      setSelectedIds(['single-item-placeholder']);
    }
  }, [isOpen, isMultiItemMode, isWorkloadReport]);

  const handleSelectAll = (isChecked: boolean) => {
    if (isChecked && items) {
      setSelectedIds(items.map(item => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectItem = (id: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(itemId => itemId !== id));
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);

    if (isMultiItemMode && items) {
      const selectedItems = items.filter(i => selectedIds.includes(i.id));

      if (selectedItems.length === 0) {
        alert(`Please select at least one ${itemType}.`);
        setIsGenerating(false);
        return;
      }

      if (downloadFormat === 'excel' && generateExcel) {
        generateExcel(selectedItems, downloadLanguage);
      } else if (downloadFormat.startsWith('pdf')) {
        const { jsPDF } = jspdf;
        const isSummary = downloadFormat === 'pdf-summary';
        const orientation = isSummary ? 'portrait' : fullPagePdfOrientation;
        const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = orientation === 'portrait' ? '794px' : '1123px'; // A4 portrait vs landscape
        document.body.appendChild(tempContainer);

        try {
          if (downloadFormat === 'pdf-full' && generateFullPageHtml) {
              for (let i = 0; i < selectedItems.length; i++) {
                  const item = selectedItems[i];
                  tempContainer.innerHTML = generateFullPageHtml(item, downloadLanguage);
                  const pageContent = tempContainer.children[0] as HTMLElement;
                  if (!pageContent) continue;
                  
                  const canvas = await html2canvas(pageContent, { scale: 1.5, backgroundColor: '#ffffff' });
                  const imgData = canvas.toDataURL('image/jpeg', 0.95);
                  if (i > 0) pdf.addPage(undefined, orientation);
                  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
              }
          } else if (downloadFormat === 'pdf-summary' && generateSummaryPageHtml) {
              const summaryHtmlOrPages = generateSummaryPageHtml(selectedItems, downloadLanguage);
              const pages = Array.isArray(summaryHtmlOrPages) ? summaryHtmlOrPages : [summaryHtmlOrPages];

              for (let i = 0; i < pages.length; i++) {
                tempContainer.innerHTML = pages[i];
                const pageContent = tempContainer.children[0] as HTMLElement;
                const canvas = await html2canvas(pageContent, { scale: 1.5, backgroundColor: '#ffffff' });
                const imgData = canvas.toDataURL('image/jpeg', 0.95);
                if (i > 0) pdf.addPage(undefined, orientation);
                pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
              }
          }
          pdf.save(`${fileNameBase}_${downloadFormat}.pdf`);
        } catch (err) {
          console.error("PDF generation failed:", err);
          alert("Failed to generate PDF.");
        } finally {
          document.body.removeChild(tempContainer);
        }
      }
    } else { // Single-content mode
      if (downloadFormat === 'excel' && onGenerateExcel) {
        onGenerateExcel(downloadLanguage);
      } else if (downloadFormat.startsWith('pdf') && generateContentHtml) {
        const { jsPDF } = jspdf;
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        
        const tempContainer = document.createElement('div');
        tempContainer.style.position = 'absolute';
        tempContainer.style.left = '-9999px';
        tempContainer.style.width = '794px'; // A4 portrait width
        document.body.appendChild(tempContainer);

        try {
          tempContainer.innerHTML = generateContentHtml(downloadLanguage);
          const pageContent = tempContainer.children[0] as HTMLElement;
          if (pageContent) {
            const canvas = await html2canvas(pageContent, { scale: 1.5, backgroundColor: '#ffffff', useCORS: true });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            const imgProps = pdf.getImageProperties(imgData);
            const aspectRatio = imgProps.height / imgProps.width;
            let finalWidth = pdfWidth;
            let finalHeight = finalWidth * aspectRatio;
            if (finalHeight > pdfHeight) {
                finalHeight = pdfHeight;
                finalWidth = finalHeight / aspectRatio;
            }
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = (pdfHeight - finalHeight) / 2;
            pdf.addImage(imgData, 'JPEG', xOffset, yOffset, finalWidth, finalHeight, undefined, 'FAST');
          }
          pdf.save(`${fileNameBase}.pdf`);
        } catch(err) {
          console.error("PDF generation failed:", err);
          alert("Failed to generate PDF.");
        } finally {
          document.body.removeChild(tempContainer);
        }
      }
    }

    setIsGenerating(false);
    onClose();
  };

  if (!isOpen) return null;

  const itemSelectionTitle = itemType === 'class' ? t.selectClassesToDownload : t.selectTeachersToDownload;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)] flex-shrink-0">{title}</h3>

        <div className={`grid grid-cols-1 ${isMultiItemMode ? 'md:grid-cols-2' : ''} gap-6 flex-grow overflow-hidden`}>
            {/* Left Column: Item Selection (Conditional) */}
            {isMultiItemMode && items && (
                <div className="flex flex-col min-h-0">
                    <label className="text-md font-semibold text-[var(--text-secondary)] mb-2 flex-shrink-0">{itemSelectionTitle}</label>
                    <div className="flex-grow border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-lg overflow-y-auto p-3 space-y-2">
                        <label className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer border-b border-[var(--border-secondary)] sticky top-0 bg-[var(--bg-tertiary)] z-10">
                        <input
                            type="checkbox"
                            className="form-checkbox text-[var(--accent-primary)] rounded"
                            checked={items.length > 0 && selectedIds.length === items.length}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                        />
                        <span className="font-semibold text-[var(--text-primary)]">{t.selectAll}</span>
                    </label>
                    {items.map(item => (
                        <label key={item.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-md hover:bg-[var(--accent-secondary-hover)]">
                            <input
                                type="checkbox"
                                className="form-checkbox text-[var(--accent-primary)] rounded"
                                checked={selectedIds.includes(item.id)}
                                onChange={(e) => handleSelectItem(item.id, e.target.checked)}
                            />
                            <span className="text-[var(--text-primary)]">{item.nameEn} / <span className="font-urdu">{item.nameUr}</span></span>
                        </label>
                    ))}
                    </div>
                </div>
            )}

            {/* Right Column: Options */}
            <div className={`space-y-5 ${!isMultiItemMode ? 'md:col-span-2' : ''}`}>
              <div>
                <label className="text-md font-semibold text-[var(--text-secondary)]">{t.format}</label>
                <div className="mt-2 flex flex-col gap-2">
                  {isWorkloadReport ? (
                      <button onClick={() => setDownloadFormat('pdf-summary')} className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]`}>
                          {summaryButtonLabel}
                      </button>
                  ) : (
                    <>
                      {isMultiItemMode ? (
                        <>
                          <button onClick={() => setDownloadFormat('pdf-full')} className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition ${ downloadFormat === 'pdf-full' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>{t.fullTimetable}</button>
                          {generateSummaryPageHtml && <button onClick={() => setDownloadFormat('pdf-summary')} className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition ${ downloadFormat === 'pdf-summary' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>{summaryButtonLabel || t.weeklySummary}</button>}
                        </>
                      ) : (
                        <button onClick={() => setDownloadFormat('pdf-full')} className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition ${ downloadFormat === 'pdf-full' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>PDF</button>
                      )}
                      {(generateExcel || onGenerateExcel) && (
                        <button onClick={() => setDownloadFormat('excel')} className={`w-full px-4 py-2 text-sm font-medium border rounded-lg transition ${ downloadFormat === 'excel' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>Excel</button>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div>
                <label className="text-md font-semibold text-[var(--text-secondary)]">{t.language}</label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <button onClick={() => setDownloadLanguage('en')} className={`px-2 py-2 text-sm font-medium border rounded-lg transition ${ downloadLanguage === 'en' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>English</button>
                  <button onClick={() => setDownloadLanguage('ur')} className={`px-2 py-2 text-sm font-medium border rounded-lg transition ${ downloadLanguage === 'ur' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>اردو</button>
                  <button onClick={() => setDownloadLanguage('both')} className={`px-2 py-2 text-sm font-medium border rounded-lg transition ${ downloadLanguage === 'both' ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] border-[var(--border-secondary)]' }`}>Both</button>
                </div>
              </div>
            </div>
        </div>
        
        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-primary)] mt-6 flex-shrink-0">
            <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition">
              {t.cancel}
            </button>
            <button
              onClick={handleDownload}
              disabled={isGenerating || selectedIds.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? 'Generating...' : `${t.download}${isMultiItemMode ? ` (${selectedIds.length})` : ''}`}
            </button>
        </div>
      </div>
    </div>
  );
};

export default DownloadModal;