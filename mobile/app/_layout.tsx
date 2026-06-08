import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PaperProvider } from 'react-native-paper';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { appTheme } from '@/theme/theme';

const queryClient = new QueryClient();

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PaperProvider theme={appTheme}>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="forecast/[runId]" options={{ title: 'Forecast' }} />
            <Stack.Screen name="settings/index" options={{ title: 'Settings', presentation: 'modal' }} />
            <Stack.Screen name="settings/data-sources" options={{ title: 'Data sources' }} />
            <Stack.Screen name="sato" options={{ headerShown: false }} />
            <Stack.Screen name="sato-luxe" options={{ headerShown: false }} />
            <Stack.Screen name="sato-tabs" options={{ headerShown: false }} />
            <Stack.Screen name="sato-journal" options={{ headerShown: false }} />
          </Stack>
        </PaperProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}