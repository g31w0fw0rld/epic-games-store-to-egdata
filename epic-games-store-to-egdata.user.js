// ==UserScript==
// @name         Epic Games Store to EGData Button
// @namespace    https://www.epicgames.com/store/
// @version      1.1.7.6
// @description  Agrega un botón hacia EGData debajo del botón de compra en las páginas de productos de Epic Games Store. Recarga la página cuando la ruta cambia a product o bundle.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://store.epicgames.com/*/p/*
// @match        https://store.epicgames.com/*/bundles/*
// @match        https://store.epicgames.com/p/*
// @match        https://store.epicgames.com/bundles/*
// @downloadURL  https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js
// @updateURL    https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js
// @grant        none
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

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
        // Contenedor padre adecuado (3 niveles arriba del botón de compra).
        const host = purchaseButton.parentElement?.parentElement?.parentElement;
        if (!host) return null;

        // Evitar duplicados: si ya hay un botón EGData bajo este contenedor, salir.
        const existing = host.querySelector(`[${DATA_ATTR}="true"]`);
        if (existing) return existing;

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
     * Inicia un intervalo de polling que espera a que React cargue los datos
     * del catálogo (__REACT_QUERY_INITIAL_QUERIES__), encuentre el slug
     * del producto y el botón de compra esté en el DOM.
     * Se detiene automáticamente tras MAX_POLL_ATTEMPTS intentos o al
     * crear el botón exitosamente.
     */
    function startWaitForData() {
        if (waitIntervalId) {
            clearInterval(waitIntervalId);
            waitIntervalId = null;
        }

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

            const btn = createEGDataButton(slug, urlType, gameTitle);
            if (btn) {
                clearInterval(waitIntervalId);
                waitIntervalId = null;
            }
        }, POLL_INTERVAL_MS);
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

    // Limpiar intervalo al salir de la página para evitar memory leaks
    window.addEventListener('beforeunload', () => {
        if (waitIntervalId) {
            clearInterval(waitIntervalId);
            waitIntervalId = null;
        }
    });

    // Manejar navegación SPA: si cambia la ruta a producto/bundle, recargar la página.
    // Si no, reiniciar la búsqueda del botón tras un breve retraso.
    onUrlChange(() => {
        try {
            const newPath = location.pathname;
            if (newPath !== actualPath) {
                actualPath = newPath;

                if (waitIntervalId) {
                    clearInterval(waitIntervalId);
                    waitIntervalId = null;
                }

                // Si la nueva ruta es producto o bundle, forzar recarga completa
                const isProductOrBundle =
                    PRODUCT_PATH_REGEX.test(newPath) || BUNDLE_PATH_REGEX.test(newPath);

                if (isProductOrBundle) {
                    window.location.reload();
                    return;
                }

                // Si no se recarga, reintentar tras un breve retraso
                setTimeout(() => startWaitForData(), POLL_DELAY_AFTER_NAV_MS);
            }
        } catch (e) {
            console.error('(egs2egd): Error en el handler de cambio de URL:', e);
        }
    });

    // Inicio: registrar la ruta actual y comenzar la búsqueda
    actualPath = location.pathname;
    startWaitForData();
})();
