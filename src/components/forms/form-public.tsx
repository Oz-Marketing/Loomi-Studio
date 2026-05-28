'use client';

import * as React from 'react';
import type { FormTemplate } from '@/lib/forms/types';
import { FormRenderer } from '@/lib/forms/render';

interface FormPublicProps {
  slug: string;
  template: FormTemplate;
  /**
   * When true, the page is being rendered inside an iframe via ?embed=1.
   * We post height messages to the parent so the script-tag embed can
   * auto-resize the surrounding iframe.
   */
  embed?: boolean;
  /**
   * Landing-page attribution surfaced when this form is rendered
   * inside a Loomi LP. The submission handler injects the LP id +
   * slug as hidden `__loomi_*` fields so the API stamps them onto
   * the FormSubmission row. UTMs come from the `loomi_lp_utm`
   * cookie that LpTracker sets — they're picked up at submit time.
   */
  attribution?: { pageId: string; pageSlug: string };
}

interface SubmitResponse {
  ok: boolean;
  error?: string;
  errors?: { field: string; message: string }[];
  submissionId?: string;
  redirectUrl?: string | null;
  successMessage?: string | null;
}

type Phase = 'idle' | 'submitting' | 'success' | 'error';

/**
 * Public-facing form. Wraps the rendered template in a real `<form>`
 * with browser-native validation suppressed in favour of server-side
 * checks (so error messages stay consistent regardless of the JS state).
 *
 * Submission flow:
 *   1. Collect FormData from the form element
 *   2. POST it to /api/forms/[slug]/submit (form-data, not JSON)
 *   3. On 200 + redirectUrl: window.location.assign(redirectUrl)
 *   4. On 200 (no redirect): swap to a success message
 *   5. On 400 with field errors: re-render with errors inline
 *   6. On other errors: show a generic error banner
 *
 * When in embed mode we also broadcast our scroll height to the parent
 * window so the iframe loader can match its height to ours.
 */
