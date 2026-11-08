import { useLocalSearchParams } from 'expo-router';
import { ReadSession } from '../../screens/ReadSession';

/** A bundled library passage. `?mode=read` is "Help me read this"; otherwise "Help me remember this". */
export default function ReadPassage() {
  const { passageId, mode } = useLocalSearchParams<{ passageId: string; mode?: string }>();
  const m = mode === 'read' ? 'read' : 'remember';
  return <ReadSession key={`${passageId}:${m}`} passageId={passageId} mode={m} />;
}
