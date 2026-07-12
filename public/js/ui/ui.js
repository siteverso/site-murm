function closeModal() {
    $('[data-modal]')?.remove();
}

function focusModalField(selector) {
    const focus = () => {
        const field = $(selector);
        if (!field) return;
        field.focus({preventScroll: true});
        const length = field.value.length;
        field.setSelectionRange?.(length, length);
    };

    requestAnimationFrame(() => requestAnimationFrame(focus));
    setTimeout(focus, 80);
}

function modal(content, className = '') {
    closeModal();
    document.body.insertAdjacentHTML('beforeend', `<div class="modal-backdrop" data-modal role="dialog" aria-modal="true"><div class="panel modal-card ${className}"><button class="modal-close" type="button" data-modal-close aria-label="Fechar">×</button>${content}</div></div>`);
}

function progressMarkup() {
    return `<div class="murmur-progress" data-murmur-progress aria-label="0 de ${TEXT_LIMIT} caracteres usados">
    <span class="murmur-progress-track"><span class="murmur-progress-fill" data-progress-fill></span></span>
    <span class="murmur-progress-value" data-progress-value>0/${TEXT_LIMIT}</span>
  </div>`;
}

function interpolateProgressColor(ratio) {
    const clampedRatio = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0));
    const start = {r: 255, g: 255, b: 255};
    const end = {r: 255, g: 76, b: 76};
    const mixChannel = (from, to) => Math.round(from + (to - from) * clampedRatio);
    return {
        r: mixChannel(start.r, end.r),
        g: mixChannel(start.g, end.g),
        b: mixChannel(start.b, end.b),
    };
}

function updateTextProgress(field) {
    const form = field.closest('form');
    const progress = form?.querySelector('[data-murmur-progress]');
    if (!progress) return;
    const used = Math.min(field.value.length, TEXT_LIMIT);
    const ratio = Math.max(0, Math.min(1, used / TEXT_LIMIT));
    const percent = ratio * 100;
    const fill = progress.querySelector('[data-progress-fill]');
    const value = progress.querySelector('[data-progress-value]');
    const color = interpolateProgressColor(ratio);
    if (fill) fill.style.width = `${percent}%`;
    if (value) value.textContent = `${used}/${TEXT_LIMIT}`;
    progress.style.setProperty('--murmur-progress-r', String(color.r));
    progress.style.setProperty('--murmur-progress-g', String(color.g));
    progress.style.setProperty('--murmur-progress-b', String(color.b));
    progress.style.setProperty('--murmur-progress-glow-opacity', `${0.14 + ratio * 0.34}`);
    progress.setAttribute('aria-label', `${used} de ${TEXT_LIMIT} caracteres usados`);
    progress.classList.toggle('at-limit', ratio >= 1);
}

function openComposer() {
    modal(`<h2>Novo murmúrio</h2><form data-floating-composer><textarea maxlength="${TEXT_LIMIT}" autofocus placeholder="O que está murmurando?" required></textarea><div class="modal-actions">${progressMarkup()}<button class="button primary">Murmurar</button></div></form>`);
    const field = $('[data-floating-composer] textarea');
    if (field) updateTextProgress(field);
    focusModalField('[data-floating-composer] textarea');
}

function openDirectComposer(userId, username) {
    modal(`<h2>Enviar bilhete</h2><p class="modal-subtitle">Para @${escapeHtml(username)}</p><form data-direct-compose><input type="hidden" name="recipientId" value="${userId}"><textarea maxlength="${TEXT_LIMIT}" autofocus placeholder="Escreva seu bilhete…" required></textarea><div class="modal-actions"><span>Entrega discreta</span><button class="button primary">Enviar bilhete</button></div></form>`, 'direct-compose-modal');
}

function bindUi() {
    document.addEventListener('input', event => {
        const field = event.target.closest?.('[data-composer] textarea, [data-floating-composer] textarea');
        if (field) updateTextProgress(field);
    });
    $$('[data-composer] textarea').forEach(updateTextProgress);

    document.addEventListener('click', event => {
        if (event.target.matches('[data-modal], [data-modal-close]')) closeModal();
        if (event.target.closest('[data-new-murmur]')) openComposer();
        if (event.target.closest('[data-scroll-top]')) window.scrollTo({top: 0, behavior: 'smooth'});
    });
    document.addEventListener('keydown', event => {
        const activeModal = $('[data-modal]');
        if (!activeModal) return;

        if (event.key === 'Escape') {
            event.preventDefault();
            closeModal();
            return;
        }

        if (
            event.key === 'Enter'
            && !event.repeat
            && !event.isComposing
            && !event.ctrlKey
            && !event.altKey
            && !event.metaKey
            && !event.shiftKey
        ) {
            const confirmDeleteButton = activeModal.querySelector('[data-confirm-delete-post]');
            if (!confirmDeleteButton || confirmDeleteButton.disabled) return;
            event.preventDefault();
            confirmDeleteButton.click();
        }
    });
    window.addEventListener('scroll', () => $('[data-scroll-top]')?.classList.toggle('visible', scrollY > 500), {passive: true});
    $('[data-theme-toggle]')?.addEventListener('click', () => {
        const next = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = next;
        document.cookie = `murmurinho-theme=${next};path=/;max-age=31536000`;
    });
    $('[data-logout]')?.addEventListener('click', async () => {
        await api('/api/auth/logout', {method: 'POST'});
        location.href = '/login';
    });
}


