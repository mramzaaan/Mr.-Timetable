import React, { useState, useEffect, useRef } from 'react';
import type { Language, SchoolConfig, SchoolClass, Teacher, Subject, Adjustment } from '../types';
import type { Theme } from '../App';
import PrintPreview from './PrintPreview';
// FIX: Correctly import the newly exported functions for report generation.
import { generateBasicInformationHtml, generateBasicInformationExcel, generateByPeriodHtml, generateByPeriodExcel } from './AdjustmentsPage';
import { generateWorkloadSummaryHtml, generateWorkloadSummaryExcel } from './TeacherTimetablePage';

interface SettingsPageProps {
  t: any; // Translation object
  language: Language;
  setLanguage: (lang: Language) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  schoolConfig: SchoolConfig;
  onUpdateSchoolConfig: (newSchoolConfig: Partial<SchoolConfig>) => void;
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  adjustments: Record<string, Adjustment[]>;
}

const themeOptions: { id: Theme; name: string; colors: [string, string, string] }[] = [
    { id: 'light', name: 'Light', colors: ['#f9fafb', '#0d9488', '#1f2937'] },
    { id: 'dark', name: 'Dark', colors: ['#111827', '#2dd4bf', '#f9fafb'] },
    { id: 'contrast', name: 'Contrast', colors: ['#ffffff', '#0000ff', '#000000'] },
    { id: 'mint', name: 'Mint', colors: ['#f0fdfa', '#0d9488', '#064e3b'] },
    { id: 'ocean', name: 'Ocean', colors: ['#f0f9ff', '#0284c7', '#0c4a6e'] },
    { id: 'sunset', name: 'Sunset', colors: ['#fff7ed', '#ea580c', '#7c2d12'] },
    { id: 'rose', name: 'Rose', colors: ['#fff1f2', '#e11d48', '#881337'] },
    { id: 'amoled', name: 'Amoled', colors: ['#000000', '#00e5ff', '#e0e0e0'] },
];

const ThemeCard: React.FC<{
    themeInfo: typeof themeOptions[0],
    currentTheme: Theme,
    setTheme: (theme: Theme) => void,
}> = ({ themeInfo, currentTheme, setTheme }) => {
    const isSelected = themeInfo.id === currentTheme;
    return (
        <button
            onClick={() => setTheme(themeInfo.id)}
            className={`relative p-4 rounded-lg border-2 transition-all duration-200 ${isSelected ? 'border-[var(--accent-primary)] shadow-lg' : 'border-[var(--border-secondary)] hover:border-[var(--text-placeholder)]'}`}
        >
            <div className="flex items-center justify-between">
                <span className="font-semibold text-[var(--text-primary)]">{themeInfo.name}</span>
                <div className="flex -space-x-2">
                    {themeInfo.colors.map((color, i) => (
                        <div key={i} className="w-6 h-6 rounded-full border-2 border-white dark:border-gray-800" style={{ backgroundColor: color }} />
                    ))}
                </div>
            </div>
            {isSelected && (
                 <div className="absolute top-2 right-2 w-5 h-5 bg-[var(--accent-primary)] text-[var(--accent-text)] rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </div>
            )}
        </button>
    );
};


