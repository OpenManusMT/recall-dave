import { useLocalSearchParams } from 'expo-router';
import { ReadSession } from '../../screens/ReadSession';

/** A fresh-text check (never-seen-before passage, kept apart from practice). */
export default function ReadProbe() {
  const { passageId } = useLocalSearchParams<{ passageId: string }>();
  return <ReadSession key={passageId} passageId={passageId} mode="probe" />;
}
