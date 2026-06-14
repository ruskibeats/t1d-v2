# SatoScreen PostgreSQL Data Enhancement Plan

## Overview
Enhance the SatoScreen at `/root/tld-v2/sato-bloom/src/screens/SatoScreen.tsx` to surface all PostgreSQL database data for Russell Batchelor's simulation. This will provide a realistic user experience showing actual logged data.

## Database Tables to Surface

### 1. **Food Entries** (`public.food_entries`)
- Columns: id, user_id, food_id, quantity, unit, entry_date, calories, carbs, protein, fat
- Use case: Show recent logged meals with nutrition data

### 2. **Check-In Measurements** (`public.check_in_measurements`)
- Columns: id, user_id, entry_date, weight, neck, waist, hips, steps, body_fat_percentage
- Use case: Show recent weight, body measurements, and activity

### 3. **Exercise Entries** (`public.exercise_entries`)
- Columns: id, user_id, entry_date, exercise_id, calories_burned, duration_minutes
- Use case: Show recent exercise activities

### 4. **Daily Sleep** (`public.daily_sleep_need`)
- Columns: id, user_id, date, sleep_duration_minutes, sleep_quality_score
- Use case: Show recent sleep patterns

### 5. **User Goals** (`public.goal_presets`)
- Columns: id, user_id, goal_name, target_value, current_value
- Use case: Show goal progress indicators

## Implementation Phases

### Phase 1: Backend Service Layer
Create a service to fetch data from PostgreSQL:

```typescript
// src/services/PostgresDataService.ts
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
}

export interface CheckInData {
  id: string;
  weight?: number;
  body_fat_percentage?: number;
  steps?: number;
  entry_date: string;
}

export interface ExerciseEntry {
  id: string;
  exercise_name?: string;
  calories_burned?: number;
  duration_minutes?: number;
  entry_date: string;
}

export interface SleepData {
  id: string;
  date: string;
  sleep_duration_minutes?: number;
  sleep_quality_score?: number;
}

export interface GoalProgress {
  id: string;
  goal_name: string;
  target_value: number;
  current_value: number;
  progress_percentage: number;
}

class PostgresDataService {
  private readonly RUSSELL_USER_ID = 'russell-batchelor-id'; // Placeholder

  async getRecentMeals(limit: number = 7): Promise<FoodEntry[]> {
    // Fetch from public.food_entries
  }

  async getTodayCheckIn(): Promise<CheckInData | null> {
    // Fetch from public.check_in_measurements
  }

  async getRecentExercises(limit: number = 5): Promise<ExerciseEntry[]> {
    // Fetch from public.exercise_entries
  }

  async getRecentSleep(limit: number = 7): Promise<SleepData[]> {
    // Fetch from public.daily_sleep_need
  }

  async getGoals(): Promise<GoalProgress[]> {
    // Fetch from public.goal_presets
  }

  async getFoodMemory(query: string): Promise<FoodEntry[]> {
    // Search for similar meals in food_entries
  }
}

export const postgresDataService = new PostgresDataService();
```

### Phase 2: Create Data Cards Component
Create reusable data card components:

```typescript
// src/components/data/DataCard.tsx
interface DataCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon: string;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}

export function DataCard({ title, value, subtext, icon, trend, color }: DataCardProps) {
  // Renders a card with value, trend indicator, and icon
}
```

### Phase 3: Update SatoScreen
Enhance SatoScreen with:

1. **Data Dashboard Section** - Show all recent data at the top
2. **Meal Memory Cards** - Display similar meal patterns from database
3. **Enhanced Autologging** - Match foods against database
4. **Query Interface** - Allow natural language queries about data

```typescript
// Enhanced SatoScreen structure
<ScrollView>
  {/* Data Dashboard */}
  <DataDashboard
    meals={meals}
    checkIn={checkIn}
    exercises={exercises}
    sleep={sleep}
    goals={goals}
  />

  {/* Conversation Messages */}
  {messages.map((msg) => <Message key={msg.id} {...msg} />)}

  {/* Quick Prompts */}
  <QuickPrompts />
</ScrollView>
```

### Phase 4: API Integration
Connect React Native to PostgreSQL backend:

```typescript
// Add API base URL to constants
const API_BASE_URL = 'http://192.168.0.92:3005/api';

// Create API client
const api = {
  async get<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) throw new Error('API Error');
    return response.json();
  }
};
```

## Data Visualizations

### For Meals
- Mini sparkline showing carb trends
- Total calories per meal
- Food icons with nutrition badges

### For Check-In
- Weight progress bar
- Body fat percentage indicator
- Steps counter with weekly total

### For Exercises
- Exercise type icons
- Calories burned with fire icon
- Duration with stopwatch

### For Sleep
- Sleep quality score (emoji rating)
- Weekly sleep duration bar chart
- Best sleep vs average

## User Experience

### Russell Batchelor Simulation Mode
- Display data for Russell specifically
- Pre-fill with sample data if actual data doesn't exist
- Show pattern recognition based on logged data

### Data Query Examples
User asks: "How many calories did I burn this week?"
Sato responds: "You've burned 2,847 calories this week from your 5 exercise sessions. The highest was Tuesday with 650 calories from your 45-minute run."

User asks: "What's my weight trend?"
Sato responds: "Your weight has been stable at 175 lbs over the last 7 days, with no significant changes."

## Expected Features

✅ **Real-time data display** - Show actual PostgreSQL data
✅ **Meal memory matching** - Find similar meals in database
✅ **Pattern recognition** - Detect trends over time
✅ **Data visualization** - Charts, sparklines, progress bars
✅ **Interactive queries** - Ask about any data point
✅ **Russell Batchelor mode** - Simulate real user experience

## Implementation Order

1. Create PostgresDataService
2. Create DataCard component
3. Update SatoScreen with data dashboard
4. Add meal memory matching
5. Implement query interface
6. Add visualizations and trends
7. Test with real PostgreSQL data
8. Deploy and verify

## Success Criteria

- [ ] SatoScreen displays meals from food_entries table
- [ ] Check-in measurements (weight, body fat, steps) shown
- [ ] Recent exercises displayed with calories burned
- [ ] Sleep data and quality scores visible
- [ ] Goal progress indicators shown
- [ ] Meal memory matching works for logged foods
- [ ] Users can query any data point naturally
- [ ] Visualizations are clear and helpful
- [ ] Works in simulated Russell Batchelor mode