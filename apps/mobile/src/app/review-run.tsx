import { useLocalSearchParams } from 'expo-router';
import { ReviewRun } from '../screens/Reviews';

/** Retrieval-first reviews. `?then=read` continues with something new afterwards ("Start a session"). */
export default function ReviewRunRoute() {
  const { then } = useLocalSearchParams<{ then?: string }>();
  return <ReviewRun thenRead={then === 'read'} />;
}
