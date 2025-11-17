

import React, { useState, useEffect, useRef } from 'react';
import type { SchoolClass, Subject, Teacher, ClassSubject, TimetableGridData, GroupSet, Group } from '../types';
import { generateUniqueId } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddClassFormProps {
  t: any;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  onSetClasses: (classes: SchoolClass[]) => void;
  onDeleteClass: (classId: string) => void;
}

const daysOfWeek: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const createEmptyTimetable = (): TimetableGridData => ({
  Monday: Array.from({ length: 8 }, () => []),
  Tuesday: Array.from({ length: 8 }, () => []),
  Wednesday: Array.from({ length: 8 }, () => []),
  Thursday: Array.from({ length: 8 }, () => []),
  Friday: Array.from({ length: 8 }, () => []),
});

const AddClassForm: React.FC<AddClassFormProps> = ({ t, subjects, teachers, classes, onSetClasses, onDeleteClass }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [category, setCategory] = useState<'High' | 'Middle' | 'Primary' | ''>('');
  const [inCharge, setInCharge] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [studentCount, setStudentCount] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<ClassSubject[]>([]);
  const [groupSets, setGroupSets] = useState<GroupSet[]>([]);
  const [editingClass, setEditingClass] = useState<SchoolClass | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = () => {
    setNameEn('');
    setNameUr('');
    setCategory('');
    setInCharge('');
    setRoomNumber('');
    setStudentCount('');
    setSelectedSubjects([]);
    setGroupSets([]);
  };

  useEffect(() => {
    if (editingClass) {
        setNameEn(editingClass.nameEn);
        setNameUr(editingClass.nameUr);
        setCategory(editingClass.category || '');
        setInCharge(editingClass.inCharge);
        setRoomNumber(editingClass.roomNumber);
        setStudentCount(String(editingClass.studentCount));
        setSelectedSubjects(editingClass.subjects);
        setGroupSets(editingClass.groupSets || []);
    } else {
        resetForm();
    }
  }, [editingClass, classes]);

  const handleEditClick = (schoolClass: SchoolClass) => {
    setEditingClass(schoolClass);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingClass(null);
  };

  const handleSubjectToggle = (subjectId: string, isChecked: boolean) => {
    if (isChecked) {
      setSelectedSubjects(prev => [...prev, { subjectId, periodsPerWeek: 1, teacherId: '' }]);
    } else {
      setSelectedSubjects(prev => prev.filter(s => s.subjectId !== subjectId));
    }
  };

  const handleSubjectDetailChange = (subjectId: string, field: keyof ClassSubject, value: string | number) => {
    setSelectedSubjects(prev => prev.map(s => {
      if (s.subjectId === subjectId) {
        const updatedSubject = { ...s, [field]: value === '' ? undefined : value };
        if (field === 'groupSetId' && value === '') {
          delete updatedSubject.groupId;
        }
        return updatedSubject;
      }
      return s;
    }));
  };
  
  const handleAddGroupSet = () => setGroupSets(prev => [...prev, { id: generateUniqueId(), name: '', groups: [{ id: generateUniqueId(), name: '' }] }]);
  
  const handleDeleteGroupSet = (setId: string) => {
    setGroupSets(prev => prev.filter(gs => gs.id !== setId));
    // Also clean up any subjects assigned to this group set
    setSelectedSubjects(prev => prev.map(s => {
      if (s.groupSetId === setId) {
        const { groupSetId, groupId, ...rest } = s;
        return rest;
      }
      return s;
    }));
  };

  const handleGroupSetNameChange = (setId: string, name: string) => setGroupSets(prev => prev.map(gs => gs.id === setId ? { ...gs, name } : gs));
  const handleAddGroup = (setId: string) => setGroupSets(prev => prev.map(gs => gs.id === setId ? { ...gs, groups: [...gs.groups, { id: generateUniqueId(), name: '' }] } : gs));
  
  const handleDeleteGroup = (setId: string, groupId: string) => {
    setGroupSets(prev => prev.map(gs => 
      gs.id === setId 
      ? { ...gs, groups: gs.groups.filter(g => g.id !== groupId) } 
      : gs
    ));
    // Also clean up any subjects assigned to this specific group by reverting them to standard subjects.
    setSelectedSubjects(prev => prev.map(s => {
      if (s.groupSetId === setId && s.groupId === groupId) {
        const { groupSetId, groupId, ...rest } = s;
        return rest;
      }
      return s;
    }));
  };

  const handleGroupNameChange = (setId: string, groupId: string, name: string) => setGroupSets(prev => prev.map(gs => gs.id === setId ? { ...gs, groups: gs.groups.map(g => g.id === groupId ? { ...g, name } : g) } : gs));
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameUr || !category || !inCharge || !roomNumber || !studentCount) {
        alert('Please fill out all required class details.');
        return;
    }
    if (selectedSubjects.some(s => !s.teacherId)) {
        alert('Please assign a teacher to each selected subject.');
        return;
    }

    const classData: SchoolClass = {
        id: editingClass ? editingClass.id : generateUniqueId(),
        nameEn, nameUr, 
        category: category as 'High' | 'Middle' | 'Primary',
        inCharge, roomNumber,
        studentCount: parseInt(studentCount, 10),
        subjects: selectedSubjects,
        timetable: editingClass?.timetable || createEmptyTimetable(),
        groupSets: groupSets,
    };
    
    let updatedClasses = [...classes];
    const existingIndex = classes.findIndex(c => c.id === classData.id);
    if (existingIndex !== -1) {
      updatedClasses[existingIndex] = classData;
    } else {
      updatedClasses.push(classData);
    }
    onSetClasses(updatedClasses);
    alert(editingClass ? 'Class updated successfully!' : 'Class added successfully!');
    setEditingClass(null);
    resetForm();
  };
  
  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";
  const tableSelectStyle = "block w-full px-2 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";

  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-[var(--bg-secondary)] rounded-lg shadow-md space-y-8 border border-[var(--border-primary)]">
        <div>
          <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingClass ? t.edit : t.addClass}</h3>
          <p className="text-sm text-[var(--text-secondary)] mt-1">{t.classDetails}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="classNameEn" className="block text-sm font-medium text-[var(--text-secondary)]">{t.classNameEn}</label>
            <input type="text" id="classNameEn" value={nameEn} onChange={(e) => setNameEn(e.target.value)} className={inputStyleClasses} required />
          </div>
          <div>
            <label htmlFor="classNameUr" className="block text-sm font-medium text-[var(--text-secondary)]">{t.classNameUr}</label>
            <input type="text" id="classNameUr" value={nameUr} onChange={(e) => setNameUr(e.target.value)} className={`${inputStyleClasses} font-urdu`} dir="rtl" required />
          </div>
          <div>
            <label htmlFor="classCategory" className="block text-sm font-medium text-[var(--text-secondary)]">{t.category}</label>
            <select id="classCategory" value={category} onChange={(e) => setCategory(e.target.value as 'High' | 'Middle' | 'Primary' | '')} className={inputStyleClasses} required>
              <option value="">{t.select}</option>
              <option value="High">{t.high}</option>
              <option value="Middle">{t.middle}</option>
              <option value="Primary">{t.primary}</option>
            </select>
          </div>
          <div>
            <label htmlFor="classInCharge" className="block text-sm font-medium text-[var(--text-secondary)]">{t.classInCharge}</label>
            <select id="classInCharge" value={inCharge} onChange={(e) => setInCharge(e.target.value)} className={inputStyleClasses} required>
              <option value="">{t.selectTeacher}</option>
              {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.nameEn}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="roomNumber" className="block text-sm font-medium text-[var(--text-secondary)]">{t.roomNumber}</label>
            <input type="text" id="roomNumber" value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} className={inputStyleClasses} required />
          </div>
          <div>
            <label htmlFor="studentCount" className="block text-sm font-medium text-[var(--text-secondary)]">{t.studentCount}</label>
            <input type="number" id="studentCount" value={studentCount} onChange={(e) => setStudentCount(e.target.value)} className={inputStyleClasses} required />
          </div>
        </div>

        <div className="space-y-4 pt-6 border-t border-[var(--border-primary)]">
          <h4 className="text-lg font-bold text-[var(--text-primary)]">{t.classGroups}</h4>
          {groupSets.map((gs, gsIndex) => (
            <div key={gs.id} className="p-4 bg-[var(--bg-tertiary)] rounded-md border border-[var(--border-secondary)] space-y-3">
              <div className="flex items-center gap-4">
                <input value={gs.name} onChange={e => handleGroupSetNameChange(gs.id, e.target.value)} placeholder={t.groupSetName} className={`${inputStyleClasses} flex-grow`} />
                <button type="button" onClick={() => handleDeleteGroupSet(gs.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
              </div>
              <div className="pl-4 space-y-2">
                {gs.groups.map((g, gIndex) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <input value={g.name} onChange={e => handleGroupNameChange(gs.id, g.id, e.target.value)} placeholder={t.groupName} className={`${inputStyleClasses} flex-grow`} />
                    <button type="button" onClick={() => handleDeleteGroup(gs.id, g.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg></button>
                  </div>
                ))}
                <button type="button" onClick={() => handleAddGroup(gs.id)} className="text-sm text-[var(--accent-primary)] hover:underline mt-2">+ {t.addGroup}</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={handleAddGroupSet} className="text-sm font-semibold text-[var(--accent-primary)] hover:underline">+ {t.addGroupSet}</button>
        </div>

        <div className="space-y-2 pt-6 border-t border-[var(--border-primary)]">
          <h4 className="text-lg font-bold text-[var(--text-primary)]">{t.subjects}</h4>
          <div className="divide-y divide-[var(--border-primary)]">
            {subjects.map(subject => {
              const classSubject = selectedSubjects.find(s => s.subjectId === subject.id);
              return (
                <div key={subject.id} className="py-4">
                  <label className="flex items-center space-x-3 mb-3">
                    <input type="checkbox" checked={!!classSubject} onChange={(e) => handleSubjectToggle(subject.id, e.target.checked)} className="form-checkbox h-5 w-5 text-[var(--accent-primary)] rounded" />
                    <span className="text-[var(--text-primary)]">{subject.nameEn} <span className="font-urdu">/ {subject.nameUr}</span></span>
                  </label>
                  
                  {classSubject && (
                    <div className="pl-8 flex flex-wrap gap-x-4 gap-y-3 items-end">
                      <div className="flex-1 min-w-[70px] max-w-[90px]">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t.periodsPerWeek}</label>
                        <select value={classSubject.periodsPerWeek} onChange={(e) => handleSubjectDetailChange(subject.id, 'periodsPerWeek', parseInt(e.target.value, 10))} className={tableSelectStyle}>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      
                      <div className="flex-1 min-w-[130px]">
                        <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t.assignTeacher}</label>
                        <select value={classSubject.teacherId} onChange={(e) => handleSubjectDetailChange(subject.id, 'teacherId', e.target.value)} className={tableSelectStyle}>
                          <option value="">{t.select}</option>
                          {teachers.map(teacher => <option key={teacher.id} value={teacher.id}>{teacher.nameEn}</option>)}
                        </select>
                      </div>

                      <div className="flex-1 min-w-[180px] flex gap-2">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t.selectGroupSet}</label>
                          <select value={classSubject.groupSetId || ''} onChange={(e) => handleSubjectDetailChange(subject.id, 'groupSetId', e.target.value)} className={tableSelectStyle}>
                            <option value="">{t.noGroup}</option>
                            {groupSets.map(gs => <option key={gs.id} value={gs.id}>{gs.name}</option>)}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-[var(--text-secondary)] mb-1">{t.selectGroup}</label>
                          {classSubject.groupSetId && (
                            <select value={classSubject.groupId || ''} onChange={(e) => handleSubjectDetailChange(subject.id, 'groupId', e.target.value)} className={tableSelectStyle}>
                              <option value="">{t.selectGroup}</option>
                              {groupSets.find(gs => gs.id === classSubject.groupSetId)?.groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="flex justify-end space-x-4 pt-6 border-t border-[var(--border-primary)]">
          {editingClass && (
            <button type="button" onClick={handleCancelEdit} className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-lg hover:bg-[var(--accent-secondary-hover)]">{t.cancel}</button>
          )}
          <button type="submit" className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)]">{editingClass ? t.update : t.save}</button>
        </div>
      </form>

      <div className="mt-10">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.existingClasses}</h3>
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)]">
          <ul className="divide-y divide-[var(--border-primary)]">
            {classes.map(schoolClass => (
              <li key={schoolClass.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                <SwipeableListItem
                  t={t}
                  item={schoolClass}
                  onEdit={handleEditClick}
                  onDelete={(item) => onDeleteClass(item.id)}
                  renderContent={(c) => {
                    const inChargeTeacher = teachers.find(t => t.id === c.inCharge);
                    return (
                      <div>
                        <p className="font-semibold text-[var(--text-primary)]">{c.nameEn} <span className="font-urdu">/ {c.nameUr}</span></p>
                        <p className="text-sm text-[var(--text-secondary)]">
                          {c.category && <span className="font-semibold">{t[c.category.toLowerCase()]} | </span>}
                          {t.classInCharge}: {inChargeTeacher?.nameEn || c.inCharge}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)]">Subjects: {c.subjects.length}</p>
                      </div>
                    );
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AddClassForm;