import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { Language, SchoolClass, Subject, Teacher, Period, TimetableGridData, DownloadFormat, DownloadLanguage, SchoolConfig, Adjustment, JointPeriod, ClassSubject } from '../types';
import PeriodCard from './PeriodCard';
import PeriodStack from './PeriodStack';
import CopyTimetableModal from './CopyTimetableModal';
import PrintPreview from './PrintPreview'; // New component for print view
import { generateUniqueId } from '../types';
import { translations } from '../i18n';
import ClassCommunicationModal from './ClassCommunicationModal';
import DownloadModal from './DownloadModal';

interface ClassTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  jointPeriods: JointPeriod[];
  adjustments: Record<string, Adjustment[]>;
  onSetClasses: (classes: SchoolClass[]) => void;
  schoolConfig: SchoolConfig;
  selection: { classId: string | null; highlightedTeacherId: string; };
  onSelectionChange: React.Dispatch<React.SetStateAction<{ classId: string | null; highlightedTeacherId: string; }>>;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

type SlotAvailability = { status: 'available' | 'conflict'; reason?: string };
type AvailabilityGrid = Record<keyof TimetableGridData, SlotAvailability[]>;

const subjectColorNames = [
  'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
];
const days: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periodLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

// Self-contained styles for printing
const getPrintStyles = () => `
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700;900&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&family=Lateef&family=Times+New+Roman&display=swap');
    
    .print-container {
      --subject-red-bg: #fee2e2; --subject-red-text: #991b1b; --subject-red-border: #fecaca;
      --subject-sky-bg: #e0f2fe; --subject-sky-text: #0369a1; --subject-sky-border: #bae6fd;
      --subject-green-bg: #dcfce7; --subject-green-text: #166534; --subject-green-border: #bbf7d0;
      --subject-yellow-bg: #fef9c3; --subject-yellow-text: #854d0e; --subject-yellow-border: #fef08a;
      --subject-purple-bg: #f3e8ff; --subject-purple-text: #6b21a8; --subject-purple-border: #e9d5ff;
      --subject-pink-bg: #fce7f3; --subject-pink-text: #9d174d; --subject-pink-border: #fbcfe8;
      --subject-indigo-bg: #e0e7ff; --subject-indigo-text: #3730a3; --subject-indigo-border: #c7d2fe;
      --subject-teal-bg: #ccfbf1; --subject-teal-text: #134e4a; --subject-teal-border: #99f6e4;
      --subject-orange-bg: #ffedd5; --subject-orange-text: #9a3412; --subject-orange-border: #fed7aa;
      --subject-lime-bg: #ecfccb; --subject-lime-text: #4d7c0f; --subject-lime-border: #d9f99d;
      --subject-cyan-bg: #cffafe; --subject-cyan-text: #0e7490; --subject-cyan-border: #a5f3fc;
      --subject-emerald-bg: #d1fae5; --subject-emerald-text: #065f46; --subject-emerald-border: #a7f3d0;
      --subject-fuchsia-bg: #fae8ff; --subject-fuchsia-text: #86198f; --subject-fuchsia-border: #f5d0fe;
      --subject-rose-bg: #ffe4e6; --subject-rose-text: #9f1239; --subject-rose-border: #fecdd3;
      --subject-amber-bg: #fef3c7; --subject-amber-text: #92400e; --subject-amber-border: #fde68a;
      --subject-blue-bg: #dbeafe; --subject-blue-text: #1e40af; --subject-blue-border: #bfdbfe;
      --subject-default-bg: #f3f4f6; --subject-default-text: #374151; --subject-default-border: #e5e7eb;
      font-family: 'Lato', 'Almarai', sans-serif;
      color: black;
      background-color: white;
    }
    .font-urdu { font-family: 'Noto Nastaliq Urdu', serif; }
    .page-landscape { width: 1123px; height: 794px; padding: 30px; display: flex; flex-direction: column; position: relative; overflow: hidden; box-sizing: border-box; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 50%; height: 50%; object-fit: contain; opacity: 0.07; z-index: 0; }
    .content-wrapper { position: relative; z-index: 10; display: flex; flex-direction: column; height: 100%; }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 8px; border-bottom: 1px solid #ccc; padding-bottom: 8px; }
    .header-logo { height: 112px; width: 112px; object-fit: contain; }
    .school-name-container { font-family: 'Merriweather', serif; }
    .school-name { font-size: 2.8em; font-weight: 900; color: #0d9488; margin: 0; }
    .details-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 8px; font-size: 1.5em; color: black; }
    .details-grid strong { font-weight: bold; }
    .details-grid .text-center { text-align: center; }
    .details-grid .text-right { text-align: right; }
    .details-grid .text-left { text-align: left; }
    .main-content { flex-grow: 1; }
    .timetable-table { width: 100%; border-collapse: collapse; font-size: 1em; }
    .timetable-table th, .timetable-table td { border: 1px solid black; padding: 2px; vertical-align: top; }
    .timetable-table th { padding: 8px; font-weight: bold; text-transform: uppercase; }
    .day-header { font-size: 1.125em; background-color: var(--subject-teal-bg); color: var(--subject-teal-text); }
    .period-label { font-weight: 900; font-size: 2em; text-align: center; background-color: var(--subject-sky-bg); color: var(--subject-sky-text); width: 48px; }
    .slot-cell { height: 60px; }
    .slot-content { height: 100%; display: flex; flex-direction: row; gap: 2px; }
    .period-card { padding: 4px; border-radius: 2px; font-size: 1em; line-height: 1.6; flex-grow: 1; display: flex; flex-direction: column; justify-content: space-between; }
    .period-card p { margin: 0; white-space: normal; word-break: break-word; color: black; }
    .period-subject { font-weight: bold; }
    .period-context { opacity: 0.8; text-align: right; font-size: 0.85em; }
    .grouped-period-card { font-size: 0.75em; line-height: 1.3; }
    .grouped-period-card .period-context { font-size: 0.6em; }
    /* For default (vertical) layout in RTL, align text left */
    [dir="rtl"] .period-card:not(.period-card-ur) p {
        text-align: left;
    }
    
    /* For new horizontal layout for Urdu */
    [dir="rtl"] .period-card-ur {
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
    
    [dir="rtl"] .period-card-ur .period-context {
        text-align: right;
    }
    
    [dir="rtl"] .period-card-ur .period-subject {
        text-align: left;
    }
    .footer { margin-top: auto; padding-top: 16px; border-top: 2px solid #4b5563; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.875em; color: #4b5563; }
    .footer-signature { text-align: right; }
    ${subjectColorNames.map(name => `
        .${name} {
            background-color: var(--${name}-bg);
            color: var(--${name}-text);
        }
    `).join('')}
`;

const WarningIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 bg-white/80 rounded-full p-0.5 shadow-md" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
  </svg>
);

const ClearIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>;


const ClassTimetablePage: React.FC<ClassTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, selection, onSelectionChange, openConfirmation }) => {
  const { classId: selectedClassId, highlightedTeacherId } = selection;
  const [draggedPeriods, setDraggedPeriods] = useState<{ periods: Period[]; from?: { day: keyof TimetableGridData, periodIndex: number }, isFromUnscheduled: boolean } | null>(null);
  const [availabilityGrid, setAvailabilityGrid] = useState<AvailabilityGrid | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState<boolean>(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);
  const [isUnscheduledAreaHovered, setIsUnscheduledAreaHovered] = useState(false);
  const [dropConflict, setDropConflict] = useState<{ day: keyof TimetableGridData, periodIndex: number } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);

  const handleTimetableChange = useCallback((newClasses: SchoolClass[]) => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    onSetClasses(newClasses);

    saveTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('saved');
        setLastSaveTime(new Date());
        saveTimeoutRef.current = null;
    }, 1000);
  }, [onSetClasses]);

  useEffect(() => {
    return () => {
        if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
        }
    };
  }, []);
  
  useEffect(() => {
    if (!selectedClassId && classes && classes.length > 0) {
      onSelectionChange(prev => ({ ...prev, classId: classes[0].id }));
    }
    else if (selectedClassId && classes && !classes.some(c => c.id === selectedClassId)) {
      onSelectionChange(prev => ({ ...prev, classId: classes.length > 0 ? classes[0].id : null }));
    }
  }, [selectedClassId, classes, onSelectionChange]);

  const selectedClass = useMemo(() => classes.find(c => c.id === selectedClassId), [classes, selectedClassId]);
  const inChargeTeacher = useMemo(() => selectedClass ? teachers.find(t => t.id === selectedClass.inCharge) : null, [selectedClass, teachers]);

  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject, index) => {
      map.set(subject.id, subjectColorNames[index % subjectColorNames.length]);
    });
    return map;
  }, [subjects]);

  const teacherBookings = useMemo(() => {
    const bookings = new Map<string, { classId: string, jointPeriodId?: string }[]>(); // key: `${teacherId}-${day}-${periodIndex}`
    classes.forEach(c => {
        days.forEach(day => {
            if (c.timetable && Array.isArray(c.timetable[day])) {
                c.timetable[day].forEach((slot, periodIndex) => {
                    if (Array.isArray(slot)) {
                        slot.forEach(period => {
                            const key = `${period.teacherId}-${day}-${periodIndex}`;
                            const currentBookings = bookings.get(key) || [];
                            if (!currentBookings.some(b => b.classId === c.id)) {
                                bookings.set(key, [...currentBookings, { classId: c.id, jointPeriodId: period.jointPeriodId }]);
                            }
                        });
                    }
                });
            }
        });
    });
    return bookings;
  }, [classes]);

  const getSlotConflicts = useCallback((day: keyof TimetableGridData, periodIndex: number): string[] => {
    const conflicts = new Set<string>();
    if (!selectedClass || !selectedClass.timetable?.[day]?.[periodIndex]) return [];

    const slotPeriods = selectedClass.timetable[day][periodIndex];
    if (slotPeriods.length === 0) return [];

    slotPeriods.forEach(period => {
        const teacherId = period.teacherId;
        const bookings = teacherBookings.get(`${teacherId}-${day}-${periodIndex}`) || [];
        if (bookings.length > 1) {
             const hasConflict = bookings.some(b => b.jointPeriodId !== period.jointPeriodId);
             if (hasConflict) {
                conflicts.add(teacherId);
             }
        }
    });
    
    return Array.from(conflicts);
  }, [selectedClass, teacherBookings]);

  const { unscheduledPeriodGroups, totalUnscheduled } = useMemo(() => {
    if (!selectedClass) return { unscheduledPeriodGroups: [], totalUnscheduled: 0 };
  
    const scheduledCounts = new Map<string, number>(); // key: subjectId or jointPeriodId
  
    const scheduledPeriods = days.flatMap(day => selectedClass.timetable[day]).flat();
    scheduledPeriods.forEach(p => {
        const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : p.subjectId;
        scheduledCounts.set(key, (scheduledCounts.get(key) || 0) + 1);
    });
    
    const unplacedPeriodGroups: Period[][] = [];
  
    // Regular subjects for the current class
    selectedClass.subjects.forEach(cs => {
      const isJoint = jointPeriods.some(jp => jp.assignments.some(a => a.classId === selectedClass.id && a.subjectId === cs.subjectId));
      if (isJoint) return;
  
      const scheduled = scheduledCounts.get(cs.subjectId) || 0;
      const needed = cs.periodsPerWeek - scheduled;
      if (needed > 0) {
        const group = [];
        for (let i = 0; i < needed; i++) {
          group.push({
            id: `unscheduled-${selectedClass.id}-${cs.subjectId}-${i}`, classId: selectedClass.id,
            subjectId: cs.subjectId, teacherId: cs.teacherId
          });
        }
        unplacedPeriodGroups.push(group);
      }
    });

    // Joint periods involving the current class
    jointPeriods.forEach(jp => {
        const assignmentForThisClass = jp.assignments.find(a => a.classId === selectedClass.id);
        if (!assignmentForThisClass) return;

        const scheduled = scheduledCounts.get(`jp-${jp.id}`) || 0;
        const needed = jp.periodsPerWeek - scheduled;
        if (needed > 0) {
            const group = [];
            for (let i = 0; i < needed; i++) {
                // For a joint period stack, all constituent periods for that joint period are included in the drag data.
                jp.assignments.forEach(a => {
                    group.push({
                        id: `unscheduled-jp-${jp.id}-${a.classId}-${i}`,
                        classId: a.classId, subjectId: a.subjectId,
                        teacherId: jp.teacherId, jointPeriodId: jp.id
                    });
                });
            }
            unplacedPeriodGroups.push(group);
        }
    });
  
    const groupedForDisplay = unplacedPeriodGroups.flat().reduce((acc, period) => {
        const key = period.jointPeriodId 
            ? `jp-${period.jointPeriodId}`
            : `${period.classId}-${period.subjectId}`;
        
        if (key.startsWith('jp-') || period.classId === selectedClass.id) {
            if (!acc[key]) acc[key] = [];
            acc[key].push(period);
        }
        return acc;
    }, {} as Record<string, Period[]>);
  
    return {
      unscheduledPeriodGroups: Object.values(groupedForDisplay),
      totalUnscheduled: Object.values(groupedForDisplay).reduce((sum, group) => sum + group.length / (group[0].jointPeriodId ? jointPeriods.find(jp=>jp.id === group[0].jointPeriodId)?.assignments.length || 1 : 1), 0),
    };
  }, [selectedClass, jointPeriods]);
  
  const handleClearTimetable = () => {
    if (!selectedClass) return;
    openConfirmation(t.clearTimetable, t.clearTimetableConfirm, () => {
        const clearedTimetable: TimetableGridData = {
            Monday: Array(8).fill([]), Tuesday: Array(8).fill([]), Wednesday: Array(8).fill([]),
            Thursday: Array(8).fill([]), Friday: Array(8).fill([]),
        };
        const updatedClasses = classes.map(c => c.id === selectedClass.id ? { ...selectedClass, timetable: clearedTimetable } : c);
        handleTimetableChange(updatedClasses);
    });
  };

  const handleDragStart = useCallback((periods: Period[], from?: { day: keyof TimetableGridData; periodIndex: number }, isFromUnscheduled: boolean = false) => {
    setDraggedPeriods({ periods, from, isFromUnscheduled });
    if (!selectedClass) return;

    const newAvailabilityGrid: AvailabilityGrid = { Monday: [], Tuesday: [], Wednesday: [], Thursday: [], Friday: [] };
    const draggedPeriod = periods[0];
    const draggedJointPeriodId = draggedPeriod.jointPeriodId;

    days.forEach(day => {
      for (let i = 0; i < periodLabels.length; i++) {
        if (day === 'Friday' && i >= 6 && i < 8) {
          newAvailabilityGrid[day][i] = { status: 'conflict', reason: 'Disabled slot' };
          continue;
        }

        const isSelf = from?.day === day && from?.periodIndex === i;
        
        // 1. Check for teacher conflicts
        const bookingsInSlot = teacherBookings.get(`${draggedPeriod.teacherId}-${day}-${i}`) || [];
        const conflictingBooking = bookingsInSlot.find(b => {
            if (isSelf) return false;
            if (draggedJointPeriodId) return b.jointPeriodId !== draggedJointPeriodId;
            return true; // Any booking is a conflict for a non-joint period
        });

        if (conflictingBooking) {
            const conflictClass = classes.find(c => c.id === conflictingBooking.classId);
            newAvailabilityGrid[day][i] = { status: 'conflict', reason: `${t.teacherConflictWarning} (in ${conflictClass?.nameEn})` };
            continue;
        }

        // 2. Check for slot combination validity within the current class
        const targetSlot = selectedClass.timetable[day][i] || [];
        const periodsToInsert = periods.filter(p => p.classId === selectedClass.id);
        const existingPeriodsInSlot = isSelf ? [] : targetSlot;
        
        const combinedSubjectConfigs: (ClassSubject | undefined)[] = [
            ...existingPeriodsInSlot.map(p => selectedClass.subjects.find(cs => cs.subjectId === p.subjectId)),
            ...periodsToInsert.map(p => selectedClass.subjects.find(cs => cs.subjectId === p.subjectId))
        ].filter(cs => cs);
        
        const isStandardSubjectPresent = combinedSubjectConfigs.some(cs => cs && !cs.groupSetId);
        const isGroupedSubjectPresent = combinedSubjectConfigs.some(cs => cs && !!cs.groupSetId);
        const totalStandardSubjects = combinedSubjectConfigs.filter(cs => cs && !cs.groupSetId).length;

        let hasCombinationError = false;
        if (totalStandardSubjects > 1 || (isStandardSubjectPresent && isGroupedSubjectPresent)) {
          hasCombinationError = true;
        } else if (isGroupedSubjectPresent) {
          const groupsInSlot = new Map<string, Set<string>>(); // key: groupSetId, value: Set<groupId>
          for (const subjectConfig of combinedSubjectConfigs) {
            if (subjectConfig?.groupSetId && subjectConfig.groupId) {
              if (!groupsInSlot.has(subjectConfig.groupSetId)) groupsInSlot.set(subjectConfig.groupSetId, new Set());
              const groupSet = groupsInSlot.get(subjectConfig.groupSetId)!;
              if (groupSet.has(subjectConfig.groupId)) {
                hasCombinationError = true;
                break;
              }
              groupSet.add(subjectConfig.groupId);
            }
          }
        }
        
        if (hasCombinationError) {
          newAvailabilityGrid[day][i] = { status: 'conflict', reason: totalStandardSubjects > 1 ? t.slotCapacityError : t.slotCombinationError };
          continue;
        }
        
        newAvailabilityGrid[day][i] = { status: 'available' };
      }
    });
    setAvailabilityGrid(newAvailabilityGrid);
  }, [selectedClass, classes, teacherBookings, jointPeriods, t]);

  const handleDragEnd = () => {
    setDraggedPeriods(null);
    setAvailabilityGrid(null);
    setIsUnscheduledAreaHovered(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };
  
  const handleDropOperation = (day: keyof TimetableGridData | null, periodIndex: number | null) => {
    if (!draggedPeriods) { handleDragEnd(); return; }
  
    const { from, periods } = draggedPeriods;
    const jointPeriodId = periods[0].jointPeriodId;
    let tempClasses = JSON.parse(JSON.stringify(classes));
  
    // 1. Remove from 'from' location
    if (from) {
      const classIdsToClear = jointPeriodId
        ? jointPeriods.find(jp => jp.id === jointPeriodId)?.assignments.map(a => a.classId) || []
        : [...new Set(periods.map(p => p.classId))];
  
      tempClasses = tempClasses.map((c: SchoolClass) => {
        if (classIdsToClear.includes(c.id)) {
          const periodsInSlot = c.timetable[from.day][from.periodIndex];
          const draggedIds = new Set(periods.map(p => p.id));
          const newSlot = jointPeriodId
            ? periodsInSlot.filter(p => p.jointPeriodId !== jointPeriodId)
            : periodsInSlot.filter(p => !draggedIds.has(p.id));
          c.timetable[from.day][from.periodIndex] = newSlot;
        }
        return c;
      });
    }
  
    // 2. Add to 'to' location (if dropping on the grid)
    if (day !== null && periodIndex !== null) {
      if (jointPeriodId) {
        const jointPeriod = jointPeriods.find(jp => jp.id === jointPeriodId);
        if (jointPeriod) {
          jointPeriod.assignments.forEach(assignment => {
            const targetClass = tempClasses.find((c: SchoolClass) => c.id === assignment.classId);
            if (targetClass) {
              const newPeriod: Period = {
                id: generateUniqueId(), classId: assignment.classId,
                subjectId: assignment.subjectId, teacherId: jointPeriod.teacherId,
                jointPeriodId: jointPeriodId,
              };
              // Joint periods occupy the slot exclusively for all involved classes
              targetClass.timetable[day][periodIndex] = [newPeriod];
            }
          });
        }
      } else { // Standard/grouped period drop
        const targetClass = tempClasses.find((c: SchoolClass) => c.id === periods[0].classId);
        if (targetClass) {
          const newPeriods = periods.map(p => ({ ...p, id: generateUniqueId() }));
          const isStandard = !targetClass.subjects.find(s => s.subjectId === newPeriods[0].subjectId)?.groupSetId;
  
          if (isStandard) {
            targetClass.timetable[day][periodIndex] = newPeriods;
          } else {
            targetClass.timetable[day][periodIndex].push(...newPeriods);
          }
        }
      }
    }
  
    handleTimetableChange(tempClasses);
    handleDragEnd();
  };

  const handleDropToUnscheduled = () => {
    if (draggedPeriods?.from) {
      handleDropOperation(null, null);
    }
    handleDragEnd();
  };

  const handleDrop = (day: keyof TimetableGridData, periodIndex: number) => {
    if (!draggedPeriods || !selectedClass) { handleDragEnd(); return; }

    if (availabilityGrid && availabilityGrid[day][periodIndex].status === 'conflict') {
      setDropConflict({ day, periodIndex });
      setTimeout(() => setDropConflict(null), 500);
      handleDragEnd();
      return;
    }
    handleDropOperation(day, periodIndex);
  };
  
  const handleDeletePeriod = (periodToDelete: Period, day: keyof TimetableGridData, periodIndex: number) => {
    const { jointPeriodId } = periodToDelete;
    let classIdsToUpdate: string[] = [];

    if (jointPeriodId) {
        const jointPeriod = jointPeriods.find(jp => jp.id === jointPeriodId);
        if (jointPeriod) {
            classIdsToUpdate = jointPeriod.assignments.map(a => a.classId);
        }
    } else {
        classIdsToUpdate = [periodToDelete.classId];
    }
    
    const newClasses = classes.map(c => {
        if (classIdsToUpdate.includes(c.id)) {
            const newTimetable = { ...c.timetable };
            const oldSlot = newTimetable[day][periodIndex];
            const newSlot = jointPeriodId
                ? oldSlot.filter(p => p.jointPeriodId !== jointPeriodId)
                : oldSlot.filter(p => p.id !== periodToDelete.id);
            newTimetable[day][periodIndex] = newSlot;
            return { ...c, timetable: newTimetable };
        }
        return c;
    });
    
    handleTimetableChange(newClasses);
  };

  const generateClassTimetableHtml = useCallback((schoolClass: SchoolClass, lang: DownloadLanguage, fontSize: number): string => {
    const { en: enT, ur: urT } = translations;
    const inCharge = teachers.find(t => t.id === schoolClass.inCharge);

    const renderText = (en: string, ur: string) => {
        if (lang === 'en') return en;
        if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
        return `${en} / <span class="font-urdu">${ur}</span>`;
    };

    const detailsGridContent = lang === 'ur' ? `
        <div class="text-right"><strong>${urT.class}:</strong> ${renderText(schoolClass.nameEn, schoolClass.nameUr)}</div>
        <div class="text-center"><strong>${urT.classInCharge}:</strong> ${inCharge ? renderText(inCharge.nameEn, inCharge.nameUr) : ''}</div>
        <div class="text-left"><strong>${urT.roomNumber}:</strong> ${schoolClass.roomNumber}</div>
    ` : `
        <div class="text-left"><strong>${enT.class}:</strong> ${renderText(schoolClass.nameEn, schoolClass.nameUr)}</div>
        <div class="text-center"><strong>${enT.classInCharge}:</strong> ${inCharge ? renderText(inCharge.nameEn, inCharge.nameUr) : ''}</div>
        <div class="text-right"><strong>${enT.roomNumber}:</strong> ${schoolClass.roomNumber}</div>
    `;

    const tableRows = periodLabels.map((label, periodIndex) => {
        const cells = days.map(day => {
            const periods = schoolClass.timetable[day]?.[periodIndex] || [];
            const cellContent = periods.map(period => {
                const subject = subjects.find(s => s.id === period.subjectId);
                const teacher = teachers.find(t => t.id === period.teacherId);
                const colorName = subjectColorMap.get(period.subjectId) || 'subject-default';
                if (!subject || !teacher) return '';
                
                const subjectHtml = `<p class="period-subject">${renderText(subject.nameEn, subject.nameUr)}</p>`;
                const teacherHtml = `<p class="period-context">${renderText(teacher.nameEn, teacher.nameUr)}</p>`;
                const isGrouped = periods.length > 1;
                const cardClasses = `period-card ${colorName} ${isGrouped ? 'grouped-period-card' : ''}`;
                
                if (lang === 'ur') {
                    return `<div class="${cardClasses} period-card-ur">${teacherHtml}${subjectHtml}</div>`;
                }
                return `<div class="${cardClasses}">${subjectHtml}${teacherHtml}</div>`;
            }).join('');
            return `<td class="slot-cell"><div class="slot-content">${cellContent}</div></td>`;
        }).join('');
        return `<tr><td class="period-label">${label}</td>${cells}</tr>`;
    }).join('');

    const formattedDate = new Date().toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
        ...(lang === 'ur' && { numberingSystem: 'arab' })
    });
    const dateHtml = lang === 'ur' ? `<span class="font-urdu">${formattedDate}</span>` : formattedDate;

    const schoolNameHtml = lang === 'ur'
        ? `<h1 class="school-name font-urdu" style="text-align: right;">${schoolConfig.schoolNameUr}</h1>`
        : `<h1 class="school-name" style="text-align: left;">${schoolConfig.schoolNameEn}</h1>`;

    const dayHeaders = days.map(day => {
        const dayKey = day.toLowerCase() as keyof typeof enT;
        if (lang === 'en') return enT[dayKey];
        if (lang === 'ur') return urT[dayKey];
        return `${enT[dayKey]} / ${urT[dayKey]}`;
    });

    return `<div class="print-container" style="font-size: ${fontSize}%"><style>${getPrintStyles()}</style><div class="page-landscape" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Watermark" class="watermark" />` : ''}<div class="content-wrapper"><header class="header">${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="School Logo" class="header-logo" />` : ''}<div class="school-name-container" style="flex-grow: 1;">${schoolNameHtml}</div></header><div class="details-grid">${detailsGridContent}</div><main class="main-content"><table class="timetable-table"><thead><tr><th class="period-label"></th>${dayHeaders.map(dayHeader => `<th class="day-header">${dayHeader}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></main><footer class="footer"><div><strong>Mr. 🇵🇰</strong></div><div>${lang === 'both' ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : dateHtml}</div></footer></div></div></div>`;
  }, [schoolConfig, teachers, subjects, subjectColorMap]);

  const generateClassSummaryHtml = useCallback((selectedClasses: SchoolClass[], lang: DownloadLanguage, fontSize: number): string[] => {
    const customStyles = `
        .summary-table { font-size: 0.5em; width: 100%; border-collapse: collapse; }
        .summary-table th, .summary-table td { padding: 2px; text-align: center; vertical-align: middle; border: 1px solid #ccc; color: black; }
        .summary-table thead { position: sticky; top: 0; background-color: white; }
        .summary-table th { font-size: 0.875em; font-weight: bold; background-color: #f3f4f6; }
        .class-name-cell { font-weight: bold; font-size: 1.125em; text-align: left !important; padding-left: 5px !important; white-space: nowrap; }
        .period-content { font-size: 0.875em; white-space: normal; word-break: break-word; line-height: 1.2; }
    `;

    const { en: enT, ur: urT } = translations;

    const renderText = (en: string, ur: string) => {
        if (lang === 'en') return en;
        if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
        return `${en} / <span class="font-urdu">${ur}</span>`;
    };
    const renderHeaderText = (en: string, ur: string) => {
        if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
        if (lang === 'en') return en;
        return `${en} / ${ur}`;
    };

    const classesPerPage = Math.max(1, Math.floor(18 / (fontSize / 100)));
    const pagesHtml: string[] = [];
    const numPages = Math.ceil(selectedClasses.length / classesPerPage);

    for (let i = 0; i < numPages; i++) {
        const pageClasses = selectedClasses.slice(i * classesPerPage, (i + 1) * classesPerPage);

        const tableHeaderRow1 = `
            <tr>
                <th rowspan="2" style="width: 12%;">${renderHeaderText(enT.class, urT.class)}</th>
                ${days.map(day => `<th colspan="8">${renderHeaderText(enT[day.toLowerCase() as keyof typeof enT], urT[day.toLowerCase() as keyof typeof urT])}</th>`).join('')}
            </tr>
        `;
        const tableHeaderRow2 = `
            <tr>
                ${days.map(() => periodLabels.map(p => `<th>${p}</th>`).join('')).join('')}
            </tr>
        `;

        const tableBodyRows = pageClasses.map(schoolClass => {
            const periodCells = days.flatMap(day => {
                return periodLabels.map((_, periodIndex) => {
                    const periods = schoolClass.timetable[day]?.[periodIndex] || [];
                    const cellContent = periods.map(p => {
                        const subject = subjects.find(s => s.id === p.subjectId);
                        const teacher = teachers.find(t => t.id === p.teacherId);
                        if (!subject || !teacher) return '';
                        return `<div class="period-content">${renderText(subject.nameEn, subject.nameUr)}<br><small>(${renderText(teacher.nameEn, teacher.nameUr)})</small></div>`;
                    }).join('');
                    return `<td>${cellContent}</td>`;
                });
            }).join('');
            return `<tr><td class="class-name-cell">${renderText(schoolClass.nameEn, schoolClass.nameUr)}</td>${periodCells}</tr>`;
        }).join('');
        
        const schoolNameHtml = lang === 'ur'
            ? `<h1 class="school-name font-urdu" style="font-size: 2em; text-align: right;">${schoolConfig.schoolNameUr}</h1>`
            : `<h1 class="school-name" style="font-size: 2em; text-align: left;">${schoolConfig.schoolNameEn}</h1>`;

        const pageHtml = `
            <div class="print-container" style="font-size: ${fontSize}%">
                <style>${getPrintStyles()}${customStyles}</style>
                <div class="page-landscape" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
                    <div class="content-wrapper">
                        <header class="header">${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="School Logo" class="header-logo" style="height: 60px; width: 60px;" />` : ''}<div class="school-name-container" style="flex-grow: 1;">${schoolNameHtml}</div></header>
                        <main class="main-content" style="margin-top: 1rem;">
                            <table class="summary-table">
                                <thead>${tableHeaderRow1}${tableHeaderRow2}</thead>
                                <tbody>${tableBodyRows}</tbody>
                            </table>
                        </main>
                        <footer class="footer">
                            <div><strong>Mr. 🇵🇰</strong></div>
                            <div>Page ${i + 1} of ${numPages}</div>
                        </footer>
                    </div>
                </div>
            </div>
        `;
        pagesHtml.push(pageHtml);
    }

    return pagesHtml;

  }, [schoolConfig, subjects, teachers]);

  const generateClassTimetableExcel = useCallback((selectedItems: SchoolClass[], lang: DownloadLanguage) => {
    const { en: enT, ur: urT } = translations;
    const currentT = lang === 'ur' ? urT : enT;

    const convertToCSV = (data: any[], headers: string[]): string => {
        const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
        const rows = data.map(row =>
            headers.map(header => {
                const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
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

    let csvContent = '';
    selectedItems.forEach(schoolClass => {
        if (lang === 'both') {
            csvContent += `"${enT.class}: ${schoolClass.nameEn} / ${urT.class}: ${schoolClass.nameUr}"\n`;
        } else {
            csvContent += `"${currentT.class}: ${lang === 'ur' ? schoolClass.nameUr : schoolClass.nameEn}"\n`;
        }

        const headers = [currentT.period, ...days.map(d => currentT[d.toLowerCase() as keyof typeof currentT])];
        const rows = periodLabels.map((label, periodIndex) => {
            const row: Record<string, string> = { [currentT.period]: label };
            days.forEach(day => {
                const periods = schoolClass.timetable[day]?.[periodIndex] || [];
                row[currentT[day.toLowerCase() as keyof typeof currentT]] = periods.map(p => {
                    const subject = subjects.find(s => s.id === p.subjectId);
                    const teacher = teachers.find(t => t.id === p.teacherId);
                    if (!subject || !teacher) return '';
                    if (lang === 'en') return `${subject.nameEn} (${teacher.nameEn})`;
                    if (lang === 'ur') return `${subject.nameUr} (${teacher.nameUr})`;
                    return `${subject.nameEn} (${teacher.nameEn})\n${subject.nameUr} (${teacher.nameUr})`;
                }).join('\n');
            });
            return row;
        });
        csvContent += convertToCSV(rows, headers) + '\n\n';
    });
    triggerDownload(csvContent, 'class_timetables.csv');
  }, [subjects, teachers]);
  
  const AutoSaveIndicator = () => {
    let content;
    if (saveStatus === 'saving') {
        content = (
            <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Saving...</span>
            </>
        );
    } else if (saveStatus === 'saved') {
        content = (
            <>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span>
                    {lastSaveTime
                        ? `Last saved: ${lastSaveTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'All changes saved'
                    }
                </span>
            </>
        );
    }

    return (
        <div className={`flex items-center gap-2 text-xs transition-opacity duration-300 ${saveStatus === 'saving' ? 'text-blue-600' : 'text-[var(--text-secondary)]'}`}>
            {content}
        </div>
    );
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <CopyTimetableModal t={t} isOpen={isCopyModalOpen} onClose={() => setIsCopyModalOpen(false)} classes={classes} subjects={subjects} teachers={teachers} sourceClassId={selectedClassId || ''} onUpdateClass={(updatedClass) => { handleTimetableChange(classes.map(c => c.id === updatedClass.id ? updatedClass : c)); }} />
      {selectedClass && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.classTimetable}: ${selectedClass.nameEn}`} fileNameBase={`Timetable_${selectedClass.nameEn.replace(' ', '_')}`} generateHtml={(lang, fontSize) => generateClassTimetableHtml(selectedClass, lang, fontSize)} onGenerateExcel={(lang, fontSize) => generateClassTimetableExcel([selectedClass], lang)} /> )}
      {selectedClass && inChargeTeacher && (<ClassCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedClass={selectedClass} inChargeTeacher={inChargeTeacher} subjects={subjects} teachers={teachers} /> )}
       <DownloadModal t={t} isOpen={isDownloadModalOpen} onClose={() => setIsDownloadModalOpen(false)} title={t.downloadTimetable} fileNameBase="Class_Timetables" items={classes} itemType="class" 
// FIX: Wrap the HTML generator functions in arrow functions to provide a default font size, resolving the TypeScript signature mismatch error.
generateFullPageHtml={(item, lang) => generateClassTimetableHtml(item, lang, 100)} generateSummaryPageHtml={(items, lang) => generateClassSummaryHtml(items, lang, 100)} generateExcel={generateClassTimetableExcel} summaryButtonLabel={t.weeklySummary} />
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap md:col-span-1">
          <label htmlFor="class-select" className="block text-sm font-medium text-[var(--text-secondary)]">{t.selectAClass}</label>
          <select id="class-select" value={selectedClassId || ''} onChange={(e) => onSelectionChange(prev => ({ ...prev, classId: e.target.value, highlightedTeacherId: '' }))}
            className="block w-full md:w-auto pl-3 pr-10 py-2 text-base bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-secondary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm rounded-md shadow-sm">
            {classes.map(c => <option key={c.id} value={c.id}>{c.nameEn} / {c.nameUr}</option>)}
          </select>
          {selectedClass && (<div className="flex items-center gap-2"><label htmlFor="teacher-highlight" className="text-sm font-medium text-[var(--text-secondary)]">{t.highlightTeacher}</label><select id="teacher-highlight" value={highlightedTeacherId} onChange={e => onSelectionChange(prev => ({...prev, highlightedTeacherId: e.target.value}))} className="block w-full md:w-auto pl-3 pr-8 py-1.5 text-sm bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-secondary)] rounded-md shadow-sm"><option value="">None</option>{teachers.map(t => <option key={t.id} value={t.id}>{t.nameEn}</option>)}</select></div>)}
        </div>
        <div className="flex justify-center items-center md:col-span-1">
          <AutoSaveIndicator />
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-start md:justify-end md:col-span-1">
          <button onClick={() => setIsDownloadModalOpen(true)} disabled={classes.length === 0} title={t.download} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
          <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedClass || !inChargeTeacher} title={t.sendToInCharge} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
          <button onClick={() => setIsCopyModalOpen(true)} disabled={!selectedClass} title={t.copyTimetable} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M7 9a2 2 0 012-2h6a2 2 0 012 2v6a2 2 0 01-2 2H9a2 2 0 01-2-2V9z" /><path d="M5 3a2 2 0 00-2 2v6a2 2 0 002 2V5h8a2 2 0 00-2-2H5z" /></svg></button>
          <button onClick={() => setIsPrintPreviewOpen(true)} disabled={!selectedClass} title={t.printViewAction} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
        </div>
      </div>

      {!selectedClass ? (<p className="text-center text-[var(--text-secondary)] py-10">{t.selectAClass}</p>) : (<>
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/4"><div className="sticky top-24 space-y-6">
                <div className={`p-4 rounded-lg shadow-md border transition-all ${isUnscheduledAreaHovered ? 'unscheduled-drop-target' : 'bg-[var(--bg-secondary)] border-[var(--border-primary)]'}`} onDrop={handleDropToUnscheduled} onDragEnter={() => draggedPeriods?.from && setIsUnscheduledAreaHovered(true)} onDragLeave={() => setIsUnscheduledAreaHovered(false)} onDragOver={handleDragOver}>
                    <div className="flex justify-between items-center mb-3 border-b border-[var(--border-primary)] pb-2"><h3 className="text-lg font-bold text-[var(--text-primary)]">{t.unscheduledPeriods} ({totalUnscheduled})</h3><button onClick={handleClearTimetable} title={t.clearTimetable} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><ClearIcon /></button></div>
                    <p className="text-xs text-[var(--text-secondary)] mb-4">{t.dragAndDropInstruction}</p>
                    <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2">
                        {unscheduledPeriodGroups.map((group, index) => {
                          const jointPeriod = group[0].jointPeriodId ? jointPeriods.find(jp => jp.id === group[0].jointPeriodId) : undefined;
                          return <PeriodStack key={`${group[0].subjectId}-${group[0].classId}-${index}`} periods={group} onDragStart={(p) => handleDragStart(p, undefined, true)} onDragEnd={handleDragEnd} colorName={subjectColorMap.get(group[0].subjectId)} language={language} subjects={subjects} teachers={teachers} classes={classes} displayContext={jointPeriod ? 'jointPeriod' : 'class'} jointPeriodName={jointPeriod?.name} isDimmed={!!highlightedTeacherId && !group.some(p => p.teacherId === highlightedTeacherId)} />
                        })}
                    </div>
                </div>
            </div></div>
            <div className="lg:w-3/4 overflow-x-auto"><div className="bg-[var(--bg-secondary)] shadow-lg rounded-lg overflow-hidden border border-[var(--border-primary)]">
                <table className="w-full text-center border-collapse table-fixed">
                    <thead><tr className="bg-[var(--accent-primary)] text-[var(--accent-text)]"><th className="border border-[var(--border-secondary)] p-2 w-12"></th>{days.map(day => <th key={day} className="border border-[var(--border-secondary)] p-2 font-bold uppercase text-sm">{t[day.toLowerCase()]}</th>)}</tr></thead>
                    <tbody>{periodLabels.map((label, periodIndex) => (<tr key={label}><td className="border border-[var(--border-secondary)] font-black text-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)]">{label}</td>{days.map(day => {
                        const slotPeriods = selectedClass.timetable[day]?.[periodIndex] || [];
                        const isDisabled = day === 'Friday' && periodIndex >= 6 && periodIndex < 8;
                        const slotStatus = availabilityGrid ? availabilityGrid[day][periodIndex] : null;
                        const dropTargetClass = slotStatus ? `drop-target-${slotStatus.status}` : '';
                        const flashClass = dropConflict?.day === day && dropConflict?.periodIndex === periodIndex ? 'drop-conflict-flash' : '';
                        const conflictingTeacherIds = getSlotConflicts(day, periodIndex);
                        return (<td key={day} onDragOver={isDisabled ? undefined : handleDragOver} onDrop={isDisabled ? undefined : () => handleDrop(day, periodIndex)} className={`border border-[var(--border-secondary)] h-28 p-0.5 align-top transition-colors duration-200 ${isDisabled ? 'bg-[var(--slot-disabled-bg)]' : ''} ${dropTargetClass} ${flashClass}`}>
                            <div className="relative h-full flex flex-col items-stretch justify-start gap-0.5">
                                {slotStatus?.status === 'conflict' && slotStatus.reason && (<div className="absolute top-1 right-1 z-20" title={slotStatus.reason}><WarningIcon /></div>)}
                                <div className={`h-full flex ${slotPeriods.length > 1 ? 'flex-row' : 'flex-col'} gap-0.5`}>
                                    {slotPeriods.map(period => {
                                        const allPeriodsForDrag = period.jointPeriodId ? classes.flatMap(c => c.timetable[day]?.[periodIndex]?.filter(p => p.jointPeriodId === period.jointPeriodId) || []) : [period];
                                        return (<PeriodCard key={period.id} period={period} onDragStart={() => handleDragStart(allPeriodsForDrag, { day, periodIndex }, false)} onDragEnd={handleDragEnd} onDeletePeriod={() => handleDeletePeriod(period, day, periodIndex)} colorName={subjectColorMap.get(period.subjectId)} language={language} subjects={subjects} teachers={teachers} classes={classes} displayContext="teacher" isHighlighted={highlightedTeacherId === period.teacherId} isDimmed={!!highlightedTeacherId && highlightedTeacherId !== period.teacherId} hasConflict={conflictingTeacherIds.includes(period.teacherId)} />)
                                    })}
                                </div>
                            </div>
                        </td>);
                    })}</tr>))}</tbody>
                </table>
            </div></div>
        </div>
      </>)}
    </div>
  );
};
export default ClassTimetablePage;