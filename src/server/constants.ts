/**
 * Application & Auth Constants
 * Safe for Edge Runtime & Middleware
 */

export const SESSION_COOKIE_NAME = 'sfdc_partner_session';
export const VALID_PARTNER_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'partner-anurag-uuid',
  'partner-vivek-uuid',
] as const;

export const GATEWAY_COOKIE_NAME = 'sfdc_gateway_unlocked';
export const DEFAULT_GATEWAY_PASSCODE = 'SFDC@2026';
