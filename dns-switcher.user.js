// ==UserScript==
// @name         DNS Environment Switcher
// @version      1.5
// @description  Switch DNS environments (PROD/DEV) while keeping the same page path - Smart contextual menu with Tampermonkey config
// @author       Emcou
// @include      *
// @updateURL    https://github.com/stevecohenfr/userscript-ibexa-tools/raw/refs/heads/main/dns-switcher.user.js
// @downloadURL  https://github.com/stevecohenfr/userscript-ibexa-tools/raw/refs/heads/main/dns-switcher.user.js
// @match        https://*/*
// @match        http://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_openInTab
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Configuration par défaut (peut être surchargée par l'utilisateur)
    const defaultConfig = {
        // CFN PROD
        CFN_PROD_ADMIN: "://cfadmin.cfnews.net",
        CFN_PROD_CONTRIB: "://cfcontrib.cfnews.net",
        CFN_PROD_FRONT: "://www.cfnews.net",

        // CFN DEV
        CFN_DEV_ADMIN: "://adminpp.cfnews.ddev.site:8443",
        CFN_DEV_CONTRIB: "://contribpp.cfnews.ddev.site:8443",
        CFN_DEV_FRONT: "://www.cfnews.ddev.site:8443",

        // INFRA PROD
        INFRA_PROD_ADMIN: "://adminpp.cfnewsinfra.net",
        INFRA_PROD_CONTRIB: "://contribpp.cfnewsinfra.net",
        INFRA_PROD_FRONT: "://www.cfnewsinfra.net",

        // INFRA DEV
        INFRA_DEV_ADMIN: "://adminpp.cfnewsinfra.loc:8890",
        INFRA_DEV_CONTRIB: "://contribpp.cfnewsinfra.loc:8890",
        INFRA_DEV_FRONT: "://www.cfnewsinfra.loc:8890",

        // IMMO PROD
        IMMO_PROD_ADMIN: "://adminpp.cfnewsimmo.net",
        IMMO_PROD_CONTRIB: "://contribpp.cfnewsimmo.net",
        IMMO_PROD_FRONT: "://www.cfnewsimmo.net",

        // IMMO DEV
        IMMO_DEV_ADMIN: "://adminpp.cfnewsimmo.loc:8890",
        IMMO_DEV_CONTRIB: "://contribpp.cfnewsimmo.loc:8890",
        IMMO_DEV_FRONT: "://www.cfnewsimmo.loc:8890",

        // SFX PROD
        SFX_PROD_ADMIN: "://sfxadmin.cfnews.net",
        SFX_PROD_CONTRIB: "://sfxcontrib.cfnews.net",
        SFX_PROD_FRONT: "://sfxpp.cfnews.net",

        // SFX DEV
        SFX_DEV_ADMIN: "://sfxadmin.satellifacts.ddev.site:8447",
        SFX_DEV_CONTRIB: "://sfxcontrib.satellifacts.ddev.site:8447",
        SFX_DEV_FRONT: "://www.satellifacts.ddev.site:8447"
    };

    let environmentGroups = {};

    function loadUserConfig() {
        const savedConfig = GM_getValue('userConfig', null);
        if (savedConfig) {
            try {
                const userConfig = JSON.parse(savedConfig);
                return { ...defaultConfig, ...userConfig };
            } catch (e) {
                console.error('Erreur lors du chargement de la config utilisateur:', e);
                return defaultConfig;
            }
        }
        return defaultConfig;
    }

    function saveUserConfig(config) {
        // Ne sauvegarder que les différences avec la config par défaut
        const userOverrides = {};
        Object.keys(config).forEach(key => {
            if (config[key] !== defaultConfig[key]) {
                userOverrides[key] = config[key];
            }
        });
        GM_setValue('userConfig', JSON.stringify(userOverrides));
    }

    function buildEnvironmentGroups(config) {
        const groups = {};

        Object.keys(config).forEach(key => {
            const parts = key.split('_');
            if (parts.length >= 3) {
                const groupName = parts[0].toLowerCase();
                const envType = parts[1].toLowerCase();
                const urlType = parts[2].toLowerCase();

                if (!groups[groupName]) {
                    groups[groupName] = {};
                }

                if (!groups[groupName][envType]) {
                    groups[groupName][envType] = {
                        domains: [],
                        urls: {},
                        label: `${envType === 'prod' ? '🔴 PROD' : '🟢 DEV'} ${groupName.toUpperCase()}`
                    };
                }

                const capitalizedType = urlType.charAt(0).toUpperCase() + urlType.slice(1);
                groups[groupName][envType].urls[capitalizedType] = config[key];

                const domain = config[key].replace('://', '').split(':')[0];
                if (!groups[groupName][envType].domains.includes(domain)) {
                    groups[groupName][envType].domains.push(domain);
                }
            }
        });

        return groups;
    }

    function getCurrentDomain() {
        return window.location.hostname;
    }

    function getCurrentGroup() {
        const currentDomain = getCurrentDomain();

        for (const [groupKey, groupData] of Object.entries(environmentGroups)) {
            if (groupData.prod && groupData.prod.domains.some(domain => currentDomain.includes(domain))) {
                return { groupKey, groupData, currentEnv: 'prod' };
            }
            if (groupData.dev && groupData.dev.domains.some(domain => currentDomain.includes(domain))) {
                return { groupKey, groupData, currentEnv: 'dev' };
            }
        }
        return null;
    }

    function switchEnvironment(targetUrl) {
        const currentUrl = window.location.href;
        const newUrl = currentUrl.replace(/:\/\/([^/]+)/, targetUrl);
        GM_openInTab(newUrl, true);
    }

    function registerEnvironmentMenus() {
        const currentGroup = getCurrentGroup();

        if (currentGroup) {
            const { groupData, currentEnv } = currentGroup;

            if (groupData.prod) {
                Object.entries(groupData.prod.urls).forEach(([name, url]) => {
                    const isCurrentEnv = currentEnv === 'prod';
                    const prefix = isCurrentEnv ? "➤ " : "";
                    GM_registerMenuCommand(`${prefix}${groupData.prod.label} - ${name}`, () => switchEnvironment(url));
                });
            }

            GM_registerMenuCommand("─────────────────", () => {});

            if (groupData.dev) {
                Object.entries(groupData.dev.urls).forEach(([name, url]) => {
                    const isCurrentEnv = currentEnv === 'dev';
                    const prefix = isCurrentEnv ? "➤ " : "";
                    GM_registerMenuCommand(`${prefix}${groupData.dev.label} - ${name}`, () => switchEnvironment(url));
                });
            }

        } else {
            GM_registerMenuCommand("🔄 Tous les environnements", () => {});

            Object.entries(environmentGroups).forEach(([groupKey, groupData]) => {
                GM_registerMenuCommand(`── ${groupKey.toUpperCase()} ──`, () => {});

                if (groupData.prod) {
                    Object.entries(groupData.prod.urls).forEach(([name, url]) => {
                        GM_registerMenuCommand(`${groupData.prod.label} - ${name}`, () => switchEnvironment(url));
                    });
                }

                if (groupData.dev) {
                    Object.entries(groupData.dev.urls).forEach(([name, url]) => {
                        GM_registerMenuCommand(`${groupData.dev.label} - ${name}`, () => switchEnvironment(url));
                    });
                }
            });
        }
    }

    function registerConfigMenus() {
        GM_registerMenuCommand("", () => {}); // Séparateur
        GM_registerMenuCommand("⚙️ Configurer URLs", showConfigDialog);
        GM_registerMenuCommand("🔄 Reset config par défaut", resetToDefault);
        GM_registerMenuCommand("📋 Exporter config", exportConfig);
        GM_registerMenuCommand("📥 Importer config", importConfig);
    }

    function showConfigDialog() {
        const currentConfig = loadUserConfig();
        let configText = "Configuration actuelle (format: CLÉ=VALEUR):\n\n";

        Object.entries(currentConfig).forEach(([key, value]) => {
            configText += `${key}=${value}\n`;
        });

        const newConfigText = prompt(
            "Modifiez votre configuration:\n" +
            "Format: GROUP_ENV_TYPE=://domain:port\n" +
            "Exemple: CFN_DEV_ADMIN=://localhost:3001\n\n" +
            "Laissez vide les lignes que vous ne voulez pas modifier:",
            configText
        );

        if (newConfigText !== null) {
            try {
                const newConfig = {};
                const lines = newConfigText.split('\n');

                lines.forEach(line => {
                    line = line.trim();
                    if (line && line.includes('=')) {
                        const [key, value] = line.split('=');
                        if (key && value) {
                            newConfig[key.trim()] = value.trim();
                        }
                    }
                });

                saveUserConfig(newConfig);
                environmentGroups = buildEnvironmentGroups(newConfig);
                alert("✅ Configuration sauvegardée ! Rechargez la page pour appliquer les changements.");

            } catch (e) {
                alert("❌ Erreur dans le format de configuration: " + e.message);
            }
        }
    }

    function resetToDefault() {
        if (confirm("Êtes-vous sûr de vouloir réinitialiser à la configuration par défaut ?")) {
            GM_setValue('userConfig', '{}');
            alert("✅ Configuration réinitialisée ! Rechargez la page.");
        }
    }

    function exportConfig() {
        const config = loadUserConfig();
        const configText = Object.entries(config)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

        const blob = new Blob([configText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'dns-switcher-config.txt';
        a.click();
        URL.revokeObjectURL(url);
    }

    function importConfig() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.txt';

        input.onchange = function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const configText = e.target.result;
                    try {
                        const newConfig = {};
                        const lines = configText.split('\n');

                        lines.forEach(line => {
                            line = line.trim();
                            if (line && line.includes('=')) {
                                const [key, value] = line.split('=');
                                if (key && value) {
                                    newConfig[key.trim()] = value.trim();
                                }
                            }
                        });

                        saveUserConfig(newConfig);
                        alert("✅ Configuration importée ! Rechargez la page pour appliquer les changements.");

                    } catch (e) {
                        alert("❌ Erreur lors de l'import: " + e.message);
                    }
                };
                reader.readAsText(file);
            }
        };

        input.click();
    }

    // Initialisation
    function init() {
        const config = loadUserConfig();
        environmentGroups = buildEnvironmentGroups(config);
        registerEnvironmentMenus();
        registerConfigMenus();
    }

    init();

})();