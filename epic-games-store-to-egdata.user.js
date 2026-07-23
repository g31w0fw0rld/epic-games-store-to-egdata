// ==UserScript==
// @name         Epic Games Store to EGData Button
// @namespace    https://www.epicgames.com/store/
// @version      1.4.0
// @description  Agrega un botón hacia EGData debajo del botón de compra en las páginas de productos y bundles de Epic Games Store. El script corre en toda la tienda para que al navegar (SPA) desde el home, la búsqueda o el browse hacia un producto/bundle recargue y pinte los botones.
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
        },
        en: {
            remember: 'Remember sort and filters',
            onlyDiscount: 'Only discounted',
            copyLink: '🔗 Copy link with filters',
            copied: '✔ Link copied',
            copyPrompt: 'Copy this link:',
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
    const STYLES_ID = 'egs2egd-styles';

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

        host.appendChild(div);
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
    function wlItemDiscounted(li) {
        const price = li.querySelector('[data-testid="price-desktop"]');
        return !!price && /-\s*\d+\s*%/.test(price.textContent || '');
    }
    function wlApplyDiscountFilter() {
        const on = !!getWishlistSettings().onlyDiscount;
        wlItems().forEach((li) => {
            li.style.display = (on && !wlItemDiscounted(li)) ? 'none' : '';
        });
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
        const discChk = document.createElement('input');
        discChk.type = 'checkbox';
        discChk.checked = !!settings.onlyDiscount;
        discChk.style.cursor = 'pointer';
        const discText = document.createElement('span');
        discText.textContent = t.onlyDiscount;
        discLabel.appendChild(discChk);
        discLabel.appendChild(discText);
        discChk.addEventListener('change', () => {
            const s = getWishlistSettings();
            s.onlyDiscount = discChk.checked;
            saveWishlistSettings(s);
            wlApplyDiscountFilter();
        });

        // Botón "Copiar enlace con filtros"
        const copyBtn = document.createElement('button');
        copyBtn.type = 'button';
        copyBtn.textContent = t.copyLink;
        copyBtn.style.cssText = 'background:#000;color:#fff;border:none;border-radius:4px;padding:6px 10px;cursor:pointer;font-size:13px;';
        copyBtn.addEventListener('click', async () => {
            const url = wlBuildUrl(wlCaptureState());
            const done = (ok) => { copyBtn.textContent = ok ? t.copied : url; setTimeout(() => { copyBtn.textContent = t.copyLink; }, 2000); };
            try {
                if (navigator.clipboard && navigator.clipboard.writeText) { await navigator.clipboard.writeText(url); done(true); }
                else { window.prompt(t.copyPrompt, url); }
            } catch (e) { window.prompt(t.copyPrompt, url); }
        });

        bar.appendChild(remLabel);
        bar.appendChild(discLabel);
        bar.appendChild(copyBtn);
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
