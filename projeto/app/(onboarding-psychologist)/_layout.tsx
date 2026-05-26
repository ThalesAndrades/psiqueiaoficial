import { Stack } from 'expo-router';

export default function OnboardingPsychologistLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
