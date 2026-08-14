# Epic Games Store to EGData Button

Tampermonkey userscript for the Epic Games Store: EGData, GG.deals and PCGamingWiki buttons on product and bundle pages, plus wishlist tools. / Userscript de Tampermonkey para Epic Games Store: botones a EGData, GG.deals y PCGamingWiki en las páginas de producto y bundle, y herramientas en la lista de deseos.

![The EGData button below the purchase button on an Epic product page, with GG.deals and PCGamingWiki sharing the row underneath](docs/screenshot-p.png)

*Product page (`/p/`): EGData sits under the purchase button and reuses Epic's own styling; GG.deals and PCGamingWiki split the row below it, at the same height and with the same corners. / Página de producto (`/p/`): EGData va bajo el botón de compra y reutiliza el estilo propio de Epic; GG.deals y PCGamingWiki se reparten la fila de abajo, a la misma altura y con las mismas esquinas.*

![The three buttons on the top purchase bar of a bundle page](docs/screenshot-bundles.png)

![The three buttons again, further down the same bundle page, next to the "Buy" section](docs/screenshot-bundles-buy.png)

*Bundles (`/bundles/`) have two purchase buttons — the bar at the top and the "Buy …" section further down — and each one gets its own set of three, so you never have to scroll back up. / Los bundles (`/bundles/`) tienen dos botones de compra —la barra de arriba y la sección "Buy …" más abajo— y cada uno recibe su propio juego de tres, así no hay que volver a subir.*

![The toolbar the script adds above the wishlist sort control](docs/screenshot-wishlist.png)

*Wishlist (`/wishlist`): the toolbar the script inserts above Epic's sort control, with the two toggles, the copy-link button and "Learn more". / Lista de deseos (`/wishlist`): la barra que el script inserta sobre el control de orden de Epic, con los dos interruptores, el botón de copiar enlace y "Saber más".*

## English

### What it does

