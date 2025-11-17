import React, { useState, useEffect } from 'react';
import type { TimetableSession, Subject, Teacher, SchoolClass, ClassSubject, TimetableGridData, JointPeriod } from '../types';
import { generateUniqueId } from '../types';

interface CsvManagementModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  currentTimetableSession: TimetableSession | null;
  onUpdateTimetableSession: (updater: (session: TimetableSession) => TimetableSession) => void;
}

type CsvDataType = 'subjects' | 'teachers' | 'classes' | 'classSubjects' | 'timetable' | 'jointPeriods';

interface ImportAnalysis {
  newItems: any[];
  updatedItems: { newItem: any; oldItem: any }[];
  itemsToDelete: any[];
  errors: { rowIndex: number; row: any; message: string }[];
}

const TABS: CsvDataType[] = ['subjects', 'teachers', 'classes', 'classSubjects', 'timetable', 'jointPeriods'];
const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const createEmptyTimetable = (): TimetableGridData => ({
    Monday: Array.from({ length: 8 }, () => []), Tuesday: Array.from({ length: 8 }, () => []),
    Wednesday: Array.from({ length: 8 }, () => []), Thursday: Array.from({ length: 8 }, () => []),
    Friday: Array.from({ length: 8 }, () => []),
});


const CsvManagementModal: React.FC<CsvManagementModalProps> = ({ t, isOpen, onClose, currentTimetableSession, onUpdateTimetableSession }) => {
  const [activeTab, setActiveTab] = useState<CsvDataType>('subjects');
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });
  const [parsedData, setParsedData] = useState<Record<string, string>[] | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [importAnalysis, setImportAnalysis] = useState<ImportAnalysis | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const resetUploadState = () => {
    setParsedData(null);
    setFileName('');
    setFeedback({ message: '', type: null });
    setImportAnalysis(null);
    setImportMode('replace');
    setShowErrors(false);
  };

  useEffect(() => {
    if (!isOpen) {
      resetUploadState();
    }
  }, [isOpen]);
  
  useEffect(() => {
    if (parsedData) {
        analyzeData(parsedData, activeTab);
    }
  }, [importMode, activeTab, parsedData]);

  const convertToCSV = (data: any[], headers: string[]): string => {
    const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
    const rows = data.map(row =>
      headers.map(header => {
        let value = row[header];
        if (value === null || value === undefined) {
            value = '';
        } else if (typeof value === 'object') {
            value = JSON.stringify(value);
        } else {
            value = String(value);
        }
        const escaped = value.replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(',')
    );
    return [headerRow, ...rows].join('\n');
  };

  const triggerDownload = (content: string, filename: string) => {
    const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDownloadTemplate = (type: CsvDataType) => {
    let headers: string[] = [];
    let filename = `${type}_template.csv`;

    switch (type) {
        case 'subjects': headers = ['id', 'nameEn', 'nameUr']; break;
        case 'teachers': headers = ['id', 'nameEn', 'nameUr', 'designation', 'qualification', 'contactNumber']; break;
        case 'classes': headers = ['id', 'nameEn', 'nameUr', 'inCharge', 'roomNumber', 'studentCount']; break;
        case 'classSubjects': headers = ['classId', 'subjectId', 'periodsPerWeek', 'teacherId', 'groupSetId', 'groupId']; break;
        case 'timetable': headers = ['classId', 'day', 'periodIndex', 'subjectId', 'teacherId', 'jointPeriodId']; break;
        case 'jointPeriods': headers = ['id', 'name', 'teacherId', 'periodsPerWeek', 'assignments']; break;
    }
    
    triggerDownload(headers.join(','), filename);
  };

  const handleDownloadData = (type: CsvDataType) => {
    if (!currentTimetableSession) {
      setFeedback({ message: 'No active timetable session selected.', type: 'error' });
      return;
    }

    let data: any[] = [];
    let headers: string[] = [];
    let filename = `${type}.csv`;

    switch (type) {
        case 'subjects':
            data = currentTimetableSession.subjects;
            headers = ['id', 'nameEn', 'nameUr'];
            break;
        case 'teachers':
            data = currentTimetableSession.teachers;
            headers = ['id', 'nameEn', 'nameUr', 'designation', 'qualification', 'contactNumber'];
            break;
        case 'classes':
            data = currentTimetableSession.classes.map(({ subjects, timetable, ...rest }) => rest);
            headers = ['id', 'nameEn', 'nameUr', 'inCharge', 'roomNumber', 'studentCount'];
            break;
        case 'classSubjects':
            headers = ['classId', 'subjectId', 'periodsPerWeek', 'teacherId', 'groupSetId', 'groupId'];
            currentTimetableSession.classes.forEach(c => {
                c.subjects.forEach(s => {
                    data.push({ classId: c.id, ...s });
                });
            });
            break;
        case 'timetable':
            headers = ['classId', 'day', 'periodIndex', 'subjectId', 'teacherId', 'jointPeriodId'];
            currentTimetableSession.classes.forEach(c => {
                daysOfWeek.forEach(day => {
                    c.timetable[day].forEach((slot, periodIndex) => {
                        slot.forEach(period => {
                            data.push({ classId: period.classId, day, periodIndex, subjectId: period.subjectId, teacherId: period.teacherId, jointPeriodId: period.jointPeriodId || '' });
                        });
                    });
                });
            });
            break;
        case 'jointPeriods':
            data = currentTimetableSession.jointPeriods;
            headers = ['id', 'name', 'teacherId', 'periodsPerWeek', 'assignments'];
            break;
    }

    if (data.length === 0) {
      setFeedback({ message: t.csvDownloadError.replace('{type}', type), type: 'error' });
      return;
    }

    const csvContent = convertToCSV(data, headers);
    triggerDownload(csvContent, filename);
    setFeedback({ message: t.csvDownloadSuccess.replace('{type}', type), type: 'success' });
  };
  
  const parseCSV = (csvText: string): Record<string, string>[] => {
    let text = csvText;
    if (text.charCodeAt(0) === 0xFEFF) text = text.substring(1);

    const lines = text.trim().split(/\r\n|\n|\r/).filter(line => line.trim() !== '');
    if (lines.length === 0) return [];

    const parseLine = (line: string): string[] => {
        const values: string[] = [];
        let currentVal = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
                    currentVal += '"'; i++;
                } else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal); currentVal = '';
            } else { currentVal += char; }
        }
        values.push(currentVal);
        return values;
    };
    
    const headers = parseLine(lines.shift()!).map(h => h.trim());
    return lines.map(line => {
      const values = parseLine(line);
      const rowObject: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) rowObject[header] = (values[index] || '').trim();
      });
      return rowObject;
    });
  };

    const validateRow = (row: Record<string, string>, type: CsvDataType, session: TimetableSession): { isValid: boolean; error?: string } => {
        const { subjects, teachers, classes } = session;
        const subjectIds = new Set(subjects.map(s => s.id));
        const teacherIds = new Set(teachers.map(t => t.id));
        const classIds = new Set(classes.map(c => c.id));

        switch (type) {
            case 'subjects':
            case 'teachers':
            case 'classes':
                if (!row.nameEn || !row.nameUr) return { isValid: false, error: "Missing required 'nameEn' or 'nameUr' field." };
                if (type === 'classes' && row.inCharge && !teacherIds.has(row.inCharge)) {
                    return { isValid: false, error: `Teacher with ID '${row.inCharge}' for 'inCharge' not found.` };
                }
                break;
            case 'classSubjects':
                if (!row.classId || !row.subjectId || !row.teacherId || !row.periodsPerWeek) {
                    return { isValid: false, error: "Missing required fields: classId, subjectId, teacherId, periodsPerWeek." };
                }
                if (!classIds.has(row.classId)) return { isValid: false, error: `Class with ID '${row.classId}' not found.` };
                if (!subjectIds.has(row.subjectId)) return { isValid: false, error: `Subject with ID '${row.subjectId}' not found.` };
                if (!teacherIds.has(row.teacherId)) return { isValid: false, error: `Teacher with ID '${row.teacherId}' not found.` };
                if (isNaN(parseInt(row.periodsPerWeek, 10))) return { isValid: false, error: "'periodsPerWeek' must be a number." };
                break;
            case 'timetable':
                if (!row.classId || !row.day || !row.periodIndex || !row.subjectId || !row.teacherId) {
                    return { isValid: false, error: "Missing required fields: classId, day, periodIndex, subjectId, teacherId." };
                }
                if (!classIds.has(row.classId)) return { isValid: false, error: `Class with ID '${row.classId}' not found.` };
                if (!subjectIds.has(row.subjectId)) return { isValid: false, error: `Subject with ID '${row.subjectId}' not found.` };
                if (!teacherIds.has(row.teacherId)) return { isValid: false, error: `Teacher with ID '${row.teacherId}' not found.` };
                if (!daysOfWeek.includes(row.day as any)) return { isValid: false, error: `Invalid day '${row.day}'.` };
                const pIndex = parseInt(row.periodIndex, 10);
                if (isNaN(pIndex) || pIndex < 0 || pIndex > 7) return { isValid: false, error: "'periodIndex' must be a number between 0 and 7." };
                break;
            case 'jointPeriods':
                if (!row.name || !row.teacherId || !row.periodsPerWeek || !row.assignments) {
                    return { isValid: false, error: "Missing required fields: name, teacherId, periodsPerWeek, assignments."};
                }
                try {
                    const assignments = JSON.parse(row.assignments);
                    if (!Array.isArray(assignments)) throw new Error();
                    for(const a of assignments) {
                        if (!a.classId || !a.subjectId || !classIds.has(a.classId) || !subjectIds.has(a.subjectId)) {
                             return { isValid: false, error: `Invalid assignment: ${JSON.stringify(a)}. Ensure classId and subjectId exist.`};
                        }
                    }
                } catch {
                    return { isValid: false, error: "'assignments' must be a valid JSON array string."};
                }
                break;
        }
        return { isValid: true };
    };

    const analyzeData = (rows: Record<string, string>[], type: CsvDataType) => {
        if (!currentTimetableSession) {
            setImportAnalysis(null);
            return;
        }

        const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(type);
        const analysis: ImportAnalysis = { newItems: [], updatedItems: [], itemsToDelete: [], errors: [] };

        rows.forEach((row, rowIndex) => {
            const validation = validateRow(row, type, currentTimetableSession);
            if (!validation.isValid) {
                analysis.errors.push({ rowIndex: rowIndex + 2, row, message: validation.error! }); // +2 for header and 0-indexing
            }
        });

        const validRows = rows.filter((_, rowIndex) => !analysis.errors.some(e => e.rowIndex === rowIndex + 2));

        if (isEntity) {
            const dataKey = type as 'subjects' | 'teachers' | 'classes' | 'jointPeriods';
            const existingData: any[] = currentTimetableSession[dataKey];
            const existingDataMapByName = new Map<string, any>(existingData.map(item => [item.nameEn?.toLowerCase() || item.name.toLowerCase(), item]));
            const existingDataMapById = new Map<string, any>(existingData.map(item => [item.id, item]));

            const foundItems = new Set<string>(); // store IDs of found items
            const seenInCsv = new Set<string>(); // for finding duplicates in CSV

            validRows.forEach((row, rowIndex) => {
                const uniqueKey = row.id || row.nameEn?.toLowerCase() || row.name?.toLowerCase();
                if(uniqueKey && seenInCsv.has(uniqueKey)){
                    analysis.errors.push({ rowIndex: rowIndex + 2, row, message: `Duplicate entry in CSV for ID/Name: '${uniqueKey}'.` });
                    return;
                }
                if(uniqueKey) seenInCsv.add(uniqueKey);

                let oldItem: any = null;
                if (row.id) oldItem = existingDataMapById.get(row.id);
                if (!oldItem && (row.nameEn || row.name)) oldItem = existingDataMapByName.get(row.nameEn?.toLowerCase() || row.name?.toLowerCase());

                if (oldItem) {
                    if (foundItems.has(oldItem.id)) {
                        analysis.errors.push({ rowIndex: rowIndex + 2, row, message: `Multiple CSV rows match existing item '${row.nameEn || row.name}'.` });
                        return;
                    }
                    analysis.updatedItems.push({ newItem: row, oldItem });
                    foundItems.add(oldItem.id);
                } else {
                    analysis.newItems.push(row);
                }
            });
            analysis.itemsToDelete = existingData.filter(item => !foundItems.has(item.id));
        } else {
            let existingCount = 0;
            switch (type) {
                case 'classSubjects':
                    existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + c.subjects.length, 0);
                    break;
                case 'timetable':
                    existingCount = currentTimetableSession.classes.reduce((sum, c) => sum + Object.values(c.timetable).flat(2).length, 0);
                    break;
            }
            analysis.newItems = validRows;
            if (existingCount > 0) analysis.itemsToDelete = [{ count: existingCount }];
        }
        setImportAnalysis(analysis);
    };

    const processFile = async (file: File) => {
        if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('excel')) {
            setFeedback({ message: 'Unsupported file type. Please upload a .csv file.', type: 'error' });
            return;
        }

        setFileName(file.name);
        setFeedback({ message: '', type: null });
        try {
            const csvText = await file.text();
            const rows = parseCSV(csvText);
            setParsedData(rows);
        } catch (error: any) {
            setFeedback({ message: `Parsing error: ${error.message}`, type: 'error' });
            resetUploadState();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
        if(e.target) e.target.value = '';
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); };
    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); setIsDragging(false); };
    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.stopPropagation(); };
    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };
    
    const convertRowToObject = (row: Record<string, string>, type: CsvDataType, session: TimetableSession): any => {
      const id = row.id || generateUniqueId();
      switch (type) {
        case 'subjects': return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '' };
        case 'teachers': return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '', designation: row.designation || '', qualification: row.qualification || '', contactNumber: row.contactNumber || '' };
        case 'classes':
          const existingClass = session.classes.find(c => c.id === id);
          return { id, nameEn: row.nameEn || '', nameUr: row.nameUr || '', inCharge: row.inCharge || '', roomNumber: row.roomNumber || '', studentCount: parseInt(row.studentCount || '0', 10), subjects: existingClass?.subjects || [], timetable: existingClass?.timetable || createEmptyTimetable(), groupSets: existingClass?.groupSets || [] };
        case 'jointPeriods':
            return { id, name: row.name || '', teacherId: row.teacherId || '', periodsPerWeek: parseInt(row.periodsPerWeek || '1', 10), assignments: JSON.parse(row.assignments || '[]') };
        default: return row;
      }
    };

    const handleConfirmImport = (type: CsvDataType) => {
        if (!parsedData || !currentTimetableSession || !importAnalysis || importAnalysis.errors.length > 0) {
            setFeedback({ message: 'Cannot import due to errors or missing data.', type: 'error' });
            return;
        }

        const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(type);

        try {
            onUpdateTimetableSession(session => {
                let updatedSession = JSON.parse(JSON.stringify(session));
                if (isEntity) {
                    const dataKey = type as 'subjects' | 'teachers' | 'classes' | 'jointPeriods';
                    const newDataSet = new Map<string, any>();
            
                    if (importMode === 'append') {
                        session[dataKey].forEach((item: any) => newDataSet.set(item.id, item));
                    }
            
                    importAnalysis.newItems.forEach(row => {
                        const obj = convertRowToObject(row, type, session);
                        newDataSet.set(obj.id, obj);
                    });
            
                    importAnalysis.updatedItems.forEach(({ newItem, oldItem }) => {
                        const obj = { ...oldItem, ...convertRowToObject(newItem, type, session), id: oldItem.id };
                        newDataSet.set(obj.id, obj);
                    });
            
                    updatedSession[dataKey] = Array.from(newDataSet.values());
                } else { 
                    const validRows = parsedData.filter((_, rowIndex) => !importAnalysis.errors.some(e => e.rowIndex === rowIndex + 2));

                    switch (type) {
                        case 'classSubjects':
                            const classSubjectsMap = new Map<string, ClassSubject[]>();
                            validRows.forEach(row => {
                                const { classId, subjectId, periodsPerWeek, teacherId, groupSetId, groupId } = row;
                                if (!classId || !subjectId || !periodsPerWeek || !teacherId) return;
                                if (!classSubjectsMap.has(classId)) classSubjectsMap.set(classId, []);
                                classSubjectsMap.get(classId)!.push({ subjectId, periodsPerWeek: parseInt(periodsPerWeek, 10), teacherId, groupSetId: groupSetId || undefined, groupId: groupId || undefined });
                            });
                            updatedSession.classes.forEach((c: SchoolClass) => { c.subjects = classSubjectsMap.get(c.id) || []; });
                            break;
                        case 'timetable':
                            updatedSession.classes.forEach((c: SchoolClass) => c.timetable = createEmptyTimetable());
                            const classMap = new Map<string, SchoolClass>(updatedSession.classes.map((c: SchoolClass) => [c.id, c]));
                            validRows.forEach(row => {
                                const { classId, day, periodIndex, subjectId, teacherId, jointPeriodId } = row;
                                const targetClass = classMap.get(classId);
                                const dayKey = day as keyof TimetableGridData;
                                const pIndex = parseInt(periodIndex, 10);
                                if (targetClass && dayKey && !isNaN(pIndex)) {
                                    targetClass.timetable[dayKey][pIndex].push({ id: generateUniqueId(), classId, subjectId, teacherId, jointPeriodId: jointPeriodId || undefined });
                                }
                            });
                            break;
                    }
                }
                return updatedSession;
            });

            setFeedback({ message: t.csvUploadSuccess.replace('{type}', type), type: 'success' });
            resetUploadState();
        } catch (error: any) {
            setFeedback({ message: `Import error: ${error.message}`, type: 'error' });
        }
    };
    
  if (!isOpen) return null;

  const renderDescription = (type: CsvDataType) => {
    const key = `${type}CsvDescription`;
    return <p className="text-xs text-[var(--text-secondary)]">{t[key]}</p>;
  }

  const isEntity = ['subjects', 'teachers', 'classes', 'jointPeriods'].includes(activeTab);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[101]" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] mx-4 transform flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold p-6 border-b border-[var(--border-primary)] text-[var(--text-primary)] flex-shrink-0">{t.dataImportExportCsv}</h3>

        <div className="flex-grow flex min-h-0">
          <aside className="w-1/4 border-r border-[var(--border-primary)] p-4 flex flex-col gap-2">
            {TABS.map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); resetUploadState(); }}
                className={`w-full text-left px-3 py-2 text-sm font-medium rounded-md transition-colors ${ activeTab === tab ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]'}`}>
                {t[`${tab}Csv`]}
              </button>
            ))}
          </aside>

          <main className="w-3/4 flex-grow flex flex-col p-6 overflow-y-auto">
            {!parsedData ? (
                <div onDrop={handleDrop} onDragOver={handleDragOver} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave}
                    className={`flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full transition-colors ${isDragging ? 'border-[var(--accent-primary)] bg-[var(--accent-secondary)]' : 'border-[var(--border-secondary)]'}`}>
                    <input type="file" id="csv-upload" className="hidden" accept=".csv,text/csv,application/vnd.ms-excel" onChange={handleFileSelect} />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-[var(--text-placeholder)] mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    <label htmlFor="csv-upload" className="cursor-pointer text-sm font-semibold text-[var(--text-primary)]">
                        <span className="text-[var(--accent-primary)] font-bold">{t.clickToUpload}</span> {t.or} {t.dragAndDrop}
                    </label>
                    <p className="text-sm text-[var(--text-secondary)] mt-4 mb-2">{t.csvUploadDescription}</p>
                    {renderDescription(activeTab)}
                    <div className="mt-6 w-full flex justify-around">
                        <button onClick={() => handleDownloadData(activeTab)} className="text-sm text-[var(--accent-primary)] hover:underline">{t.downloadCsv}</button>
                        <button onClick={() => handleDownloadTemplate(activeTab)} className="text-sm text-[var(--accent-primary)] hover:underline">{t.downloadTemplate}</button>
                    </div>
                    {feedback.message && feedback.type === 'error' && <div className="mt-4 p-2 w-full bg-red-100 text-red-700 text-xs rounded-md">{feedback.message}</div>}
                </div>
            ) : (
                <div className="animate-scale-in">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-lg text-[var(--text-primary)]">{t.importPreview}: <span className="font-normal text-base">{fileName}</span></h4>
                        <button onClick={resetUploadState} className="text-sm text-red-500 hover:underline">{t.cancel}</button>
                    </div>

                    {isEntity && (
                        <div className="mb-4">
                            <label className="text-sm font-medium text-[var(--text-secondary)] mr-4">{t.importMode}:</label>
                            <div className="inline-flex rounded-md shadow-sm">
                                <button onClick={() => setImportMode('replace')} className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${importMode === 'replace' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>{t.replaceAll}</button>
                                <button onClick={() => setImportMode('append')} className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${importMode === 'append' ? 'bg-[var(--accent-primary)] text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-primary)]'}`}>{t.addAndUpdate}</button>
                            </div>
                        </div>
                    )}

                    {importAnalysis && (
                        <div className="p-4 bg-[var(--bg-tertiary)] rounded-lg mb-4 text-sm space-y-1">
                            <h5 className="font-bold text-base mb-2">{t.analysis}</h5>
                            <div className="grid grid-cols-4 gap-2 text-center">
                                <div className="text-green-600"><span className="font-bold">{importAnalysis.newItems.length}</span> {t.new}</div>
                                <div className="text-blue-600"><span className="font-bold">{importAnalysis.updatedItems.length}</span> {t.updates}</div>
                                <div className="text-orange-600"><span className="font-bold">{importMode === 'replace' ? importAnalysis.itemsToDelete.length : 0}</span> {t.deletions}</div>
                                <div className={importAnalysis.errors.length > 0 ? "text-red-600" : "text-gray-500"}><span className="font-bold">{importAnalysis.errors.length}</span> {t.errors}</div>
                            </div>
                            {importAnalysis.errors.length > 0 && (
                                <div className="pt-2">
                                    <button onClick={() => setShowErrors(!showErrors)} className="text-xs text-red-500 hover:underline flex items-center gap-1">
                                        {showErrors ? t.hideErrors : t.showErrors}
                                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${showErrors ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {showErrors && <ul className="mt-2 text-xs bg-red-50 p-2 rounded-md max-h-24 overflow-y-auto">{importAnalysis.errors.map(err => <li key={err.rowIndex}><strong>Row {err.rowIndex}:</strong> {err.message}</li>)}</ul>}
                                </div>
                            )}
                        </div>
                    )}
                    
                    <div className="overflow-auto border border-[var(--border-primary)] rounded-lg max-h-80 relative">
                      <table className="w-full text-xs">
                          <thead className="bg-[var(--bg-tertiary)] sticky top-0 z-10"><tr>{parsedData[0] && Object.keys(parsedData[0]).map(h => <th key={h} className="p-2 text-left font-semibold text-[var(--text-secondary)]">{h}</th>)}</tr></thead>
                          <tbody className="divide-y divide-[var(--border-primary)]">
                            {parsedData.map((row, index) => {
                                const error = importAnalysis?.errors.find(e => e.rowIndex === index + 2);
                                const isNew = importAnalysis?.newItems.includes(row);
                                const isUpdate = importAnalysis?.updatedItems.some(u => u.newItem === row);
                                let rowClass = 'bg-[var(--bg-secondary)]'; let statusClass = ''; let textClass = 'text-[var(--text-primary)]';
                                if (error) { rowClass = 'bg-red-100'; textClass = 'text-red-900'; } 
                                else if (isNew) { statusClass = 'border-l-4 border-green-500'; } 
                                else if (isUpdate) { statusClass = 'border-l-4 border-blue-500'; }
                                const visibleKeys = parsedData[0] ? Object.keys(parsedData[0]) : [];
                                return (<tr key={index} className={`${rowClass} ${textClass}`} title={error?.message}>{visibleKeys.map((key, i) => (<td key={i} className={`p-2 whitespace-nowrap ${i === 0 ? statusClass : ''} ${key.toLowerCase().includes('ur') ? 'font-urdu' : ''}`}>{row[key]}</td>))}</tr>);
                            })}
                          </tbody>
                      </table>
                    </div>
                </div>
            )}
          </main>
        </div>
        
        <div className="flex-shrink-0 p-4 border-t border-[var(--border-primary)] flex justify-end items-center gap-4">
            {feedback.message && feedback.type === 'success' && <p className={`text-sm text-green-600`}>{feedback.message}</p>}
            {parsedData && (
                <button onClick={() => handleConfirmImport(activeTab)} disabled={!!importAnalysis && importAnalysis.errors.length > 0}
                    className="px-6 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
                    {t.confirmImport}
                </button>
            )}
             <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition">
              {t.cancel}
            </button>
        </div>
      </div>
    </div>
  );
};

export default CsvManagementModal;