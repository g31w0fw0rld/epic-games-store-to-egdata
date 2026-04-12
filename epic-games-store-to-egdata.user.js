// ==UserScript==
// @name         Epic Games Store to EGData Button
// @namespace    https://www.epicgames.com/store/
// @version      1.1.7.5
// @description  Agrega un botón hacia EGData debajo del botón de compra en las páginas de productos de Epic Games Store. Recarga la página cuando la ruta cambia a product o bundle.
// @author       g31w0fw0rld
// @license      MIT
// @match        https://store.epicgames.com/*/p/*
// @match        https://store.epicgames.com/*/bundles/*
// @downloadURL  https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js
// @updateURL    https://github.com/g31w0fw0rld/epic-games-store-to-egdata/raw/main/epic-games-store-to-egdata.user.js
// @grant        none
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
    const PRODUCT_URL_REGEX = /^https:\/\/store\.epicgames\.com\/[^\/]+\/p\/.+/;
    const BUNDLE_URL_REGEX = /^https:\/\/store\.epicgames\.com\/[^\/]+\/bundles\/.+/;
    const PRODUCT_PATH_REGEX = /^\/[^\/]+\/p\/.+/;
    const BUNDLE_PATH_REGEX = /^\/[^\/]+\/bundles\/.+/;

    // =============================================
    // ESTADO GLOBAL
    // =============================================
    let waitIntervalId = null;
    let actualPath = '';

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
            for (const q of queries) {
                const hasGetCatalogOffer =
                    (q.queryHash && q.queryHash.includes('getCatalogOffer')) ||
                    (q.queryKey && JSON.stringify(q.queryKey).includes('getCatalogOffer'));
                if (hasGetCatalogOffer) {
                    const id = q.state?.data?.Catalog?.catalogOffer?.id;
                    if (id) return id;
                }
            }
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
     * Crea e inserta el botón EGData en la página. No duplica si ya existe.
     * Para páginas de tipo bundle, también añade un segundo botón junto al
     * segundo botón de compra (si existe).
     * @param {string} slug - ID de la oferta en EGData.
     * @param {string} urlType - Tipo de página ("product" o "bundle").
     * @param {string} gameTitle - Título del juego (para log).
     * @returns {HTMLButtonElement|null} El botón creado o null si no fue posible.
     */
    function createEGDataButton(slug, urlType, gameTitle) {
        try {
            const egDataLink = `${EGDATA_BASE_URL}${slug}`;
            const purchaseButton = document.querySelector(PURCHASE_BUTTON_SELECTOR);
            if (!purchaseButton) return null;

            // Navegar al contenedor padre adecuado (3 niveles arriba del botón de compra)
            let targetContainer = purchaseButton.parentElement?.parentElement?.parentElement;
            const purchaseButtonIsDisabled = purchaseButton.hasAttribute('disabled') || purchaseButton.className.includes('disabled');
            if (purchaseButtonIsDisabled) purchaseButton.style.marginLeft = '0px';

            // Crear contenedores div intermedios para la estructura visual
            const div = document.createElement('div');
            targetContainer.appendChild(div);
            targetContainer = div;
            const divButton = document.createElement('div');
            targetContainer.appendChild(divButton);
            targetContainer = divButton;

            if (!targetContainer) return null;

            // Evitar duplicados comprobando el atributo data
            const existing = targetContainer.querySelector(`[${DATA_ATTR}="true"]`);
            if (existing) return existing;

            // Inyectar estilos y crear botón
            injectStyles();
            const button = buildButton(slug, purchaseButton.className || '');
            targetContainer.appendChild(button);

            // Para bundles: añadir segundo botón junto al segundo botón de compra
            if (urlType === 'bundle') {
                button.style.marginTop = '0.625rem';

                const purchaseButtons = document.querySelectorAll(PURCHASE_BUTTON_SELECTOR);
                const secondPurchaseButton = purchaseButtons[1];
                const secondButtonContainer = secondPurchaseButton?.parentElement?.parentElement?.parentElement;
                if (secondButtonContainer) {
                    const div2 = document.createElement('div');
                    secondButtonContainer.appendChild(div2);
                    const divButton2 = document.createElement('div');
                    div2.appendChild(divButton2);
                    const button2 = button.cloneNode(true);
                    button2.className = secondPurchaseButton.className;
                    button2.onclick = () => window.open(egDataLink, '_blank');
                    divButton2.appendChild(button2);
                }
            }

            console.log(`(egs2egd): ${gameTitle} [${urlType}] — button added successfully -> ${egDataLink}`);
            return button;
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
