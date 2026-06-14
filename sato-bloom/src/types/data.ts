/**
 * Data Types for SatoScreen
 */

/**
 * Food Entry Data
 */
export interface FoodEntry {
  id: string;
  food_name?: string;
  calories?: number;
  carbs?: number;
  protein?: number;
  fat?: number;
  entry_date: string;
  quantity: number;
  unit: string;
  meal_type?: string;
  created_at: string;
}

/**
 * Check-In Data
 */
export interface CheckInData {
  id: string;
  weight?: number;
  body_fat_percentage?: number;
  steps?: number;
  entry_date: string;
}

/**
 * Exercise Entry
 */
export interface ExerciseEntry {
  id: string;
  exercise_name?: string;
  calories_burned?: number;
  duration_minutes?: number;
  entry_date: string;
}

/**
 * Sleep Data
 */
export interface SleepData {
  id: string;
  date: string;
  sleep_duration_minutes?: number;
  sleep_quality_score?: number;
}

/**
 * Goal Progress
 */
export interface GoalProgress {
  id: string;
  goal_name: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
  achieved: boolean;
}

/**
 * Meal Summary (aggregated daily)
 */
export interface MealSummary {
  entry_date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sugars: number;
  sodium: number;
}

/**
 * Sato Page Data Response
 */
export interface SatoPageData {
  page: {
    title: string;
    subtitle: string;
    tone: string;
  };
  hero: {
    message: string;
    mood: string;
    calmNarrative?: string;
  };
  graphSummary: {
    ageAvailable: boolean;
    graphExists: boolean;
    vertices: number;
    edges: number;
    lastSyncAt: string | null;
    lastSyncStatus: 'success' | 'partial' | 'failed' | null;
  };
  foodGraph: {
    query: string;
    answer: string;
    facts: any[];
    sources: any[];
    conflicts: any[];
    uncertainty: number;
  };
  companionCards: {
    template: any;
    demoCard?: any;
  };
  recipeParser: {
    template: any;
    recommendedDemo: any;
  };
  audit: {
    provenance: string;
    uncertaintyScore: number;
    safetyNote: string;
    educationalOnly: boolean;
  };
  actions: any[];
}

/**
 * Data Dashboard Props
 */
export interface DataDashboardProps {
  meals?: MealSummary[];
  checkIn?: CheckInData | null;
  exercises?: ExerciseEntry[];
  sleep?: SleepData[];
  goals?: GoalProgress[];
  isLoading?: boolean;
}

/**
 * Data Card Props
 */
export interface DataCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}