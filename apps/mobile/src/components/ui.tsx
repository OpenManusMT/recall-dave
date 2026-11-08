/**
 * Small set of accessible building blocks, styled with the same tokens as the
 * PWA. Every touchable is at least 48×48 points, has a role, a label and (where
 * relevant) a state. Text scales with Settings.fontScale and with iOS Dynamic
 * Type (allowFontScaling stays on).
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentRef,
  type ReactNode,
  type Ref,
} from 'react';
import {
  AccessibilityInfo,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { useApp } from '../lib/app-context';
import { MIN_TOUCH, readingFontFamily } from '../lib/theme';
import { Icon, type IconName } from './Icon';

type TextRef = ComponentRef<typeof Text>;

// ------------------------------------------------------------------ screen

const ScrollCtx = createContext<{ scrollToTop: () => void }>({ scrollToTop: () => undefined });

/**
 * Screen wrapper: safe area, keyboard avoidance and a scroll view that keeps
 * taps working while the keyboard is open. Tab screens leave the bottom inset
 * to the tab bar; focused screens pass all edges.
 */
export function Screen({
  children,
  edges = ['top', 'left', 'right'],
}: {
  children: ReactNode;
  edges?: Edge[];
}) {
  const { palette, error, setError } = useApp();
  const ref = useRef<ComponentRef<typeof ScrollView>>(null);
  const ctx = useMemo(() => ({ scrollToTop: () => ref.current?.scrollTo({ y: 0, animated: false }) }), []);
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: palette.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={ref}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 32 }}
        >
          <View style={{ width: '100%', maxWidth: 680, alignSelf: 'center', gap: 20 }}>
            {error ? <ErrorBanner message={error} onClose={() => setError(null)} /> : null}
            <ScrollCtx.Provider value={ctx}>{children}</ScrollCtx.Provider>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/**
 * When `key` changes (a new step), scroll to the top and move VoiceOver focus
 * to the step's heading so the change is announced.
 */
export function useStepFocus(key: unknown) {
  const ref = useRef<TextRef>(null);
  const { scrollToTop } = useContext(ScrollCtx);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    scrollToTop();
    const frame = requestAnimationFrame(() => {
      if (ref.current) AccessibilityInfo.sendAccessibilityEvent(ref.current, 'focus');
    });
    return () => cancelAnimationFrame(frame);
  }, [key, scrollToTop]);
  return ref;
}

export function Stack({ children, gap = 12, style }: { children: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ gap }, style]}>{children}</View>;
}

// -------------------------------------------------------------------- text

type TVariant = 'body' | 'muted' | 'small' | 'smallMuted' | 'bold' | 'lead';