export function FormPublic({ slug, template, embed, attribution }: FormPublicProps) {
  const [phase, setPhase] = React.useState<Phase>('idle');
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [topError, setTopError] = React.useState<string | null>(null);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  // postMessage height broadcasts — only run in embed mode. Mutation
  // observer + window resize cover the typical reasons the form's
  // intrinsic height changes (lazy images, viewport rotation, errors
  // appearing, success state replacing the form).
  React.useEffect(() => {
    if (!embed || typeof window === 'undefined') return;
    if (window.parent === window) return;

    const post = () => {
      const node = rootRef.current;
      const height = node ? node.scrollHeight : document.body.scrollHeight;
      window.parent.postMessage(
        { type: 'loomi-form-resize', slug, height },
        '*',
      );
    };

    post();
    const observer = new MutationObserver(post);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true });
    window.addEventListener('resize', post);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', post);
    };
  }, [embed, slug, phase, successMessage]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (phase === 'submitting') return;

    setPhase('submitting');
    setTopError(null);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);

    // Attach LP attribution (id + slug from React context) and UTMs
    // (from the loomi_lp_utm cookie LpTracker maintains) as hidden
    // `__loomi_*` fields. The submit API plucks these out before
    // validation so they never appear in submission.data.
    if (attribution) {
      formData.set('__loomi_lp_id', attribution.pageId);
      formData.set('__loomi_lp_slug', attribution.pageSlug);
    }
    const utms = readLpUtmCookie();
    if (utms) {
      if (utms.source) formData.set('__loomi_utm_source', utms.source);
      if (utms.medium) formData.set('__loomi_utm_medium', utms.medium);
      if (utms.campaign) formData.set('__loomi_utm_campaign', utms.campaign);
      if (utms.term) formData.set('__loomi_utm_term', utms.term);
      if (utms.content) formData.set('__loomi_utm_content', utms.content);
    }

    let res: Response;
    try {
      res = await fetch(`/api/f/${slug}/submit`, {
        method: 'POST',
        body: formData,
      });
    } catch {
      setPhase('error');
      setTopError('Could not reach the server. Check your connection and try again.');
      return;
    }

    const payload = (await res.json().catch(() => ({}))) as SubmitResponse;

    if (res.ok && payload.ok) {
      if (payload.redirectUrl) {
        // Top-level redirect even when in an iframe — the parent page
        // should ferry users to the thank-you page, not just the iframe.
        if (embed && window.parent !== window) {
          window.parent.postMessage(
            { type: 'loomi-form-redirect', slug, url: payload.redirectUrl },
            '*',
          );
        }
        window.location.assign(payload.redirectUrl);
        return;
      }
      setPhase('success');
      setSuccessMessage(payload.successMessage || 'Thanks! We received your submission.');
      // Notify parent that submission succeeded — host page can fire
      // analytics events from this signal.
      if (embed && window.parent !== window) {
        window.parent.postMessage({ type: 'loomi-form-submitted', slug }, '*');
      }
      // Same signal but as a same-window event so the LP-page
      // tracker (which lives in the same tree, not in a parent
      // iframe) can fire a form_submit analytics event.
      try {
        window.dispatchEvent(
          new CustomEvent('loomi:form-submitted', {
            detail: { slug, submissionId: payload.submissionId },
          }),
        );
      } catch {
        /* CustomEvent unsupported — analytics opt-out */
      }
      return;
    }

    setPhase('error');
    setTopError(payload.error || 'Submission failed. Please try again.');
    if (payload.errors) {
      const map: Record<string, string> = {};
      for (const err of payload.errors) {
        map[err.field] = err.message;
      }
      setFieldErrors(map);
    }
  };

  if (phase === 'success' && successMessage) {
    return (
      <div
        ref={rootRef}
        className="loomi-form-root"
        style={{
          backgroundColor: template.settings.bodyBg,
          color: template.settings.textColor,
          fontFamily: template.settings.fontFamily,
          minHeight: embed ? 'auto' : '100vh',
          padding: '64px 16px',
        }}
      >
        <div
          style={{
            maxWidth: `${template.settings.contentWidth}px`,
            margin: '0 auto',
            backgroundColor: template.settings.contentBg,
            borderRadius: 12,
            padding: '48px 32px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 16 }} aria-hidden>
            ✓
          </div>
          <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5 }}>
            {successMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef}>
      <form onSubmit={handleSubmit} noValidate>
        {/* Honeypot — visually hidden, expected to remain empty. Real
            users never see it; bots that fill every input get flagged. */}
        <input
          type="text"
          name="_loomi_hp"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: '-9999px',
            top: 'auto',
            width: 1,
            height: 1,
            overflow: 'hidden',
          }}
        />

        <FormRenderer template={template} options={{ errors: fieldErrors }} />

        {topError && (
          <div
            role="alert"
            style={{
              maxWidth: `${template.settings.contentWidth}px`,
              margin: '0 auto 16px',
              padding: '12px 16px',
              borderRadius: 8,
              backgroundColor: '#fee2e2',
              color: '#991b1b',
              fontSize: 14,
            }}
          >
            {topError}
          </div>
        )}

        {phase === 'submitting' && (
          <div
            aria-live="polite"
            style={{
              position: 'fixed',
              left: '50%',
              bottom: 16,
              transform: 'translateX(-50%)',
              padding: '8px 14px',
              borderRadius: 999,
              backgroundColor: 'rgba(0,0,0,0.8)',
              color: '#fff',
              fontSize: 13,
              pointerEvents: 'none',
            }}
          >
            Submitting…
          </div>
        )}
      </form>
    </div>
  );
}

/**
 * Read the `loomi_lp_utm` cookie LpTracker writes on first visit.
 * Used by LP-embedded forms to attach first-touch UTMs to their
 * submission without round-tripping through React context. Returns
 * null when the cookie is missing or malformed.
 */
interface LpUtm {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
}

function readLpUtmCookie(): LpUtm | null {
  if (typeof document === 'undefined') return null;
  const target = 'loomi_lp_utm=';
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (!trimmed.startsWith(target)) continue;
    try {
      const value = decodeURIComponent(trimmed.slice(target.length));
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== 'object') return null;
      return parsed as LpUtm;
    } catch {
      return null;
    }
  }
  return null;
}
