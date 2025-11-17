

import type { Subject, Teacher, SchoolClass, TimetableGridData } from '../types';

// Helper to create an empty timetable
const createEmptyTimetable = (): TimetableGridData => ({
  Monday: Array.from({ length: 8 }, () => []),
  Tuesday: Array.from({ length: 8 }, () => []),
  Wednesday: Array.from({ length: 8 }, () => []),
  Thursday: Array.from({ length: 8 }, () => []),
  Friday: Array.from({ length: 8 }, () => []),
});

export const initialSubjects: Subject[] = [
  { id: 'subj-1', nameEn: 'MATH', nameUr: 'ریاضی' },
  { id: 'subj-2', nameEn: 'CHEMISTRY', nameUr: 'کیمسٹری', practicalSubjectId: 'subj-11' },
  { id: 'subj-3', nameEn: 'URDU', nameUr: 'اردو' },
  { id: 'subj-4', nameEn: 'ENGLISH', nameUr: 'انگریزی' },
  { id: 'subj-5', nameEn: 'PHYSICS', nameUr: 'فزکس', practicalSubjectId: 'subj-12' },
  { id: 'subj-6', nameEn: 'BIO', nameUr: 'بائیو', practicalSubjectId: 'subj-13' },
  { id: 'subj-7', nameEn: 'COMPUTER', nameUr: 'کمپیوٹر', practicalSubjectId: 'subj-14' },
  { id: 'subj-8', nameEn: 'QURAN', nameUr: 'قرآن پاک' },
  { id: 'subj-9', nameEn: 'PAK S.', nameUr: 'مطالعہ پاکستان' },
  { id: 'subj-10', nameEn: 'LESSON PLANING/CPD', nameUr: 'سبق کی منصوبہ بندی' },
  { id: 'subj-11', nameEn: 'Chem. Prac', nameUr: 'کیمسٹری عملی', isPractical: true },
  { id: 'subj-12', nameEn: 'phy. Prac.', nameUr: 'فزکس عملی', isPractical: true },
  { id: 'subj-13', nameEn: 'Bio Practica', nameUr: 'بائیو عملی', isPractical: true },
  { id: 'subj-14', nameEn: 'Computer Practical', nameUr: 'کمپیوٹر عملی', isPractical: true },
  { id: 'subj-15', nameEn: 'SPORTS', nameUr: 'کھیل' },
];

export const initialTeachers: Teacher[] = [
  { id: 'teach-1', nameEn: 'SAMEE ULLAH', nameUr: 'سمیع اللہ', designation: 'SST', qualification: 'M.Sc. Math', contactNumber: '0300-1111111' },
  { id: 'teach-2', nameEn: 'MIAN KASHIF', nameUr: 'میاں کاشف', designation: 'SST', qualification: 'M.Sc. Chemistry', contactNumber: '0300-2222222' },
  { id: 'teach-3', nameEn: 'KASHIF SHAH', nameUr: 'کاشف شاہ', designation: 'EST', qualification: 'M.A. Urdu', contactNumber: '0300-3333333' },
  { id: 'teach-4', nameEn: 'M. ASHRAF', nameUr: 'محمد اشرف', designation: 'SST', qualification: 'M.A. English', contactNumber: '0300-4444444' },
  { id: 'teach-5', nameEn: 'M. USMAN', nameUr: 'محمد عثمان', designation: 'SST', qualification: 'M.Sc. Physics', contactNumber: '0300-5555555' },
  { id: 'teach-6', nameEn: 'MAJID KHAN', nameUr: 'ماجد خان', designation: 'EST', qualification: 'M.Sc. Biology', contactNumber: '0300-6666666' },
  { id: 'teach-7', nameEn: 'KHAWAR ABBAS', nameUr: 'خاور عباس', designation: 'EST', qualification: 'M.Sc. CS', contactNumber: '0300-7777777' },
  { id: 'teach-8', nameEn: 'IJAZ SHAH', nameUr: 'اعجاز شاہ', designation: 'EST', qualification: 'M.A. Islamiat', contactNumber: '0300-8888888' },
  { id: 'teach-9', nameEn: 'ALTAF H AZAR', nameUr: 'الطاف حسین آذر', designation: 'SST', qualification: 'M.A. Pak Studies', contactNumber: '0300-9999999' },
];

// Pre-populate 10th M class based on the image
export const initialClasses: SchoolClass[] = [
    {
        id: 'class-10-m',
        nameEn: '10th M',
        nameUr: 'دہم ایم',
        inCharge: 'teach-1', // Set to Teacher ID
        roomNumber: '10',
        studentCount: 45,
        groupSets: [
            {
                id: '10m-sci-group',
                name: 'Science Group',
                groups: [
                    { id: '10m-bio', name: 'Biology Group' },
                    { id: '10m-comp', name: 'Computer Group' },
                ]
            }
        ],
        subjects: [
            { subjectId: 'subj-1', periodsPerWeek: 5, teacherId: 'teach-1' }, // MATH
            { subjectId: 'subj-2', periodsPerWeek: 4, teacherId: 'teach-2' }, // CHEMISTRY
            { subjectId: 'subj-11', periodsPerWeek: 1, teacherId: 'teach-2' },// Chem Prac
            { subjectId: 'subj-3', periodsPerWeek: 5, teacherId: 'teach-3' }, // URDU
            { subjectId: 'subj-4', periodsPerWeek: 5, teacherId: 'teach-4' }, // ENGLISH
            { subjectId: 'subj-5', periodsPerWeek: 4, teacherId: 'teach-5' }, // PHYSICS
            { subjectId: 'subj-12', periodsPerWeek: 1, teacherId: 'teach-5' },// Phy Prac
            { subjectId: 'subj-6', periodsPerWeek: 4, teacherId: 'teach-6', groupSetId: '10m-sci-group', groupId: '10m-bio' }, // BIO
            { subjectId: 'subj-13', periodsPerWeek: 1, teacherId: 'teach-6' },// Bio Prac
            { subjectId: 'subj-7', periodsPerWeek: 4, teacherId: 'teach-7', groupSetId: '10m-sci-group', groupId: '10m-comp' }, // COMPUTER
            { subjectId: 'subj-14', periodsPerWeek: 1, teacherId: 'teach-7' },// Comp Prac
            { subjectId: 'subj-8', periodsPerWeek: 4, teacherId: 'teach-8' }, // QURAN
            { subjectId: 'subj-9', periodsPerWeek: 5, teacherId: 'teach-9' }, // PAK S.
            { subjectId: 'subj-10', periodsPerWeek: 5, teacherId: 'teach-9' }, // Lesson Planning
            { subjectId: 'subj-15', periodsPerWeek: 2, teacherId: 'teach-1' }, // SPORTS
        ],
        timetable: createEmptyTimetable(),
    }
];