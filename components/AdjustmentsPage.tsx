import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Language, SchoolClass, Subject, Teacher, TimetableGridData, Adjustment, SchoolConfig, Period, DownloadLanguage, LeaveDetails } from '../types';
import PrintPreview from './PrintPreview';
import { translations } from '../i18n';

interface AlternativeTimetablePageProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  adjustments: Record<string, Adjustment[]>;
  leaveDetails: Record<string, Record<string, LeaveDetails>> | undefined;
  onSetAdjustments: (date: string, adjustmentsForDate: Adjustment[]) => void;
  onSetLeaveDetails: (date: string, details: Record<string, LeaveDetails>) => void;
  schoolConfig: SchoolConfig;
  selection: { date: string; teacherIds: string[]; };
  onSelectionChange: React.Dispatch<React.SetStateAction<{ date: string; teacherIds: string[]; }>>;
  openConfirmation: (title: string, message: React.ReactNode, onConfirm: () => void) => void;
}

const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

type SubstituteStatus =
  | { type: 'IN_CHARGE' }
  | { type: 'TEACHES_CLASS' }
  | { type: 'AVAILABLE' }
  | { type: 'UNAVAILABLE'; reason: 'SUBSTITUTION' }
  // FIX: Changed `nameEn`/`nameUr` to `classNameEn`/`classNameUr` to match the Adjustment interface and resolve the type error.
  | { type: 'UNAVAILABLE'; reason: 'DOUBLE_BOOK'; conflictClass: { classNameEn: string, classNameUr: string } };

type TeacherWithStatus = {
  teacher: Teacher;
  status: SubstituteStatus;
};


interface SubstitutionGroup {
    absentTeacher: Teacher;
    period: Period; // The first period found, for reference
    periodIndex: number;
    combinedClassIds: string[];
    combinedClassNames: { en: string; ur: string };
    subjectInfo: { en: string; ur: string };
}

const getPrintStyles = () => `
    @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700&family=Lato:wght@400;700&family=Merriweather:wght@400;700;900&family=Noto+Naskh+Arabic:wght@400;700&family=Noto+Nastaliq+Urdu:wght@400;700&family=Open+Sans:wght@400;600;700&family=Roboto:wght@400;500;700&family=Lateef&family=Times+New+Roman&display=swap');
    
    .print-container {
      font-family: 'Lato', 'Almarai', sans-serif;
      background-color: white;
    }
    .print-container h1, .print-container h2, .print-container p, .print-container strong, .print-container span, .print-container div, .print-container th, .print-container td {
        color: black !important;
    }
    .font-urdu { font-family: 'Noto Nastaliq Urdu', serif; font-size: 0.85em; line-height: 1.6; }
    .page-portrait { width: 794px; height: 1123px; padding: 38px; display: flex; flex-direction: column; position: relative; overflow: hidden; box-sizing: border-box; }
    .content-wrapper { position: relative; z-index: 10; display: flex; flex-direction: column; height: 100%; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 60%; height: 60%; object-fit: contain; opacity: 0.07; z-index: 0; }
    .footer { margin-top: auto; padding-top: 4px; border-top: 1px solid #4b5563; display: flex; justify-content: space-between; align-items: flex-end; font-size: 0.75em; color: #4b5563; }

    /* Header for By-Period Report */
    .header { display: flex; align-items: center; gap: 12px; margin-bottom: 6px; border-bottom: 1px solid #ccc; padding-bottom: 6px; }
    .header-logo { height: 60px; width: 60px; object-fit: contain; }
    .school-name-container { font-family: 'Merriweather', serif; }
    .school-name { font-size: 1.8em; font-weight: 900; color: #0d9488; margin: 0; }

    /* Adjustment Page Specific Styles */
    .adj-page-header { text-align: center; margin-bottom: 8px; }
    .adj-title { font-size: 1.25em; font-weight: bold; }
    .adj-date { font-size: 0.875em; }
    .main-content { flex-grow: 1; padding-top: 8px; display: flex; flex-direction: column; }
    .adj-absent-teachers { margin-bottom: 16px; font-size: 1em; border-bottom: 1px solid black; padding-bottom: 4px; }
    .adj-absent-teachers > strong { font-weight: bold; }
    .adj-table-wrapper { flex-grow: 1; }
    .adj-table { width: 100%; border-collapse: collapse; font-size: 1em; table-layout: fixed; }
    .adj-table th, .adj-table td { padding: 4px; border: 1px solid black; vertical-align: middle; word-wrap: break-word; }
    .adj-table thead { background-color: #e5e7eb; text-align: left; }
    .adj-table[dir="rtl"] thead { text-align: right; }
    .adj-substitute-name { font-weight: 600; }
    .adj-period-index { text-align: center; font-weight: bold; }
    .footer-signature { text-align: right; }

    /* Column Widths */
    .adj-table .col-on-leave { width: 20%; }
    .adj-table .col-period { width: 7%; text-align: center; }
    .adj-table .col-class { width: 20%; }
    .adj-table .col-subject { width: 18%; }
    .adj-table .col-substitute { width: 20%; }
    .adj-table .col-signature { width: 15%; }

    /* By Period Report Styles */
    .by-period-table { width: 100%; border-collapse: collapse; font-size: 0.7em; }
    .by-period-table th, .by-period-table td { padding: 2px; border: 1px solid black; vertical-align: top; color: black; }
    .by-period-table thead { background-color: #e5e7eb; }
    .by-period-table .col-day { width: 5%; text-align: center; font-weight: bold; vertical-align: middle; -webkit-writing-mode: vertical-rl; -ms-writing-mode: tb-rl; writing-mode: vertical-rl; text-orientation: mixed; }
    .by-period-table .col-period { width: 5%; text-align: center; font-weight: bold; }
    .by-period-table .col-teachers { width: 90%; line-height: 1.2; }

    /* Basic Info Report Styles */
    .basic-info-table { width: 100%; border-collapse: collapse; font-size: 1.15em; }
    .basic-info-table th, .basic-info-table td { padding: 0px 4px; border: 1px solid black; vertical-align: middle; text-align: center; color: black; height: 27px; }
    .basic-info-table thead { background-color: #e5e7eb; }
    .basic-info-table .col-num { width: 4%; }
    .basic-info-table .col-class-name { width: 15%; text-align: left; }
    .basic-info-table[dir="rtl"] .col-class-name { text-align: right; }
    .basic-info-table .col-in-charge { width: 30%; text-align: left; white-space: nowrap; }
    .basic-info-table[dir="rtl"] .col-in-charge { text-align: right; }
    .basic-info-table .col-room { width: 13%; }
    .basic-info-table .col-students { width: 5%; }
    .basic-info-table .col-comments { width: 33%; }

    /* Summary Stats Table */
    .summary-stats-table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 0.95em; table-layout: fixed; }
    .summary-stats-table td { border: 1px solid black; padding: 2px; text-align: center; vertical-align: middle; }
    .summary-stats-table td:nth-child(odd) { font-weight: bold; background-color: #e5e7eb; width: 20%; }
    .summary-stats-table td:nth-child(even) { width: 30%; }
`;

