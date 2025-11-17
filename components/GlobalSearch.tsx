import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { SchoolClass, Teacher, Subject, Language } from '../types';

export type SearchResult = { id: string; nameEn: string; nameUr: string; type: 'class' | 'teacher' | 'subject' };

// Icons
const SearchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
const ClassIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
const TeacherIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>;
const SubjectIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v11.494m-9-5.747h18" /></svg>;

const ICONS = {
    class: <ClassIcon />,
    teacher: <TeacherIcon />,
    subject: <SubjectIcon />
};

interface GlobalSearchProps {
  t: any;
  language: Language;
  classes: SchoolClass[];
  teachers: Teacher[];
  subjects: Subject[];
  onResultClick: (type: 'class' | 'teacher' | 'subject', id: string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ t, language, classes, teachers, subjects, onResultClick }) => {
    const [query, setQuery] = useState('');
    const [isOpen, setIsOpen] = useState(false);
    const searchContainerRef = useRef<HTMLDivElement>(null);

    const allData = useMemo<SearchResult[]>(() => [
        ...classes.map(c => ({ id: c.id, nameEn: c.nameEn, nameUr: c.nameUr, type: 'class' as const })),
        ...teachers.map(t => ({ id: t.id, nameEn: t.nameEn, nameUr: t.nameUr, type: 'teacher' as const })),
        ...subjects.map(s => ({ id: s.id, nameEn: s.nameEn, nameUr: s.nameUr, type: 'subject' as const })),
    ], [classes, teachers, subjects]);

    const filteredResults = useMemo(() => {
        if (!query.trim()) return [];
        const lowerCaseQuery = query.trim().toLowerCase();
        return allData.filter(item =>
            item.nameEn.toLowerCase().includes(lowerCaseQuery) ||
            item.nameUr.includes(query.trim())
        );
    }, [query, allData]);

    const groupedResults = useMemo(() => {
        return filteredResults.reduce((acc, item) => {
            if (!acc[item.type]) { acc[item.type] = []; }
            acc[item.type].push(item);
            return acc;
        }, {} as Record<'class' | 'teacher' | 'subject', SearchResult[]>);
    }, [filteredResults]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleItemClick = (type: 'class' | 'teacher' | 'subject', id: string) => {
        onResultClick(type, id);
        setQuery('');
        setIsOpen(false);
    };

    const hasResults = filteredResults.length > 0;
    const resultCategories = Object.keys(groupedResults) as ('class' | 'teacher' | 'subject')[];

    return (
        <div className="relative w-full max-w-lg mx-auto" ref={searchContainerRef}>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[var(--text-placeholder)]">
                    <SearchIcon />
                </div>
                <input
                    type="text"
                    placeholder="Search classes, teachers, subjects..."
                    value={query}
                    onChange={(e) => { setQuery(e.target.value); setIsOpen(true); }}
                    onFocus={() => setIsOpen(true)}
                    className="block w-full pl-10 pr-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border-secondary)] rounded-full text-[var(--text-primary)] placeholder-[var(--text-placeholder)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-primary)] focus:border-transparent"
                    aria-label="Global search"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen && hasResults}
                />
            </div>
            {isOpen && query.trim() && (
                <div className="absolute top-full mt-2 w-full bg-[var(--bg-secondary)] rounded-lg shadow-xl border border-[var(--border-primary)] z-50 max-h-96 overflow-y-auto animate-scale-in" role="listbox">
                    {hasResults ? (
                        <div className="py-2">
                            {resultCategories.map(category => (
                                <div key={category}>
                                    <h4 className="px-4 pt-2 pb-1 text-xs font-bold uppercase text-[var(--text-secondary)] tracking-wider" role="presentation">
                                        {t[`${category}sCsv`]}
                                    </h4>
                                    <ul role="group" aria-labelledby={`category-${category}`}>
                                        {groupedResults[category].map(item => (
                                            <li key={item.id} role="option" aria-selected="false">
                                                <button onClick={() => handleItemClick(item.type, item.id)} className="w-full text-left flex items-center gap-3 px-4 py-2 text-[var(--text-primary)] hover:bg-[var(--accent-secondary-hover)]">
                                                    <span className="text-[var(--accent-primary)]">{ICONS[item.type]}</span>
                                                    <span>{item.nameEn} <span className="font-urdu">/ {item.nameUr}</span></span>
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="p-4 text-center text-sm text-[var(--text-secondary)]">No results found.</p>
                    )}
                </div>
            )}
        </div>
    );
};

export default GlobalSearch;
