import { useLocalSearchParams } from 'expo-router';
import { ReadSession } from '../../screens/ReadSession';

/** A reading the learner pasted in. */
export default function ReadDocument() {
  const { documentId, mode } = useLocalSearchParams<{ documentId: string; mode?: string }>();
  const m = mode === 'read' ? 'read' : 'remember';
  return <ReadSession key={`${documentId}:${m}`} documentId={documentId} mode={m} />;
}