export function T({
  children,
  variant = 'body',
  style,
  selectable,
  accessibilityRole,
  accessibilityLabel,
  accessible,
}: {
  children: ReactNode;
  variant?: TVariant;
  style?: StyleProp<TextStyle>;
  selectable?: boolean;
  accessibilityRole?: 'text' | 'alert' | 'summary';
  accessibilityLabel?: string;
  accessible?: boolean;
}) {
  const { palette, type } = useApp();
  const size = variant === 'small' || variant === 'smallMuted' ? type.small : variant === 'lead' ? type.quote : type.body;
  const color = variant === 'muted' || variant === 'smallMuted' ? palette.textMuted : palette.text;
  return (
    <Text
      selectable={selectable}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      accessible={accessible}
      style={[
        { color, fontSize: size, lineHeight: Math.round(size * 1.5) },
        variant === 'bold' || variant === 'lead' ? { fontWeight: '600' } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}

export function Heading({
  children,
  level = 1,
  ref,
  style,
}: {
  children: ReactNode;
  level?: 1 | 2;
  ref?: Ref<TextRef>;
  style?: StyleProp<TextStyle>;
}) {
  const { palette, type } = useApp();
  const size = level === 1 ? type.h1 : type.h2;
  return (
    <Text
      ref={ref}
      accessibilityRole="header"
      style={[{ color: palette.text, fontSize: size, lineHeight: Math.round(size * 1.25), fontWeight: '700' }, style]}
    >
      {children}
    </Text>
  );
}

/** Reading text as plain paragraphs (never interprets links or markup). */
export function ReadingText({ text, size }: { text: string; size?: 'normal' | 'quote' }) {
  const { palette, type, settings } = useApp();
  const fontSize = size === 'quote' ? type.quote : type.reading;
  const paras = text.split(/\n{2,}/).filter(Boolean);
  return (
    <View style={{ gap: Math.round(fontSize * 0.8) }}>
      {paras.map((p, i) => (
        <Text
          key={i}
          selectable
          accessibilityLanguage="en-GB"
          style={{
            color: palette.text,
            fontSize,
            lineHeight: Math.round(fontSize * (settings.readingFont === 'sans' ? 1.65 : 1.7)),
            fontFamily: readingFontFamily(settings.readingFont),
            letterSpacing: 0.1,
          }}
        >
          {p}
        </Text>
      ))}
    </View>
  );
}

// ----------------------------------------------------------------- buttons

export type ButtonVariant = 'default' | 'primary' | 'secondary' | 'good' | 'danger' | 'ghost' | 'tool';

export function Button({
  label,
  onPress,
  variant = 'default',
  icon,
  iconAfter,
  large,
  disabled,
  accessibilityLabel,
  accessibilityHint,
  expanded,
  selected,
  busy,
  align = 'center',
  testID,
}: {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: IconName;
  iconAfter?: IconName;
  large?: boolean;
  disabled?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  expanded?: boolean;
  selected?: boolean;
  busy?: boolean;
  align?: 'center' | 'start';
  testID?: string;
}) {
  const { palette: p, type } = useApp();
  const bg: Record<ButtonVariant, string> = {
    default: p.surface2,
    primary: p.primary,
    secondary: p.surface,
    good: p.accentSoft,
    danger: p.dangerSoft,
    ghost: 'transparent',
    tool: p.primarySoft,
  };
  const fg: Record<ButtonVariant, string> = {
    default: p.text,
    primary: p.primaryText,
    secondary: p.text,
    good: p.text,
    danger: p.danger,
    ghost: p.primary,
    tool: p.text,
  };
  const border: Record<ButtonVariant, string> = {
    default: 'transparent',
    primary: 'transparent',
    secondary: p.border,
    good: p.accent,
    danger: p.danger,
    ghost: 'transparent',
    tool: 'transparent',
  };
  const tool = variant === 'tool';
  const fontSize = tool ? type.small : large ? Math.round(type.body * 1.1) : type.body;
  const minHeight = tool ? 72 : large ? 60 : variant === 'ghost' ? MIN_TOUCH : 52;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: Boolean(disabled || busy), expanded, selected, busy }}
      testID={testID}
      hitSlop={4}
      style={({ pressed }) => ({
        minHeight,
        minWidth: MIN_TOUCH,
        flexDirection: tool ? 'column' : 'row',
        alignItems: 'center',
        justifyContent: align === 'start' && !tool ? 'flex-start' : 'center',
        gap: tool ? 4 : 8,
        paddingHorizontal: variant === 'ghost' ? 10 : 18,
        paddingVertical: variant === 'ghost' ? 8 : 10,
        borderRadius: 12,
        borderWidth: 2,
        borderColor: p.highContrast ? p.text : border[variant],
        backgroundColor: bg[variant],
        opacity: disabled || busy ? 0.55 : pressed ? 0.8 : 1,
      })}
    >
      {icon ? <Icon name={icon} color={fg[variant]} size={tool ? 26 : 22} /> : null}
      <Text
        style={{
          color: fg[variant],
          fontSize,
          lineHeight: Math.round(fontSize * 1.25),
          fontWeight: '600',
          textAlign: align === 'start' && !tool ? 'left' : 'center',
          flexShrink: 1,
        }}
      >
        {label}
      </Text>
      {iconAfter ? <Icon name={iconAfter} color={fg[variant]} size={22} /> : null}
    </Pressable>
  );
}

