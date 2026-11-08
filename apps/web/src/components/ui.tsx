import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from './Icon';
import { href } from '../lib/router';

/** Moves focus to the screen heading when the step changes, so VoiceOver announces the new step. */
export function useFocusOnChange<T extends HTMLElement>(key: unknown) {
  const ref = useRef<T>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    ref.current?.focus({ preventScroll: false });
    window.scrollTo({ top: 0 });
  }, [key]);
  return ref;
}

export function TopBar({ back, backLabel = 'Back', title, right }: { back?: string | (() => void); backLabel?: string; title?: string; right?: ReactNode }) {
  return (
    <div className="topbar">
      {back ? (
        typeof back === 'string' ? (
          <a className="btn ghost" href={href(back)} aria-label={backLabel}>
            <Icon name="back" /> <span>{backLabel}</span>
          </a>
        ) : (
          <button type="button" className="btn ghost" onClick={back} aria-label={backLabel}>
            <Icon name="back" /> <span>{backLabel}</span>
          </button>
        )
      ) : null}
      {title ? <span className="crumb">{title}</span> : null}
      <span className="spacer" />
      {right}
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
  return (
    <div>
      <div className="small muted" aria-hidden="true">
        {label}
      </div>
      <div className="progress" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ConfirmDialog({
  title,
  children,
  confirmLabel,
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
  busy,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>('h2')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      prev?.focus?.();
    };
  }, [onCancel]);
  return (
    <div className="dialog-backdrop" role="presentation" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog stack" role="dialog" aria-modal="true" aria-labelledby="dialog-title" ref={ref}>
        <h2 id="dialog-title" tabIndex={-1}>
          {title}
        </h2>
        <div>{children}</div>
        <div className="stack">
          <button type="button" className={`btn block ${danger ? 'danger' : 'primary'}`} onClick={onConfirm} disabled={busy}>
            {confirmLabel}
          </button>
          <button type="button" className="btn block secondary" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function TabBar({ current, reviewsDue }: { current: string; reviewsDue: number }) {
  const tabs = [
    { to: '/', label: 'Home', icon: 'home' as const },
    { to: '/library', label: 'Read', icon: 'book' as const },
    { to: '/reviews', label: 'Reviews', icon: 'review' as const },
    { to: '/insights', label: 'Progress', icon: 'chart' as const },
    { to: '/settings', label: 'Settings', icon: 'settings' as const },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => {
        const active = t.to === '/' ? current === '/' : current.startsWith(t.to);
        return (
          <a key={t.to} href={href(t.to)} aria-current={active ? 'page' : undefined}>
            <Icon name={t.icon} />
            <span>{t.label}</span>
            {t.to === '/reviews' && reviewsDue > 0 ? (
              <span className="badge" aria-label={`${reviewsDue} due`}>
                {reviewsDue}
              </span>
            ) : null}
          </a>
        );
      })}
    </nav>
  );
}

export function ErrorBanner({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="banner error row" role="alert">
      <span className="grow">{message}</span>
      <button type="button" className="btn ghost" onClick={onClose} aria-label="Dismiss message">
        <Icon name="close" />
      </button>
    </div>
  );
}

/** Renders reading text as plain paragraphs. Never interprets HTML or links. */
export function ReadingText({ text, id }: { text: string; id?: string }) {
  const paras = text.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="reading-text" id={id} lang="en-GB">
      {paras.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
