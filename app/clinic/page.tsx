import { redirect } from 'next/navigation';

// 301 redirect for the legacy /clinic URL. Renamed to /practitioners for
// compliance-safer B2B framing — see lib/memory: merit-no-public-pricing.
export default function ClinicLegacyRedirect() {
  redirect('/practitioners');
}
