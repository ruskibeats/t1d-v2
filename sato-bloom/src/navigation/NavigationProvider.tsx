import React, { createContext, useContext, useMemo, useState } from "react";
import type { MainTab, NavigationActions, RevelationInput, FoodMemoryInput } from "./types";

export type { MainTab };

type Route =
  | { kind: "tab"; tab: MainTab }
  | { kind: "revelation"; id: string; from: MainTab }
  | { kind: "foodMemory"; foodId: string; from: MainTab }
  | { kind: "profile"; from: MainTab }
  | { kind: "notifications"; from: MainTab }
  | { kind: "log"; from: MainTab }
  | { kind: "allDiscoveries"; from: MainTab };

type NavigationContextValue = {
  route: Route;
  routeStack: Route[];
  actions: NavigationActions;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [routeStack, setRouteStack] = useState<Route[]>([{ kind: "tab", tab: "portrait" }]);

  const route = routeStack[routeStack.length - 1];

  const actions = useMemo<NavigationActions>(() => ({
    goToTab(tab) {
      setRouteStack([{ kind: "tab", tab }]);
    },
    openRevelation(input: RevelationInput) {
      setRouteStack((current) => {
        const last = current[current.length - 1];
        const fromTab = last.kind === "tab" ? last.tab : (last as any).from || "portrait";
        return [...current, { kind: "revelation", id: input.id, from: fromTab }];
      });
    },
    openFoodMemory(input: FoodMemoryInput) {
      setRouteStack((current) => {
        const last = current[current.length - 1];
        const fromTab = last.kind === "tab" ? last.tab : (last as any).from || "portrait";
        return [...current, { kind: "foodMemory", foodId: input.foodId, from: fromTab }];
      });
    },
    openProfile() {
      setRouteStack((current) => {
        const last = current[current.length - 1];
        const fromTab = last.kind === "tab" ? last.tab : (last as any).from || "portrait";
        return [...current, { kind: "profile", from: fromTab }];
      });
    },
    openNotifications() {
      setRouteStack((current) => {
        const last = current[current.length - 1];
        const fromTab = last.kind === "tab" ? last.tab : (last as any).from || "portrait";
        return [...current, { kind: "notifications", from: fromTab }];
      });
    },
    openLog() {
      setRouteStack((current) => {
        const last = current[current.length - 1];
        const fromTab = last.kind === "tab" ? last.tab : (last as any).from || "portrait";
        return [...current, { kind: "log", from: fromTab }];
      });
    },
    openAllDiscoveries() {
      setRouteStack((current) => {
        const last = current[current.length - 1];
        const fromTab = last.kind === "tab" ? last.tab : (last as any).from || "portrait";
        return [...current, { kind: "allDiscoveries", from: fromTab }];
      });
    },
    goBack() {
      setRouteStack((current) => {
        if (current.length <= 1) return current;
        return current.slice(0, -1);
      });
    },
  }), []);

  const value = useMemo(() => ({ route, routeStack, actions }), [route, routeStack, actions]);

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error("useNavigation must be used inside NavigationProvider");
  }
  return value.actions;
}

export function useRoute() {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error("useRoute must be used inside NavigationProvider");
  }
  return value.route;
}

export function useRouteStack() {
  const value = useContext(NavigationContext);
  if (!value) {
    throw new Error("useRouteStack must be used inside NavigationProvider");
  }
  return value.routeStack;
}