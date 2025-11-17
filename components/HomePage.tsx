import React, { useState, useRef, useEffect } from 'react';
import type { Language, Page, TimetableSession, SchoolConfig, TimetableGridData, SchoolClass } from '../types';
import TimetableSessionModal from './TimetableSessionModal';
import CsvManagementModal from './CsvManagementModal';
import GlobalSearch from './GlobalSearch';

const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const createEmptyTimetable = (): TimetableGridData => ({
    Monday: Array.from({ length: 8 }, () => []), Tuesday: Array.from({ length: 8 }, () => []),
    Wednesday: Array.from({ length: 8 }, () => []), Thursday: Array.from({ length: 8 }, () => []),
    Friday: Array.from({ length: 8 }, () => []),
});

interface HomePageProps {
  t: any;
  language: Language;
  setCurrentPage: (page: Page) => void;
  currentTimetableSessionId: string | null;
  timetableSessions: TimetableSession[];
  setCurrentTimetableSessionId: (id: string | null) => void;
  onCreateTimetableSession: (name: string, startDate: string, endDate: string) => void;
  onUpdateTimetableSession: (id: string, name: string, startDate: string, endDate: string) => void;
  onDeleteTimetableSession: (id: string) => void;
  onUploadTimetableSession: (session: TimetableSession) => void;
  schoolConfig: SchoolConfig;
  onUpdateCurrentSession: (updater: (session: TimetableSession) => TimetableSession) => void;
  onSearchResultClick: (type: 'class' | 'teacher' | 'subject', id: string) => void;
}

const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AlternativeTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h4v4h-4z" /><path d="M14 4h4v4h-4z" /><path d="M4 14h4v4h-4z" /><path d="M14 14h4v4h-4z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;


