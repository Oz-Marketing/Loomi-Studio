import type { AdTemplate } from '../types';
import { vehicleOffer } from './vehicle-offer';

/**
 * Code-defined template registry (Phase 1). Templates are pure data→HTML, so
 * this imports safely on both client (preview + form fields) and server
 * (Puppeteer render). A future phase moves templates into the DB so designers
 * can author them in-app.
 */
export const AD_TEMPLATES: AdTemplate[] = [vehicleOffer];

export function getTemplate(id: string): AdTemplate | undefined {
  return AD_TEMPLATES.find((t) => t.id === id);
}
