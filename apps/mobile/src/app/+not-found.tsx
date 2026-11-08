import { Button, Heading, Screen } from '../components/ui';
import { goHome } from '../lib/navigation';

export default function NotFound() {
  return (
    <Screen edges={['top', 'bottom', 'left', 'right']}>
      <Heading>Page not found</Heading>
      <Button variant="primary" label="Go to Home" onPress={goHome} />
    </Screen>
  );
}
