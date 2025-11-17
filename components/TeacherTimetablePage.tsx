import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Language, SchoolClass, Subject, Teacher, Period, TimetableGridData, DownloadLanguage, SchoolConfig, Adjustment, JointPeriod, ClassSubject } from '../types';
import PeriodCard from './PeriodCard';
import PeriodStack from './PeriodStack';
import TeacherAvailabilitySummary, { WorkloadStats } from './TeacherAvailabilitySummary';
import { generateUniqueId } from '../types';
import PrintPreview from './PrintPreview';
import { translations } from '../i18n';
import TeacherCommunicationModal from './TeacherCommunicationModal';

interface TeacherTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  jointPeriods: JointPeriod[];
  adjustments: Record<string, Adjustment[]>;
  onSetClasses: (classes: SchoolClass[]) => void;
  schoolConfig: SchoolConfig;
  selectedTeacherId: string | null;
  onSelectedTeacherChange: (id: string | null) => void;
}

const subjectColorNames = [
  'subject-red', 'subject-sky', 'subject-green', 'subject-yellow',
  'subject-purple', 'subject-pink', 'subject-indigo', 'subject-teal',
  'subject-orange', 'subject-lime', 'subject-cyan', 'subject-emerald',
  'subject-fuchsia', 'subject-rose', 'subject-amber', 'subject-blue'
];

