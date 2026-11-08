import { Text, View } from 'react-native';
import { router } from 'expo-router';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { computeInsights, readSnapshot, type Metric, type WeekPoint } from '@recall/core';
import { useApp } from '../lib/app-context';
import { useFocusedData } from '../lib/navigation';
import { Button, Card, Heading, Pill, Rows, Screen, Stack, T } from '../components/ui';

function MetricCard({ m }: { m: Metric }) {
  const { palette: p, type } = useApp();
  const unmeasured = m.value === null;
  return (
    <View
      accessible
      accessibilityLabel={`${m.label}: ${m.display}.${m.n > 0 ? ` Based on ${m.n} ${m.n === 1 ? 'check' : 'checks'}.` : ''} ${m.explanation}`}
      style={{
        flexGrow: 1,
        flexBasis: 150,
        backgroundColor: p.surface,
        borderColor: p.border,
        borderWidth: p.highContrast ? 2 : 1,
        borderRadius: 14,
        padding: 16,
        gap: 4,
      }}
    >
      <T variant="smallMuted">{m.label}</T>
      <Text
        style={{
          color: unmeasured ? p.textMuted : p.text,
          fontSize: unmeasured ? type.body : Math.round(type.body * 1.5),
          fontWeight: unmeasured ? '600' : '700',
        }}
      >
        {m.display}
      </Text>
      {m.n > 0 ? <T variant="smallMuted">{`Based on ${m.n} ${m.n === 1 ? 'check' : 'checks'}`}</T> : null}
      <T variant="smallMuted">{m.explanation}</T>
    </View>
  );
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

function WeeklyChart({ weeks }: { weeks: WeekPoint[] }) {
  const { palette: p } = useApp();
  const w = 320;
  const h = 140;
  const pad = 24;
  const bw = (w - pad * 2) / weeks.length;
  const bar = (v: number | null) => (v === null ? 0 : v * (h - pad * 2));
  const any = weeks.some((x) => x.practisedN > 0 || x.freshN > 0);
  if (!any) return <T variant="muted">Not measured yet. Weekly results appear here after reviews and fresh-text checks.</T>;
  const label = weeks
    .map((x) => {
      const pr = x.practisedDelayed === null ? 'not measured' : `${Math.round(x.practisedDelayed * 100)}%`;
      const f = x.fresh === null ? 'not measured' : `${Math.round(x.fresh * 100)}%`;
      return `Week of ${shortDate(x.weekStart)}: practised ${pr}, fresh ${f}`;
    })
    .join('. ');
  return (
    <Stack>
      <View accessible accessibilityRole="image" accessibilityLabel={label}>
        <Svg width="100%" height={h * 1.1} viewBox={`0 0 ${w} ${h}`}>
          <Line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke={p.text} strokeOpacity={0.3} />
          {weeks.map((x, i) => {
            const x0 = pad + i * bw + 4;
            const half = (bw - 8) / 2;
            return [
              <Rect
                key={`${x.weekStart}-p`}
                x={x0}
                y={h - pad - bar(x.practisedDelayed)}
                width={half - 1}
                height={bar(x.practisedDelayed)}
                fill={p.primary}
                rx={2}
              />,
              <Rect
                key={`${x.weekStart}-f`}
                x={x0 + half}
                y={h - pad - bar(x.fresh)}
                width={half - 1}
                height={bar(x.fresh)}
                fill={p.accent}
                rx={2}
              />,
              i % 2 === weeks.length % 2 ? (
                <SvgText key={`${x.weekStart}-t`} x={x0 + half} y={h - 8} textAnchor="middle" fontSize={10} fill={p.textMuted}>
                  {shortDate(x.weekStart)}
                </SvgText>
              ) : null,
            ];
          })}
        </Svg>
      </View>
      <View style={{ gap: 6 }} accessible={false}>
        <Pill kind="blue" label="■ Practised material, reviewed a day or more later" />
        <Pill kind="good" label="■ Fresh text, first read" />
      </View>
    </Stack>
  );
}

export function Progress() {
  const { store, settings, now, dataVersion } = useApp();
  const data = useFocusedData(
    async () => {
      const s = await readSnapshot(store);
      return computeInsights({ attempts: s.attempts, reviewLog: s.reviewLog, settings }, now());
    },
    [store, settings, now, dataVersion],
  );
  if (!data) {
    return (
      <Screen>
        <T>Loading…</T>
      </Screen>
    );
  }
  const pr = data.practised;
  const f = data.fresh;
  return (
    <Screen>
      <Heading>Progress</Heading>
      <T variant="muted">
        These describe your reading practice only. They are not a test score and say nothing about health. Practised material and
        fresh text are kept apart, so getting better at familiar pieces is never counted as improvement on new reading.
      </T>

      <Stack>
        <Heading level={2}>Practised material</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <MetricCard m={pr.immediate} />
          <MetricCard m={pr.nextDay} />
          <MetricCard m={pr.week} />
          <MetricCard m={pr.clueDependence} />
          <MetricCard m={pr.comprehension} />
        </View>
      </Stack>

      <Stack>
        <Heading level={2}>Fresh text (never seen before)</Heading>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          <MetricCard m={f.immediate} />
          <MetricCard m={f.comprehension} />
          <MetricCard m={f.clueDependence} />
        </View>
        <Button variant="secondary" label="Fresh-text checks are on the Home screen" onPress={() => router.navigate('/')} />
      </Stack>

      <Card>
        <Heading level={2}>Week by week</Heading>
        <WeeklyChart weeks={data.weekly} />
      </Card>

      <Card>
        <Heading level={2}>Comfortable part size</Heading>
        <T>
          About <Text style={{ fontWeight: '700' }}>{data.comfortableChunkWords} words</Text> per part{' '}
          {data.chunkMode === 'fixed' ? '(you chose this size).' : '(adjusted automatically).'}
        </T>
        <T variant="smallMuted">
          The size changes slowly, at most once per session, based on how recent new parts were remembered the next day. These are
          starting rules, not medically tested ones. You can choose a fixed size in Settings.
        </T>
      </Card>

      <Card>
        <Heading level={2}>So far</Heading>
        <Rows
          rows={[
            ['Parts read', data.totals.partsRead],
            ['Points checked', data.totals.pointsChecked],
            ['Review rounds', data.totals.reviewsDone],
            ['Fresh-text checks', data.totals.freshChecks],
          ]}
        />
      </Card>
    </Screen>
  );
}
