import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { Language, Page, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, TimetableSession, UserData, SchoolConfig, DataEntryTab, Period, DownloadDesignConfig, DownloadDesigns, GroupSet, JointPeriod, LeaveDetails } from './types';
// FIX: Changed to use the 'translations' export directly instead of a non-existent 'useTranslations' hook.
import { translations } from './i18n';
import HomePage from './components/HomePage';
import DataEntryPage from './components/DataEntryPage';
import ClassTimetablePage from './components/ClassTimetablePage';
import TeacherTimetablePage from './components/TeacherTimetablePage';
// FIX: Changed to a named import to resolve a "no default export" error.
import { AlternativeTimetablePage } from './components/AdjustmentsPage';
import SettingsPage from './components/SettingsPage';
import { generateUniqueId } from './types';
import BottomNavBar from './components/BottomNavBar';
import GlobalSearch from './components/GlobalSearch';

export type Theme = 'light' | 'dark' | 'contrast' | 'mint' | 'ocean' | 'sunset' | 'rose' | 'amoled';

// Default design configuration
const defaultSingleDownloadDesign: DownloadDesignConfig = {
    logo: { size: 100, position: 'left' },
    schoolName: { fontSize: 40, fontWeight: 'bold', align: 'left' },
    headerDetails: { fontSize: 22, fontWeight: 'bold' },
    tableContent: { fontSize: 13 },
    headerBgColor: '#EBF4FA',
    showFooter: true,
};

const defaultDownloadDesigns: DownloadDesigns = {
    class: defaultSingleDownloadDesign,
    teacher: defaultSingleDownloadDesign,
    alternative: defaultSingleDownloadDesign,
};

const defaultSchoolLogo = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';

const defaultUserData: UserData = {
    timetableSessions: [],
    schoolConfig: {
        schoolNameEn: 'Govt. High School Wan Bhachran (Mianwali)',
        schoolNameUr: 'گورنمنٹ ہائی سکول واں بھچراں (میانوالی)',
        schoolLogoBase64: defaultSchoolLogo,
        downloadDesigns: defaultDownloadDesigns,
    },
};

// --- Confirmation Modal Component ---
interface ConfirmationModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ t, isOpen, onClose, onConfirm, title, message }) => {
  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[101] transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirmationModalTitle"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-scale-in"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="confirmationModalTitle" className="text-xl sm:text-2xl font-bold mb-4 text-center text-[var(--text-primary)]">
          {title}
        </h3>
        <div className="text-center text-[var(--text-secondary)] mb-8 max-h-60 overflow-y-auto">
          {message}
        </div>
        <div className="flex justify-center gap-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-sm font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={handleConfirm}
            className="px-6 py-2 text-sm font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  );
};

