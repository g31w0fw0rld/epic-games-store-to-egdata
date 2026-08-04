// ==UserScript==
// @name         Epic Games Store to EGData Button
// @namespace    https://www.epicgames.com/store/
// @version      1.6.0
// @description  Adds EGData, GG.deals and PCGamingWiki buttons below every purchase button on Epic Games Store product and bundle pages — bundles have two, and both get the trio. EGData links to that exact offer; the other two search by title, GG.deals among Epic-DRM deals with no store-rating floor, and each says so in its tooltip. On your wishlist it adds an 'only discounted' filter that first loads the whole list, remembered sort and filters, and a shareable link that reproduces them.
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
    // IDIOMA (auto-detect: si la página/navegador está en español -> es, si no -> en)
    // =============================================
    // Prioriza el lang del documento (idioma con que Epic sirve la página) y cae
    // al del navegador. Solo distingue español vs. resto (inglés por defecto).
    // Nota: EGData es marca y NO se traduce (queda como literal en el botón).
    function detectLang() {
        const docLang = (document.documentElement.getAttribute('lang') || '').toLowerCase();
        const navLang = (navigator.language || navigator.languages?.[0] || '').toLowerCase();
        return (docLang || navLang).startsWith('es') ? 'es' : 'en';
    }
    const LANG = detectLang();
    const I18N = {
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
            pcgwTip: 'Busca el título en PCGamingWiki (compatibilidad y arreglos). Al buscar por nombre, puede no dar con el artículo exacto.',
            aboutTip: 'Ver qué hace este script en su totalidad.',
            aboutTitle: '¿Qué hace este script?',
            aboutBody: [
                'Este script conecta Epic Games Store con EGData y mejora tu lista de deseos.',
                '• En páginas de producto (/p/) y de bundle (/bundles/): añade tres botones bajo el botón de compra.',
                '– EGData (base de datos de precios e historial de ofertas) enlaza a esa oferta concreta, no a una búsqueda.',
                '– GG.deals busca el título entre las ofertas con DRM de Epic, sin el mínimo de valoración de tienda que trae por defecto, y PCGamingWiki lo busca para ver compatibilidad y arreglos. Los dos buscan por nombre, así que pueden no acertar; cada uno lo dice en su tooltip.',
                '– Un juego de botones por cada botón de compra: los bundles tienen dos (la barra de arriba y la sección "Buy …") y ambos reciben el suyo.',
                '– Al navegar dentro de la tienda hacia un producto o un bundle, la página se recarga. Epic es una SPA y el script no estaba activo en el home, la búsqueda ni el browse; esa recarga es lo que garantiza que el botón aparezca.',
                '• En tu lista de deseos (/wishlist) añade una barra con tres herramientas:',
                '– Solo con descuento: baja automáticamente por toda la lista (Epic la carga por lotes al hacer scroll) para detectar TODOS los juegos y mostrar únicamente los que están en oferta, respetando el orden que elegiste en Epic. El descuento se detecta por el badge de porcentaje o por el precio original tachado. Se recuerda por su cuenta, esté o no activo "Recordar orden y filtros".',
                '– Recordar orden y filtros: guarda el orden y los filtros de la barra lateral que elijas en Epic y los reaplica al volver.',
                '– Copiar enlace con filtros: genera una URL que, al abrirla, reproduce tu orden, tus filtros y el estado de "solo con descuento". Si el navegador bloquea el portapapeles, la muestra en un diálogo para copiarla a mano.',
                'Todo se procesa en tu navegador (se guarda en localStorage); no se envían datos a ningún servidor.',
            ],
        },
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
            pcgwTip: 'Searches the title on PCGamingWiki (compatibility and fixes). Being a title search, it may not hit the exact article.',
            aboutTip: 'See everything this script does.',
            aboutTitle: 'What does this script do?',
            aboutBody: [
                'This script links Epic Games Store with EGData and enhances your wishlist.',
                '• On product (/p/) and bundle (/bundles/) pages: adds three buttons below the purchase button.',
                '– EGData (a price and deal-history database) links to that exact offer, not to a search.',
                '– GG.deals searches the title among Epic-DRM deals, with none of the default store-rating floor, and PCGamingWiki searches it for compatibility and fixes. Both are title searches, so they can miss; each says so in its tooltip.',
                '– One set of buttons per purchase button: bundles have two (the bar at the top and the "Buy …" section) and both get theirs.',
                '– Navigating inside the store to a product or a bundle reloads the page. Epic is a single-page app and the script was not active on the home, search or browse view; that reload is what guarantees the button appears.',
                '• On your wishlist (/wishlist) it adds a toolbar with three tools:',
                '– Only discounted: automatically scrolls through the whole list (Epic loads it in batches on scroll) to detect ALL games and show only those on sale, keeping the sort order you chose in Epic. Discounts are detected by the percentage badge or the struck-through original price. It is remembered on its own, whether or not "Remember sort and filters" is on.',
                '– Remember sort and filters: saves the sort order and the sidebar filters you pick in Epic and reapplies them when you come back.',
                '– Copy link with filters: builds a URL that reproduces your sort, your filters and the "only discounted" state when opened. If the browser blocks clipboard access, it shows the URL in a dialog so you can copy it by hand.',
                'Everything runs in your browser (stored in localStorage); no data is sent to any server.',
            ],
        },
    };
    const t = I18N[LANG];

    // =============================================
    // CONSTANTES
    // =============================================
    const EGDATA_BASE_URL = 'https://egdata.app/offers/';
    const EGDATA_ICON_URL = 'https://cdn.egdata.app/logo_simple_white_clean.png';
    const PURCHASE_BUTTON_SELECTOR = '[data-testid="purchase-cta-button"]';
    const DATA_ATTR = 'data-egs2egd';
    const LINK_ATTR = 'data-egs2egd-link';
    const STYLES_ID = 'egs2egd-styles';
    // Sincronizar con @version del encabezado en cada bump.
    const SCRIPT_VERSION = '1.6.0';

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
     * Extrae el título del juego desde el título de la página,
     * eliminando el sufijo de Epic Games Store.
     * @returns {string} El título limpio del juego.
     */
    function getGameTitle() {
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
            button[${DATA_ATTR}="true"] {
                display: inline-flex !important;
                align-items: center !important;
                gap: 8px !important;
                background: #000 !important;
                color: #fff !important;
                border: none !important;
                padding: 8px 12px !important;
                cursor: pointer !important;
                transition: background 200ms ease, transform 120ms ease;
            }
            button[${DATA_ATTR}="true"]:hover {
                background: #757575 !important;
                transform: translateY(-1px);
            }
            button[${DATA_ATTR}="true"] .egs2egd-icon {
                width: 24px;
                height: 24px;
                object-fit: contain;
                display: inline-block;
                vertical-align: middle;
                filter: none;
            }
            button[${DATA_ATTR}="true"] .egs2egd-text-outer,
            button[${DATA_ATTR}="true"] .egs2egd-text-inner {
                color: inherit !important;
            }
            button[${DATA_ATTR}="true"]:focus {
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
     * @returns {HTMLButtonElement} El botón creado.
     */
    function buildButton(slug, className) {
        const egDataLink = `${EGDATA_BASE_URL}${slug}`;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.gap = '8px';
        button.setAttribute(DATA_ATTR, 'true');
        button.setAttribute('data-egs2egd-slug', slug);
        button.onclick = () => window.open(egDataLink, '_blank');

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

    /**
     * Crea un enlace externo con el aspecto del botón de EGData, con el icono
     * dentro y a la izquierda de la etiqueta. Es un <a> real, así que funcionan el
     * clic central y "copiar dirección del enlace".
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
     * Fila con los enlaces a GG.deals y PCGamingWiki, que buscan por el título de
     * la página. Devuelve null si no hay título legible: mejor sin botones que con
     * dos enlaces a una búsqueda vacía.
     * @returns {HTMLDivElement|null} El contenedor con los dos enlaces, o null.
     */
    function buildExternalLinks() {
        const title = getSearchTitle();
        if (!title) return null;

        const box = document.createElement('div');
        box.className = 'egs2egd-links';

        const ggParams = new URLSearchParams({
            drm: GGDEALS_EPIC_DRM,
            minRating: GGDEALS_MIN_RATING,
            title: normalizeForGgDeals(title)
        });
        box.appendChild(buildLinkButton({
            label: 'GG.deals',
            url: `${GGDEALS_SEARCH_URL}?${ggParams}`,
            iconUrl: GGDEALS_ICON_URL,
            tooltip: t.ggTip
        }));
        box.appendChild(buildLinkButton({
            label: 'PCGamingWiki',
            url: `${PCGW_SEARCH_URL}?${new URLSearchParams({ search: title })}`,
            iconSvg: PCGW_ICON_SVG,
            tooltip: t.pcgwTip
        }));
        return box;
    }

    /**
     * Copia a la fila de enlaces la altura y el radio de esquina del botón hermano,
     * midiéndolos ya en el DOM. Silencioso si no se puede medir (se queda con los
     * valores por defecto del CSS).
     * @param {HTMLElement} links - Fila de enlaces externos.
     * @param {HTMLElement} sibling - Botón de EGData, del que se copian las medidas.
     */
    function matchSibling(links, sibling) {
        try {
            const h = sibling.offsetHeight;
            if (h > 0) links.style.setProperty('--egs2egd-h', `${h}px`);
            const r = getComputedStyle(sibling).borderRadius;
            if (r && r !== '0px') links.style.setProperty('--egs2egd-r', r);
        } catch (e) { /* sin medidas: mandan los valores por defecto del CSS */ }
    }

    /**
     * Inserta el botón EGData colgando del contenedor 3 niveles arriba del botón
     * de compra dado (misma colocación original que ya funcionaba en productos).
     * @param {HTMLButtonElement} purchaseButton - Botón de compra de referencia.
     * @param {string} slug - ID de la oferta en EGData.
     * @param {boolean} withMargin - Añade separación superior (para botones extra).
     * @returns {HTMLButtonElement|null} El botón insertado, el existente, o null.
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
        const links = buildExternalLinks();
        if (links) div.appendChild(links);

        host.appendChild(div);
        // Medir después de insertar: antes el botón no tiene alto ni estilo aplicado.
        if (links) matchSibling(links, button);
        return button;
    }

    /**
     * Crea e inserta el botón EGData junto a CADA botón de compra de la página.
     * Los bundles tienen dos (barra superior y sección "Comprar …"); los
     * productos normalmente uno. No duplica si ya existe.
     * @param {string} slug - ID de la oferta en EGData.
     * @param {string} urlType - Tipo de página ("product" o "bundle").
     * @param {string} gameTitle - Título del juego (para log).
     * @returns {HTMLButtonElement|null} El primer botón creado/encontrado, o null.
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
    function wlShowAboutModal() {
        if (document.getElementById('egs2egd-about-overlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'egs2egd-about-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', width: '100%', height: '100%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.6)', zIndex: '2147483647',
            transition: 'opacity 180ms ease', opacity: '0',
        });
        const box = document.createElement('div');
        Object.assign(box.style, {
            background: '#101014', color: '#f5f5f5', borderRadius: '14px',
            padding: '26px 30px', minWidth: '320px', maxWidth: '560px',
            maxHeight: '80vh', overflowY: 'auto', boxSizing: 'border-box',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)', border: '1px solid #2a2a32',
            fontFamily: 'Inter, system-ui, sans-serif', fontSize: '14px', lineHeight: '1.5',
            transform: 'translateY(8px) scale(0.98)', opacity: '0',
            transition: 'transform 180ms ease, opacity 180ms ease',
        });

        const title = document.createElement('div');
        title.textContent = t.aboutTitle;
        title.style.cssText = 'font-weight:bold;font-size:17px;margin-bottom:14px;';
        box.appendChild(title);

        (t.aboutBody || []).forEach((p) => {
            const row = document.createElement('div');
            const trimmed = String(p).replace(/^\s+/, '');
            row.textContent = trimmed;
            row.style.marginBottom = '8px';
            if (trimmed.startsWith('–')) row.style.paddingLeft = '22px';
            else if (trimmed.startsWith('•')) row.style.paddingLeft = '10px';
            box.appendChild(row);
        });

        const gh = document.createElement('a');
        gh.href = 'https://github.com/g31w0fw0rld/epic-games-store-to-egdata';
        gh.target = '_blank';
        gh.rel = 'noopener';
        gh.textContent = 'github.com/g31w0fw0rld/epic-games-store-to-egdata';
        gh.style.cssText = 'display:inline-block;margin-top:6px;color:#26bbff;text-decoration:underline;font-size:12px;';
        box.appendChild(gh);
        const kofi = document.createElement('a');
        kofi.href = 'https://ko-fi.com/g31w0fw0rld';
        kofi.target = '_blank'; kofi.rel = 'noopener';
        kofi.textContent = '☕ Apóyame en Ko-fi / Support me on Ko-fi';
        kofi.style.cssText = 'display:block;margin-top:8px;color:#26bbff;text-decoration:underline;font-size:12px;';
        box.appendChild(kofi);

        const foot = document.createElement('div');
        foot.textContent = 'v' + SCRIPT_VERSION + ' · g31w0fw0rld';
        foot.style.cssText = 'margin-top:2px;font-size:12px;opacity:0.7;';
        box.appendChild(foot);

        const closeBtn = document.createElement('button');
        closeBtn.type = 'button';
        closeBtn.textContent = t.close;
        closeBtn.style.cssText = 'display:block;margin-top:16px;padding:8px 14px;background:#26bbff;color:#001018;border:none;border-radius:6px;cursor:pointer;font-weight:bold;font-size:13px;';
        box.appendChild(closeBtn);

        const closeIt = () => {
            overlay.style.opacity = '0';
            box.style.opacity = '0';
            box.style.transform = 'translateY(8px) scale(0.98)';
            document.removeEventListener('keydown', onKey);
            setTimeout(() => overlay.remove(), 180);
        };
        const onKey = (e) => { if (e.key === 'Escape') closeIt(); };
        closeBtn.addEventListener('click', closeIt);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeIt(); });
        document.addEventListener('keydown', onKey);

        overlay.appendChild(box);
        document.body.appendChild(overlay);
        setTimeout(() => {
            overlay.style.opacity = '1';
            box.style.transform = 'translateY(0) scale(1)';
            box.style.opacity = '1';
        }, 10);
    }

    // --- UI (barra junto al "Ordenar por:") -------------------------------------
    function wlInjectToolbar(sortLayout) {
        if (!sortLayout || document.getElementById(WL_TOOLBAR_ID)) return;
        const settings = getWishlistSettings();

        const bar = document.createElement('div');
        bar.id = WL_TOOLBAR_ID;
        bar.style.cssText = 'display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:8px 0;font-size:13px;color:inherit;';

        // Toggle "Recordar orden y filtros"
        const remLabel = document.createElement('label');
        remLabel.style.cssText = 'display:inline-flex;align-items:center;gap:6px;cursor:pointer;';
        remLabel.title = t.rememberTip;
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
