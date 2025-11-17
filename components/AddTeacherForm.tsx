import React, { useState, useEffect, useRef } from 'react';
import type { Teacher } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddTeacherFormProps {
  t: any;
  teachers: Teacher[];
  onAddTeacher: (teacher: Teacher) => void;
  onUpdateTeacher: (teacher: Teacher) => void;
  onDeleteTeacher: (teacherId: string) => void;
}

const AddTeacherForm: React.FC<AddTeacherFormProps> = ({ t, teachers, onAddTeacher, onUpdateTeacher, onDeleteTeacher }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [designation, setDesignation] = useState('');
  const [qualification, setQualification] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (editingTeacher) {
        setNameEn(editingTeacher.nameEn);
        setNameUr(editingTeacher.nameUr);
        setDesignation(editingTeacher.designation);
        setQualification(editingTeacher.qualification);
        setContactNumber(editingTeacher.contactNumber || '');
    } else {
        setNameEn('');
        setNameUr('');
        setDesignation('');
        setQualification('');
        setContactNumber('');
    }
  }, [editingTeacher]);

  const handleEditClick = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingTeacher(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameUr || !designation || !qualification || !contactNumber) {
      alert('Please fill out all fields.');
      return;
    }

    if (editingTeacher) {
        onUpdateTeacher({ ...editingTeacher, nameEn, nameUr, designation, qualification, contactNumber });
        alert('Teacher updated successfully!');
        setEditingTeacher(null);
    } else {
        onAddTeacher({
            id: Date.now().toString(),
            nameEn,
            nameUr,
            designation,
            qualification,
            contactNumber,
        });
        alert('Teacher added successfully!');
        setNameEn('');
        setNameUr('');
        setDesignation('');
        setQualification('');
        setContactNumber('');
    }
  };

  const handleDelete = (teacher: Teacher) => {
    onDeleteTeacher(teacher.id);
  };

  return (
    <div>
        <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-[var(--bg-secondary)] rounded-lg shadow-md space-y-6 border border-[var(--border-primary)]">
            <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingTeacher ? t.edit : t.addTeacher}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                <label htmlFor="teacherNameEn" className="block text-sm font-medium text-[var(--text-secondary)]">{t.teacherNameEn}</label>
                <input
                    type="text"
                    id="teacherNameEn"
                    value={nameEn}
                    onChange={(e) => setNameEn(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    required
                />
                </div>
                <div>
                <label htmlFor="teacherNameUr" className="block text-sm font-medium text-[var(--text-secondary)]">{t.teacherNameUr}</label>
                <input
                    type="text"
                    id="teacherNameUr"
                    value={nameUr}
                    onChange={(e) => setNameUr(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm font-urdu"
                    dir="rtl"
                    placeholder="مثلاً سمیع اللہ"
                    required
                />
                </div>
                <div>
                <label htmlFor="designation" className="block text-sm font-medium text-[var(--text-secondary)]">{t.designation}</label>
                <input
                    type="text"
                    id="designation"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    required
                />
                </div>
                <div>
                <label htmlFor="qualification" className="block text-sm font-medium text-[var(--text-secondary)]">{t.qualification}</label>
                <input
                    type="text"
                    id="qualification"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    required
                />
                </div>
                 <div>
                <label htmlFor="contactNumber" className="block text-sm font-medium text-[var(--text-secondary)]">{t.contactNumber}</label>
                <input
                    type="tel"
                    id="contactNumber"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                    className="mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm"
                    placeholder="e.g., 0300-1234567"
                    required
                />
                </div>
            </div>
            <div className="flex justify-end space-x-4">
                {editingTeacher && (
                    <button type="button" onClick={handleCancelEdit} className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-lg hover:bg-[var(--accent-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
                        {t.cancel}
                    </button>
                )}
                <button type="submit" className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] transition-colors">
                    {editingTeacher ? t.update : t.save}
                </button>
            </div>
        </form>

        <div className="mt-10">
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.existingTeachers}</h3>
            <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)]">
                <ul className="divide-y divide-[var(--border-primary)]">
                    {teachers.map(teacher => (
                        <li key={teacher.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                            <SwipeableListItem
                                t={t}
                                item={teacher}
                                onEdit={handleEditClick}
                                onDelete={handleDelete}
                                renderContent={(t) => (
                                    <div className="flex-1">
                                        <p className="font-semibold text-[var(--text-primary)]">{t.nameEn} <span className="font-urdu">/ {t.nameUr}</span></p>
                                        <p className="text-sm text-[var(--text-secondary)]">{t.designation} - {t.qualification}</p>
                                        <p className="text-sm text-[var(--text-secondary)]">{t.contactNumber}</p>
                                        <p className="text-xs text-[var(--text-secondary)]">ID: {t.id}</p>
                                    </div>
                                )}
                            />
                        </li>
                    ))}
                </ul>
            </div>
      </div>
    </div>
  );
};

export default AddTeacherForm;
