const uploadProfileAvatar = async (blob, message) => {
    const formData = new FormData();
    formData.append('avatar', blob, 'avatar.jpg');
    await api('/api/auth/avatar', {method: 'POST', body: formData});
    await loadUser();
    setFormMessage(message, 'Foto atualizada.', 'success');
    toast('Foto de perfil atualizada.');
};

function openAvatarCropper(file, message, input) {
    const objectUrl = URL.createObjectURL(file);
    modal(`
    <h2>Ajustar foto</h2>
    <p class="modal-subtitle">Mova a imagem e ajuste o zoom para enquadrar o perfil.</p>
    <div class="avatar-crop-stage" data-avatar-crop-stage>
      <img src="${objectUrl}" alt="Imagem escolhida para recorte" draggable="false" data-avatar-crop-image>
      <span class="avatar-crop-mask" aria-hidden="true"></span>
    </div>
    <label class="avatar-crop-zoom">
      <span>Zoom</span>
      <input type="range" min="1" max="3" value="1" step="0.01" data-avatar-crop-zoom>
    </label>
    <div class="modal-actions avatar-crop-actions">
      <button class="button secondary" type="button" data-modal-close>Cancelar</button>
      <button class="button primary" type="button" data-avatar-crop-confirm>Usar esta foto</button>
    </div>
  `, 'avatar-crop-modal');

    const backdrop = $('[data-modal]');
    const stage = $('[data-avatar-crop-stage]', backdrop);
    const image = $('[data-avatar-crop-image]', backdrop);
    const zoomInput = $('[data-avatar-crop-zoom]', backdrop);
    const confirm = $('[data-avatar-crop-confirm]', backdrop);
    if (!stage || !image || !zoomInput || !confirm) return;

    const state = {x: 0, y: 0, zoom: 1, baseScale: 1, dragging: false, pointerX: 0, pointerY: 0};
    const stageSize = () => stage.clientWidth;
    const clampPosition = () => {
        const size = stageSize();
        const width = image.naturalWidth * state.baseScale * state.zoom;
        const height = image.naturalHeight * state.baseScale * state.zoom;
        state.x = Math.max((size - width) / 2, Math.min((width - size) / 2, state.x));
        state.y = Math.max((size - height) / 2, Math.min((height - size) / 2, state.y));
    };
    const render = () => {
        clampPosition();
        image.style.transform = `translate(calc(-50% + ${state.x}px), calc(-50% + ${state.y}px)) scale(${state.baseScale * state.zoom})`;
    };
    const initializeImage = () => {
        state.baseScale = Math.max(stageSize() / image.naturalWidth, stageSize() / image.naturalHeight);
        render();
    };
    if (image.complete && image.naturalWidth) initializeImage();
    else image.addEventListener('load', initializeImage, {once: true});
    const setZoom = value => {
        const min = Number(zoomInput.min);
        const max = Number(zoomInput.max);
        state.zoom = Math.max(min, Math.min(max, value));
        zoomInput.value = state.zoom.toFixed(2);
        render();
    };
    zoomInput.addEventListener('input', () => {
        setZoom(Number(zoomInput.value));
    });
    stage.addEventListener('wheel', event => {
        event.preventDefault();
        const direction = event.deltaY < 0 ? 1 : -1;
        setZoom(state.zoom + direction * 0.08);
    }, {passive: false});
    stage.addEventListener('pointerdown', event => {
        state.dragging = true;
        state.pointerX = event.clientX;
        state.pointerY = event.clientY;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add('is-dragging');
    });
    stage.addEventListener('pointermove', event => {
        if (!state.dragging) return;
        state.x += event.clientX - state.pointerX;
        state.y += event.clientY - state.pointerY;
        state.pointerX = event.clientX;
        state.pointerY = event.clientY;
        render();
    });
    const stopDragging = event => {
        state.dragging = false;
        stage.classList.remove('is-dragging');
        if (stage.hasPointerCapture?.(event.pointerId)) stage.releasePointerCapture(event.pointerId);
    };
    stage.addEventListener('pointerup', stopDragging);
    stage.addEventListener('pointercancel', stopDragging);

    confirm.addEventListener('click', async () => {
        setButtonLoading(confirm, true, 'Salvando…');
        try {
            const outputSize = 512;
            const canvas = document.createElement('canvas');
            canvas.width = outputSize;
            canvas.height = outputSize;
            const context = canvas.getContext('2d');
            if (!context) { // noinspection ExceptionCaughtLocallyJS
                throw new Error('Não foi possível preparar a imagem.');
            }
            const size = stageSize();
            const scale = state.baseScale * state.zoom;
            const displayedWidth = image.naturalWidth * scale;
            const displayedHeight = image.naturalHeight * scale;
            const left = (size - displayedWidth) / 2 + state.x;
            const top = (size - displayedHeight) / 2 + state.y;
            const sourceX = Math.max(0, -left / scale);
            const sourceY = Math.max(0, -top / scale);
            const sourceSize = size / scale;
            context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);
            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
            if (!blob) { // noinspection ExceptionCaughtLocallyJS
                throw new Error('Não foi possível recortar a imagem.');
            }
            await uploadProfileAvatar(blob, message);
            closeModal();
        } catch (error) {
            setFormMessage(message, error.message, 'error');
            setButtonLoading(confirm, false);
        }
    });

    const observer = new MutationObserver(() => {
        if (document.body.contains(backdrop)) return;
        URL.revokeObjectURL(objectUrl);
        input.value = '';
        observer.disconnect();
    });
    observer.observe(document.body, {childList: true});
}

