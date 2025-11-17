import React, { useMemo } from 'react';
import type { Period, Language, Subject, Teacher, SchoolClass } from '../types';

interface PeriodStackProps {
  periods: Period[];
  onDragStart: (periods: Period[]) => void;
  onDragEnd?: () => void;
  onDeleteStack?: () => void;
  colorName?: string;
  language: Language;
  subjects: Subject[];
  teachers: Teacher[];
  classes: SchoolClass[];
  displayContext: 'teacher' | 'class' | 'jointPeriod';
  isHighlighted?: boolean;
  isDimmed?: boolean;
  isGhost?: boolean;
  className?: string;
  showCount?: boolean;
  jointPeriodName?: string;
}

const LinkIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
    </svg>
);

const PeriodStack: React.FC<PeriodStackProps> = ({ periods, onDragStart, onDragEnd, onDeleteStack, colorName, language, subjects, teachers, classes, displayContext, isHighlighted, isDimmed, isGhost, className, showCount = true, jointPeriodName }) => {
  if (periods.length === 0) return null;

  const firstPeriod = periods[0];
  
  const schoolClass = classes.find(c => c.id === firstPeriod.classId);
  const classSubject = schoolClass?.subjects.find(s => s.subjectId === firstPeriod.subjectId);

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

  let subjectNameJsx: React.ReactNode;
  let contextNameJsx: React.ReactNode;
  let titleString: string;
  let finalColorName: string;
  let count: number;
  
  const subject = subjects.find(s => s.id === firstPeriod.subjectId);
  if (!subject) return null;
  
  finalColorName = colorName || 'subject-default';
  
  if(displayContext === 'jointPeriod') {
      const teacher = teachers.find(t => t.id === firstPeriod.teacherId);
      subjectNameJsx = <>{jointPeriodName}</>;
      contextNameJsx = <>{teacher?.nameEn} <span className="font-urdu">/ {teacher?.nameUr}</span></>;
      titleString = `${jointPeriodName} - ${teacher?.nameEn}`;
      const numClassesInJointPeriod = new Set(periods.map(p => p.classId)).size;
      count = numClassesInJointPeriod > 0 ? periods.length / numClassesInJointPeriod : periods.length;

  } else {
      subjectNameJsx = <>{subject.nameEn} <span className="font-urdu">/ {subject.nameUr}</span></>;
      count = periods.length;

      if (displayContext === 'teacher') {
          const teacher = teachers.find(t => t.id === firstPeriod.teacherId);
          if (!teacher) return null;
          contextNameJsx = <>{teacher.nameEn} <span className="font-urdu">/ {teacher.nameUr}</span></>;
          titleString = `${subject.nameEn} - ${teacher.nameEn}`;
      } else { // displayContext === 'class'
          const classIds = [...new Set(periods.map(p => p.classId))];
          const relevantClasses = classes.filter(c => classIds.includes(c.id));
          
          const classNamesEn = relevantClasses.map(c => c.nameEn).join(', ');
          const classNamesUr = relevantClasses.map(c => c.nameUr).join('، ');

          contextNameJsx = <>{classNamesEn} <span className="font-urdu">/ {classNamesUr}</span></>;
          titleString = `${subject.nameEn} - ${classNamesEn}`;
      }
  }
  
  const dynamicStyle = {
    backgroundColor: `var(--${finalColorName}-bg)`,
    color: `var(--${finalColorName}-text)`,
    borderColor: `var(--${finalColorName}-border)`,
  };

  const highlightClasses = 'ring-2 ring-[var(--accent-primary)] shadow-xl';
  const dimClasses = 'opacity-50 grayscale-[50%]';
  
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    const clone = e.currentTarget.cloneNode(true) as HTMLElement;
    clone.style.position = 'absolute';
    clone.style.top = '-1000px';
    clone.style.width = `${(e.currentTarget as HTMLElement).offsetWidth}px`;
    clone.style.transform = 'rotate(2deg)';
    clone.style.opacity = '1';
    clone.style.boxShadow = '0 10px 25px -5px rgba(13, 148, 136, 0.3), 0 8px 10px -6px rgba(13, 148, 136, 0.2)';

    const countBadge = clone.querySelector('.count-badge');
    if (countBadge) {
        countBadge.remove();
    }
    document.body.appendChild(clone);
    e.dataTransfer.setDragImage(clone, (e.currentTarget as HTMLElement).offsetWidth / 2, 20);
    setTimeout(() => document.body.removeChild(clone), 0);
    
    // Pass only the periods for a SINGLE instance of the class/joint period
    let periodsToDrag = [firstPeriod];
    if (firstPeriod.jointPeriodId) {
        const numClassesInJointPeriod = new Set(periods.map(p => p.classId)).size;
        if(numClassesInJointPeriod > 0) {
            periodsToDrag = periods.slice(0, numClassesInJointPeriod);
        }
    }
    onDragStart(periodsToDrag);
  };

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragEnd={onDragEnd}
      className={`relative block p-1.5 rounded-lg text-left cursor-grab shadow-sm hover:shadow-lg transition-all border group flex flex-col flex-grow ${className || 'w-40'} ${isGhost ? 'period-ghost' : ''} ${isHighlighted ? highlightClasses : ''} ${isDimmed ? dimClasses : ''}`}
      style={isGhost ? {} : dynamicStyle}
      title={titleString}
    >
      <div className="flex justify-between items-start relative flex-grow">
         {groupInfo && (
            <div title={groupInfo.name} className={`absolute -top-1 -left-1 px-1.5 py-0.5 rounded-full flex items-center justify-center text-white text-[9px] font-bold z-10 ${
            groupInfo.index % 2 === 0 ? 'bg-blue-600' : 'bg-green-600'
            }`}>
                <span className="truncate max-w-[60px]">{groupInfo.name}</span>
            </div>
        )}
        {displayContext === 'jointPeriod' && (
            <div title="Joint Period" className="absolute bottom-0.5 left-0.5 p-0.5 rounded-full bg-black/10 text-black/40">
                <LinkIcon />
            </div>
        )}
        <div className="flex-1 min-w-0 pr-1 flex flex-col justify-between h-full">
            <p className="font-bold text-xs truncate pt-1">{subjectNameJsx}</p>
            <p className="text-[10px] truncate opacity-90 text-right">{contextNameJsx}</p>
        </div>
        {showCount && count > 1 && (
            <div className="count-badge ml-1 flex-shrink-0 bg-white/70 text-gray-800 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center border border-gray-300">
                x{Math.round(count)}
            </div>
        )}
      </div>
       {onDeleteStack && !isGhost && (
          <button 
              onClick={(e) => { e.stopPropagation(); onDeleteStack(); }}
              className="absolute top-0.5 right-0.5 bg-black/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] font-bold opacity-0 group-hover:opacity-100 hover:!opacity-100 hover:bg-red-600 transition-all duration-200"
              aria-label="Delete period stack"
              title="Delete period stack"
          >
              &#x2715;
          </button>
      )}
    </div>
  );
};

export default React.memo(PeriodStack);