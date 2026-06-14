import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Haptics from 'expo-haptics';

export type GlucoseStatus = 'normal' | 'hypo' | 'hyper';

interface GlucoseContextValue {
  glucose: number;
  status: GlucoseStatus;
  showAlert: boolean;
  simulateGlucoseChange: (val: number) => void;
  dismissAlert: () => void;
}

const GlucoseContext = createContext<GlucoseContextValue | null>(null);

export function GlucoseProvider({ children }: { children: React.ReactNode }) {
  const [glucose, setGlucose] = useState<number>(95); // Default normal level (mg/dL)
  const [showAlert, setShowAlert] = useState<boolean>(false);

  const status: GlucoseStatus = glucose < 70 ? 'hypo' : glucose > 220 ? 'hyper' : 'normal';
  const hapticIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Detect status changes to trigger alert and alarms
  useEffect(() => {
    if (status !== 'normal') {
      setShowAlert(true);
      
      // Stop any existing alarms
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }

      // Trigger respective haptic alarms
      if (status === 'hypo') {
        // Hypo is critical: repeat alarm haptics every 2 seconds
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        hapticIntervalRef.current = setInterval(() => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
        }, 2000);
      } else if (status === 'hyper') {
        // Hyper: single warning haptic
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      }
    } else {
      setShowAlert(false);
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
        hapticIntervalRef.current = null;
      }
    }

    return () => {
      if (hapticIntervalRef.current) {
        clearInterval(hapticIntervalRef.current);
      }
    };
  }, [status]);

  const simulateGlucoseChange = (val: number) => {
    setGlucose(val);
  };

  const dismissAlert = () => {
    setShowAlert(false);
    // Stop haptic alarms when user acknowledges the alert
    if (hapticIntervalRef.current) {
      clearInterval(hapticIntervalRef.current);
      hapticIntervalRef.current = null;
    }
  };

  return (
    <GlucoseContext.Provider value={{ glucose, status, showAlert, simulateGlucoseChange, dismissAlert }}>
      {children}
    </GlucoseContext.Provider>
  );
}

export function useGlucose() {
  const context = useContext(GlucoseContext);
  if (!context) {
    throw new Error('useGlucose must be used within a GlucoseProvider');
  }
  return context;
}