function bindProfilePhotoViewer() {
    const trigger = $('[data-profile-photo-open]');
    const viewer = $('[data-profile-photo-viewer]');
    const largeImage = $('[data-profile-photo-large]', viewer);
    if (!trigger || !viewer || !largeImage) return;

    const close = () => {
        viewer.hidden = true;
        document.documentElement.classList.remove('profile-photo-viewer-open');
        trigger.focus({preventScroll: true});
    };

    trigger.addEventListener('click', () => {
        const image = $('img', trigger);
        if (!image?.src) return;
        largeImage.src = image.src;
        largeImage.alt = image.alt || 'Foto de perfil ampliada';
        viewer.hidden = false;
        document.documentElement.classList.add('profile-photo-viewer-open');
        $('[data-profile-photo-close]', viewer)?.focus({preventScroll: true});
    });

    $$('[data-profile-photo-close]', viewer).forEach(button => button.addEventListener('click', close));
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && !viewer.hidden) close();
    });
}


function normalizeCountrySearch(value = '') {
    return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function bindCountryPicker() {
    const picker = $('[data-country-picker]');
    if (!picker) return;
    const form = picker.closest('form');
    const input = $('[name="countrySearch"]', picker);
    const codeInput = $('[name="countryCode"]', picker);
    const nameInput = $('[name="countryName"]', picker);
    const callingInput = $('[name="countryCallingCode"]', picker);
    const callingBadge = $('[data-country-calling-code]', picker);
    const options = $('[data-country-options]', picker);
    let countries = [];
    let loaded = false;
    let activeIndex = -1;

    const close = () => {
        options.hidden = true;
        input.setAttribute('aria-expanded', 'false');
        activeIndex = -1;
    };

    const selectCountry = country => {
        input.value = country.name;
        codeInput.value = country.code;
        nameInput.value = country.name;
        callingInput.value = country.callingCode || '';
        callingBadge.textContent = country.callingCode || '';
        callingBadge.hidden = !country.callingCode;
        close();
    };

    const render = () => {
        const query = normalizeCountrySearch(input.value);
        const matches = countries.filter(country => {
            const haystack = normalizeCountrySearch(`${country.name} ${country.code} ${country.callingCode}`);
            return !query || haystack.includes(query);
        }).slice(0, 30);
        options.innerHTML = matches.length ? matches.map((country, index) => `
      <button class="country-option" type="button" role="option" data-country-index="${index}" aria-selected="false">
        <span class="country-option__flag" aria-hidden="true">${escapeHtml(country.flag || '')}</span>
        <span class="country-option__name">${escapeHtml(country.name)}</span>
        <span class="country-option__meta">${escapeHtml(country.code)}${country.callingCode ? ` · ${escapeHtml(country.callingCode)}` : ''}</span>
      </button>`).join('') : '<p class="country-options-empty">Nenhum país encontrado.</p>';
        options._matches = matches;
        options.hidden = false;
        input.setAttribute('aria-expanded', 'true');
        activeIndex = -1;
    };

    const load = async () => {
        if (loaded) return;
        options.hidden = false;
        options.innerHTML = '<p class="country-options-empty">Carregando países…</p>';
        try {
            const data = await api('/api/countries');
            countries = Array.isArray(data.countries) ? data.countries : [];
            loaded = true;
            render();
        } catch (error) {
            options.innerHTML = `<p class="country-options-empty">${escapeHtml(error.message || 'Não foi possível carregar os países.')}</p>`;
        }
    };

    input.addEventListener('focus', () => load().then(render));
    input.addEventListener('input', () => {
        if (input.value !== nameInput.value) {
            codeInput.value = '';
            nameInput.value = '';
            callingInput.value = '';
            callingBadge.hidden = true;
        }
        load().then(render);
    });
    input.addEventListener('keydown', event => {
        const buttons = $$('[data-country-index]', options);
        if (event.key === 'Escape') return close();
        if (!buttons.length || !['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowDown') activeIndex = Math.min(activeIndex + 1, buttons.length - 1);
        if (event.key === 'ArrowUp') activeIndex = Math.max(activeIndex - 1, 0);
        if (event.key === 'Enter' && activeIndex >= 0) return selectCountry(options._matches[activeIndex]);
        buttons.forEach((button, index) => {
            const active = index === activeIndex;
            button.classList.toggle('active', active);
            button.setAttribute('aria-selected', active ? 'true' : 'false');
            if (active) button.scrollIntoView({block: 'nearest'});
        });
    });
    options.addEventListener('click', event => {
        const button = event.target.closest('[data-country-index]');
        if (!button) return;
        selectCountry(options._matches[Number(button.dataset.countryIndex)]);
    });
    document.addEventListener('pointerdown', event => {
        if (!picker.contains(event.target)) close();
    });
    form?.addEventListener('submit', event => {
        if (input.value.trim() && !codeInput.value) {
            event.preventDefault();
            input.focus();
            toast('Selecione um país da lista para salvar.');
        }
    }, true);
}

function bindProfile() {
    bindProfilePhotoViewer();
    const avatarForm = $('[data-avatar-form]');
    const avatarInput = $('[data-avatar-input]', avatarForm);
    const avatarTrigger = $('[data-avatar-trigger]');
    avatarTrigger?.addEventListener('click', () => avatarInput?.click());

    avatarInput?.addEventListener('change', () => {
        const file = avatarInput.files?.[0];
        if (!file) return;
        const message = $('[data-form-message]', avatarForm);
        setFormMessage(message);
        if (file.size > 3 * 1024 * 1024) {
            setFormMessage(message, 'A imagem deve ter no máximo 3 MB.', 'error');
            avatarInput.value = '';
            return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            setFormMessage(message, 'Escolha uma imagem JPG, PNG ou WebP.', 'error');
            avatarInput.value = '';
            return;
        }
        openAvatarCropper(file, message, avatarInput);
    });

    const profileForm = $('[data-profile-form]');
    profileForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const message = $('[data-form-message]', profileForm);
        setFormMessage(message);
        const submit = $('button[type="submit"]', profileForm);
        setButtonLoading(submit, true, 'Salvando…');

        try {
            await api('/api/auth/profile', {
                method: 'PATCH',
                body: JSON.stringify({
                    username: profileForm.username.value,
                    email: profileForm.email.value,
                    sexCode: profileForm.sexCode.value,
                    countryCode: profileForm.countryCode.value,
                    countryName: profileForm.countryName.value,
                    countryCallingCode: profileForm.countryCallingCode.value,
                    preferredLanguageCode: profileForm.preferredLanguageCode.value,
                    bio: profileForm.bio.value,
                }),
            });
            await loadUser();
            setFormMessage(message, 'Perfil salvo com sucesso.', 'success');
            toast('Perfil atualizado.');
        } catch (error) {
            setFormMessage(message, error.message, 'error');
        } finally {
            setButtonLoading(submit, false);
        }
    });

    const passwordForm = $('[data-password-form]');
    passwordForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const message = $('[data-form-message]', passwordForm);
        setFormMessage(message);
        const submit = $('button[type="submit"]', passwordForm);
        setButtonLoading(submit, true, 'Atualizando…');

        try {
            await api('/api/auth/password', {
                method: 'PATCH',
                body: JSON.stringify({
                    password: passwordForm.password.value,
                    confirmPassword: passwordForm.confirmPassword.value,
                }),
            });
            passwordForm.reset();
            await loadUser();
            setFormMessage(message, 'Senha atualizada com sucesso.', 'success');
            toast('Senha atualizada.');
        } catch (error) {
            setFormMessage(message, error.message, 'error');
        } finally {
            setButtonLoading(submit, false);
        }
    });
}