/** A grid of tool buttons (Read aloud / Explain / Too much text). */
export function ToolRow({ children }: { children: ReactNode }) {
  return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>;
}

export function ToolSlot({ children }: { children: ReactNode }) {
  return <View style={{ flexGrow: 1, flexBasis: 96 }}>{children}</View>;
}

// ----------------------------------------------------------------- choices

export function RadioGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ gap: 10 }}>
      {children}
    </View>
  );
}

export function Choice({
  label,
  checked,
  onPress,
  correct,
  disabled,
  prefix,
  accessibilityLabel,
}: {
  label: string;
  checked: boolean;
  onPress: () => void;
  correct?: boolean;
  disabled?: boolean;
  prefix?: string;
  accessibilityLabel?: string;
}) {
  const { palette: p, type } = useApp();
  const borderColor = correct ? p.accent : checked ? p.primary : p.highContrast ? p.text : p.border;
  const backgroundColor = correct ? p.accentSoft : checked ? p.primarySoft : p.surface;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ checked, disabled: Boolean(disabled) }}
      style={({ pressed }) => ({
        minHeight: 56,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: checked || correct ? 3 : 2,
        borderColor,
        backgroundColor,
        opacity: disabled ? 0.55 : pressed ? 0.85 : 1,
      })}
    >
      {prefix ? (
        <Text style={{ color: p.textMuted, fontSize: type.body, fontWeight: '700' }} accessible={false}>
          {prefix}
        </Text>
      ) : null}
      <Text style={{ color: p.text, fontSize: type.body, lineHeight: Math.round(type.body * 1.4), flexShrink: 1 }}>
        {label}
      </Text>
    </Pressable>
  );
}

/** A labelled single-choice group (the web app's "segmented" fieldset). */
export function Segmented<V extends string | number>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: V;
  options: readonly { value: V; label: string }[];
  onChange: (v: V) => void;
}) {
  return (
    <Stack gap={8}>
      <T variant="bold">{label}</T>
      <RadioGroup label={label}>
        {options.map((o) => (
          <Choice key={String(o.value)} label={o.label} checked={o.value === value} onPress={() => onChange(o.value)} />
        ))}
      </RadioGroup>
    </Stack>
  );
}

/** A whole-row switch (the row is the touch target; the visual Switch is decorative). */
export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { palette: p } = useApp();
  return (
    <Stack gap={4}>
      <Pressable
        onPress={() => onChange(!checked)}
        accessibilityRole="switch"
        accessibilityLabel={label}
        accessibilityHint={hint}
        accessibilityState={{ checked }}
        style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 }}
      >
        <View style={{ flex: 1 }}>
          <T variant="bold">{label}</T>
        </View>
        <View style={{ pointerEvents: 'none' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Switch
            value={checked}
            trackColor={{ true: p.primary, false: p.surface2 }}
            ios_backgroundColor={p.highContrast ? p.text : p.border}
          />
        </View>
      </Pressable>
      {hint ? (
        <T variant="smallMuted" accessible={false}>
          {hint}
        </T>
      ) : null}
    </Stack>
  );
}

// ------------------------------------------------------------ containers

export type CardVariant = 'default' | 'soft' | 'good' | 'note';

export function Card({
  children,
  variant = 'default',
  gap = 12,
  accessibilityLabel,
}: {
  children: ReactNode;
  variant?: CardVariant;
  gap?: number;
  accessibilityLabel?: string;
}) {
  const { palette: p } = useApp();
  const bg = { default: p.surface, soft: p.primarySoft, good: p.accentSoft, note: p.warnSoft }[variant];
  const borderColor = p.highContrast ? p.border : variant === 'default' ? p.border : 'transparent';
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      style={{
        backgroundColor: bg,
        borderColor,
        borderWidth: p.highContrast ? 2 : 1,
        borderRadius: 14,
        padding: 16,
        gap,
      }}
    >
      {children}
    </View>
  );
}

