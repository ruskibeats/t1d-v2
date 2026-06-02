import Constants from 'expo-constants';

const configuredBaseUrl = Constants.expoConfig?.extra?.apiBaseUrl as string | undefined;

export const API_BASE_URL = configuredBaseUrl ?? 'http://localhost:8000';

export async function postJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return (await response.json()) as TResponse;
}
