import React, { useState, useRef, useEffect } from 'react';

interface SwipeableListItemProps<T> {
  t: any; // Translation object
  item: T;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  renderContent: (item: T) => React.ReactNode;
}

const KebabIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
    </svg>
);


const SwipeableListItem = <T extends { id: string }>({
  t,
  item,
  onEdit,
  onDelete,
  renderContent,
}: SwipeableListItemProps<T>) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [opensUpward, setOpensUpward] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuContainerRef.current && !menuContainerRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onEdit(item);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMenuOpen(false);
    onDelete(item);
  };

  const handleMenuToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Calculate position before opening the menu
    if (!isMenuOpen && menuContainerRef.current) {
        const rect = menuContainerRef.current.getBoundingClientRect();
        // The mobile nav bar is 4rem (64px) high. Menu is ~100px high.
        // If the bottom of the button is within ~170px of the viewport bottom, open upwards.
        const spaceBelow = window.innerHeight - rect.bottom;
        const requiredSpace = 170; // menu height + nav bar height + buffer
        setOpensUpward(spaceBelow < requiredSpace);
    }
    
    setIsMenuOpen(prev => !prev);
  }

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex-1 min-w-0 pr-4">
        {renderContent(item)}
      </div>

      <div className="relative flex-shrink-0" ref={menuContainerRef}>
        <button
          onClick={handleMenuToggle}
          className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--accent-secondary-hover)] hover:text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-primary)]"
          aria-haspopup="true"
          aria-expanded={isMenuOpen}
          aria-label="Actions"
        >
          <KebabIcon />
        </button>

        {isMenuOpen && (
          <div className={`absolute right-0 w-48 rounded-md shadow-lg bg-[var(--bg-secondary)] ring-1 ring-black ring-opacity-5 focus:outline-none z-[60] animate-scale-in ${
            opensUpward
              ? 'bottom-full origin-bottom-right mb-2'
              : 'top-full origin-top-right mt-2'
          }`}>
            <div className="py-1" role="menu" aria-orientation="vertical" aria-labelledby="options-menu">
              <button
                onClick={handleEditClick}
                className="w-full text-left px-4 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)] flex items-center gap-3"
                role="menuitem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                <span>{t.edit}</span>
              </button>
              <button
                onClick={handleDeleteClick}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                role="menuitem"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>{t.delete}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SwipeableListItem;