/** A status message. Errors use the alert role; both are announced to VoiceOver when they appear. */
export function Banner({ message, kind = 'info' }: { message: string; kind?: 'info' | 'error' }) {
  const { palette: p, type } = useApp();
  useEffect(() => {
    if (message) AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <View
      accessibilityRole={kind === 'error' ? 'alert' : 'text'}
      accessibilityLiveRegion="polite"
      style={{
        backgroundColor: kind === 'error' ? p.dangerSoft : p.warnSoft,
        borderRadius: 12,
        padding: 14,
        borderWidth: p.highContrast || kind === 'error' ? 2 : 0,
        borderColor: kind === 'error' ? p.danger : p.border,
      }}
    >
      <Text style={{ color: kind === 'error' ? p.danger : p.text, fontSize: type.body, lineHeight: type.body * 1.45 }}>
        {message}
      </Text>
    </View>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  const { palette: p, type } = useApp();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <View
      accessibilityRole="alert"
      style={{
        backgroundColor: p.dangerSoft,
        borderColor: p.danger,
        borderWidth: 2,
        borderRadius: 12,
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <Text style={{ flex: 1, color: p.danger, fontSize: type.body, lineHeight: type.body * 1.45 }}>{message}</Text>
      <Pressable
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Dismiss message"
        style={{ minWidth: MIN_TOUCH, minHeight: MIN_TOUCH, alignItems: 'center', justifyContent: 'center' }}
      >
        <Icon name="close" color={p.danger} />
      </Pressable>
    </View>
  );
}

/** A supporting sentence from the text. */
export function Quote({ children }: { children: string }) {
  const { palette: p, type, settings } = useApp();
  return (
    <View
      style={{
        borderLeftWidth: 4,
        borderLeftColor: p.accent,
        backgroundColor: p.surface2,
        borderTopRightRadius: 10,
        borderBottomRightRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderWidth: p.highContrast ? 1 : 0,
        borderColor: p.border,
      }}
    >
      <Text
        selectable
        accessibilityLanguage="en-GB"
        style={{
          color: p.text,
          fontSize: type.quote,
          lineHeight: Math.round(type.quote * 1.55),
          fontFamily: readingFontFamily(settings.readingFont),
        }}
      >
        {children}
      </Text>
    </View>
  );
}

/** A hint on the clue ladder, with its level label ("Hint", "Stronger hint", …). */
export function Cue({ label, children }: { label: string; children: string }) {
  const { palette: p, type } = useApp();
  return (
    <View
      accessible
      accessibilityLabel={`${label}. ${children}`}
      style={{
        backgroundColor: p.warnSoft,
        borderRadius: 12,
        paddingVertical: 12,
        paddingHorizontal: 14,
        gap: 4,
        borderWidth: p.highContrast ? 2 : 0,
        borderColor: p.border,
      }}
    >
      <Text style={{ color: p.warn, fontSize: type.label, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </Text>
      <Text style={{ color: p.text, fontSize: type.quote, lineHeight: Math.round(type.quote * 1.5) }}>{children}</Text>
    </View>
  );
}

export function Pill({ label, kind = 'default' }: { label: string; kind?: 'default' | 'good' | 'blue' }) {
  const { palette: p, type } = useApp();
  const bg = { default: p.surface2, good: p.accentSoft, blue: p.primarySoft }[kind];
  const fg = { default: p.textMuted, good: p.accent, blue: p.primary }[kind];
  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 99,
        paddingHorizontal: 10,
        paddingVertical: 3,
        alignSelf: 'flex-start',
        borderWidth: p.highContrast ? 1 : 0,
        borderColor: p.border,
      }}
    >
      <Text style={{ color: fg, fontSize: Math.round(type.small * 0.93), fontWeight: '600' }}>{label}</Text>
    </View>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const { palette: p } = useApp();
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityValue={{ min: 0, max: 100, now: pct }}
      style={{ gap: 4 }}
    >
      <T variant="smallMuted">{label}</T>
      <View style={{ height: 8, backgroundColor: p.surface2, borderRadius: 99, overflow: 'hidden' }}>
        <View style={{ width: `${pct}%`, height: '100%', backgroundColor: p.accent, borderRadius: 99 }} />
      </View>
    </View>
  );
}

/** Back/Pause button plus an optional label on the right (e.g. the session mode). */
export function TopBar({ onBack, backLabel = 'Back', right }: { onBack?: () => void; backLabel?: string; right?: ReactNode }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: MIN_TOUCH, gap: 8 }}>
      {onBack ? (
        <View>
          <Button label={backLabel} onPress={onBack} variant="ghost" icon="back" />
        </View>
      ) : null}
      <View style={{ flex: 1 }} />
      {right}
    </View>
  );
}

