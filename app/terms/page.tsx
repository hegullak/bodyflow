export default function TermsPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Vilkår for bruk</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-[var(--text2)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">1. Aksept av vilkår</h2>
            <p>
              Ved å bruke bodyflow aksepterer du disse vilkårene for bruk. Hvis du ikke godtar vilkårene, må du ikke bruke appen.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">2. Bruk av tjenesten</h2>
            <p>
              Du er ansvarlig for å:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Holde passordet ditt hemmelig og sikkert</li>
              <li>Ikke bruke appen til ulovlig eller skadelig formål</li>
              <li>Ikke dele din konto med andre</li>
              <li>Respektere andres rettigheter og privatliv</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">3. Ansvar og ansvarsbegrensning</h2>
            <p>
              bodyflow tilbys "som det er" uten noen garantier. Vi er ikke ansvarlig for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tap eller skade som oppstår fra bruk av appen</li>
              <li>Midlertidig utilgjengelighet eller driftsforstyrrelser</li>
              <li>Feil eller mangler i appen</li>
              <li>Tap av data eller treningsprogress</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">4. Opphør av konto</h2>
            <p>
              Vi kan suspendere eller avslutte din konto hvis du bryter disse vilkårene. Du kan når som helst slette din konto gjennom appinnstillingene.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">5. Endringer av vilkår</h2>
            <p>
              Vi kan oppdatere disse vilkårene når som helst. Vi vil varsle deg om større endringer gjennom appen eller e-post.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">6. Kontakt</h2>
            <p>
              Har du spørsmål om disse vilkårene? Kontakt oss på henning.gullaksen@icloud.com
            </p>
          </section>

          <section className="text-sm text-[var(--text3)] pt-8 border-t border-[var(--border)]">
            <p>Sist oppdatert: juni 2026</p>
          </section>
        </div>
      </div>
    </div>
  );
}