// --- App Component ---
const App: React.FC = () => {
    const [theme, setTheme] = useState<Theme>(() => {
        let savedTheme = localStorage.getItem('mrtimetable_theme') as Theme | 'high-contrast';
        if (savedTheme === 'high-contrast') {
            savedTheme = 'contrast'; // Migration from old value
        }
        return (savedTheme as Theme) || 'contrast';
    });
    const [language, setLanguage] = useState<Language>(() => (localStorage.getItem('mrtimetable_language') as Language) || 'en');

    const [userData, setUserData] = useState<UserData>(() => {
        const saved = localStorage.getItem('mrtimetable_userData');
        let dataToLoad: UserData;
        try {
            dataToLoad = saved ? JSON.parse(saved) : defaultUserData;
        } catch (e) {
            console.error("Failed to parse user data from localStorage", e);
            dataToLoad = defaultUserData;
        }

        // Migration logic
        dataToLoad.timetableSessions.forEach(session => {
            // Ensure jointPeriods array exists
            if (!session.jointPeriods) {
                session.jointPeriods = [];
            }
            if (!session.leaveDetails) {
                session.leaveDetails = {};
            }
            session.classes.forEach(c => {
                 // Remove obsolete combinedGroupId
                c.subjects.forEach(s => {
                    if ((s as any).combinedGroupId) {
                        delete (s as any).combinedGroupId;
                    }
                });

                // Migrate old subject groups to new groupSets
                const hasOldGroupSystem = c.subjects.some(s => (s as any).subjectGroup);
                if (hasOldGroupSystem && (!c.groupSets || c.groupSets.length === 0)) {
                    const defaultGroupSet: GroupSet = {
                        id: 'default-ab-set',
                        name: 'Science Groups',
                        groups: [
                            { id: 'group-a', name: 'Group A' },
                            { id: 'group-b', name: 'Group B' }
                        ]
                    };
                    c.groupSets = [defaultGroupSet];
                    c.subjects = c.subjects.map(s => {
                        const oldGroup = (s as any).subjectGroup;
                        if (oldGroup === 'A' || oldGroup === 'B') {
                            const { subjectGroup, ...rest } = s as any;
                            return { 
                                ...rest, 
                                groupSetId: 'default-ab-set', 
                                groupId: oldGroup === 'A' ? 'group-a' : 'group-b' 
                            };
                        }
                        return s;
                    });
                }
            });
        });

        return dataToLoad;
    });
    const [currentTimetableSessionId, setCurrentTimetableSessionId] = useState<string | null>(() => localStorage.getItem('mrtimetable_currentTimetableSessionId'));

    const [currentPage, setCurrentPage] = useState<Page>('home');
    const [dataEntryTab, setDataEntryTab] = useState<DataEntryTab>('teacher');
    const [classTimetableSelection, setClassTimetableSelection] = useState<{ classId: string | null; highlightedTeacherId: string; }>({ classId: null, highlightedTeacherId: '' });
    const [teacherTimetableSelection, setTeacherTimetableSelection] = useState<{ teacherId: string | null }>({ teacherId: null });
    const [adjustmentsSelection, setAdjustmentsSelection] = useState<{ date: string; teacherIds: string[]; }>({ date: new Date().toISOString().split('T')[0], teacherIds: [] });

    const [confirmationState, setConfirmationState] = useState<{ isOpen: boolean; onConfirm: () => void; title: string; message: React.ReactNode; }>({ isOpen: false, onConfirm: () => {}, title: '', message: '' });

    const t = translations[language];

    useEffect(() => {
        document.documentElement.className = theme;
        localStorage.setItem('mrtimetable_theme', theme);
    }, [theme]);

    useEffect(() => {
        document.documentElement.lang = language;
        document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
        localStorage.setItem('mrtimetable_language', language);
    }, [language]);

    useEffect(() => {
        localStorage.setItem('mrtimetable_userData', JSON.stringify(userData));
    }, [userData]);

    useEffect(() => {
        if (currentTimetableSessionId) localStorage.setItem('mrtimetable_currentTimetableSessionId', currentTimetableSessionId);
        else localStorage.removeItem('mrtimetable_currentTimetableSessionId');
    }, [currentTimetableSessionId]);

    useEffect(() => {
        // On initial load, validate the current timetable session ID
        if (userData.timetableSessions.length > 0) {
            const lastUsedSessionId = localStorage.getItem('mrtimetable_currentTimetableSessionId');
            if (!lastUsedSessionId || !userData.timetableSessions.some(s => s.id === lastUsedSessionId)) {
                setCurrentTimetableSessionId(userData.timetableSessions[0].id);
            }
        } else {
            setCurrentTimetableSessionId(null);
        }
    }, []); // Run only on mount

    const currentTimetableSession = useMemo(() => userData.timetableSessions.find(s => s.id === currentTimetableSessionId) || null, [userData, currentTimetableSessionId]);

    const schoolConfig = useMemo(() => userData.schoolConfig, [userData]);

    const openConfirmation = (title: string, message: React.ReactNode, onConfirm: () => void) => {
        setConfirmationState({ isOpen: true, title, message, onConfirm });
    };

    const updateCurrentSession = useCallback((updater: (session: TimetableSession) => TimetableSession) => {
        if (!currentTimetableSessionId) return;
        setUserData(prev => {
            const newSessions = prev.timetableSessions.map(session =>
                session.id === currentTimetableSessionId ? updater(session) : session
            );
            return { ...prev, timetableSessions: newSessions };
        });
    }, [currentTimetableSessionId]);

    const handleCreateTimetableSession = (name: string, startDate: string, endDate: string) => {
        const newSession: TimetableSession = {
            id: generateUniqueId(), name, startDate, endDate,
            subjects: [], teachers: [], classes: [], jointPeriods: [], adjustments: {}, leaveDetails: {}
        };
        setUserData(prev => ({
            ...prev,
            timetableSessions: [...prev.timetableSessions, newSession]
        }));
        setCurrentTimetableSessionId(newSession.id);
    };

    const handleUpdateTimetableSession = (id: string, name: string, startDate: string, endDate: string) => {
        setUserData(prev => ({
            ...prev,
            timetableSessions: prev.timetableSessions.map(s =>
                s.id === id ? { ...s, name, startDate, endDate } : s
            )
        }));
    };

    const handleDeleteTimetableSession = (id: string) => {
        openConfirmation(t.delete, t.areYouSure, () => {
            setUserData(prev => {
                const newSessions = prev.timetableSessions.filter(s => s.id !== id);
                if (currentTimetableSessionId === id) {
                    setCurrentTimetableSessionId(newSessions.length > 0 ? newSessions[0].id : null);
                }
                return { ...prev, timetableSessions: newSessions };
            });
        });
    };

    const handleUploadTimetableSession = (session: TimetableSession) => {
        setUserData(prev => {
            const sessionExists = prev.timetableSessions.some(s => s.id === session.id);
            const newSessions = sessionExists 
                ? prev.timetableSessions.map(s => s.id === session.id ? session : s)
                : [...prev.timetableSessions, session];
            return { ...prev, timetableSessions: newSessions };
        });
        setCurrentTimetableSessionId(session.id);
    };

    const handleUpdateSchoolConfig = (newConfig: Partial<SchoolConfig>) => {
        setUserData(prev => ({
            ...prev,
            schoolConfig: { ...prev.schoolConfig, ...newConfig }
        }));
    };

    const handleSetClasses = (newClasses: SchoolClass[]) => updateCurrentSession(s => ({ ...s, classes: newClasses }));
    const handleSetAdjustments = (date: string, adjustmentsForDate: Adjustment[]) => updateCurrentSession(s => ({ ...s, adjustments: { ...s.adjustments, [date]: adjustmentsForDate } }));
    const handleSetLeaveDetails = (date: string, leaveDetailsForDate: Record<string, LeaveDetails>) => {
        updateCurrentSession(s => ({
            ...s,
            leaveDetails: {
                ...(s.leaveDetails || {}),
                [date]: leaveDetailsForDate
            }
        }));
    };
    
    const handleDeleteSubject = useCallback((subjectId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, subjects: s.subjects.filter(sub => sub.id !== subjectId) }))), [t, updateCurrentSession]);
    const handleDeleteTeacher = useCallback((teacherId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, teachers: s.teachers.filter(t => t.id !== teacherId) }))), [t, updateCurrentSession]);
    const handleDeleteClass = useCallback((classId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, classes: s.classes.filter(c => c.id !== classId) }))), [t, updateCurrentSession]);
    const handleDeleteJointPeriod = useCallback((jointPeriodId: string) => openConfirmation(t.delete, t.areYouSure, () => updateCurrentSession(s => ({ ...s, jointPeriods: s.jointPeriods.filter(jp => jp.id !== jointPeriodId) }))), [t, updateCurrentSession]);
    
    const handleAddJointPeriod = (jointPeriod: JointPeriod) => updateCurrentSession(s => ({ ...s, jointPeriods: [...s.jointPeriods, jointPeriod] }));
    const handleUpdateJointPeriod = (jointPeriod: JointPeriod) => updateCurrentSession(s => ({ ...s, jointPeriods: s.jointPeriods.map(jp => jp.id === jointPeriod.id ? jointPeriod : jp) }));

    const handleSearchResultClick = (type: 'class' | 'teacher' | 'subject', id: string) => {
        switch(type) {
            case 'class':
                setClassTimetableSelection({ classId: id, highlightedTeacherId: '' });
                setCurrentPage('classTimetable');
                break;
            case 'teacher':
                setTeacherTimetableSelection({ teacherId: id });
                setCurrentPage('teacherTimetable');
                break;
            case 'subject':
                setDataEntryTab('subject');
                setCurrentPage('dataEntry');
                break;
        }
    };
    
    const renderPage = () => {
        if (!currentTimetableSession && currentPage !== 'home' && currentPage !== 'settings') {
             return <HomePage
                    t={t} language={language} setCurrentPage={setCurrentPage}
                    currentTimetableSessionId={currentTimetableSessionId}
                    timetableSessions={userData.timetableSessions}
                    setCurrentTimetableSessionId={setCurrentTimetableSessionId}
                    onCreateTimetableSession={handleCreateTimetableSession}
                    onUpdateTimetableSession={handleUpdateTimetableSession}
                    onDeleteTimetableSession={handleDeleteTimetableSession}
                    onUploadTimetableSession={handleUploadTimetableSession}
                    schoolConfig={schoolConfig}
                    onUpdateCurrentSession={updateCurrentSession}
                    onSearchResultClick={handleSearchResultClick}
                />;
        }

        switch (currentPage) {
            case 'dataEntry':
                return <DataEntryPage
                    t={t}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    classes={currentTimetableSession?.classes || []}
                    jointPeriods={currentTimetableSession?.jointPeriods || []}
                    onAddSubject={subject => updateCurrentSession(s => ({ ...s, subjects: [...s.subjects, subject] }))}
                    onUpdateSubject={updatedSubject => updateCurrentSession(s => ({ ...s, subjects: s.subjects.map(sub => sub.id === updatedSubject.id ? updatedSubject : sub) }))}
                    onDeleteSubject={handleDeleteSubject}
                    onAddTeacher={teacher => updateCurrentSession(s => ({ ...s, teachers: [...s.teachers, teacher] }))}
                    onUpdateTeacher={updatedTeacher => updateCurrentSession(s => ({ ...s, teachers: s.teachers.map(teach => teach.id === updatedTeacher.id ? updatedTeacher : teach) }))}
                    onDeleteTeacher={handleDeleteTeacher}
                    onSetClasses={handleSetClasses}
                    onDeleteClass={handleDeleteClass}
                    onAddJointPeriod={handleAddJointPeriod}
                    onUpdateJointPeriod={handleUpdateJointPeriod}
                    onDeleteJointPeriod={handleDeleteJointPeriod}
                    activeTab={dataEntryTab}
                    onTabChange={setDataEntryTab}
                />;
            case 'classTimetable':
                return <ClassTimetablePage 
                    t={t} language={language} 
                    classes={currentTimetableSession?.classes || []}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    jointPeriods={currentTimetableSession?.jointPeriods || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                    onSetClasses={handleSetClasses}
                    schoolConfig={schoolConfig}
                    selection={classTimetableSelection}
                    onSelectionChange={setClassTimetableSelection}
                    openConfirmation={openConfirmation}
                />;
            case 'teacherTimetable':
                return <TeacherTimetablePage 
                    t={t} language={language}
                    classes={currentTimetableSession?.classes || []}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    jointPeriods={currentTimetableSession?.jointPeriods || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                    onSetClasses={handleSetClasses}
                    schoolConfig={schoolConfig}
                    selectedTeacherId={teacherTimetableSelection.teacherId}
                    onSelectedTeacherChange={(id) => setTeacherTimetableSelection({ teacherId: id })}
                 />;
            case 'alternativeTimetable':
                return <AlternativeTimetablePage 
                    t={t} language={language}
                    classes={currentTimetableSession?.classes || []}
                    subjects={currentTimetableSession?.subjects || []}
                    teachers={currentTimetableSession?.teachers || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                    leaveDetails={currentTimetableSession?.leaveDetails}
                    onSetAdjustments={handleSetAdjustments}
                    onSetLeaveDetails={handleSetLeaveDetails}
                    schoolConfig={schoolConfig}
                    selection={adjustmentsSelection}
                    onSelectionChange={setAdjustmentsSelection}
                    openConfirmation={openConfirmation}
                />;
            case 'settings':
                return <SettingsPage 
                    t={t} language={language} setLanguage={setLanguage}
                    theme={theme} setTheme={setTheme}
                    schoolConfig={schoolConfig}
                    onUpdateSchoolConfig={handleUpdateSchoolConfig}
                    classes={currentTimetableSession?.classes || []}
                    teachers={currentTimetableSession?.teachers || []}
                    subjects={currentTimetableSession?.subjects || []}
                    adjustments={currentTimetableSession?.adjustments || {}}
                 />;
            case 'home':
            default:
                return <HomePage
                    t={t} language={language} setCurrentPage={setCurrentPage}
                    currentTimetableSessionId={currentTimetableSessionId}
                    timetableSessions={userData.timetableSessions}
                    setCurrentTimetableSessionId={setCurrentTimetableSessionId}
                    onCreateTimetableSession={handleCreateTimetableSession}
                    onUpdateTimetableSession={handleUpdateTimetableSession}
                    onDeleteTimetableSession={handleDeleteTimetableSession}
                    onUploadTimetableSession={handleUploadTimetableSession}
                    schoolConfig={schoolConfig}
                    onUpdateCurrentSession={updateCurrentSession}
                    onSearchResultClick={handleSearchResultClick}
                />;
        }
    };
    
    return (
        <div className="flex flex-col min-h-screen">
             <ConfirmationModal
                t={t}
                isOpen={confirmationState.isOpen}
                onClose={() => setConfirmationState(prev => ({ ...prev, isOpen: false }))}
                onConfirm={confirmationState.onConfirm}
                title={confirmationState.title}
                message={confirmationState.message}
            />
            <div className="flex-grow pb-24 md:pb-0">
                {renderPage()}
            </div>
            {currentPage !== 'home' && (
                <BottomNavBar t={t} currentPage={currentPage} setCurrentPage={setCurrentPage} />
            )}
        </div>
    );
};

export default App;