import { getStoreSettings } from '@/lib/store-settings';
import { saveStoreSettings } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Settings — Merit Admin' };

export default async function SettingsPage() {
  const settings = await getStoreSettings();
  const thresholdDollars = (settings.freeShippingThreshold / 100).toFixed(2);

  return (
    <div className="max-w-2xl mx-auto px-6 py-10">
      <p className="text-[11px] tracking-[0.22em] uppercase text-cobalt font-bold mb-2">— Store</p>
      <h1 className="font-display font-black text-ink tracking-tight text-3xl mb-8">Settings</h1>

      <section className="bg-white rounded-2xl border border-cobalt/10 divide-y divide-cobalt/10">
        {/* Shipping */}
        <div className="px-6 py-5">
          <h2 className="font-bold text-ink text-sm mb-1">Shipping</h2>
          <p className="text-[13px] text-ink-soft mb-5">
            Orders at or above the free-shipping threshold ship free. Orders below pay the flat rate ($9.99).
          </p>
          <form action={saveStoreSettings}>
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label htmlFor="freeShippingThreshold" className="block text-[11px] tracking-[0.16em] uppercase font-bold text-ink-soft mb-1.5">
                  Free shipping threshold
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-soft font-bold text-sm">$</span>
                  <input
                    id="freeShippingThreshold"
                    name="freeShippingThreshold"
                    type="number"
                    min="0"
                    step="0.01"
                    defaultValue={thresholdDollars}
                    required
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border border-cobalt/20 bg-cream text-ink text-sm font-bold focus:outline-none focus:border-cobalt focus:ring-2 focus:ring-cobalt/10 transition"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="shrink-0 px-5 py-2.5 rounded-xl text-white text-sm font-bold transition hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #2E4DDB 0%, #5078FF 100%)' }}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
