export function Footer() {
  return (
    <footer className="bg-steel text-white/65 px-8 pt-9 pb-7 text-xs">
      <div className="max-w-container mx-auto flex flex-wrap justify-between gap-6">
        <div className="font-display text-lg font-bold tracking-tight text-white">
          Merit<span className="text-cobalt-soft">.</span>
        </div>
        <div className="flex flex-wrap gap-5">
          <a href="/catalog">Catalog</a>
          <a href="/clinic">For Clinics</a>
          <a href="/about">About</a>
          <a href="/policies/terms-of-service">Terms</a>
          <a href="/policies/privacy-policy">Privacy</a>
          <a href="mailto:rx@meritsciences.com">rx@meritsciences.com</a>
        </div>
      </div>
      <p className="max-w-container mx-auto mt-5 pt-4 border-t border-white/10 text-[10.5px] leading-relaxed text-white/45">
        All Merit Sciences products are sold strictly for laboratory and scientific research
        use only. Products have not been evaluated by the FDA and are not intended to diagnose,
        treat, cure, or prevent any disease. By purchasing, you confirm that you are a qualified
        researcher 21+ purchasing for in-vitro research, laboratory analysis, or other lawful
        scientific use. © {new Date().getFullYear()} Merit Sciences LLC · Dallas, TX
      </p>
    </footer>
  );
}