const days: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periodLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

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
    .slot-content { height: 100%; display: flex; flex-direction: column; gap: 2px; }
    .period-card { padding: 4px; border-radius: 2px; font-size: 1em; line-height: 1.6; display: flex; flex-direction: column; justify-content: space-between; flex-grow: 1; }
    .period-card p { margin: 0; white-space: normal; word-break: break-word; color: black; }
    .period-subject { font-weight: bold; }
    .period-context { opacity: 0.8; text-align: right; font-size: 0.6875em; }
    [dir="rtl"] .period-card:not(.period-card-ur) p { text-align: left; }
    [dir="rtl"] .period-card-ur { flex-direction: row; justify-content: space-between; align-items: center; }
    [dir="rtl"] .period-card-ur .period-context { text-align: right; }
    [dir="rtl"] .period-card-ur .period-subject { text-align: left; }
    .footer { margin-top: auto; padding-top: 16px; border-top: 2px solid #4b5563; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.875em; color: #4b5563; }
    .footer-signature { text-align: right; }
    .page-portrait { width: 794px; height: 1123px; padding: 38px; display: flex; flex-direction: column; }
    .workload-table { font-size: 0.625em; width: 100%; border-collapse: collapse; }
    .workload-table th, .workload-table td { padding: 4px; text-align: center; border: 1px solid #ccc; color: black; }
    .workload-table th { font-weight: bold; background-color: #f3f4f6; }
    .workload-table td:first-child { text-align: left; }
    ${subjectColorNames.map(name => `
        .${name} {
            background-color: var(--${name}-bg);
            color: var(--${name}-text);
        }
    `).join('')}
`;

export const calculateWorkloadStats = (
    teacherId: string | null,
    classes: SchoolClass[],
    adjustments: Record<string, Adjustment[]>,
): WorkloadStats => {
    const zeroCounts: { [key: string]: number } = {};
    days.forEach(day => {
        zeroCounts[day.toLowerCase()] = 0;
    });

    if (!teacherId) {
        return {
            dailyCounts: zeroCounts,
            weeklyPeriods: 0,
            jointPeriodsCount: 0,
            substitutionsTaken: 0,
            leavesTaken: 0,
            totalWorkload: 0,
        };
    }

    const specificTeacherTimetable: TimetableGridData = {
      Monday: Array.from({ length: 8 }, () => []),
      Tuesday: Array.from({ length: 8 }, () => []),
      Wednesday: Array.from({ length: 8 }, () => []),
      Thursday: Array.from({ length: 8 }, () => []),
      Friday: Array.from({ length: 8 }, () => []),
    };

    classes.forEach(c => {
      days.forEach(day => {
        c.timetable[day]?.forEach((slot, periodIndex) => {
          slot.forEach(p => {
            if (p.teacherId === teacherId) {
              specificTeacherTimetable[day][periodIndex].push(p);
            }
          });
        });
      });
    });

    const dailyCounts: { [key: string]: number } = {};
    let jointPeriodsCount = 0;

    days.forEach(day => {
        const daySchedule = specificTeacherTimetable[day];
        let dailyOccupiedSlots = 0;
        daySchedule.forEach(slot => {
            if (slot.length > 0) {
                dailyOccupiedSlots++;
                if (slot.some(p => p.jointPeriodId)) {
                    jointPeriodsCount++;
                }
            }
        });
        dailyCounts[day.toLowerCase()] = dailyOccupiedSlots;
    });

    const weeklyPeriods = Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);

    const relevantAdjustments = Object.values(adjustments).flat();
    const substitutionsTaken = relevantAdjustments.filter((adj: Adjustment) => adj.substituteTeacherId === teacherId).length;
    
    // Calculate periods missed due to leave by counting unique slots.
    const leavesTaken = new Set(
        relevantAdjustments
            // FIX: Add explicit type `Adjustment` to the `adj` parameter in the `filter` and `map` callbacks to resolve the "does not exist on type 'unknown'" error.
            .filter((adj: Adjustment) => adj.originalTeacherId === teacherId)
            .map((adj: Adjustment) => `${adj.day}-${adj.periodIndex}`)
    ).size;
    
    const totalWorkload = weeklyPeriods + substitutionsTaken - leavesTaken;
    
    return { dailyCounts, weeklyPeriods, jointPeriodsCount, substitutionsTaken, leavesTaken, totalWorkload };
};

export const generateWorkloadSummaryHtml = (
    t: any,
    lang: DownloadLanguage,
    fontSize: number,
    selectedItems: Teacher[],
    schoolConfig: SchoolConfig,
    classes: SchoolClass[],
    adjustments: Record<string, Adjustment[]>
): string[] => {
    const workloadData = selectedItems.map(teacher => {
        const stats = calculateWorkloadStats(teacher.id, classes, adjustments);
        return { teacher, stats };
    });

    workloadData.sort((a, b) => b.stats.totalWorkload - a.stats.totalWorkload);

    const { en: enT, ur: urT } = translations;

    const shortEn = {
        teacher: 'Teacher', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
        jointPeriods: 'Joint', substitutionsTaken: 'Subs', leavesTaken: 'Leave', totalWorkload: 'Total'
    };
    const shortUr = {
        teacher: 'استاد', monday: 'پیر', tuesday: 'منگل', wednesday: 'بدھ', thursday: 'جمعرات', friday: 'جمعہ',
        jointPeriods: 'مشترکہ', substitutionsTaken: 'متبادل', leavesTaken: 'چھٹی', totalWorkload: 'کل'
    };

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
    
    const tableHeader = `
        <thead>
            <tr>
                <th>${renderHeaderText(shortEn.teacher, shortUr.teacher)}</th>
                <th>${renderHeaderText(shortEn.monday, shortUr.monday)}</th>
                <th>${renderHeaderText(shortEn.tuesday, shortUr.tuesday)}</th>
                <th>${renderHeaderText(shortEn.wednesday, shortUr.wednesday)}</th>
                <th>${renderHeaderText(shortEn.thursday, shortUr.thursday)}</th>
                <th>${renderHeaderText(shortEn.friday, shortUr.friday)}</th>
                <th>${renderHeaderText(shortEn.jointPeriods, shortUr.jointPeriods)}</th>
                <th>${renderHeaderText(shortEn.substitutionsTaken, shortUr.substitutionsTaken)}</th>
                <th>${renderHeaderText(shortEn.leavesTaken, shortUr.leavesTaken)}</th>
                <th>${renderHeaderText(shortEn.totalWorkload, shortUr.totalWorkload)}</th>
            </tr>
        </thead>
    `;
    
    const customStyles = `
    .workload-table { font-size: 1.1em; width: 100%; border-collapse: collapse; }
    .workload-table th, .workload-table td { 
        padding: 1px 2px; 
        text-align: center; 
        border: 1px solid #ccc; 
        color: black; 
        vertical-align: middle;
    }
    .workload-table th { 
        font-weight: bold; 
        background-color: #f3f4f6;
        font-size: 0.85em; /* Reduce header font size for wrapping */
        white-space: normal; /* Allow wrapping for long headers */
        overflow-wrap: break-word;
        line-height: 1.2;
    }
    .workload-table td {
        height: 22px; /* Reduce row height */
    }
    .workload-table td:first-child { text-align: left; }
    /* Slightly increase font for Urdu in headers for readability */
    .workload-table th .font-urdu { font-size: 1.1em; line-height: 1.1; }
    `;

    const headerBlock = `
        <div style="text-align: center; margin-bottom: 1rem;">
            <h1 style="font-size: 1.8em; margin: 0; font-weight: bold;">${lang === 'ur' ? schoolConfig.schoolNameUr : schoolConfig.schoolNameEn}</h1>
            <hr style="width: 80%; margin: 2px auto 4px auto; border: 0; border-top: 1px solid #333;" />
            <h2 style="font-size: 1.1em; margin: 0; font-weight: bold;">${renderHeaderText(enT.workloadSummaryReport, urT.workloadSummaryReport)}</h2>
        </div>
    `;
    
    const tableBody = workloadData.map(({ teacher, stats }) => `
        <tr>
            <td>${renderText(teacher.nameEn, teacher.nameUr)}</td>
            <td>${stats.dailyCounts.monday || 0}</td>
            <td>${stats.dailyCounts.tuesday || 0}</td>
            <td>${stats.dailyCounts.wednesday || 0}</td>
            <td>${stats.dailyCounts.thursday || 0}</td>
            <td>${stats.dailyCounts.friday || 0}</td>
            <td>${stats.jointPeriodsCount}</td>
            <td>${stats.substitutionsTaken}</td>
            <td>${stats.leavesTaken}</td>
            <td>${stats.totalWorkload}</td>
        </tr>
    `).join('');
    
    const footer = `
        <footer style="margin-top: auto; padding-top: 8px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 0.5em;">
            <div><strong>Mr. 🇵🇰</strong></div>
        </footer>
    `;

    const pageHtml = `
        <div class="print-container" style="font-size: ${fontSize}%">
            <style>${getPrintStyles()}${customStyles}</style>
            <div class="page-portrait" dir="${lang === 'ur' ? 'rtl' : 'ltr'}" style="padding-top: 0;">
                ${headerBlock}
                <table class="workload-table">
                    ${tableHeader}
                    <tbody>${tableBody}</tbody>
                </table>
                ${footer}
            </div>
        </div>
    `;
    
    return [pageHtml];
};

export const generateWorkloadSummaryExcel = (
    t: any,
    lang: DownloadLanguage,
    selectedItems: Teacher[],
    classes: SchoolClass[],
    adjustments: Record<string, Adjustment[]>
) => {
    const { en: enT, ur: urT } = translations;
    const shortEn = {
        teacher: 'Teacher', monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed', thursday: 'Thu', friday: 'Fri',
        jointPeriods: 'Joint', substitutionsTaken: 'Subs', leavesTaken: 'Leave', totalWorkload: 'Total'
    };
    const shortUr = {
        teacher: 'استاد', monday: 'پیر', tuesday: 'منگل', wednesday: 'بدھ', thursday: 'جمعرات', friday: 'جمعہ',
        jointPeriods: 'مشترکہ', substitutionsTaken: 'متبادل', leavesTaken: 'چھٹی', totalWorkload: 'کل'
    };

    const renderText = (en: string, ur: string) => {
        if (lang === 'en') return en;
        if (lang === 'ur') return ur;
        return `${en} / ${ur}`;
    };

    const convertToCSV = (data: any[], headers: string[]): string => {
        const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
        const rows = data.map(row =>
            headers.map(header => `"${(row[header] ?? '').toString().replace(/"/g, '""')}"`).join(',')
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

    const headers = [
        renderText(shortEn.teacher, shortUr.teacher),
        renderText(shortEn.monday, shortUr.monday),
        renderText(shortEn.tuesday, shortUr.tuesday),
        renderText(shortEn.wednesday, shortUr.wednesday),
        renderText(shortEn.thursday, shortUr.thursday),
        renderText(shortEn.friday, shortUr.friday),
        renderText(shortEn.jointPeriods, shortUr.jointPeriods),
        renderText(shortEn.substitutionsTaken, shortUr.substitutionsTaken),
        renderText(shortEn.leavesTaken, shortUr.leavesTaken),
        renderText(shortEn.totalWorkload, shortUr.totalWorkload),
    ];

    const data = selectedItems.map(teacher => {
        const stats = calculateWorkloadStats(teacher.id, classes, adjustments);
        return {
            [renderText(shortEn.teacher, shortUr.teacher)]: renderText(teacher.nameEn, teacher.nameUr),
            [renderText(shortEn.monday, shortUr.monday)]: stats.dailyCounts.monday || 0,
            [renderText(shortEn.tuesday, shortUr.tuesday)]: stats.dailyCounts.tuesday || 0,
            [renderText(shortEn.wednesday, shortUr.wednesday)]: stats.dailyCounts.wednesday || 0,
            [renderText(shortEn.thursday, shortUr.thursday)]: stats.dailyCounts.thursday || 0,
            [renderText(shortEn.friday, shortUr.friday)]: stats.dailyCounts.friday || 0,
            [renderText(shortEn.jointPeriods, shortUr.jointPeriods)]: stats.jointPeriodsCount,
            [renderText(shortEn.substitutionsTaken, shortUr.substitutionsTaken)]: stats.substitutionsTaken,
            [renderText(shortEn.leavesTaken, shortUr.leavesTaken)]: stats.leavesTaken,
            [renderText(shortEn.totalWorkload, shortUr.totalWorkload)]: stats.totalWorkload,
        };
    });

    const csvContent = convertToCSV(data, headers);
    triggerDownload(csvContent, 'teacher_workload_summary.csv');
};