export const generateByPeriodHtml = (
    t: any,
    lang: DownloadLanguage,
    fontSize: number,
    schoolConfig: SchoolConfig,
    classes: SchoolClass[],
    teachers: Teacher[],
    dayOfWeek: keyof TimetableGridData | null,
    absentTeacherIds: string[],
    absenteeDetails: Record<string, { leaveType: 'full' | 'half'; startPeriod: number }>
): string => {
    const { en: enT, ur: urT } = translations;
    const renderText = (en: string, ur: string) => {
      if (lang === 'en') return en;
      if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
      return `${en} / <span class="font-urdu">${ur}</span>`;
    };
    const renderHeaderText = (en: string, ur: string) => (lang === 'ur' ? `<span class="font-urdu">${ur}</span>` : (lang === 'en' ? en : `${en} / <span class="font-urdu">${ur}</span>`));
    const renderTitleText = (en: string, ur: string) => (lang === 'ur' ? `<span class="font-urdu">${ur}</span>` : en);

    const weeklyBusyTeacherMap = new Map<keyof TimetableGridData, Map<number, Set<string>>>();
    daysOfWeek.forEach(day => {
        const dailyMap = new Map<number, Set<string>>();
        for (let i = 0; i < 8; i++) dailyMap.set(i, new Set<string>());
        classes.forEach(c => {
            c.timetable[day]?.forEach((slot, periodIndex) => {
                slot.forEach(p => dailyMap.get(periodIndex)?.add(p.teacherId));
            });
        });
        weeklyBusyTeacherMap.set(day, dailyMap);
    });

    const tableRows = daysOfWeek.flatMap((day: keyof TimetableGridData) => {
        const numPeriods = day === 'Friday' ? 6 : 8;
        return Array.from({ length: numPeriods }).map((_, periodIndex) => {
            const dailyBusyTeachers = weeklyBusyTeacherMap.get(day)?.get(periodIndex) || new Set();
            
            const absentThisPeriod = new Set<string>();
            if (day === dayOfWeek) { 
                // FIX: The type of `id` can be inferred as `unknown`, causing an indexing error. Explicitly type it as `string`.
                // FIX: Explicitly typed `id` as `string` to resolve TypeScript inference issue where it was being treated as `unknown`.
                absentTeacherIds.forEach((id: string) => {
                    const details = absenteeDetails[id];
                    if (details && (details.leaveType === 'full' || (details.leaveType === 'half' && periodIndex >= details.startPeriod - 1))) {
                        absentThisPeriod.add(id);
                    }
                });
            }
            
            const unavailableTeachers = new Set([...dailyBusyTeachers, ...absentThisPeriod]);
            const freeTeachers = teachers.filter(t => !unavailableTeachers.has(t.id));
            
            const dayKey = day.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
            const dayCell = periodIndex === 0 ? `<td rowspan="${numPeriods}" class="col-day">${renderText(enT[dayKey], urT[dayKey])}</td>` : '';
            
            return `
                <tr>
                    ${dayCell}
                    <td class="col-period">${periodIndex + 1}</td>
                    <td class="col-teachers">${freeTeachers.map(t => renderText(t.nameEn, t.nameUr)).join(', ')}</td>
                </tr>
            `;
        }).join('');
    }).join('');
    
    const schoolNameHtml = lang === 'ur'
        ? `<h1 class="school-name font-urdu" style="text-align: right;">${schoolConfig.schoolNameUr}</h1>`
        : `<h1 class="school-name" style="text-align: left;">${schoolConfig.schoolNameEn}</h1>`;

    const headerHtml = `
        <header class="header">
            ${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="School Logo" class="header-logo" />` : ''}
            <div class="school-name-container" style="flex-grow: 1;">
                ${schoolNameHtml}
            </div>
        </header>
        <h2 style="text-align: center; font-size: 1.2rem; font-weight: bold; margin-top: 4px; margin-bottom: 8px; color: black;">${renderText(enT.byPeriod, urT.byPeriod)}</h2>
    `;

    return `
        <div class="print-container" style="font-size: ${fontSize}%">
            <style>${getPrintStyles()}</style>
            <div dir="${lang === 'ur' ? 'rtl' : 'ltr'}" class="page-portrait" style="padding: 26px;">
                ${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Watermark" class="watermark" />` : ''}
                <div class="content-wrapper">
                    ${headerHtml}
                    <main class="main-content">
                        <table class="by-period-table">
                            <thead><tr><th class="col-day">${renderHeaderText(enT.day, urT.day)}</th><th class="col-period">${renderHeaderText(enT.period, urT.period)}</th><th class="col-teachers">${renderHeaderText(enT.availableTeachers, urT.availableTeachers)}</th></tr></thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                    </main>
                    <footer class="footer">
                        <div><strong>Mr. 🇵🇰</strong></div>
                        <div class="footer-signature">${renderTitleText(enT.signature, urT.signature)} ______________</div>
                    </footer>
                </div>
            </div>
        </div>
    `;
};

export const generateByPeriodExcel = (
    t: any,
    lang: DownloadLanguage,
    schoolConfig: SchoolConfig,
    classes: SchoolClass[],
    teachers: Teacher[],
    dayOfWeek: keyof TimetableGridData | null,
    absentTeacherIds: string[],
    absenteeDetails: Record<string, { leaveType: 'full' | 'half'; startPeriod: number }>,
    selectedDate: string
) => {
    const { en: enT, ur: urT } = translations;
    
    const renderText = (en: string, ur: string) => {
        if (lang === 'en') return en;
        if (lang === 'ur') return ur;
        return `${en} / ${ur}`;
    };
    const currentT = lang === 'ur' ? urT : (lang === 'en' ? enT : enT); 


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
    
    const weeklyBusyTeacherMap = new Map<keyof TimetableGridData, Map<number, Set<string>>>();
    daysOfWeek.forEach(day => {
        const dailyMap = new Map<number, Set<string>>();
        for (let i = 0; i < 8; i++) dailyMap.set(i, new Set<string>());
        classes.forEach(c => {
            c.timetable[day]?.forEach((slot, periodIndex) => {
                slot.forEach(p => dailyMap.get(periodIndex)?.add(p.teacherId));
            });
        });
        weeklyBusyTeacherMap.set(day, dailyMap);
    });

    const headers = [currentT.day, currentT.period, currentT.availableTeachers];
    const data: any[] = [];
    
    daysOfWeek.forEach(day => {
        const numPeriods = day === 'Friday' ? 6 : 8;
        Array.from({ length: numPeriods }).forEach((_, periodIndex) => {
            const dailyBusyTeachers = weeklyBusyTeacherMap.get(day)?.get(periodIndex) || new Set();
            const absentThisPeriod = new Set<string>();
            if (day === dayOfWeek) {
                // FIX: The type of `id` can be inferred as `unknown`, causing an indexing error. Explicitly type it as `string`.
                // FIX: Explicitly typed `id` as `string` to resolve TypeScript inference issue where it was being treated as `unknown`.
                absentTeacherIds.forEach((id: string) => {
                    const details = absenteeDetails[id];
                    if (details && (details.leaveType === 'full' || (details.leaveType === 'half' && periodIndex >= details.startPeriod - 1))) {
                        absentThisPeriod.add(id);
                    }
                });
            }
            const unavailableTeachers = new Set([...dailyBusyTeachers, ...absentThisPeriod]);
            const freeTeachers = teachers.filter(t => !unavailableTeachers.has(t.id));
            const dayKey = day.toLowerCase() as 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
            data.push({
                [currentT.day]: renderText(day, urT[dayKey]),
                [currentT.period]: periodIndex + 1,
                [currentT.availableTeachers]: freeTeachers.map(t => renderText(t.nameEn, t.nameUr)).join('\n'),
            });
        });
    });

    const csvContent = convertToCSV(data, headers);
    triggerDownload(csvContent, `free_teachers_weekly_${selectedDate}.csv`);
};

export const generateBasicInformationHtml = (
    t: any,
    lang: DownloadLanguage,
    fontSize: number,
    classes: SchoolClass[],
    teachers: Teacher[],
    schoolConfig: SchoolConfig
): string => {
    const { en: enT, ur: urT } = translations;
    const renderText = (en: string, ur: string) => {
      if (lang === 'en') return en;
      if (lang === 'ur') return `<span class="font-urdu">${ur}</span>`;
      return `${en} / <span class="font-urdu">${ur}</span>`;
    };
    const renderHeaderText = (en: string, ur: string) => (lang === 'ur' ? `<span class="font-urdu">${ur}</span>` : (lang === 'en' ? en : `${en} / <span class="font-urdu">${ur}</span>`));
    
    const highClasses = classes.filter(c => c.category === 'High');
    const middleClasses = classes.filter(c => c.category === 'Middle');
    const primaryClasses = classes.filter(c => c.category === 'Primary');
    const highCount = highClasses.length;
    const middleCount = middleClasses.length;
    const primaryCount = primaryClasses.length;
    const highStudents = highClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const middleStudents = middleClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const primaryStudents = primaryClasses.reduce((sum, c) => sum + (c.studentCount || 0), 0);
    const totalStudents = highStudents + middleStudents + primaryStudents;
    
    const headerHtml = `
        <div style="text-align: center; margin-bottom: 8px;">
            <h1 style="font-size: 1.8rem; font-weight: bold; color: black;">
                ${renderText(schoolConfig.schoolNameEn, schoolConfig.schoolNameUr)}
            </h1>
        </div>
    `;

    const tableRows = classes.map((cls, index) => {
        const inCharge = teachers.find(t => t.id === cls.inCharge);
        return `
            <tr>
                <td>${index + 1}</td>
                <td class="col-class-name">${renderText(cls.nameEn, cls.nameUr)}</td>
                <td class="col-in-charge">${inCharge ? renderText(inCharge.nameEn, inCharge.nameUr) : ''}</td>
                <td>${cls.roomNumber}</td>
                <td>${cls.studentCount}</td>
                <td></td>
            </tr>
        `;
    }).join('');
    
    const summaryTableHtml = `
        <table class="summary-stats-table" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
          <tbody>
            <tr>
              <td>${renderHeaderText(enT.high, urT.high)}</td>
              <td>${renderText(`${enT.classesLabel}: ${highCount}`, `${urT.classesLabel}: ${highCount}`)} | ${renderText(`${enT.studentsLabel}: ${highStudents}`, `${urT.studentsLabel}: ${highStudents}`)}</td>
              <td>${renderHeaderText(enT.middle, urT.middle)}</td>
              <td>${renderText(`${enT.classesLabel}: ${middleCount}`, `${urT.classesLabel}: ${middleCount}`)} | ${renderText(`${enT.studentsLabel}: ${middleStudents}`, `${urT.studentsLabel}: ${middleStudents}`)}</td>
            </tr>
            <tr>
              <td>${renderHeaderText(enT.primary, urT.primary)}</td>
              <td>${renderText(`${enT.classesLabel}: ${primaryCount}`, `${urT.classesLabel}: ${primaryCount}`)} | ${renderText(`${enT.studentsLabel}: ${primaryStudents}`, `${urT.studentsLabel}: ${primaryStudents}`)}</td>
              <td>${renderHeaderText(enT.grandTotal, urT.grandTotal)}</td>
              <td>${renderText(`${enT.classesLabel}: ${classes.length}`, `${urT.classesLabel}: ${classes.length}`)} | ${renderText(`${enT.studentsLabel}: ${totalStudents}`, `${urT.studentsLabel}: ${totalStudents}`)}</td>
            </tr>
          </tbody>
        </table>
    `;

    return `
        <div class="print-container" style="font-size: ${fontSize}%">
            <style>${getPrintStyles()}</style>
            <div dir="${lang === 'ur' ? 'rtl' : 'ltr'}" class="page-portrait" style="padding: 26px;">
                ${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Watermark" class="watermark" />` : ''}
                <div class="content-wrapper">
                    ${headerHtml}
                    <main class="main-content">
                        <table class="basic-info-table" dir="${lang === 'ur' ? 'rtl' : 'ltr'}">
                            <thead>
                                <tr>
                                    <th class="col-num">#</th>
                                    <th class="col-class-name">${renderHeaderText(enT.class, urT.class)}</th>
                                    <th class="col-in-charge">${renderHeaderText(enT.classInCharge, urT.classInCharge)}</th>
                                    <th class="col-room">${renderHeaderText(enT.roomNumberAbbr, urT.roomNumberAbbr)}</th>
                                    <th class="col-students">${renderHeaderText(enT.studentCountAbbr, urT.studentCountAbbr)}</th>
                                    <th class="col-comments">${renderHeaderText(enT.comments, urT.comments)}</th>
                                </tr>
                            </thead>
                            <tbody>${tableRows}</tbody>
                        </table>
                        ${summaryTableHtml}
                    </main>
                    <footer class="footer">
                        <div><strong>Mr. 🇵🇰</strong></div>
                        <div class="footer-signature">${renderHeaderText(enT.signature, urT.signature)} ______________</div>
                    </footer>
                </div>
            </div>
        </div>
    `;
};

export const generateBasicInformationExcel = (
    t: any,
    lang: DownloadLanguage,
    classes: SchoolClass[],
    teachers: Teacher[]
): void => {
    const { en: enT, ur: urT } = translations;
    const renderText = (en: string, ur: string) => {
        if (lang === 'en') return en;
        if (lang === 'ur') return ur;
        return `${en} / ${ur}`;
    };

    const convertToCSV = (data: any[], headers: string[]): string => {
        const headerRow = headers.map(h => `"${h.replace(/"/g, '""')}"`).join(',');
        const rows = data.map(row =>
            headers.map(header => {
                const value = row[header] === null || row[header] === undefined ? '' : String(row[header]);
                return `"${value.replace(/"/g, '""')}"`;
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

    const headers = [
        '#',
        renderText(enT.class, urT.class),
        renderText(enT.classInCharge, urT.classInCharge),
        renderText(enT.roomNumber, urT.roomNumber),
        renderText(enT.studentCount, urT.studentCount),
        renderText(enT.comments, urT.comments),
    ];
    const data = classes.map((cls, index) => {
        const inCharge = teachers.find(t => t.id === cls.inCharge);
        return {
            '#': index + 1,
            [renderText(enT.class, urT.class)]: renderText(cls.nameEn, cls.nameUr),
            [renderText(enT.classInCharge, urT.classInCharge)]: inCharge ? renderText(inCharge.nameEn, inCharge.nameUr) : '',
            [renderText(enT.roomNumber, urT.roomNumber)]: cls.roomNumber,
            [renderText(enT.studentCount, urT.studentCount)]: cls.studentCount,
            [renderText(enT.comments, urT.comments)]: '',
        };
    });
    
    const csvContent = convertToCSV(data, headers);
    triggerDownload(csvContent, `basic_information.csv`);
};

const WhatsAppIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" />
    </svg>
);

const DoubleBookedWarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
);

