import React from 'react';
import { useRouter } from 'expo-router';
import PortraitScreenComponent from '@/components/PortraitScreen';
import { PaperBackground } from '@/components/PaperBackground';

export default function PortraitScreen() {
  const router = useRouter();

  const handleNavigate = (screen: string) => {
    if (screen === 'Insights') {
      router.replace('/');
    } else if (screen === 'Foods') {
      router.replace('/(tabs)/foods');
    } else if (screen === 'Profile') {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <PaperBackground>
      <PortraitScreenComponent onNavigate={handleNavigate} />
    </PaperBackground>
  );
}
