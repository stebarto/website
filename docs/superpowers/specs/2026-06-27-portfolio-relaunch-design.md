# Portfolio Relaunch — Design Spec

> **Stato: approvato.** Brainstorming chiuso, pronto per il piano di implementazione.

## Contesto e motivo del pivot

Il tentativo precedente (sito interamente occupato da un gioco di corse 3D in Three.js, vedi `docs/superpowers/specs/2026-06-21-fullscreen-3d-race-coming-soon-design.md` e il branch/worktree `worktree-threejs-scroll-journey`) non ha convinto l'utente dal punto di vista visivo. Quel lavoro **non viene eliminato**: resta da parte nel suo worktree separato, intoccato, nel caso si voglia recuperare in futuro qualche pezzo (in particolare la logica di gioco).

Nuova direzione: ripensare il sito da zero, ispirandosi allo stile di [kabhishek18.com](https://kabhishek18.com) (sito non visualizzabile direttamente in questa sessione — le decisioni di stile sono state guidate a parole dall'utente e tramite mockup di confronto).

## Visione finale (a regime)

Un portfolio personale con sezioni: **About / Work / Contact / Blog**, in stile minimal/tech con animazioni e scroll fluido nello spirito del sito di riferimento.

## Scope di questa prima fase

Solo due fasce/sezioni vengono costruite ora, più una terza già esistente:

1. **About** — messaggio "sito in lavorazione / coming soon", in stile minimal/tech.
2. **Game** — un gioco di **Tetris classico** con una grafica curata, per intrattenere chi aspetta. (Sostituisce il gioco di corse del tentativo precedente, che resta solo nel worktree abbandonato.)
3. **Contact** — invariata nei contenuti rispetto a quella attuale del sito live (info e indirizzo email), solo ristilizzata secondo la nuova direzione visiva.

**Work** e **Blog** non vengono costruite ora. La navigazione mostra solo le tre sezioni attive (About / Game / Contact) — niente voci finte, disattivate o "in arrivo" per le sezioni future: si aggiungeranno quando verranno effettivamente costruite.

## Decisioni di stile prese

- **Direzione visiva: "Dark + Glow".** Sfondo scurissimo blu/viola, bagliori (glow) morbidi e diffusi dietro elementi chiave, font sans-serif moderno e arrotondato per i titoli. Sensazione "premium tech", elegante, non aggressiva (scartate le alternative "Mono/Terminal" in stile developer-puro e "Stark Editorial" bianco/nero ad altissimo contrasto).
- Palette di riferimento (da affinare in implementazione): base quasi nera (`#0a0a0f`/`#1a1a2e`), accento viola/lilla chiaro (`#9b8cff` circa) per testi attivi/badge, bagliori radiali viola/blu desaturati dietro figure o blocchi.

## Decisioni di navigazione/struttura prese

- Il menu di navigazione mostra **solo** About / Game / Contact (non le sezioni future).
- **Pattern di navigazione: puntini laterali.** Indicatori verticali sul bordo destro dello schermo, uno per sezione, con il puntino della sezione attiva illuminato/in evidenza mentre si scrolla. Click su un puntino → scroll fluido a quella sezione.

## Decisioni sul gioco prese

- **Tecnologia: Three.js, blocchi 3D.** I pezzi del Tetris sono cubi 3D con luci/riflessi, non semplici quadrati 2D. Nota di rischio accettata dall'utente: il tentativo precedente (auto stilizzate in 3D) aveva avuto problemi di qualità visiva con forme complesse — qui il rischio è minore perché i blocchi del Tetris sono *naturalmente* dei cubi, quindi la forma 3D è coerente con l'oggetto reale, non un compromesso stilizzato.
- **Stile blocchi: colori classici vivaci.** Ogni tipo di pezzo (I/O/T/S/Z/J/L) ha il suo colore arcade pieno e saturo (rosso, giallo, verde, blu, ecc.), senza effetto glow/trasparenza sui blocchi stessi — il bagliore "Dark + Glow" resta nell'ambiente/sfondo della scena, non sui pezzi, per mantenere il gioco immediatamente leggibile.

## Decisioni di tipografia prese

- **Font: Space Grotesk (titoli) + JetBrains Mono (dettagli/etichette/HUD).** Titoli geometrici e moderni ma morbidi, dettagli/punteggi/etichette in monospace per un tocco "tech" senza scadere nello stile developer puro.

## Copy deciso

- **Messaggio About:** "Il sito è in lavorazione. Torna più avanti per vedere tutte le novità. Ma nel frattempo, se vuoi, fatti una partita!"
- **Sezione Contact:** stesso indirizzo email di oggi (**info@stebarto.com**), ma il testo attuale (a tema F1: "Box, mi sentite?", "giro veloce", ecc.) non si riusa — viene riscritto da zero con un tono breve e neutro, coerente con lo stile Dark+Glow. Il copy esatto è un dettaglio minore, aggiustabile dopo la prima implementazione.

## Architettura tecnica

- Si riparte da zero per `index.html`, tutto il CSS e il JS del nuovo sito — non si riusa il markup/stile a tema F1 del sito live attuale, né nulla del worktree Three.js precedente (che resta intatto e separato).
- Asset riusati: `assets/img/logo.png` (logo già fornito dall'utente) e l'indirizzo email di contatto.
- Pagina singola (`index.html`) con tre sezioni a piena altezza (About, Game, Contact) in scroll verticale fluido, più i puntini di navigazione laterali fissi.
- Il gioco Tetris in Three.js vive nella sezione Game, in un proprio canvas/scena, codice separato dal resto della pagina (modulo dedicato, analogamente a come `journey.js` era separato da `race.js` nel tentativo precedente, ma qui senza alcuna logica condivisa col vecchio gioco di corse).
- Dettagli file-per-file e ordine dei task vengono definiti nel piano di implementazione.

## Da decidere (dettagli implementativi minori, decisi durante lo sviluppo)

- Telecamera e illuminazione della scena 3D del Tetris (oltre al colore dei pezzi, già deciso) — scelte ragionevoli prese in implementazione e verificate visivamente.
- Meccaniche del Tetris: si assumono standard (7 pezzi/tetramini, rotazione, pezzo successivo, punteggio, velocità crescente) salvo indicazioni diverse dell'utente.
- Copy esatto della sezione Contact (solo l'indirizzo email è fissato).

## Fuori scope (per ora)

- Sezioni Work e Blog.
- Qualsiasi codice/asset del tentativo Three.js precedente (resta intatto e separato nel suo worktree, non riferito da questo nuovo lavoro a meno di decisione esplicita futura).
