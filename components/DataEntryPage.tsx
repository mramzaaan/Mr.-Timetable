
import React, { useState } from 'react';
import type { DataEntryTab, Subject, Teacher, SchoolClass, JointPeriod } from '../types';
import AddSubjectForm from './AddSubjectForm';
import AddTeacherForm from './AddTeacherForm';
import AddClassForm from './AddClassForm';
import AddJointPeriodForm from './AddJointPeriodForm';

interface DataEntryPageProps {
  t: any;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  jointPeriods: JointPeriod[];
  onAddSubject: (subject: Subject) => void;
  onUpdateSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
  onSetClasses: (classes: SchoolClass[]) => void;
  onDeleteClass: (classId: string) => void;
  onAddJointPeriod: (jp: JointPeriod) => void;
  onUpdateJointPeriod: (jp: JointPeriod) => void;
  onDeleteJointPeriod: (jpId: string) => void;
  activeTab: DataEntryTab;
  onTabChange: (tab: DataEntryTab) => void;
}

const DataEntryPage: React.FC<DataEntryPageProps> = ({ 
  t, subjects, teachers, classes, jointPeriods,
  onAddSubject, onUpdateSubject, onDeleteSubject, 
  onAddTeacher, onUpdateTeacher, onDeleteTeacher, 
  onSetClasses, onDeleteClass,
  onAddJointPeriod, onUpdateJointPeriod, onDeleteJointPeriod,
  activeTab, onTabChange
}) => {
  
  const renderTabContent = () => {
    switch (activeTab) {
      case 'class':
        return <AddClassForm t={t} subjects={subjects} teachers={teachers} classes={classes} onSetClasses={onSetClasses} onDeleteClass={onDeleteClass} />;
      case 'teacher':
        return <AddTeacherForm t={t} teachers={teachers} onAddTeacher={onAddTeacher} onUpdateTeacher={onUpdateTeacher} onDeleteTeacher={onDeleteTeacher} />;
      case 'subject':
        return <AddSubjectForm t={t} subjects={subjects} onAddSubject={onAddSubject} onUpdateSubject={onUpdateSubject} onDeleteSubject={onDeleteSubject} />;
      case 'jointPeriods':
        return <AddJointPeriodForm t={t} jointPeriods={jointPeriods} teachers={teachers} classes={classes} subjects={subjects} onAddJointPeriod={onAddJointPeriod} onUpdateJointPeriod={onUpdateJointPeriod} onDeleteJointPeriod={onDeleteJointPeriod} />;
      default:
        return null;
    }
  };

  const TabButton: React.FC<{ tabName: DataEntryTab; label: string }> = ({ tabName, label }) => (
    <button
      onClick={() => onTabChange(tabName)}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        activeTab === tabName
          ? 'bg-[var(--accent-primary)] text-[var(--accent-text)]'
          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:bg-[var(--accent-secondary-hover)]'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-6">{t.dataEntry}</h2>

        <div className="flex space-x-2 border-b border-[var(--border-primary)] pb-4 mb-6">
          <TabButton tabName="teacher" label={t.addTeacher} />
          <TabButton tabName="subject" label={t.addSubject} />
          <TabButton tabName="class" label={t.addClass} />
          <TabButton tabName="jointPeriods" label={t.jointPeriods} />
        </div>
        <div>{renderTabContent()}</div>
      </div>
    </div>
  );
};

export default DataEntryPage;
