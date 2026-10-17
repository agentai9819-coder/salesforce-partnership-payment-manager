/**
 * Application & Auth Constants
 * Safe for Edge Runtime & Middleware
 */

export const SESSION_COOKIE_NAME = 'sfdc_partner_session_v3';
export const VALID_PARTNER_IDS = [
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'partner-anurag-uuid',
  'partner-vivek-uuid',
] as const;

export const GATEWAY_COOKIE_NAME = 'sfdc_gateway_unlocked_v3';
export const DEFAULT_GATEWAY_PASSCODE = 'SFDC@2026';

// Historical cookies to purge on all devices
export const HISTORICAL_COOKIE_NAMES = [
  'sfdc_partner_session',
  'sfdc_partner_session_v2',
  'sfdc_gateway_unlocked',
  'sfdc_gateway_unlocked_v2',
] as const;

// Distinct login passwords for partners
export const DEFAULT_ANURAG_PASSWORD = 'Anurag@2026';
export const DEFAULT_VIVEK_PASSWORD = 'Vivek@2026';

// Vivek's official WhatsApp number
export const VIVEK_WHATSAPP_NUMBER = '919932381467';

