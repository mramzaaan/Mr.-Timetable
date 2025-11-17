
import React, { useState, useEffect, useRef } from 'react';
import type { Subject } from '../types';
import { generateUniqueId } from '../types';
import SwipeableListItem from './SwipeableListItem';

interface AddSubjectFormProps {
  t: any;
  subjects: Subject[];
  onAddSubject: (subject: Subject) => void;
  onUpdateSubject: (subject: Subject) => void;
  onDeleteSubject: (subjectId: string) => void;
}

const AddSubjectForm: React.FC<AddSubjectFormProps> = ({ t, subjects, onAddSubject, onUpdateSubject, onDeleteSubject }) => {
  const [nameEn, setNameEn] = useState('');
  const [nameUr, setNameUr] = useState('');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  
  const formRef = useRef<HTMLFormElement>(null);

  const resetForm = () => {
    setNameEn('');
    setNameUr('');
  }

  useEffect(() => {
    if (editingSubject) {
      setNameEn(editingSubject.nameEn);
      setNameUr(editingSubject.nameUr);
    } else {
      resetForm();
    }
  }, [editingSubject]);

  const handleEditClick = (subject: Subject) => {
    setEditingSubject(subject);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleCancelEdit = () => {
    setEditingSubject(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameEn || !nameUr) {
      alert('Please fill out the primary subject name fields.');
      return;
    }

    const trimmedNameEn = nameEn.trim();
    const trimmedNameUr = nameUr.trim();

    const duplicateEn = subjects.find(
      s => s.nameEn.toLowerCase() === trimmedNameEn.toLowerCase() && s.id !== editingSubject?.id
    );

    if (duplicateEn) {
      alert(t.subjectNameEnExists);
      return;
    }

    const duplicateUr = subjects.find(
      s => s.nameUr === trimmedNameUr && s.id !== editingSubject?.id
    );

    if (duplicateUr) {
      alert(t.subjectNameUrExists);
      return;
    }
    
    const subjectData: Partial<Subject> = {
        nameEn: trimmedNameEn,
        nameUr: trimmedNameUr,
    };

    if (editingSubject) {
        onUpdateSubject({ ...editingSubject, ...subjectData });
        alert('Subject updated successfully!');
        setEditingSubject(null);
    } else {
        onAddSubject({
            id: generateUniqueId(),
            ...subjectData,
        } as Subject);
        alert('Subject added successfully!');
        resetForm();
    }
  };

  const handleDelete = (subject: Subject) => {
    onDeleteSubject(subject.id);
  };

  const inputStyleClasses = "mt-1 block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)] sm:text-sm";
  
  return (
    <div>
      <form ref={formRef} onSubmit={handleSubmit} className="p-6 bg-[var(--bg-secondary)] rounded-lg shadow-md space-y-6 border border-[var(--border-primary)]">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">{editingSubject ? t.edit : t.addSubject}</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="subjectNameEn" className="block text-sm font-medium text-[var(--text-secondary)]">{t.subjectNameEn}</label>
            <input
              type="text"
              id="subjectNameEn"
              value={nameEn}
              onChange={(e) => setNameEn(e.target.value)}
              className={inputStyleClasses}
              required
            />
          </div>
          <div>
            <label htmlFor="subjectNameUr" className="block text-sm font-medium text-[var(--text-secondary)]">{t.subjectNameUr}</label>
            <input
              type="text"
              id="subjectNameUr"
              value={nameUr}
              onChange={(e) => setNameUr(e.target.value)}
              className={`${inputStyleClasses} font-urdu`}
              dir="rtl"
              placeholder="مثلاً ریاضی"
              required
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
            {editingSubject && (
                 <button type="button" onClick={handleCancelEdit} className="px-6 py-2 bg-[var(--bg-tertiary)] text-[var(--text-primary)] font-semibold rounded-lg hover:bg-[var(--accent-secondary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition-colors">
                    {t.cancel}
                </button>
            )}
            <button type="submit" className="px-6 py-2 bg-[var(--accent-primary)] text-[var(--accent-text)] font-semibold rounded-lg shadow-md hover:bg-[var(--accent-primary-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)] transition-colors">
            {editingSubject ? t.update : t.save}
            </button>
        </div>
      </form>

      <div className="mt-10">
        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-4">{t.existingSubjects}</h3>
        <div className="bg-[var(--bg-secondary)] rounded-lg shadow-md border border-[var(--border-primary)]">
            <ul className="divide-y divide-[var(--border-primary)]">
                {subjects.map(subject => (
                    <li key={subject.id} className="hover:bg-[var(--bg-tertiary)] transition-colors">
                        <SwipeableListItem
                            t={t}
                            item={subject}
                            onEdit={handleEditClick}
                            onDelete={handleDelete}
                            renderContent={(s) => {
                                return (
                                    <div className="flex-1">
                                        <p className="font-semibold text-[var(--text-primary)]">
                                            {s.nameEn} <span className="font-urdu">/ {s.nameUr}</span>
                                        </p>
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

export default AddSubjectForm;
