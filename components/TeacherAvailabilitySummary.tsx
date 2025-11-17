import React, { useMemo } from 'react';
import type { TimetableGridData, Adjustment, JointPeriod } from '../types';

export interface WorkloadStats {
  dailyCounts: { [key: string]: number };
  weeklyPeriods: number;
  jointPeriodsCount: number;
  substitutionsTaken: number;
  leavesTaken: number;
  totalWorkload: number;
}

interface TeacherAvailabilitySummaryProps {
  t: any;
  workloadStats: WorkloadStats;
}

const days: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const TeacherAvailabilitySummary: React.FC<TeacherAvailabilitySummaryProps> = ({ t, workloadStats }) => {
  
  const getPeriodText = (count: number) => {
    return `${count} ${count === 1 ? t.period : t.periods}`;
  }

  return (
    <div className="bg-[var(--bg-secondary)] p-6 rounded-2xl shadow-lg border border-[var(--border-primary)]">
      <h3 className="text-xl font-bold mb-4 text-[var(--text-primary)] border-b border-[var(--border-primary)] pb-3">{t.workload}</h3>
      
      <div className="space-y-3 text-sm">
        {days.map((day) => (
          <div key={day} className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">{t[day.toLowerCase()]}</span>
            <span className="font-semibold text-[var(--text-primary)] bg-[var(--bg-tertiary)] px-2.5 py-1 rounded-md">
              {getPeriodText(workloadStats.dailyCounts[day.toLowerCase()])}
            </span>
          </div>
        ))}
        <hr className="!my-4 border-[var(--border-primary)]" />
        <div className="flex justify-between items-center font-bold text-md">
          <span className="text-[var(--text-primary)]">Total</span>
          <span className="text-[var(--accent-primary)] bg-[var(--accent-secondary)] px-3 py-1.5 rounded-md">
            {getPeriodText(workloadStats.weeklyPeriods)}
          </span>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-[var(--border-secondary)] space-y-3 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">{t.jointPeriods}</span>
            <span className="font-semibold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-md">{workloadStats.jointPeriodsCount}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">{t.substitutionsTaken}</span>
            <span className="font-semibold text-green-700 bg-green-100 px-2.5 py-1 rounded-md">+{workloadStats.substitutionsTaken}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[var(--text-secondary)]">{t.leavesTaken}</span>
            <span className="font-semibold text-red-700 bg-red-100 px-2.5 py-1 rounded-md">{workloadStats.leavesTaken > 0 ? `-${workloadStats.leavesTaken}` : 0}</span>
          </div>
          <hr className="!my-4 border-[var(--border-primary)]" />
          <div className="flex justify-between items-center font-bold text-md">
              <span className="text-[var(--text-primary)]">{t.totalWorkload}</span>
              <span className="text-gray-800 bg-gray-200 px-3 py-1.5 rounded-md">
                {getPeriodText(workloadStats.totalWorkload)}
              </span>
          </div>
      </div>
    </div>
  );
};

export default TeacherAvailabilitySummary;