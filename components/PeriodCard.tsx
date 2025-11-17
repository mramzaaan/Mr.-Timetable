import React, { useMemo } from 'react';
import type { Period, Language, Subject, Teacher, SchoolClass } from '../types';

interface PeriodCardProps {
  period: Period;
  onDragStart: () => void;
  onDragEnd?: () => void;
  onDeletePeriod?: () => void; // New prop for delete functionality
  isGhost?: boolean;
  colorName?: string;
  language: Language;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  displayContext: 'teacher' | 'class';
  isHighlighted?: boolean;
  isDimmed?: boolean;
  hasConflict?: boolean;
}

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);


const PeriodCard: React.FC<PeriodCardProps> = ({ period, onDragStart, onDragEnd, onDeletePeriod, isGhost, colorName, language, subjects, teachers, classes, displayContext, isHighlighted, isDimmed, hasConflict }) => {
  const subject = subjects.find(s => s.id === period.subjectId);
  const contextEntity = displayContext === 'teacher' 
    ? teachers.find(t => t.id === period.teacherId)
    : classes.find(c => c.id === period.classId);

  const schoolClass = classes.find(c => c.id === period.classId);
  const classSubject = schoolClass?.subjects.find(s => s.subjectId === period.subjectId);
  
  const groupInfo = useMemo(() => {
    if (!schoolClass || !classSubject?.groupSetId || !classSubject.groupId) {
        return null;
    }
    const set = schoolClass.groupSets?.find(s => s.id === classSubject.groupSetId);
    const group = set?.groups.find(g => g.id === classSubject.groupId);
    if (!set || !group) return null;
    
    const groupIndex = set.groups.findIndex(g => g.id === classSubject.groupId);
    
    return {
        name: group.name,
        index: groupIndex,
    };
  }, [schoolClass, classSubject]);


  if (!subject || !contextEntity) return null;

  const finalColorName = colorName || 'subject-default';
  const highlightClasses = 'ring-2 ring-offset-2 ring-[var(--accent-primary)] ring-offset-[var(--bg-secondary)] shadow-lg scale-105 z-10';
  const dimClasses = 'opacity-50 grayscale-[50%]';
  
  const dynamicStyle = {
    backgroundColor: `var(--${finalColorName}-bg)`,
    color: `var(--${finalColorName}-text)`,
    borderColor: `var(--${finalColorName}-border)`,
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
    ghost.style.position = 'absolute';
    ghost.style.top = '-1000px';
    ghost.style.transform = 'rotate(2deg) scale(1.05)';
    ghost.style.opacity = '1';
    ghost.style.boxShadow = '0 10px 25px -5px rgba(13, 148, 136, 0.3), 0 8px 10px -6px rgba(13, 148, 136, 0.2)';
    ghost.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    ghost.style.height = `${(e.currentTarget as HTMLElement).offsetHeight}px`;
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, (e.currentTarget as HTMLElement).offsetWidth / 2, (e.currentTarget as HTMLElement).offsetHeight / 2);

    setTimeout(() => {
        document.body.removeChild(ghost);
    }, 0);
    onDragStart();
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={`relative w-full p-1.5 rounded-lg text-xs cursor-grab shadow-sm hover:shadow-md transition-all flex flex-col flex-grow border group ${isGhost ? 'period-ghost' : ''} ${isHighlighted ? highlightClasses : ''} ${isDimmed ? dimClasses : ''} ${hasConflict ? 'period-conflict' : ''}`}
      style={isGhost ? {} : dynamicStyle}
    >
       {groupInfo && (
        <div title={groupInfo.name} className={`absolute top-0.5 left-0.5 px-1.5 py-0.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold z-10 ${
          groupInfo.index % 2 === 0 ? 'bg-blue-600' : 'bg-green-600'
        }`}>
          <span className="truncate max-w-[50px]">{groupInfo.name}</span>
        </div>
      )}
      {period.jointPeriodId && (
        <div title="Joint Period" className="absolute bottom-0.5 left-0.5 p-0.5 rounded-full bg-black/10 text-black/40">
            <LinkIcon />
        </div>
      )}
      <div className={`flex flex-col justify-between flex-grow ${groupInfo ? 'pt-3' : ''}`}>
        <div>
            <p className="font-bold leading-tight truncate">{subject.nameEn} <span className="font-urdu">/ {subject.nameUr}</span></p>
        </div>
        <div>
            <p className="text-[10px] leading-tight truncate opacity-80 w-full text-right">{contextEntity.nameEn} <span className="font-urdu">/ {contextEntity.nameUr}</span></p>
        </div>
      </div>

      {onDeletePeriod && !isGhost && (
          <button 
              onClick={(e) => { e.stopPropagation(); onDeletePeriod(); }}
              className="absolute top-0.5 right-0.5 bg-black/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:bg-red-600 transition-all duration-200"
              aria-label="Delete period"
              title="Delete period"
          >
              &#x2715;
          </button>
      )}
    </div>
  );
};

export default React.memo(PeriodCard);