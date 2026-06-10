import React, { createContext, useState, useContext, ReactNode } from "react";
import { ScreenName } from "./types";

type NavigationContextType = {
  screen: ScreenName;
  navigate: (screen: ScreenName) => void;
};

const NavigationContext = createContext<NavigationContextType | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [screen, setScreen] = useState<ScreenName>("Portrait");

  return (
    <NavigationContext.Provider value={{ screen, navigate: setScreen }}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const ctx = useContext(NavigationContext);
  if (!ctx) throw new Error("useNavigation must be used within NavigationProvider");
  return ctx;
}