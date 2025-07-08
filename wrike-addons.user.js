// ==UserScript==
// @name         Wrike Addons
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Quelques tools pour Wrike
// @author       Steve
// @match        https://www.wrike.com/workspace.htm*
// @updateURL    https://github.com/stevecohenfr/userscript-ibexa-tools/raw/refs/heads/main/wrike-addons.user.js
// @downloadURL  https://github.com/stevecohenfr/userscript-ibexa-tools/raw/refs/heads/main/wrike-addons.user.js
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log("wrikeaddons loaded");

    // Injecte le CSS pour le toast une fois
    const style = document.createElement('style');
    style.textContent = `
    .wrikeaddons-toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(50,50,50,0.9);
        color: white;
        padding: 8px 14px;
        border-radius: 4px;
        font-size: 14px;
        opacity: 1;
        transition: opacity 0.5s ease;
        z-index: 9999;
        pointer-events: none;
        user-select: none;
        font-family: sans-serif;
    }
    `;
    document.head.appendChild(style);

    // Fonction pour attendre qu'un élément apparaisse dans le DOM
    function waitForElement(selector, callback) {
        console.log(`WrikeAddons: waiting for ${selector}...`);
        const observer = new MutationObserver(() => {
            const el = document.querySelector(selector);
            if (el) {
                console.log(`WrikeAddons: found ${selector}`);
                observer.disconnect();
                callback(el);
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    // Fonction pour afficher un toast
    function showToast(message) {
        let toast = document.createElement('div');
        toast.className = 'wrikeaddons-toast';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 500);
        }, 2000);
    }

    // Fonction pour injecter le bouton
    function injectGitButton() {

        // Trouve le panel d'actions
        const actionPanel = document.querySelector('action-panel');
        if (!actionPanel) {
            return;
        }

        // Vérifie si déjà injecté
        if (actionPanel.querySelector('.wrikeaddons-git-button')) {
            return;
        }

        // Récupère le ticket id depuis l'URL
        const hash = window.location.hash;
        const urlParams = new URLSearchParams(hash.split('?')[1]);
        const sidePanelItemId = urlParams.get('sidePanelItemId');

        // Récupère le titre depuis le textarea
        const titleTextarea = document.querySelector('work-item-title textarea');
        const ticketTitle = titleTextarea ? titleTextarea.value.trim() : '';

        if (!sidePanelItemId || !ticketTitle) {
            return;
        }

        // Crée le bouton épuré avec juste l’icône Git blanche
        const button = document.createElement('button');
        button.className = 'wrikeaddons-git-button';
        button.setAttribute('type', 'button');
        button.setAttribute('aria-label', 'Copier ID et Titre');
        button.style.background = 'none';
        button.style.border = 'none';
        button.style.padding = '0';
        button.style.marginRight = '6px';
        button.style.cursor = 'pointer';
        button.style.display = 'flex';
        button.style.alignItems = 'center';

        // Icône Git en img
        const img = document.createElement('img');
        img.src = 'https://git-scm.com/images/logos/downloads/Git-Icon-White.svg';
        img.alt = 'Git Icon';
        img.style.width = '16px';
        img.style.height = '16px';
        img.style.display = 'block';
        button.appendChild(img);

        // Copie au clic et affiche le toast
        button.addEventListener('click', () => {
            const text = `id=${sidePanelItemId} ${ticketTitle}`;
            console.log("WrikeAddons: copied to clipboard:", text);
            GM_setClipboard(text);
            button.setAttribute('aria-label', `Copié: ${text}`);
            showToast('Copié dans le presse-papier !');
        });

        // Insère le bouton juste avant le bouton permalink
        const permalinkButton = actionPanel.querySelector('work-item-permalink-button');
        if (permalinkButton && permalinkButton.parentNode) {
            permalinkButton.parentNode.insertBefore(button, permalinkButton);
            console.log("wrikeaddons: button injected successfully");
        } else {
            console.log("WrikeAddons: could not find permalinkButton to insert before");
        }
    }

    // Attendre l'apparition du panel
    waitForElement('action-panel', injectGitButton);

    // Observer les changements car Wrike recharge dynamiquement
    const mainObserver = new MutationObserver(() => injectGitButton());
    mainObserver.observe(document.body, { childList: true, subtree: true });

})();
