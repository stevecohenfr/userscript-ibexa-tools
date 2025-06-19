// ==UserScript==
// @name         Ibexa Tools
// @version      0.6
// @description  Add some useful tools for Ibexa Admin Interface
// @author       Steve Cohen
// @include      *
// @grant        GM_getValue
// @grant        GM_setValue
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.1.0/jquery.min.js
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// ==/UserScript==

/* globals $ MonkeyConfig GM_config */
(function ($) {
    'use strict';

    GM_config.init({
        id: 'MyConfig',
        title: 'Ibexa Tools Settings',
        fields: {
            ENABLE_RENAME_PAGE: {
                label: 'Rename page title',
                type: 'checkbox',
                default: true
            },
            ENABLE_CONTENTTYPE_SHORTCUT: {
                label: 'Enable content type shortcut link',
                type: 'checkbox',
                default: true
            },
            ENABLE_FAST_INFO_ACCESS: {
                label: 'Enable fast info access',
                type: 'checkbox',
                default: true
            },
            ENABLE_CONTENTTYPE_FIELD_POSITION: {
                label: 'Show content type field position',
                type: 'checkbox',
                default: true
            }
        }
    });

    const CONFIG = {
        EZ_API_BASE_DATA: {
            url: "/api/ibexa/v2",
            type: "GET",
            beforeSend: function(xhr){
                xhr.setRequestHeader('Accept', 'application/vnd.ibexa.api.ContentInfo+json');
            }
        }
    };

    function getSiteaccess() {
        return $('meta[name=SiteAccess]').attr("content");
    }

    function injectUserMenuButton() {
        const userMenu = $('.ibexa-header-user-menu__popup-menu.ibexa-popup-menu');
        if (!userMenu.length) return;

        const menuList = userMenu.find('ul');
        if (!menuList.length) return;
        if ($('#open-userscript-settings').length) return;
        const $li = $('<li class="ibexa-popup-menu__item"></li>');
        const $link = $('<a href="#" id="open-userscript-settings" class="ibexa-popup-menu__item-content">Paramètres Ibexa Tools</a>');

        $li.append($link);

        const logoutLi = menuList.find('a[href="/logout"]').closest('li');
        if (logoutLi.length) {
            $li.insertBefore(logoutLi);
        } else {
            menuList.append($li);
        }

        $link.on('click', function (e) {
            e.preventDefault();
            GM_config.open();
        });
    }

    function renamePage() {
        const path = window.location.pathname;
        let titre = document.querySelector('h1')?.textContent?.trim() || "Ibexa DXP";

        if (path.includes('/content/edit/')) {
            const titrePage = document.querySelector('h1')?.textContent?.trim();
            titre = "✏️ Édition : " + (titrePage || 'Contenu');
        } else if (path.includes('/view/content/')) {
            const titrePage = document.querySelector('h1, .content-title')?.textContent?.trim();
            titre = "👁️ Tree : " + (titrePage || 'Contenu');
        } else if (path.includes('/dashboard')) {
            titre = "🏠 Tableau de bord";
        } else if (path.includes('/user')) {
            titre = "👤 Gestion des utilisateurs";
        }

        document.title = titre;
    }

    function addFieldPositionToContentTypes() {
        if (!$('body').hasClass('ibexa-content-type-view')) return;

        const contentTypeId = window.location.pathname.split('/').pop();
        const table = $('.ibexa-table');
        const tbodyRows = table.find('tbody tr');

        table.find('thead tr').append(`
            <th class="ibexa-table__header-cell ibexa-table__head-cell--field-definitions-head">
                <span class="ibexa-table__header-cell-text-wrapper">Position</span>
            </th>
        `);

        const objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
        objdata.url = `${CONFIG.EZ_API_BASE_DATA.url}/content/types/${contentTypeId}`;

        $.ajax(objdata).then(response => {
            const fields = response.ContentType?.FieldDefinitions?.FieldDefinition;
            if (!fields) return;

            const positionByIdentifier = {};
            fields.forEach(fd => {
                positionByIdentifier[fd.identifier] = fd.position;
            });

            tbodyRows.each(function () {
                const identifier = $(this).find('td:nth-child(2)').text().trim();
                const position = positionByIdentifier[identifier] ?? '—';
                $(this).append(`<td class="ibexa-table__cell">${position}</td>`);
            });
        });
    }

    function contenttypeShortcut() {
        if ($('body').hasClass('ibexa-content-view')) {
            var mfu = $('#ibexa-mfu');
            var classNameH4 = $('.ibexa-page-title__bottom span.ibexa-icon-tag');
            var contenttypeurl = '/contenttypegroup/{contenttypegroupid}/contenttype/{contenttypeid}';

            var contentId = $('#content_edit_content_info').val();
            var objdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
            objdata.url = objdata.url + "/content/objects/" + contentId;

            let contenttypeId = null;
            let contenttypeGroupId = null;
            $.ajax(objdata)
                .then(function(response){
                var contenttypehref = response.Content.ContentType._href;
                var contenttypedata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                contenttypedata.url = contenttypehref;
                return $.ajax(contenttypedata)
            }).then(function(response) {
                contenttypeId = response.ContentType.id;
                var contenttypegrouphref = response.ContentType.Groups._href;
                var contenttypegroupdata = Object.assign({}, CONFIG.EZ_API_BASE_DATA);
                contenttypegroupdata.url = contenttypegrouphref;
                return $.ajax(contenttypegroupdata)
            }).then(function(response) {
                contenttypeGroupId = response.ContentTypeGroupRefList.ContentTypeGroupRef[0]._href.split('/').pop();
                var link = contenttypeurl
                .replace("{contenttypegroupid}", contenttypeGroupId)
                .replace("{contenttypeid}", contenttypeId);
                var contenttypeIdentifier = mfu.data("parent-content-type-identifier");
                classNameH4.html('<a title="' + contenttypeIdentifier + '" target="_blank" href="' + link + '">' + classNameH4.text() + '</a>');
            });
        }
    }

    function injectFastInfoAccess() {
        if ($('body').hasClass('ibexa-content-view')) {
            var technicalDetailsContent = $('div.ibexa-details:nth-child(2)').clone();
            $('#ibexa-tab-location-view-content').prepend(technicalDetailsContent);
        }
    }

    function addGlobalStyle(css) {
        var head = document.getElementsByTagName('head')[0];
        if (!head) { return; }
        var style = document.createElement('style');
        style.type = 'text/css';
        style.innerHTML = css;
        head.appendChild(style);
    }

    $(function () {
        if (getSiteaccess() === "admin") {
            injectUserMenuButton();

            if (GM_config.get('ENABLE_CONTENTTYPE_SHORTCUT')) contenttypeShortcut();
            if (GM_config.get('ENABLE_RENAME_PAGE')) renamePage();
            if (GM_config.get('ENABLE_FAST_INFO_ACCESS')) injectFastInfoAccess();
            if (GM_config.get('ENABLE_CONTENTTYPE_FIELD_POSITION')) addFieldPositionToContentTypes();
        }
    });

})(window.jQuery);
