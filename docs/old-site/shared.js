/* =====================================================================
   shared.js  —  Common chrome + plumbing for all Selector pages.

   A page includes this file, then calls Shared.initPage({...}) with:
     active:        'switching' | 'wireless' | 'routing' | 'datacenter'
     mgmtButtons:   array of keys, e.g. ['ALL','On-Prem','Cloud','Unified']
                    or ['ALL','Nexus','SAN']  (defs + labels live below)
     pageI18n:      { en:{...}, tr:{...} }  page-specific strings
     valToKey:      map of raw filter value -> i18n key (for the active bar)
     activeFilters: the page's filter-state object (passed by reference)
     exclusiveFilters: array of filter types that allow only one choice
     render:        the page's render function
     reset:         the page's full reset function (wired to Reset button)
     onReady:       called once chrome is built; load data + first render here

   The page provides the HTML for #chrome-top, .main-container and
   #chrome-feedback mount points (see any page for the minimal shell).
   ===================================================================== */

const Shared = (function () {

    // --- Base translations shared by every page -----------------------
    const baseI18n = {
        en: {
            'nav-switching': 'Switching', 'nav-wireless': 'Wireless', 'nav-routing': 'Routing', 'nav-datacenter': 'DataCenter',
            'reset-btn': 'Reset Workspace',
            'mgmt-all': 'ALL', 'mgmt-onprem': 'On-Prem', 'mgmt-cloud': 'Cloud', 'mgmt-unified': 'Unified', 'mgmt-nexus': 'Nexus', 'mgmt-san': 'SAN (MDS)', 'mgmt-hyperfabric': 'Hyperfabric',
            'feedback-btn': 'Feedback', 'feedback-title': 'Send Feedback', 'feedback-name': 'Name', 'feedback-email': 'Email', 'feedback-text': 'Feedback', 'feedback-submit': 'Send Feedback',
            'loading': 'Loading dataset...', 'no-match': 'No results match the selected filters.',
            'load-error': 'Could not load the data files. If you opened this page directly from disk, run it through a web server (GitHub Pages works).',
            'active-filters': 'Active Filters:', 'drawer-select': 'Select Model:', 'btn-select': 'Select', 'btn-selected': 'Selected',
            'disclaimer': 'Unofficial help tool. Please verify the information from official Cisco sources.',
            'fb-sending': 'Sending...', 'fb-success': 'Thank you! Your feedback has been sent.', 'fb-error': 'Could not send right now. Please try again.', 'fb-need': 'Please write your feedback before sending.'
        },
        tr: {
            'nav-switching': 'Anahtarlama', 'nav-wireless': 'Kablosuz', 'nav-routing': 'Yönlendirme', 'nav-datacenter': 'Veri Merkezi',
            'reset-btn': 'Çalışma Alanını Sıfırla',
            'mgmt-all': 'TÜMÜ', 'mgmt-onprem': 'Lokal', 'mgmt-cloud': 'Bulut', 'mgmt-unified': 'Birleşik', 'mgmt-nexus': 'Nexus', 'mgmt-san': 'SAN (MDS)', 'mgmt-hyperfabric': 'Hyperfabric',
            'feedback-btn': 'Geri Bildirim', 'feedback-title': 'Geri Bildirim Gönder', 'feedback-name': 'İsim', 'feedback-email': 'E-posta', 'feedback-text': 'Geri Bildirim', 'feedback-submit': 'Gönder',
            'loading': 'Veri seti yükleniyor...', 'no-match': 'Seçilen filtrelere uygun sonuç bulunamadı.',
            'load-error': 'Veri dosyaları yüklenemedi. Bu sayfayı doğrudan diskten açtıysanız, bir web sunucusu üzerinden çalıştırın (GitHub Pages uygundur).',
            'active-filters': 'Aktif Filtreler:', 'drawer-select': 'Model Seçin:', 'btn-select': 'Seç', 'btn-selected': 'Seçildi',
            'disclaimer': 'Resmî olmayan yardımcı araçtır. Lütfen bilgileri resmî Cisco kaynaklarından doğrulayın.',
            'fb-sending': 'Gönderiliyor...', 'fb-success': 'Teşekkürler! Geri bildiriminiz gönderildi.', 'fb-error': 'Şu anda gönderilemedi. Lütfen tekrar deneyin.', 'fb-need': 'Göndermeden önce lütfen geri bildiriminizi yazın.'
        }
    };

    // --- Navigation + management-toggle definitions -------------------
    const NAV = [
        { key: 'switching',  href: 'index.html',      i18n: 'nav-switching',  svg: '<path d="M4 1C2.89 1 2 1.89 2 3V7C2 8.11 2.89 9 4 9H20C21.11 9 22 8.11 22 7V3C22 1.89 21.11 1 20 1H4M4 3H20V7H4V3M4 11C2.89 11 2 11.89 2 13V17C2 18.11 2.89 19 4 19H20C21.11 19 22 18.11 22 17V13C22 11.89 21.11 11 20 11H4M4 13H20V17H4V13M6 4H8V6H6V4M16 4H18V6H16V4M6 14H8V16H6V14M16 14H18V16H16V14Z"/>' },
        { key: 'wireless',   href: 'wireless.html',   i18n: 'nav-wireless',   svg: '<path d="M12,21L15.6,16.2C14.6,15.45 13.35,15 12,15C10.65,15 9.4,15.45 8.4,16.2L12,21M12,3C7.95,3 4.21,4.34 1.2,6.6L3,9C5.5,7.12 8.62,6 12,6C15.38,6 18.5,7.12 21,9L22.8,6.6C19.79,4.34 16.05,3 12,3M12,9C9.3,9 6.81,9.89 4.8,11.4L6.6,13.8C8.1,12.67 9.97,12 12,12C14.03,12 15.9,12.67 17.4,13.8L19.2,11.4C17.19,9.89 14.7,9 12,9Z"/>' },
        { key: 'routing',    href: 'router.html',     i18n: 'nav-routing',    svg: '<path d="M19 13H5C3.9 13 3 13.9 3 15V19C3 20.1 3.9 21 5 21H19C20.1 21 21 20.1 21 19V15C21 13.9 20.1 13 19 13M19 19H5V15H19V19M16 16H18V18H16V16M12 16H14V18H12V16M9.2 10.5C10.8 9.1 13.2 9.1 14.8 10.5L16.2 9C13.9 6.9 10.1 6.9 7.8 9L9.2 10.5M5 6.2L6.4 7.6C9.5 4.9 14.5 4.9 17.6 7.6L19 6.2C15.1 2.8 8.9 2.8 5 6.2Z"/>' },
        { key: 'datacenter', href: 'datacenter.html', i18n: 'nav-datacenter', svg: '<path d="M4 2h16v5H4V2zm0 8h16v5H4v-5zm0 8h16v5H4v-5zm2-14h2v1H6V4zm0 8h2v1H6v-1zm0 8h2v1H6v-1z"/>' }
    ];

    const MGMT_DEFS = {
        'ALL':     { cls: 'btn-all',     i18n: 'mgmt-all',     svg: '<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>' },
        'On-Prem': { cls: 'btn-onprem',  i18n: 'mgmt-onprem',  svg: '<rect x="1" y="10" width="2.5" height="4"/><rect x="6" y="7" width="2.5" height="10"/><rect x="11" y="3" width="2.5" height="18"/><rect x="16" y="7" width="2.5" height="10"/><rect x="21" y="10" width="2.5" height="4"/>' },
        'Cloud':   { cls: 'btn-cloud',   i18n: 'mgmt-cloud',   svg: '<path d="M4 14L8 9L12 14L16 7L20 12" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="4" cy="14" r="2.5"/><circle cx="8" cy="9" r="2.5"/><circle cx="12" cy="14" r="2.5"/><circle cx="16" cy="7" r="2.5"/><circle cx="20" cy="12" r="2.5"/>' },
        'Unified': { cls: 'btn-unified', i18n: 'mgmt-unified', svg: '<path d="M10 10H5V8h3.59L4.3 3.71 5.71 2.3 10 6.59V3h2v7zM14 10h5V8h-3.59l4.29-4.29-1.41-1.41L14 6.59V3h-2v7zM10 14H5v2h3.59l-4.29 4.29 1.41 1.41L10 17.41V21h2v-7zM14 14h5v2h-3.59l4.29 4.29-1.41 1.41L14 17.41V21h-2v-7z"/>' },
        'Nexus':   { cls: 'btn-nexus',   i18n: 'mgmt-nexus',   svg: '<path d="M3 3h18v4H3V3zm0 7h18v4H3v-4zm0 7h18v4H3v-4z"/>' },
        'SAN':     { cls: 'btn-san',     i18n: 'mgmt-san',     svg: '<path d="M12 2a4 4 0 0 0-4 4c0 1.5.8 2.8 2 3.4V14H6a4 4 0 0 0 0 8 4 4 0 0 0 3.4-6H14.6A4 4 0 0 0 18 22a4 4 0 0 0 0-8h-4V9.4c1.2-.6 2-1.9 2-3.4a4 4 0 0 0-4-4z"/>' },
        'Hyperfabric': { cls: 'btn-hyperfabric', i18n: 'mgmt-hyperfabric', svg: '<path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z"/>' }
    };

    const FEEDBACK_HTML =
        '<div class="feedback-widget">' +
            '<div class="feedback-drawer-popup" id="feedback-drawer">' +
                '<button class="feedback-close-btn" onclick="document.getElementById(\'feedback-drawer\').classList.remove(\'active\')">&times;</button>' +
                '<h3 data-i18n="feedback-title">Send Feedback</h3>' +
                '<div class="feedback-form-group"><label data-i18n="feedback-name">Name</label><input type="text" id="fb-name" placeholder="Your Name" data-i18n="feedback-name"></div>' +
                '<div class="feedback-form-group"><label data-i18n="feedback-email">Email</label><input type="email" id="fb-email" placeholder="Your Email" data-i18n="feedback-email"></div>' +
                '<div class="feedback-form-group"><label data-i18n="feedback-text">Feedback</label><textarea id="fb-msg" placeholder="Tell us what you think or report a bug..." data-i18n="feedback-text"></textarea></div>' +
                '<input type="checkbox" id="fb-bot" tabindex="-1" autocomplete="off" style="display:none;">' +
                '<button class="feedback-send-btn" id="fb-send" onclick="Shared.sendFeedback()" data-i18n="feedback-submit">Send Feedback</button>' +
                '<div class="fb-status" id="fb-status"></div>' +
            '</div>' +
            '<button class="feedback-toggle-btn" onclick="Shared.openFeedback()">' +
                '<svg viewBox="0 0 24 24"><path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2M20 16H5.2L4 17.2V4H20V16M11 6H13V11H11V6M11 13H13V15H11V13Z"/></svg>' +
                '<span data-i18n="feedback-btn">Feedback</span>' +
            '</button>' +
        '</div>';

    // --- Module state -------------------------------------------------
    const S = {
        lang: 'en',
        mgmt: 'ALL',
        I18N: { en: {}, tr: {} },
        activeFilters: {},
        valToKey: {},
        mgmtValToKey: {},
        activePage: '',
        fbOpenedAt: 0,
        render: function () {},
        reset: function () {}
    };

    // --- Analytics (GoatCounter) --------------------------------------
    const GOATCOUNTER_URL = 'https://denizy.goatcounter.com/count';
    function loadAnalytics() {
        if (document.querySelector('script[data-goatcounter]')) return;
        const s = document.createElement('script');
        s.async = true;
        s.src = '//gc.zgo.at/count.js';
        s.setAttribute('data-goatcounter', GOATCOUNTER_URL);
        document.head.appendChild(s);
    }
    // Custom engagement events; silently no-ops if the script is blocked/not loaded.
    function track(name) {
        try {
            if (window.goatcounter && window.goatcounter.count) {
                window.goatcounter.count({ path: name, event: true });
            }
        } catch (e) { /* never let analytics break the app */ }
    }

    function t(key) { return (S.I18N[S.lang] && S.I18N[S.lang][key]) || key; }
    function cssId(str) { return (str || '').replace(/\s+/g, '-').replace(/[^a-zA-Z0-9-]/g, ''); }

    function buildChrome(active, mgmtButtons) {
        // Disclaimer (top of page, above the header)
        let disclaimer = '<div class="disclaimer-bar" data-i18n="disclaimer">Unofficial help tool. Please verify the information from official Cisco sources.</div>';

        // Header
        let header =
            '<div class="header-container">' +
                '<div class="header-left">' +
                    '<div class="lang-switch-wrapper"><span class="lang-label">EN</span>' +
                        '<label class="switch"><input type="checkbox" id="langToggle" onchange="Shared.toggleLanguage()"><span class="slider"></span></label>' +
                        '<span class="lang-label">TR</span></div>' +
                    '<img src="logo.png" alt="Tools4Us Logo" style="height:55px;width:auto;">' +
                '</div>' +
                '<button class="reset-btn" onclick="Shared.reset()" data-i18n="reset-btn">Reset Workspace</button>' +
            '</div>';

        // Global nav
        let nav = '<div class="global-nav-container">' +
            NAV.map(n =>
                '<button class="global-nav-btn' + (n.key === active ? ' active' : '') + '" onclick="window.location.href=\'' + n.href + '\'">' +
                    '<svg viewBox="0 0 24 24">' + n.svg + '</svg>' +
                    '<span data-i18n="' + n.i18n + '">' + n.i18n + '</span>' +
                '</button>'
            ).join('') + '</div>';

        // Management toggle
        let mgmt = '<div class="mgmt-toggle-container">' +
            mgmtButtons.map((val, idx) => {
                const d = MGMT_DEFS[val];
                return '<button class="mgmt-btn ' + d.cls + (idx === 0 ? ' active' : '') + '" data-val="' + val + '" onclick="Shared.setMgmt(\'' + val + '\')">' +
                    '<svg viewBox="0 0 24 24">' + d.svg + '</svg>' +
                    '<span data-i18n="' + d.i18n + '">' + d.i18n + '</span>' +
                '</button>';
            }).join('') + '</div>';

        document.getElementById('chrome-top').innerHTML = disclaimer + header + nav + mgmt;
        const fb = document.getElementById('chrome-feedback');
        if (fb) fb.innerHTML = FEEDBACK_HTML;
        // Disclaimer (bottom of page, after all content)
        document.body.insertAdjacentHTML('beforeend', '<div class="disclaimer-bar bottom" data-i18n="disclaimer">Unofficial help tool. Please verify the information from official Cisco sources.</div>');
    }

    function updateUIText() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const val = S.I18N[S.lang] && S.I18N[S.lang][key];
            if (val) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') el.placeholder = val;
                else el.textContent = val;
            }
        });
    }

    function translateFilterValue(val) {
        if (S.valToKey[val] && t(S.valToKey[val])) return t(S.valToKey[val]);
        if (S.mgmtValToKey[val]) return t(S.mgmtValToKey[val]);
        return val;
    }

    function updateActiveFilterBar() {
        const bar = document.getElementById('active-filters-bar');
        if (!bar) return;
        let texts = [];
        if (S.mgmt !== 'ALL') texts.push(translateFilterValue(S.mgmt));
        for (let type in S.activeFilters) S.activeFilters[type].forEach(v => texts.push(translateFilterValue(v)));
        bar.innerHTML = texts.length
            ? t('active-filters') + ' <span style="margin-left:8px;font-weight:normal;">' + texts.join(' &nbsp;|&nbsp; ') + '</span>'
            : '';
    }

    function setupFilterListeners(exclusiveFilters) {
        const exclusive = exclusiveFilters || [];
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const fType = btn.dataset.filter, fVal = btn.dataset.val;
                if (exclusive.includes(fType)) {
                    document.querySelectorAll('.filter-btn[data-filter="' + fType + '"]').forEach(b => { if (b !== btn) b.classList.remove('active'); });
                    S.activeFilters[fType] = [];
                }
                btn.classList.toggle('active');
                if (btn.classList.contains('active')) S.activeFilters[fType].push(fVal);
                else S.activeFilters[fType] = S.activeFilters[fType].filter(v => v !== fVal);
                track('filter-' + fType);
                S.render();
            });
        });
    }

    function loadCsv(url) {
        return new Promise((resolve, reject) => {
            Papa.parse(url, {
                download: true, header: true, skipEmptyLines: true,
                complete: r => resolve(r.data),
                error: reject
            });
        });
    }

    // --- Public API ---------------------------------------------------
    return {
        get lang() { return S.lang; },
        get mgmt() { return S.mgmt; },
        get activeFilters() { return S.activeFilters; },
        t: t,
        cssId: cssId,
        loadCsv: loadCsv,
        updateUIText: updateUIText,
        updateActiveFilterBar: updateActiveFilterBar,
        translateFilterValue: translateFilterValue,

        toggleLanguage: function () {
            S.lang = document.getElementById('langToggle').checked ? 'tr' : 'en';
            document.documentElement.lang = S.lang;
            track('lang-' + S.lang);
            updateUIText();
            S.render();
        },

        setMgmt: function (type) {
            S.mgmt = type;
            document.querySelectorAll('.mgmt-btn').forEach(b => b.classList.remove('active'));
            const btn = document.querySelector('.mgmt-btn[data-val="' + type + '"]');
            if (btn) btn.classList.add('active');
            track('mgmt-' + type.toLowerCase());
            S.render();
        },

        // Clears the toggle + all filter buttons back to defaults.
        // Pages call this from their own reset(), then clear their own
        // selection state and re-render.
        clearFilterUI: function () {
            S.mgmt = 'ALL';
            document.querySelectorAll('.mgmt-btn').forEach(b => b.classList.remove('active'));
            const all = document.querySelector('.mgmt-btn[data-val="ALL"]');
            if (all) all.classList.add('active');
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            for (let k in S.activeFilters) S.activeFilters[k] = [];
        },

        reset: function () { S.reset(); },
        track: track,

        openFeedback: function () {
            const d = document.getElementById('feedback-drawer');
            d.classList.toggle('active');
            if (d.classList.contains('active')) {
                S.fbOpenedAt = Date.now();
                const st = document.getElementById('fb-status');
                if (st) { st.style.display = 'none'; st.textContent = ''; }
            }
        },

        sendFeedback: function () {
            const st = document.getElementById('fb-status');
            const btn = document.getElementById('fb-send');
            const nameEl = document.getElementById('fb-name');
            const emailEl = document.getElementById('fb-email');
            const msgEl = document.getElementById('fb-msg');
            function status(key, cls) { st.textContent = t(key); st.className = 'fb-status ' + cls; st.style.display = 'block'; }

            const msg = (msgEl.value || '').trim();
            if (!msg) { status('fb-need', 'err'); return; }
            // Anti-spam: honeypot + minimum 3s between opening the widget and sending
            if (document.getElementById('fb-bot').checked || (Date.now() - S.fbOpenedAt) < 3000) { status('fb-error', 'err'); return; }

            btn.disabled = true;
            status('fb-sending', '');
            fetch('https://api.web3forms.com/submit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    access_key: 'bfdd10fd-62e4-4840-9710-63e8fa3947fb',
                    subject: 'Cisco Selector feedback (' + (S.activePage || 'unknown') + ' page)',
                    name: (nameEl.value || '').trim() || 'Anonymous',
                    email: (emailEl.value || '').trim() || undefined,
                    message: msg,
                    page: window.location.href,
                    language: S.lang
                })
            })
            .then(r => r.json())
            .then(d => {
                if (d && d.success) {
                    status('fb-success', 'ok');
                    nameEl.value = ''; emailEl.value = ''; msgEl.value = '';
                    track('feedback-sent');
                    setTimeout(() => { document.getElementById('feedback-drawer').classList.remove('active'); }, 2500);
                } else {
                    status('fb-error', 'err');
                }
            })
            .catch(() => status('fb-error', 'err'))
            .finally(() => { btn.disabled = false; });
        },

        initPage: function (cfg) {
            // Merge translations (page overrides base)
            S.I18N.en = Object.assign({}, baseI18n.en, (cfg.pageI18n && cfg.pageI18n.en) || {});
            S.I18N.tr = Object.assign({}, baseI18n.tr, (cfg.pageI18n && cfg.pageI18n.tr) || {});

            S.activeFilters = cfg.activeFilters || {};
            S.valToKey = cfg.valToKey || {};
            S.render = cfg.render || function () {};
            S.reset = cfg.reset || function () {};
            S.activePage = cfg.active || '';

            // Analytics: pageview via GoatCounter script; engagement via delegation
            loadAnalytics();
            document.addEventListener('click', function (e) {
                if (e.target.closest && e.target.closest('.datasheet-link')) track('datasheet-click');
                else if (e.target.closest && e.target.closest('.sku-btn')) track('model-select');
                else if (e.target.closest && e.target.closest('[onclick^="toggleDrawer"]')) track('drawer-open');
            });

            // Build the value->label map for the management toggle
            S.mgmtValToKey = {};
            (cfg.mgmtButtons || ['ALL']).forEach(v => { if (MGMT_DEFS[v]) S.mgmtValToKey[v] = MGMT_DEFS[v].i18n; });

            buildChrome(cfg.active, cfg.mgmtButtons || ['ALL']);
            setupFilterListeners(cfg.exclusiveFilters);
            updateUIText();

            if (cfg.onReady) cfg.onReady();
        }
    };
})();
