import React, { useState, useMemo } from 'react';
import type { SchoolClass, Teacher, TimetableGridData, Subject } from '../types';

interface ClassCommunicationModalProps {
  t: any;
  isOpen: boolean;
  onClose: () => void;
  selectedClass: SchoolClass;
  inChargeTeacher: Teacher;
  subjects: Subject[];
  teachers: Teacher[];
}

const days: (keyof TimetableGridData)[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const ClassCommunicationModal: React.FC<ClassCommunicationModalProps> = ({
  t,
  isOpen,
  onClose,
  selectedClass,
  inChargeTeacher,
  subjects,
  teachers,
}) => {
  const [copyFeedback, setCopyFeedback] = useState('');

  const timetableMessage = useMemo(() => {
    let message = `*${t.classTimetable}: ${selectedClass.nameEn} / ${selectedClass.nameUr}*\n`;
    message += `*${t.classInCharge}: ${inChargeTeacher.nameEn} / ${inChargeTeacher.nameUr}*\n\n`;

    days.forEach(day => {
      const periodsForDay: { periodIndex: number, text: string }[] = [];
      for (let i = 0; i < 8; i++) {
        const slot = selectedClass.timetable[day]?.[i] || [];
        if (slot.length > 0) {
          const slotText = slot.map(period => {
            const subject = subjects.find(s => s.id === period.subjectId);
            const teacher = teachers.find(t => t.id === period.teacherId);
            return subject && teacher ? `${subject.nameEn} (${teacher.nameEn})` : '';
          }).filter(Boolean).join(' / ');
          
          if (slotText) {
            periodsForDay.push({ periodIndex: i, text: slotText });
          }
        }
      }

      if (periodsForDay.length > 0) {
        message += `*${t[day.toLowerCase()]}*\n`;
        periodsForDay.forEach(p => {
          message += `- P${p.periodIndex + 1}: ${p.text}\n`;
        });
        message += '\n';
      }
    });

    return message.trim();
  }, [selectedClass, inChargeTeacher, subjects, teachers, t]);

  const handleSendWhatsApp = () => {
    if (inChargeTeacher?.contactNumber) {
        let phoneNumber = inChargeTeacher.contactNumber.replace(/\D/g, '');
        if (phoneNumber.startsWith('0')) phoneNumber = '92' + phoneNumber.substring(1);
        const url = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(timetableMessage)}`;
        window.open(url, '_blank');
    } else {
        alert("In-charge teacher's contact number not found.");
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(timetableMessage).then(() => {
        setCopyFeedback(t.messagesCopied);
        setTimeout(() => setCopyFeedback(''), 2000);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[101]" onClick={onClose}>
      <div className="bg-[var(--bg-secondary)] rounded-xl shadow-2xl w-full max-w-lg h-[80vh] mx-4 flex flex-col" onClick={e => e.stopPropagation()}>
        <h3 className="text-xl font-bold p-5 border-b border-[var(--border-primary)] text-[var(--text-primary)]">
          {t.sendToInCharge}: {inChargeTeacher.nameEn}
        </h3>
        <div className="flex-grow p-5 overflow-y-auto bg-[var(--bg-tertiary)]">
          <pre className="text-sm text-[var(--text-primary)] whitespace-pre-wrap font-sans">
            {timetableMessage}
          </pre>
        </div>
        <div className="flex-shrink-0 p-4 border-t border-[var(--border-primary)] flex justify-end items-center gap-3">
            <span className="text-sm text-green-600 transition-opacity">{copyFeedback}</span>
            <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded-lg hover:bg-[var(--accent-secondary-hover)]">{t.close}</button>
            <button onClick={handleCopy} className="px-4 py-2 text-sm font-semibold bg-gray-500 text-white rounded-lg hover:bg-gray-600">{t.copyMessage}</button>
            <button onClick={handleSendWhatsApp} className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 4.316 1.905 6.03l-.419 1.533 1.519-.4zM15.53 17.53c-.07-.121-.267-.202-.56-.347-.297-.146-1.758-.868-2.031-.967-.272-.099-.47-.146-.669.146-.199.293-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.15-1.255-.463-2.39-1.475-1.134-1.012-1.31-1.36-1.899-2.258-.151-.231-.04-.355.043-.463.083-.107.185-.293.28-.439.095-.146.12-.245.18-.41.06-.164.03-.311-.015-.438-.046-.127-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.177-.008-.375-.01-1.04-.01h-.11c-.307.003-1.348-.043-1.348 1.438 0 1.482.791 2.906 1.439 3.82.648.913 2.51 3.96 6.12 5.368 3.61 1.408 3.61 1.054 4.258 1.034.648-.02 1.758-.715 2.006-1.413.248-.698.248-1.289.173-1.413z" /></svg>
                {t.sendViaWhatsApp}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ClassCommunicationModal;