

export type Language = 'en' | 'ur';
export type Page = 'home' | 'classTimetable' | 'teacherTimetable' | 'alternativeTimetable' | 'dataEntry' | 'settings';
export type DataEntryTab = 'class' | 'teacher' | 'subject' | 'jointPeriods';

export interface Subject {
  id: string;
  nameEn: string;
  nameUr: string;
  isPractical?: boolean;
  practicalSubjectId?: string;
}

export interface Teacher {
  id: string;
  nameEn: string;
  nameUr: string;
  designation: string;
  qualification: string;
  contactNumber: string;
}

export interface Group {
  id: string;
  name: string;
}

export interface GroupSet {
  id: string;
  name: string;
  groups: Group[];
}

export interface ClassSubject {
  subjectId: string;
  periodsPerWeek: number;
  teacherId: string;
  groupSetId?: string;
  groupId?: string;
  // FIX: Add optional combinedGroupId to support joint periods handled via CSV and timetable logic.
  combinedGroupId?: string;
}

export interface SchoolClass {
  id:string;
  nameEn: string;
  nameUr: string;
  category?: 'High' | 'Middle' | 'Primary';
  inCharge: string; // This will now be a Teacher ID
  roomNumber: string;
  studentCount: number;
  subjects: ClassSubject[];
  timetable: TimetableGridData;
  groupSets?: GroupSet[];
}

export interface Period {
  id: string; // Unique ID for each period instance, e.g., 'classId-subjectId-instanceNum'
  classId: string;
  subjectId: string;
  teacherId: string;
  jointPeriodId?: string; // Link back to the joint period definition
}

export type TimetableSlot = Period[]; // An array of periods for split-period support
export type TimetableDay = TimetableSlot[];

export interface TimetableGridData {
  Monday: TimetableDay;
  Tuesday: TimetableDay;
  Wednesday: TimetableDay;
  Thursday: TimetableDay;
  Friday: TimetableDay;
}

export interface Timetable {
  classes: { [classId: string]: TimetableGridData };
  teachers: { [teacherId: string]: TimetableGridData };
}

export interface Adjustment {
  // A unique key for this specific adjustment instance
  id: string; 
  classId: string;
  subjectId: string;
  originalTeacherId: string;
  substituteTeacherId: string;
  day: keyof TimetableGridData;
  periodIndex: number;
  conflictDetails?: {
    classNameEn: string;
    classNameUr: string;
  };
}

export type DownloadFormat = 'pdf-full' | 'pdf-summary' | 'excel';
export type DownloadLanguage = 'en' | 'ur' | 'both';

export const generateUniqueId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
};

// New interfaces for multi-timetable and school customization

export interface DownloadDesignConfig {
  logo: {
    size: number; // in px
    position: 'left' | 'center' | 'right';
  };
  schoolName: {
    fontSize: number; // in px
    fontWeight: 'normal' | 'bold';
    align: 'left' | 'center' | 'right';
  };
  headerDetails: { // Class name, teacher name etc.
    fontSize: number; // in px
    fontWeight: 'normal' | 'bold';
  };
  tableContent: {
    fontSize: number; // in px
  };
  headerBgColor: string; // hex color
  showFooter: boolean;
}

export interface DownloadDesigns {
  class: DownloadDesignConfig;
  teacher: DownloadDesignConfig;
  alternative: DownloadDesignConfig;
}

export interface SchoolConfig {
  schoolNameEn: string;
  schoolNameUr: string;
  schoolLogoBase64: string | null;
  downloadDesigns: DownloadDesigns;
}

export interface JointPeriodAssignment {
  classId: string;
  subjectId: string;
}

export interface JointPeriod {
  id: string;
  name: string;
  teacherId: string;
  periodsPerWeek: number;
  assignments: JointPeriodAssignment[];
}

export interface LeaveDetails {
  leaveType: 'full' | 'half';
  startPeriod: number;
}

export interface TimetableSession {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  jointPeriods: JointPeriod[];
  adjustments: Record<string, Adjustment[]>;
  leaveDetails?: Record<string, Record<string, LeaveDetails>>; // date -> teacherId -> details
}

export interface UserData {
  timetableSessions: TimetableSession[];
  schoolConfig: SchoolConfig;
}