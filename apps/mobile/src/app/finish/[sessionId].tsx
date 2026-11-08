import { useLocalSearchParams } from 'expo-router';
import { Finish } from '../../screens/Onboarding';

export default function FinishRoute() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  return <Finish sessionId={sessionId ?? ''} />;
}
