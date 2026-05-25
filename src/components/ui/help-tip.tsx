'use client';

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface HelpTipProps {
  /** Optional heading shown at the top of the popover. */
  title?: string;
  /** Popover body — supports any JSX (paragraphs, lists, code, etc.). */
  children: ReactNode;
  /** Accessible label for the trigger. Defaults to `Help: ${title}` or "More info". */
  label?: string;
  /** Tailwind size class for the icon. Defaults to `w-4 h-4`. */
  iconClassName?: string;
  /** Optional extra classes on the trigger button. */
  className?: string;
}

const POPOVER_WIDTH = 320;
const MARGIN = 8;

export function HelpTip({
  title,
  children,
  label,
  iconClassName = 'w-4 h-4',
  className = '',
}: HelpTipProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const popoverId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const measuredHeight = popover?.offsetHeight ?? 180;

    let left = rect.left;
    if (left + POPOVER_WIDTH > window.innerWidth - MARGIN) {
      left = Math.max(MARGIN, window.innerWidth - POPOVER_WIDTH - MARGIN);
    }
    let top = rect.bottom + 6;
    if (top + measuredHeight > window.innerHeight - MARGIN) {
      const above = rect.top - measuredHeight - 6;
      if (above >= MARGIN) top = above;
    }
    setPos({ top, left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();
    const handler = () => updatePosition();
    window.addEventListener('scroll', handler, true);
    window.addEventListener('resize', handler);
    return () => {
      window.removeEventListener('scroll', handler, true);
      window.removeEventListener('resize', handler);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return;
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current?.contains(t)) return;
      if (triggerRef.current?.contains(t)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const accessibleLabel = label ?? (title ? `Help: ${title}` : 'More info');

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={accessibleLabel}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--card)] ${className}`}
      >
        <QuestionMarkCircleIcon className={iconClassName} />
      </button>
      {open && typeof window !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="dialog"
              aria-label={accessibleLabel}
              style={{
                position: 'fixed',
                top: pos?.top ?? -9999,
                left: pos?.left ?? -9999,
                width: POPOVER_WIDTH,
                visibility: pos ? 'visible' : 'hidden',
              }}
              className="z-[60] rounded-xl border border-[var(--border)] bg-[var(--card-strong)] backdrop-blur-xl backdrop-saturate-150 shadow-xl p-4 text-sm text-[var(--foreground)] animate-fade-in-up"
            >
              {title && (
                <div className="mb-2 text-sm font-semibold">{title}</div>
              )}
              <div className="text-xs leading-relaxed text-[var(--muted-foreground)] space-y-2 [&_code]:rounded [&_code]:bg-[var(--muted)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[11px] [&_code]:text-[var(--foreground)] [&_a]:text-[var(--primary)] [&_a]:underline [&_strong]:text-[var(--foreground)] [&_strong]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
                {children}
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
