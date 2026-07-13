function closeInlineEditor(card) {
    const editor = card?.querySelector('[data-inline-edit-form]');
    const textLink = card?.querySelector(':scope > .murmur-text-link');
    editor?.remove();
    if (textLink) textLink.hidden = false;
    card?.classList.remove('is-editing');
}

function openInlineEditor(card) {
    if (!card || card.querySelector('[data-inline-edit-form]')) return;
    document.querySelectorAll('[data-inline-edit-form]').forEach(editor => closeInlineEditor(editor.closest('[data-post-id]')));
    const textLink = card.querySelector(':scope > .murmur-text-link');
    const textNode = textLink?.querySelector('.murmur-text');
    if (!textLink || !textNode) return;

    const form = document.createElement('form');
    form.className = 'murmur-inline-edit';
    form.dataset.inlineEditForm = '';
    form.innerHTML = `<textarea maxlength="${TEXT_LIMIT}" required aria-label="Texto do murmúrio"></textarea><div class="murmur-inline-edit-actions"><button class="button" type="button" data-cancel-edit-post>Cancelar</button><button class="button primary" type="submit">Salvar</button></div>`;
    const textarea = form.querySelector('textarea');
    textarea.value = textNode.textContent || '';
    textLink.hidden = true;
    textLink.insertAdjacentElement('afterend', form);
    card.classList.add('is-editing');
    textarea.focus({preventScroll: true});
    textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

function updateCardPulse(card) {
    if (!card) return;
    const positive = Number(card.querySelector('[data-vote="1"] > .action-count')?.textContent || 0);
    const negative = Number(card.querySelector('[data-vote="-1"] > .action-count')?.textContent || 0);
    const value = positive - negative;
    const pulse = card.querySelector('[data-murmur-pulse]');
    if (!pulse || !window.MurmurPulse) return;

    const level = window.MurmurPulse.getLevel(value);
    const direction = window.MurmurPulse.getDirection(value);
    pulse.className = `murmur-pulse murmur-pulse--${level} murmur-pulse--${direction}`;
    pulse.dataset.pulseValue = String(value);
    pulse.title = `Pulso do murmúrio: saldo de ${value}: ecos menos silenciamentos`;
    pulse.setAttribute('aria-label', pulse.title);
    const valueNode = pulse.querySelector('.murmur-pulse__value');
    if (valueNode) valueNode.textContent = String(value);
}

function applyVoteStateToCard(card, selectedValue, previousValue) {
    if (!card) return;
    const nextValue = previousValue === selectedValue ? 0 : selectedValue;

    card.querySelectorAll('[data-vote]').forEach(button => {
        const buttonValue = Number(button.dataset.vote || 0);
        const countNode = button.querySelector(':scope > .action-count');
        let count = Number(countNode?.textContent || 0);
        if (previousValue === buttonValue) count = Math.max(0, count - 1);
        if (nextValue === buttonValue) count += 1;
        if (countNode) countNode.textContent = String(count);

        const active = nextValue === buttonValue;
        button.classList.toggle('active', active);
        button.classList.toggle('is-led-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    card.classList.toggle('actions-pinned', nextValue !== 0 || Boolean(card.querySelector('[data-reply][aria-pressed="true"]')));
    updateCardPulse(card);
}

function applyOptimisticVoteState(card, selectedButton) {
    const selectedValue = Number(selectedButton?.dataset.vote || 0);
    const activeButton = card?.querySelector('[data-vote][aria-pressed="true"]');
    const previousValue = Number(activeButton?.dataset.vote || 0);
    const postId = String(card?.dataset.postId || '');
    if (!postId) return;

    document.querySelectorAll(`[data-post-id="${CSS.escape(postId)}"]`).forEach(postCard => {
        applyVoteStateToCard(postCard, selectedValue, previousValue);
    });
}
