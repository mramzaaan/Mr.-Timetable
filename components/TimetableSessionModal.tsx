import React, { useState, useEffect } from 'react';
import type { TimetableSession } from '../types';

interface TimetableSessionModalProps {
  t: any; // Translation object
  isOpen: boolean;
  onClose: () => void;
  session: TimetableSession | null; // Null for creation, object for editing
  onCreate: (name: string, startDate: string, endDate: string) => void;
  onUpdate: (id: string, name: string, startDate: string, endDate: string) => void;
  setFeedback: (feedback: { message: string; type: 'success' | 'error' | null }) => void;
}

const TimetableSessionModal: React.FC<TimetableSessionModalProps> = ({
  t,
  isOpen,
  onClose,
  session,
  onCreate,
  onUpdate,
  setFeedback,
}) => {
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (isOpen) {
      if (session) {
        setName(session.name);
        setStartDate(session.startDate);
        setEndDate(session.endDate);
      } else {
        setName('');
        setStartDate('');
        setEndDate('');
      }
    }
  }, [isOpen, session]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !startDate || !endDate) {
      setFeedback({ message: t.failedToCopyTimetable.replace('{reason}', 'Please fill all fields.'), type: 'error' });
      return;
    }

    if (session) {
      onUpdate(session.id, name, startDate, endDate);
      setFeedback({ message: t.sessionUpdatedSuccessfully.replace('{name}', name), type: 'success' });
    } else {
      onCreate(name, startDate, endDate);
      setFeedback({ message: t.sessionCreatedSuccessfully.replace('{name}', name), type: 'success' });
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 transition-opacity"
      role="dialog"
      aria-modal="true"
      aria-labelledby="timetableSessionModalTitle"
      onClick={onClose}
    >
      <div
        className="bg-[var(--bg-secondary)] p-6 sm:p-8 rounded-xl shadow-2xl max-w-lg w-full mx-4 transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <h3 id="timetableSessionModalTitle" className="text-xl sm:text-2xl font-bold mb-6 text-center text-[var(--text-primary)]">
          {session ? t.edit : t.createTimetableSession}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="session-name" className="block text-md font-semibold text-[var(--text-secondary)] mb-2">
              {t.timetableSessionName}
            </label>
            <input
              type="text"
              id="session-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              required
            />
          </div>

          <div>
            <label htmlFor="start-date" className="block text-md font-semibold text-[var(--text-secondary)] mb-2">
              {t.startDate}
            </label>
            <input
              type="date"
              id="start-date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              required
            />
          </div>

          <div>
            <label htmlFor="end-date" className="block text-md font-semibold text-[var(--text-secondary)] mb-2">
              {t.endDate}
            </label>
            <input
              type="date"
              id="end-date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="block w-full px-3 py-2 bg-[var(--bg-secondary)] border border-[var(--border-secondary)] rounded-md shadow-sm text-[var(--text-primary)] focus:outline-none focus:ring-[var(--accent-primary)] focus:border-[var(--accent-primary)]"
              required
            />
          </div>

          <div className="flex justify-end gap-4 mt-8">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 text-sm font-semibold text-[var(--text-secondary)] bg-[var(--bg-tertiary)] rounded-lg hover:bg-[var(--accent-secondary-hover)] transition"
            >
              {t.cancel}
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold text-white bg-[var(--accent-primary)] rounded-lg hover:bg-[var(--accent-primary-hover)] transition shadow-sm"
            >
              {session ? t.update : t.create}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimetableSessionModal;