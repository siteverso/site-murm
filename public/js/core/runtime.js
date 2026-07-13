// noinspection JSUnresolvedReference

const {formatDateTime, getRelevanceColumnDefinitions, getSexColumnDefinitions, getUserColumnDefinitions, hasUnreadMessages} = window.MurmAppUtils;

const $ = (selector, root = document) => root?.querySelector?.(selector) ?? null;
const configuredTextLimit = Number.parseInt(String(window.__MURMUR_TEXT_LIMIT__ ?? ''), 10);
const TEXT_LIMIT = Number.isInteger(configuredTextLimit) && configuredTextLimit > 0 ? configuredTextLimit : 256;
const configuredReplyMaxDepth = Number.parseInt(String(window.__MURMUR_REPLY_MAX_DEPTH__ ?? ''), 10);
const REPLY_MAX_DEPTH = Number.isInteger(configuredReplyMaxDepth) && configuredReplyMaxDepth >= 1 ? configuredReplyMaxDepth : 10;
const SPECIFIC_SIBLING_WINDOW = 5;
const specificThreadStates = new Map();
const profileCompactExpandedIds = new Set();
const SPECIFIC_HOVER_DELAY_MS = 700;
let specificHoverExpandEnabled = false;
let specificHoverTimer = null;
let specificHoverTarget = null;

const ICONS = {
    direct: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M4 4.5H16V13.2H9.2L5.3 16V13.2H4V4.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="M7 8.8H13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </span>`,
    echo: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="10" r="1.55" fill="currentColor"/>
        <path d="M8 7.7C9.55 8.85 9.55 11.15 8 12.3" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M11.2 5.8C14.7 8.3 14.7 11.7 11.2 14.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    </span>`,
    ignore: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M11.8 4.2C8.2 4.2 6.1 6.5 6.1 9.4C6.1 11.2 7 12.2 8.1 13.1C9 13.8 9.3 14.4 9.3 15.2C9.3 16.2 10.1 16.9 11.1 16.9C12.5 16.9 13.2 15.8 13.2 14.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M9.1 9.7C9.1 8.2 10 7.2 11.4 7.2C12.7 7.2 13.6 8.1 13.6 9.3C13.6 10.2 13.1 10.8 12.4 11.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M4.2 4.3L15.8 15.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      </svg>
    </span>`,
    reply: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M8.2 6L4.5 9.7L8.2 13.4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.1 9.7H11.4C13.9 9.7 15.5 11 15.5 13.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`,
    share: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M6 14L14 6" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M8 6H14V12" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    </span>`,
    send: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <circle cx="5" cy="10" r="1.45" fill="currentColor"/>
        <path d="M8 7.85C9.25 8.85 9.25 11.15 8 12.15" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
        <path d="M11.2 5.8C14.7 8.25 14.7 11.75 11.2 14.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/>
      </svg>
    </span>`,
    edit: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M5 14.8L5.8 11.7L12.9 4.6C13.5 4 14.4 4 15 4.6L15.4 5C16 5.6 16 6.5 15.4 7.1L8.3 14.2L5 14.8Z" stroke="currentColor" stroke-width="1.55" stroke-linejoin="round"/>
        <path d="M11.9 5.6L14.4 8.1" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>
        <path d="M4.5 16H15.5" stroke="currentColor" stroke-width="1.55" stroke-linecap="round"/>
      </svg>
    </span>`,
    delete: `
    <span class="action-icon" aria-hidden="true">
      <svg viewBox="0 0 20 20" fill="none">
        <path d="M6.5 7.2V15.2H13.5V7.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M5.2 5.3H14.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M8 5.2V3.8H12V5.2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M8.5 9.2V13.2M11.5 9.2V13.2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
    </span>`,
};

const $$ = (selector, root = document) => root?.querySelectorAll ? [...root.querySelectorAll(selector)] : [];
const sameId = (left, right) => left != null && right != null && String(left) === String(right);

const api = async (url, options = {}) => {
    const headers = {...(options.headers || {})};
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    const method = String(options.method || 'GET').toUpperCase();
    const requestUrl = method === 'GET'
        ? `${url}${url.includes('?') ? '&' : '?'}_=${Date.now()}`
        : url;
    const response = await fetch(requestUrl, {
        ...options,
        headers,
        cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
        const error = new Error(data.error || 'Erro inesperado.');
        error.status = response.status;
        throw error;
    }
    return data;
};

const toast = (message) => {
    const el = $('[data-toast]');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3200);
};

