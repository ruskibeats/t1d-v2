import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { colors } from '@/theme/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: '#6F797A',
        tabBarStyle: { backgroundColor: '#FFFFFF' },
        headerStyle: { backgroundColor: colors.surface },
        headerTintColor: colors.primary,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="home" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="patterns"
        options={{
          title: 'Patterns',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chart-line" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="meals"
        options={{
          title: 'Meals',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="silverware-fork-knife" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="chat" color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
