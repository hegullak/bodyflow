export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Personvernserklæring</h1>
        <div className="prose prose-invert max-w-none space-y-6 text-[var(--text2)]">
          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">1. Innledning</h2>
            <p>
              bodyflow tar ditt personvern alvorlig. Denne personvernserklæringen forklarer hvordan vi samler inn, bruker og beskytter dine data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">2. Hvilke data samler vi inn?</h2>
            <p>Vi samler inn følgende typer data:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Autentiseringsdata:</strong> E-postadresse, passord (kryptert)</li>
              <li><strong>Treningsdata:</strong> Øvelser, sett, vekt, repetisjoner, varighet</li>
              <li><strong>Helsdata:</strong> Vekt, kroppsmålinger, restitusjonsdata</li>
              <li><strong>Withings-data:</strong> Hvis du kobler til Withings, synkroniseres vekt og måledata</li>
              <li><strong>App-bruksdata:</strong> Innlogginger, handlinger, feilrapporter</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">3. Hvordan bruker vi dataene?</h2>
            <p>Vi bruker dine data til å:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Tillate deg å bruke appen og spore treningsdata</li>
              <li>Lagre og synkronisere dataene dine på tvers av enheter</li>
              <li>Beregne treningsstatistikk og progresjon</li>
              <li>Forbedre appen basert på bruksmønster</li>
              <li>Sende viktige varsler og oppdateringer</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">4. Datadeling</h2>
            <p>
              Vi deler <strong>aldri</strong> dine personlige eller treningsdata med tredjeparter, bortsett fra:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Clerk:</strong> Håndterer autentisering og kontoverifikasjon</li>
              <li><strong>Withings:</strong> Kun hvis du eksplisitt kobler kontoen (du kontrollerer dataene)</li>
              <li><strong>Neon/PostgreSQL:</strong> Lagrer kryptert databasedata</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">5. Datasikkerhet</h2>
            <p>
              Vi bruker flere sikkerhetstiltak for å beskytte dine data:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Kryptering av data i transit (HTTPS)</li>
              <li>Sikker databaselagring med Neon PostgreSQL</li>
              <li>Passord er kryptert med Clerk sin sikre autentisering</li>
              <li>Ingen lagring av sensitive betalingsinformasjon</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">6. Dine rettigheter (GDPR)</h2>
            <p>
              Som bruker i EU eller som faller under GDPR har du rett til:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Tilgang:</strong> Be om kopi av dine data</li>
              <li><strong>Retting:</strong> Endre unøyaktige data</li>
              <li><strong>Sletting:</strong> Be om at dine data slettes (&ldquo;retten til å bli glemt&rdquo;)</li>
              <li><strong>Dataportabilitet:</strong> Få dine data i maskinlesbar format</li>
              <li><strong>Objeksjon:</strong> Objisere mot viss databehandling</li>
            </ul>
            <p className="mt-3">
              For å utøve disse rettighetene, kontakt oss på henning.gullaksen@icloud.com
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">7. Datalagringsperiode</h2>
            <p>
              Vi lagrer dine data så lenge kontoen din er aktiv. Hvis du sletter kontoen, blir alle dine data slettet innen 30 dager.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">8. Cookies og tracking</h2>
            <p>
              bodyflow bruker minimale cookies, kun for:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Å holde deg innlogget</li>
              <li>Å huske dine preferanser</li>
            </ul>
            <p className="mt-3">
              Vi bruker <strong>ikke</strong> tredjepartscookies eller advertising-tracking.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">9. Endringer av personvernserklæring</h2>
            <p>
              Vi kan oppdatere denne personvernserklæringen når som helst. Vi vil varsle deg om større endringer.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-[var(--text1)] mb-3">10. Kontakt</h2>
            <p>
              Har du spørsmål eller bekymringer om personvernet ditt?
            </p>
            <p className="mt-2">
              Kontakt: henning.gullaksen@icloud.com
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