/** Show/hide section (the web app's <details>). */
export function Disclosure({ summary, children, initiallyOpen = false }: { summary: string; children: ReactNode; initiallyOpen?: boolean }) {
  const { palette: p, type } = useApp();
  const [open, setOpen] = useState(initiallyOpen);
  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        accessibilityLabel={summary}
        accessibilityState={{ expanded: open }}
        style={{ minHeight: MIN_TOUCH, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      >
        <View style={{ transform: [{ rotate: open ? '90deg' : '0deg' }] }}>
          <Icon name="next" color={p.primary} size={20} />
        </View>
        <Text style={{ color: p.primary, fontSize: type.body, fontWeight: '600', flexShrink: 1 }}>{summary}</Text>
      </Pressable>
      {open ? <View style={{ gap: 8 }}>{children}</View> : null}
    </View>
  );
}

/** Simple label/value rows (the web app's small tables). Each row is read as one item. */
export function Rows({ rows }: { rows: readonly [string, string | number][] }) {
  const { palette: p, type } = useApp();
  return (
    <View>
      {rows.map(([k, v], i) => (
        <View
          key={k}
          accessible
          accessibilityLabel={`${k}: ${v}`}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            gap: 12,
            paddingVertical: 8,
            borderTopWidth: i === 0 ? 0 : 1,
            borderTopColor: p.border,
          }}
        >
          <Text style={{ color: p.text, fontSize: type.body, flexShrink: 1 }}>{k}</Text>
          <Text style={{ color: p.text, fontSize: type.body, fontWeight: '700' }}>{String(v)}</Text>
        </View>
      ))}
    </View>
  );
}

/** A labelled text field. Multiline fields grow with their content. */
export function Field({
  label,
  help,
  multiline,
  minLines = 6,
  ...input
}: TextInputProps & { label: string; help?: string; minLines?: number }) {
  const { palette: p, type } = useApp();
  const [focused, setFocused] = useState(false);
  const fontSize = Math.max(16, type.body);
  return (
    <Stack gap={8}>
      <T variant="bold" accessible={false}>
        {label}
      </T>
      <TextInput
        accessibilityLabel={label}
        multiline={multiline}
        placeholderTextColor={p.textMuted}
        textAlignVertical={multiline ? 'top' : 'center'}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...input}
        style={{
          color: p.text,
          backgroundColor: p.surface,
          borderColor: focused ? p.primary : p.highContrast ? p.text : p.border,
          borderWidth: focused ? 3 : 2,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingTop: 12,
          paddingBottom: 12,
          fontSize,
          lineHeight: multiline ? Math.round(fontSize * 1.5) : undefined,
          minHeight: multiline ? Math.round(fontSize * 1.5 * minLines) + 24 : MIN_TOUCH + 4,
        }}
      />
      {help ? <T variant="smallMuted">{help}</T> : null}
    </Stack>
  );
}