const scheduleDirectSend = ({recipientId, contents, onPending, onSent, onUndone, onFailed}) => {
    const el = $('[data-toast]');
    if (!el || !recipientId || !contents) return;

    const isEnglish = document.documentElement.lang?.toLowerCase().startsWith('en');
    const pendingLabel = isEnglish ? 'Message sent.' : 'Mensagem enviada.';
    const undoLabel = isEnglish ? 'Undo' : 'Desfazer';
    el.replaceChildren();

    const message = document.createElement('span');
    message.textContent = pendingLabel;
    const undo = document.createElement('button');
    undo.type = 'button';
    undo.className = 'toast-action';
    undo.textContent = undoLabel;
    el.append(message, undo);
    el.classList.add('show');
    clearTimeout(el._timer);

    let pending = true;
    const pendingToken = onPending?.();
    const toastToken = Symbol('direct-send');
    el._directSendToken = toastToken;
    const dismiss = () => {
        if (el._directSendToken !== toastToken) return;
        el.classList.remove('show');
        el._timer = setTimeout(() => {
            if (el._directSendToken === toastToken) el.replaceChildren();
        }, 220);
    };

    const sendTimer = setTimeout(async () => {
        if (!pending) return;
        pending = false;
        undo.disabled = true;
        dismiss();

        try {
            const result = await api('/api/directs', {
                method: 'POST',
                body: JSON.stringify({recipientId, contents}),
            });
            await onSent?.(result, pendingToken);
        } catch (error) {
            await onFailed?.(error, pendingToken);
            toast(error.message);
        }
    }, 5000);

    undo.addEventListener('click', async () => {
        if (!pending) return;
        pending = false;
        clearTimeout(sendTimer);
        dismiss();
        await onUndone?.(pendingToken);
    }, {once: true});
};


const setFormMessage = (element, message = '', type = 'info') => {
    if (!element) return;
    element.textContent = message;
    element.dataset.type = type;
    element.hidden = !message;
};

const setButtonLoading = (button, loading, label = 'Verificando…') => {
    if (!button) return;
    if (loading) {
        if (!button.hasAttribute('data-original-content')) {
            button.dataset.originalContent = button.innerHTML;
        }
        button.disabled = true;
        button.classList.add('is-loading');
        button.setAttribute('aria-busy', 'true');
        button.innerHTML = `<span class="button-spinner" aria-hidden="true"></span>${label ? `<span>${label}</span>` : ''}`;
        return;
    }
    button.disabled = false;
    button.classList.remove('is-loading');
    button.removeAttribute('aria-busy');
    if (button.hasAttribute('data-original-content')) {
        button.innerHTML = button.dataset.originalContent;
        delete button.dataset.originalContent;
    }
};

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
}[char]));

let currentUser = null;
let posts = [];
let specificSiblingStubs = [];
const MIN_SITE_REFRESH_INTERVAL_MS = 2000;
const FEED_BATCH_SIZE = 20;
const feedBuckets = {all: []};
const splitFeedLimits = {};
const COLUMN_GROUPS = {
    sex: getSexColumnDefinitions(),
    relevance: getRelevanceColumnDefinitions(),
    users: getUserColumnDefinitions(),
};
let feedColumnObservers = [];
let feedRevealObserver = null;
let feedTimer = null;
let hasRenderedFeed = false;
const feedSyncChannel = typeof BroadcastChannel === 'function' ? new BroadcastChannel('murmurinho-feed-sync') : null;
let feedSyncListenersBound = false;

function announceFeedChanged() {
    feedSyncChannel?.postMessage({type: 'feed-changed', at: Date.now()});
}

function bindFeedSyncEvents() {
    if (feedSyncListenersBound) return;
    feedSyncListenersBound = true;

    feedSyncChannel?.addEventListener('message', event => {
        if (event.data?.type === 'feed-changed') loadFeed(true).catch(() => {
        });
    });

    const refresh = () => {
        void loadFeed(true).catch(() => {
        });
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('pageshow', refresh);
    window.addEventListener('online', refresh);

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            refresh();
        }
    });

}