**Buttons on product (`/p/`) and bundle (`/bundles/`) pages**
- **[EGData](https://egdata.app/)** — a price and deal-history database. It links to **that exact offer**, not to a search. Epic identifies each offer with an internal id; on bundles that id only travels in a request the page makes after loading, so the script reads the URL of the store's own requests to catch it.
- **[GG.deals](https://gg.deals/)** — where else that game is on sale, and for how much. It searches **by title among Epic-DRM deals only**, since that is the DRM of everything sold in this store, and it turns off the default store-rating floor so no offer is hidden from you.
- **[PCGamingWiki](https://www.pcgamingwiki.com/)** — compatibility, fixes, ultrawide and frame-rate notes. It searches by title.
- **The last two are title searches, so they can miss**, and each says exactly that in its tooltip. The EGData button carries no tooltip: it is built from the offer id and cannot miss.
- The title is read from the page and cleaned of Epic's wrapping and of trademark symbols. If it cannot be read at all, only EGData is added — better no button than a link to an empty search. Accents are dropped for GG.deals only, because it transliterates in its own index, and kept for PCGamingWiki, whose articles keep them.
- The three borrow Epic's own look, so they match the store instead of looking bolted on: EGData takes the full width and the other two split the row below it, at the height and corner radius measured from EGData itself. GG.deals and PCGamingWiki are real links, so middle-click and *copy link address* work.
- **One set per purchase button.** Bundles show two and both get theirs.
- Navigating inside the store to a product or bundle **reloads the page**. Epic is a single-page app and the script was not active on the home, search or browse view; the reload is what guarantees the buttons appear.

**Wishlist (`/wishlist`)**
- **Only discounted:** scrolls through your whole list — Epic loads it in batches as you scroll — to detect every game and hide the ones that are not on sale, keeping the sort order you picked in Epic. A discount is detected by the percentage badge or the struck-through original price. This toggle is remembered on its own, whether or not "Remember sort and filters" is on.
- **Remember sort and filters:** saves the sort order and the sidebar filters you pick in Epic and reapplies them every time you come back.
- **Copy link with filters:** builds a URL that reproduces your sort, your filters and the "only discounted" state when opened with the script installed — shareable and bookmarkable. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.
- **"Learn more"** button with the full explanation inside the page, and a tooltip on every control.

**Language:** **31 languages** — English, Spanish, German, French, Italian, Dutch, Portuguese, Brazilian Portuguese, Polish, Russian, Ukrainian, Czech, Danish, Finnish, Swedish, Norwegian, Hungarian, Romanian, Bulgarian, Turkish, Arabic, Hindi, Indonesian, Malay, Filipino, Thai, Vietnamese, Japanese, Korean, Simplified Chinese and Traditional Chinese. It follows the language Epic is actually showing: the `?lang=` in the URL first, since that is how Epic switches language; then the option ticked in Epic's own language menu; then `<html lang>`, which React writes on hydration; then your browser, falling back to English. It covers the wishlist toolbar and the two search tooltips; the button labels are brand names and stay as they are.

**Install:**
1. Install [Tampermonkey](https://www.tampermonkey.net/).
2. Open the installer: [epic-games-store-to-egdata.user.js](https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js) (also on [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) and [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Site:** `store.epicgames.com`

## Español

### Qué hace

**Botones en páginas de producto (`/p/`) y de bundle (`/bundles/`)**
- **[EGData](https://egdata.app/)** —base de datos de precios e historial de ofertas—. Enlaza a **esa oferta concreta**, no a una búsqueda. Epic identifica cada oferta con un id interno; en los bundles ese id solo viaja en una petición que la página hace después de cargar, así que el script lee la URL de las propias peticiones de la tienda para capturarlo.
- **[GG.deals](https://gg.deals/)** —en qué otras tiendas está de oferta ese juego, y a cuánto—. Busca **por título y solo entre ofertas con DRM de Epic**, que es el DRM de todo lo que se vende en esta tienda, y desactiva el mínimo de valoración de tienda que trae por defecto para que no te esconda ninguna oferta.
- **[PCGamingWiki](https://www.pcgamingwiki.com/)** —compatibilidad, arreglos, ultrapanorámico y notas de frame rate—. Busca por título.
- **Los dos últimos buscan por nombre, así que pueden no acertar**, y cada uno lo dice tal cual en su tooltip. El de EGData no lleva tooltip: se construye con el id de la oferta y no puede fallar.
- El título se lee de la página y se limpia de los adornos de Epic y de los símbolos de marca. Si no se puede leer, se añade solo EGData: mejor ningún botón que un enlace a una búsqueda vacía. Los acentos se quitan solo para GG.deals, porque translitera en su índice, y se conservan para PCGamingWiki, cuyos artículos sí los llevan.
- Los tres toman prestado el aspecto de Epic, así que combinan con la tienda en vez de parecer añadidos: EGData ocupa todo el ancho y los otros dos se reparten la fila de abajo, con la altura y el radio de esquina medidos del propio botón de EGData. GG.deals y PCGamingWiki son enlaces de verdad, así que funcionan el clic central y *copiar dirección del enlace*.
- **Un juego de botones por cada botón de compra.** Los bundles muestran dos y ambos reciben el suyo.
- Navegar dentro de la tienda hacia un producto o un bundle **recarga la página**. Epic es una SPA y el script no estaba activo en el home, la búsqueda ni el browse; esa recarga es lo que garantiza que los botones aparezcan.

**Lista de deseos (`/wishlist`)**
- **Solo con descuento:** baja por toda tu lista —Epic la carga por lotes al hacer scroll— para detectar todos los juegos y ocultar los que no están en oferta, respetando el orden que elijas en Epic. El descuento se detecta por el badge de porcentaje o por el precio original tachado. Este interruptor se recuerda por su cuenta, esté o no activo "Recordar orden y filtros".
- **Recordar orden y filtros:** guarda el orden y los filtros de la barra lateral que elijas en Epic y los reaplica cada vez que vuelvas.
- **Copiar enlace con filtros:** genera una URL que, al abrirla con el script instalado, reproduce tu orden, tus filtros y el estado de "solo con descuento" — se puede compartir y guardar en marcadores. Si el navegador bloquea el portapapeles, muestra la URL en un diálogo para copiarla a mano.
- Botón **"Saber más"** con la explicación completa dentro de la página, y un tooltip en cada control.

**Idioma:** **31 idiomas** —inglés, español, alemán, francés, italiano, neerlandés, portugués, portugués de Brasil, polaco, ruso, ucraniano, checo, danés, finés, sueco, noruego, húngaro, rumano, búlgaro, turco, árabe, hindi, indonesio, malayo, filipino, tailandés, vietnamita, japonés, coreano, chino simplificado y chino tradicional—. Sigue el idioma en que Epic está mostrando la página de verdad: primero el `?lang=` de la URL, que es el mecanismo con que Epic cambia de idioma; luego la opción marcada en el propio menú de idioma de Epic; luego el `<html lang>`, que React escribe al hidratar; luego el navegador, con inglés como respaldo. Cubre la barra de la lista de deseos y los dos tooltips de búsqueda; las etiquetas de los botones son marcas y se quedan como están.

**Instalación:**
1. Instala [Tampermonkey](https://www.tampermonkey.net/).
2. Abre el instalador: [epic-games-store-to-egdata.user.js](https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js) (también en [GreasyFork](https://greasyfork.org/es-419/users/1590477-g31w) y [OpenUserJS](https://openuserjs.org/users/g31w0fw0rldgmail.com/scripts)).

**Sitio:** `store.epicgames.com`

## Privacy / Privacidad

**EN:** the script sends nothing to third parties or to the author, and everything it computes runs in your browser. It declares `@grant none`, so it has no access to the userscript manager's privileged APIs. It stores in `localStorage` on `store.epicgames.com` (key `egs2egd-wishlist-settings`) only your wishlist sort order, filters and the "only discounted" state. Two requests do leave your browser, both for icons: the EGData logo from `cdn.egdata.app` and the GG.deals favicon from `gg.deals`, so those two sites see a plain image request when the buttons are drawn — nothing about which game you are looking at. The PCGamingWiki logo is inline SVG and requests nothing. To detect in-page navigation and to catch the offer id on bundles the script wraps the page's `fetch` and `XMLHttpRequest` and **only reads each request's URL**: it does not alter, store or forward the requests or their contents. The copy-link button writes to the clipboard only when you click it. You only visit EGData, GG.deals or PCGamingWiki if you click.

**ES:** el script no envía nada a terceros ni al autor, y todo lo que calcula se procesa en tu navegador. Declara `@grant none`, así que no tiene acceso a las APIs privilegiadas del gestor de userscripts. Guarda en `localStorage` de `store.epicgames.com` (clave `egs2egd-wishlist-settings`) solo el orden, los filtros y el estado de "solo con descuento" de tu lista de deseos. Sí salen dos peticiones de tu navegador, las dos de iconos: el logo de EGData desde `cdn.egdata.app` y el favicon de GG.deals desde `gg.deals`, así que esos dos sitios ven una petición de imagen corriente al dibujarse los botones —nada sobre qué juego estás viendo—. El logo de PCGamingWiki es SVG en línea y no pide nada. Para detectar la navegación interna y para capturar el id de oferta en los bundles el script envuelve el `fetch` y el `XMLHttpRequest` de la página y **solo lee la URL** de cada petición: no altera, guarda ni reenvía las peticiones ni su contenido. El botón de copiar enlace escribe en el portapapeles únicamente cuando haces clic. Solo visitas EGData, GG.deals o PCGamingWiki si haces clic.

## Support / Apoyar

This is part of something I'm building to grow. If it helps you and you'd like to support it, you can tip me on **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —only if you want—; and if a cause needs it more than I do, help that one instead.

Esto es parte de algo que estoy construyendo para crecer. Si te sirve y quieres apoyar, puedes invitarme un café en **[Ko-fi](https://ko-fi.com/g31w0fw0rld)** —solo si quieres—; y si hay una causa que lo necesite más que yo, ayúdala a ella.

---
Author / Autor: **g31w0fw0rld** · License / Licencia: **MIT**
