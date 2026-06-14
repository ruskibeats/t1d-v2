import { Tabs } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: 'none' }, // We use a custom TabBar in each screen
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="portrait" />
      <Tabs.Screen name="foods" />
      <Tabs.Screen name="sato" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
