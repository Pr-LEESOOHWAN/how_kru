import { Stack } from "expo-router";

export default function MissionLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <Stack.Screen name="start" />
      <Stack.Screen name="choose-restaurant" />
      <Stack.Screen name="navigate" />
      <Stack.Screen name="arrived" />
      <Stack.Screen name="verify" />
      <Stack.Screen name="complete" />
      <Stack.Screen name="kick" />
      <Stack.Screen name="level-progress" />
    </Stack>
  );
}
