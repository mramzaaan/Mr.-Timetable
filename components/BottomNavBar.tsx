import React from 'react';
import type { Page } from '../types';

interface BottomNavBarProps {
  t: any;
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
}

// Icon components for clarity
const HomeIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>;
const DataEntryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>;
const ClassTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherTimetableIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const AdjustmentsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none" strokeLinecap="round" strokeLinejoin="round"><path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M4 4h4v4h-4z" /><path d="M14 4h4v4h-4z" /><path d="M4 14h4v4h-4z" /><path d="M14 14h4v4h-4z" /></svg>;
const SettingsIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0 3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;

const NavButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  const labelParts = label.split(' ');
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full h-full p-1 rounded-lg transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[var(--accent-primary)] focus:ring-offset-[var(--bg-secondary)] ${
        isActive 
          ? 'bg-[var(--accent-secondary)] text-[var(--accent-primary)] shadow-inner scale-95' 
          : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-md hover:shadow-lg hover:text-[var(--accent-primary)] hover:-translate-y-0.5 active:scale-95'
      }`}
    >
      {icon}
      <span className="text-xs text-center leading-tight mt-1">
          {labelParts[0]}
          {labelParts.length > 1 && <br />}
          {labelParts.slice(1).join(' ')}
      </span>
    </button>
  );
};


const BottomNavBar: React.FC<BottomNavBarProps> = ({ t, currentPage, setCurrentPage }) => {
  const navItems: { page: Page; labelKey: string; icon: React.ReactNode }[] = [
    { page: 'home', labelKey: 'home', icon: <HomeIcon /> },
    { page: 'dataEntry', labelKey: 'dataEntry', icon: <DataEntryIcon /> },
    { page: 'classTimetable', labelKey: 'classTimetable', icon: <ClassTimetableIcon /> },
    { page: 'teacherTimetable', labelKey: 'teacherTimetable', icon: <TeacherTimetableIcon /> },
    { page: 'alternativeTimetable', labelKey: 'adjustments', icon: <AdjustmentsIcon /> },
    { page: 'settings', labelKey: 'settings', icon: <SettingsIcon /> },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[var(--bg-secondary)] border-t border-[var(--border-primary)] shadow-[0_-2px_5px_rgba(0,0,0,0.05)] z-50 flex items-stretch justify-around p-2 gap-2 no-print">
      {navItems.map(item => (
        <NavButton
          key={item.page}
          label={t[item.labelKey]}
          icon={item.icon}
          isActive={currentPage === item.page}
          onClick={() => setCurrentPage(item.page)}
        />
      ))}
    </nav>
  );
};

export default BottomNavBar;
