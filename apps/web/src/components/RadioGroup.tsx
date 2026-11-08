import { useRef, type KeyboardEvent } from 'react';

/**
 * Accessible single-choice group (WAI-ARIA radio group pattern): one Tab stop,
 * arrow keys / Home / End move and select, VoiceOver announces "radio button, selected".
 */
export function RadioGroup<T extends string | number>({
  label,
  value,
  options,
  onChange,
  className = 'segmented',
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = options.findIndex((o) => o.value === value);
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const n = options.length;
    let next: number | null = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = n - 1;
    if (next === null) return;
    e.preventDefault();
    const opt = options[next];
    if (opt) onChange(opt.value);
    refs.current[next]?.focus();
  };
  return (
    <div className={className} role="radiogroup" aria-label={label}>
      {options.map((o, i) => (
        <button
          key={String(o.value)}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          tabIndex={(selected === -1 ? i === 0 : i === selected) ? 0 : -1}
          className="choice"
          onClick={() => onChange(o.value)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
