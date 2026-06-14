/**
 * Sato API Client
 *
 * Client for fetching Sato page data and companion context.
 * Uses the backend API at http://192.168.0.92:3005
 */

const API_BASE_URL = 'http://localhost:3005/api';

/**
 * Generic fetch with error handling
 */
async function apiFetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`API request failed: ${endpoint}`, error);
    throw error;
  }
}

/**
 * Get Sato page data including meals, goals, exercises, and sleep
 */
export async function getSatoPageData() {
  return apiFetch<any>('/t1d/sato/page-data');
}

/**
 * Get companion cards for a specific intent
 */
export async function getCompanionCards(intent: string, text: string) {
  return apiFetch<any>('/t1d/sato/cards', {
    method: 'POST',
    body: JSON.stringify({ action: intent, text }),
  });
}

/**
 * Get food graph query results
 */
export async function queryFoodGraph(query: string) {
  return apiFetch<any>('/t1d/food-graph/query', {
    method: 'POST',
    body: JSON.stringify({
      foodName: query,
      profileId: '3aec2f72-4232-49a6-923a-f0140f61debe',
      partial: true,
    }),
  });
}

/**
 * Get meal history
 */
export async function getMealHistory(days: number = 7) {
  return apiFetch<any>(`/t1d/sato/meals?days=${days}`);
}

/**
 * Get today's check-in data
 */
export async function getTodayCheckIn() {
  return apiFetch<any>('/t1d/sato/checkin');
}

/**
 * Get exercise history
 */
export async function getExerciseHistory(days: number = 7) {
  return apiFetch<any>(`/t1d/sato/exercises?days=${days}`);
}

/**
 * Get sleep data
 */
export async function getSleepData(days: number = 7) {
  return apiFetch<any>(`/t1d/sato/sleep?days=${days}`);
}

/**
 * Get goal progress
 */
export async function getGoals() {
  return apiFetch<any>('/t1d/sato/goals');
}