export const AlternativeTimetablePage: React.FC<AlternativeTimetablePageProps> = ({ t, language, classes, subjects, teachers, adjustments, leaveDetails, onSetAdjustments, onSetLeaveDetails, schoolConfig, selection, onSelectionChange, openConfirmation }) => {
  const { date: selectedDate, teacherIds: absentTeacherIds } = selection;
  const [dailyAdjustments, setDailyAdjustments] = useState<Adjustment[]>([]);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);
  const [absenteeDetails, setAbsenteeDetails] = useState<Record<string, LeaveDetails>>({});
  const [isTeacherSelectionOpen, setIsTeacherSelectionOpen] = useState(false);
  const [expandedTeacherIds, setExpandedTeacherIds] = useState<Set<string>>(new Set());

  const toggleTeacherExpansion = (teacherId: string) => {
    setExpandedTeacherIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(teacherId)) {
        newSet.delete(teacherId);
      } else {
        newSet.add(teacherId);
      }
      return newSet;
    });
  };
  
  const dayOfWeek = useMemo(() => {
    const date = new Date(selectedDate);
    const dayIndex = date.getDay();
    return dayIndex > 0 && dayIndex < 6 ? daysOfWeek[dayIndex - 1] : null;
  }, [selectedDate]);

  useEffect(() => {
    const savedAdjustments = adjustments[selectedDate] || [];
    setDailyAdjustments(savedAdjustments);
    
    const savedLeaveDetails: Record<string, LeaveDetails> = leaveDetails?.[selectedDate] || {};
    
    const teacherIdsFromAdjustments = [...new Set(savedAdjustments.map(adj => adj.originalTeacherId))];
    const teacherIdsFromLeaveDetails = Object.keys(savedLeaveDetails);
    
    const allAbsentIds = [...new Set([...teacherIdsFromAdjustments, ...teacherIdsFromLeaveDetails])];

    if (JSON.stringify(allAbsentIds.sort()) !== JSON.stringify(absentTeacherIds.sort())) {
        onSelectionChange(prev => ({...prev, teacherIds: allAbsentIds}));
    }

    const currentDetails: Record<string, LeaveDetails> = {};
    allAbsentIds.forEach(id => {
        currentDetails[id] = savedLeaveDetails[id] || { leaveType: 'full', startPeriod: 1 };
    });
    setAbsenteeDetails(currentDetails);
  }, [selectedDate, adjustments, leaveDetails, absentTeacherIds, onSelectionChange]);


  const absentTeachers = useMemo(() => {
    return teachers.filter(teacher => absentTeacherIds.includes(teacher.id));
  }, [teachers, absentTeacherIds]);

  const substitutionGroups = useMemo((): SubstitutionGroup[] => {
    if (!dayOfWeek) return [];
    
    const groups: SubstitutionGroup[] = [];
    
    absentTeachers.forEach(absentTeacher => {
        const details = absenteeDetails[absentTeacher.id];
        const isFullDay = !details || details.leaveType === 'full';
        const startPeriod = isFullDay ? 0 : (details.startPeriod - 1);

        for (let periodIndex = startPeriod; periodIndex < 8; periodIndex++) {
            const periodsToCover = classes.flatMap(c => 
                c.timetable[dayOfWeek]?.[periodIndex]
                    .filter(p => p.teacherId === absentTeacher.id) || []
            );

            if (periodsToCover.length > 0) {
                const processedJointPeriods = new Set<string>();
                periodsToCover.forEach(firstPeriod => {
                    const jointPeriodId = firstPeriod.jointPeriodId;
                    if(jointPeriodId && processedJointPeriods.has(jointPeriodId)) return;

                    const classIds = jointPeriodId 
                        ? classes.filter(c => c.timetable[dayOfWeek]?.[periodIndex]?.some(p => p.jointPeriodId === jointPeriodId)).map(c => c.id)
                        : [firstPeriod.classId];

                    const classNames = classIds.map(id => {
                        const c = classes.find(cls => cls.id === id);
                        return { en: c?.nameEn || '', ur: c?.nameUr || ''};
                    }).reduce((acc, curr) => ({ en: acc.en ? `${acc.en}, ${curr.en}` : curr.en, ur: acc.ur ? `${acc.ur}، ${curr.ur}`: curr.ur}), {en: '', ur: ''});

                    const subject = subjects.find(s => s.id === firstPeriod.subjectId);

                    groups.push({
                        absentTeacher: absentTeacher,
                        period: firstPeriod,
                        periodIndex: periodIndex,
                        combinedClassIds: classIds,
                        combinedClassNames: classNames,
                        subjectInfo: { en: subject?.nameEn || '', ur: subject?.nameUr || '' },
                    });
                    if(jointPeriodId) processedJointPeriods.add(jointPeriodId);
                });
            }
        }
    });
    return groups.sort((a,b) => a.absentTeacher.id.localeCompare(b.absentTeacher.id) || a.periodIndex - b.periodIndex);
  }, [dayOfWeek, absentTeachers, classes, subjects, absenteeDetails]);
  
  const weeklyBusyTeacherMap = useMemo(() => {
    const map = new Map<keyof TimetableGridData, Map<number, Set<string>>>();
    daysOfWeek.forEach(day => {
        const dailyMap = new Map<number, Set<string>>();
        for (let i=0; i<8; i++) dailyMap.set(i, new Set<string>());
        classes.forEach(c => c.timetable[day]?.forEach((slot, periodIndex) => slot.forEach(p => dailyMap.get(periodIndex)?.add(p.teacherId))))
        map.set(day, dailyMap);
    });
    return map;
  }, [classes]);

  const teacherBookingsMap = useMemo(() => {
    const bookings = new Map<string, { classNameEn: string, classNameUr: string }>(); // key: `${day}-${periodIndex}-${teacherId}`
    daysOfWeek.forEach(day => {
        for (let periodIndex = 0; periodIndex < 8; periodIndex++) {
            classes.forEach(c => {
                c.timetable[day]?.[periodIndex]?.forEach(p => {
                    const key = `${day}-${periodIndex}-${p.teacherId}`;
                    if (!bookings.has(key)) {
                        bookings.set(key, { classNameEn: c.nameEn, classNameUr: c.nameUr });
                    }
                });
            });
        }
    });
    return bookings;
  }, [classes]);

  const findAvailableTeachers = useCallback((periodIndex: number, period: Period): TeacherWithStatus[] => {
    if (!dayOfWeek) return [];
    
    const busyThroughSubstitution = new Set(dailyAdjustments.filter(adj => adj.periodIndex === periodIndex).map(adj => adj.substituteTeacherId));
    
    const allTeachersWithStatus = teachers
        .filter(t => !absentTeacherIds.includes(t.id))
        .map(teacher => {
            let status: SubstituteStatus;

            if (busyThroughSubstitution.has(teacher.id)) {
                status = { type: 'UNAVAILABLE', reason: 'SUBSTITUTION' };
            } else {
                const bookingKey = `${dayOfWeek}-${periodIndex}-${teacher.id}`;
                const booking = teacherBookingsMap.get(bookingKey);
                if (booking) {
                    status = { type: 'UNAVAILABLE', reason: 'DOUBLE_BOOK', conflictClass: { classNameEn: booking.classNameEn, classNameUr: booking.classNameUr } };
                } else {
                    const targetClass = classes.find(c => c.id === period.classId);
                    if (targetClass?.inCharge === teacher.id) {
                        status = { type: 'IN_CHARGE' };
                    } else if (targetClass?.subjects.some(s => s.teacherId === teacher.id)) {
                        status = { type: 'TEACHES_CLASS' };
                    } else {
                        status = { type: 'AVAILABLE' };
                    }
                }
            }
            return { teacher, status };
        });

    return allTeachersWithStatus.sort((a, b) => {
        const order: Record<SubstituteStatus['type'], number> = { 'IN_CHARGE': 1, 'TEACHES_CLASS': 2, 'AVAILABLE': 3, 'UNAVAILABLE': 4 };
        return order[a.status.type] - order[b.status.type];
    });
  }, [dayOfWeek, dailyAdjustments, absentTeacherIds, teachers, classes, teacherBookingsMap]);

    const handleTeacherSelectionChange = (teacherId: string, isChecked: boolean) => {
        const newTeacherIds = isChecked
            ? [...absentTeacherIds, teacherId]
            : absentTeacherIds.filter(id => id !== teacherId);
        onSelectionChange(prev => ({ ...prev, teacherIds: newTeacherIds }));

        const newDetails = { ...absenteeDetails };
        if (isChecked) {
            if (!newDetails[teacherId]) {
                newDetails[teacherId] = { leaveType: 'full', startPeriod: 1 };
            }
        } else {
            delete newDetails[teacherId];
        }
        setAbsenteeDetails(newDetails);
        onSetLeaveDetails(selectedDate, newDetails);
    };

    const handleDetailChange = (teacherId: string, detail: Partial<LeaveDetails>) => {
        const newDetails = {
            ...absenteeDetails,
            [teacherId]: {
                ...(absenteeDetails[teacherId] || { leaveType: 'full', startPeriod: 1 }),
                ...detail
            }
        };
        setAbsenteeDetails(newDetails);
        onSetLeaveDetails(selectedDate, newDetails);
    };

  const handleSubstituteChange = (group: SubstitutionGroup, substituteTeacherId: string) => {
    if (!dayOfWeek) return;

    const availableTeachersList = findAvailableTeachers(group.periodIndex, group.period);
    const selectedTeacherInfo = availableTeachersList.find(t => t.teacher.id === substituteTeacherId);

    let conflictDetails: Adjustment['conflictDetails'];
    if (substituteTeacherId && selectedTeacherInfo?.status.type === 'UNAVAILABLE' && selectedTeacherInfo.status.reason === 'DOUBLE_BOOK') {
        conflictDetails = selectedTeacherInfo.status.conflictClass;
    }

    const { absentTeacher, periodIndex, combinedClassIds } = group;
    let newAdjustments = dailyAdjustments.filter(adj => 
        !(adj.periodIndex === periodIndex && adj.originalTeacherId === absentTeacher.id)
    );
    if (substituteTeacherId) {
        combinedClassIds.forEach(classId => {
            const periodInClass = classes.find(c => c.id === classId)?.timetable[dayOfWeek]?.[periodIndex].find(p => p.teacherId === absentTeacher.id || (p.jointPeriodId && group.period.jointPeriodId === p.jointPeriodId));
            if (periodInClass) {
                newAdjustments.push({
                    id: `${selectedDate}-${dayOfWeek}-${periodIndex}-${classId}-${absentTeacher.id}`,
                    classId,
                    subjectId: periodInClass.subjectId,
                    originalTeacherId: absentTeacher.id,
                    substituteTeacherId: substituteTeacherId,
                    day: dayOfWeek,
                    periodIndex,
                    conflictDetails: conflictDetails
                });
            }
        });
    }
    setDailyAdjustments(newAdjustments);
    onSetAdjustments(selectedDate, newAdjustments);
  };
  
  const handleSaveAdjustments = () => {
    onSetAdjustments(selectedDate, dailyAdjustments);
    alert(t.saveAdjustments);
  };
  
    const handleCancelAlternativeTimetable = () => {
        openConfirmation(
            t.cancelAlternativeTimetable,
            t.cancelAlternativeTimetableConfirm,
            () => {
                onSetAdjustments(selectedDate, []);
                onSetLeaveDetails(selectedDate, {});
            }
        );
    };

  const handleWhatsAppNotify = (adjustment: Adjustment) => {
    const substitute = teachers.find(t => t.id === adjustment.substituteTeacherId);
    const originalTeacher = teachers.find(t => t.id === adjustment.originalTeacherId);
    const schoolClass = classes.find(c => c.id === adjustment.classId);
    const subject = subjects.find(s => s.id === adjustment.subjectId);

    if (!substitute?.contactNumber) {
        alert("Substitute's contact number not found.");
        return;
    }
    if (!originalTeacher || !schoolClass || !subject) {
        alert("Could not generate message due to missing data.");
        return;
    }
    
    const date = new Date(selectedDate);
    const dayOfWeekStr = date.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'long' });

    let message;
    if (adjustment.conflictDetails) {
        message = t.substituteNotificationMessageDoubleBook
            .replace('{teacherName}', language === 'ur' ? substitute.nameUr : substitute.nameEn)
            .replace('{date}', date.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US'))
            .replace('{dayOfWeek}', dayOfWeekStr)
            .replace('{period}', String(adjustment.periodIndex + 1))
            .replace('{className}', language === 'ur' ? schoolClass.nameUr : schoolClass.nameEn)
            .replace('{subjectName}', language === 'ur' ? subject.nameUr : subject.nameEn)
            .replace('{originalTeacherName}', language === 'ur' ? originalTeacher.nameUr : originalTeacher.nameEn)
            .replace('{conflictClassName}', language === 'ur' ? adjustment.conflictDetails.classNameUr : adjustment.conflictDetails.classNameEn);
    } else {
        message = t.notificationTemplateDefault
            .replace('{teacherName}', language === 'ur' ? substitute.nameUr : substitute.nameEn)
            .replace('{date}', date.toLocaleDateString(language === 'ur' ? 'ur-PK' : 'en-US'))
            .replace('{dayOfWeek}', dayOfWeekStr)
            .replace('{period}', String(adjustment.periodIndex + 1))
            .replace('{className}', language === 'ur' ? schoolClass.nameUr : schoolClass.nameEn)
            .replace('{subjectName}', language === 'ur' ? subject.nameUr : subject.nameEn)
            .replace('{originalTeacherName}', language === 'ur' ? originalTeacher.nameUr : originalTeacher.nameEn);
    }

    let phoneNumber = substitute.contactNumber.replace(/\D/g, '');
    if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
    const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const generateAdjustmentsHtml = (lang: DownloadLanguage, fontSize: number): string => {
    const { en: enT, ur: urT } = translations;
    const renderText = (en: string, ur: string) => (lang === 'en' ? en : (lang === 'ur' ? `<span class="font-urdu">${ur}</span>` : `${en} / <span class="font-urdu">${ur}</span>`));
    const renderHeaderText = (en: string, ur: string) => (lang === 'ur' ? `<span class="font-urdu">${ur}</span>` : (lang === 'en' ? en : `${en} / <span class="font-urdu">${ur}</span>`));
    const renderTitleText = (en: string, ur: string) => (lang === 'ur' ? `<span class="font-urdu">${ur}</span>` : en);

    const groupedByOnLeave: Record<string, Adjustment[]> = dailyAdjustments.reduce((acc, adj) => {
        (acc[adj.originalTeacherId] = acc[adj.originalTeacherId] || []).push(adj);
        return acc;
    }, {} as Record<string, Adjustment[]>);

    const tableRows = Object.entries(groupedByOnLeave).map(([onLeaveId, adjs]) => {
        adjs.sort((a,b)=> a.periodIndex - b.periodIndex);
        return adjs.map((adj, index) => {
            const onLeaveTeacher = teachers.find(t => t.id === onLeaveId);
            const subTeacher = teachers.find(t => t.id === adj.substituteTeacherId);
            const schoolClass = classes.find(c => c.id === adj.classId);
            const subject = subjects.find(s => s.id === adj.subjectId);
            const onLeaveCell = index === 0 ? `<td rowspan="${adjs.length}">${onLeaveTeacher ? renderText(onLeaveTeacher.nameEn, onLeaveTeacher.nameUr) : ''}</td>` : '';
            return `<tr> ${onLeaveCell} <td class="adj-period-index">${adj.periodIndex + 1}</td> <td>${schoolClass ? renderText(schoolClass.nameEn, schoolClass.nameUr) : ''}</td> <td>${subject ? renderText(subject.nameEn, subject.nameUr) : ''}</td> <td class="adj-substitute-name">${subTeacher ? renderText(subTeacher.nameEn, subTeacher.nameUr) : ''}</td> <td></td> </tr>`;
        }).join('');
    }).join('');
    
    const formattedDate = new Date(selectedDate).toLocaleDateString(lang === 'ur' ? 'ur-PK' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', ...(lang === 'ur' && { numberingSystem: 'arab' }) });
    const absentTeachersList = absentTeachers.map(t => renderText(t.nameEn, t.nameUr)).join(', ');

    return `<div class="print-container" style="font-size: ${fontSize}%"> <style>${getPrintStyles()}</style> <div class="page-portrait" dir="${lang === 'ur' ? 'rtl' : 'ltr'}"> ${schoolConfig.schoolLogoBase64 ? `<img src="${schoolConfig.schoolLogoBase64}" alt="Watermark" class="watermark" />` : ''} <div class="content-wrapper"> <header class="adj-page-header"> <h1 class="adj-title">${renderHeaderText(enT.substitution, urT.substitution)}</h1> <p class="adj-date">${formattedDate}</p> </header> <main class="main-content"> <p class="adj-absent-teachers"><strong>${renderHeaderText(enT.absentTeachers, urT.absentTeachers)}:</strong> ${absentTeachersList}</p> <div class="adj-table-wrapper"> <table class="adj-table" dir="${lang === 'ur' ? 'rtl' : 'ltr'}"> <thead><tr> <th class="col-on-leave">${renderHeaderText(enT.absent, urT.absent)}</th> <th class="col-period">${renderHeaderText(enT.lesson, urT.lesson)}</th> <th class="col-class">${renderHeaderText(enT.class, urT.class)}</th> <th class="col-subject">${renderHeaderText(enT.subject, urT.subject)}</th> <th class="col-substitute">${renderHeaderText(enT.substitutes, urT.substitutes)}</th> <th class="col-signature">${renderHeaderText(enT.signature, urT.signature)}</th> </tr></thead> <tbody>${tableRows}</tbody> </table> </div> </main> <footer class="footer"> <div><strong>Mr. 🇵🇰</strong></div> <div class="footer-signature">${renderTitleText(enT.signature, urT.signature)} ______________</div> </footer> </div> </div> </div>`;
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        <PrintPreview t={t} isOpen={isPrintPreviewOpen} onClose={() => setIsPrintPreviewOpen(false)} title={t.substitutionsByOnLeave} fileNameBase={`Substitutions_${selectedDate}`} generateHtml={(lang, fontSize) => generateAdjustmentsHtml(lang, fontSize)} />
        
        <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <h2 className="text-3xl font-bold text-[var(--text-primary)]">{t.dailyAdjustments}</h2>
            <div className="flex items-center gap-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-2 shadow-sm">
                <label htmlFor="date-select" className="text-sm font-medium text-[var(--text-secondary)]">{t.selectDate}</label>
                <input type="date" id="date-select" value={selectedDate} onChange={(e) => onSelectionChange(prev => ({...prev, date: e.target.value}))} className="bg-transparent border-none text-[var(--text-primary)] focus:ring-0" style={{fontFamily:'monospace'}}/>
                <button onClick={() => setIsPrintPreviewOpen(true)} title={t.print} className="p-2 text-[var(--text-primary)] bg-[var(--accent-secondary)] rounded-md hover:bg-[var(--accent-secondary-hover)]"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg></button>
            </div>
        </div>

        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] mb-8 overflow-hidden">
            <button className="w-full flex justify-between items-center p-6 text-left" onClick={() => setIsTeacherSelectionOpen(!isTeacherSelectionOpen)}>
                <h3 className="text-lg font-bold text-[var(--text-primary)]">{t.teacherOnLeave}</h3>
                <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isTeacherSelectionOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </button>
            <div className={`grid transition-all duration-300 ${isTeacherSelectionOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="p-6 pt-0">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {teachers.map(teacher => (
                            <label key={teacher.id} className="flex items-center space-x-2 p-2 rounded-md hover:bg-[var(--bg-tertiary)] cursor-pointer border border-transparent has-[:checked]:bg-[var(--accent-secondary)] has-[:checked]:border-[var(--accent-primary)] transition-all">
                                <input type="checkbox" checked={absentTeacherIds.includes(teacher.id)} onChange={e => handleTeacherSelectionChange(teacher.id, e.target.checked)} className="form-checkbox h-4 w-4 text-[var(--accent-primary)] rounded focus:ring-offset-0 focus:ring-1"/>
                                <span className="text-[var(--text-primary)] text-sm truncate">{teacher.nameEn} <span className="font-urdu">/ {teacher.nameUr}</span></span>
                            </label>
                        ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {absentTeachers.length > 0 ? (
        <div className="space-y-4">
            {absentTeachers.map(teacher => {
                const isExpanded = expandedTeacherIds.has(teacher.id);
                const groupsForTeacher = substitutionGroups.filter(g => g.absentTeacher.id === teacher.id);
                return (
                <div key={teacher.id} className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)] overflow-hidden">
                    <button
                        onClick={() => toggleTeacherExpansion(teacher.id)}
                        className="w-full flex justify-between items-center p-4 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
                        aria-expanded={isExpanded}
                        aria-controls={`teacher-schedule-${teacher.id}`}
                    >
                        <h3 className="text-xl font-bold">
                            <span className="px-3 py-1 rounded-md" style={{ backgroundColor: 'var(--subject-red-bg)', color: 'var(--subject-red-text)' }}>
                                {teacher.nameEn} <span className="font-urdu">/ {teacher.nameUr}</span>
                            </span>
                        </h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-6 w-6 transform transition-transform text-[var(--text-secondary)] ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                    </button>
                    <div
                        id={`teacher-schedule-${teacher.id}`}
                        className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
                    >
                        <div className="overflow-hidden">
                            <div className="p-6 pt-2 space-y-6">
                                <div className="flex items-center justify-end gap-4 text-sm text-[var(--text-secondary)] bg-[var(--bg-tertiary)] p-2 rounded-lg">
                                    <span className="font-semibold">{t.leaveDetails}:</span>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`leave-type-${teacher.id}`} value="full" checked={absenteeDetails[teacher.id]?.leaveType === 'full'} onChange={() => handleDetailChange(teacher.id, { leaveType: 'full' })} className="form-radio text-[var(--accent-primary)]"/> {t.fullDay}</label>
                                    <label className="flex items-center gap-1 cursor-pointer"><input type="radio" name={`leave-type-${teacher.id}`} value="half" checked={absenteeDetails[teacher.id]?.leaveType === 'half'} onChange={() => handleDetailChange(teacher.id, { leaveType: 'half' })} className="form-radio text-[var(--accent-primary)]"/> {t.halfDay}</label>
                                    {absenteeDetails[teacher.id]?.leaveType === 'half' && ( <div className="flex items-center gap-1"> <label htmlFor={`from-period-${teacher.id}`}>{t.fromPeriod}</label><select id={`from-period-${teacher.id}`} value={absenteeDetails[teacher.id]?.startPeriod} onChange={e => handleDetailChange(teacher.id, { startPeriod: parseInt(e.target.value) })} className="text-sm bg-white border-gray-300 rounded p-1 focus:ring-1 focus:ring-[var(--accent-primary)]"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option><option value="5">5</option><option value="6">6</option><option value="7">7</option><option value="8">8</option></select></div> )}
                                </div>
                                <div className="space-y-4">
                                {groupsForTeacher.length > 0 ? groupsForTeacher.map(group => {
                                    const availableTeachersList = findAvailableTeachers(group.periodIndex, group.period);
                                    const currentAdjustment = dailyAdjustments.find(adj => adj.periodIndex === group.periodIndex && adj.originalTeacherId === group.absentTeacher.id && adj.classId === group.period.classId);
                                    const selectedSubstitute = teachers.find(t => t.id === currentAdjustment?.substituteTeacherId);
                                    return (
                                    <div key={`${group.period.id}-${group.periodIndex}`} className="p-4 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-secondary)] grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="flex flex-col items-center justify-center bg-[var(--accent-secondary)] text-[var(--accent-primary)] rounded-lg w-16 h-16 flex-shrink-0">
                                                <span className="text-xs">{t.period}</span>
                                                <span className="font-bold text-2xl">{group.periodIndex + 1}</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-lg leading-tight text-[var(--text-primary)]">{group.subjectInfo.en} <span className="font-urdu">/ {group.subjectInfo.ur}</span></p>
                                                <p className="text-sm text-[var(--text-secondary)]">{group.combinedClassNames.en} <span className="font-urdu">/ {group.combinedClassNames.ur}</span></p>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t.substituteTeacher}</label>
                                            <div className="flex items-center gap-2">
                                                <select value={currentAdjustment?.substituteTeacherId || ''} onChange={e => handleSubstituteChange(group, e.target.value)} className="block w-full px-3 py-2 bg-white border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]">
                                                    <option value="">{t.select}</option>
                                                    {availableTeachersList.map(({ teacher, status }) => {
                                                        let statusLabel = '';
                                                        const isUnavailable = status.type === 'UNAVAILABLE';
                                                        if (status.type === 'IN_CHARGE') { statusLabel = t.statusInCharge; } 
                                                        else if (status.type === 'TEACHES_CLASS') { statusLabel = t.statusTeachesClass; } 
                                                        else if (isUnavailable) {
                                                            if (status.reason === 'SUBSTITUTION') { statusLabel = `⚠️ (${t.substitution})`; } 
                                                            else if (status.reason === 'DOUBLE_BOOK') {
                                                                const className = language === 'ur' ? status.conflictClass.classNameUr : status.conflictClass.classNameEn;
                                                                statusLabel = `⚠️ ${t.doubleBook}: ${className}`;
                                                            }
                                                        }
                                                        return <option key={teacher.id} value={teacher.id} className={isUnavailable ? 'text-red-500 font-semibold' : ''}>{teacher.nameEn} {statusLabel}</option>
                                                    })}
                                                </select>
                                                {currentAdjustment && <button onClick={() => handleWhatsAppNotify(currentAdjustment)} className="p-2 text-white bg-green-500 rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-400"><WhatsAppIcon /></button>}
                                            </div>
                                            {selectedSubstitute && <p className="text-xs text-[var(--text-secondary)] mt-1">{t.contactNumber}: {selectedSubstitute.contactNumber}</p>}
                                            {currentAdjustment && currentAdjustment.conflictDetails && (
                                                <div className="text-xs text-red-600 mt-2 flex items-center gap-1 bg-red-100 p-2 rounded-md">
                                                    <DoubleBookedWarningIcon />
                                                    <span>
                                                        {t.doubleBookedIn.replace('{className}', language === 'ur' ? currentAdjustment.conflictDetails.classNameUr : currentAdjustment.conflictDetails.classNameEn)}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    )
                                }) : <p className="text-center text-[var(--text-secondary)]">{t.noClassesScheduled}</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                )
            })}
            <div className="mt-6 flex justify-end gap-4">
                <button onClick={handleCancelAlternativeTimetable} className="px-8 py-3 text-sm font-semibold text-red-700 bg-red-100 rounded-lg shadow-sm hover:bg-red-200">{t.cancelAlternativeTimetable}</button>
                <button onClick={handleSaveAdjustments} className="px-8 py-3 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)]">{t.saveAdjustments}</button>
            </div>
        </div>
        ) : (
            <div className="p-8 text-center bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)]">
                <p className="text-[var(--text-secondary)]">{t.teacherOnLeave}</p>
            </div>
        )}
    </div>
  );
};