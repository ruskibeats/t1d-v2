export type MainTab =
  | "portrait"
  | "foods"
  | "discover"
  | "sato";

export type RevelationInput = {
  id: string;
};

export type FoodMemoryInput = {
  foodId: string;
};

export interface NavigationActions {
  goToTab(tab: MainTab): void;
  openRevelation(input: RevelationInput): void;
  openFoodMemory(input: FoodMemoryInput): void;
  openProfile(): void;
  openNotifications(): void;
  openLog(): void;
  openAllDiscoveries(): void;
  goBack(): void;
}