# Amazon Dark Mode

Estensione per browser che mette Amazon in modalità scura.

## Installazione

**Chrome / Edge / Brave**
1. Apri `chrome://extensions` (o ``)
2. Attiva **Modalità sviluppatore**
3. **Carica estensione non pacchettizzata** → seleziona questa cartella

**Firefox**
1. Apri `about:debugging#/runtime/this-firefox`
2. **Carica componente aggiuntivo temporaneo** → seleziona `manifest.json`
   (in Firefox resta attiva fino al riavvio del browser)

## Uso

Clicca l'icona dell'estensione per:
- attivare/disattivare la modalità scura;
- scegliere un tema predefinito (Grigio, Nero, Blu notte, Ardesia, Seppia, Bosco);
- personalizzare sfondo, testo, barra in alto, linea sotto la barra e luminosità delle immagini (tema "Personalizzato").

Le impostazioni restano salvate tra una sessione e l'altra e si applicano subito a tutte le
schede Amazon aperte. I temi predefiniti si modificano in `themes.js`.

## Come funziona

`dark.css` inverte i colori della pagina (`invert + hue-rotate`) e re-inverte immagini e
video, così le foto dei prodotti restano corrette. La barra di navigazione e il footer,
già scuri, vengono lasciati com'erano. Per aggiungere altri domini Amazon modifica
`matches` in `manifest.json`.
