// ==UserScript==
// @name         Epic Games Store to EGData Button
// @namespace    https://www.epicgames.com/store/
// @version      1.8.5
// @description  Adds EGData, GG.deals and PCGamingWiki buttons below every purchase button on Epic Games Store product and bundle pages — bundles have two, and both get the trio. EGData links to that exact offer; the other two search by the English name, looked up by offer id because Epic translates game names and both sites index in English, and each says so in the store's own tooltip. On your wishlist it adds an 'only discounted' filter, remembered sort and filters, and a shareable link.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://store.epicgames.com/*
// @downloadURL  https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js
// @updateURL    https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // =============================================
    // IDIOMA
    // =============================================
    // Epic sirve la tienda en 32 idiomas, elegidos en el menú del globo terráqueo.
    // OJO con CUÁNDO se detecta, porque este script corre con @run-at
    // document-start (hace falta para no perder la request que engancha más
    // abajo) y en ese instante casi nada está disponible:
    //   - La ruta NO lleva segmento de idioma. Epic cambia de idioma con el
    //     parámetro ?lang= (su propio menú usa hreftemplate="?lang=de").
    //   - El HTML que llega del servidor son ~25 KB de armazón SIN atributo lang
    //     y SIN <link hreflang>: el lang lo escribe React al hidratar.
    //   - El menú de idioma tampoco existe hasta que se hidrata.
    // La única señal viva en document-start es ?lang=, y solo aparece en la
    // navegación en que acabas de cambiar de idioma.
    //
    // Por eso el idioma no se congela al cargar: se resuelve al LEER una cadena,
    // que es cuando se pinta algo y la página ya está hidratada. Ver el proxy de
    // `t` más abajo.
    // Nota: EGData es marca y NO se traduce (queda como literal en el botón).
    //
    // Las claves del diccionario son códigos BCP-47 en minúsculas.
    const I18N = {
        en: {
            remember: 'Remember sort and filters',
            onlyDiscount: 'Only discounted',
            copyLink: '🔗 Copy link with filters',
            copied: '✔ Link copied',
            copyPrompt: 'Copy this link:',
            about: 'ℹ️ Learn more',
            close: 'Close',
            rememberTip: 'Saves the sort order and filters you pick in Epic and reapplies them automatically every time you return to the wishlist.',
            onlyDiscountTip: 'Scrolls through your WHOLE list (Epic loads it in batches on scroll) to detect every game and hide those not on sale. It keeps the sort order you pick in Epic. Discounts are detected by the percentage badge or the struck-through original price.',
            copyLinkTip: 'Builds a URL that, when opened with the script installed, reproduces your current sort and filters (including "only discounted").',
            ggTip: 'Searches the title on GG.deals with the Epic DRM filter. Being a title search, it may not hit the exact game.',
            pcgwTip: 'Searches PCGamingWiki (compatibility and fixes) for the game itself: without the edition suffix and, if the page belongs to another game — a DLC, an edition, a currency pack — by that game. Being a name search, it may not hit the exact article.',
            aboutTip: 'See everything this script does.',
            aboutTitle: 'What does this script do?',
            aboutName: 'Name:',
            aboutVersion: 'Version:',
            aboutAuthor: 'Author:',
            aboutBody: [
                'This script links Epic Games Store with EGData and enhances your wishlist.',
                '• On product (/p/) and bundle (/bundles/) pages: adds three buttons below the purchase button.',
                '– EGData (a price and deal-history database) links to that exact offer, not to a search.',
                '– GG.deals searches among Epic-DRM deals, with none of the default store-rating floor, and PCGamingWiki searches for compatibility and fixes. Both use the English name, looked up by offer id, because Epic translates game names; and whenever the offer belongs to a game — a DLC, an edition, a currency pack — PCGamingWiki searches that game instead. Each says in its tooltip that it searches by name and can miss. On a mobile-only page neither the GG.deals nor the PCGamingWiki button is drawn: the wiki documents PC games and GG.deals tracks PC stores.',
                '– One set of buttons per purchase button: bundles have two (the bar at the top and the "Buy …" section) and both get theirs.',
                '– Navigating inside the store to a product or a bundle reloads the page. Epic is a single-page app and the script was not active on the home, search or browse view; that reload is what guarantees the button appears.',
                '• On your wishlist (/wishlist) it adds a toolbar with three tools:',
                '– Only discounted: automatically scrolls through the whole list (Epic loads it in batches on scroll) to detect ALL games and show only those on sale, keeping the sort order you chose in Epic. Discounts are detected by the percentage badge or the struck-through original price. It is remembered on its own, whether or not "Remember sort and filters" is on.',
                '– Remember sort and filters: saves the sort order and the sidebar filters you pick in Epic and reapplies them when you come back.',
                '– Copy link with filters: builds a URL that reproduces your sort, your filters and the "only discounted" state when opened. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.',
                'Everything runs in your browser (stored in localStorage); no data is sent to any server.',
            ],
        },
        es: {
            remember: 'Recordar orden y filtros',
            onlyDiscount: 'Solo con descuento',
            copyLink: '🔗 Copiar enlace con filtros',
            copied: '✔ Enlace copiado',
            copyPrompt: 'Copia este enlace:',
            about: 'ℹ️ Saber más',
            close: 'Cerrar',
            rememberTip: 'Guarda el orden y los filtros que elijas en Epic y los reaplica automáticamente cada vez que vuelvas a la lista de deseos.',
            onlyDiscountTip: 'Baja por TODA tu lista (Epic la carga por lotes al hacer scroll) para detectar todos los juegos y ocultar los que no están en oferta. Respeta el orden que elijas en Epic. El descuento se detecta por el badge de porcentaje o por el precio original tachado.',
            copyLinkTip: 'Genera una URL que, al abrirla con el script instalado, reproduce tu orden y filtros actuales (incluido "solo con descuento").',
            ggTip: 'Busca el título en GG.deals con el filtro de DRM de Epic. Al buscar por nombre, puede no dar con el juego exacto.',
            pcgwTip: 'Busca en PCGamingWiki (compatibilidad y arreglos) el juego en sí: sin el sufijo de edición y, si la ficha pertenece a otro juego —un DLC, una edición, un paquete de monedas—, por ese juego. Al buscar por nombre, puede no dar con el artículo exacto.',
            aboutTip: 'Ver qué hace este script en su totalidad.',
            aboutTitle: '¿Qué hace este script?',
            aboutName: 'Nombre:',
            aboutVersion: 'Versión:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Este script conecta Epic Games Store con EGData y mejora tu lista de deseos.',
                '• En páginas de producto (/p/) y de bundle (/bundles/): añade tres botones bajo el botón de compra.',
                '– EGData (base de datos de precios e historial de ofertas) enlaza a esa oferta concreta, no a una búsqueda.',
                '– GG.deals busca entre las ofertas con DRM de Epic, sin el mínimo de valoración de tienda que trae por defecto, y PCGamingWiki busca compatibilidad y arreglos. Los dos usan el nombre en inglés, pedido por el id de la oferta, porque Epic traduce los nombres de los juegos; y siempre que la oferta pertenezca a un juego —un DLC, una edición, un paquete de monedas—, PCGamingWiki busca ese juego. Cada uno avisa en su tooltip de que busca por nombre y puede no acertar. En una ficha solo de móvil no se pintan ni el de GG.deals ni el de PCGamingWiki: la wiki documenta juegos de PC y GG.deals sigue tiendas de PC.',
                '– Un juego de botones por cada botón de compra: los bundles tienen dos (la barra de arriba y la sección "Buy …") y ambos reciben el suyo.',
                '– Al navegar dentro de la tienda hacia un producto o un bundle, la página se recarga. Epic es una SPA y el script no estaba activo en el home, la búsqueda ni el browse; esa recarga es lo que garantiza que el botón aparezca.',
                '• En tu lista de deseos (/wishlist) añade una barra con tres herramientas:',
                '– Solo con descuento: baja automáticamente por toda la lista (Epic la carga por lotes al hacer scroll) para detectar TODOS los juegos y mostrar únicamente los que están en oferta, respetando el orden que elegiste en Epic. El descuento se detecta por el badge de porcentaje o por el precio original tachado. Se recuerda por su cuenta, esté o no activo "Recordar orden y filtros".',
                '– Recordar orden y filtros: guarda el orden y los filtros de la barra lateral que elijas en Epic y los reaplica al volver.',
                '– Copiar enlace con filtros: genera una URL que, al abrirla, reproduce tu orden, tus filtros y el estado de "solo con descuento". Si el navegador bloquea el portapapeles, la muestra en un diálogo para copiarla a mano.',
                'Todo se procesa en tu navegador (se guarda en localStorage); no se envían datos a ningún servidor.',
            ],
        },
        'es-419': {
            remember: 'Recordar orden y filtros',
            onlyDiscount: 'Solo con descuento',
            copyLink: '🔗 Copiar enlace con filtros',
            copied: '✔ Enlace copiado',
            copyPrompt: 'Copia este enlace:',
            about: 'ℹ️ Saber más',
            close: 'Cerrar',
            rememberTip: 'Guarda el orden y los filtros que elijas en Epic y los vuelve a aplicar automáticamente cada vez que regreses a la lista de deseos.',
            onlyDiscountTip: 'Recorre TODA tu lista (Epic la carga por lotes al desplazarte) para detectar todos los juegos y ocultar los que no están en oferta. Respeta el orden que elijas en Epic. El descuento se detecta por la etiqueta de porcentaje o por el precio original tachado.',
            copyLinkTip: 'Genera una URL que, al abrirla con el script instalado, reproduce tu orden y filtros actuales (incluido "solo con descuento").',
            ggTip: 'Busca el título en GG.deals con el filtro de DRM de Epic. Al buscar por nombre, puede que no encuentre el juego exacto.',
            pcgwTip: 'Busca en PCGamingWiki (compatibilidad y arreglos) el juego en sí: sin el sufijo de edición y, si la ficha pertenece a otro juego —un DLC, una edición, un paquete de monedas—, por ese juego. Al buscar por nombre, puede que no encuentre el artículo exacto.',
            aboutTip: 'Ver todo lo que hace este script.',
            aboutTitle: '¿Qué hace este script?',
            aboutName: 'Nombre:',
            aboutVersion: 'Versión:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Este script conecta Epic Games Store con EGData y mejora tu lista de deseos.',
                '• En páginas de producto (/p/) y de paquete (/bundles/): agrega tres botones debajo del botón de compra.',
                '– EGData (base de datos de precios e historial de ofertas) enlaza a esa oferta concreta, no a una búsqueda.',
                '– GG.deals busca entre las ofertas con DRM de Epic, sin el mínimo de valoración de tienda que trae por defecto, y PCGamingWiki busca compatibilidad y arreglos. Los dos usan el nombre en inglés, pedido por el id de la oferta, porque Epic traduce los nombres de los juegos; y siempre que la oferta pertenezca a un juego —un DLC, una edición, un paquete de monedas—, PCGamingWiki busca ese juego. Cada uno lo avisa en su información emergente: busca por nombre y puede fallar. En una ficha solo de móvil no se pintan ni el de GG.deals ni el de PCGamingWiki: la wiki documenta juegos de PC y GG.deals sigue tiendas de PC.',
                '– Un juego de botones por cada botón de compra: los paquetes tienen dos (la barra de arriba y la sección "Buy …") y ambos reciben el suyo.',
                '– Al navegar dentro de la tienda hacia un producto o un paquete, la página se recarga. Epic es una SPA y el script no estaba activo en el inicio, la búsqueda ni el catálogo; esa recarga es lo que garantiza que el botón aparezca.',
                '• En tu lista de deseos (/wishlist) agrega una barra con tres herramientas:',
                '– Solo con descuento: recorre automáticamente toda la lista (Epic la carga por lotes al desplazarte) para detectar TODOS los juegos y mostrar únicamente los que están en oferta, respetando el orden que elegiste en Epic. El descuento se detecta por la etiqueta de porcentaje o por el precio original tachado. Se recuerda por su cuenta, esté o no activo "Recordar orden y filtros".',
                '– Recordar orden y filtros: guarda el orden y los filtros de la barra lateral que elijas en Epic y los vuelve a aplicar al regresar.',
                '– Copiar enlace con filtros: genera una URL que, al abrirla, reproduce tu orden, tus filtros y el estado de "solo con descuento". Si el navegador bloquea el portapapeles, la muestra en un cuadro de diálogo para copiarla a mano.',
                'Todo se procesa en tu navegador (se guarda en localStorage); no se envían datos a ningún servidor.',
            ],
        },
        de: {
            remember: 'Sortierung und Filter merken',
            onlyDiscount: 'Nur reduzierte',
            copyLink: '🔗 Link mit Filtern kopieren',
            copied: '✔ Link kopiert',
            copyPrompt: 'Diesen Link kopieren:',
            about: 'ℹ️ Mehr erfahren',
            close: 'Schließen',
            rememberTip: 'Speichert die in Epic gewählte Sortierung und Filter und wendet sie bei jeder Rückkehr zur Wunschliste automatisch wieder an.',
            onlyDiscountTip: 'Scrollt durch deine GESAMTE Liste (Epic lädt sie beim Scrollen in Schüben), um alle Spiele zu erfassen und die auszublenden, die nicht im Angebot sind. Die in Epic gewählte Sortierung bleibt erhalten. Rabatte werden am Prozent-Abzeichen oder am durchgestrichenen Originalpreis erkannt.',
            copyLinkTip: 'Baut eine URL, die beim Öffnen mit installiertem Skript deine aktuelle Sortierung und Filter wiederherstellt (einschließlich „Nur reduzierte“).',
            ggTip: 'Sucht den Titel auf GG.deals mit dem Epic-DRM-Filter. Da es eine Titelsuche ist, wird nicht immer das exakte Spiel getroffen.',
            pcgwTip: 'Sucht auf PCGamingWiki (Kompatibilität und Fixes) nach dem Spiel selbst: ohne Editions-Zusatz und, wenn die Seite zu einem anderen Spiel gehört – ein DLC, eine Edition, ein Währungspaket –, nach diesem Spiel. Da nach dem Namen gesucht wird, trifft es nicht immer den genauen Artikel.',
            aboutTip: 'Alles ansehen, was dieses Skript macht.',
            aboutTitle: 'Was macht dieses Skript?',
            aboutName: 'Name:',
            aboutVersion: 'Version:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Dieses Skript verbindet den Epic Games Store mit EGData und verbessert deine Wunschliste.',
                '• Auf Produkt- (/p/) und Bundle-Seiten (/bundles/): fügt drei Schaltflächen unter der Kaufschaltfläche ein.',
                '– EGData (eine Datenbank für Preise und Angebotsverlauf) verlinkt genau auf dieses Angebot, nicht auf eine Suche.',
                '– GG.deals sucht unter den Angeboten mit Epic-DRM, ohne die standardmäßige Mindestbewertung der Shops, und PCGamingWiki sucht nach Kompatibilität und Fixes. Beide verwenden den englischen Namen, über die Angebots-ID abgefragt, weil Epic Spieltitel übersetzt; wenn das Angebot zu einem Spiel gehört – ein DLC, eine Edition, ein Währungspaket –, sucht PCGamingWiki stattdessen dieses Spiel. Jeder Button sagt in seinem Tooltip, dass er nach dem Namen sucht und danebenliegen kann. Auf einer reinen Mobil-Seite werden weder der GG.deals- noch der PCGamingWiki-Button gezeichnet: Das Wiki dokumentiert PC-Spiele und GG.deals verfolgt PC-Shops.',
                '– Ein Satz Schaltflächen pro Kaufschaltfläche: Bundles haben zwei (die Leiste oben und der Abschnitt „Buy …“) und beide bekommen ihren.',
                '– Wer innerhalb des Shops zu einem Produkt oder Bundle navigiert, löst einen Seiten-Neuladevorgang aus. Epic ist eine Single-Page-App und das Skript war auf Startseite, Suche und Katalog nicht aktiv; genau dieses Neuladen sorgt dafür, dass die Schaltfläche erscheint.',
                '• Auf deiner Wunschliste (/wishlist) kommt eine Leiste mit drei Werkzeugen dazu:',
                '– Nur reduzierte: scrollt automatisch durch die ganze Liste (Epic lädt sie beim Scrollen in Schüben), um ALLE Spiele zu erfassen und nur die im Angebot zu zeigen, unter Beibehaltung der in Epic gewählten Sortierung. Rabatte werden am Prozent-Abzeichen oder am durchgestrichenen Originalpreis erkannt. Das wird eigenständig gemerkt, unabhängig davon, ob „Sortierung und Filter merken“ aktiv ist.',
                '– Sortierung und Filter merken: speichert die in Epic gewählte Sortierung und die Filter der Seitenleiste und wendet sie bei der Rückkehr wieder an.',
                '– Link mit Filtern kopieren: baut eine URL, die beim Öffnen deine Sortierung, deine Filter und den Zustand von „Nur reduzierte“ wiederherstellt. Blockiert der Browser die Zwischenablage, wird die URL in einem Dialog zum Abschreiben angezeigt.',
                'Alles läuft in deinem Browser (gespeichert im localStorage); es werden keine Daten an einen Server gesendet.',
            ],
        },
        fr: {
            remember: 'Mémoriser tri et filtres',
            onlyDiscount: 'Uniquement en promo',
            copyLink: '🔗 Copier le lien avec filtres',
            copied: '✔ Lien copié',
            copyPrompt: 'Copiez ce lien :',
            about: 'ℹ️ En savoir plus',
            close: 'Fermer',
            rememberTip: 'Enregistre le tri et les filtres choisis dans Epic et les réapplique automatiquement à chaque retour sur la liste de souhaits.',
            onlyDiscountTip: 'Parcourt TOUTE votre liste (Epic la charge par lots au défilement) pour détecter tous les jeux et masquer ceux qui ne sont pas en promotion. Le tri choisi dans Epic est conservé. Les remises sont détectées via le badge de pourcentage ou le prix d’origine barré.',
            copyLinkTip: 'Construit une URL qui, ouverte avec le script installé, reproduit votre tri et vos filtres actuels (y compris « uniquement en promo »).',
            ggTip: 'Recherche le titre sur GG.deals avec le filtre DRM Epic. S’agissant d’une recherche par titre, le jeu exact peut ne pas être trouvé.',
            pcgwTip: 'Recherche sur PCGamingWiki (compatibilité et correctifs) le jeu lui-même : sans le suffixe d\'édition et, si la fiche appartient à un autre jeu — un DLC, une édition, un pack de monnaie —, par ce jeu. S\'agissant d\'une recherche par nom, elle peut ne pas tomber sur l\'article exact.',
            aboutTip: 'Voir tout ce que fait ce script.',
            aboutTitle: 'Que fait ce script ?',
            aboutName: 'Nom :',
            aboutVersion: 'Version :',
            aboutAuthor: 'Auteur :',
            aboutBody: [
                'Ce script relie l’Epic Games Store à EGData et améliore votre liste de souhaits.',
                '• Sur les pages produit (/p/) et bundle (/bundles/) : ajoute trois boutons sous le bouton d’achat.',
                '– EGData (base de données de prix et d’historique des promotions) pointe vers cette offre précise, pas vers une recherche.',
                '– GG.deals cherche parmi les offres avec DRM Epic, sans le minimum de note de boutique par défaut, et PCGamingWiki cherche compatibilité et correctifs. Les deux utilisent le nom anglais, obtenu par l\'identifiant de l\'offre, car Epic traduit les noms des jeux ; et dès que l\'offre appartient à un jeu — un DLC, une édition, un pack de monnaie —, PCGamingWiki cherche ce jeu. Chacun indique dans son infobulle qu\'il cherche par nom et peut se tromper. Sur une fiche uniquement mobile, ni le bouton GG.deals ni celui de PCGamingWiki ne sont affichés : le wiki documente les jeux PC et GG.deals suit les boutiques PC.',
                '– Un jeu de boutons par bouton d’achat : les bundles en ont deux (la barre du haut et la section « Buy … ») et chacun reçoit le sien.',
                '– Naviguer dans la boutique vers un produit ou un bundle recharge la page. Epic est une application monopage et le script n’était pas actif sur l’accueil, la recherche ou le catalogue ; c’est ce rechargement qui garantit l’apparition du bouton.',
                '• Sur votre liste de souhaits (/wishlist), il ajoute une barre avec trois outils :',
                '– Uniquement en promo : parcourt automatiquement toute la liste (Epic la charge par lots au défilement) pour détecter TOUS les jeux et n’afficher que ceux en promotion, en conservant le tri choisi dans Epic. Les remises sont détectées via le badge de pourcentage ou le prix d’origine barré. Ce réglage est mémorisé à part, que « Mémoriser tri et filtres » soit actif ou non.',
                '– Mémoriser tri et filtres : enregistre le tri et les filtres de la barre latérale choisis dans Epic et les réapplique au retour.',
                '– Copier le lien avec filtres : construit une URL qui, à l’ouverture, reproduit votre tri, vos filtres et l’état de « uniquement en promo ». Si le navigateur bloque le presse-papiers, l’URL s’affiche dans une boîte de dialogue pour la copier à la main.',
                'Tout est traité dans votre navigateur (stocké dans localStorage) ; aucune donnée n’est envoyée à un serveur.',
            ],
        },
        it: {
            remember: 'Ricorda ordinamento e filtri',
            onlyDiscount: 'Solo scontati',
            copyLink: '🔗 Copia link con filtri',
            copied: '✔ Link copiato',
            copyPrompt: 'Copia questo link:',
            about: 'ℹ️ Scopri di più',
            close: 'Chiudi',
            rememberTip: 'Salva l’ordinamento e i filtri scelti su Epic e li riapplica automaticamente ogni volta che torni alla lista dei desideri.',
            onlyDiscountTip: 'Scorre TUTTA la tua lista (Epic la carica a blocchi durante lo scorrimento) per rilevare tutti i giochi e nascondere quelli non in offerta. Mantiene l’ordinamento scelto su Epic. Gli sconti si rilevano dal badge della percentuale o dal prezzo originale barrato.',
            copyLinkTip: 'Genera un URL che, aperto con lo script installato, riproduce l’ordinamento e i filtri attuali (incluso «solo scontati»).',
            ggTip: 'Cerca il titolo su GG.deals con il filtro DRM di Epic. Trattandosi di una ricerca per titolo, potrebbe non trovare il gioco esatto.',
            pcgwTip: 'Cerca su PCGamingWiki (compatibilità e correzioni) il gioco vero e proprio: senza il suffisso di edizione e, se la scheda appartiene a un altro gioco — un DLC, un\'edizione, un pacchetto di valuta —, tramite quel gioco. Trattandosi di una ricerca per nome, potrebbe non trovare l\'articolo esatto.',
            aboutTip: 'Vedi tutto quello che fa questo script.',
            aboutTitle: 'Che cosa fa questo script?',
            aboutName: 'Nome:',
            aboutVersion: 'Versione:',
            aboutAuthor: 'Autore:',
            aboutBody: [
                'Questo script collega l’Epic Games Store a EGData e migliora la tua lista dei desideri.',
                '• Nelle pagine di prodotto (/p/) e di bundle (/bundles/): aggiunge tre pulsanti sotto il pulsante di acquisto.',
                '– EGData (database di prezzi e storico delle offerte) rimanda a quella offerta precisa, non a una ricerca.',
                '– GG.deals cerca tra le offerte con DRM di Epic, senza il minimo di valutazione dei negozi predefinito, e PCGamingWiki cerca compatibilità e correzioni. Entrambi usano il nome inglese, richiesto tramite l\'id dell\'offerta, perché Epic traduce i nomi dei giochi; e ogni volta che l\'offerta appartiene a un gioco — un DLC, un\'edizione, un pacchetto di valuta — PCGamingWiki cerca quel gioco. Ognuno avverte nel suo tooltip che cerca per nome e può sbagliare. In una scheda solo per dispositivi mobili non vengono disegnati né il pulsante di GG.deals né quello di PCGamingWiki: la wiki documenta giochi per PC e GG.deals segue negozi PC.',
                '– Un gruppo di pulsanti per ogni pulsante di acquisto: i bundle ne hanno due (la barra in alto e la sezione «Buy …») ed entrambi ricevono il proprio.',
                '– Navigando dentro il negozio verso un prodotto o un bundle la pagina si ricarica. Epic è una single-page app e lo script non era attivo su home, ricerca o catalogo; è proprio quel ricaricamento a garantire che il pulsante compaia.',
                '• Nella tua lista dei desideri (/wishlist) aggiunge una barra con tre strumenti:',
                '– Solo scontati: scorre automaticamente tutta la lista (Epic la carica a blocchi durante lo scorrimento) per rilevare TUTTI i giochi e mostrare solo quelli in offerta, mantenendo l’ordinamento scelto su Epic. Gli sconti si rilevano dal badge della percentuale o dal prezzo originale barrato. Viene ricordato per conto proprio, che «Ricorda ordinamento e filtri» sia attivo o no.',
                '– Ricorda ordinamento e filtri: salva l’ordinamento e i filtri della barra laterale scelti su Epic e li riapplica al ritorno.',
                '– Copia link con filtri: genera un URL che all’apertura riproduce ordinamento, filtri e stato di «solo scontati». Se il browser blocca gli appunti, l’URL viene mostrato in una finestra per copiarlo a mano.',
                'Tutto viene elaborato nel tuo browser (salvato in localStorage); non viene inviato alcun dato a nessun server.',
            ],
        },
        nl: {
            remember: 'Sortering en filters onthouden',
            onlyDiscount: 'Alleen afgeprijsd',
            copyLink: '🔗 Link met filters kopiëren',
            copied: '✔ Link gekopieerd',
            copyPrompt: 'Kopieer deze link:',
            about: 'ℹ️ Meer informatie',
            close: 'Sluiten',
            rememberTip: 'Slaat de sortering en filters op die je in Epic kiest en past ze automatisch opnieuw toe telkens als je terugkeert naar de verlanglijst.',
            onlyDiscountTip: 'Scrolt door je HELE lijst (Epic laadt die in batches tijdens het scrollen) om alle games te vinden en de niet-afgeprijsde te verbergen. De sortering die je in Epic kiest blijft behouden. Kortingen worden herkend aan de percentagebadge of de doorgestreepte originele prijs.',
            copyLinkTip: 'Maakt een URL die, geopend met het script geïnstalleerd, je huidige sortering en filters herstelt (inclusief "alleen afgeprijsd").',
            ggTip: 'Zoekt de titel op GG.deals met het Epic-DRM-filter. Omdat het een titelzoekopdracht is, wordt niet altijd het exacte spel gevonden.',
            pcgwTip: 'Zoekt op PCGamingWiki (compatibiliteit en fixes) naar het spel zelf: zonder het editiesuffix en, als de pagina bij een ander spel hoort — een DLC, een editie, een valutapakket —, op dat spel. Omdat het op naam zoekt, vindt het niet altijd het juiste artikel.',
            aboutTip: 'Bekijk alles wat dit script doet.',
            aboutTitle: 'Wat doet dit script?',
            aboutName: 'Naam:',
            aboutVersion: 'Versie:',
            aboutAuthor: 'Auteur:',
            aboutBody: [
                'Dit script verbindt de Epic Games Store met EGData en verbetert je verlanglijst.',
                '• Op product- (/p/) en bundelpagina’s (/bundles/): voegt drie knoppen toe onder de koopknop.',
                '– EGData (een database met prijzen en aanbiedingsgeschiedenis) linkt naar precies die aanbieding, niet naar een zoekopdracht.',
                '– GG.deals zoekt tussen de aanbiedingen met Epic-DRM, zonder de standaard minimumwaardering van winkels, en PCGamingWiki zoekt compatibiliteit en fixes. Beide gebruiken de Engelse naam, opgevraagd via het aanbod-id, omdat Epic spelnamen vertaalt; en zodra het aanbod bij een spel hoort — een DLC, een editie, een valutapakket — zoekt PCGamingWiki dat spel. Elk zegt in zijn tooltip dat het op naam zoekt en ernaast kan zitten. Op een pagina die alleen mobiel is, worden noch de GG.deals- noch de PCGamingWiki-knop getekend: de wiki documenteert pc-spellen en GG.deals volgt pc-winkels.',
                '– Eén set knoppen per koopknop: bundels hebben er twee (de balk bovenaan en de sectie "Buy …") en beide krijgen de hunne.',
                '– Binnen de winkel naar een product of bundel navigeren herlaadt de pagina. Epic is een single-page app en het script was niet actief op home, zoeken of bladeren; juist die herlaadactie zorgt dat de knop verschijnt.',
                '• Op je verlanglijst (/wishlist) komt een balk met drie hulpmiddelen bij:',
                '– Alleen afgeprijsd: scrolt automatisch door de hele lijst (Epic laadt die in batches tijdens het scrollen) om ALLE games te vinden en alleen de afgeprijsde te tonen, met behoud van de sortering die je in Epic koos. Kortingen worden herkend aan de percentagebadge of de doorgestreepte originele prijs. Dit wordt apart onthouden, of "Sortering en filters onthouden" nu aan staat of niet.',
                '– Sortering en filters onthouden: slaat de sortering en de zijbalkfilters op die je in Epic kiest en past ze bij terugkomst opnieuw toe.',
                '– Link met filters kopiëren: maakt een URL die bij openen je sortering, je filters en de stand van "alleen afgeprijsd" herstelt. Blokkeert de browser het klembord, dan wordt de URL in een dialoogvenster getoond om hem met de hand te kopiëren.',
                'Alles draait in je browser (opgeslagen in localStorage); er worden geen gegevens naar een server gestuurd.',
            ],
        },
        pt: {
            remember: 'Memorizar ordenação e filtros',
            onlyDiscount: 'Apenas com desconto',
            copyLink: '🔗 Copiar ligação com filtros',
            copied: '✔ Ligação copiada',
            copyPrompt: 'Copie esta ligação:',
            about: 'ℹ️ Saber mais',
            close: 'Fechar',
            rememberTip: 'Guarda a ordenação e os filtros que escolher na Epic e volta a aplicá-los automaticamente sempre que regressar à lista de desejos.',
            onlyDiscountTip: 'Percorre TODA a sua lista (a Epic carrega-a por lotes ao deslocar) para detetar todos os jogos e ocultar os que não estão em promoção. Mantém a ordenação que escolher na Epic. Os descontos são detetados pelo distintivo de percentagem ou pelo preço original riscado.',
            copyLinkTip: 'Gera um URL que, aberto com o script instalado, reproduz a sua ordenação e filtros atuais (incluindo "apenas com desconto").',
            ggTip: 'Procura o título no GG.deals com o filtro de DRM da Epic. Sendo uma pesquisa por título, pode não encontrar o jogo exato.',
            pcgwTip: 'Procura no PCGamingWiki (compatibilidade e correções) o próprio jogo: sem o sufixo de edição e, se a página pertencer a outro jogo — um DLC, uma edição, um pacote de moeda —, por esse jogo. Sendo uma pesquisa por nome, pode não encontrar o artigo exato.',
            aboutTip: 'Ver tudo o que este script faz.',
            aboutTitle: 'O que faz este script?',
            aboutName: 'Nome:',
            aboutVersion: 'Versão:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Este script liga a Epic Games Store ao EGData e melhora a sua lista de desejos.',
                '• Em páginas de produto (/p/) e de pacote (/bundles/): acrescenta três botões por baixo do botão de compra.',
                '– O EGData (base de dados de preços e histórico de promoções) liga a essa oferta concreta, não a uma pesquisa.',
                '– O GG.deals procura entre as ofertas com DRM da Epic, sem o mínimo de avaliação de loja predefinido, e o PCGamingWiki procura compatibilidade e correções. Ambos usam o nome em inglês, pedido pelo id da oferta, porque a Epic traduz os nomes dos jogos; e sempre que a oferta pertencer a um jogo — um DLC, uma edição, um pacote de moeda —, o PCGamingWiki procura esse jogo. Cada um avisa na sua dica que procura por nome e pode falhar. Numa página só para telemóvel não são desenhados nem o botão do GG.deals nem o do PCGamingWiki: a wiki documenta jogos de PC e o GG.deals segue lojas de PC.',
                '– Um conjunto de botões por cada botão de compra: os pacotes têm dois (a barra de cima e a secção "Buy …") e ambos recebem o seu.',
                '– Navegar dentro da loja até um produto ou pacote recarrega a página. A Epic é uma aplicação de página única e o script não estava ativo na página inicial, na pesquisa nem no catálogo; é esse recarregamento que garante que o botão aparece.',
                '• Na sua lista de desejos (/wishlist) acrescenta uma barra com três ferramentas:',
                '– Apenas com desconto: percorre automaticamente toda a lista (a Epic carrega-a por lotes ao deslocar) para detetar TODOS os jogos e mostrar só os que estão em promoção, mantendo a ordenação que escolheu na Epic. Os descontos são detetados pelo distintivo de percentagem ou pelo preço original riscado. É memorizado por si só, esteja ou não ativo "Memorizar ordenação e filtros".',
                '– Memorizar ordenação e filtros: guarda a ordenação e os filtros da barra lateral que escolher na Epic e volta a aplicá-los ao regressar.',
                '– Copiar ligação com filtros: gera um URL que, ao ser aberto, reproduz a sua ordenação, os seus filtros e o estado de "apenas com desconto". Se o navegador bloquear a área de transferência, mostra o URL numa caixa de diálogo para o copiar à mão.',
                'Tudo é processado no seu navegador (guardado em localStorage); não são enviados dados para nenhum servidor.',
            ],
        },
        'pt-br': {
            remember: 'Lembrar ordenação e filtros',
            onlyDiscount: 'Somente com desconto',
            copyLink: '🔗 Copiar link com filtros',
            copied: '✔ Link copiado',
            copyPrompt: 'Copie este link:',
            about: 'ℹ️ Saiba mais',
            close: 'Fechar',
            rememberTip: 'Salva a ordenação e os filtros que você escolher na Epic e os aplica de novo automaticamente toda vez que voltar à lista de desejos.',
            onlyDiscountTip: 'Percorre TODA a sua lista (a Epic carrega em lotes conforme você rola) para detectar todos os jogos e ocultar os que não estão em promoção. Mantém a ordenação que você escolher na Epic. Os descontos são detectados pelo selo de porcentagem ou pelo preço original riscado.',
            copyLinkTip: 'Gera uma URL que, aberta com o script instalado, reproduz sua ordenação e filtros atuais (incluindo "somente com desconto").',
            ggTip: 'Busca o título no GG.deals com o filtro de DRM da Epic. Por ser uma busca por título, pode não encontrar o jogo exato.',
            pcgwTip: 'Busca no PCGamingWiki (compatibilidade e correções) o próprio jogo: sem o sufixo de edição e, se a página pertencer a outro jogo — uma DLC, uma edição, um pacote de moedas —, por esse jogo. Por ser uma busca por nome, pode não encontrar o artigo exato.',
            aboutTip: 'Ver tudo o que este script faz.',
            aboutTitle: 'O que este script faz?',
            aboutName: 'Nome:',
            aboutVersion: 'Versão:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Este script conecta a Epic Games Store ao EGData e melhora sua lista de desejos.',
                '• Em páginas de produto (/p/) e de pacote (/bundles/): adiciona três botões abaixo do botão de compra.',
                '– O EGData (banco de dados de preços e histórico de ofertas) leva a essa oferta específica, não a uma busca.',
                '– O GG.deals busca entre as ofertas com DRM da Epic, sem o mínimo de avaliação de loja padrão, e o PCGamingWiki busca compatibilidade e correções. Os dois usam o nome em inglês, pedido pelo id da oferta, porque a Epic traduz os nomes dos jogos; e sempre que a oferta pertencer a um jogo — uma DLC, uma edição, um pacote de moedas —, o PCGamingWiki busca esse jogo. Cada um avisa na sua dica que busca por nome e pode errar. Em uma página só para celular não são desenhados nem o botão do GG.deals nem o do PCGamingWiki: a wiki documenta jogos de PC e o GG.deals segue lojas de PC.',
                '– Um conjunto de botões por botão de compra: os pacotes têm dois (a barra de cima e a seção "Buy …") e ambos recebem o seu.',
                '– Navegar dentro da loja até um produto ou pacote recarrega a página. A Epic é um aplicativo de página única e o script não estava ativo na home, na busca nem no catálogo; é esse recarregamento que garante que o botão apareça.',
                '• Na sua lista de desejos (/wishlist) adiciona uma barra com três ferramentas:',
                '– Somente com desconto: percorre automaticamente a lista inteira (a Epic carrega em lotes conforme você rola) para detectar TODOS os jogos e mostrar apenas os que estão em promoção, mantendo a ordenação que você escolheu na Epic. Os descontos são detectados pelo selo de porcentagem ou pelo preço original riscado. É lembrado por conta própria, esteja ou não ativo "Lembrar ordenação e filtros".',
                '– Lembrar ordenação e filtros: salva a ordenação e os filtros da barra lateral que você escolher na Epic e os aplica de novo quando você voltar.',
                '– Copiar link com filtros: gera uma URL que, ao ser aberta, reproduz sua ordenação, seus filtros e o estado de "somente com desconto". Se o navegador bloquear a área de transferência, mostra a URL em uma caixa de diálogo para copiar à mão.',
                'Tudo é processado no seu navegador (salvo no localStorage); nenhum dado é enviado a nenhum servidor.',
            ],
        },
        pl: {
            remember: 'Zapamiętaj sortowanie i filtry',
            onlyDiscount: 'Tylko przecenione',
            copyLink: '🔗 Kopiuj link z filtrami',
            copied: '✔ Link skopiowany',
            copyPrompt: 'Skopiuj ten link:',
            about: 'ℹ️ Dowiedz się więcej',
            close: 'Zamknij',
            rememberTip: 'Zapisuje sortowanie i filtry wybrane w Epic i stosuje je automatycznie za każdym razem, gdy wracasz na listę życzeń.',
            onlyDiscountTip: 'Przewija CAŁĄ twoją listę (Epic ładuje ją partiami podczas przewijania), aby wykryć wszystkie gry i ukryć te, które nie są w promocji. Zachowuje sortowanie wybrane w Epic. Przeceny są wykrywane po plakietce z procentem lub po przekreślonej cenie pierwotnej.',
            copyLinkTip: 'Tworzy adres URL, który po otwarciu z zainstalowanym skryptem odtwarza bieżące sortowanie i filtry (wraz z „tylko przecenione”).',
            ggTip: 'Wyszukuje tytuł w GG.deals z filtrem DRM Epic. Ponieważ to wyszukiwanie po tytule, może nie trafić w dokładną grę.',
            pcgwTip: 'Szuka w PCGamingWiki (zgodność i poprawki) samej gry: bez dopisku edycji, a jeśli strona należy do innej gry — DLC, edycja, pakiet waluty — po tej grze. Ponieważ to wyszukiwanie po nazwie, może nie trafić w dokładny artykuł.',
            aboutTip: 'Zobacz wszystko, co robi ten skrypt.',
            aboutTitle: 'Co robi ten skrypt?',
            aboutName: 'Nazwa:',
            aboutVersion: 'Wersja:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Ten skrypt łączy Epic Games Store z EGData i ulepsza twoją listę życzeń.',
                '• Na stronach produktu (/p/) i pakietu (/bundles/): dodaje trzy przyciski pod przyciskiem zakupu.',
                '– EGData (baza cen i historii promocji) prowadzi dokładnie do tej oferty, a nie do wyszukiwania.',
                '– GG.deals szuka wśród ofert z DRM Epica, bez domyślnego progu oceny sklepów, a PCGamingWiki szuka zgodności i poprawek. Oba używają angielskiej nazwy, pobranej po id oferty, bo Epic tłumaczy nazwy gier; a gdy oferta należy do gry — DLC, edycja, pakiet waluty — PCGamingWiki szuka tej gry. Każdy uprzedza w swojej podpowiedzi, że szuka po nazwie i może nie trafić. Na stronie wyłącznie mobilnej nie pojawiają się ani przycisk GG.deals, ani PCGamingWiki: wiki opisuje gry na PC, a GG.deals śledzi sklepy PC.',
                '– Jeden zestaw przycisków na każdy przycisk zakupu: pakiety mają dwa (górny pasek i sekcja „Buy …”) i oba dostają swój.',
                '– Przejście wewnątrz sklepu do produktu lub pakietu przeładowuje stronę. Epic to aplikacja jednostronicowa, a skrypt nie był aktywny na stronie głównej, w wyszukiwarce ani w katalogu; to właśnie to przeładowanie gwarantuje pojawienie się przycisku.',
                '• Na twojej liście życzeń (/wishlist) dodaje pasek z trzema narzędziami:',
                '– Tylko przecenione: automatycznie przewija całą listę (Epic ładuje ją partiami podczas przewijania), aby wykryć WSZYSTKIE gry i pokazać tylko te w promocji, zachowując sortowanie wybrane w Epic. Przeceny są wykrywane po plakietce z procentem lub po przekreślonej cenie pierwotnej. Jest zapamiętywane osobno, niezależnie od tego, czy „Zapamiętaj sortowanie i filtry” jest włączone.',
                '– Zapamiętaj sortowanie i filtry: zapisuje sortowanie i filtry paska bocznego wybrane w Epic i stosuje je po powrocie.',
                '– Kopiuj link z filtrami: tworzy adres URL, który po otwarciu odtwarza twoje sortowanie, filtry i stan „tylko przecenione”. Jeśli przeglądarka zablokuje schowek, adres pojawi się w oknie dialogowym do ręcznego skopiowania.',
                'Wszystko działa w twojej przeglądarce (zapisywane w localStorage); żadne dane nie są wysyłane na serwer.',
            ],
        },
        ru: {
            remember: 'Запоминать сортировку и фильтры',
            onlyDiscount: 'Только со скидкой',
            copyLink: '🔗 Скопировать ссылку с фильтрами',
            copied: '✔ Ссылка скопирована',
            copyPrompt: 'Скопируйте эту ссылку:',
            about: 'ℹ️ Подробнее',
            close: 'Закрыть',
            rememberTip: 'Сохраняет выбранные в Epic сортировку и фильтры и применяет их автоматически при каждом возвращении в список желаемого.',
            onlyDiscountTip: 'Прокручивает ВЕСЬ ваш список (Epic подгружает его частями при прокрутке), чтобы найти все игры и скрыть те, что не по скидке. Сортировка, выбранная в Epic, сохраняется. Скидка определяется по значку с процентом или по зачёркнутой исходной цене.',
            copyLinkTip: 'Формирует ссылку, которая при открытии с установленным скриптом воспроизводит текущие сортировку и фильтры (включая «только со скидкой»).',
            ggTip: 'Ищет название на GG.deals с фильтром DRM Epic. Это поиск по названию, поэтому нужная игра может не найтись.',
            pcgwTip: 'Ищет в PCGamingWiki (совместимость и исправления) саму игру: без суффикса издания, а если страница относится к другой игре — DLC, издание, набор валюты — по этой игре. Это поиск по названию, поэтому он может не попасть в нужную статью.',
            aboutTip: 'Посмотреть всё, что делает этот скрипт.',
            aboutTitle: 'Что делает этот скрипт?',
            aboutName: 'Название:',
            aboutVersion: 'Версия:',
            aboutAuthor: 'Автор:',
            aboutBody: [
                'Этот скрипт связывает Epic Games Store с EGData и улучшает ваш список желаемого.',
                '• На страницах товара (/p/) и комплекта (/bundles/): добавляет три кнопки под кнопкой покупки.',
                '– EGData (база цен и истории скидок) ведёт именно к этому предложению, а не к поиску.',
                '– GG.deals ищет среди предложений с DRM Epic, без стандартного минимального рейтинга магазинов, а PCGamingWiki ищет совместимость и исправления. Оба используют английское название, полученное по id предложения, потому что Epic переводит названия игр; а если предложение относится к игре — DLC, издание, набор валюты — PCGamingWiki ищет эту игру. Каждый предупреждает в подсказке, что ищет по названию и может промахнуться. На странице только для мобильных не рисуются ни кнопка GG.deals, ни PCGamingWiki: вики документирует игры для ПК, а GG.deals следит за магазинами ПК.',
                '– По одному набору кнопок на каждую кнопку покупки: у комплектов их две (верхняя панель и раздел «Buy …»), и каждая получает свой.',
                '– Переход внутри магазина к товару или комплекту перезагружает страницу. Epic — одностраничное приложение, и на главной, в поиске и в каталоге скрипт не был активен; именно эта перезагрузка гарантирует появление кнопки.',
                '• В списке желаемого (/wishlist) добавляется панель с тремя инструментами:',
                '– Только со скидкой: автоматически прокручивает весь список (Epic подгружает его частями при прокрутке), чтобы найти ВСЕ игры и показать только те, что по скидке, сохраняя выбранную в Epic сортировку. Скидка определяется по значку с процентом или по зачёркнутой исходной цене. Запоминается отдельно, независимо от того, включено ли «Запоминать сортировку и фильтры».',
                '– Запоминать сортировку и фильтры: сохраняет выбранные в Epic сортировку и фильтры боковой панели и применяет их при возвращении.',
                '– Скопировать ссылку с фильтрами: формирует ссылку, которая при открытии воспроизводит вашу сортировку, фильтры и состояние «только со скидкой». Если браузер блокирует буфер обмена, ссылка показывается в диалоге для копирования вручную.',
                'Всё выполняется в вашем браузере (сохраняется в localStorage); никакие данные не отправляются на сервер.',
            ],
        },
        uk: {
            remember: 'Запам’ятовувати сортування та фільтри',
            onlyDiscount: 'Лише зі знижкою',
            copyLink: '🔗 Скопіювати посилання з фільтрами',
            copied: '✔ Посилання скопійовано',
            copyPrompt: 'Скопіюйте це посилання:',
            about: 'ℹ️ Докладніше',
            close: 'Закрити',
            rememberTip: 'Зберігає обрані в Epic сортування та фільтри і застосовує їх автоматично щоразу, коли ви повертаєтесь до списку бажаного.',
            onlyDiscountTip: 'Прокручує ВЕСЬ ваш список (Epic підвантажує його частинами під час прокручування), щоб знайти всі ігри та сховати ті, що не зі знижкою. Сортування, обране в Epic, зберігається. Знижку визначено за значком з відсотком або за закресленою початковою ціною.',
            copyLinkTip: 'Створює посилання, яке при відкритті зі встановленим скриптом відтворює поточні сортування та фільтри (разом із «лише зі знижкою»).',
            ggTip: 'Шукає назву на GG.deals із фільтром DRM Epic. Це пошук за назвою, тож потрібна гра може не знайтися.',
            pcgwTip: 'Шукає в PCGamingWiki (сумісність і виправлення) саму гру: без суфікса видання, а якщо сторінка належить до іншої гри — DLC, видання, набір валюти — за цією грою. Це пошук за назвою, тож він може не влучити в потрібну статтю.',
            aboutTip: 'Переглянути все, що робить цей скрипт.',
            aboutTitle: 'Що робить цей скрипт?',
            aboutName: 'Назва:',
            aboutVersion: 'Версія:',
            aboutAuthor: 'Автор:',
            aboutBody: [
                'Цей скрипт пов’язує Epic Games Store з EGData і покращує ваш список бажаного.',
                '• На сторінках товару (/p/) і комплекту (/bundles/): додає три кнопки під кнопкою купівлі.',
                '– EGData (база цін та історії знижок) веде саме до цієї пропозиції, а не до пошуку.',
                '– GG.deals шукає серед пропозицій із DRM Epic, без типового мінімального рейтингу магазинів, а PCGamingWiki шукає сумісність і виправлення. Обидва беруть англійську назву, отриману за id пропозиції, бо Epic перекладає назви ігор; а якщо пропозиція належить до гри — DLC, видання, набір валюти — PCGamingWiki шукає цю гру. Кожен попереджає у підказці, що шукає за назвою і може не влучити. На сторінці лише для мобільних не малюються ні кнопка GG.deals, ні PCGamingWiki: вікі документує ігри для ПК, а GG.deals стежить за магазинами ПК.',
                '– По одному набору кнопок на кожну кнопку купівлі: у комплектів їх дві (верхня панель і розділ «Buy …»), і кожна отримує свій.',
                '– Перехід усередині магазину до товару чи комплекту перезавантажує сторінку. Epic — односторінковий застосунок, і на головній, у пошуку та в каталозі скрипт не був активним; саме це перезавантаження гарантує появу кнопки.',
                '• У списку бажаного (/wishlist) додається панель із трьома інструментами:',
                '– Лише зі знижкою: автоматично прокручує весь список (Epic підвантажує його частинами під час прокручування), щоб знайти ВСІ ігри та показати тільки ті, що зі знижкою, зберігаючи обране в Epic сортування. Знижку визначено за значком з відсотком або за закресленою початковою ціною. Запам’ятовується окремо, незалежно від того, чи ввімкнено «Запам’ятовувати сортування та фільтри».',
                '– Запам’ятовувати сортування та фільтри: зберігає обрані в Epic сортування та фільтри бічної панелі і застосовує їх при поверненні.',
                '– Скопіювати посилання з фільтрами: створює посилання, яке при відкритті відтворює ваше сортування, фільтри та стан «лише зі знижкою». Якщо браузер блокує буфер обміну, посилання показується в діалозі для копіювання вручну.',
                'Усе виконується у вашому браузері (зберігається в localStorage); жодні дані не надсилаються на сервер.',
            ],
        },
        cs: {
            remember: 'Zapamatovat řazení a filtry',
            onlyDiscount: 'Pouze zlevněné',
            copyLink: '🔗 Kopírovat odkaz s filtry',
            copied: '✔ Odkaz zkopírován',
            copyPrompt: 'Zkopírujte tento odkaz:',
            about: 'ℹ️ Zjistit více',
            close: 'Zavřít',
            rememberTip: 'Uloží řazení a filtry zvolené v Epicu a znovu je použije pokaždé, když se vrátíte na seznam přání.',
            onlyDiscountTip: 'Projde CELÝ váš seznam (Epic ho načítá po dávkách při posouvání), aby našel všechny hry a skryl ty, které nejsou ve slevě. Řazení zvolené v Epicu zůstává zachováno. Slevy se poznají podle štítku s procenty nebo podle přeškrtnuté původní ceny.',
            copyLinkTip: 'Vytvoří adresu URL, která po otevření s nainstalovaným skriptem obnoví vaše aktuální řazení a filtry (včetně „pouze zlevněné“).',
            ggTip: 'Vyhledá název na GG.deals s filtrem DRM Epic. Protože jde o vyhledávání podle názvu, nemusí najít přesnou hru.',
            pcgwTip: 'Hledá na PCGamingWiki (kompatibilita a opravy) samotnou hru: bez přípony edice, a pokud stránka patří k jiné hře — DLC, edice, balíček měny — podle této hry. Protože jde o hledání podle názvu, nemusí trefit přesný článek.',
            aboutTip: 'Zobrazit vše, co tento skript dělá.',
            aboutTitle: 'Co tento skript dělá?',
            aboutName: 'Název:',
            aboutVersion: 'Verze:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Tento skript propojuje Epic Games Store s EGData a vylepšuje váš seznam přání.',
                '• Na stránkách produktu (/p/) a balíčku (/bundles/): přidává tři tlačítka pod tlačítko nákupu.',
                '– EGData (databáze cen a historie slev) odkazuje přesně na tuto nabídku, ne na vyhledávání.',
                '– GG.deals hledá mezi nabídkami s DRM Epicu, bez výchozího minimálního hodnocení obchodů, a PCGamingWiki hledá kompatibilitu a opravy. Oba používají anglický název, získaný podle id nabídky, protože Epic názvy her překládá; a pokud nabídka patří ke hře — DLC, edice, balíček měny — hledá PCGamingWiki tuto hru. Každý ve své bublině upozorňuje, že hledá podle názvu a nemusí trefit. Na stránce jen pro mobily se nevykreslí ani tlačítko GG.deals, ani PCGamingWiki: wiki popisuje hry pro PC a GG.deals sleduje PC obchody.',
                '– Jedna sada tlačítek na každé tlačítko nákupu: balíčky mají dvě (horní lišta a sekce „Buy …“) a obě dostanou svou.',
                '– Přechod uvnitř obchodu na produkt nebo balíček znovu načte stránku. Epic je jednostránková aplikace a skript nebyl aktivní na domovské stránce, ve vyhledávání ani v katalogu; právě toto načtení zaručí, že se tlačítko objeví.',
                '• Na vašem seznamu přání (/wishlist) přidává lištu se třemi nástroji:',
                '– Pouze zlevněné: automaticky projde celý seznam (Epic ho načítá po dávkách při posouvání), aby našel VŠECHNY hry a zobrazil jen ty ve slevě, se zachováním řazení zvoleného v Epicu. Slevy se poznají podle štítku s procenty nebo podle přeškrtnuté původní ceny. Pamatuje se samostatně, ať už je „Zapamatovat řazení a filtry“ zapnuté, nebo ne.',
                '– Zapamatovat řazení a filtry: uloží řazení a filtry postranního panelu zvolené v Epicu a znovu je použije po návratu.',
                '– Kopírovat odkaz s filtry: vytvoří adresu URL, která po otevření obnoví vaše řazení, filtry a stav „pouze zlevněné“. Pokud prohlížeč zablokuje schránku, zobrazí adresu v dialogu, abyste ji mohli zkopírovat ručně.',
                'Vše probíhá ve vašem prohlížeči (uloženo v localStorage); na žádný server se neodesílají data.',
            ],
        },
        da: {
            remember: 'Husk sortering og filtre',
            onlyDiscount: 'Kun nedsatte',
            copyLink: '🔗 Kopiér link med filtre',
            copied: '✔ Link kopieret',
            copyPrompt: 'Kopiér dette link:',
            about: 'ℹ️ Læs mere',
            close: 'Luk',
            rememberTip: 'Gemmer den sortering og de filtre, du vælger i Epic, og anvender dem automatisk igen, hver gang du vender tilbage til ønskelisten.',
            onlyDiscountTip: 'Scroller gennem HELE din liste (Epic indlæser den i portioner, når du scroller) for at finde alle spil og skjule dem, der ikke er på tilbud. Den sortering, du vælger i Epic, bevares. Rabatter genkendes på procentmærket eller den overstregede originalpris.',
            copyLinkTip: 'Bygger en URL, der ved åbning med scriptet installeret gendanner din nuværende sortering og dine filtre (inklusive "kun nedsatte").',
            ggTip: 'Søger efter titlen på GG.deals med Epics DRM-filter. Da det er en titelsøgning, rammer den ikke altid det præcise spil.',
            pcgwTip: 'Søger på PCGamingWiki (kompatibilitet og rettelser) efter selve spillet: uden editionssuffiks og, hvis siden hører til et andet spil — en DLC, en udgave, en valutapakke —, efter det spil. Da det er en navnesøgning, rammer den ikke altid den præcise artikel.',
            aboutTip: 'Se alt, hvad dette script gør.',
            aboutTitle: 'Hvad gør dette script?',
            aboutName: 'Navn:',
            aboutVersion: 'Version:',
            aboutAuthor: 'Forfatter:',
            aboutBody: [
                'Dette script forbinder Epic Games Store med EGData og forbedrer din ønskeliste.',
                '• På produkt- (/p/) og bundtsider (/bundles/): tilføjer tre knapper under købsknappen.',
                '– EGData (en database over priser og tilbudshistorik) linker til præcis det tilbud, ikke til en søgning.',
                '– GG.deals søger blandt tilbud med Epic-DRM, uden den forvalgte mindstevurdering af butikker, og PCGamingWiki søger efter kompatibilitet og rettelser. Begge bruger det engelske navn, hentet via tilbuddets id, fordi Epic oversætter spilnavne; og når tilbuddet hører til et spil — en DLC, en udgave, en valutapakke — søger PCGamingWiki det spil. Hver enkelt siger i sit værktøjstip, at den søger på navn og kan ramme forkert. På en side kun til mobil tegnes hverken GG.deals- eller PCGamingWiki-knappen: wikien dokumenterer pc-spil, og GG.deals følger pc-butikker.',
                '– Ét sæt knapper pr. købsknap: bundter har to (bjælken øverst og afsnittet "Buy …"), og begge får deres.',
                '– At navigere inde i butikken til et produkt eller et bundt genindlæser siden. Epic er en single-page-app, og scriptet var ikke aktivt på forsiden, i søgningen eller i katalogget; netop den genindlæsning sikrer, at knappen dukker op.',
                '• På din ønskeliste (/wishlist) tilføjes en bjælke med tre værktøjer:',
                '– Kun nedsatte: scroller automatisk gennem hele listen (Epic indlæser den i portioner, når du scroller) for at finde ALLE spil og kun vise dem på tilbud, med den sortering du valgte i Epic. Rabatter genkendes på procentmærket eller den overstregede originalpris. Det huskes for sig selv, uanset om "Husk sortering og filtre" er slået til.',
                '– Husk sortering og filtre: gemmer den sortering og de sidepanelfiltre, du vælger i Epic, og anvender dem igen, når du kommer tilbage.',
                '– Kopiér link med filtre: bygger en URL, der ved åbning gendanner din sortering, dine filtre og tilstanden for "kun nedsatte". Blokerer browseren udklipsholderen, vises URL\'en i en dialog, så du kan kopiere den i hånden.',
                'Alt kører i din browser (gemt i localStorage); der sendes ingen data til nogen server.',
            ],
        },
        fi: {
            remember: 'Muista lajittelu ja suodattimet',
            onlyDiscount: 'Vain alennetut',
            copyLink: '🔗 Kopioi linkki suodattimineen',
            copied: '✔ Linkki kopioitu',
            copyPrompt: 'Kopioi tämä linkki:',
            about: 'ℹ️ Lue lisää',
            close: 'Sulje',
            rememberTip: 'Tallentaa Epicissä valitsemasi lajittelun ja suodattimet ja ottaa ne automaattisesti uudelleen käyttöön aina, kun palaat toivelistalle.',
            onlyDiscountTip: 'Vierittää KOKO listasi läpi (Epic lataa sen erissä vierityksen aikana) löytääkseen kaikki pelit ja piilottaakseen ne, jotka eivät ole tarjouksessa. Epicissä valitsemasi lajittelu säilyy. Alennukset tunnistetaan prosenttimerkinnästä tai yliviivatusta alkuperäishinnasta.',
            copyLinkTip: 'Muodostaa osoitteen, joka skripti asennettuna avattaessa palauttaa nykyisen lajittelusi ja suodattimesi (mukaan lukien "vain alennetut").',
            ggTip: 'Hakee nimen GG.deals-sivustolta Epicin DRM-suodattimella. Koska kyseessä on nimihaku, se ei aina osu täsmälleen oikeaan peliin.',
            pcgwTip: 'Hakee PCGamingWikistä (yhteensopivuus ja korjaukset) itse pelin: ilman laitosliitettä, ja jos sivu kuuluu toiseen peliin — DLC, laitos, valuuttapaketti — sen pelin nimellä. Koska haku tehdään nimellä, se ei aina osu oikeaan artikkeliin.',
            aboutTip: 'Katso kaikki, mitä tämä skripti tekee.',
            aboutTitle: 'Mitä tämä skripti tekee?',
            aboutName: 'Nimi:',
            aboutVersion: 'Versio:',
            aboutAuthor: 'Tekijä:',
            aboutBody: [
                'Tämä skripti yhdistää Epic Games Storen EGDataan ja parantaa toivelistaasi.',
                '• Tuote- (/p/) ja kokoelmasivuilla (/bundles/): lisää kolme painiketta ostopainikkeen alle.',
                '– EGData (hintojen ja tarjoushistorian tietokanta) vie juuri siihen tarjoukseen, ei hakuun.',
                '– GG.deals hakee Epic-DRM:n tarjouksista ilman oletusarvoista kauppojen vähimmäisarvosanaa, ja PCGamingWiki hakee yhteensopivuutta ja korjauksia. Molemmat käyttävät englanninkielistä nimeä, joka haetaan tarjouksen id:llä, koska Epic kääntää pelien nimet; ja kun tarjous kuuluu peliin — DLC, laitos, valuuttapaketti — PCGamingWiki hakee sen pelin. Kumpikin kertoo vihjeessään hakevansa nimellä ja voivansa osua väärin. Pelkästään mobiilille tarkoitetulla sivulla ei piirretä GG.deals- eikä PCGamingWiki-painiketta: wiki dokumentoi PC-pelejä ja GG.deals seuraa PC-kauppoja.',
                '– Yksi painikesarja jokaista ostopainiketta kohden: kokoelmilla niitä on kaksi (ylapalkki ja "Buy …" -osio) ja molemmat saavat omansa.',
                '– Kaupan sisällä tuotteeseen tai kokoelmaan siirtyminen lataa sivun uudelleen. Epic on yhden sivun sovellus eikä skripti ollut aktiivinen etusivulla, haussa tai selauksessa; juuri tuo uudelleenlataus takaa, että painike ilmestyy.',
                '• Toivelistallesi (/wishlist) lisätään palkki, jossa on kolme työkalua:',
                '– Vain alennetut: vierittää automaattisesti koko listan läpi (Epic lataa sen erissä vierityksen aikana) löytääkseen KAIKKI pelit ja näyttääkseen vain tarjouksessa olevat, säilyttäen Epicissä valitsemasi lajittelun. Alennukset tunnistetaan prosenttimerkinnästä tai yliviivatusta alkuperäishinnasta. Tämä muistetaan erikseen riippumatta siitä, onko "Muista lajittelu ja suodattimet" päällä.',
                '– Muista lajittelu ja suodattimet: tallentaa Epicissä valitsemasi lajittelun ja sivupalkin suodattimet ja ottaa ne uudelleen käyttöön palatessasi.',
                '– Kopioi linkki suodattimineen: muodostaa osoitteen, joka avattaessa palauttaa lajittelusi, suodattimesi ja "vain alennetut" -tilan. Jos selain estää leikepöydän, osoite näytetään valintaikkunassa käsin kopioitavaksi.',
                'Kaikki tapahtuu selaimessasi (tallennetaan localStorageen); mitään tietoja ei lähetetä palvelimelle.',
            ],
        },
        sv: {
            remember: 'Kom ihåg sortering och filter',
            onlyDiscount: 'Endast rabatterade',
            copyLink: '🔗 Kopiera länk med filter',
            copied: '✔ Länk kopierad',
            copyPrompt: 'Kopiera den här länken:',
            about: 'ℹ️ Läs mer',
            close: 'Stäng',
            rememberTip: 'Sparar den sortering och de filter du väljer i Epic och tillämpar dem automatiskt varje gång du återvänder till önskelistan.',
            onlyDiscountTip: 'Skrollar genom HELA din lista (Epic laddar den i omgångar när du skrollar) för att hitta alla spel och dölja dem som inte är på rea. Sorteringen du väljer i Epic behålls. Rabatter känns igen på procentmärket eller det överstrukna originalpriset.',
            copyLinkTip: 'Bygger en URL som, öppnad med skriptet installerat, återskapar din nuvarande sortering och dina filter (inklusive "endast rabatterade").',
            ggTip: 'Söker efter titeln på GG.deals med Epics DRM-filter. Eftersom det är en titelsökning hittas inte alltid exakt rätt spel.',
            pcgwTip: 'Söker på PCGamingWiki (kompatibilitet och fixar) efter själva spelet: utan editionssuffix och, om sidan hör till ett annat spel — en DLC, en utgåva, ett valutapaket —, efter det spelet. Eftersom det är en namnsökning träffar den inte alltid rätt artikel.',
            aboutTip: 'Se allt som det här skriptet gör.',
            aboutTitle: 'Vad gör det här skriptet?',
            aboutName: 'Namn:',
            aboutVersion: 'Version:',
            aboutAuthor: 'Författare:',
            aboutBody: [
                'Det här skriptet kopplar ihop Epic Games Store med EGData och förbättrar din önskelista.',
                '• På produkt- (/p/) och paketsidor (/bundles/): lägger till tre knappar under köpknappen.',
                '– EGData (en databas över priser och reahistorik) länkar till exakt det erbjudandet, inte till en sökning.',
                '– GG.deals söker bland erbjudanden med Epic-DRM, utan standardgränsen för butiksbetyg, och PCGamingWiki söker efter kompatibilitet och fixar. Båda använder det engelska namnet, hämtat via erbjudandets id, eftersom Epic översätter spelnamn; och när erbjudandet hör till ett spel — en DLC, en utgåva, ett valutapaket — söker PCGamingWiki det spelet. Var och en säger i sin tooltip att den söker på namn och kan missa. På en sida som bara är för mobil ritas varken GG.deals- eller PCGamingWiki-knappen: wikin dokumenterar pc-spel och GG.deals följer pc-butiker.',
                '– En uppsättning knappar per köpknapp: paket har två (fältet högst upp och avsnittet "Buy …") och båda får sina.',
                '– Att navigera inne i butiken till en produkt eller ett paket laddar om sidan. Epic är en ensidesapp och skriptet var inte aktivt på startsidan, i sökningen eller i katalogen; det är just den omladdningen som garanterar att knappen dyker upp.',
                '• På din önskelista (/wishlist) läggs ett fält med tre verktyg till:',
                '– Endast rabatterade: skrollar automatiskt genom hela listan (Epic laddar den i omgångar när du skrollar) för att hitta ALLA spel och bara visa dem som är på rea, med den sortering du valde i Epic. Rabatter känns igen på procentmärket eller det överstrukna originalpriset. Det kommer ihåg för sig självt, oavsett om "Kom ihåg sortering och filter" är på.',
                '– Kom ihåg sortering och filter: sparar den sortering och de sidofältsfilter du väljer i Epic och tillämpar dem när du kommer tillbaka.',
                '– Kopiera länk med filter: bygger en URL som vid öppning återskapar din sortering, dina filter och läget för "endast rabatterade". Om webbläsaren blockerar urklipp visas URL:en i en dialogruta så att du kan kopiera den för hand.',
                'Allt körs i din webbläsare (sparat i localStorage); inga data skickas till någon server.',
            ],
        },
        no: {
            remember: 'Husk sortering og filtre',
            onlyDiscount: 'Kun nedsatte',
            copyLink: '🔗 Kopier lenke med filtre',
            copied: '✔ Lenke kopiert',
            copyPrompt: 'Kopier denne lenken:',
            about: 'ℹ️ Les mer',
            close: 'Lukk',
            rememberTip: 'Lagrer sorteringen og filtrene du velger i Epic, og bruker dem automatisk igjen hver gang du kommer tilbake til ønskelisten.',
            onlyDiscountTip: 'Blar gjennom HELE listen din (Epic laster den i puljer når du blar) for å finne alle spill og skjule dem som ikke er på tilbud. Sorteringen du velger i Epic beholdes. Rabatter gjenkjennes på prosentmerket eller den overstrøkne originalprisen.',
            copyLinkTip: 'Bygger en URL som, åpnet med skriptet installert, gjenskaper din nåværende sortering og dine filtre (inkludert "kun nedsatte").',
            ggTip: 'Søker etter tittelen på GG.deals med Epics DRM-filter. Siden det er et tittelsøk, treffer det ikke alltid det eksakte spillet.',
            pcgwTip: 'Søker på PCGamingWiki (kompatibilitet og fikser) etter selve spillet: uten edisjonssuffiks, og hvis siden hører til et annet spill — en DLC, en utgave, en valutapakke — etter det spillet. Siden det er et navnesøk, treffer det ikke alltid den eksakte artikkelen.',
            aboutTip: 'Se alt dette skriptet gjør.',
            aboutTitle: 'Hva gjør dette skriptet?',
            aboutName: 'Navn:',
            aboutVersion: 'Versjon:',
            aboutAuthor: 'Forfatter:',
            aboutBody: [
                'Dette skriptet kobler Epic Games Store til EGData og forbedrer ønskelisten din.',
                '• På produkt- (/p/) og pakkesider (/bundles/): legger til tre knapper under kjøpsknappen.',
                '– EGData (en database over priser og tilbudshistorikk) lenker til akkurat det tilbudet, ikke til et søk.',
                '– GG.deals søker blant tilbud med Epic-DRM, uten standard minstekrav til butikkvurdering, og PCGamingWiki søker etter kompatibilitet og fikser. Begge bruker det engelske navnet, hentet via tilbudets id, fordi Epic oversetter spillnavn; og når tilbudet hører til et spill — en DLC, en utgave, en valutapakke — søker PCGamingWiki det spillet. Hver av dem sier i verktøytipset at den søker på navn og kan bomme. På en side som bare er for mobil, tegnes verken GG.deals- eller PCGamingWiki-knappen: wikien dokumenterer PC-spill, og GG.deals følger PC-butikker.',
                '– Ett sett knapper per kjøpsknapp: pakker har to (linjen øverst og delen "Buy …"), og begge får sine.',
                '– Å navigere inne i butikken til et produkt eller en pakke laster siden på nytt. Epic er en ensides app, og skriptet var ikke aktivt på forsiden, i søket eller i katalogen; nettopp den innlastingen garanterer at knappen dukker opp.',
                '• På ønskelisten din (/wishlist) legges det til en linje med tre verktøy:',
                '– Kun nedsatte: blar automatisk gjennom hele listen (Epic laster den i puljer når du blar) for å finne ALLE spill og bare vise dem som er på tilbud, med sorteringen du valgte i Epic. Rabatter gjenkjennes på prosentmerket eller den overstrøkne originalprisen. Det huskes for seg selv, uansett om "Husk sortering og filtre" er på.',
                '– Husk sortering og filtre: lagrer sorteringen og sidepanelfiltrene du velger i Epic, og bruker dem igjen når du kommer tilbake.',
                '– Kopier lenke med filtre: bygger en URL som ved åpning gjenskaper sorteringen din, filtrene dine og tilstanden for "kun nedsatte". Blokkerer nettleseren utklippstavlen, vises URL-en i en dialog så du kan kopiere den for hånd.',
                'Alt kjører i nettleseren din (lagret i localStorage); ingen data sendes til noen server.',
            ],
        },
        hu: {
            remember: 'Rendezés és szűrők megjegyzése',
            onlyDiscount: 'Csak akciós',
            copyLink: '🔗 Link másolása szűrőkkel',
            copied: '✔ Link másolva',
            copyPrompt: 'Másold ki ezt a linket:',
            about: 'ℹ️ További információ',
            close: 'Bezárás',
            rememberTip: 'Elmenti az Epicben kiválasztott rendezést és szűrőket, és automatikusan újra alkalmazza őket, valahányszor visszatérsz a kívánságlistához.',
            onlyDiscountTip: 'Végiggörgeti a TELJES listádat (az Epic görgetéskor adagokban tölti be), hogy megtaláljon minden játékot, és elrejtse azokat, amelyek nincsenek akcióban. Az Epicben választott rendezés megmarad. Az akciót a százalékos jelvény vagy az áthúzott eredeti ár alapján ismeri fel.',
            copyLinkTip: 'Olyan URL-t készít, amely a szkript telepítése mellett megnyitva visszaállítja a jelenlegi rendezésedet és szűrőidet (a „csak akciós” beállítással együtt).',
            ggTip: 'Megkeresi a címet a GG.deals oldalon az Epic DRM-szűrőjével. Mivel cím szerinti keresés, előfordulhat, hogy nem a pontos játékot találja meg.',
            pcgwTip: 'A PCGamingWikin (kompatibilitás és javítások) magát a játékot keresi: kiadás-utótag nélkül, és ha az oldal egy másik játékhoz tartozik — DLC, kiadás, valutacsomag —, annak a játéknak a nevével. Mivel névre keres, nem biztos, hogy a pontos szócikket találja el.',
            aboutTip: 'Nézd meg mindazt, amit ez a szkript csinál.',
            aboutTitle: 'Mit csinál ez a szkript?',
            aboutName: 'Név:',
            aboutVersion: 'Verzió:',
            aboutAuthor: 'Szerző:',
            aboutBody: [
                'Ez a szkript összeköti az Epic Games Store-t az EGDatával, és feljavítja a kívánságlistádat.',
                '• Termék- (/p/) és csomagoldalakon (/bundles/): három gombot ad a vásárlás gomb alá.',
                '– Az EGData (ár- és akciótörténeti adatbázis) pontosan arra az ajánlatra mutat, nem keresésre.',
                '– A GG.deals az Epic DRM-es ajánlatai között keres, az alapértelmezett bolti minimumértékelés nélkül, a PCGamingWiki pedig kompatibilitást és javításokat keres. Mindkettő az angol nevet használja, az ajánlat azonosítója alapján lekérve, mert az Epic lefordítja a játékneveket; ha pedig az ajánlat egy játékhoz tartozik — DLC, kiadás, valutacsomag —, a PCGamingWiki azt a játékot keresi. Mindegyik jelzi a buboréksúgójában, hogy névre keres, és tévedhet. Csak mobilos oldalon sem a GG.deals, sem a PCGamingWiki gombja nem jelenik meg: a wiki PC-játékokat dokumentál, a GG.deals pedig PC-boltokat követ.',
                '– Vásárlás gombonként egy gombkészlet: a csomagoknak kettő van (a felső sáv és a „Buy …” szakasz), és mindkettő megkapja a sajátját.',
                '– Ha a bolton belül egy termékre vagy csomagra navigálsz, az oldal újratöltődik. Az Epic egyoldalas alkalmazás, és a szkript nem volt aktív a főoldalon, a keresésben vagy a katalógusban; éppen ez az újratöltés garantálja, hogy a gomb megjelenjen.',
                '• A kívánságlistádon (/wishlist) egy háromeszközös sávot ad hozzá:',
                '– Csak akciós: automatikusan végiggörgeti az egész listát (az Epic görgetéskor adagokban tölti be), hogy MINDEN játékot megtaláljon, és csak az akciósakat mutassa, megtartva az Epicben választott rendezést. Az akciót a százalékos jelvény vagy az áthúzott eredeti ár alapján ismeri fel. Külön jegyzi meg, függetlenül attól, hogy a „Rendezés és szűrők megjegyzése” be van-e kapcsolva.',
                '– Rendezés és szűrők megjegyzése: elmenti az Epicben választott rendezést és az oldalsáv szűrőit, és visszatéréskor újra alkalmazza őket.',
                '– Link másolása szűrőkkel: olyan URL-t készít, amely megnyitva visszaállítja a rendezésedet, a szűrőidet és a „csak akciós” állapotot. Ha a böngésző letiltja a vágólapot, párbeszédablakban jeleníti meg az URL-t, hogy kézzel másolhasd.',
                'Minden a böngésződben fut (a localStorage-ban tárolva); semmilyen adat nem kerül szerverre.',
            ],
        },
        ro: {
            remember: 'Reține sortarea și filtrele',
            onlyDiscount: 'Doar reduse',
            copyLink: '🔗 Copiază linkul cu filtre',
            copied: '✔ Link copiat',
            copyPrompt: 'Copiază acest link:',
            about: 'ℹ️ Află mai multe',
            close: 'Închide',
            rememberTip: 'Salvează sortarea și filtrele alese în Epic și le reaplică automat de fiecare dată când revii la lista de dorințe.',
            onlyDiscountTip: 'Parcurge ÎNTREAGA ta listă (Epic o încarcă în loturi pe măsură ce derulezi) pentru a detecta toate jocurile și a le ascunde pe cele care nu sunt la reducere. Păstrează sortarea aleasă în Epic. Reducerile sunt detectate după insigna cu procentul sau după prețul inițial tăiat.',
            copyLinkTip: 'Generează un URL care, deschis cu scriptul instalat, reproduce sortarea și filtrele tale actuale (inclusiv „doar reduse”).',
            ggTip: 'Caută titlul pe GG.deals cu filtrul DRM Epic. Fiind o căutare după titlu, este posibil să nu găsească jocul exact.',
            pcgwTip: 'Caută pe PCGamingWiki (compatibilitate și remedieri) jocul în sine: fără sufixul de ediție, iar dacă pagina aparține altui joc — un DLC, o ediție, un pachet de monedă — după acel joc. Fiind o căutare după nume, s-ar putea să nu nimerească articolul exact.',
            aboutTip: 'Vezi tot ce face acest script.',
            aboutTitle: 'Ce face acest script?',
            aboutName: 'Nume:',
            aboutVersion: 'Versiune:',
            aboutAuthor: 'Autor:',
            aboutBody: [
                'Acest script conectează Epic Games Store cu EGData și îți îmbunătățește lista de dorințe.',
                '• Pe paginile de produs (/p/) și de pachet (/bundles/): adaugă trei butoane sub butonul de cumpărare.',
                '– EGData (bază de date cu prețuri și istoric al reducerilor) duce exact la acea ofertă, nu la o căutare.',
                '– GG.deals caută printre ofertele cu DRM Epic, fără pragul implicit de evaluare a magazinelor, iar PCGamingWiki caută compatibilitate și remedieri. Amândouă folosesc numele în engleză, cerut după id-ul ofertei, pentru că Epic traduce numele jocurilor; iar când oferta aparține unui joc — un DLC, o ediție, un pachet de monedă —, PCGamingWiki caută acel joc. Fiecare anunță în indiciul său că întreabă după nume și poate greși. Pe o pagină doar pentru mobil nu se desenează nici butonul GG.deals, nici cel PCGamingWiki: wiki-ul documentează jocuri de PC, iar GG.deals urmărește magazine de PC.',
                '– Un set de butoane pentru fiecare buton de cumpărare: pachetele au două (bara de sus și secțiunea „Buy …”) și fiecare îl primește pe al său.',
                '– Navigarea în interiorul magazinului către un produs sau un pachet reîncarcă pagina. Epic este o aplicație cu o singură pagină, iar scriptul nu era activ pe pagina principală, în căutare sau în catalog; tocmai acea reîncărcare garantează apariția butonului.',
                '• Pe lista ta de dorințe (/wishlist) adaugă o bară cu trei instrumente:',
                '– Doar reduse: parcurge automat toată lista (Epic o încarcă în loturi pe măsură ce derulezi) pentru a detecta TOATE jocurile și a le afișa doar pe cele la reducere, păstrând sortarea aleasă în Epic. Reducerile sunt detectate după insigna cu procentul sau după prețul inițial tăiat. Se reține separat, indiferent dacă „Reține sortarea și filtrele” este activ.',
                '– Reține sortarea și filtrele: salvează sortarea și filtrele din bara laterală alese în Epic și le reaplică la revenire.',
                '– Copiază linkul cu filtre: generează un URL care, la deschidere, reproduce sortarea, filtrele și starea „doar reduse”. Dacă browserul blochează clipboardul, afișează URL-ul într-o fereastră pentru a-l copia manual.',
                'Totul se procesează în browserul tău (salvat în localStorage); nu se trimit date către niciun server.',
            ],
        },
        bg: {
            remember: 'Запомняне на подредбата и филтрите',
            onlyDiscount: 'Само с намаление',
            copyLink: '🔗 Копиране на връзка с филтри',
            copied: '✔ Връзката е копирана',
            copyPrompt: 'Копирайте тази връзка:',
            about: 'ℹ️ Научете повече',
            close: 'Затваряне',
            rememberTip: 'Запазва избраните в Epic подредба и филтри и ги прилага автоматично всеки път, когато се върнете в списъка с желания.',
            onlyDiscountTip: 'Превърта ЦЕЛИЯ ви списък (Epic го зарежда на партиди при превъртане), за да открие всички игри и да скрие тези, които не са в промоция. Подредбата, избрана в Epic, се запазва. Намаленията се разпознават по значката с процент или по зачеркнатата първоначална цена.',
            copyLinkTip: 'Създава адрес, който при отваряне с инсталиран скрипт възстановява текущите ви подредба и филтри (включително „само с намаление“).',
            ggTip: 'Търси заглавието в GG.deals с филтъра за DRM на Epic. Тъй като е търсене по заглавие, може да не намери точната игра.',
            pcgwTip: 'Търси в PCGamingWiki (съвместимост и поправки) самата игра: без наставката за издание, а ако страницата принадлежи на друга игра — DLC, издание, пакет с валута — по тази игра. Това е търсене по име, така че може да не улучи точната статия.',
            aboutTip: 'Вижте всичко, което прави този скрипт.',
            aboutTitle: 'Какво прави този скрипт?',
            aboutName: 'Име:',
            aboutVersion: 'Версия:',
            aboutAuthor: 'Автор:',
            aboutBody: [
                'Този скрипт свързва Epic Games Store с EGData и подобрява списъка ви с желания.',
                '• На страници на продукт (/p/) и на пакет (/bundles/): добавя три бутона под бутона за покупка.',
                '– EGData (база данни с цени и история на промоциите) води точно до тази оферта, а не до търсене.',
                '– GG.deals търси сред офертите с DRM на Epic, без подразбиращия се минимален рейтинг на магазините, а PCGamingWiki търси съвместимост и поправки. И двете използват името на английски, взето по id на офертата, защото Epic превежда имената на игрите; а когато офертата принадлежи на игра — DLC, издание, пакет с валута — PCGamingWiki търси тази игра. Всяко предупреждава в подсказката си, че търси по име и може да сбърка. На страница само за мобилни не се показват нито бутонът на GG.deals, нито този на PCGamingWiki: уикито документира игри за компютър, а GG.deals следи магазини за компютър.',
                '– По един набор бутони на всеки бутон за покупка: пакетите имат два (лентата отгоре и разделът „Buy …“) и всеки получава своя.',
                '– Придвижването в магазина към продукт или пакет презарежда страницата. Epic е приложение с една страница и скриптът не беше активен на началната страница, в търсенето или в каталога; именно това презареждане гарантира появата на бутона.',
                '• В списъка ви с желания (/wishlist) добавя лента с три инструмента:',
                '– Само с намаление: автоматично превърта целия списък (Epic го зарежда на партиди при превъртане), за да открие ВСИЧКИ игри и да покаже само тези в промоция, като запазва избраната в Epic подредба. Намаленията се разпознават по значката с процент или по зачеркнатата първоначална цена. Запомня се отделно, независимо дали „Запомняне на подредбата и филтрите“ е включено.',
                '– Запомняне на подредбата и филтрите: запазва избраните в Epic подредба и филтри от страничната лента и ги прилага при връщане.',
                '– Копиране на връзка с филтри: създава адрес, който при отваряне възстановява подредбата, филтрите и състоянието „само с намаление“. Ако браузърът блокира клипборда, адресът се показва в диалог за ръчно копиране.',
                'Всичко се обработва във вашия браузър (запазва се в localStorage); не се изпращат данни към никакъв сървър.',
            ],
        },
        tr: {
            remember: 'Sıralama ve filtreleri hatırla',
            onlyDiscount: 'Yalnızca indirimliler',
            copyLink: '🔗 Filtreli bağlantıyı kopyala',
            copied: '✔ Bağlantı kopyalandı',
            copyPrompt: 'Bu bağlantıyı kopyalayın:',
            about: 'ℹ️ Daha fazla bilgi',
            close: 'Kapat',
            rememberTip: 'Epic’te seçtiğiniz sıralama ve filtreleri kaydeder ve istek listesine her döndüğünüzde otomatik olarak yeniden uygular.',
            onlyDiscountTip: 'TÜM listenizi kaydırarak gezer (Epic kaydırdıkça listeyi partiler hâlinde yükler); böylece bütün oyunları bulur ve indirimde olmayanları gizler. Epic’te seçtiğiniz sıralama korunur. İndirimler yüzde rozetinden veya üstü çizili orijinal fiyattan anlaşılır.',
            copyLinkTip: 'Betik kuruluyken açıldığında mevcut sıralamanızı ve filtrelerinizi ("yalnızca indirimliler" dâhil) geri getiren bir adres oluşturur.',
            ggTip: 'Başlığı GG.deals üzerinde Epic DRM filtresiyle arar. Başlığa göre arama olduğu için tam olarak aradığınız oyunu bulamayabilir.',
            pcgwTip: 'PCGamingWiki\'de (uyumluluk ve düzeltmeler) oyunun kendisini arar: sürüm ekini kullanmadan; sayfa başka bir oyuna aitse — DLC, sürüm, para paketi — o oyunun adıyla. Ada göre arama olduğu için tam makaleyi bulamayabilir.',
            aboutTip: 'Bu betiğin yaptığı her şeyi görün.',
            aboutTitle: 'Bu betik ne yapar?',
            aboutName: 'Ad:',
            aboutVersion: 'Sürüm:',
            aboutAuthor: 'Yazar:',
            aboutBody: [
                'Bu betik Epic Games Store’u EGData ile birleştirir ve istek listenizi geliştirir.',
                '• Ürün (/p/) ve paket (/bundles/) sayfalarında: satın alma düğmesinin altına üç düğme ekler.',
                '– EGData (fiyat ve indirim geçmişi veritabanı) bir aramaya değil, tam olarak o teklife bağlanır.',
                '– GG.deals, Epic DRM\'li fırsatlar arasında, varsayılan asgari mağaza puanı olmadan arar; PCGamingWiki ise uyumluluk ve düzeltmeleri arar. İkisi de İngilizce adı kullanır — teklif kimliğiyle sorulur, çünkü Epic oyun adlarını çevirir — ve teklif bir oyuna aitse — DLC, sürüm, para paketi — PCGamingWiki o oyunu arar. Her biri ipucunda ada göre aradığını ve şaşabileceğini belirtir. Yalnızca mobile ait bir sayfada ne GG.deals ne de PCGamingWiki düğmesi çizilir: wiki PC oyunlarını belgeler, GG.deals ise PC mağazalarını izler.',
                '– Her satın alma düğmesi için bir düğme takımı: paketlerde iki tane vardır (üstteki çubuk ve "Buy …" bölümü) ve her ikisi de kendi takımını alır.',
                '– Mağaza içinde bir ürüne veya pakete gitmek sayfayı yeniden yükler. Epic tek sayfalık bir uygulamadır ve betik ana sayfada, aramada veya katalogda etkin değildi; düğmenin görünmesini garantileyen tam da bu yeniden yüklemedir.',
                '• İstek listenizde (/wishlist) üç araçlı bir çubuk ekler:',
                '– Yalnızca indirimliler: tüm listeyi otomatik olarak kaydırır (Epic kaydırdıkça listeyi partiler hâlinde yükler), BÜTÜN oyunları bulur ve Epic’te seçtiğiniz sıralamayı koruyarak yalnızca indirimde olanları gösterir. İndirimler yüzde rozetinden veya üstü çizili orijinal fiyattan anlaşılır. "Sıralama ve filtreleri hatırla" açık olsun olmasın, kendi başına hatırlanır.',
                '– Sıralama ve filtreleri hatırla: Epic’te seçtiğiniz sıralamayı ve kenar çubuğu filtrelerini kaydeder ve geri döndüğünüzde yeniden uygular.',
                '– Filtreli bağlantıyı kopyala: açıldığında sıralamanızı, filtrelerinizi ve "yalnızca indirimliler" durumunu geri getiren bir adres oluşturur. Tarayıcı panoyu engellerse adresi elle kopyalayabilmeniz için bir iletişim kutusunda gösterir.',
                'Her şey tarayıcınızda işlenir (localStorage’da saklanır); hiçbir sunucuya veri gönderilmez.',
            ],
        },
        ar: {
            remember: 'تذكّر الترتيب وعوامل التصفية',
            onlyDiscount: 'المخفَّضة فقط',
            copyLink: '🔗 نسخ الرابط مع عوامل التصفية',
            copied: '✔ تم نسخ الرابط',
            copyPrompt: 'انسخ هذا الرابط:',
            about: 'ℹ️ معرفة المزيد',
            close: 'إغلاق',
            rememberTip: 'يحفظ الترتيب وعوامل التصفية التي تختارها في Epic ويعيد تطبيقها تلقائيًا في كل مرة تعود فيها إلى قائمة الرغبات.',
            onlyDiscountTip: 'يمرّر خلال قائمتك بالكامل (تحمّلها Epic على دفعات أثناء التمرير) للعثور على كل الألعاب وإخفاء غير المخفَّضة منها. يحافظ على الترتيب الذي تختاره في Epic. يُكتشف التخفيض من شارة النسبة المئوية أو من السعر الأصلي المشطوب.',
            copyLinkTip: 'ينشئ رابطًا يعيد، عند فتحه والبرنامج النصي مثبَّت، ترتيبك وعوامل التصفية الحالية (بما في ذلك «المخفَّضة فقط»).',
            ggTip: 'يبحث عن العنوان في GG.deals باستخدام مرشّح حماية Epic. لأنه بحث بالعنوان، قد لا يصل إلى اللعبة المطلوبة بالضبط.',
            pcgwTip: 'يبحث في PCGamingWiki (التوافق والإصلاحات) عن اللعبة نفسها: بدون لاحقة الإصدار، وإذا كانت الصفحة تابعة للعبة أخرى (إضافة أو إصدار أو حزمة عملة) فبحسب تلك اللعبة. ولأنه بحث بالاسم، فقد لا يصل إلى المقالة الدقيقة.',
            aboutTip: 'اطّلع على كل ما يفعله هذا البرنامج النصي.',
            aboutTitle: 'ماذا يفعل هذا البرنامج النصي؟',
            aboutName: 'الاسم:',
            aboutVersion: 'الإصدار:',
            aboutAuthor: 'المؤلف:',
            aboutBody: [
                'يربط هذا البرنامج النصي متجر Epic Games بـ EGData ويحسّن قائمة رغباتك.',
                '• في صفحات المنتج (‎/p/‎) والحزم (‎/bundles/‎): يضيف ثلاثة أزرار أسفل زر الشراء.',
                '– يقود EGData (قاعدة بيانات للأسعار وسجل العروض) إلى ذلك العرض بعينه، لا إلى بحث.',
                '– يبحث GG.deals ضمن العروض ذات حماية Epic، دون الحد الأدنى الافتراضي لتقييم المتاجر، ويبحث PCGamingWiki عن التوافق والإصلاحات. كلاهما يستخدم الاسم الإنجليزي، المطلوب عبر معرّف العرض، لأن Epic تترجم أسماء الألعاب؛ وإذا كان العرض تابعًا للعبة (إضافة أو إصدار أو حزمة عملة) يبحث PCGamingWiki عن تلك اللعبة. وكل زر ينبّه في تلميحه إلى أنه يبحث بالاسم وقد يخطئ. وفي صفحة خاصة بالهواتف فقط لا يُرسم زر GG.deals ولا زر PCGamingWiki، لأن الويكي يوثّق ألعاب الحاسوب و‏GG.deals يتابع متاجر الحاسوب.',
                '– مجموعة أزرار لكل زر شراء: للحزم زرّان (الشريط العلوي وقسم «Buy …»)، ويحصل كلٌّ منهما على مجموعته.',
                '– التنقل داخل المتجر إلى منتج أو حزمة يعيد تحميل الصفحة. فـ Epic تطبيق ذو صفحة واحدة ولم يكن البرنامج النصي نشطًا في الصفحة الرئيسية ولا في البحث ولا في التصفح؛ وإعادة التحميل هذه هي ما يضمن ظهور الزر.',
                '• في قائمة رغباتك (‎/wishlist‎) يضيف شريطًا بثلاث أدوات:',
                '– المخفَّضة فقط: يمرّر تلقائيًا خلال القائمة كاملة (تحمّلها Epic على دفعات أثناء التمرير) للعثور على كل الألعاب وعرض المخفَّضة منها فقط، مع الحفاظ على الترتيب الذي اخترته في Epic. يُكتشف التخفيض من شارة النسبة المئوية أو من السعر الأصلي المشطوب. ويُحفَظ هذا الخيار وحده سواء كان «تذكّر الترتيب وعوامل التصفية» مفعَّلًا أم لا.',
                '– تذكّر الترتيب وعوامل التصفية: يحفظ الترتيب وعوامل تصفية الشريط الجانبي التي تختارها في Epic ويعيد تطبيقها عند عودتك.',
                '– نسخ الرابط مع عوامل التصفية: ينشئ رابطًا يعيد عند فتحه ترتيبك وعوامل تصفيتك وحالة «المخفَّضة فقط». وإذا منع المتصفح الحافظة، يعرض الرابط في مربع حوار لنسخه يدويًا.',
                'تجري كل المعالجة في متصفحك (وتُحفَظ في localStorage)؛ ولا تُرسَل أي بيانات إلى أي خادم.',
            ],
        },
        hi: {
            remember: 'क्रम और फ़िल्टर याद रखें',
            onlyDiscount: 'केवल छूट वाले',
            copyLink: '🔗 फ़िल्टर सहित लिंक कॉपी करें',
            copied: '✔ लिंक कॉपी हो गया',
            copyPrompt: 'यह लिंक कॉपी करें:',
            about: 'ℹ️ और जानें',
            close: 'बंद करें',
            rememberTip: 'Epic में चुने गए क्रम और फ़िल्टर सहेजता है और जब भी आप इच्छा-सूची पर लौटते हैं, उन्हें अपने आप फिर से लागू कर देता है।',
            onlyDiscountTip: 'आपकी पूरी सूची स्क्रॉल करता है (स्क्रॉल करने पर Epic उसे बैचों में लोड करता है) ताकि सभी गेम पहचाने जा सकें और जो छूट पर नहीं हैं उन्हें छिपाया जा सके। Epic में चुना गया क्रम बना रहता है। छूट प्रतिशत बैज या काटे गए मूल मूल्य से पहचानी जाती है।',
            copyLinkTip: 'ऐसा URL बनाता है जो स्क्रिप्ट इंस्टॉल होने पर खोलने से आपका मौजूदा क्रम और फ़िल्टर ("केवल छूट वाले" सहित) दोबारा लागू कर देता है।',
            ggTip: 'GG.deals पर Epic DRM फ़िल्टर के साथ शीर्षक खोजता है। यह शीर्षक से खोज है, इसलिए हो सकता है कि सही गेम न मिले।',
            pcgwTip: 'PCGamingWiki (संगतता और सुधार) पर गेम को ही खोजता है: एडिशन प्रत्यय हटाकर, और अगर पेज किसी दूसरे गेम का हिस्सा है — DLC, एडिशन, करेंसी पैक — तो उसी गेम के नाम से। यह नाम से खोज है, इसलिए हो सकता है कि सटीक लेख न मिले।',
            aboutTip: 'यह स्क्रिप्ट जो कुछ करती है, सब देखें।',
            aboutTitle: 'यह स्क्रिप्ट क्या करती है?',
            aboutName: 'नाम:',
            aboutVersion: 'संस्करण:',
            aboutAuthor: 'लेखक:',
            aboutBody: [
                'यह स्क्रिप्ट Epic Games Store को EGData से जोड़ती है और आपकी इच्छा-सूची को बेहतर बनाती है।',
                '• उत्पाद (/p/) और बंडल (/bundles/) पृष्ठों पर: खरीद बटन के नीचे तीन बटन जोड़ती है।',
                '– EGData (कीमतों और छूट-इतिहास का डेटाबेस) खोज पर नहीं, ठीक उसी ऑफ़र पर ले जाता है।',
                '– GG.deals, Epic DRM वाले ऑफ़रों में खोजता है, बिना डिफ़ॉल्ट स्टोर-रेटिंग सीमा के, और PCGamingWiki संगतता तथा सुधार खोजता है। दोनों अंग्रेज़ी नाम इस्तेमाल करते हैं, जो ऑफ़र आईडी से लिया जाता है, क्योंकि Epic गेम के नाम अनुवाद करता है; और अगर ऑफ़र किसी गेम का हिस्सा है — DLC, एडिशन, करेंसी पैक — तो PCGamingWiki उसी गेम को खोजता है। हर बटन अपने टूलटिप में बताता है कि वह नाम से खोजता है और चूक सकता है। सिर्फ़ मोबाइल वाले पेज पर न GG.deals का बटन बनता है और न PCGamingWiki का: यह विकी PC गेम्स का दस्तावेज़ रखती है और GG.deals PC स्टोर देखता है।',
                '– हर खरीद बटन के लिए बटनों का एक सेट: बंडलों में दो होते हैं (ऊपर की पट्टी और "Buy …" अनुभाग) और दोनों को अपना-अपना मिलता है।',
                '– स्टोर के भीतर किसी उत्पाद या बंडल पर जाने से पृष्ठ फिर से लोड होता है। Epic एक सिंगल-पेज ऐप है और स्क्रिप्ट होम, खोज या ब्राउज़ पर सक्रिय नहीं थी; वही रीलोड बटन के दिखने की गारंटी देता है।',
                '• आपकी इच्छा-सूची (/wishlist) पर तीन औज़ारों वाली एक पट्टी जोड़ती है:',
                '– केवल छूट वाले: पूरी सूची अपने आप स्क्रॉल करता है (स्क्रॉल करने पर Epic उसे बैचों में लोड करता है) ताकि सभी गेम पहचाने जा सकें और केवल छूट वाले दिखें, Epic में चुने गए क्रम को बनाए रखते हुए। छूट प्रतिशत बैज या काटे गए मूल मूल्य से पहचानी जाती है। यह अपने आप याद रहता है, चाहे "क्रम और फ़िल्टर याद रखें" चालू हो या न हो।',
                '– क्रम और फ़िल्टर याद रखें: Epic में चुने गए क्रम और साइडबार फ़िल्टर सहेजता है और लौटने पर उन्हें फिर से लागू करता है।',
                '– फ़िल्टर सहित लिंक कॉपी करें: ऐसा URL बनाता है जो खोलने पर आपका क्रम, आपके फ़िल्टर और "केवल छूट वाले" की स्थिति दोबारा लागू कर देता है। यदि ब्राउज़र क्लिपबोर्ड रोक दे, तो URL एक संवाद में दिखाया जाता है ताकि आप हाथ से कॉपी कर सकें।',
                'सब कुछ आपके ब्राउज़र में चलता है (localStorage में सहेजा जाता है); किसी सर्वर पर कोई डेटा नहीं भेजा जाता।',
            ],
        },
        id: {
            remember: 'Ingat urutan dan filter',
            onlyDiscount: 'Hanya yang diskon',
            copyLink: '🔗 Salin tautan dengan filter',
            copied: '✔ Tautan disalin',
            copyPrompt: 'Salin tautan ini:',
            about: 'ℹ️ Pelajari lebih lanjut',
            close: 'Tutup',
            rememberTip: 'Menyimpan urutan dan filter yang Anda pilih di Epic dan menerapkannya kembali secara otomatis setiap kali Anda kembali ke daftar keinginan.',
            onlyDiscountTip: 'Menggulir SELURUH daftar Anda (Epic memuatnya bertahap saat digulir) untuk menemukan semua gim dan menyembunyikan yang tidak sedang diskon. Urutan yang Anda pilih di Epic tetap dipertahankan. Diskon dikenali dari lencana persentase atau dari harga asli yang dicoret.',
            copyLinkTip: 'Membuat URL yang, saat dibuka dengan skrip terpasang, memulihkan urutan dan filter Anda saat ini (termasuk "hanya yang diskon").',
            ggTip: 'Mencari judul di GG.deals dengan filter DRM Epic. Karena ini pencarian berdasarkan judul, hasilnya mungkin bukan gim yang tepat.',
            pcgwTip: 'Mencari gim itu sendiri di PCGamingWiki (kompatibilitas dan perbaikan): tanpa sufiks edisi, dan jika halaman ini milik gim lain — DLC, edisi, paket mata uang — berdasarkan gim tersebut. Karena mencari berdasarkan nama, hasilnya bisa meleset dari artikel yang tepat.',
            aboutTip: 'Lihat semua yang dilakukan skrip ini.',
            aboutTitle: 'Apa yang dilakukan skrip ini?',
            aboutName: 'Nama:',
            aboutVersion: 'Versi:',
            aboutAuthor: 'Penulis:',
            aboutBody: [
                'Skrip ini menghubungkan Epic Games Store dengan EGData dan menyempurnakan daftar keinginan Anda.',
                '• Di halaman produk (/p/) dan bundel (/bundles/): menambahkan tiga tombol di bawah tombol pembelian.',
                '– EGData (basis data harga dan riwayat penawaran) menautkan tepat ke penawaran itu, bukan ke sebuah pencarian.',
                '– GG.deals mencari di antara penawaran ber-DRM Epic, tanpa ambang rating toko bawaan, dan PCGamingWiki mencari kompatibilitas serta perbaikan. Keduanya memakai nama Inggris, diminta lewat id penawaran, karena Epic menerjemahkan nama gim; dan setiap kali penawaran ini milik sebuah gim — DLC, edisi, paket mata uang — PCGamingWiki mencari gim tersebut. Masing-masing menyatakan di tooltip-nya bahwa ia mencari berdasarkan nama dan bisa meleset. Di halaman yang hanya untuk seluler, tombol GG.deals maupun PCGamingWiki tidak digambar: wiki itu mendokumentasikan gim PC dan GG.deals mengikuti toko PC.',
                '– Satu set tombol per tombol pembelian: bundel punya dua (bilah di atas dan bagian "Buy …") dan keduanya mendapat miliknya.',
                '– Menavigasi di dalam toko menuju produk atau bundel akan memuat ulang halaman. Epic adalah aplikasi satu halaman dan skrip tidak aktif di beranda, pencarian, maupun katalog; pemuatan ulang itulah yang menjamin tombol muncul.',
                '• Di daftar keinginan Anda (/wishlist) ditambahkan bilah dengan tiga alat:',
                '– Hanya yang diskon: menggulir seluruh daftar secara otomatis (Epic memuatnya bertahap saat digulir) untuk menemukan SEMUA gim dan hanya menampilkan yang sedang diskon, dengan mempertahankan urutan yang Anda pilih di Epic. Diskon dikenali dari lencana persentase atau dari harga asli yang dicoret. Ini diingat tersendiri, terlepas dari apakah "Ingat urutan dan filter" aktif atau tidak.',
                '– Ingat urutan dan filter: menyimpan urutan dan filter bilah sisi yang Anda pilih di Epic dan menerapkannya kembali saat Anda kembali.',
                '– Salin tautan dengan filter: membuat URL yang saat dibuka memulihkan urutan, filter, dan status "hanya yang diskon". Jika peramban memblokir papan klip, URL ditampilkan dalam dialog agar bisa disalin manual.',
                'Semuanya diproses di peramban Anda (disimpan di localStorage); tidak ada data yang dikirim ke server mana pun.',
            ],
        },
        ms: {
            remember: 'Ingat susunan dan penapis',
            onlyDiscount: 'Hanya yang didiskaun',
            copyLink: '🔗 Salin pautan dengan penapis',
            copied: '✔ Pautan disalin',
            copyPrompt: 'Salin pautan ini:',
            about: 'ℹ️ Ketahui lebih lanjut',
            close: 'Tutup',
            rememberTip: 'Menyimpan susunan dan penapis yang anda pilih di Epic dan menggunakannya semula secara automatik setiap kali anda kembali ke senarai hajat.',
            onlyDiscountTip: 'Menatal SELURUH senarai anda (Epic memuatkannya secara berkelompok semasa menatal) untuk mengesan semua permainan dan menyembunyikan yang tidak dijual murah. Susunan yang anda pilih di Epic dikekalkan. Diskaun dikesan melalui lencana peratusan atau harga asal yang dipotong.',
            copyLinkTip: 'Membina URL yang, apabila dibuka dengan skrip dipasang, memulihkan susunan dan penapis semasa anda (termasuk "hanya yang didiskaun").',
            ggTip: 'Mencari tajuk di GG.deals dengan penapis DRM Epic. Oleh kerana ini carian mengikut tajuk, ia mungkin tidak menemui permainan yang tepat.',
            pcgwTip: 'Mencari permainan itu sendiri di PCGamingWiki (keserasian dan pembaikan): tanpa akhiran edisi, dan jika halaman ini milik permainan lain — DLC, edisi, pek mata wang — mengikut permainan itu. Kerana ia carian nama, ia mungkin tidak menemui artikel yang tepat.',
            aboutTip: 'Lihat semua yang dilakukan skrip ini.',
            aboutTitle: 'Apakah yang dilakukan skrip ini?',
            aboutName: 'Nama:',
            aboutVersion: 'Versi:',
            aboutAuthor: 'Penulis:',
            aboutBody: [
                'Skrip ini menghubungkan Epic Games Store dengan EGData dan menambah baik senarai hajat anda.',
                '• Pada halaman produk (/p/) dan pakej (/bundles/): menambah tiga butang di bawah butang pembelian.',
                '– EGData (pangkalan data harga dan sejarah tawaran) memaut terus ke tawaran itu, bukan ke carian.',
                '– GG.deals mencari dalam tawaran ber-DRM Epic, tanpa ambang penilaian kedai lalai, dan PCGamingWiki mencari keserasian serta pembaikan. Kedua-duanya menggunakan nama Inggeris, diminta melalui id tawaran, kerana Epic menterjemah nama permainan; dan setiap kali tawaran ini milik sesebuah permainan — DLC, edisi, pek mata wang — PCGamingWiki mencari permainan itu. Setiap satu menyatakan dalam tooltip-nya bahawa ia mencari mengikut nama dan boleh tersasar. Pada halaman yang hanya untuk mudah alih, butang GG.deals mahupun PCGamingWiki tidak dilukis: wiki itu mendokumenkan permainan PC dan GG.deals menjejaki kedai PC.',
                '– Satu set butang bagi setiap butang pembelian: pakej mempunyai dua (bar di atas dan bahagian "Buy …") dan kedua-duanya mendapat set masing-masing.',
                '– Menavigasi di dalam kedai ke sesuatu produk atau pakej akan memuat semula halaman. Epic ialah aplikasi satu halaman dan skrip tidak aktif di laman utama, carian atau katalog; muat semula itulah yang menjamin butang muncul.',
                '• Pada senarai hajat anda (/wishlist) ditambah satu bar dengan tiga alat:',
                '– Hanya yang didiskaun: menatal seluruh senarai secara automatik (Epic memuatkannya secara berkelompok semasa menatal) untuk mengesan SEMUA permainan dan hanya menunjukkan yang dijual murah, sambil mengekalkan susunan yang anda pilih di Epic. Diskaun dikesan melalui lencana peratusan atau harga asal yang dipotong. Ia diingat secara berasingan, sama ada "Ingat susunan dan penapis" dihidupkan atau tidak.',
                '– Ingat susunan dan penapis: menyimpan susunan dan penapis bar sisi yang anda pilih di Epic dan menggunakannya semula apabila anda kembali.',
                '– Salin pautan dengan penapis: membina URL yang apabila dibuka memulihkan susunan, penapis dan keadaan "hanya yang didiskaun". Jika pelayar menyekat papan keratan, URL dipaparkan dalam dialog untuk disalin secara manual.',
                'Semuanya diproses dalam pelayar anda (disimpan dalam localStorage); tiada data dihantar ke mana-mana pelayan.',
            ],
        },
        fil: {
            remember: 'Tandaan ang pagkakasunod at mga filter',
            onlyDiscount: 'May diskuwento lamang',
            copyLink: '🔗 Kopyahin ang link na may filter',
            copied: '✔ Nakopya ang link',
            copyPrompt: 'Kopyahin ang link na ito:',
            about: 'ℹ️ Alamin pa',
            close: 'Isara',
            rememberTip: 'Ini-save ang pagkakasunod at mga filter na pipiliin mo sa Epic at awtomatikong inilalapat muli ang mga ito sa tuwing babalik ka sa wishlist.',
            onlyDiscountTip: 'Ini-scroll ang BUONG listahan mo (paunti-unti itong nilo-load ng Epic habang nagsi-scroll) para matukoy ang lahat ng laro at itago ang mga hindi naka-sale. Pinapanatili ang pagkakasunod na pinili mo sa Epic. Natutukoy ang diskuwento sa pamamagitan ng badge ng porsiyento o ng nakaekis na orihinal na presyo.',
            copyLinkTip: 'Gumagawa ng URL na, kapag binuksan habang naka-install ang script, ibinabalik ang kasalukuyan mong pagkakasunod at mga filter (kasama ang "may diskuwento lamang").',
            ggTip: 'Hinahanap ang pamagat sa GG.deals gamit ang Epic DRM filter. Dahil paghahanap ito sa pamagat, maaaring hindi ito tumama sa eksaktong laro.',
            pcgwTip: 'Hinahanap sa PCGamingWiki (compatibility at mga fix) ang mismong laro: walang suffix ng edisyon, at kung ang pahina ay bahagi ng ibang laro — DLC, edisyon, currency pack — ayon sa larong iyon. Dahil paghahanap ito ayon sa pangalan, maaaring hindi tumama sa eksaktong artikulo.',
            aboutTip: 'Tingnan ang lahat ng ginagawa ng script na ito.',
            aboutTitle: 'Ano ang ginagawa ng script na ito?',
            aboutName: 'Pangalan:',
            aboutVersion: 'Bersyon:',
            aboutAuthor: 'May-akda:',
            aboutBody: [
                'Iniuugnay ng script na ito ang Epic Games Store sa EGData at pinapaganda ang wishlist mo.',
                '• Sa mga pahina ng produkto (/p/) at bundle (/bundles/): nagdaragdag ng tatlong button sa ilalim ng button ng pagbili.',
                '– Ang EGData (database ng mga presyo at kasaysayan ng deal) ay tumuturo mismo sa alok na iyon, hindi sa isang paghahanap.',
                '– Naghahanap ang GG.deals sa mga alok na may DRM ng Epic, nang walang default na pinakamababang rating ng tindahan, at naghahanap ang PCGamingWiki ng compatibility at mga fix. Pareho silang gumagamit ng pangalang Ingles, hinihingi ayon sa offer id, dahil isinasalin ng Epic ang pangalan ng mga laro; at kapag ang alok ay bahagi ng isang laro — DLC, edisyon, currency pack — ang hinahanap ng PCGamingWiki ay ang larong iyon. Sinasabi ng bawat isa sa tooltip nito na naghahanap ito ayon sa pangalan at maaaring sumablay. Sa pahinang para lang sa mobile, hindi iginuguhit ang button ng GG.deals ni ang ng PCGamingWiki: mga larong PC ang dinodokumento ng wiki at mga tindahan ng PC ang sinusubaybayan ng GG.deals.',
                '– Isang set ng button bawat button ng pagbili: may dalawa ang mga bundle (ang bar sa itaas at ang seksiyong "Buy …") at parehong may sariling set.',
                '– Ang pag-navigate sa loob ng tindahan patungo sa isang produkto o bundle ay nagre-reload ng pahina. Single-page app ang Epic at hindi aktibo ang script sa home, paghahanap o browse; ang reload na iyon ang tumitiyak na lilitaw ang button.',
                '• Sa wishlist mo (/wishlist) may idinaragdag na bar na may tatlong kasangkapan:',
                '– May diskuwento lamang: awtomatikong ini-scroll ang buong listahan (paunti-unti itong nilo-load ng Epic habang nagsi-scroll) para matukoy ang LAHAT ng laro at ipakita lamang ang mga naka-sale, habang pinapanatili ang pagkakasunod na pinili mo sa Epic. Natutukoy ang diskuwento sa pamamagitan ng badge ng porsiyento o ng nakaekis na orihinal na presyo. Hiwalay itong naaalala, nakabukas man o hindi ang "Tandaan ang pagkakasunod at mga filter".',
                '– Tandaan ang pagkakasunod at mga filter: ini-save ang pagkakasunod at ang mga filter sa sidebar na pipiliin mo sa Epic at inilalapat muli pagbalik mo.',
                '– Kopyahin ang link na may filter: gumagawa ng URL na kapag binuksan ay ibinabalik ang pagkakasunod, mga filter at ang estado ng "may diskuwento lamang". Kung hinaharangan ng browser ang clipboard, ipinapakita ang URL sa isang dialog para makopya nang manu-mano.',
                'Lahat ay pinoproseso sa browser mo (naka-save sa localStorage); walang datos na ipinapadala sa anumang server.',
            ],
        },
        th: {
            remember: 'จำการเรียงลำดับและตัวกรอง',
            onlyDiscount: 'เฉพาะที่ลดราคา',
            copyLink: '🔗 คัดลอกลิงก์พร้อมตัวกรอง',
            copied: '✔ คัดลอกลิงก์แล้ว',
            copyPrompt: 'คัดลอกลิงก์นี้:',
            about: 'ℹ️ ดูเพิ่มเติม',
            close: 'ปิด',
            rememberTip: 'บันทึกการเรียงลำดับและตัวกรองที่คุณเลือกใน Epic แล้วนำกลับมาใช้โดยอัตโนมัติทุกครั้งที่คุณกลับมายังรายการที่อยากได้',
            onlyDiscountTip: 'เลื่อนผ่านรายการของคุณทั้งหมด (Epic โหลดเป็นชุด ๆ ขณะเลื่อน) เพื่อตรวจหาเกมทุกเกมและซ่อนเกมที่ไม่ได้ลดราคา โดยคงการเรียงลำดับที่คุณเลือกใน Epic ไว้ ส่วนลดตรวจจับได้จากป้ายเปอร์เซ็นต์หรือราคาเดิมที่ถูกขีดฆ่า',
            copyLinkTip: 'สร้าง URL ที่เมื่อเปิดขณะติดตั้งสคริปต์ไว้ จะคืนค่าการเรียงลำดับและตัวกรองปัจจุบันของคุณ (รวมถึง "เฉพาะที่ลดราคา")',
            ggTip: 'ค้นหาชื่อเกมบน GG.deals ด้วยตัวกรอง DRM ของ Epic เนื่องจากเป็นการค้นหาด้วยชื่อ จึงอาจไม่ตรงกับเกมที่ต้องการพอดี',
            pcgwTip: 'ค้นหาตัวเกมบน PCGamingWiki (ความเข้ากันได้และการแก้ไข) โดยตัดคำต่อท้ายที่ระบุรุ่นออก และหากหน้านี้เป็นของเกมอื่น (DLC, รุ่น, แพ็กสกุลเงิน) จะค้นด้วยชื่อเกมนั้น เนื่องจากเป็นการค้นด้วยชื่อ จึงอาจไม่ตรงกับบทความที่ต้องการ',
            aboutTip: 'ดูทุกอย่างที่สคริปต์นี้ทำ',
            aboutTitle: 'สคริปต์นี้ทำอะไร?',
            aboutName: 'ชื่อ:',
            aboutVersion: 'เวอร์ชัน:',
            aboutAuthor: 'ผู้เขียน:',
            aboutBody: [
                'สคริปต์นี้เชื่อม Epic Games Store เข้ากับ EGData และปรับปรุงรายการที่อยากได้ของคุณ',
                '• ในหน้าสินค้า (/p/) และหน้าชุดรวม (/bundles/): เพิ่มปุ่มสามปุ่มไว้ใต้ปุ่มซื้อ',
                '– EGData (ฐานข้อมูลราคาและประวัติข้อเสนอ) ลิงก์ไปยังข้อเสนอนั้นโดยตรง ไม่ใช่ไปยังหน้าค้นหา',
                '– GG.deals ค้นในดีลที่มี DRM ของ Epic โดยไม่ใช้เกณฑ์คะแนนร้านค้าขั้นต่ำที่ตั้งไว้ ส่วน PCGamingWiki ค้นเรื่องความเข้ากันได้และการแก้ไข ทั้งคู่ใช้ชื่อภาษาอังกฤษที่ขอมาด้วยรหัสข้อเสนอ เพราะ Epic แปลชื่อเกม และหากข้อเสนอนี้เป็นของเกมใดเกมหนึ่ง (DLC, รุ่น, แพ็กสกุลเงิน) PCGamingWiki จะค้นเกมนั้นแทน แต่ละปุ่มบอกไว้ในคำแนะนำแล้วว่าค้นด้วยชื่อจึงอาจไม่ตรง ในหน้าที่มีเฉพาะมือถือ จะไม่วาดทั้งปุ่ม GG.deals และ PCGamingWiki เพราะวิกินี้บันทึกเกมพีซี และ GG.deals ติดตามร้านค้าพีซี',
                '– ปุ่มหนึ่งชุดต่อปุ่มซื้อหนึ่งปุ่ม: ชุดรวมมีสองปุ่ม (แถบด้านบนและส่วน "Buy …") และทั้งสองจะได้ชุดของตัวเอง',
                '– การเปลี่ยนหน้าไปยังสินค้าหรือชุดรวมภายในร้านจะทำให้หน้าโหลดใหม่ Epic เป็นแอปหน้าเดียวและสคริปต์ไม่ได้ทำงานอยู่ที่หน้าแรก หน้าค้นหา หรือหน้าเรียกดู การโหลดใหม่นี้เองที่รับประกันว่าปุ่มจะปรากฏ',
                '• ในรายการที่อยากได้ (/wishlist) จะเพิ่มแถบเครื่องมือสามอย่าง:',
                '– เฉพาะที่ลดราคา: เลื่อนผ่านรายการทั้งหมดโดยอัตโนมัติ (Epic โหลดเป็นชุด ๆ ขณะเลื่อน) เพื่อตรวจหาเกมทุกเกมและแสดงเฉพาะที่ลดราคา โดยคงการเรียงลำดับที่คุณเลือกใน Epic ไว้ ส่วนลดตรวจจับได้จากป้ายเปอร์เซ็นต์หรือราคาเดิมที่ถูกขีดฆ่า ค่านี้ถูกจดจำแยกต่างหาก ไม่ว่าจะเปิด "จำการเรียงลำดับและตัวกรอง" ไว้หรือไม่',
                '– จำการเรียงลำดับและตัวกรอง: บันทึกการเรียงลำดับและตัวกรองในแถบข้างที่คุณเลือกใน Epic แล้วนำกลับมาใช้เมื่อคุณกลับมา',
                '– คัดลอกลิงก์พร้อมตัวกรอง: สร้าง URL ที่เมื่อเปิดแล้วจะคืนค่าการเรียงลำดับ ตัวกรอง และสถานะ "เฉพาะที่ลดราคา" หากเบราว์เซอร์บล็อกคลิปบอร์ด จะแสดง URL ในกล่องโต้ตอบเพื่อให้คัดลอกเอง',
                'ทุกอย่างประมวลผลในเบราว์เซอร์ของคุณ (เก็บไว้ใน localStorage) ไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์ใด ๆ',
            ],
        },
        vi: {
            remember: 'Ghi nhớ sắp xếp và bộ lọc',
            onlyDiscount: 'Chỉ hàng giảm giá',
            copyLink: '🔗 Sao chép liên kết kèm bộ lọc',
            copied: '✔ Đã sao chép liên kết',
            copyPrompt: 'Sao chép liên kết này:',
            about: 'ℹ️ Tìm hiểu thêm',
            close: 'Đóng',
            rememberTip: 'Lưu cách sắp xếp và các bộ lọc bạn chọn trên Epic rồi tự động áp dụng lại mỗi khi bạn quay lại danh sách mong muốn.',
            onlyDiscountTip: 'Cuộn qua TOÀN BỘ danh sách của bạn (Epic tải theo từng đợt khi cuộn) để phát hiện mọi trò chơi và ẩn những trò không giảm giá. Cách sắp xếp bạn chọn trên Epic được giữ nguyên. Mức giảm được nhận biết qua nhãn phần trăm hoặc giá gốc bị gạch ngang.',
            copyLinkTip: 'Tạo một URL mà khi mở với tập lệnh đã cài sẽ khôi phục cách sắp xếp và bộ lọc hiện tại của bạn (bao gồm "chỉ hàng giảm giá").',
            ggTip: 'Tìm tựa đề trên GG.deals với bộ lọc DRM của Epic. Vì là tìm theo tên, kết quả có thể không phải trò chơi chính xác.',
            pcgwTip: 'Tìm chính trò chơi trên PCGamingWiki (tương thích và bản sửa lỗi): bỏ hậu tố phiên bản; nếu trang thuộc về một trò chơi khác — DLC, phiên bản, gói tiền tệ — thì tìm theo trò chơi đó. Vì tìm theo tên nên có thể không ra đúng bài viết.',
            aboutTip: 'Xem mọi thứ tập lệnh này làm.',
            aboutTitle: 'Tập lệnh này làm gì?',
            aboutName: 'Tên:',
            aboutVersion: 'Phiên bản:',
            aboutAuthor: 'Tác giả:',
            aboutBody: [
                'Tập lệnh này kết nối Epic Games Store với EGData và cải thiện danh sách mong muốn của bạn.',
                '• Trên trang sản phẩm (/p/) và gói (/bundles/): thêm ba nút bên dưới nút mua.',
                '– EGData (cơ sở dữ liệu giá và lịch sử khuyến mãi) dẫn đúng tới ưu đãi đó, không phải tới một trang tìm kiếm.',
                '– GG.deals tìm trong các ưu đãi có DRM của Epic, không áp ngưỡng đánh giá cửa hàng mặc định, còn PCGamingWiki tìm về tương thích và bản sửa lỗi. Cả hai dùng tên tiếng Anh, lấy theo id ưu đãi, vì Epic dịch tên trò chơi; và mỗi khi ưu đãi thuộc về một trò chơi — DLC, phiên bản, gói tiền tệ — thì PCGamingWiki tìm trò chơi đó. Mỗi nút đều nói trong chú giải rằng nó tìm theo tên nên có thể trật. Ở trang chỉ dành cho di động, cả nút GG.deals lẫn PCGamingWiki đều không được vẽ ra: wiki này ghi chép các trò chơi PC còn GG.deals theo dõi các cửa hàng PC.',
                '– Một bộ nút cho mỗi nút mua: các gói có hai nút mua (thanh trên cùng và mục "Buy …") và cả hai đều có bộ riêng.',
                '– Điều hướng trong cửa hàng tới một sản phẩm hoặc gói sẽ tải lại trang. Epic là ứng dụng một trang và tập lệnh không hoạt động ở trang chủ, trang tìm kiếm hay trang duyệt; chính lần tải lại đó bảo đảm nút xuất hiện.',
                '• Trên danh sách mong muốn (/wishlist), tập lệnh thêm một thanh với ba công cụ:',
                '– Chỉ hàng giảm giá: tự động cuộn qua toàn bộ danh sách (Epic tải theo từng đợt khi cuộn) để phát hiện TẤT CẢ trò chơi và chỉ hiển thị những trò đang giảm giá, giữ nguyên cách sắp xếp bạn đã chọn trên Epic. Mức giảm được nhận biết qua nhãn phần trăm hoặc giá gốc bị gạch ngang. Tùy chọn này được ghi nhớ riêng, bất kể "Ghi nhớ sắp xếp và bộ lọc" có bật hay không.',
                '– Ghi nhớ sắp xếp và bộ lọc: lưu cách sắp xếp và các bộ lọc ở thanh bên bạn chọn trên Epic rồi áp dụng lại khi bạn quay lại.',
                '– Sao chép liên kết kèm bộ lọc: tạo một URL mà khi mở sẽ khôi phục cách sắp xếp, bộ lọc và trạng thái "chỉ hàng giảm giá". Nếu trình duyệt chặn bảng tạm, URL sẽ hiện trong hộp thoại để bạn tự sao chép.',
                'Mọi thứ được xử lý trong trình duyệt của bạn (lưu trong localStorage); không có dữ liệu nào được gửi tới máy chủ nào.',
            ],
        },
        ja: {
            remember: '並び順とフィルターを記憶',
            onlyDiscount: 'セール中のみ',
            copyLink: '🔗 フィルター付きリンクをコピー',
            copied: '✔ リンクをコピーしました',
            copyPrompt: 'このリンクをコピーしてください:',
            about: 'ℹ️ 詳細',
            close: '閉じる',
            rememberTip: 'Epic で選んだ並び順とフィルターを保存し、ウィッシュリストに戻るたびに自動的に再適用します。',
            onlyDiscountTip: 'リスト全体をスクロールし（Epic はスクロールに応じて分割読み込みします）、すべてのゲームを検出してセール中でないものを隠します。Epic で選んだ並び順は維持されます。割引はパーセント表示のバッジ、または取り消し線付きの元価格から判定します。',
            copyLinkTip: 'スクリプトを入れた状態で開くと現在の並び順とフィルター（「セール中のみ」を含む）を再現する URL を生成します。',
            ggTip: 'GG.deals で Epic の DRM フィルターを使ってタイトルを検索します。タイトル検索のため、目的のゲームに正確に一致しない場合があります。',
            pcgwTip: 'PCGamingWiki（互換性と修正）でゲーム本体を検索します。エディション表記は外し、ページが別のゲームに属する場合（DLC、エディション、通貨パックなど）はそのゲーム名で検索します。名前による検索のため、正確な記事に届かないことがあります。',
            aboutTip: 'このスクリプトの機能をすべて見る。',
            aboutTitle: 'このスクリプトは何をしますか？',
            aboutName: '名前:',
            aboutVersion: 'バージョン:',
            aboutAuthor: '作者:',
            aboutBody: [
                'このスクリプトは Epic Games Store と EGData をつなぎ、ウィッシュリストを使いやすくします。',
                '• 製品ページ（/p/）とバンドルページ（/bundles/）: 購入ボタンの下にボタンを3つ追加します。',
                '– EGData（価格とセール履歴のデータベース）は検索ではなく、そのオファーそのものにリンクします。',
                '– GG.deals は Epic の DRM が付いた特価の中を、既定の店舗評価の下限なしで検索します。PCGamingWiki は互換性と修正を検索します。どちらもオファー ID で取得した英語名を使います。Epic がゲーム名を翻訳するためです。オファーが何らかのゲームに属する場合（DLC、エディション、通貨パックなど）、PCGamingWiki はそのゲームを検索します。名前で検索するため外すことがある旨は、それぞれのツールチップに書いてあります。 モバイル専用のページでは GG.deals と PCGamingWiki のボタンをどちらも描画しません。あのウィキが扱うのは PC のゲームで、GG.deals が追うのは PC のストアだからです。',
                '– 購入ボタン1つにつきボタン一式。バンドルには購入ボタンが2つあり（上部のバーと「Buy …」セクション）、その両方に付きます。',
                '– ストア内から製品やバンドルへ移動するとページが再読み込みされます。Epic はシングルページアプリで、ホーム・検索・ブラウズではスクリプトが動作していません。この再読み込みこそがボタンの表示を保証します。',
                '• ウィッシュリスト（/wishlist）にはツールが3つ入ったバーを追加します:',
                '– セール中のみ: リスト全体を自動でスクロールし（Epic はスクロールに応じて分割読み込みします）、すべてのゲームを検出したうえで、Epic で選んだ並び順を保ったままセール中のものだけを表示します。割引はパーセント表示のバッジ、または取り消し線付きの元価格から判定します。この設定は「並び順とフィルターを記憶」のオン・オフに関わらず、単独で記憶されます。',
                '– 並び順とフィルターを記憶: Epic で選んだ並び順とサイドバーのフィルターを保存し、戻ったときに再適用します。',
                '– フィルター付きリンクをコピー: 開くと並び順・フィルター・「セール中のみ」の状態を再現する URL を生成します。ブラウザーがクリップボードを拒否した場合は、手動でコピーできるようダイアログに URL を表示します。',
                'すべてブラウザー内で処理され（localStorage に保存）、サーバーにデータは送信されません。',
            ],
        },
        ko: {
            remember: '정렬과 필터 기억',
            onlyDiscount: '할인 중인 항목만',
            copyLink: '🔗 필터가 포함된 링크 복사',
            copied: '✔ 링크가 복사됨',
            copyPrompt: '이 링크를 복사하세요:',
            about: 'ℹ️ 자세히 알아보기',
            close: '닫기',
            rememberTip: 'Epic에서 선택한 정렬과 필터를 저장하고, 위시리스트로 돌아올 때마다 자동으로 다시 적용합니다.',
            onlyDiscountTip: '목록 전체를 스크롤하여(Epic은 스크롤에 따라 나눠서 불러옵니다) 모든 게임을 찾아내고 할인 중이 아닌 항목을 숨깁니다. Epic에서 선택한 정렬 순서는 유지됩니다. 할인은 퍼센트 배지나 취소선이 그어진 원래 가격으로 판별합니다.',
            copyLinkTip: '스크립트가 설치된 상태에서 열면 현재 정렬과 필터("할인 중인 항목만" 포함)를 그대로 재현하는 URL을 만듭니다.',
            ggTip: 'GG.deals에서 Epic DRM 필터로 제목을 검색합니다. 제목 검색이므로 정확한 게임을 찾지 못할 수 있습니다.',
            pcgwTip: 'PCGamingWiki(호환성 및 수정)에서 게임 자체를 검색합니다. 에디션 접미사는 빼고, 페이지가 다른 게임에 속하면(DLC, 에디션, 화폐 팩 등) 그 게임 이름으로 검색합니다. 이름 검색이라 정확한 문서를 찾지 못할 수 있습니다.',
            aboutTip: '이 스크립트가 하는 모든 것을 확인하세요.',
            aboutTitle: '이 스크립트는 무엇을 하나요?',
            aboutName: '이름:',
            aboutVersion: '버전:',
            aboutAuthor: '작성자:',
            aboutBody: [
                '이 스크립트는 Epic Games Store를 EGData와 연결하고 위시리스트를 개선합니다.',
                '• 제품(/p/) 및 번들(/bundles/) 페이지: 구매 버튼 아래에 버튼 세 개를 추가합니다.',
                '– EGData(가격 및 할인 이력 데이터베이스)는 검색이 아니라 바로 그 상품 페이지로 연결됩니다.',
                '– GG.deals는 Epic DRM이 걸린 할인 중에서, 기본 상점 평점 하한 없이 검색합니다. PCGamingWiki는 호환성과 수정을 검색합니다. 둘 다 오퍼 id로 받아온 영어 이름을 씁니다. Epic이 게임 이름을 번역하기 때문입니다. 그리고 오퍼가 어떤 게임에 속하면(DLC, 에디션, 화폐 팩 등) PCGamingWiki는 그 게임을 검색합니다. 이름으로 검색하므로 빗나갈 수 있다는 점은 각 버튼의 툴팁에 적혀 있습니다. 모바일 전용 페이지에서는 GG.deals와 PCGamingWiki 버튼을 둘 다 그리지 않습니다. 그 위키가 다루는 것은 PC 게임이고 GG.deals가 좇는 것은 PC 상점이기 때문입니다.',
                '– 구매 버튼마다 버튼 한 세트: 번들에는 구매 버튼이 둘(상단 바와 "Buy …" 섹션) 있으며 각각 자기 세트를 받습니다.',
                '– 상점 안에서 제품이나 번들로 이동하면 페이지가 새로 로드됩니다. Epic은 단일 페이지 앱이고 홈, 검색, 둘러보기에서는 스크립트가 활성화되지 않았습니다. 바로 그 새로고침이 버튼이 나타나도록 보장합니다.',
                '• 위시리스트(/wishlist)에는 도구 세 개가 담긴 막대를 추가합니다:',
                '– 할인 중인 항목만: 목록 전체를 자동으로 스크롤하여(Epic은 스크롤에 따라 나눠서 불러옵니다) 모든 게임을 찾아내고, Epic에서 선택한 정렬을 유지한 채 할인 중인 항목만 보여줍니다. 할인은 퍼센트 배지나 취소선이 그어진 원래 가격으로 판별합니다. 이 설정은 "정렬과 필터 기억"의 켜짐 여부와 상관없이 따로 기억됩니다.',
                '– 정렬과 필터 기억: Epic에서 선택한 정렬과 사이드바 필터를 저장하고 돌아왔을 때 다시 적용합니다.',
                '– 필터가 포함된 링크 복사: 열면 정렬, 필터, "할인 중인 항목만" 상태를 재현하는 URL을 만듭니다. 브라우저가 클립보드를 막으면 직접 복사할 수 있도록 대화 상자에 URL을 표시합니다.',
                '모든 처리는 브라우저에서 이루어지며(localStorage에 저장) 어떤 서버로도 데이터를 보내지 않습니다.',
            ],
        },
        'zh-cn': {
            remember: '记住排序和筛选',
            onlyDiscount: '仅显示打折',
            copyLink: '🔗 复制带筛选的链接',
            copied: '✔ 链接已复制',
            copyPrompt: '复制此链接：',
            about: 'ℹ️ 了解更多',
            close: '关闭',
            rememberTip: '保存你在 Epic 中选择的排序和筛选条件，每次回到愿望单时自动重新应用。',
            onlyDiscountTip: '滚动浏览你的整个列表（Epic 会在滚动时分批加载），以便找出所有游戏并隐藏未打折的。会保留你在 Epic 中选择的排序。折扣通过百分比标签或带删除线的原价识别。',
            copyLinkTip: '生成一个网址，在装有本脚本的情况下打开即可还原你当前的排序和筛选条件（包括“仅显示打折”）。',
            ggTip: '在 GG.deals 上按 Epic DRM 筛选搜索该标题。由于是按标题搜索，可能无法精确匹配到该游戏。',
            pcgwTip: '在 PCGamingWiki（兼容性与修复）上搜索游戏本体：去掉版本后缀；若该页面隶属于另一款游戏（DLC、版本、货币包等），则按那款游戏搜索。由于是按名称搜索，可能无法精确对应到该条目。',
            aboutTip: '查看此脚本的全部功能。',
            aboutTitle: '这个脚本有什么用？',
            aboutName: '名称：',
            aboutVersion: '版本：',
            aboutAuthor: '作者：',
            aboutBody: [
                '本脚本将 Epic Games Store 与 EGData 连接起来，并改进你的愿望单。',
                '• 在商品页（/p/）和捆绑包页（/bundles/）：在购买按钮下方添加三个按钮。',
                '– EGData（价格与优惠历史数据库）直接链接到该商品本身，而不是搜索结果。',
                '– GG.deals 在带 Epic DRM 的优惠中搜索，且不套用默认的店铺评分下限；PCGamingWiki 则搜索兼容性与修复。两者都使用英文名称，按报价 id 取得，因为 Epic 会翻译游戏名；若该报价隶属于某款游戏（DLC、版本、货币包等），PCGamingWiki 改为搜索那款游戏。两个按钮的提示里都写明了是按名称搜索，可能不准。 在仅限手机的页面上，GG.deals 和 PCGamingWiki 的按钮都不会画出来：那个 wiki 收录的是 PC 游戏，而 GG.deals 追踪的是 PC 商店。',
                '– 每个购买按钮配一组按钮：捆绑包有两个购买按钮（顶部的横栏和“Buy …”区块），两个都会各配一组。',
                '– 在商店内跳转到商品或捆绑包会重新加载页面。Epic 是单页应用，脚本在首页、搜索和浏览页并未运行；正是这次重新加载保证了按钮会出现。',
                '• 在愿望单（/wishlist）中添加一个含三个工具的工具栏：',
                '– 仅显示打折：自动滚动浏览整个列表（Epic 会在滚动时分批加载），找出所有游戏并只显示正在促销的，同时保留你在 Epic 中选择的排序。折扣通过百分比标签或带删除线的原价识别。无论“记住排序和筛选”是否开启，此项都会单独记住。',
                '– 记住排序和筛选：保存你在 Epic 中选择的排序和侧边栏筛选条件，返回时重新应用。',
                '– 复制带筛选的链接：生成一个网址，打开后即可还原你的排序、筛选条件和“仅显示打折”的状态。如果浏览器阻止访问剪贴板，会用对话框显示网址供手动复制。',
                '所有处理都在你的浏览器中完成（保存在 localStorage）；不会向任何服务器发送数据。',
            ],
        },
        'zh-tw': {
            remember: '記住排序與篩選',
            onlyDiscount: '僅顯示特價',
            copyLink: '🔗 複製含篩選的連結',
            copied: '✔ 連結已複製',
            copyPrompt: '複製此連結：',
            about: 'ℹ️ 瞭解更多',
            close: '關閉',
            rememberTip: '儲存你在 Epic 中選擇的排序與篩選條件，每次回到願望清單時自動重新套用。',
            onlyDiscountTip: '捲動瀏覽你的整份清單（Epic 會在捲動時分批載入），以找出所有遊戲並隱藏未特價的。會保留你在 Epic 中選擇的排序。折扣以百分比標籤或帶刪除線的原價判斷。',
            copyLinkTip: '產生一個網址，在已安裝本腳本的情況下開啟即可還原你目前的排序與篩選條件（包含「僅顯示特價」）。',
            ggTip: '在 GG.deals 上以 Epic DRM 篩選搜尋該標題。由於是以標題搜尋，可能無法精確對應到該遊戲。',
            pcgwTip: '在 PCGamingWiki（相容性與修正）上搜尋遊戲本體：去掉版本後綴；若該頁面隸屬於另一款遊戲（DLC、版本、貨幣包等），則以那款遊戲搜尋。由於是以名稱搜尋，可能無法精確對應到該條目。',
            aboutTip: '查看此腳本的全部功能。',
            aboutTitle: '這個腳本有什麼用？',
            aboutName: '名稱：',
            aboutVersion: '版本：',
            aboutAuthor: '作者：',
            aboutBody: [
                '本腳本將 Epic Games Store 與 EGData 連結起來，並改進你的願望清單。',
                '• 在商品頁（/p/）與組合包頁（/bundles/）：在購買按鈕下方加入三個按鈕。',
                '– EGData（價格與優惠歷史資料庫）直接連到該商品本身，而不是搜尋結果。',
                '– GG.deals 在帶 Epic DRM 的優惠中搜尋，且不套用預設的商店評分下限；PCGamingWiki 則搜尋相容性與修正。兩者都使用英文名稱，依報價 id 取得，因為 Epic 會翻譯遊戲名稱；若該報價隸屬於某款遊戲（DLC、版本、貨幣包等），PCGamingWiki 改為搜尋那款遊戲。兩個按鈕的提示都寫明是以名稱搜尋，可能不準。 在僅限手機的頁面上，GG.deals 與 PCGamingWiki 的按鈕都不會畫出來：那個 wiki 收錄的是 PC 遊戲，而 GG.deals 追蹤的是 PC 商店。',
                '– 每個購買按鈕配一組按鈕：組合包有兩個購買按鈕（頂端的橫列與「Buy …」區塊），兩個都會各配一組。',
                '– 在商店內跳轉到商品或組合包會重新載入頁面。Epic 是單頁應用程式，腳本在首頁、搜尋與瀏覽頁並未運作；正是這次重新載入保證了按鈕會出現。',
                '• 在願望清單（/wishlist）中加入一個含三項工具的工具列：',
                '– 僅顯示特價：自動捲動瀏覽整份清單（Epic 會在捲動時分批載入），找出所有遊戲並只顯示特價中的，同時保留你在 Epic 中選擇的排序。折扣以百分比標籤或帶刪除線的原價判斷。無論「記住排序與篩選」是否開啟，此項都會單獨記住。',
                '– 記住排序與篩選：儲存你在 Epic 中選擇的排序與側邊欄篩選條件，返回時重新套用。',
                '– 複製含篩選的連結：產生一個網址，開啟後即可還原你的排序、篩選條件與「僅顯示特價」的狀態。若瀏覽器阻擋剪貼簿，會以對話框顯示網址供手動複製。',
                '所有處理都在你的瀏覽器中完成（儲存在 localStorage）；不會向任何伺服器傳送資料。',
            ],
        },
    };

    // Familias donde la VARIANTE cambia el texto y no basta con el idioma base.
    // Existe para no depender de la forma exacta que escriba Epic en la URL o en
    // el lang: da igual 'zh-Hant' que 'zh-TW', o 'es-MX' que 'es-419'. Lo no
    // previsto se reduce a la base ('fr-CA' -> 'fr').
    const LANG_ALIASES = {
        'zh': 'zh-cn', 'zh-hans': 'zh-cn', 'zh-chs': 'zh-cn', 'zh-sg': 'zh-cn',
        'zh-hant': 'zh-tw', 'zh-cht': 'zh-tw', 'zh-hk': 'zh-tw', 'zh-mo': 'zh-tw',
        'pt-pt': 'pt',
        'es-la': 'es-419', 'es-mx': 'es-419', 'es-ar': 'es-419', 'es-cl': 'es-419',
        'es-co': 'es-419', 'es-pe': 'es-419', 'es-us': 'es-419',
        'nb': 'no', 'nn': 'no',
        'tl': 'fil'
    };

    // Reduce un código BCP-47 a una clave de I18N probando de más específico a
    // menos: 'zh-Hant-TW' -> 'zh-hant' (alias) -> 'zh-tw'. Devuelve '' si no hay
    // nada, para que la cascada pase al siguiente paso.
    function normalizeLang(raw) {
        const code = (raw || '').trim().toLowerCase().replace(/_/g, '-');
        if (!code) return '';
        const parts = code.split('-');
        for (let n = parts.length; n >= 1; n--) {
            const candidate = parts.slice(0, n).join('-');
            if (LANG_ALIASES[candidate]) return LANG_ALIASES[candidate];
            if (I18N[candidate]) return candidate;
        }
        return '';
    }

    // Cascada, de la señal más fiel a la menos. Devuelve además si la respuesta
    // vino DEL SITIO o solo del navegador, que es lo que decide si hay que seguir
    // reintentando (ver dict()).
    //   1) ?lang= de la URL: es el mecanismo con que Epic cambia de idioma, así
    //      que cuando está es una elección explícita, y es lo único legible en
    //      document-start.
    //   2) La opción marcada en el menú de idioma: el idioma activo es el único
    //      <epic-wf-menu-item> con starticon="check" y, a diferencia del resto,
    //      SIN hreftemplate (los demás llevan el ?lang= al que te mandarían).
    //   3) <html lang>, que React escribe al hidratar.
    //   4) navigator.languages.  5) inglés.
    // NO se mira el segmento de la ruta: Epic ya no lo usa, y leer uno viejo
    // llegado por un enlace guardado daría el idioma equivocado si la página se
    // está mostrando en otro.
    const LOCALE_MENU_SELECTOR = '#nav-locale-menu epic-wf-menu-item[starticon="check"]';

    function detectLangEx() {
        try {
            const q = normalizeLang(new URLSearchParams(location.search).get('lang'));
            if (q) return { lang: q, fromSite: true };
        } catch (e) { /* URL rara: seguimos con el resto */ }

        const checked = document.querySelector(LOCALE_MENU_SELECTOR);
        const fromMenu = normalizeLang(checked && (checked.getAttribute('locale') || checked.getAttribute('lang')));
        if (fromMenu) return { lang: fromMenu, fromSite: true };

        const fromDoc = normalizeLang(document.documentElement.getAttribute('lang'));
        if (fromDoc) return { lang: fromDoc, fromSite: true };

        for (const l of [navigator.language, ...(navigator.languages || [])]) {
            const n = normalizeLang(l);
            if (n) return { lang: n, fromSite: false };
        }
        return { lang: 'en', fromSite: false };
    }

    function detectLang() { return detectLangEx().lang; }

    // Idiomas de escritura derecha-a-izquierda. Del catálogo de Epic solo el árabe
    // lo es. Los contenedores que INYECTA el script se crean sueltos y heredarían
    // el dir de la página, que Epic no siempre pone; por eso se marca explícito.
    // El texto en sí ya va bien: el navegador aplica el algoritmo bidi solo.
    const RTL_LANGS = ['ar'];

    // Diccionario resuelto PEREZOSAMENTE. En document-start no hay idioma que
    // detectar (ver la nota de arriba), así que en vez de congelar `t` al cargar
    // se resuelve la primera vez que alguien lee una cadena — es decir, al pintar,
    // ya con React hidratado. Se memoiza por idioma: solo recalcula si cambia.
    // El merge sobre `en` hace que una clave ausente caiga al inglés en vez de
    // quedar en undefined, así que un idioma incompleto no rompe nada.
    let _lang = null;
    let _dict = null;
    let _settled = false; // true en cuanto el idioma lo dijo EL SITIO, no el navegador
    function dict() {
        // Mientras la respuesta venga solo del navegador se vuelve a intentar en
        // cada lectura, porque la página puede acabar de hidratarse. En cuanto una
        // señal del sitio contesta, se fija y ya no se consulta más el DOM.
        if (!_settled) {
            const r = detectLangEx();
            if (r.lang !== _lang) {
                _lang = r.lang;
                _dict = { ...I18N.en, ...(I18N[r.lang] || {}) };
            }
            _settled = r.fromSite;
        }
        return _dict;
    }
    function dir() {
        dict();
        return RTL_LANGS.includes(_lang) ? 'rtl' : 'ltr';
    }

    // Proxy para no tocar los 18 puntos donde ya se lee `t.clave`. Solo se usan
    // lecturas de propiedad; aun así se implementan has/ownKeys por si alguna vez
    // alguien hace `in` o un spread sobre él.
    const t = new Proxy({}, {
        get(_target, key) { return dict()[key]; },
        has(_target, key) { return key in dict(); },
        ownKeys() { return Reflect.ownKeys(dict()); },
        getOwnPropertyDescriptor(_target, key) {
            return { value: dict()[key], enumerable: true, configurable: true };
        }
    });

    // =============================================
    // CONSTANTES
    // =============================================
    const EGDATA_BASE_URL = 'https://egdata.app/offers/';
    const EGDATA_ICON_URL = 'https://cdn.egdata.app/logo_simple_white_clean.png';
    const PURCHASE_BUTTON_SELECTOR = '[data-testid="purchase-cta-button"]';
    // El <h1> de la ficha. Es el título del producto a secas, sin los añadidos que
    // Epic le pone al de la página.
    const PDP_TITLE_SELECTOR = '[data-testid="pdp-title"]';
    const DATA_ATTR = 'data-egs2egd';
    const LINK_ATTR = 'data-egs2egd-link';
    const STYLES_ID = 'egs2egd-styles';
    // Sincronizar con @version del encabezado en cada bump.
    const SCRIPT_VERSION = '1.8.5';

    // GG.deals filtra por DRM con un bitmask numérico en la query, no por nombre:
    // 1 Steam, 8 GOG, 16 sin DRM, 32 otros, 128 Microsoft Store, 1024 Epic. Aquí
    // interesa Epic, que es el DRM de todo lo que se vende en esta tienda.
    // Va a /deals/ (la lista de ofertas), que es la que acepta el filtro de DRM;
    // /games/ lo ignora. Y minRating=0 desactiva el mínimo de valoración de tienda
    // que trae por defecto, que si no esconde parte de las ofertas.
    const GGDEALS_SEARCH_URL = 'https://gg.deals/deals/';
    const GGDEALS_EPIC_DRM = '1024';
    const GGDEALS_MIN_RATING = '0';
    const PCGW_SEARCH_URL = 'https://www.pcgamingwiki.com/w/index.php';

    // Nombre en inglés. El de la página NO sirve: Epic traduce el nombre del propio
    // producto —la misma oferta be5600439b… es "Ghostrunner 2" en en-US, «幽灵行者 2»
    // en zh-CN y ゴーストランナー 2 en ja—, y GG.deals y PCGamingWiki están indexados
    // en inglés.
    //
    // La fuente es la API de EGData, que ya es el destino del primer botón, así que
    // no añade un tercero en discordia: se le pide por el MISMO offerId que alimenta
    // ese enlace y devuelve el título en inglés. Responde con CORS abierto para
    // store.epicgames.com, así que `@grant none` sobrevive.
    //
    // Descartado el slug de la URL, que también es independiente del idioma pero
    // llega ensuciado con sufijos de desambiguación ("lost-castle-abb2e2",
    // "eternal-threads-197169") y a veces es un hexadecimal de 32 caracteres.
    // Sin comprobar queda store.epicgames.com/graphql con locale=en-US, que sería
    // mismo-origen: desde fuera del navegador lo tapa el desafío de Cloudflare, así
    // que no hay forma de verificarlo sin la sesión real de la tienda.
    const EGDATA_API_URL = 'https://api.egdata.app/offers/';
    // Juego base de la oferta. PCGamingWiki documenta el juego y no el
    // empaquetado —no tiene artículo por DLC, por edición ni por paquete de
    // moneda—, así que ese botón busca el juego; GG.deals sí los vende por separado
    // y se queda con el nombre propio.
    // En Epic todo lo que pertenece a un juego comparte su `namespace`, y EGData
    // expone justamente esa consulta: la oferta 7f918ae59896… ("Special bundle
    // 0.01") vive en el namespace 7a6c212ee9cf…, que devuelve "The Walking Dead No
    // Man's Land".
    const EGDATA_BASE_GAME_URL = 'https://api.egdata.app/base-game/';
    // Qué ofertas van al juego base: TODAS menos el propio juego suelto.
    //
    // Antes había una lista blanca —DLC, ADD_ON, EDITION, BUNDLE— y se quedaba
    // corta, porque la taxonomía de Epic tiene más tipos que sí pertenecen a un
    // juego y ninguna razón para pararse ahí. Comprobado con la API de EGData:
    //   VIRTUAL_CURRENCY  "Special bundle 0.01"   -> The Walking Dead No Man's Land
    //   VIRTUAL_CURRENCY  "Rocket League - Credits x6500" -> Rocket League
    //   OTHERS            "1,300 V-Bucks"         -> Fortnite
    // Se invierte, pues: se resuelve salvo que la oferta ya sea BASE_GAME, con lo
    // que la lista no hay que mantenerla y los tipos que Epic invente entran solos.
    //
    // Dos redes de seguridad, las dos comprobadas:
    //   · Si el namespace no tiene juego base —un paquete que junta juegos
    //     distintos, como "Dying Light Franchise Bundle"— el endpoint no devuelve
    //     nada y se cae al nombre propio.
    //   · Si la oferta está mal tipada y el endpoint devuelve ELLA MISMA, el id lo
    //     delata y tampoco se toca el nombre. Por eso la comprobación de abajo es
    //     por id y no solo por tipo.
    const BASE_GAME_TYPE = /^BASE_GAME$/i;
    // Fichas solo de móvil: ahí el botón de PCGamingWiki no se pinta. La wiki
    // documenta juegos de PC, así que en una oferta de Android o iOS lleva siempre a
    // una búsqueda vacía —y Epic tiene fichas propias para ellas: /p/fall-guys-ios,
    // /p/rocketleaguesideswipe-android…—.
    //
    // Epic etiqueta la plataforma en `tags`, que ya viene en el JSON de la oferta que
    // se pide para el nombre: cero peticiones nuevas. Su catálogo de plataformas
    // tiene EXACTAMENTE cuatro entradas, comprobado en
    // api.egdata.app/tags?group=platform:
    //   9547 Windows (33.536 usos)   10719 Mac OS (2.219)
    //   39071 Android (2.700)        39070 iOS (1.128)
    //
    // La regla es «hay móvil Y NO hay escritorio», no «hay móvil» a secas: hay fichas
    // que llevan las dos, y ahí el juego sí es de PC. Y tampoco vale «no hay
    // escritorio» a secas: hay ofertas sin ninguna etiqueta de plataforma —la de tipo
    // OTHERS de "Among Us"—, y no constar no es lo mismo que ser de móvil.
    //
    // Cuando la oferta NO trae ninguna etiqueta de plataforma se juzga por las del
    // JUEGO al que pertenece, que ya se pide para el nombre y las trae igual. Así
    // entran los complementos de un juego de móvil —su DLC, sus ediciones, sus
    // bandas sonoras—, que es donde falta el dato: el DLC "VistaRewardRLS1" no tiene
    // etiquetas y vive en el namespace de Rocket League Sideswipe, que es [Android].
    // El orden importa y es este: **manda la etiqueta de la propia oferta**. Si se
    // mirara primero la del juego se rompería el caso contrario, que también existe:
    // la oferta de Fall Guys para iOS es [iOS] y su juego base es [Windows], porque
    // en ese namespace conviven las fichas de las dos plataformas.
    //
    // Si ni la oferta ni su juego dicen nada, el botón se queda.
    //
    // Lo que esto NO arregla, y conviene no confundirlo: un juego que Epic marca
    // Windows y del que PCGamingWiki no tiene artículo. "The Walking Dead: No Man's
    // Land" nació en móvil, pero Epic lo publica con Windows y Mac OS y un
    // `pcReleaseDate` de 2024, así que aquí cuenta como de PC —y la wiki no lo
    // documenta—. Eso no se puede saber desde el dato de la tienda.
    const PLATFORM_TAGS_DESKTOP = ['Windows', 'Mac OS'];
    const PLATFORM_TAGS_MOBILE = ['Android', 'iOS'];
    // El nombre en inglés de una oferta ya publicada no cambia casi nunca, así que
    // 30 días de caché es conservador; el tope de entradas es para que no crezca
    // sin fin.
    const NAME_CACHE_KEY = 'egs2egd-en-names';
    const NAME_CACHE_TTL = 30 * 24 * 60 * 60 * 1000;   // 30 días
    // Versión de lo que se guarda en la caché. **Súbela SIEMPRE que cambie lo que se
    // guarda o cómo se calcula.** Una entrada escrita por una versión anterior tiene
    // la misma forma, así que se lee como buena y devuelve el resultado VIEJO durante
    // 30 días: el arreglo se publica, el usuario actualiza y no ve ningún cambio en
    // las fichas que ya había visitado. Pasó con los mods de GOG en 1.5.2. Las
    // entradas sin este campo son de antes y cuentan como no encontradas; se vuelven
    // a pedir y se sobrescriben.
    const NAME_CACHE_SCHEMA = 2;
    const NAME_CACHE_MAX = 200;                        // entradas
    const NAME_TIMEOUT_MS = 8000;

    // Icono de GG.deals: favicon remoto (su CDN permite el hotlink). Si el CSP de
    // Epic lo bloqueara, el onerror lo quita y queda solo la etiqueta.
    const GGDEALS_ICON_URL = 'https://gg.deals/favicon.ico';
    // Icono de PCGamingWiki: SVG inline. Su favicon.ico responde 403 al hotlink
    // (Cloudflare) desde otros dominios, así que como <img> remoto no se ve; el SVG
    // inline es markup y siempre pinta, sin depender del CSP ni del hotlink.
    const PCGW_ICON_SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 827 1158" width="13" height="18" aria-hidden="true" style="vertical-align:middle;flex:0 0 auto"><path d="M0 166.2 448.9-1.1 827.4 56.1l0 1023.9 0.1 28.9L452.1 1158.9 0 1008.4z" fill="#365798"/><path d="M25.3 985.5 24.1 190.5 413 46.8 412 1107.6zM478.1 1108.6 478.3 52.3 788.1 94.3l0 975.8z" fill="#a5b6d9"/><path d="M215.5 737 41.5 727 40.3 420.5 215.9 404.1zm16.7-334.5 156.1-19.4-1.2 359.8-155.2-4.8zM39.3 399.9l0-194.4 176-57.4 1.2 232.1zm350.8-317.2 0.9 274.5-158.7 20.4 0-238zm-253 909.7 0-235.1 141.7 9.3 0 268.4zm247 80.8-17.3-6.4c3.8-22.5-18.9-31.9-19.1-5.7l-18.7-5.5c-0.9-22.1-13.9-31.7-21.2-6.8l-9.7-3-0.6-277.7 12.3 0.9c-4.3 27.5 23.5 28.2 20.3 1.7L350.4 772c-4.4 28.6 23.2 28.9 20.4 1.3l12.7 0.8zM42.8 751.1l82.2 5.9-0.5 108-81.9-11.2zm83.1 129.3-0.9 110.4-82.7-20.2 0-102.4zM494.3 70l278.6 36.6 0 950-278.3 35.1z" fill="#365798"/><path d="m279 507.5c-0.1-5.1 0-10 3.2-14.2 6 0.2 4.9 9.7 5 14.3 10.3 5.1 4.9-10.8 10.2-15.3 7.6-0.8-0.6 16 6.9 15.8 4.9-0.1 3.9-2.4 3.8-6.7-0.1-3.9 0.4-7.8 3.8-10.3 8.2 3.1 0.8 18.2 11.2 15.8 0-6.4-1-14.2 5.8-17.6 2.6 5.2-0.1 14.8 5.4 16.1 7.4 1.7 8.4 3.6 10.2 10.5 0.8 3.1-0.4 4.6 2.8 6.4 3.5 2 7.6 1.4 7.7 6.1 0.1 6.4-2.7 5.5-7.6 5.5-1.8 0-2.4 3.4-2.5 4.7-0.4 4.7 0.4 5.7 5 7 5.9 1.7 4.9 3.3 4.9 8.7 0 2.7 0.5 1.2-3.1 1.9-5.7 1.1-7 0.3-6.7 6.8 0.4 7.8 13.4 1.4 9.7 12.6-1.6 4.8-9.5 1.1-9.5 5.3 0 5.3-1.1 7.7 5.4 8.2 6.4 0.5 6 9.1 0.4 11-3.4 1.2-4.6-0.1-5.8 4-1.2 4.1-1.1 8.4-2.6 12.5-6.1 4.5-11.6-1.7-11.6 8.4 0 2.7-0.6 4.7-1.1 7.3-0.9 5-2.2 0.7-5.8 1.8-1-1.2 0-7.9 0-9.5 0-4.7-1.6-5.8-7-5.4-0.3 5.8-0.2 12-4.9 16.2-2.9-1.9-4-4.8-4.2-8.1-0.3-6.5 0.2-6.7-6.5-8.3-1.2 2.9-2 11.4-1.5 14.5-5.2 2.6-6-5.4-6-8.6 0-2.7 1.1-5.7-2.3-6.7-3.4-0.9-4.6 0.8-4.7 3.9-0.2 6.1-0.5 8.8-5.3 12.2-1.9-5.4-0.3-14.7-6.6-16.4-7-1.8-7.9-6.9-8-13.6-0.1-7.3-8.9-0.3-8.9-8.2 0-0.8-0.6-4.9 0-5.5 2.9-2.1 5.8 1.2 8.5 0.1 1.3-3.6 1.8-9-2.1-9.9-4-0.9-7.8-1.4-6.9-6 1.1-5.7 0.1-5.4 6.3-5.8 4.7-0.3 3-5.2 3.1-8.4-6.2-2.9-8.8 0.8-8.8-7.4 0-5.6-0.4-5.1 5.2-5.1 4.8 0 3.4-1.7 3.4-6.3 0-5.1-9.2-0.6-9.6-7.6-0.2-3 1-5.6 3.9-6.7 5.1-2 5.7-2.3 5.9-7.8 0.3-8 5.6-8.9 12-12.1l0 0 0 0zM88.3 368.3l24.3-92.2-15.7 7.5 21.6-79 25.5-7.3-19.1 53.1 19.2-10.3-55.7 128.3 0 0z" fill="#a5b6d9"/><path d="m278.8 317.9c1.2-3.2 2.5-6.5 3.8-9.9 13.8 5.9 26.4 10.2 40.6 1.9 13.7-8 22.8-24.3 28-38.8 10.2-28.4 10.2-66.8-8.3-91.8-22.5-30.5-54.5-14.5-69.8 13.9-4.7 8.8-11.2 31.3-12.1 45.3-0.5 6.9-0.2 14.1 0.8 21.3 1 8.1 5.2 16.5 4.2 24.7-0.3 2.5-1.8 4.1-4.6 4.6-16.7-28-7.6-72.9 4.9-100.6 12.5-27.6 47.9-55.5 75.9-29 25.7 24.2 28.2 68.1 21.3 100.3-6.2 28.8-26 71.4-61.9 68.2-6.4-0.6-19.1-3.8-22.7-10l0 0zM299.3 272c-3.2-11.6 11.5-19.5 14.8-28.4 1.9-5.2-0.1-9.6-2.2-14-4.9-2.6-9-1.1-10.8 4-3.2 8.9-6.5 14.9-12.6 22.1-3.3-13.7-1.4-29.1 6.6-40.9 4.3-6.3 12.9-9.4 19.4-6.9 20.5 7.8 14.2 42.7 5.3 56.4-4.7 7.3-12.7 7.6-20.5 7.6L299.3 272zm3.4-25.8c0.5 0.7 0.5 1.4 0.2 2-9.4 21.3-18.7 42.6-28.2 64-0.9-0.4-1.4-0.4-1.7-0.7-3.3-3.9-5.6-8.5-7.8-13.1-0.9-1.8 0.1-3.6 1.2-5.1l32.8-43.7c0.9-1.3 2-2.6 3.4-3.4l0 0z" fill="#a5b6d8"/><path d="m188.7 921.7c-6.1 11.9-4.4 25.1-6 38-9.7-2.4-16.7-21.7-18.6-30 1.7-9.9 6.9-17.2 12.9-24.9 2.8-3.6 3.7-7.2 1.9-11.4-0.7-1.6-0.6-3.6-2-4.9-8.7 1.5-13.9 8.2-19.9 14-6.7-7-5.2-33.4 0.2-41.1 8.4-1.5 15.8 1 22.6 5.8 5.3-5.2 5.6-10.3 0.9-15.7-3.6-4.1-14.7-8.9-16.7-13.1-1.6-6.3 10.2-27.5 17.3-27.2 7.8 11.5 12.4 24.5 15 38.1 2.7 1.1 5.1 2.1 8.2 1.5 1.6-15.5-1.9-30.3-6.8-44.8 0.5-0.5 0.8-0.9 1-0.9 8.6 0.6 16.8 2.3 23.4 8.6 14.9 14.2-11.5 41.7 0.4 58.4 10.7-10.3 10.5-23.1 18.6-34 8 10.3 15 31 13.7 44.1-6.9 8.3-12.4 13-28.9 14.2 0.5 3.7-1.8 7.2-0.8 11.5 8.8 9.4 18.5 7.9 30.1 7.2 1.6 8.2-6.7 33.6-12.9 39.7-12.6-5.7-19.1-17.9-26.1-29.1-2.5 1.9-4.6 3.7-6.4 6.1 1.7 12.9 18 29.3 15.9 40.7-5.5 2.6-11.4 4.3-17.7 3.4-6.2-0.9-8.7-4.3-10.2-10.9-3.3-14.7 3.2-32.8-9.2-43.3zm118.5 22.1 0-63.8 67.8 10.9 0 67.4zM307.1 804.2 375 811.3 375 878.1 307.1 868.2zm67.7 165.5 0 66.8-67.6-18.6 0-63.6zm-320.5-31.7 0-28.9 13.7 2 16.5-16.6 0.7 67.6-16.3-20.9z" fill="#a5b6d9"/><path d="m89.1 914.4c1.4-0.6 2.3-0.5 3.4-0.2 2.8 6.5 3.9 13.4 3.6 20.5-0.1 2.7-1.1 5.1-1.7 7.6-0.5 1.9-1.8 3-3.4 3.9-1.3-1.3-0.9-2.5-0.6-3.8 0.8-3.7 1.6-7.3 1.7-11.1 0.2-5.8-1.6-11.2-2.9-16.9l0 0 0 0zm7 42.4c-0.3-3.3 0.9-6.2 1.6-9.1 1-4.4 2.5-8.8 3.1-13.2 0.8-5.6-1-11-2.4-16.4-0.7-2.5-1.5-5-2.2-7.5-0.4-1.6-0.7-3.1 0.2-4.5 1.3-0.1 1.8 0.6 2.1 1.3 2.1 4.3 3.6 8.6 4.5 13.3 1 5.5 0.5 10.9 0.9 16.3 0.3 3.5-0.8 6.9-1.3 10.2-0.6 3.8-2.6 7.4-6.6 9.6l0 0zm7.6 10.4c-1.9-3.7-1.4-6.5-0.1-9.8 3.1-8.1 5.9-16.4 5.3-25.2-0.5-7.7-1.8-15.2-4.6-22.4-1.2-3-2.3-6.1-3.3-9 0.8-1.2 1.7-2 3.4-1.6 1.8 4.1 3.9 8.3 5.1 12.8 5 19 5 37.4-5.7 55.3l0 0z" fill="#a5b6d9"/><path d="m598.7 1047.1-70.3 8.4-0.2-378.8 70.5-3.8zM688.5 533.1c-11 50.3-65.8 45.6-78.3 2.8l-92.4 3.1-0.2-67.9 89.4-3.3c22.8-54 64.5-46.2 81.8 0.2l66.2 0.4 1.6 61.8zm-172.4-237.1 0-24 241.7 7.5 0.1 19.4z" fill="#a5b6d9"/><path d="m52.3 827.5 62.6 9.7-19.2-43.4-8.2 15-13.4-29.3-21.8 48.1zM116.4 788c0 4.4-3.5 7.9-7.9 7.9-4.4 0-7.9-3.5-7.9-7.9 0-4.4 3.5-7.9 7.9-7.9 4.4 0 7.9 3.5 7.9 7.9z" fill="#a5b6d9"/><ellipse cx="649.4" cy="501.8" rx="31" ry="51.8" fill="#365798"/><path d="m177.7 627.1c-1.8 3-1.6 6.7 0.4 9.3l-26.3 40 6.6-0.1 25-36.7c3.2 0.6 6.6-0.9 8.5-3.8 2.4-3.9 1.2-9-2.7-11.4-3.9-2.4-9-1.2-11.5 2.7zm-110.8 29.7-9.7 12.9 4.6 4.3 7.9-11 7.1 0.3c0.4 0.7 0.9 1.4 1.5 2 3.3 3.3 8.6 3.3 11.8 0 3.3-3.3 3.3-8.6 0-11.8-3.3-3.3-8.6-3.3-11.8 0-1 1-1.7 2.3-2.1 3.6zm20.1-68.7c-4.4 0-8 3.6-8 8 0 4.4 3.6 8 8 8 3.7 0 6.8-2.5 7.7-6l44.5 1.3 17.4 21.5c-0.2 0.8-0.4 1.6-0.4 2.4 0 4.6 3.8 8.4 8.4 8.4 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4-1.5 0-2.9 0.4-4.1 1.1l-18.9-22.9-48-1.3c-1.4-2.2-3.9-3.7-6.8-3.7zm13.5 27c-4.6 0.1-8.3 4-8.1 8.6 0.1 4.6 4 8.3 8.6 8.1 3.3-0.1 6-2.1 7.3-4.9l22.2-0.5c1.4 2.9 4.4 4.8 7.8 4.7 4.6-0.1 8.3-4 8.1-8.6-0.1-4.6-4-8.3-8.6-8.1-3.6 0.1-6.6 2.5-7.7 5.7l-21.5 0.5c-1.2-3.3-4.4-5.7-8.1-5.6zm-26 16.7c0 4.4-3.6 8-8 8-4.4 0-8-3.6-8-8 0-4.4 3.6-8 8-8 4.4 0 8 3.6 8 8zM87.6 476.5c-3.5 0.2-6.4 2.5-7.5 5.6l-22.6 1 0.3 6.2 22.6-1c1.4 3 4.4 5 7.9 4.9 4.6-0.2 8.1-4.1 7.9-8.7-0.2-4.6-4.1-8.2-8.7-8zm56.3 20c-4.6 0.1-8.3 4-8.1 8.6 0.1 4.6 4 8.3 8.6 8.1 3.3-0.1 6-2.1 7.3-4.9l25.3-0.7c1.4 2.9 4.4 4.8 7.8 4.7 4.6-0.1 8.3-4 8.1-8.6-0.1-4.6-4-8.3-8.6-8.1-3.6 0.1-6.6 2.5-7.7 5.7l-24.6 0.7c-1.2-3.3-4.4-5.7-8.1-5.6zm-44.4-30.4-4.1 4.7 19.8 17.1 80.9-3-0.5-6.2-78.3 2.8zm-41.6 51.7-0.2-6 68.2-4 71.4 103.9-5.3 3.3-70.1-101.1zm132.6 25.4c2.3-2.6 2.6-6.3 1.1-9.3l6.6-9.5 0.4-9-11.7 14.4c-3.1-1.1-6.7-0.2-9 2.4-3 3.5-2.7 8.7 0.8 11.7 3.5 3 8.7 2.7 11.8-0.8zm-32.3 0.4c2 2.9 5.5 4.1 8.7 3.3l30.7 44.3-0.1-9.8-25.5-38c1.8-2.8 1.8-6.4-0.2-9.3-2.6-3.8-7.8-4.7-11.6-2-3.8 2.6-4.7 7.8-2.1 11.6zm-34.8-9.6c-3.5 0.2-6.4 2.5-7.5 5.6l-57.2 2.9 0.3 6.2 57.2-2.9c1.4 3 4.4 5 7.9 4.9 4.6-0.2 8.1-4.1 7.9-8.7-0.2-4.6-4.1-8.2-8.7-8zm17.5 33-81.3 2 0.2 6.3 78.7-2 17.5 22.3c-0.2 0.8-0.4 1.6-0.4 2.4 0 4.6 3.8 8.4 8.4 8.4 4.6 0 8.4-3.8 8.4-8.4 0-4.6-3.8-8.4-8.4-8.4-1.5 0-2.9 0.4-4.1 1.1zM179.2 672.5c1.2 2.6 5 0.2 5.7 3.6-1 4.1-8.9 0.5-11.6 0.9-1.4-4.3 8.4-15.3 10.9-18.8 2.8-1.4 9.4 0 12.6 0 0.3 2.8 0.5 5.3-1.5 7.8-3.4 0.1-6.7-1.4-10.1-1.7-2 2.7-4 5.5-6 8.2zM67.3 604.9l-8.1 0 0-6.7c6.2 0 9.7-1.6 13.2 3.9 6.6 10.3 12.8 20.9 19.1 31.4 3.1 5.2 6.3 10.4 9.5 15.5 4.6 7.4 5.8 8 14.6 8.6 6.3 0.4 12.7 0.4 19.1 0.4 6.6 0 6.4-5.5 12.7-4.9 5.4 5.1 5.4 11.7 0 16.8-6 0.4-5.3-5.8-9.8-5.8l-19.2 0c-9.5 0-12.4 2.1-17.3-5.6-11.2-17.9-22.4-35.7-33.6-53.6z" fill="#a5b6d9"/><path d="m339.3 257.1c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm14.4-13.7c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm23 0c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm-12.9 46.6c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm14.7-11.5c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9zm7.4-18.3c0 3.2-2.6 5.9-5.9 5.9-3.2 0-5.9-2.6-5.9-5.9 0-3.2 2.6-5.9 5.9-5.9 3.2 0 5.9 2.6 5.9 5.9z" transform="matrix(0.59478444,0,0,0.93466127,95.788817,-7.8295466)" fill="#365798"/></svg>';

    // Limpieza extra del título para las búsquedas externas.
    const TRADEMARK_REGEX = /[™®©]/g;
    // Diacríticos combinados, para quitarlos tras normalizar a NFD.
    const DIACRITICS_REGEX = /[\u0300-\u036f]/g;
    // Sufijos de empaquetado que PCGamingWiki no usa: documenta el juego base y no
    // tiene páginas por edición. "Definitive", "Anniversary", "Remastered" y "Game
    // of the Year" NO se tocan: ahí sí suelen ser lanzamientos con página propia.
    const SKU_EDITION_REGEX = /[\s:–—-]+(?:digital\s+)?(?:standard|deluxe|premium|ultimate|gold|platinum|complete|collector'?s|founder'?s)\s+edition\s*$/i;

    // Reintento de la fila de enlaces cuando el título todavía no es legible. Es una
    // vigilancia aparte del polling de arriba porque llega DESPUÉS de que el botón de
    // compra quede marcado como procesado: sin ella la fila se perdería para siempre.
    const LINKS_RETRY_INTERVAL_MS = 250;
    const LINKS_RETRY_MAX = 40;   // ~10 s

    // Intervalos y límites de polling
    const POLL_INTERVAL_MS = 400;
    const POLL_DELAY_AFTER_NAV_MS = 1000;
    const MAX_POLL_ATTEMPTS = 50; // 50 * 400ms = 20s máximo de espera

    // Patrones para detectar tipo de página (producto o bundle)
    // El segmento de idioma (p.ej. /en-US/) es OPCIONAL: Epic ahora sirve
    // rutas sin locale como /p/prey o /bundles/xyz (con o sin query de afiliado).
    const PRODUCT_URL_REGEX = /^https:\/\/store\.epicgames\.com\/(?:[^\/]+\/)?p\/.+/;
    const BUNDLE_URL_REGEX = /^https:\/\/store\.epicgames\.com\/(?:[^\/]+\/)?bundles\/.+/;
    const PRODUCT_PATH_REGEX = /^\/(?:[^\/]+\/)?p\/.+/;
    const BUNDLE_PATH_REGEX = /^\/(?:[^\/]+\/)?bundles\/.+/;
    // La lista de deseos vive en /wishlist (con o sin locale). Aquí el script no
    // pinta el botón de EGData sino que persiste orden/filtros (ver módulo abajo).
    const WISHLIST_PATH_REGEX = /^\/(?:[^\/]+\/)?wishlist\/?$/;

    // =============================================
    // WISHLIST — persistencia de orden y filtros
    // =============================================
    // Clave de almacenamiento (localStorage). Se conserva @grant none a propósito:
    // activar GM_* forzaría el sandbox de Tampermonkey y entonces window.__REACT_
    // QUERY_INITIAL_QUERIES__ y el hook de red dejarían de ver los globales de la
    // página. localStorage basta para que las preferencias sobrevivan recargas.
    const WL_SETTINGS_KEY = 'egs2egd-wishlist-settings';
    // Parámetro propio para compartir/guardar una URL con filtros. Epic ignora
    // los query params que no conoce; el script los lee y aplica. Valor = base64url
    // de un JSON { sort, filters }. Ej.: /wishlist?egs-wl=eyJ...  (bookmark-able).
    const WL_URL_PARAM = 'egs-wl';
    // Selectores del wishlist (tomados del DOM real de Epic).
    const WL_SORT_LAYOUT = '[data-testid="wishlist-sort-layout"]';
    const WL_SORT_TOGGLE_ID = 'sort-dropdown_toggle';
    const WL_SORT_MENU_ID = 'sort-dropdown_menu';
    const WL_SORT_CURRENT = '.css-pvz02l';           // etiqueta del orden activo
    const WL_SIDEBAR = '[data-testid="egs-filter-sidebar"]';
    const WL_GROUP = '.css-1n0v0ym';                 // bloque de cada grupo de filtro
    const WL_GROUP_TOGGLE = 'button[aria-expanded]'; // cabecera plegable del grupo
    const WL_GROUP_TITLE = '.css-zk51sn';            // texto del nombre del grupo
    const WL_CHECKBOX = '[role="checkbox"]';         // cada opción de filtro
    const WL_TOOLBAR_ID = 'egs2egd-wl-toolbar';

    // Patrón de la petición que la propia página hace para la oferta que se
    // compra: products/{namespace}/offers/{offerId}. Ese offerId es el que usa
    // egdata. En bundles vive SOLO en esa request (client-side, no en el
    // snapshot SSR de React Query), así que se intercepta la red para capturarlo.
    const PLATFORM_OFFER_REGEX = /\/products\/[0-9a-f]{32}\/offers\/([0-9a-f]{32})/i;

    // =============================================
    // ESTADO GLOBAL
    // =============================================
    let waitIntervalId = null;
    let actualPath = '';
    let capturedOfferId = null; // offerId capturado de la red (camino real del bundle)

    // Botón EGData: slug resuelto de la página actual y observer que sigue
    // pintando botones a medida que Epic renderiza controles tarde (p. ej. el
    // segundo botón de compra del bundle, que a veces llega después del primero).
    let pageSlug = null;
    let buttonObserver = null;
    let buttonObserverDebounce = null;

    // Wishlist: observer + flags para no capturar el estado por defecto encima de
    // las preferencias guardadas, ni re-capturar mientras se reaplican filtros.
    let wlObserver = null;
    let wlCaptureDebounce = null;
    let wlReady = false;
    let wlReapplyInProgress = false;
    // Último orden elegido (índice + etiqueta), capturado al clicar una opción del
    // menú. El índice es independiente del idioma; la etiqueta es la vía rápida
    // cuando el idioma coincide. Se mantiene en memoria aunque "Recordar" esté off.
    let wlLastSort = null;
    let wlSortBound = false;

    // =============================================
    // INTERCEPCIÓN DE RED (captura del offerId)
    // =============================================

    /**
     * Envuelve XMLHttpRequest.open y fetch para leer (sin alterar) las URLs y
     * capturar el offerId de la petición a egs-platform-service. Debe instalarse
     * lo antes posible (@run-at document-start) para no perder la request.
     */
    (function hookNetwork() {
        const capture = (url) => {
            try {
                if (typeof url !== 'string') return;
                const m = url.match(PLATFORM_OFFER_REGEX);
                if (m) capturedOfferId = m[1];
            } catch (e) { /* no romper la petición original */ }
        };

        try {
            const origOpen = XMLHttpRequest.prototype.open;
            XMLHttpRequest.prototype.open = function (method, url) {
                capture(url);
                return origOpen.apply(this, arguments);
            };
        } catch (e) { /* entorno sin XHR mutable */ }

        try {
            if (typeof window.fetch === 'function') {
                const origFetch = window.fetch;
                window.fetch = function (input) {
                    capture(typeof input === 'string' ? input : (input && input.url));
                    return origFetch.apply(this, arguments);
                };
            }
        } catch (e) { /* fetch no envolvible */ }
    })();

    // =============================================
    // FUNCIONES UTILITARIAS
    // =============================================

    /**
     * Busca el slug (ID) del producto en los datos internos de React Query
     * que Epic Games Store almacena en window.__REACT_QUERY_INITIAL_QUERIES__.
     * Recorre las queries buscando la que contiene 'getCatalogOffer' y extrae
     * el ID de la oferta del catálogo.
     * @returns {string|null} El ID del slug o null si no se encuentra.
     */
    function findSlug() {
        try {
            const queries = window.__REACT_QUERY_INITIAL_QUERIES__?.queries || [];
            const isBundle = getUrlType() === 'bundle';

            // Se recolectan TODAS las ofertas candidatas de React Query antes de
            // elegir. En una página de bundle conviven la oferta del bundle
            // (offerType BUNDLE) y las de los juegos incluidos (BASE_GAME, etc.),
            // así que elegir "la primera" daría el enlace equivocado.
            const offers = [];          // { id, type, source }
            const seenIds = new Set();
            const pushOffer = (id, type, source) => {
                if (id && typeof id === 'string' && !seenIds.has(id)) {
                    seenIds.add(id);
                    offers.push({ id, type, source });
                }
            };

            // a) Camino preciso (productos y, normalmente, bundles): queries cuyo
            //    hash contiene 'getCatalogOffer' -> data.Catalog.catalogOffer.
            for (const q of queries) {
                const hash = (q.queryHash || '') + (q.queryKey ? JSON.stringify(q.queryKey) : '');
                if (hash.includes('getCatalogOffer')) {
                    const co = q.state?.data?.Catalog?.catalogOffer;
                    if (co?.id) pushOffer(co.id, co.offerType, 'getCatalogOffer');
                }
            }

            // b) Red de seguridad: búsqueda en profundidad de cualquier objeto con
            //    FORMA DE OFERTA (id + namespace + offerType/title) o envuelto en
            //    'catalogOffer', por si el bundle vive bajo otra query.
            const seen = new Set();
            const isOfferLike = (o) =>
                o && typeof o === 'object' &&
                typeof o.id === 'string' && o.id &&
                typeof o.namespace === 'string' &&
                ('offerType' in o || 'title' in o);
            const walk = (node) => {
                if (!node || typeof node !== 'object' || seen.has(node)) return;
                seen.add(node);
                if (isOfferLike(node)) pushOffer(node.id, node.offerType, 'deep');
                const co = node.catalogOffer;
                if (co && typeof co === 'object' && co.id) pushOffer(co.id, co.offerType, 'deep');
                for (const k in node) walk(node[k]);
            };
            for (const q of queries) walk(q.state?.data);

            // c) Camino por CLAVE de query (clave para bundles): los bundles
            //    modernos NO exponen la oferta como objeto con id+namespace en
            //    React Query; la piden vía egs-platform-service con la forma
            //    products/{namespace}/offers/{offerId}. Ese offerId —el mismo que
            //    usa egdata— queda en el queryKey/queryHash. Se busca SOLO en las
            //    claves (no en los datos) para no capturar ofertas de los juegos
            //    incluidos en el paquete.
            const reUrl = /offers\/([0-9a-f]{32})/i;
            const reField = /"offer(?:Id|Sku)?"\s*:\s*"([0-9a-f]{32})"/i;
            const matchOfferId = (str) => {
                const m = str.match(reUrl) || str.match(reField);
                return m ? m[1] : null;
            };
            // Primero SOLO en las claves (preciso); luego, como último recurso,
            // en clave+datos por si el offerId vive en los datos de una query.
            const findOfferIdInQueryKeys = () => {
                for (const q of queries) {
                    const id = matchOfferId(
                        (q.queryHash || '') + (q.queryKey != null ? JSON.stringify(q.queryKey) : ''));
                    if (id) return id;
                }
                for (const q of queries) {
                    const id = matchOfferId(JSON.stringify(q));
                    if (id) return id;
                }
                return null;
            };

            if (isBundle) {
                // Preferir la oferta de tipo BUNDLE si React Query la expone…
                const bundle = offers.find(o => /BUNDLE/i.test(o.type || ''));
                if (bundle) return bundle.id;
                // …si no, usar el offerId capturado de la red (camino real del
                // bundle: la request a egs-platform-service), y como respaldo el
                // que aparezca en el queryKey.
                return capturedOfferId || findOfferIdInQueryKeys();
            }

            // Producto: prioriza la oferta del camino preciso 'getCatalogOffer'.
            const precise = offers.find(o => o.source === 'getCatalogOffer');
            if (precise) return precise.id;
            if (offers.length) return offers[0].id;
            // Último recurso (también para productos): offerId de red o queryKey.
            return capturedOfferId || findOfferIdInQueryKeys();
        } catch (e) {
            // Error silencioso: los datos de React Query pueden no estar disponibles aún
        }
        return null;
    }

    /**
     * Determina el tipo de página actual según la URL.
     * @returns {"product"|"bundle"|null} El tipo de página o null si no coincide.
     */
    function getUrlType() {
        const url = window.location.href;
        if (PRODUCT_URL_REGEX.test(url)) return 'product';
        if (BUNDLE_URL_REGEX.test(url)) return 'bundle';
        return null;
    }

    /**
     * Título del juego: el <h1> de la ficha, y si no lo hay, el título de la página
     * sin el sufijo de Epic Games Store.
     *
     * El <h1> va primero porque el título de la página no siempre es solo el nombre:
     * en las fichas de precompra lleva delante un «Precompra y preordena» traducido a
     * la lengua de la tienda, y ese prefijo se colaba en las búsquedas de GG.deals y
     * PCGamingWiki. Normalmente lo corregiría el nombre en inglés de EGData, pero en
     * precompras su API todavía no conoce la oferta —verificado en Petit Planet, que
     * responde 404—, así que el título malo era el definitivo.
     *
     * La caída a document.title deja igual que antes los casos sin <h1>, los bundles
     * entre ellos.
     * @returns {string} El título limpio del juego.
     */
    function getGameTitle() {
        const heading = document.querySelector(PDP_TITLE_SELECTOR)?.textContent?.trim();
        if (heading) return heading;
        const rawTitle = document.title || '';
        return rawTitle.replace(/\s*-\s*Epic Games Store.*$/i, '').trim().split('|')[0].trim();
    }

    /**
     * Título para las búsquedas externas: el mismo de getGameTitle() sin símbolos
     * de marca ni espacios dobles. Se deja aparte para no tocar el que va al log.
     * @returns {string} Título limpio, o cadena vacía si no se pudo leer.
     */
    function getSearchTitle() {
        return getGameTitle().replace(TRADEMARK_REGEX, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * Normaliza el título para la búsqueda de GG.deals quitando los acentos:
     * GG.deals translitera en su índice, así que "Pokémon" se busca como "Pokemon".
     * @param {string} title - Título limpio del juego.
     * @returns {string} Título sin diacríticos.
     */
    function normalizeForGgDeals(title) {
        return title.normalize('NFD').replace(DIACRITICS_REGEX, '');
    }

    // =============================================
    // NOMBRE EN INGLÉS (API de EGData)
    // =============================================
    // Memoria de la sesión, además de la caché en disco: en un bundle esta función
    // se llama una vez por botón de compra, y el observer puede repintar filas al
    // llegar los botones tardíos. Sin esto sería una petición por fila.
    const englishTitlePromises = new Map();

    function readNameCache(id) {
        try {
            const all = JSON.parse(localStorage.getItem(NAME_CACHE_KEY) || '{}');
            const hit = all[id];
            if (hit && hit.v === NAME_CACHE_SCHEMA && Date.now() - hit.ts < NAME_CACHE_TTL) return hit.names;
        } catch (e) { /* caché corrupta: se ignora y se vuelve a pedir */ }
        return null;
    }

    function writeNameCache(id, names) {
        try {
            let all = {};
            try { all = JSON.parse(localStorage.getItem(NAME_CACHE_KEY) || '{}'); } catch (e) { all = {}; }
            all[id] = { names, ts: Date.now(), v: NAME_CACHE_SCHEMA };
            const keys = Object.keys(all);
            if (keys.length > NAME_CACHE_MAX) {
                keys.sort((a, b) => (all[a].ts || 0) - (all[b].ts || 0))
                    .slice(0, keys.length - NAME_CACHE_MAX)
                    .forEach((k) => delete all[k]);
            }
            localStorage.setItem(NAME_CACHE_KEY, JSON.stringify(all));
        } catch (e) { console.error('(egs2egd): writeNameCache error:', e); }
    }

    /** Misma limpieza que getSearchTitle() aplica al título de la página. */
    function cleanApiName(name) {
        return (name || '').replace(TRADEMARK_REGEX, '').replace(/\s+/g, ' ').trim();
    }

    /**
     * GET con corte por tiempo. Devuelve el JSON, o null ante cualquier fallo.
     * @param {string} url - URL a pedir.
     * @returns {Promise<any|null>} El JSON, o null.
     */
    async function fetchJson(url) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), NAME_TIMEOUT_MS);
        try {
            const res = await fetch(url, { credentials: 'omit', signal: ctrl.signal });
            return res.ok ? await res.json() : null;
        } catch (e) {
            console.warn('(egs2egd): API de EGData sin respuesta:',
                e.name === 'AbortError' ? 'tiempo agotado' : e.message);
            return null;
        } finally { clearTimeout(timer); }
    }

    /**
     * ¿La oferta es SOLO de móvil? Mira las etiquetas de plataforma que Epic pone en
     * la propia oferta; el porqué de exigir las dos condiciones, en el comentario de
     * PLATFORM_TAGS_MOBILE.
     * @param {Array<{name?: string}>} tags - `tags` de la oferta, tal cual las da EGData.
     * @returns {boolean} true solo si hay etiqueta de móvil y ninguna de escritorio.
     */
    function isMobileOnly(tags) {
        const nombres = (Array.isArray(tags) ? tags : []).map((t) => t?.name);
        return PLATFORM_TAGS_MOBILE.some((p) => nombres.includes(p))
            && !PLATFORM_TAGS_DESKTOP.some((p) => nombres.includes(p));
    }

    /**
     * ¿Alguna de las dos listas de etiquetas dice plataforma? Sirve para saber si hay
     * dato con el que juzgar antes de caer al juego base.
     * @param {Array<{name?: string}>} tags - `tags` de una oferta.
     * @returns {boolean} true si hay al menos una etiqueta de plataforma.
     */
    function hasPlatformTags(tags) {
        const nombres = (Array.isArray(tags) ? tags : []).map((t) => t?.name);
        return [...PLATFORM_TAGS_DESKTOP, ...PLATFORM_TAGS_MOBILE].some((p) => nombres.includes(p));
    }

    /**
     * Nombres en inglés de la oferta, pedidos a la API de EGData. Devuelve null ante
     * cualquier fallo, que es lo que deja los botones con el título de la página.
     * Todo lo que no sea el juego suelto cuesta una segunda petición, y solo la
     * primera vez: la caché guarda por offerId. Si esa segunda no contesta se
     * devuelve igualmente el nombre propio, en vez de no devolver nada.
     * @param {string} offerId - ID de la oferta en Epic (el mismo que usa EGData).
     * @returns {Promise<{name: string, baseName: string, mobileOnly: boolean}|null>}
     *     Nombre propio; el del juego al que pertenece, si pertenece a alguno; y si la
     *     ficha es solo de móvil. null si no se pudo obtener.
     */
    function fetchEnglishNames(offerId) {
        if (englishTitlePromises.has(offerId)) return englishTitlePromises.get(offerId);

        const promise = (async () => {
            const cached = readNameCache(offerId);
            if (cached) return cached;

            const offer = await fetchJson(EGDATA_API_URL + encodeURIComponent(offerId));
            const name = cleanApiName(offer?.title);
            if (!name) return null;

            let baseName = '';
            let base = null;
            if (!BASE_GAME_TYPE.test(offer.offerType || '') && offer.namespace) {
                base = await fetchJson(EGDATA_BASE_GAME_URL + encodeURIComponent(offer.namespace));
                if (base?.id && base.id !== offer.id) baseName = cleanApiName(base?.title);
            }

            // La etiqueta de la propia oferta manda; la del juego solo se consulta
            // cuando la oferta no dice nada. El porqué, en PLATFORM_TAGS_MOBILE.
            const mobileOnly = hasPlatformTags(offer.tags)
                ? isMobileOnly(offer.tags)
                : isMobileOnly(base?.tags);

            const names = { name, baseName, mobileOnly };
            writeNameCache(offerId, names);
            return names;
        })();

        englishTitlePromises.set(offerId, promise);
        return promise;
    }

    // =============================================
    // FUNCIONES DOM / UI
    // =============================================

    /**
     * Inyecta los estilos CSS del botón EGData una sola vez en el documento.
     * Los estilos definen la apariencia del botón (fondo negro, texto blanco,
     * hover con gradiente, icono dimensionado) y soporte de accesibilidad (focus).
     */
    function injectStyles() {
        if (document.getElementById(STYLES_ID)) return;

        const style = document.createElement('style');
        style.id = STYLES_ID;
        style.textContent = `
            a[${DATA_ATTR}="true"] {
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                background: #000 !important;
                color: #fff !important;
                border: none !important;
                padding: 8px 12px !important;
                cursor: pointer !important;
                /* Ahora es un <a>: sin esto llevaría el subrayado del navegador,
                   que el <button> no tenía. Mismo motivo en la fila de abajo. */
                text-decoration: none !important;
                transition: background 200ms ease, transform 120ms ease;
            }
            a[${DATA_ATTR}="true"]:hover {
                background: #757575 !important;
                transform: translateY(-1px);
                text-decoration: none !important;
            }
            a[${DATA_ATTR}="true"] .egs2egd-icon {
                width: 24px;
                height: 24px;
                object-fit: contain;
                display: inline-block;
                vertical-align: middle;
                filter: none;
            }
            a[${DATA_ATTR}="true"] .egs2egd-text-outer,
            a[${DATA_ATTR}="true"] .egs2egd-text-inner {
                color: inherit !important;
            }
            a[${DATA_ATTR}="true"]:focus {
                outline: 2px solid #fff3 !important;
                outline-offset: 2px !important;
            }
            /* Fila de GG.deals + PCGamingWiki: mismo aspecto que el botón de EGData
               (negro, texto blanco, misma altura y mismas esquinas) repartiéndose a
               partes iguales el ancho de la columna de compra, que no da para dos
               etiquetas seguidas. Sin sombra: los botones de Epic no la llevan.
               Altura y radio llegan como variables desde matchSibling(), medidos del
               propio botón de EGData, que hereda su aspecto del botón de compra de
               Epic; un valor fijo aquí se desalinearía en cuanto Epic cambie el suyo.
               Los valores del var() son solo el respaldo. */
            .egs2egd-links {
                display: flex; align-items: stretch; gap: 8px; margin-top: 0.625rem;
            }
            a[${LINK_ATTR}="true"] {
                flex: 1 1 0;
                min-width: 0;
                box-sizing: border-box;
                min-height: var(--egs2egd-h, 40px);
                border-radius: var(--egs2egd-r, 8px) !important;
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 6px !important;
                background: #000 !important;
                color: #fff !important;
                border: none !important;
                padding: 5px 8px !important;
                font-size: 12px !important;
                font-weight: 700 !important;
                line-height: 1.3 !important;
                cursor: pointer !important;
                text-decoration: none !important;
                white-space: nowrap;
                overflow: hidden;
                transition: background 200ms ease, transform 120ms ease;
            }
            a[${LINK_ATTR}="true"]:hover {
                background: #757575 !important;
                transform: translateY(-1px);
                text-decoration: none !important;
            }
            a[${LINK_ATTR}="true"]:focus {
                outline: 2px solid #fff3 !important;
                outline-offset: 2px !important;
            }
            a[${LINK_ATTR}="true"] .egs2egd-ico {
                display: inline-flex;
                align-items: center;
                flex: 0 0 auto;
            }
            a[${LINK_ATTR}="true"] img.egs2egd-ico {
                width: 14px; height: 14px; object-fit: contain;
            }
            /* El logo de PCGamingWiki es más alto que ancho (viewBox 827x1158): se
               fija el alto y se deja el ancho automático para no deformarlo. */
            a[${LINK_ATTR}="true"] .egs2egd-ico svg {
                height: 14px; width: auto; display: block;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

    /**
     * Crea un botón EGData individual con icono y texto.
     * @param {string} slug - ID de la oferta en EGData.
     * @param {string} className - Clase CSS a aplicar (hereda del botón de compra).
     * @returns {HTMLAnchorElement} El botón creado.
     */
    function buildButton(slug, className) {
        const egDataLink = `${EGDATA_BASE_URL}${slug}`;
        // Es un <a> de verdad, no un <button> con onclick: así funcionan el clic
        // central, "abrir en pestaña nueva" y "copiar dirección del enlace", igual
        // que en los dos enlaces de la fila de abajo. El aspecto no depende de las
        // clases heredadas del botón de compra —que se conservan—, sino del CSS de
        // injectStyles(), que lo fija todo con !important; por eso el cambio de
        // elemento no lo toca.
        const button = document.createElement('a');
        button.className = className;
        button.href = egDataLink;
        button.target = '_blank';
        button.rel = 'nofollow noopener external';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.gap = '8px';
        button.setAttribute(DATA_ATTR, 'true');
        button.setAttribute('data-egs2egd-slug', slug);

        // Icono de EGData
        const img = document.createElement('img');
        img.src = EGDATA_ICON_URL;
        img.alt = '';
        img.className = 'egs2egd-icon';

        // Texto anidado (span > span) para coherencia con la estructura de EGS
        const textOuter = document.createElement('span');
        textOuter.className = 'egs2egd-text-outer';
        const textInner = document.createElement('span');
        textInner.className = 'egs2egd-text-inner';
        textInner.textContent = 'EGData';
        textOuter.appendChild(textInner);

        button.appendChild(img);
        button.appendChild(textOuter);
        return button;
    }

    // =========================================================================
    // TOOLTIP NATIVO DE LA TIENDA
    // =========================================================================
    // El tooltip de Epic (el de "Agregar al carrito", por ejemplo) no es un
    // componente suyo: es Radix Tooltip, que monta la caja en un portal al final del
    // <body> —un div con data-radix-popper-content-wrapper, colocado con position
    // fixed— y la viste con las clases de su design system, las eds_*. No hay API
    // pública que llamar: Radix vive dentro de su bundle de React. Así que se replica
    // su DOM y se reutiliza su CSS, que es lo que de verdad da el aspecto.
    //
    // Las clases eds_* son hashes de compilación: si Epic toca ese componente,
    // cambian y aquí dejarían de pintar. Por eso NO se dan por buenas: se monta un
    // ejemplar y se comprueba que siga teniendo fondo. Si no lo tiene, no se monta
    // nada y los botones se quedan con su `title`, que es la caída de siempre.
    // Verificadas contra el DOM real de la tienda el 2026-08-13.
    const EPIC_TIP_WRAPPER_ATTR = 'data-radix-popper-content-wrapper';
    const EPIC_TIP_CLASSES = ['eds_o3n6et0', 'eds_1ypbntdd', 'eds_xd1k8g0'];
    const EPIC_TIP_ARROW_CLASS = 'eds_o3n6et1';
    const EPIC_TIP_Z_INDEX = '1100';
    // Medidas de la flecha, tal cual las emite Radix (10x5 sobre un viewBox 0 0 30 10).
    const EPIC_TIP_ARROW_W = 10;
    const EPIC_TIP_ARROW_H = 5;
    const EPIC_TIP_DELAY_MS = 300;   // retardo antes de aparecer
    const EPIC_TIP_EDGE_MARGIN = 8;  // margen que se respeta al borde de la ventana

    // Un único tooltip para todos los botones: nunca hay dos visibles a la vez.
    let epicTipWrapper = null;
    let epicTipBox = null;
    let epicTipText = null;
    let epicTipArrow = null;
    let epicTipSrText = null;
    let epicTipLive = null;
    let epicTipTimer = null;

    /**
     * Construye el DOM que emite Radix: wrapper posicionado, caja con las clases del
     * tema, la flecha en un span propio y una copia del texto solo para lectores de
     * pantalla (role="tooltip"), que es lo que hace la tienda.
     * @returns {HTMLDivElement} El wrapper, todavía fuera del documento.
     */
    function buildEpicTooltipNode() {
        const wrapper = document.createElement('div');
        wrapper.setAttribute(EPIC_TIP_WRAPPER_ATTR, '');
        // Radix lo coloca con transform sobre left/top a cero; aquí left/top directos
        // hacen lo mismo y se leen mejor.
        wrapper.style.cssText = `position: fixed; z-index: ${EPIC_TIP_Z_INDEX}; min-width: max-content; pointer-events: none;`;

        const box = document.createElement('div');
        box.className = EPIC_TIP_CLASSES.join(' ');
        box.setAttribute('data-side', 'top');
        box.setAttribute('data-align', 'center');
        box.setAttribute('data-state', 'delayed-open');

        const text = document.createTextNode('');
        box.appendChild(text);

        const arrow = document.createElement('span');
        arrow.style.position = 'absolute';
        arrow.innerHTML = `<svg class="${EPIC_TIP_ARROW_CLASS}" width="${EPIC_TIP_ARROW_W}" height="${EPIC_TIP_ARROW_H}" viewBox="0 0 30 10" preserveAspectRatio="none" style="display:block"><polygon points="0,0 30,0 15,10"></polygon></svg>`;
        box.appendChild(arrow);

        const sr = document.createElement('span');
        sr.setAttribute('role', 'tooltip');
        sr.style.cssText = 'position:absolute;border:0;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;overflow-wrap:normal';
        box.appendChild(sr);

        wrapper.appendChild(box);
        epicTipBox = box;
        epicTipText = text;
        epicTipArrow = arrow;
        epicTipSrText = sr;
        return wrapper;
    }

    /**
     * Comprueba que las clases del tema sigan vistiendo la caja, montándola fuera de
     * la vista y mirando si tiene fondo. Es lo que separa un tooltip de la tienda de
     * un párrafo suelto flotando sobre la página.
     * @returns {boolean} true si el CSS de Epic sigue reconociendo esas clases.
     */
    function epicTooltipIsLive() {
        if (epicTipLive !== null) return epicTipLive;

        const wrapper = buildEpicTooltipNode();
        epicTipText.nodeValue = 'x';
        wrapper.style.left = '-9999px';
        wrapper.style.top = '0px';
        document.body.appendChild(wrapper);
        const bg = getComputedStyle(epicTipBox).backgroundColor;
        wrapper.remove();

        epicTipLive = !!bg && bg !== 'transparent' && !/^rgba\(.*,\s*0\)$/.test(bg);
        if (epicTipLive) {
            epicTipWrapper = wrapper;
            // Con la página en movimiento el tooltip quedaría flotando fuera de sitio:
            // Radix lo reposiciona, aquí basta con cerrarlo. Van aquí, una sola vez,
            // y no por botón: hay un juego de botones por cada botón de compra.
            window.addEventListener('scroll', hideEpicTooltip, { passive: true, capture: true });
            window.addEventListener('resize', hideEpicTooltip, { passive: true });
        } else {
            epicTipWrapper = epicTipBox = epicTipText = epicTipArrow = epicTipSrText = null;
        }
        return epicTipLive;
    }

    /**
     * Coloca el tooltip centrado sobre el botón, o debajo si no cabe arriba, y apunta
     * la flecha al centro del botón aunque la caja se haya tenido que desplazar para
     * no salirse de la ventana.
     * @param {HTMLElement} anchor - El botón al que se ancla.
     */
    function positionEpicTooltip(anchor) {
        const rect = anchor.getBoundingClientRect();
        const width = epicTipWrapper.offsetWidth;
        const height = epicTipWrapper.offsetHeight;

        let side = 'top';
        let top = rect.top - height - EPIC_TIP_ARROW_H;
        if (top < EPIC_TIP_EDGE_MARGIN) {
            side = 'bottom';
            top = rect.bottom + EPIC_TIP_ARROW_H;
        }

        const maxLeft = document.documentElement.clientWidth - width - EPIC_TIP_EDGE_MARGIN;
        const left = Math.max(EPIC_TIP_EDGE_MARGIN, Math.min(rect.left + rect.width / 2 - width / 2, maxLeft));

        epicTipWrapper.style.left = `${left}px`;
        epicTipWrapper.style.top = `${top}px`;
        epicTipBox.setAttribute('data-side', side);

        // La flecha va pegada al borde de la caja que mira al botón, y se gira cuando
        // el tooltip pasa debajo para que siga apuntando hacia él.
        const arrowLeft = rect.left + rect.width / 2 - left - EPIC_TIP_ARROW_W / 2;
        epicTipArrow.style.left = `${arrowLeft}px`;
        if (side === 'top') {
            epicTipArrow.style.top = '';
            epicTipArrow.style.bottom = '0';
            epicTipArrow.style.transform = 'translateY(100%)';
        } else {
            epicTipArrow.style.bottom = '';
            epicTipArrow.style.top = '0';
            epicTipArrow.style.transform = 'translateY(-100%) rotate(180deg)';
        }
    }

    /** Muestra el tooltip de un botón. */
    function showEpicTooltip(anchor, text) {
        if (!anchor.isConnected) return;  // la SPA se llevó el botón mientras esperábamos
        epicTipText.nodeValue = text;
        epicTipSrText.textContent = text;
        if (!epicTipWrapper.isConnected) document.body.appendChild(epicTipWrapper);
        positionEpicTooltip(anchor);
    }

    /** Lo retira; volver a entrar en un botón lo vuelve a montar. */
    function hideEpicTooltip() {
        clearTimeout(epicTipTimer);
        if (epicTipWrapper && epicTipWrapper.isConnected) epicTipWrapper.remove();
    }

    /**
     * Cuelga el tooltip de la tienda de un elemento, por hover y por foco (Radix hace
     * las dos). El clic no se toca: lo único que el botón tiene que hacer es abrirse.
     * Si el CSS de Epic ya no reconoce sus clases, no monta nada y el elemento se queda
     * con el `title`, que es lo que trae puesto.
     *
     * El foco se escucha con focusin/focusout y no con focus/blur porque estos no
     * burbujean: en la barra de la lista de deseos el tooltip cuelga de un <label> y
     * quien recibe el foco es la casilla de dentro, así que con focus/blur el aviso
     * nunca saldría por teclado. Para un <a> —los botones de ficha— las dos parejas
     * hacen lo mismo, porque no tienen nada enfocable dentro.
     * @param {HTMLElement} anchor - El botón o control.
     * @param {string} text - El texto del aviso.
     */
    function attachEpicTooltip(anchor, text) {
        if (!epicTooltipIsLive()) return;

        const open = () => {
            clearTimeout(epicTipTimer);
            epicTipTimer = setTimeout(() => showEpicTooltip(anchor, text), EPIC_TIP_DELAY_MS);
        };
        anchor.addEventListener('mouseenter', open);
        anchor.addEventListener('focusin', open);
        anchor.addEventListener('mouseleave', hideEpicTooltip);
        anchor.addEventListener('focusout', hideEpicTooltip);

        anchor.removeAttribute('title');  // si no, se verían los dos
    }

    /**
     * Crea un enlace externo con el aspecto del botón de EGData, con el icono
     * dentro y a la izquierda de la etiqueta. Es un <a> real, así que funcionan el
     * clic central y "copiar dirección del enlace".
     * El `title` se pone siempre: es la caída para cuando el tooltip de la tienda no
     * se pueda montar. attachEpicTooltip() lo retira cuando sí lo monta.
     * @param {{ label: string, url: string, iconSvg?: string, iconUrl?: string, tooltip: string }} opts
     * @returns {HTMLAnchorElement} El enlace listo para insertar.
     */
    function buildLinkButton({ label, url, iconSvg, iconUrl, tooltip }) {
        const a = document.createElement('a');
        a.setAttribute(LINK_ATTR, 'true');
        a.href = url;
        a.target = '_blank';
        a.rel = 'nofollow noopener external';
        a.title = tooltip;
        attachEpicTooltip(a, tooltip);

        if (iconSvg) {
            const box = document.createElement('span');
            box.className = 'egs2egd-ico';
            box.innerHTML = iconSvg;
            a.appendChild(box);
        } else if (iconUrl) {
            const img = document.createElement('img');
            img.className = 'egs2egd-ico';
            img.src = iconUrl;
            img.alt = '';
            img.addEventListener('error', () => img.remove());  // sin icono si el CSP lo bloquea
            a.appendChild(img);
        }
        const text = document.createElement('span');
        text.textContent = label;
        a.appendChild(text);
        return a;
    }

    /**
     * URL de la búsqueda de GG.deals por título, filtrada al DRM de Epic. Está
     * aparte del botón porque el href se reescribe cuando llega el nombre en inglés.
     * @param {string} title - Título del juego.
     * @returns {string} La URL de búsqueda.
     */
    function ggDealsUrl(title) {
        const params = new URLSearchParams({
            drm: GGDEALS_EPIC_DRM,
            minRating: GGDEALS_MIN_RATING,
            title: normalizeForGgDeals(title)
        });
        return `${GGDEALS_SEARCH_URL}?${params}`;
    }

    /**
     * URL de la búsqueda de PCGamingWiki por título. Aparte por el mismo motivo
     * que ggDealsUrl().
     * @param {string} title - Título del juego.
     * @returns {string} La URL de búsqueda.
     */
    function pcgwUrl(title) {
        return `${PCGW_SEARCH_URL}?${new URLSearchParams({ search: pcgwSearchTitle(title) })}`;
    }

    /**
     * Recorta lo que PCGamingWiki no indexa: los sufijos de edición. Si el recorte
     * dejara la cadena vacía —un producto llamado solo "Deluxe Edition"— se queda
     * el título entero, que es peor buscar que nada.
     * @param {string} title - Título del producto.
     * @returns {string} Título sin el sufijo de edición.
     */
    function pcgwSearchTitle(title) {
        return title.replace(SKU_EDITION_REGEX, '').trim() || title;
    }

    /**
     * Fila con los enlaces a GG.deals y PCGamingWiki. Se pinta con el título de la
     * página —que en la mayoría de los idiomas ES el inglés— y los dos href se
     * reescriben cuando llega el nombre en inglés de EGData. Se hace así y no
     * esperando la respuesta porque la fila cuelga del botón de EGData, que sí sale
     * de inmediato: bloquearla dejaría un hueco, y si la API no contestara la fila
     * no llegaría a aparecer. El peor caso es quedarse con el título de la página,
     * que es exactamente lo de antes.
     * Devuelve null si no hay título legible: mejor sin botones que con dos enlaces
     * a una búsqueda vacía.
     * @param {string} offerId - ID de la oferta, para pedir el nombre en inglés.
     * @returns {HTMLDivElement|null} El contenedor con los dos enlaces, o null.
     */
    function buildExternalLinks(offerId) {
        const title = getSearchTitle();
        if (!title) return null;

        const box = document.createElement('div');
        box.className = 'egs2egd-links';

        const ggLink = buildLinkButton({
            label: 'GG.deals',
            url: ggDealsUrl(title),
            iconUrl: GGDEALS_ICON_URL,
            tooltip: t.ggTip
        });
        const pcgwLink = buildLinkButton({
            label: 'PCGamingWiki',
            url: pcgwUrl(title),
            iconSvg: PCGW_ICON_SVG,
            tooltip: t.pcgwTip
        });
        box.appendChild(ggLink);
        box.appendChild(pcgwLink);

        // El isConnected es por la SPA: si el usuario navega a otra ficha antes de
        // que llegue la respuesta, esta fila ya no está en el documento y
        // reescribirla sería tocar nodos huérfanos.
        if (offerId) {
            fetchEnglishNames(offerId).then((names) => {
                if (!names) return;
                if (!ggLink.isConnected || !pcgwLink.isConnected) return;
                // En una ficha solo de móvil sobran LOS DOS: PCGamingWiki documenta
                // juegos de PC y GG.deals sigue ofertas de tiendas de PC, así que
                // ninguno de los dos puede encontrar nada. Se retiran en vez de dejar
                // dos botones que solo llevan a una búsqueda vacía; el de EGData se
                // queda, porque esas ofertas sí están en su base de datos.
                // Se hace aquí y no antes de pintar porque el dato llega con ESTA
                // misma respuesta; esperarla dejaría la fila en blanco en todas las
                // fichas para arreglar unas pocas. El hideEpicTooltip() es por si
                // estuviera abierto el de alguno: el tooltip de la tienda no cuelga
                // del enlace, así que quitarlo no se lo llevaría.
                if (names.mobileOnly) {
                    hideEpicTooltip();
                    ggLink.remove();
                    pcgwLink.remove();
                    return;
                }
                ggLink.href = ggDealsUrl(names.name);
                // Si la oferta pertenece a otro juego —un DLC, una edición, un paquete
                // de monedas—, PCGamingWiki va a ese juego: no tiene artículo para el
                // complemento, lo documenta dentro del juego al que pertenece.
                pcgwLink.href = pcgwUrl(names.baseName || names.name);
            });
        }
        return box;
    }

    /**
     * Copia a la fila de enlaces la altura y el radio de esquina del botón hermano,
     * midiéndolos ya en el DOM. Silencioso si no se puede medir: la fila se queda con
     * los valores por defecto del CSS.
     *
     * Mide al insertar y CADA VEZ que el botón cambie de tamaño, porque una sola
     * medida no basta. El primer juego de botones de la página se inserta antes de que
     * Epic haya maquetado su botón de compra —del que EGData hereda el aspecto—, así
     * que `offsetHeight` vale 0 y la fila se quedaba con el respaldo: 40 px contra los
     * 48 reales del hermano. Se veía solo en el primero, y de ahí que costara ver:
     * el segundo lo pinta el observer con el layout ya asentado y ahí sí cuadraba.
     * Verificado en la ficha del bundle de GTA Trilogy, donde la primera fila salía a
     * 40 y la segunda a 48. Es el mismo enfoque que ya usa el script de Microsoft
     * Store para copiar el tamaño del botón de la tienda.
     * @param {HTMLElement} links - Fila de enlaces externos.
     * @param {HTMLElement} sibling - Botón de EGData, del que se copian las medidas.
     */
    function matchSibling(links, sibling) {
        let observer = null;
        const apply = () => {
            try {
                // Al navegar dentro de la SPA la fila desaparece; seguir observando su
                // botón sería dejar un observer colgado por cada ficha visitada.
                if (!links.isConnected) {
                    if (observer) { observer.disconnect(); observer = null; }
                    return;
                }
                const h = sibling.offsetHeight;
                if (h > 0) links.style.setProperty('--egs2egd-h', `${h}px`);
                const r = getComputedStyle(sibling).borderRadius;
                if (r && r !== '0px') links.style.setProperty('--egs2egd-r', r);
            } catch (e) { /* sin medidas: mandan los valores por defecto del CSS */ }
        };

        apply();
        if (typeof ResizeObserver === 'function') {
            try {
                observer = new ResizeObserver(apply);
                observer.observe(sibling);
            } catch (e) { observer = null; }
        }
    }

    /**
     * Reintenta la fila de enlaces mientras el título no sea legible, y la inserta en
     * cuanto lo sea. Se rinde a los ~10 s o si el bloque deja de estar en el documento
     * (navegación dentro de la SPA). Silencioso: sin título, queda solo EGData, que es
     * mejor que dos enlaces a una búsqueda vacía.
     * @param {HTMLElement} box - El div que ya contiene el botón de EGData.
     * @param {HTMLElement} button - El botón de EGData, del que se copian las medidas.
     * @param {string} slug - ID de la oferta.
     */
    function watchForExternalLinks(box, button, slug) {
        let tries = 0;
        const iv = setInterval(() => {
            tries++;
            if (!box.isConnected || tries > LINKS_RETRY_MAX) { clearInterval(iv); return; }
            if (box.querySelector('.egs2egd-links')) { clearInterval(iv); return; }
            const links = buildExternalLinks(slug);
            if (!links) return;
            clearInterval(iv);
            box.appendChild(links);
            matchSibling(links, button);
        }, LINKS_RETRY_INTERVAL_MS);
    }

    /**
     * Encaja el bloque insertado cuando el contenedor de compra es una FILA.
     *
     * En las fichas de precompra/prerregistro Epic maqueta ese contenedor con
     * `flex-direction: row` (y `flex-wrap: wrap`) en vez de la columna de siempre, así
     * que el bloque entra como un hermano más y se encoge a su contenido: EGData y la
     * fila de enlaces salían más estrechos que el botón de compra, y la etiqueta
     * "PCGamingWiki" se desbordaba de su pastilla. Con `flex-basis: 100%` el bloque se
     * lleva una línea entera y recupera el ancho de la columna.
     *
     * Y si esa fila ya separa a sus hijos con `gap`, se quita el margen superior del
     * botón: gap y margen se sumarían, dejando el hueco de arriba del doble que el de
     * abajo. Verificado en la ficha de precompra de Petit Planet, donde el gap del
     * contenedor es 0.625rem, exactamente el mismo margen que ponemos nosotros.
     *
     * Cuando el host es la columna de siempre no toca nada.
     * @param {HTMLElement} host - Contenedor del que cuelga el bloque.
     * @param {HTMLElement} block - Bloque insertado (botón de EGData + fila de enlaces).
     * @param {HTMLElement} button - Botón de EGData.
     */
    function fitToRowHost(host, block, button) {
        try {
            const cs = getComputedStyle(host);
            if (!/(^|-)flex$/.test(cs.display)) return;
            if (!cs.flexDirection.startsWith('row')) return;
            block.style.flex = '1 1 100%';
            block.style.minWidth = '0';
            if (parseFloat(cs.rowGap) > 0) button.style.marginTop = '0px';
        } catch (e) { /* sin medidas: el bloque se queda como estaba */ }
    }

    /**
     * Inserta el botón EGData colgando del contenedor 3 niveles arriba del botón
     * de compra dado (misma colocación original que ya funcionaba en productos).
     * @param {HTMLButtonElement} purchaseButton - Botón de compra de referencia.
     * @param {string} slug - ID de la oferta en EGData.
     * @param {boolean} withMargin - Añade separación superior (para botones extra).
     * @returns {HTMLAnchorElement|null} El botón insertado, el existente, o null.
     */
    function insertNextToPurchase(purchaseButton, slug, withMargin) {
        // Dedup POR BOTÓN DE COMPRA (no por contenedor). En los bundles los dos
        // botones (barra superior y sección "Comprar …") pueden compartir el
        // ancestro de 3 niveles; deduplicar por contenedor hacía que el segundo
        // nunca recibiera su botón. Marcar el propio botón de compra garantiza
        // exactamente un EGData por cada uno, aunque compartan host.
        if (purchaseButton.dataset.egs2egdDone === '1') return null;

        // Contenedor padre adecuado (3 niveles arriba del botón de compra).
        const host = purchaseButton.parentElement?.parentElement?.parentElement;
        if (!host) return null;

        purchaseButton.dataset.egs2egdDone = '1';

        const purchaseButtonIsDisabled =
            purchaseButton.hasAttribute('disabled') || purchaseButton.className.includes('disabled');
        if (purchaseButtonIsDisabled) purchaseButton.style.marginLeft = '0px';

        injectStyles();

        // Contenedores div intermedios para la estructura visual (como el original).
        const div = document.createElement('div');
        const divButton = document.createElement('div');
        div.appendChild(divButton);

        const button = buildButton(slug, purchaseButton.className || '');
        if (withMargin) button.style.marginTop = '0.625rem';
        divButton.appendChild(button);

        // GG.deals y PCGamingWiki van en su propia fila, colgada del mismo host: el
        // botón de EGData conserva así la colocación exacta que ya funcionaba.
        const links = buildExternalLinks(slug);
        if (links) div.appendChild(links);

        host.appendChild(div);
        // Después de colgarlo: el ancho del bloque depende de cómo maquete el host,
        // y eso solo se puede leer con el bloque ya dentro.
        fitToRowHost(host, div, button);
        // Medir después de insertar: antes el botón no tiene alto ni estilo aplicado.
        if (links) matchSibling(links, button);
        // Sin fila hay que reintentar, y aquí está el único punto donde se puede: el
        // botón de compra ya quedó marcado como procesado unas líneas arriba, así que
        // el observer no volverá a pasar por él y la fila se perdería para siempre —el
        // botón de EGData se quedaría solo, que es el síntoma que se veía de vez en
        // cuando en los bundles—. Pasa cuando `document.title` todavía no trae el
        // nombre del producto: Epic es una SPA y lo actualiza cuando le toca, no antes
        // de que aparezca el botón de compra.
        if (!links) watchForExternalLinks(div, button, slug);
        return button;
    }

    /**
     * Crea e inserta el botón EGData junto a CADA botón de compra de la página.
     * Los bundles tienen dos (barra superior y sección "Comprar …"); los
     * productos normalmente uno. No duplica si ya existe.
     * @param {string} slug - ID de la oferta en EGData.
     * @param {string} urlType - Tipo de página ("product" o "bundle").
     * @param {string} gameTitle - Título del juego (para log).
     * @returns {HTMLAnchorElement|null} El primer botón creado/encontrado, o null.
     */
    function createEGDataButton(slug, urlType, gameTitle) {
        try {
            const egDataLink = `${EGDATA_BASE_URL}${slug}`;
            const purchaseButtons = document.querySelectorAll(PURCHASE_BUTTON_SELECTOR);
            if (!purchaseButtons.length) return null;

            let firstButton = null;
            purchaseButtons.forEach((pb) => {
                // Separación superior en TODOS los botones para que el de la barra
                // superior se vea igual que el de la sección "Comprar …".
                const btn = insertNextToPurchase(pb, slug, true);
                if (btn && !firstButton) firstButton = btn;
            });

            if (firstButton) {
                console.log(`(egs2egd): ${gameTitle} [${urlType}] — ${purchaseButtons.length} botón(es) de compra, EGData añadido -> ${egDataLink}`);
            }
            return firstButton;
        } catch (e) {
            console.error('(egs2egd): Error al crear el botón EGData:', e);
            return null;
        }
    }

    // =============================================
    // LÓGICA DE POLLING Y DETECCIÓN
    // =============================================

    /**
     * Detiene el observer que sigue pintando botones tardíos.
     */
    function stopButtonObserver() {
        if (buttonObserver) { buttonObserver.disconnect(); buttonObserver = null; }
        if (buttonObserverDebounce) { clearTimeout(buttonObserverDebounce); buttonObserverDebounce = null; }
    }

    /**
     * Observa el DOM tras crear el primer botón para pintar los que Epic renderiza
     * más tarde (el segundo botón de compra del bundle suele llegar después). Antes
     * el polling se detenía al primer éxito y por eso a veces faltaba el segundo.
     */
    function startButtonObserver() {
        if (buttonObserver) return;
        buttonObserver = new MutationObserver(() => {
            if (buttonObserverDebounce) return;
            buttonObserverDebounce = setTimeout(() => {
                buttonObserverDebounce = null;
                if (!pageSlug || !getUrlType()) return;
                createEGDataButton(pageSlug, getUrlType(), getGameTitle());
            }, 300);
        });
        buttonObserver.observe(document.body || document.documentElement, {
            childList: true, subtree: true,
        });
    }

    /**
     * Inicia un intervalo de polling que espera a que React cargue los datos
     * del catálogo (__REACT_QUERY_INITIAL_QUERIES__), encuentre el slug
     * del producto y el botón de compra esté en el DOM. Al primer botón
     * arranca un MutationObserver que sigue pintando los botones tardíos.
     */
    function startWaitForData() {
        stopButtonObserver();
        if (waitIntervalId) {
            clearInterval(waitIntervalId);
            waitIntervalId = null;
        }
        pageSlug = null;

        const urlType = getUrlType();
        if (!urlType) return;

        const gameTitle = getGameTitle();
        console.log(`(egs2egd): ${gameTitle} [${urlType}] — preparing to add the button`);

        let attempts = 0;
        waitIntervalId = setInterval(() => {
            attempts++;

            // Esperar a que React Query esté disponible
            if (!window.__REACT_QUERY_INITIAL_QUERIES__) {
                if (attempts >= MAX_POLL_ATTEMPTS) {
                    clearInterval(waitIntervalId);
                    waitIntervalId = null;
                    console.warn('(egs2egd): Tiempo de espera agotado para React Query data');
                }
                return;
            }

            const slug = findSlug();
            if (!slug) {
                if (attempts >= MAX_POLL_ATTEMPTS) {
                    clearInterval(waitIntervalId);
                    waitIntervalId = null;
                }
                return;
            }

            const purchaseButton = document.querySelector(PURCHASE_BUTTON_SELECTOR);
            if (!purchaseButton) {
                if (attempts >= MAX_POLL_ATTEMPTS) {
                    clearInterval(waitIntervalId);
                    waitIntervalId = null;
                }
                return;
            }

            pageSlug = slug;
            createEGDataButton(slug, urlType, gameTitle);
            clearInterval(waitIntervalId);
            waitIntervalId = null;
            // Seguir observando: el segundo botón del bundle puede llegar tarde.
            startButtonObserver();
        }, POLL_INTERVAL_MS);
    }

    // =============================================
    // WISHLIST — persistencia de orden y filtros
    // =============================================
    // El wishlist es 100% estado de React (ni el orden ni los filtros van en la
    // URL). Para persistir se CAPTURA el estado visible y se REAPLICA replicando
    // los gestos del usuario: abrir el dropdown de orden y clicar la opción, y
    // marcar/desmarcar los checkboxes de la barra lateral.
    // Emparejado ÍNDICE + ETIQUETA: se guardan ambos. Al reaplicar se intenta por
    // etiqueta (mismo idioma; resiste que cambien las clases css-* y la lista de
    // filtros) y, si no coincide (idioma distinto), se cae al ÍNDICE, que es
    // estable entre traducciones. Así funciona multi-idioma sin depender del texto.

    const wlDelay = (ms) => new Promise((r) => setTimeout(r, ms));

    function isWishlist() {
        return WISHLIST_PATH_REGEX.test(location.pathname);
    }

    // Espera (sondeando) a que aparezca un elemento; resuelve null al agotar tiempo.
    function waitForElement(selector, timeoutMs) {
        return new Promise((resolve) => {
            const now = document.querySelector(selector);
            if (now) return resolve(now);
            const deadline = Date.now() + (timeoutMs || 10000);
            const iv = setInterval(() => {
                const el = document.querySelector(selector);
                if (el) { clearInterval(iv); resolve(el); }
                else if (Date.now() > deadline) { clearInterval(iv); resolve(null); }
            }, 200);
        });
    }

    // --- Persistencia (localStorage) --------------------------------------------
    // Estado guardado. sort = { i:índice, t:etiqueta } | null. filters = array de
    // grupos { i:índice, t:título, items:[{ i:índice, t:etiqueta }] }. Se guardan
    // índice Y etiqueta a propósito: la etiqueta empareja en el mismo idioma y el
    // índice es el respaldo independiente del idioma (el orden de opciones/filtros
    // es estable entre traducciones).
    function getWishlistSettings() {
        const def = { remember: true, sort: null, filters: [], onlyDiscount: false };
        try {
            const raw = localStorage.getItem(WL_SETTINGS_KEY);
            const parsed = raw ? JSON.parse(raw) : null;
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                return Object.assign(def, parsed, {
                    sort: (parsed.sort && typeof parsed.sort === 'object') ? parsed.sort : null,
                    filters: Array.isArray(parsed.filters) ? parsed.filters : [],
                    onlyDiscount: !!parsed.onlyDiscount,
                });
            }
        } catch (e) { console.error('(egs2egd): getWishlistSettings error:', e); }
        return def;
    }
    function saveWishlistSettings(s) {
        try { localStorage.setItem(WL_SETTINGS_KEY, JSON.stringify(s)); }
        catch (e) { console.error('(egs2egd): saveWishlistSettings error:', e); }
    }

    // --- Lectura del DOM ---------------------------------------------------------
    // Etiqueta del orden activo (texto del botón del dropdown).
    function wlReadSort() {
        const toggle = document.getElementById(WL_SORT_TOGGLE_ID);
        if (!toggle) return '';
        const cur = toggle.querySelector(WL_SORT_CURRENT) || toggle;
        return (cur.textContent || '').trim();
    }

    // Bloques de grupo de filtro (los .css-1n0v0ym que tienen cabecera plegable).
    function wlGroupBlocks() {
        const sidebar = document.querySelector(WL_SIDEBAR);
        if (!sidebar) return [];
        return Array.from(sidebar.querySelectorAll(WL_GROUP))
            .filter((b) => b.querySelector(WL_GROUP_TOGGLE) && b.querySelector(WL_CHECKBOX));
    }
    function wlGroupTitle(block) {
        const t = block.querySelector(WL_GROUP_TITLE);
        return t ? (t.textContent || '').trim() : '';
    }
    function wlCheckboxLabel(cb) {
        const span = cb.querySelector('span');
        return span ? (span.textContent || '').trim() : (cb.textContent || '').trim();
    }

    // Opciones del menú de orden (botones role=menuitem). Solo existen con el
    // menú abierto (Epic lo monta como popper aparte al pulsar el toggle).
    function wlSortMenuItems() {
        const menu = document.getElementById(WL_SORT_MENU_ID);
        if (!menu) return [];
        return Array.from(menu.querySelectorAll('[role="menuitem"]'));
    }
    function wlItemText(el) {
        const t = el.querySelector('[data-testid="title"]') || el;
        return (t.textContent || '').trim();
    }

    // Filtros marcados como array de grupos { i, t, items:[{ i, t }] }.
    function wlCaptureFilters() {
        const groups = [];
        wlGroupBlocks().forEach((block, gi) => {
            const items = [];
            Array.from(block.querySelectorAll(WL_CHECKBOX)).forEach((cb, ci) => {
                if (cb.getAttribute('aria-checked') === 'true') items.push({ i: ci, t: wlCheckboxLabel(cb) });
            });
            if (items.length) groups.push({ i: gi, t: wlGroupTitle(block), items });
        });
        return groups;
    }

    // Estado visible completo (para copiar enlace / snapshot al activar Recordar).
    // El orden usa wlLastSort (tiene índice); si nunca se cambió, cae a la etiqueta
    // visible sin índice (bastará por etiqueta en el mismo idioma).
    function wlCaptureState() {
        return {
            sort: wlLastSort || (wlReadSort() ? { i: null, t: wlReadSort() } : null),
            filters: wlCaptureFilters(),
            od: !!getWishlistSettings().onlyDiscount,
        };
    }

    // Captura del orden por delegación: al clicar una opción del menú se registra
    // su índice + etiqueta. Funciona aunque el menú sea un popper fuera del scope.
    function bindSortCapture() {
        if (wlSortBound) return;
        wlSortBound = true;
        document.addEventListener('click', (e) => {
            const item = e.target.closest && e.target.closest('#' + WL_SORT_MENU_ID + ' [role="menuitem"]');
            if (!item) return;
            const idx = wlSortMenuItems().indexOf(item);
            wlLastSort = { i: idx >= 0 ? idx : null, t: wlItemText(item) };
            if (wlReapplyInProgress || !isWishlist()) return;
            const s = getWishlistSettings();
            if (!s.remember) return;
            s.sort = wlLastSort;
            saveWishlistSettings(s);
        }, true);
    }

    // --- Reaplicación ------------------------------------------------------------
    async function wlApplySort(want) {
        if (!want || (want.i == null && !want.t)) return;
        // Vía rápida (mismo idioma): si la etiqueta visible ya coincide, no abrir.
        if (want.t && wlReadSort() === want.t) return;
        const toggle = document.getElementById(WL_SORT_TOGGLE_ID);
        if (!toggle) return;
        if (toggle.getAttribute('aria-expanded') !== 'true') toggle.click();
        const menu = await waitForElement('#' + WL_SORT_MENU_ID, 2500);
        if (!menu) return;
        const items = wlSortMenuItems();
        // Emparejar por etiqueta (mismo idioma); si no aparece, por índice.
        let target = want.t ? items.find((it) => wlItemText(it) === want.t) : null;
        if (!target && want.i != null && items[want.i]) target = items[want.i];
        if (target) target.click();
        else if (toggle.getAttribute('aria-expanded') === 'true') toggle.click(); // cerrar
        await wlDelay(350);
    }

    async function wlApplyFilters(groups) {
        if (!Array.isArray(groups) || !groups.length) return;
        const blocks = wlGroupBlocks();
        for (const g of groups) {
            // Localizar el grupo por título (mismo idioma) o por índice (respaldo).
            let block = g.t ? blocks.find((b) => wlGroupTitle(b) === g.t) : null;
            if (!block && g.i != null) block = blocks[g.i];
            if (!block) continue;

            const toggle = block.querySelector(WL_GROUP_TOGGLE);
            if (toggle && toggle.getAttribute('aria-expanded') === 'false') { toggle.click(); await wlDelay(150); }

            const boxes = Array.from(block.querySelectorAll(WL_CHECKBOX));
            const boxLabels = boxes.map(wlCheckboxLabel);
            // ¿Están presentes las etiquetas guardadas? (idioma coincidente).
            const byLabel = (g.items || []).some((it) => it.t && boxLabels.includes(it.t));
            const wantLabels = new Set((g.items || []).map((it) => it.t));
            const wantIdx = new Set((g.items || []).map((it) => it.i));
            boxes.forEach((cb, ci) => {
                const want = byLabel ? wantLabels.has(boxLabels[ci]) : wantIdx.has(ci);
                const checked = cb.getAttribute('aria-checked') === 'true';
                if (want !== checked) cb.click();
            });
            await wlDelay(120);
        }
    }

    async function wlApplyState(state) {
        if (!state || typeof state !== 'object') return;
        await wlApplyFilters(state.filters);
        await wlApplySort(state.sort);
    }

    // --- URL compartible ---------------------------------------------------------
    function wlEncode(state) {
        try {
            const json = JSON.stringify({ sort: state.sort || null, filters: state.filters || [], od: !!state.od });
            return btoa(unescape(encodeURIComponent(json)))
                .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        } catch (e) { return ''; }
    }
    function wlDecode(param) {
        try {
            let b64 = String(param).replace(/-/g, '+').replace(/_/g, '/');
            while (b64.length % 4) b64 += '=';
            const json = decodeURIComponent(escape(atob(b64)));
            const obj = JSON.parse(json);
            if (obj && typeof obj === 'object') {
                return {
                    sort: (obj.sort && typeof obj.sort === 'object') ? obj.sort : null,
                    filters: Array.isArray(obj.filters) ? obj.filters : [],
                    od: typeof obj.od === 'boolean' ? obj.od : undefined,
                };
            }
        } catch (e) { /* param inválido: se ignora */ }
        return null;
    }
    // Estado codificado en la URL actual (si lo hay).
    function wlDecodeParam() {
        try {
            const v = new URLSearchParams(location.search).get(WL_URL_PARAM);
            return v ? wlDecode(v) : null;
        } catch (e) { return null; }
    }
    // URL que reproduce el estado dado al abrirla (con el script instalado).
    function wlBuildUrl(state) {
        const enc = wlEncode(state);
        return location.origin + location.pathname + (enc ? ('?' + WL_URL_PARAM + '=' + enc) : '');
    }

    // --- Filtro propio "solo con descuento" (Epic no lo trae de fábrica) ---------
    // Cada juego es un <li> que contiene [data-testid="offer-card-layout-wrapper"].
    // El descuento se detecta por el texto del precio (chip "-NN%"), robusto ante
    // las clases hasheadas de Epic y el idioma. Se oculta con display:none.
    function wlItems() {
        return Array.from(document.querySelectorAll('[data-testid="offer-card-layout-wrapper"]'))
            .map((c) => c.closest('li')).filter(Boolean);
    }
    // Detección de descuento robusta (Epic no siempre pinta un chip "-NN%" y usa
    // el signo menos Unicode "−" (U+2212), no el guion ASCII). Se considera en
    // descuento si:
    //   a) hay un badge de porcentaje con guion ASCII o menos Unicode ("-75%"/"−75%"), o
    //   b) hay un precio ORIGINAL tachado (line-through) — señal inequívoca de oferta.
    function wlItemDiscounted(li) {
        if (/[-−]\s*\d+\s*%/.test(li.textContent || '')) return true;
        // Precio original tachado: <s>/<del> o cualquier nodo con line-through.
        if (li.querySelector('s, del')) return true;
        const price = li.querySelector('[data-testid="price-desktop"]') || li;
        return Array.from(price.querySelectorAll('span, div')).some((el) => {
            try {
                return getComputedStyle(el).textDecorationLine.includes('line-through') &&
                    /\d/.test(el.textContent || '');
            } catch (e) { return false; }
        });
    }
    function wlApplyDiscountFilter() {
        const on = !!getWishlistSettings().onlyDiscount;
        wlItems().forEach((li) => {
            li.style.display = (on && !wlItemDiscounted(li)) ? 'none' : '';
        });
    }

    // Fuerza la carga de TODOS los ítems del wishlist. Epic los pagina por scroll
    // (infinite scroll): si no se baja, los que faltan nunca entran al DOM y el
    // filtro "solo con descuento" no puede ocultarlos. Muestra todo primero (por si
    // el filtro ya ocultaba ítems), baja hasta que el conteo se estabiliza y luego
    // regresa al inicio. El caller aplica el filtro al terminar.
    // Sube por la cadena de ancestros del elemento buscando el que realmente
    // scrollea (overflow auto/scroll con contenido desbordado). Epic monta el
    // wishlist dentro de un contenedor propio, no en la ventana: hacer scroll a
    // window.scrollHeight no dispara la paginación. Devuelve null si scrollea la
    // ventana (document scrolling element).
    function wlScrollContainer(el) {
        let node = el ? el.parentElement : null;
        while (node && node !== document.body && node !== document.documentElement) {
            const st = getComputedStyle(node);
            const oy = st.overflowY;
            if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') &&
                node.scrollHeight > node.clientHeight + 4) {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    }

    let wlLoadingAll = false;
    async function wlLoadAllItems() {
        if (wlLoadingAll) return;
        wlLoadingAll = true;
        const prevReapply = wlReapplyInProgress;
        wlReapplyInProgress = true; // silencia captura/observer durante el barrido
        try {
            wlItems().forEach((li) => { li.style.display = ''; }); // todo visible para paginar
            const doc = document.scrollingElement || document.documentElement;
            const MAX_ROUNDS = 400; // tope de seguridad (~400 * 500ms ≈ 3.3 min)
            const SETTLE = 5;       // rondas EN EL FONDO sin crecer => terminado
            let stable = 0;
            let last = wlItems().length;
            for (let i = 0; i < MAX_ROUNDS && stable < SETTLE; i++) {
                // Contenedor real que scrollea (div interno o la ventana).
                const cont = wlScrollContainer(wlItems()[wlItems().length - 1]);
                // Scroll SUAVE, un tramo hacia abajo (no salto al fondo): así el
                // disparador de carga (IntersectionObserver / scroll) se activa.
                const step = Math.max(300, Math.floor(window.innerHeight * 0.85));
                if (cont) cont.scrollBy({ top: step, behavior: 'smooth' });
                else window.scrollBy({ top: step, behavior: 'smooth' });
                await wlDelay(500);
                const n = wlItems().length;
                if (n > last) { last = n; stable = 0; continue; }
                // Solo contamos "sin novedad" cuando YA estamos al fondo; si no,
                // seguimos bajando (aún queda lista por recorrer).
                const atBottom = cont
                    ? (cont.scrollTop + cont.clientHeight >= cont.scrollHeight - 8)
                    : (window.innerHeight + window.scrollY >= doc.scrollHeight - 8);
                if (atBottom) stable++;
            }
            // Regresar al inicio, también suave.
            const top = wlScrollContainer(wlItems()[0]);
            if (top) top.scrollTo({ top: 0, behavior: 'smooth' });
            else window.scrollTo({ top: 0, behavior: 'smooth' });
            await wlDelay(300);
        } finally {
            wlReapplyInProgress = prevReapply;
            wlLoadingAll = false;
        }
    }

    // --- Modal "Saber más" (autocontenido, sin dependencias) --------------------
    // Tres bandas: cabecera fija (título + ficha), cuerpo scrollable y botón fijo,
    // como el modal de información de los scripts de Twitch y Kick. Antes scrolleaba
    // la caja ENTERA, y con un cuerpo de una docena larga de párrafos eso se llevaba
    // el título fuera de vista y dejaba el botón de cerrar al final del scroll: se
    // abría un panel sin encabezado del que no era evidente cómo salir.
    const ABOUT_ID = 'egs2egd-about-overlay';
    const ABOUT_NAME = 'Epic Games Store to EGData Button';
    const ABOUT_REPO = 'g31w0fw0rld/epic-games-store-to-egdata';
    // Paleta del modal: el gris casi negro de la tienda y el azul de EGData.
    const ABOUT_BG = '#101014';
    const ABOUT_FG = '#f5f5f5';
    const ABOUT_ACCENT = '#26bbff';
    const ABOUT_BTN_FG = '#001018';
    const ABOUT_LINE = '#2a2a32';
    const ABOUT_MUTED = '#a0a0ad';
    const ABOUT_ITEM = '#d5d5dd';

    // El separador de las etiquetas ("Nombre:" / "Nom :" / "名称：") se toma de una
    // ya traducida, para que "GitHub" y "Ko-fi" —que no se traducen— no contradigan
    // la puntuación del idioma activo.
    function aboutColon() {
        const m = String(t.aboutVersion || ':').match(/\s*[:：]\s*$/);
        return m ? m[0] : ':';
    }

    // Marca inerte el resto de la página mientras el modal está abierto, y guarda lo
    // que hubiera para devolverlo tal cual al cerrar. Sin esto el tabulador se pasea
    // por la tienda que hay detrás del overlay, que no se ve pero sigue ahí.
    function aboutSetInert(overlay, on) {
        if (on) {
            const saved = [];
            Array.from(document.body.children).forEach((el) => {
                if (el === overlay) return;
                saved.push({ el, ariaHidden: el.getAttribute('aria-hidden') });
                try { el.setAttribute('aria-hidden', 'true'); el.inert = true; } catch (e) { /* noop */ }
            });
            overlay._savedInert = saved;
        } else {
            (overlay._savedInert || []).forEach((s) => {
                try {
                    if (s.ariaHidden === null) s.el.removeAttribute('aria-hidden');
                    else s.el.setAttribute('aria-hidden', s.ariaHidden);
                    s.el.inert = false;
                } catch (e) { /* noop */ }
            });
            overlay._savedInert = null;
        }
    }

    // Una fila del cuerpo. Los marcadores del texto ('•' grupo, '–' subpunto) son
    // ESTRUCTURA, no texto: se consumen y se traducen a jerarquía visual. La sangría
    // es francesa (padding + text-indent negativo) para que al partirse la línea la
    // segunda no vuelva al margen y el marcador siga marcando columna; va en
    // propiedades lógicas porque en árabe la columna está a la derecha.
    function aboutRow(raw, prevKind) {
        const text = String(raw).replace(/^\s+/, '');
        const row = document.createElement('div');
        let kind = 'plain';
        if (text.startsWith('•')) {
            kind = 'group';
            row.textContent = text.slice(1).trim();
            Object.assign(row.style, {
                color: ABOUT_ACCENT, fontWeight: '600', marginBottom: '8px',
                marginTop: prevKind ? '18px' : '0'
            });
        } else if (text.startsWith('–')) {
            kind = 'item';
            row.textContent = text;
            Object.assign(row.style, {
                paddingInlineStart: '30px', textIndent: '-16px', marginBottom: '7px', color: ABOUT_ITEM
            });
        } else {
            row.textContent = text;
            row.style.marginBottom = '10px';
            // Un párrafo suelto detrás de una lista es la coda del bloque, no otro
            // punto de la lista: sin este respiro se lee pegado al último subpunto.
            if (prevKind && prevKind !== 'plain') row.style.marginTop = '16px';
        }
        return { row, kind };
    }

    function wlShowAboutModal() {
        if (document.getElementById(ABOUT_ID)) return;
        const overlay = document.createElement('div');
        overlay.id = ABOUT_ID;
        overlay.dir = dir(); // en árabe el panel se alinea a la derecha
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            // El padding reserva el hueco contra el que se acota la caja (maxHeight
            // al 100%), y de paso evita que quede pegada a los bordes de la ventana.
            padding: '24px', boxSizing: 'border-box',
            background: 'rgba(0,0,0,0.6)', zIndex: '2147483647',
            transition: 'opacity 180ms ease', opacity: '0',
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            background: ABOUT_BG, color: ABOUT_FG, borderRadius: '14px',
            padding: '26px 30px', minWidth: 'min(340px, 100%)', maxWidth: '560px',
            maxHeight: '100%', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: `1px solid ${ABOUT_LINE}`,
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.55',
            // Flex en columna con overflow oculto: scrollea solo la banda del medio.
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
            transform: 'translateY(8px) scale(0.98)', opacity: '0',
            transition: 'transform 180ms ease, opacity 180ms ease',
        });

        const hairline = () => {
            const hr = document.createElement('div');
            Object.assign(hr.style, {
                height: '1px', background: ABOUT_LINE, margin: '14px 0', flexShrink: '0'
            });
            return hr;
        };

        // --- Cabecera fija: título y ficha ---
        const head = document.createElement('div');
        head.style.flexShrink = '0';

        const title = document.createElement('div');
        title.textContent = t.aboutTitle;
        title.style.cssText = `font-weight:bold;font-size:17px;margin-bottom:12px;color:${ABOUT_ACCENT};`;
        head.appendChild(title);

        // Ficha en rejilla de dos columnas: así los cinco valores quedan alineados
        // en vez de escalonados según lo que mida cada etiqueta.
        const meta = document.createElement('div');
        Object.assign(meta.style, {
            display: 'grid', gridTemplateColumns: 'auto minmax(0, 1fr)',
            columnGap: '10px', rowGap: '5px', fontSize: '13px'
        });
        const colon = aboutColon();
        [
            { label: t.aboutName, value: ABOUT_NAME },
            { label: t.aboutVersion, value: SCRIPT_VERSION },
            { label: t.aboutAuthor, value: 'g31w0fw0rld' },
            { label: 'GitHub' + colon, value: 'github.com/' + ABOUT_REPO, isLink: true },
            { label: '☕ Ko-fi' + colon, value: 'ko-fi.com/g31w0fw0rld', isLink: true }
        ].forEach((r) => {
            const label = document.createElement('div');
            label.textContent = r.label;
            Object.assign(label.style, { fontWeight: '600', color: ABOUT_MUTED, whiteSpace: 'nowrap' });
            meta.appendChild(label);
            const val = document.createElement('div');
            // Sin esto la URL no parte y estira la caja más allá de su maxWidth.
            Object.assign(val.style, { minWidth: '0', overflowWrap: 'anywhere' });
            if (r.isLink) {
                const a = document.createElement('a');
                a.href = 'https://' + r.value;
                a.textContent = r.value;
                a.target = '_blank'; a.rel = 'noopener noreferrer';
                a.style.color = ABOUT_ACCENT;
                a.style.textDecoration = 'underline';
                val.appendChild(a);
            } else {
                val.textContent = r.value;
            }
            meta.appendChild(val);
        });
        head.appendChild(meta);
        head.appendChild(hairline());
        box.appendChild(head);

        // --- Cuerpo scrollable ---
        const body = document.createElement('div');
        Object.assign(body.style, {
            overflowY: 'auto', minHeight: '0', paddingInlineEnd: '4px'
        });
        // `prevKind` arranca en null a propósito: marca "no hay nada encima", que es
        // lo que distingue al primer párrafo (pegado a la línea divisoria de la
        // cabecera, sin margen extra) de los demás.
        let prevKind = null;
        (t.aboutBody || []).forEach((p) => {
            const { row, kind } = aboutRow(p, prevKind);
            body.appendChild(row);
            prevKind = kind;
        });
        box.appendChild(body);
        box.appendChild(hairline());

        // --- Botón fijo ---
        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = t.close;
        closeBtn.style.cssText = `flex-shrink:0;align-self:center;padding:8px 18px;background:${ABOUT_ACCENT};color:${ABOUT_BTN_FG};border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px;`;
        closeBtn.addEventListener('mouseenter', () => { closeBtn.style.opacity = '0.85'; });
        closeBtn.addEventListener('mouseleave', () => { closeBtn.style.opacity = '1'; });
        box.appendChild(closeBtn);

        // El listener de Escape vive en document —el modal no tiene por qué tener el
        // foco dentro cuando llega la tecla—, así que hay que quitarlo SIEMPRE al
        // cerrar, también desde el botón: si no, se acumula uno por cada apertura.
        const closeIt = () => {
            document.removeEventListener('keydown', onKey);
            overlay.removeEventListener('click', onClick);
            overlay.style.opacity = '0';
            box.style.opacity = '0';
            box.style.transform = 'translateY(8px) scale(0.98)';
            setTimeout(() => {
                aboutSetInert(overlay, false);
                overlay.remove();
            }, 180);
        };
        const onKey = (e) => { if (e.key === 'Escape') closeIt(); };
        // Solo el fondo: un clic dentro de la caja no debe cerrar.
        const onClick = (e) => { if (e.target === overlay) closeIt(); };
        closeBtn.addEventListener('click', closeIt);
        overlay.addEventListener('click', onClick);
        document.addEventListener('keydown', onKey);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        aboutSetInert(overlay, true);
        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0) scale(1)';
            box.style.opacity = '1';
        }, 10);
        // Sin esto el foco se queda en el ℹ️ de la barra, que aboutSetInert acaba de
        // marcar inert, y se cae a <body>.
        setTimeout(() => { try { closeBtn.focus(); } catch (e) { /* noop */ } }, 120);
    }

    // --- UI (barra junto al "Ordenar por:") -------------------------------------
    function wlInjectToolbar(sortLayout) {
        if (!sortLayout || document.getElementById(WL_TOOLBAR_ID)) return;
        const settings = getWishlistSettings();

        const bar = document.createElement('div');
        bar.id = WL_TOOLBAR_ID;
        bar.dir = dir(); // en árabe la barra se ordena de derecha a izquierda
        bar.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0;font-size:13px;color:inherit;';

        // Los cuatro controles llevan el tooltip de la tienda, el mismo que los botones
        // de ficha: aquí el aviso no es opcional —explican comportamiento invisible,
        // que es lo que justifica el tooltip— y con el `title` del navegador quedaban
        // peor vistos que el resto del script. El `title` se pone siempre igual:
        // attachEpicTooltip() lo retira solo si consigue montar el de Epic.

        // Toggle "Recordar orden y filtros"
        const remLabel = document.createElement('label');
        remLabel.style.cssText = 'display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
        remLabel.title = t.rememberTip;
        attachEpicTooltip(remLabel, t.rememberTip);
        const remChk = document.createElement('input');
        remChk.type = 'checkbox';
        remChk.checked = !!settings.remember;
        remChk.style.cursor = 'pointer';
        const remText = document.createElement('span');
        remText.textContent = t.remember;
        remLabel.appendChild(remChk);
        remLabel.appendChild(remText);
        remChk.addEventListener('change', () => {
            const s = getWishlistSettings();
            s.remember = remChk.checked;
            if (remChk.checked) { const st = wlCaptureState(); s.sort = st.sort; s.filters = st.filters; }
            saveWishlistSettings(s);
        });

        // Checkbox "Solo con descuento" (filtro propio, client-side)
        const discLabel = document.createElement('label');
        discLabel.style.cssText = 'display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
        discLabel.title = t.onlyDiscountTip;
        attachEpicTooltip(discLabel, t.onlyDiscountTip);
        const discChk = document.createElement('input');
        discChk.type = 'checkbox';
        discChk.checked = !!settings.onlyDiscount;
        discChk.style.cursor = 'pointer';
        const discText = document.createElement('span');
        discText.textContent = t.onlyDiscount;
        discLabel.appendChild(discChk);
        discLabel.appendChild(discText);
        discChk.addEventListener('change', async () => {
            const s = getWishlistSettings();
            s.onlyDiscount = discChk.checked;
            saveWishlistSettings(s);
            if (discChk.checked) {
                // Cargar TODO antes de ocultar, si no el filtro solo veria los
                // ya cargados. Se deshabilita el check para evitar doble disparo.
                discChk.disabled = true;
                try { await wlLoadAllItems(); } finally { discChk.disabled = false; }
            }
            wlApplyDiscountFilter();
        });

        // Botón "Copiar enlace con filtros"
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = t.copyLink;
        copyBtn.title = t.copyLinkTip;
        attachEpicTooltip(copyBtn, t.copyLinkTip);
        copyBtn.style.cssText = 'background:#000;color:#fff;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:13px;';
        copyBtn.addEventListener('click', async () => {
            const url = wlBuildUrl(wlCaptureState());
            const done = (ok) => { copyBtn.textContent = ok ? t.copied : url; setTimeout(() => { copyBtn.textContent = t.copyLink; }, 2000); };
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); done(true); }
                else { window.prompt(t.copyPrompt, url); }
            } catch (e) { window.prompt(t.copyPrompt, url); }
        });

        // Botón "Saber más" (abre el modal con la explicación completa)
        const aboutBtn = document.createElement('button');
        aboutBtn.type = 'button';
        aboutBtn.textContent = t.about;
        aboutBtn.title = t.aboutTip;
        attachEpicTooltip(aboutBtn, t.aboutTip);
        aboutBtn.style.cssText = 'background:transparent;color:inherit;border:1px solid currentColor;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:13px;opacity:0.85;';
        aboutBtn.addEventListener('click', wlShowAboutModal);

        bar.appendChild(remLabel);
        bar.appendChild(discLabel);
        bar.appendChild(copyBtn);
        bar.appendChild(aboutBtn);
        sortLayout.parentNode.insertBefore(bar, sortLayout);
    }

    // --- Captura de cambios del usuario -----------------------------------------
    function stopWishlistObserver() {
        if (wlObserver) { wlObserver.disconnect(); wlObserver = null; }
        if (wlCaptureDebounce) { clearTimeout(wlCaptureDebounce); wlCaptureDebounce = null; }
    }
    function startWishlistObserver() {
        if (wlObserver) return;
        const scope = document.querySelector('[data-testid="section-wrapper"]') || document.body;
        wlObserver = new MutationObserver(() => {
            if (wlCaptureDebounce) return;
            wlCaptureDebounce = setTimeout(() => {
                wlCaptureDebounce = null;
                if (!wlReady || wlReapplyInProgress || !isWishlist()) return;
                wlApplyDiscountFilter();  // reaplica a los ítems que Epic carga al hacer scroll
                const s = getWishlistSettings();
                if (!s.remember) return;
                // El orden lo captura la delegación (bindSortCapture); aquí solo los
                // filtros, para no pisar el índice de orden con una lectura sin él.
                const f = wlCaptureFilters();
                if (JSON.stringify(f) === JSON.stringify(s.filters)) return;
                s.filters = f;
                saveWishlistSettings(s);
            }, 400);
        });
        wlObserver.observe(scope, {
            subtree: true, childList: true, characterData: true,
            attributes: true, attributeFilter: ['aria-checked'],
        });
    }

    // --- Entrada -----------------------------------------------------------------
    async function initWishlist() {
        stopWishlistObserver();
        wlReady = false;
        wlReapplyInProgress = false;

        const sortLayout = await waitForElement(WL_SORT_LAYOUT, 15000);
        await waitForElement(WL_SIDEBAR, 8000);
        if (!sortLayout && !document.querySelector(WL_SIDEBAR)) return;

        // La URL manda: si trae ?egs-wl=..., se lee ANTES de construir la barra para
        // que el checkbox de "solo con descuento" ya refleje ese estado.
        const fromUrl = wlDecodeParam();
        if (fromUrl && typeof fromUrl.od === 'boolean') {
            const s0 = getWishlistSettings();
            s0.onlyDiscount = fromUrl.od;
            saveWishlistSettings(s0);
        }

        wlInjectToolbar(sortLayout);
        bindSortCapture();

        const settings = getWishlistSettings();
        const toApply = fromUrl || (settings.remember ? { sort: settings.sort, filters: settings.filters } : null);
        const hasSort = toApply && toApply.sort && (toApply.sort.t || toApply.sort.i != null);
        const hasFilters = toApply && Array.isArray(toApply.filters) && toApply.filters.length;

        if (hasSort || hasFilters) {
            wlReapplyInProgress = true;
            try { await wlApplyState(toApply); }
            catch (e) { console.error('(egs2egd): wlApplyState error:', e); }
            wlReapplyInProgress = false;

            // Un estado llegado por URL, si "Recordar" está activo, pasa a ser el
            // guardado (para que persista tras la siguiente recarga sin la query).
            if (fromUrl && settings.remember) {
                settings.sort = wlLastSort || fromUrl.sort || settings.sort;
                settings.filters = wlCaptureFilters();
                saveWishlistSettings(settings);
            }
        }

        // Si el filtro ya viene activo, cargar TODO antes de ocultar para que
        // aplique sobre la lista completa (Epic la pagina por scroll).
        if (getWishlistSettings().onlyDiscount) await wlLoadAllItems();
        wlApplyDiscountFilter();  // aplica el filtro "solo con descuento" al arranque
        wlReady = true;
        startWishlistObserver();
        console.log('(egs2egd): wishlist — persistencia de orden/filtros activa');
    }

    // =============================================
    // DETECCIÓN DE NAVEGACIÓN SPA
    // =============================================

    /**
     * Intercepta los cambios de URL en la SPA de Epic Games Store
     * sobrescribiendo history.pushState y history.replaceState,
     * y escuchando el evento popstate (navegación atrás/adelante).
     * @param {Function} callback - Función a ejecutar cuando cambia la URL.
     */
    function onUrlChange(callback) {
        const pushState = history.pushState;
        const replaceState = history.replaceState;

        history.pushState = function () {
            pushState.apply(this, arguments);
            callback();
        };
        history.replaceState = function () {
            replaceState.apply(this, arguments);
            callback();
        };

        window.addEventListener('popstate', callback);
    }

    // =============================================
    // INICIALIZACIÓN
    // =============================================

    // Limpiar intervalos/observers al salir de la página para evitar memory leaks
    window.addEventListener('beforeunload', () => {
        if (waitIntervalId) {
            clearInterval(waitIntervalId);
            waitIntervalId = null;
        }
        stopButtonObserver();
        stopWishlistObserver();
    });

    // Manejar navegación SPA:
    //  - a producto/bundle: recarga completa (el script no estaba activo en el
    //    home/búsqueda/browse, y así React Query queda fresco para pintar el botón);
    //  - a /wishlist: activa la persistencia de orden/filtros;
    //  - a cualquier otra: solo limpia.
    onUrlChange(() => {
        try {
            const newPath = location.pathname;
            if (newPath === actualPath) return;
            actualPath = newPath;

            if (waitIntervalId) {
                clearInterval(waitIntervalId);
                waitIntervalId = null;
            }
            stopButtonObserver();
            stopWishlistObserver();

            // Si la nueva ruta es producto o bundle, forzar recarga completa
            const isProductOrBundle =
                PRODUCT_PATH_REGEX.test(newPath) || BUNDLE_PATH_REGEX.test(newPath);
            if (isProductOrBundle) {
                window.location.reload();
                return;
            }

            // Reintentar tras un breve retraso (deja render la SPA)
            setTimeout(() => {
                if (isWishlist()) initWishlist();
                else startWaitForData();
            }, POLL_DELAY_AFTER_NAV_MS);
        } catch (e) {
            console.error('(egs2egd): Error en el handler de cambio de URL:', e);
        }
    });

    // Inicio: registrar la ruta actual y arrancar según el tipo de página.
    actualPath = location.pathname;
    if (isWishlist()) initWishlist();
    else startWaitForData();
})();