const SettingsPage: React.FC<SettingsPageProps> = ({
  t,
  language,
  setLanguage,
  theme,
  setTheme,
  schoolConfig,
  onUpdateSchoolConfig,
  classes,
  teachers,
  subjects,
  adjustments
}) => {
  const [localSchoolNameEn, setLocalSchoolNameEn] = useState(schoolConfig.schoolNameEn);
  const [localSchoolNameUr, setLocalSchoolNameUr] = useState(schoolConfig.schoolNameUr);
  const [localSchoolLogo, setLocalSchoolLogo] = useState<string | null>(schoolConfig.schoolLogoBase64);
  
  const [isSchoolInfoOpen, setIsSchoolInfoOpen] = useState(false);
  const [isThemeOptionsOpen, setIsThemeOptionsOpen] = useState(false);
  
  const [isBasicInfoPreviewOpen, setIsBasicInfoPreviewOpen] = useState(false);
  const [isWorkloadPreviewOpen, setIsWorkloadPreviewOpen] = useState(false);
  const [isTeacherSelectionOpen, setIsTeacherSelectionOpen] = useState(false);
  const [selectedTeacherIdsForReport, setSelectedTeacherIdsForReport] = useState<string[]>([]);
  const [isByPeriodPreviewOpen, setIsByPeriodPreviewOpen] = useState(false);
  
  const [byPeriodDate, setByPeriodDate] = useState(new Date().toISOString().split('T')[0]);
  const [byPeriodAbsentTeachers, setByPeriodAbsentTeachers] = useState<string[]>([]);
  const [byPeriodAbsenteeDetails, setByPeriodAbsenteeDetails] = useState<Record<string, { leaveType: 'full' | 'half'; startPeriod: number }>>({});


  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLocalSchoolNameEn(schoolConfig.schoolNameEn);
    setLocalSchoolNameUr(schoolConfig.schoolNameUr);
    setLocalSchoolLogo(schoolConfig.schoolLogoBase64);
  }, [schoolConfig]);
  
  useEffect(() => {
    setByPeriodAbsenteeDetails(prevDetails => {
        const newDetails: Record<string, { leaveType: 'full' | 'half'; startPeriod: number }> = {};
        byPeriodAbsentTeachers.forEach(id => {
            newDetails[id] = prevDetails[id] || { leaveType: 'full', startPeriod: 1 };
        });
        return newDetails;
    });
  }, [byPeriodAbsentTeachers]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
          alert("File is too large. Please select an image smaller than 2MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalSchoolLogo(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
    if(event.target) event.target.value = ''; // Reset file input
  };
  
  const handleRemoveLogo = () => {
      setLocalSchoolLogo(null);
  };

  const handleSettingsSave = () => {
    onUpdateSchoolConfig({
      schoolNameEn: localSchoolNameEn,
      schoolNameUr: localSchoolNameUr,
      schoolLogoBase64: localSchoolLogo,
    });
    setFeedback({ message: t.schoolInfoSaved, type: 'success' });
    setTimeout(() => setFeedback({ message: '', type: null }), 3000);
  };

  const handleWorkloadReportClick = () => {
    setSelectedTeacherIdsForReport(teachers.map(t => t.id));
    setIsTeacherSelectionOpen(true);
  };

  const handleTeacherSelectionConfirm = () => {
    if (selectedTeacherIdsForReport.length === 0) {
        alert(t.selectTeachersToDownload);
        return;
    }
    setIsTeacherSelectionOpen(false);
    setIsWorkloadPreviewOpen(true);
  };

  const handleSelectAllTeachers = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedTeacherIdsForReport(e.target.checked ? teachers.map(t => t.id) : []);
  };

  const handleSelectTeacher = (id: string, isChecked: boolean) => {
    setSelectedTeacherIdsForReport(prev => isChecked ? [...prev, id] : prev.filter(teacherId => teacherId !== id));
  };
  
  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";
  
  const TeacherSelectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={() => setIsTeacherSelectionOpen(false)}>
      <div className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">{t.selectTeachersToDownload}</h3>
        <div className="flex-grow border border-[var(--border-primary)] bg-[var(--bg-tertiary)] rounded-lg overflow-y-auto p-3 space-y-2">
            <label className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer border-b border-[var(--border-secondary)] sticky top-0 bg-[var(--bg-tertiary)] z-10">
                <input
                    type="checkbox"
                    className="form-checkbox text-[var(--accent-primary)] rounded"
                    checked={teachers.length > 0 && selectedTeacherIdsForReport.length === teachers.length}
                    onChange={handleSelectAllTeachers}
                />
                <span className="font-semibold text-[var(--text-primary)]">{t.selectAll}</span>
            </label>
            {teachers.map(teacher => (
                <label key={teacher.id} className="flex items-center space-x-2 py-1.5 px-2 cursor-pointer rounded-md hover:bg-[var(--accent-secondary-hover)]">
                    <input
                        type="checkbox"
                        className="form-checkbox text-[var(--accent-primary)] rounded"
                        checked={selectedTeacherIdsForReport.includes(teacher.id)}
                        onChange={(e) => handleSelectTeacher(teacher.id, e.target.checked)}
                    />
                    <span className="text-[var(--text-primary)]">{teacher.nameEn} / <span className="font-urdu">{teacher.nameUr}</span></span>
                </label>
            ))}
        </div>
        <div className="flex justify-end gap-4 pt-6 border-t border-[var(--border-primary)] mt-6">
            <button onClick={() => setIsTeacherSelectionOpen(false)} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)]">{t.cancel}</button>
            <button onClick={handleTeacherSelectionConfirm} disabled={selectedTeacherIdsForReport.length === 0} className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] disabled:opacity-50">{t.workloadReport}</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       {isTeacherSelectionOpen && <TeacherSelectionModal />}
       <PrintPreview
            t={t}
            isOpen={isBasicInfoPreviewOpen}
            onClose={() => setIsBasicInfoPreviewOpen(false)}
            title={t.basicInformation}
            fileNameBase="Basic_Information"
            generateHtml={(lang, fontSize) => generateBasicInformationHtml(t, lang, fontSize, classes, teachers, schoolConfig)}
            onGenerateExcel={(lang) => generateBasicInformationExcel(t, lang, classes, teachers)}
        />
        <PrintPreview
            t={t}
            isOpen={isWorkloadPreviewOpen}
            onClose={() => setIsWorkloadPreviewOpen(false)}
            title={t.workloadSummaryReport}
            fileNameBase="Teacher_Workload_Summary"
            generateHtml={(lang, fontSize) => {
              const selectedTeachers = teachers.filter(t => selectedTeacherIdsForReport.includes(t.id));
              return generateWorkloadSummaryHtml(t, lang, fontSize, selectedTeachers, schoolConfig, classes, adjustments);
            }}
            onGenerateExcel={(lang) => {
              const selectedTeachers = teachers.filter(t => selectedTeacherIdsForReport.includes(t.id));
              generateWorkloadSummaryExcel(t, lang, selectedTeachers, classes, adjustments)
            }}
        />
        <PrintPreview
            t={t}
            isOpen={isByPeriodPreviewOpen}
            onClose={() => setIsByPeriodPreviewOpen(false)}
            title={t.byPeriod}
            fileNameBase={`By_Period_Report_${byPeriodDate}`}
            generateHtml={(lang, fontSize) => {
                const dayOfWeek = new Date(byPeriodDate).getDay();
                const dayName = dayOfWeek > 0 && dayOfWeek < 6 ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayOfWeek - 1] as any : null;
                return generateByPeriodHtml(t, lang, fontSize, schoolConfig, classes, teachers, dayName, byPeriodAbsentTeachers, byPeriodAbsenteeDetails);
            }}
            onGenerateExcel={(lang, fontSize) => {
                const dayOfWeek = new Date(byPeriodDate).getDay();
                const dayName = dayOfWeek > 0 && dayOfWeek < 6 ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][dayOfWeek - 1] as any : null;
                generateByPeriodExcel(t, lang, schoolConfig, classes, teachers, dayName, byPeriodAbsentTeachers, byPeriodAbsenteeDetails, byPeriodDate);
            }}
        >
            <div className="flex items-center gap-2">
                <input type="date" value={byPeriodDate} onChange={e => setByPeriodDate(e.target.value)} className="bg-gray-200 border-gray-200 text-gray-700 py-1 px-2 rounded text-xs"/>
            </div>
        </PrintPreview>


      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">{t.settings}</h2>
             <button onClick={() => setLanguage(language === 'en' ? 'ur' : 'en')} className="px-4 py-2 rounded-lg shadow-md bg-[var(--bg-tertiary)] text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)]">
                {language === 'en' ? <span className="font-urdu">اردو</span> : 'English'}
            </button>
        </div>
        
        {feedback.message && (
            <div className={`p-3 rounded-md text-sm mb-4 animate-scale-in ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`} role="alert">
                {feedback.message}
            </div>
        )}

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsThemeOptionsOpen(!isThemeOptionsOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.theme}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isThemeOptionsOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>
            <div className={`grid transition-all duration-500 ${isThemeOptionsOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            {themeOptions.map(themeInfo => (
                                <ThemeCard key={themeInfo.id} themeInfo={themeInfo} currentTheme={theme} setTheme={setTheme} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
             <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsSchoolInfoOpen(!isSchoolInfoOpen)}>
                <h3 className="text-xl font-bold text-[var(--text-primary)]">{t.schoolInformation}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isSchoolInfoOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
             </button>
            <div className={`grid transition-all duration-500 ${isSchoolInfoOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden"><div className="p-6 pt-0 space-y-6"><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><div><label htmlFor="schoolNameEn" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t.schoolNameEn}</label><input type="text" id="schoolNameEn" value={localSchoolNameEn} onChange={(e) => setLocalSchoolNameEn(e.target.value)} className={inputStyleClasses} /></div><div><label htmlFor="schoolNameUr" className="block text-sm font-medium text-[var(--text-secondary)] mb-1">{t.schoolNameUr}</label><input type="text" id="schoolNameUr" value={localSchoolNameUr} onChange={(e) => setLocalSchoolNameUr(e.target.value)} className={`${inputStyleClasses} font-urdu`} dir="rtl" /></div></div><div><label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">School Logo</label><div className="flex items-center gap-4"><div className="w-20 h-20 bg-[var(--bg-tertiary)] rounded-md flex items-center justify-center border-2 border-dashed border-[var(--border-secondary)] overflow-hidden">{localSchoolLogo ? <img src={localSchoolLogo} alt="School Logo Preview" className="w-full h-full object-contain" /> : <span className="text-xs text-center text-[var(--text-placeholder)]">No Logo</span>}</div><div className="flex flex-col gap-2"><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" /><button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-md shadow-sm hover:bg-[var(--accent-secondary-hover)] border border-[var(--border-secondary)]">Upload Logo</button>{localSchoolLogo && <button onClick={handleRemoveLogo} className="px-4 py-2 text-sm font-semibold text-red-600 rounded-md hover:bg-red-50">Remove</button>}</div></div></div></div></div>
            </div>
        </div>
        
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 p-6">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.printViewAction}</h3>
            <div className="flex flex-wrap gap-4">
                <button
                    onClick={() => setIsBasicInfoPreviewOpen(true)}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors"
                >
                    {t.basicInformation}
                </button>
                <button
                    onClick={handleWorkloadReportClick}
                    disabled={teachers.length === 0}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors disabled:opacity-50"
                >
                    {t.workloadReport}
                </button>
                <button
                    onClick={() => setIsByPeriodPreviewOpen(true)}
                    className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-secondary-hover)] transition-colors"
                >
                    {t.byPeriod}
                </button>
            </div>
        </div>
        
        <div className="flex justify-end items-center mt-8">
            <button onClick={handleSettingsSave} className="px-8 py-3 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] transition-colors">{t.saveSettings}</button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;