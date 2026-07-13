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

function applyOptimisticVoteState(card, selectedButton) {
    const selectedValue = Number(selectedButton?.dataset.vote || 0);
    const wasActive = selectedButton?.getAttribute('aria-pressed') === 'true';
    card?.querySelectorAll('[data-vote]').forEach(button => {
        const active = !wasActive && Number(button.dataset.vote) === selectedValue;
        button.classList.toggle('active', active);
        button.classList.toggle('is-led-active', active);
        button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}