const HomePage: React.FC<HomePageProps> = ({ t, language, setCurrentPage, currentTimetableSessionId, timetableSessions, setCurrentTimetableSessionId, onCreateTimetableSession, onUpdateTimetableSession, onDeleteTimetableSession, onUploadTimetableSession, schoolConfig, onUpdateCurrentSession, onSearchResultClick }) => {
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<TimetableSession | null>(null);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [isSelectSessionModalOpen, setIsSelectSessionModalOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const uploadRef = useRef<HTMLInputElement>(null);

  const currentTimetableSession = timetableSessions.find(s => s.id === currentTimetableSessionId);

  const handleCreateNew = () => {
    setEditingSession(null);
    setIsSessionModalOpen(true);
  };
  
  const handleEditSession = (session: TimetableSession) => {
    setEditingSession(session);
    setIsSessionModalOpen(true);
  }

  const handleDownloadSession = async () => {
    if (!currentTimetableSession) {
      alert("No active timetable session to download.");
      return;
    }
    const sessionJsonString = JSON.stringify(currentTimetableSession, null, 2);
    const blob = new Blob([sessionJsonString], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${currentTimetableSession.name.replace(/\s/g, '_')}_session.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleUploadClick = () => {
    uploadRef.current?.click();
  };

  const readSessionFile = async (file: File) => {
    try {
        const sessionJsonString = await file.text();
        const session: TimetableSession = JSON.parse(sessionJsonString);
        
        if (!session.id || !session.name) {
            throw new Error('Invalid session file format.');
        }

        if (!session.subjects) session.subjects = [];
        if (!session.teachers) session.teachers = [];
        if (!session.classes) session.classes = [];
        // FIX: Ensure jointPeriods array exists on uploaded sessions to prevent crash.
        if (!session.jointPeriods) session.jointPeriods = [];
        if (!session.adjustments) session.adjustments = {};

        session.classes.forEach((schoolClass: SchoolClass) => {
            if (!schoolClass.timetable) {
                schoolClass.timetable = createEmptyTimetable();
            } else {
                daysOfWeek.forEach(day => {
                    const daySchedule = schoolClass.timetable[day];
                    if (!Array.isArray(daySchedule) || daySchedule.length < 8) {
                        const newDaySchedule = Array.from({ length: 8 }, () => []);
                        if (Array.isArray(daySchedule)) {
                            for (let i = 0; i < Math.min(daySchedule.length, 8); i++) {
                                if (Array.isArray(daySchedule[i])) {
                                    newDaySchedule[i] = daySchedule[i];
                                }
                            }
                        }
                        schoolClass.timetable[day] = newDaySchedule;
                    } else {
                        daySchedule.forEach((slot, i) => {
                            if (!Array.isArray(slot)) {
                                daySchedule[i] = [];
                            }
                        });
                    }
                });
            }

            if (schoolClass.subjects && Array.isArray(schoolClass.subjects)) {
                schoolClass.subjects.forEach(subject => {
                    if (subject && typeof subject === 'object') {
                        if (!('subjectGroup' in subject)) {
                            (subject as any).subjectGroup = undefined;
                        }
                        if (!('combinedGroupId' in subject)) {
                            (subject as any).combinedGroupId = undefined;
                        }
                    }
                });
            } else {
                schoolClass.subjects = [];
            }
        });
        
        onUploadTimetableSession(session);
        setFeedback({ message: t.sessionUploadedSuccessfully.replace('{name}', session.name), type: 'success' });
    } catch (error: any) {
        setFeedback({ message: t.failedToUploadSession.replace('{reason}', error.message), type: 'error' });
    }
  };

  const NavCard: React.FC<{ title: string; icon: React.ReactNode; onClick: () => void; }> = ({ title, icon, onClick }) => (
    <button
      onClick={onClick}
      title={title}
      className="bg-[var(--bg-secondary)] rounded-full shadow-lg border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 w-36 h-36 flex flex-col items-center justify-center text-center p-4 group"
    >
      <div className="text-[var(--accent-primary)] transition-transform duration-300 group-hover:scale-110">{icon}</div>
      <h3 className="text-sm font-bold text-[var(--text-primary)] mt-2">{title}</h3>
    </button>
  );

  return (
    <>
      <TimetableSessionModal
        t={t}
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        session={editingSession}
        onCreate={onCreateTimetableSession}
        onUpdate={onUpdateTimetableSession}
        setFeedback={setFeedback}
      />
      <CsvManagementModal
        t={t}
        isOpen={isCsvModalOpen}
        onClose={() => setIsCsvModalOpen(false)}
        currentTimetableSession={currentTimetableSession}
        onUpdateTimetableSession={onUpdateCurrentSession}
      />
      
      {isSelectSessionModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity" onClick={() => setIsSelectSessionModalOpen(false)} role="dialog" aria-modal="true">
            <div className="bg-[var(--bg-secondary)] rounded-xl shadow-2xl max-w-2xl w-full mx-4 transform transition-all flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-[var(--border-primary)]">
                    <div className="flex flex-wrap justify-between items-center gap-4">
                        <div>
                            <h2 className="text-2xl font-bold text-[var(--text-primary)]">{t.manageTimetables}</h2>
                            <p className="text-[var(--text-secondary)] mt-1">{t.selectOrCreateDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button onClick={handleCreateNew} className="px-4 py-2 text-sm font-semibold bg-[var(--accent-primary)] text-[var(--accent-text)] rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] transition-colors">
                                {t.newTimetableSession}
                            </button>
                            <button onClick={handleUploadClick} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors">
                                {t.uploadSession}
                            </button>
                            <button onClick={handleDownloadSession} disabled={!currentTimetableSession} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                {t.downloadSession}
                            </button>
                            <input type="file" ref={uploadRef} className="hidden" accept=".json" onChange={(e) => e.target.files && readSessionFile(e.target.files[0])} />
                        </div>
                    </div>
                </div>
                
                <div className="p-6 flex-grow overflow-y-auto">
                    {feedback.message && (
                        <div className={`p-3 rounded-md text-sm my-4 animate-scale-in ${ feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700' }`} role="alert">
                            {feedback.message}
                        </div>
                    )}

                    {timetableSessions.length === 0 ? (
                        <p className="text-center text-[var(--text-secondary)] py-8">{t.noTimetableSessions}</p>
                    ) : (
                        <div className="space-y-3">
                        {timetableSessions.map(session => (
                            <div key={session.id} className={`p-4 rounded-lg flex items-center justify-between transition-all ${session.id === currentTimetableSessionId ? 'bg-[var(--accent-secondary)] border-2 border-[var(--accent-primary)]' : 'bg-[var(--bg-tertiary)] border-2 border-transparent'}`}>
                            <div className="flex items-center gap-4">
                                <input
                                type="radio"
                                id={`session-modal-${session.id}`}
                                name="timetable-session-modal"
                                value={session.id}
                                checked={session.id === currentTimetableSessionId}
                                onChange={() => { setCurrentTimetableSessionId(session.id); setIsSelectSessionModalOpen(false); }}
                                className="form-radio h-5 w-5 text-[var(--accent-primary)] focus:ring-[var(--accent-primary)]"
                                />
                                <label htmlFor={`session-modal-${session.id}`} className="cursor-pointer">
                                <span className="font-bold text-[var(--text-primary)]">{session.name}</span>
                                <span className="text-sm text-[var(--text-secondary)] block">{new Date(session.startDate).toLocaleDateString()} - {new Date(session.endDate).toLocaleDateString()}</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleEditSession(session)} className="p-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] rounded-full hover:bg-[var(--accent-secondary-hover)] transition-colors" title={t.edit}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                <button onClick={() => onDeleteTimetableSession(session.id)} className="p-2 text-[var(--text-secondary)] hover:text-red-600 rounded-full hover:bg-red-50 transition-colors" title={t.delete}><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                            </div>
                            </div>
                        ))}
                        </div>
                    )}
                </div>
                <div className="p-4 border-t border-[var(--border-primary)] flex justify-end">
                    <button onClick={() => setIsSelectSessionModalOpen(false)} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition">
                        {t.cancel}
                    </button>
                </div>
            </div>
        </div>
      )}

      <div className="min-h-screen flex flex-col">
        <header className="bg-[var(--bg-secondary)] shadow-sm">
          <div className="container mx-auto px-6 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
               {schoolConfig.schoolLogoBase64 && (
                <img src={schoolConfig.schoolLogoBase64} alt="School Logo" className="h-10 w-10 object-contain rounded-full" />
               )}
              <span className="text-xl font-bold text-[var(--text-primary)]">Mr. 🇵🇰</span>
            </div>
            {currentTimetableSession && (
                <div className="flex items-center gap-2">
                    <button onClick={() => setIsCsvModalOpen(true)} className="px-3 py-1.5 text-xs font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors">
                        {t.manageDataCsv}
                    </button>
                </div>
            )}
          </div>
        </header>

        {currentTimetableSession && (
            <div className="bg-[var(--bg-secondary)] border-b border-[var(--border-primary)] p-4 no-print">
                <GlobalSearch 
                    t={t}
                    language={language}
                    classes={currentTimetableSession.classes}
                    teachers={currentTimetableSession.teachers}
                    subjects={currentTimetableSession.subjects}
                    onResultClick={onSearchResultClick}
                />
            </div>
        )}

        <main className="flex-grow container mx-auto px-4 py-12 sm:py-16 flex flex-col items-center">
            <div className="w-full animate-scale-in max-w-4xl">
                <div className="mb-10 p-6 bg-[var(--bg-secondary)] rounded-xl shadow-md border border-[var(--border-primary)]">
                    {currentTimetableSession ? (
                        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                            <div className="flex-grow text-left">
                                <p className="text-sm font-semibold text-[var(--accent-primary)] tracking-wider uppercase">{t.selectActiveTimetable}</p>
                                <h2 className="text-3xl font-bold text-[var(--text-primary)] mt-1 mb-3">{currentTimetableSession.name}</h2>
                                <div className="flex flex-col sm:flex-row sm:items-center sm:gap-8 text-sm text-[var(--text-secondary)] border-t border-[var(--border-primary)] pt-3">
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span><strong>{t.startDate}:</strong> {new Date(currentTimetableSession.startDate).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: language === 'ur' ? 'arab' : undefined })}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        <span><strong>{t.endDate}:</strong> {new Date(currentTimetableSession.endDate).toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: language === 'ur' ? 'arab' : undefined })}</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsSelectSessionModalOpen(true)}
                                className="px-5 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors shadow-sm flex-shrink-0"
                            >
                                {t.change}
                            </button>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h1 className="text-3xl sm:text-4xl font-bold text-[var(--text-primary)] mb-3">{t.welcomeToMrTimetable}</h1>
                            <p className="text-md text-[var(--text-secondary)] max-w-2xl mx-auto mb-6">{t.selectOrCreateDescription}</p>
                            <button
                                onClick={() => setIsSelectSessionModalOpen(true)}
                                className="px-6 py-3 text-md font-semibold bg-[var(--accent-primary)] text-[var(--accent-text)] rounded-lg shadow-lg hover:bg-[var(--accent-primary-hover)] transition-transform hover:scale-105"
                            >
                                {t.selectTimetable}
                            </button>
                        </div>
                    )}
                </div>
                
                <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6 text-center">{t.schoolPortal}</h2>
                
                <div className="flex flex-wrap justify-center gap-6 max-w-4xl mx-auto">
                    <NavCard title={t.dataEntry} icon={<DataEntryIcon />} onClick={() => setCurrentPage('dataEntry')} />
                    <NavCard title={t.classTimetable} icon={<ClassTimetableIcon />} onClick={() => setCurrentPage('classTimetable')} />
                    <NavCard title={t.teacherTimetable} icon={<TeacherTimetableIcon />} onClick={() => setCurrentPage('teacherTimetable')} />
                    <NavCard title={t.adjustments} icon={<AlternativeTimetableIcon />} onClick={() => setCurrentPage('alternativeTimetable')} />
                    <NavCard title={t.settings} icon={<SettingsIcon />} onClick={() => setCurrentPage('settings')} />
                </div>
            </div>
        </main>
      </div>
    </>
  );
};

export default HomePage;