const TeacherTimetablePage: React.FC<TeacherTimetablePageProps> = ({ t, language, classes, subjects, teachers, jointPeriods, adjustments, onSetClasses, schoolConfig, selectedTeacherId, onSelectedTeacherChange }) => {
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [isCommModalOpen, setIsCommModalOpen] = useState(false);

  useEffect(() => {
    if (!selectedTeacherId && teachers && teachers.length > 0) {
      onSelectedTeacherChange(teachers[0].id);
    }
    // If a teacher was selected but is no longer in the list (e.g., deleted), select the first one.
    else if (selectedTeacherId && teachers && !teachers.some(t => t.id === selectedTeacherId)) {
      onSelectedTeacherChange(teachers.length > 0 ? teachers[0].id : null);
    }
  }, [selectedTeacherId, teachers, onSelectedTeacherChange]);

  const selectedTeacher = useMemo(() => teachers.find(t => t.id === selectedTeacherId), [teachers, selectedTeacherId]);

  const subjectColorMap = useMemo(() => {
    const map = new Map<string, string>();
    subjects.forEach((subject, index) => {
      map.set(subject.id, subjectColorNames[index % subjectColorNames.length]);
    });
    return map;
  }, [subjects]);

  const teacherTimetableData: TimetableGridData = useMemo(() => {
    const timetable: TimetableGridData = {
      Monday: Array.from({ length: 8 }, () => []),
      Tuesday: Array.from({ length: 8 }, () => []),
      Wednesday: Array.from({ length: 8 }, () => []),
      Thursday: Array.from({ length: 8 }, () => []),
      Friday: Array.from({ length: 8 }, () => []),
    };
    if (!selectedTeacherId) return timetable;

    classes.forEach(c => {
      days.forEach(day => {
        c.timetable[day]?.forEach((slot, periodIndex) => {
          slot.forEach(p => {
            if (p.teacherId === selectedTeacherId) {
              timetable[day][periodIndex].push(p);
            }
          });
        });
      });
    });

    return timetable;
  }, [selectedTeacherId, classes]);
  
  const workloadStats = useMemo(() => calculateWorkloadStats(selectedTeacherId, classes, adjustments), [selectedTeacherId, classes, adjustments]);

  const unscheduledPeriods = useMemo(() => {
    if (!selectedTeacherId) return [];

    const assignedPeriodsCount = new Map<string, number>(); // key: 'classId-subjectId' or 'jp-jointPeriodId'
    
    classes.forEach(c => {
      days.forEach(day => {
        c.timetable[day]?.forEach(slot => {
          slot.forEach(p => {
            if (p.teacherId !== selectedTeacherId) return;

            const key = p.jointPeriodId ? `jp-${p.jointPeriodId}` : `${p.classId}-${p.subjectId}`;
            assignedPeriodsCount.set(key, (assignedPeriodsCount.get(key) || 0) + 1);
          });
        });
      });
    });

    const unplaced: Period[] = [];
    
    classes.forEach(c => {
        c.subjects.forEach(cs => {
            if (cs.teacherId === selectedTeacherId) {
                const isJointAssignment = jointPeriods.some(jp => 
                    jp.assignments.some(a => a.classId === c.id && a.subjectId === cs.subjectId)
                );

                if (isJointAssignment) return;

                const assigned = assignedPeriodsCount.get(`${c.id}-${cs.subjectId}`) || 0;
                const needed = cs.periodsPerWeek - assigned;
                if (needed > 0) {
                    for(let i=0; i<needed; i++){
                        unplaced.push({ id: `unscheduled-${c.id}-${cs.subjectId}-${i}`, classId: c.id, subjectId: cs.subjectId, teacherId: cs.teacherId });
                    }
                }
            }
        });
    });

    jointPeriods.forEach(jp => {
        if(jp.teacherId === selectedTeacherId) {
            const assigned = assignedPeriodsCount.get(`jp-${jp.id}`) || 0;
            const needed = jp.periodsPerWeek - assigned;
            if (needed > 0) {
                for (let i = 0; i < needed; i++) {
                    jp.assignments.forEach(a => {
                        unplaced.push({
                            id: `unscheduled-jp-${jp.id}-${a.classId}-${i}`,
                            classId: a.classId, subjectId: a.subjectId,
                            teacherId: jp.teacherId, jointPeriodId: jp.id
                        });
                    });
                }
            }
        }
    });

    return unplaced;
  }, [selectedTeacherId, classes, jointPeriods]);

  const groupedUnscheduled = useMemo(() => {
    return unscheduledPeriods.reduce((acc, period) => {
        const key = period.jointPeriodId 
            ? `jp-${period.jointPeriodId}`
            : `${period.classId}-${period.subjectId}`;
        
        if (!acc[key]) acc[key] = [];
        acc[key].push(period);
        return acc;
    }, {} as Record<string, Period[]>);
  }, [unscheduledPeriods]);

  const generateTeacherTimetableHtml = useCallback((teacher: Teacher, lang: DownloadLanguage, fontSize: number): string => {
    const { en: enT, ur: urT } = translations;
    
    const renderText = (en: string, ur: string) => {
      if (lang === 'en') return en;
      if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
      return `${en} / <span class="font-urdu">${ur}</span>`;
    };

    const workloadValue = workloadStats.weeklyPeriods;
    const workloadLabelEn = `${workloadValue} ${workloadValue === 1 ? enT.period : enT.periods}`;
    const workloadLabelUr = `${workloadValue.toLocaleString('ur-PK')} ${workloadValue === 1 ? urT.period : urT.periods}`;

    const detailsGridContent = lang === 'ur' ? `
        <div class="text-right"><strong>${urT.teacher}:</strong> ${renderText(teacher.nameEn, teacher.nameUr)}</div>
        <div class="text-center"><strong>${urT.designation}:</strong> ${teacher.designation}</div>
        <div class="text-left"><strong>${urT.workload}:</strong> ${renderText(workloadLabelEn, workloadLabelUr)}</div>
    ` : `
        <div class="text-left"><strong>${enT.teacher}:</strong> ${renderText(teacher.nameEn, teacher.nameUr)}</div>
        <div class="text-center"><strong>${enT.designation}:</strong> ${teacher.designation}</div>
        <div class="text-right"><strong>${enT.workload}:</strong> ${renderText(workloadLabelEn, workloadLabelUr)}</div>
    `;

    const tableRows = periodLabels.map((label, periodIndex) => {
      const cells = days.map(day => {
        const periods = teacherTimetableData[day]?.[periodIndex] || [];
        const cellContent = periods.map(period => {
          const subject = subjects.find(s => s.id === period.subjectId);
          const schoolClass = classes.find(c => c.id === period.classId);
          const colorName = subjectColorMap.get(period.subjectId) || 'subject-default';
          if (!subject || !schoolClass) return '';
          
          const subjectHtml = `<p class="period-subject">${renderText(subject.nameEn, subject.nameUr)}</p>`;
          const classHtml = `<p class="period-context">${renderText(schoolClass.nameEn, schoolClass.nameUr)}</p>`;
          const cardClasses = `period-card ${colorName}`;

          if (lang === 'ur') {
              return `<div class="${cardClasses} period-card-ur">${classHtml}${subjectHtml}</div>`;
          }
          return `<div class="${cardClasses}">${subjectHtml}${classHtml}</div>`;

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

    return `<div class="print-container" style="font-size: ${fontSize}%"><style>${getPrintStyles()}</style><div class="page-landscape" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Watermark" class="watermark" />` : ''}<div class="content-wrapper"><header class="header">${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="School Logo" class="header-logo" />` : ''}<div class="school-name-container" style="flex-grow: 1;">${schoolNameHtml}</div></header><div class="details-grid">${detailsGridContent}</div><main class="main-content"><table class="timetable-table"><thead><tr><th class="period-label"></th>${dayHeaders.map(d => `<th class="day-header">${d}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></main><footer class="footer"><div><strong>Mr. 🇵🇰</strong></div><div>${lang === 'both' ? new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : dateHtml}</div></footer></div></div></div>`;
  }, [schoolConfig, subjects, classes, subjectColorMap, teacherTimetableData, workloadStats]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      {selectedTeacher && (<PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={`${t.teacherTimetable}: ${selectedTeacher.nameEn}`} fileNameBase={`Timetable_${selectedTeacher.nameEn.replace(' ', '_')}`} generateHtml={(lang, fontSize) => generateTeacherTimetableHtml(selectedTeacher, lang, fontSize)} />)}
      {selectedTeacher && (<TeacherCommunicationModal t={t} isOpen={isCommModalOpen} onClose={() => setIsCommModalOpen(false)} selectedTeacher={selectedTeacher} teacherTimetableData={teacherTimetableData} subjects={subjects} classes={classes} schoolConfig={schoolConfig} subjectColorMap={subjectColorMap} />)}
      
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <label htmlFor="teacher-select" className="block text-sm font-medium text-[var(--text-secondary)]">{t.selectATeacher}</label>
          <select id="teacher-select" value={selectedTeacherId || ''} onChange={(e) => onSelectedTeacherChange(e.target.value)}
            className="block w-full md:w-auto pl-3 pr-10 py-2 text-base bg-[var(--bg-secondary)] text-[var(--text-primary)] border-[var(--border-secondary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm rounded-md shadow-sm">
            {teachers.map(teacher => (
                <option key={teacher.id} value={teacher.id}>{teacher.nameEn} / {teacher.nameUr}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => setIsCommModalOpen(true)} disabled={!selectedTeacher} title={t.sendToTeacher} className="p-2 text-sm font-medium text-[var(--text-primary)] bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-lg shadow-sm hover:bg-[var(--bg-tertiary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg></button>
            <button onClick={() => setIsPrintPreviewOpen(true)} disabled={!selectedTeacher} title={t.printViewAction} className="p-2 text-sm font-medium bg-[var(--accent-primary)] text-[var(--accent-text)] border border-[var(--accent-primary)] rounded-lg shadow-sm hover:bg-[var(--accent-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
        </div>
      </div>
      {!selectedTeacher ? (
        <p className="text-center text-[var(--text-secondary)] py-10">{t.selectATeacher}</p>
      ) : (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="lg:w-1/4">
                <div className="sticky top-24 space-y-6">
                    <TeacherAvailabilitySummary t={t} workloadStats={workloadStats} />
                    <div className="p-4 rounded-lg shadow-md bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] mb-3 border-b border-[var(--border-primary)] pb-2">{t.unscheduledPeriods} ({Object.values(groupedUnscheduled).length})</h3>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2">
                            {Object.values(groupedUnscheduled).map((group, index) => {
                                const jointPeriod = group[0].jointPeriodId ? jointPeriods.find(jp => jp.id === group[0].jointPeriodId) : undefined;
                                return (
                                    <PeriodStack 
                                        key={`${group[0].subjectId}-${group[0].classId}-${index}`} 
                                        periods={group} 
                                        onDragStart={() => {}} // Drag and drop not implemented for this view
                                        colorName={subjectColorMap.get(group[0].subjectId)} 
                                        language={language}
                                        subjects={subjects}
                                        teachers={teachers}
                                        classes={classes}
                                        displayContext={jointPeriod ? 'jointPeriod' : 'class'}
                                        jointPeriodName={jointPeriod?.name}
                                        className="w-full"
                                    />
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
            <div className="lg:w-3/4 overflow-x-auto">
                <div className="bg-[var(--bg-secondary)] shadow-lg rounded-lg overflow-hidden border border-[var(--border-primary)]">
                    <table className="w-full text-center border-collapse table-fixed">
                        <thead><tr className="bg-[var(--accent-primary)] text-[var(--accent-text)]"><th className="border border-[var(--border-secondary)] p-2 w-12"></th>{days.map(day => <th key={day} className="border border-[var(--border-secondary)] p-2 font-bold uppercase text-sm">{t[day.toLowerCase()]}</th>)}</tr></thead>
                        <tbody>{periodLabels.map((label, periodIndex) => (<tr key={label}><td className="border border-[var(--border-secondary)] font-black text-xl bg-[var(--bg-tertiary)] text-[var(--text-primary)]">{label}</td>{days.map(day => {
                            const slotPeriods = teacherTimetableData[day]?.[periodIndex] || [];
                            const isDisabled = day === 'Friday' && periodIndex >= 6 && periodIndex < 8;
                            return (<td key={day} className={`border border-[var(--border-secondary)] h-28 p-0.5 align-top transition-colors duration-200 ${isDisabled ? 'bg-[var(--slot-disabled-bg)]' : ''}`}>
                                <div className="relative h-full flex flex-col items-stretch justify-start gap-0.5">
                                    <div className="h-full flex flex-col gap-0.5">
                                        {slotPeriods.map(period => (
                                            <PeriodCard key={period.id} period={period} onDragStart={() => {}} colorName={subjectColorMap.get(period.subjectId)} language={language} subjects={subjects} teachers={teachers} classes={classes} displayContext="class" />
                                        ))}
                                    </div>
                                </div>
                            </td>);
                        })}</tr>))}</tbody>
                    </table>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// FIX: Add default export to make the component available for import.
export default TeacherTimetablePage;