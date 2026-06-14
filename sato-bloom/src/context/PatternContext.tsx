import React, { createContext, useContext, useState } from 'react';

interface PatternContextValue {
  watchedPatterns: Set<string>;
  remindedPatterns: Set<string>;
  toggleWatch: (id: string) => void;
  toggleRemind: (id: string) => void;
  isWatched: (id: string) => boolean;
  isReminded: (id: string) => boolean;
}

const PatternContext = createContext<PatternContextValue | null>(null);

export function PatternProvider({ children }: { children: React.ReactNode }) {
  const [watchedPatterns, setWatchedPatterns] = useState<Set<string>>(new Set());
  const [remindedPatterns, setRemindedPatterns] = useState<Set<string>>(new Set());

  const toggleWatch = (id: string) => {
    setWatchedPatterns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleRemind = (id: string) => {
    setRemindedPatterns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isWatched = (id: string) => watchedPatterns.has(id);
  const isReminded = (id: string) => remindedPatterns.has(id);

  return (
    <PatternContext.Provider value={{ watchedPatterns, remindedPatterns, toggleWatch, toggleRemind, isWatched, isReminded }}>
      {children}
    </PatternContext.Provider>
  );
}

export function usePatterns() {
  const context = useContext(PatternContext);
  if (!context) {
    throw new Error('usePatterns must be used within a PatternProvider');
  }
  return context;
}
