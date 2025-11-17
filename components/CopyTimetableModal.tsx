import React, { useState, useEffect } from 'react';
import type { Language, SchoolClass, Subject, Teacher, TimetableGridData, Period } from '../types';
import { generateUniqueId } from '../types'; // Import the new utility

interface CopyTimetableModalProps {
  t: any; // Translation object
  isOpen: boolean;
  onClose: () => void;
  classes: SchoolClass[];
  subjects: Subject[];
  teachers: Teacher[];
  onUpdateClass: (updatedClass: SchoolClass) => void;
  sourceClassId: string; // The ID of the currently selected class
}

const days: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const periodLabels = ['1', '2', '3', '4', '5', '6', '7', '8'];

const CopyTimetableModal: React.FC<CopyTimetableModalProps> = ({
  t,
  isOpen,
  onClose,
  classes,
  subjects,
  teachers,
  onUpdateClass,
  sourceClassId,
}) => {
  const [selectedSourceClassId, setSelectedSourceClassId] = useState<string>(sourceClassId);
  const [selectedTargetClassIds, setSelectedTargetClassIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' | null }>({ message: '', type: null });

  useEffect(() => {
    if (isOpen) {
      setSelectedSourceClassId(sourceClassId);
      setSelectedTargetClassIds([]);
      setFeedback({ message: '', type: null });
    }
  }, [isOpen, sourceClassId]);

  if (!isOpen) return null;

  const sourceClass = classes.find(c => c.id === selectedSourceClassId);

  const handleTargetClassToggle = (classId: string, isChecked: boolean) => {
    setSelectedTargetClassIds(prev =>
      isChecked ? [...prev, classId] : prev.filter(id => id !== classId)
    );
  };

  const handleCopy = () => {
    if (!sourceClass) {
      setFeedback({ message: t.failedToCopyTimetable.replace('{reason}', t.selectSourceClass), type: 'error' });
      return;
    }

    if (selectedTargetClassIds.length === 0) {
      setFeedback({ message: t.failedToCopyTimetable.replace('{reason}', t.selectTargetClasses), type: 'error' });
      return;
    }

    let copiedCount = 0;
    let errors: string[] = [];

    selectedTargetClassIds.forEach(targetClassId => {
      const targetClass = classes.find(c => c.id === targetClassId);
      if (!targetClass) {
        errors.push(`Target class with ID ${targetClassId} not found.`);
        return;
      }

      const newTimetable: TimetableGridData = {
        Monday: Array.from({ length: 8 }, () => []),
        Tuesday: Array.from({ length: 8 }, () => []),
        Wednesday: Array.from({ length: 8 }, () => []),
        Thursday: Array.from({ length: 8 }, () => []),
        Friday: Array.from({ length: 8 }, () => []),
      };

      days.forEach(day => {
        periodLabels.forEach((_, periodIndex) => {
          const sourcePeriodsInSlot = sourceClass.timetable[day][periodIndex];
          sourcePeriodsInSlot.forEach(sourcePeriod => {
            const targetClassSubjectConfig = targetClass.subjects.find(
              cs => cs.subjectId === sourcePeriod.subjectId
            );

            if (targetClassSubjectConfig) {
              const newPeriod: Period = {
                id: generateUniqueId(), // Ensure new unique ID
                classId: targetClass.id,
                subjectId: sourcePeriod.subjectId,
                teacherId: targetClassSubjectConfig.teacherId, // Use target class's assigned teacher for this subject
              };
              newTimetable[day][periodIndex].push(newPeriod);
            }
          });
        });
      });

      onUpdateClass({ ...targetClass, timetable: newTimetable });
      copiedCount++;
    });

    if (copiedCount > 0) {
      setFeedback({ message: t.timetableCopiedSuccessfully.replace('{count}', copiedCount.toString()), type: 'success' });
      // Optionally close modal after a short delay
      setTimeout(onClose, 2000);
    } else {
      setFeedback({ message: t.failedToCopyTimetable.replace('{reason}', errors.join(', ') || 'No timetables were copied.'), type: 'error' });
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copyTimetableModalTitle"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-lg w-full mx-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="copyTimetableModalTitle" className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">
          {t.copyTimetable}
        </h3>

        <div className="space-y-5">
          <div>
            <label htmlFor="source-class-select" className="block text-md font-semibold text-[var(--text-secondary)] mb-2">
              {t.sourceClass}
            </label>
            <select
              id="source-class-select"
              value={selectedSourceClassId}
              onChange={(e) => setSelectedSourceClassId(e.target.value)}
              className="block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
            >
              <option value="">{t.selectSourceClass}</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.nameEn} / {c.nameUr}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-md font-semibold text-[var(--text-secondary)] mb-2">
              {t.targetClasses}
            </label>
            <div className="max-h-48 overflow-y-auto border border-[var(--border-primary)] rounded-md p-3 bg-[var(--bg-tertiary)]">
              {classes
                .filter(c => c.id !== selectedSourceClassId)
                .map(c => (
                  <label key={c.id} className="flex items-center space-x-2 py-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      className="form-checkbox text-[var(--accent-primary)] rounded"
                      checked={selectedTargetClassIds.includes(c.id)}
                      onChange={(e) => handleTargetClassToggle(c.id, e.target.checked)}
                    />
                    <span className="text-[var(--text-primary)]">
                      {c.nameEn} / <span className="font-urdu">{c.nameUr}</span>
                    </span>
                  </label>
                ))}
            </div>
            {classes.filter(c => c.id !== selectedSourceClassId).length === 0 && (
                <p className="text-sm text-[var(--text-secondary)] mt-2">{t.noClassesAvailable}</p>
            )}
          </div>

          {feedback.message && (
            <div
              className={`p-3 rounded-md text-sm ${
                feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}
              role="alert"
            >
              {feedback.message}
            </div>
          )}

          <div className="flex justify-end gap-4 mt-8">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition"
            >
              {t.cancel}
            </button>
            <button
              onClick={handleCopy}
              disabled={!sourceClass || selectedTargetClassIds.length === 0}
              className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t.copy}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CopyTimetableModal;