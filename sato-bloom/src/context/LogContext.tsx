import React, { createContext, useContext, useState } from 'react';

export interface LogEntry {
  id: string;
  text: string;
  timestamp: string;
  insulin: number | null;
  food: string | null;
  photoAttachment?: boolean;
}

interface LogContextValue {
  logs: LogEntry[];
  addLog: (text: string, insulin: number | null, food: string | null, timestamp?: string, photoAttachment?: boolean) => void;
  updateLog: (id: string, text: string, insulin: number | null, food: string | null, photoAttachment?: boolean) => void;
  deleteLog: (id: string) => void;
}

const LogContext = createContext<LogContextValue | null>(null);

const INITIAL_LOGS: LogEntry[] = [
  {
    id: 'log-1',
    text: 'Late night stroll under the neon lights. A quiet calm in the cool air, but feeling a bit of tremor.',
    timestamp: 'June 14, 2026 · 10:15 PM',
    insulin: null,
    food: null,
  },
  {
    id: 'log-2',
    text: 'Heavy dinner with family. Pork chop, mashed potato and rich gravy. Delicious, but the fat is delaying the carb absorption.',
    timestamp: 'June 14, 2026 · 6:30 PM',
    insulin: 8.0,
    food: 'Pork chop',
  },
  {
    id: 'log-3',
    text: 'Had some creamy carbonara at the cafe near the park. A quiet moment with a book under the warm sun.',
    timestamp: 'June 14, 2026 · 12:35 PM',
    insulin: 6.0,
    food: 'Carbonara',
    photoAttachment: true,
  },
  {
    id: 'log-4',
    text: 'Morning walk through the quiet streets. Clean crisp air, feeling fully aligned today.',
    timestamp: 'June 14, 2026 · 8:15 AM',
    insulin: null,
    food: null,
  },
];

export function LogProvider({ children }: { children: React.ReactNode }) {
  const [logs, setLogs] = useState<LogEntry[]>(INITIAL_LOGS);

  const formatDiaryTimestamp = (date: Date) => {
    const optionsDate: Intl.DateTimeFormatOptions = {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    };
    const optionsTime: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    };
    const dStr = date.toLocaleDateString('en-US', optionsDate);
    const tStr = date.toLocaleTimeString('en-US', optionsTime);
    return `${dStr} · ${tStr}`;
  };

  const addLog = (text: string, insulin: number | null, food: string | null, timestamp?: string, photoAttachment?: boolean) => {
    const newLog: LogEntry = {
      id: `log-${Date.now()}`,
      text,
      timestamp: timestamp || formatDiaryTimestamp(new Date()),
      insulin,
      food,
      photoAttachment,
    };
    setLogs((prev) => [newLog, ...prev]);
  };

  const updateLog = (id: string, text: string, insulin: number | null, food: string | null, photoAttachment?: boolean) => {
    setLogs((prev) =>
      prev.map((log) =>
        log.id === id
          ? {
              ...log,
              text,
              insulin,
              food,
              photoAttachment: photoAttachment !== undefined ? photoAttachment : log.photoAttachment,
            }
          : log
      )
    );
  };

  const deleteLog = (id: string) => {
    setLogs((prev) => prev.filter((log) => log.id !== id));
  };

  return (
    <LogContext.Provider value={{ logs, addLog, updateLog, deleteLog }}>
      {children}
    </LogContext.Provider>
  );
}

export function useLogs() {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogs must be used within a LogProvider');
  }
  return context;
}
