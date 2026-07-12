function userInitials(username = '') {
    return String(username).trim().slice(0, 2).toUpperCase() || 'MU';
}

function renderAvatar(el, user) {
    el.replaceChildren();
    if (user.avatarUrl) {
        const image = document.createElement('img');
        image.src = user.avatarUrl;
        image.alt = `Foto de @${user.username}`;
        image.loading = 'lazy';
        image.decoding = 'async';
        image.className = 'lazy-media';
        image.loading = 'eager';
        const revealImage = () => image.classList.add('is-loaded');
        image.addEventListener('load', revealImage, { once: true });
        el.append(image);
        if (image.complete && image.naturalWidth > 0) revealImage();
        return;
    }
    el.textContent = userInitials(user.username);
}

function renderUser(user) {
    if (!user) return;

    if (typeof applyTheme === 'function') applyTheme(user.themeCode);

    $$('[data-user-avatar]').forEach(el => renderAvatar(el, user));
    $$('[data-user-name]').forEach(el => {
        el.textContent = `@${user.username}`;
    });
    $$('[data-own-profile-link]').forEach(el => {
        el.href = `/perfil/${encodeURIComponent(user.username)}`;
    });
    $$('[data-profile-avatar]').forEach(el => renderAvatar(el, user));
    $$('[data-profile-username]').forEach(el => {
        el.textContent = `@${user.username}`;
    });
    $$('[data-profile-email]').forEach(el => {
        el.textContent = user.email;
    });
    $$('[data-profile-sex]').forEach(el => {
        el.textContent = user.sexCode === 'M' ? 'Masculino' : user.sexCode === 'F' ? 'Feminino' : 'Sexo não informado';
    });
    $$('[data-profile-country]').forEach(el => {
        el.textContent = user.countryName ? `${user.countryName}${user.countryCallingCode ? ` · ${user.countryCallingCode}` : ''}` : '';
        el.hidden = !user.countryName;
    });
    $$('[data-profile-bio]').forEach(el => {
        el.textContent = user.bio || 'Sem biografia ainda.';
    });
    $$('[data-profile-posts]').forEach(el => {
        el.textContent = user.postCount;
    });
    $$('[data-profile-positive]').forEach(el => {
        el.textContent = user.positiveCount;
    });
    $$('[data-profile-messages]').forEach(el => {
        el.textContent = user.messageCount;
    });
    $$('[data-profile-responses]').forEach(el => {
        el.textContent = user.responseCount;
    });

    const profileForm = $('[data-profile-form]');
    if (profileForm) {
        const usernameInput = profileForm.username;
        const usernameRule = $('[data-username-rule]', profileForm);
        usernameInput.value = user.username;
        usernameInput.disabled = !user.usernameCanChange;

        if (user.usernameChangeCount >= 1) {
            usernameRule.textContent = 'Usuário bloqueado: a única correção permitida para esta conta já foi utilizada.';
            usernameRule.dataset.type = 'locked';
        } else if (!user.usernameCanChange && user.usernameChangeAvailableAt) {
            const availableDate = new Date(user.usernameChangeAvailableAt).toLocaleDateString();
            usernameRule.textContent = `A única correção do usuário ficará disponível em ${availableDate}.`;
            usernameRule.dataset.type = 'waiting';
        } else {
            usernameRule.textContent = 'Uma única correção está disponível. Depois de salvar, o usuário ficará bloqueado definitivamente.';
            usernameRule.dataset.type = 'warning';
        }

        const emailInput = profileForm.email;
        const emailRule = $('[data-email-rule]', profileForm);
        emailInput.value = user.email;
        emailInput.disabled = !user.emailCanChange;

        if (!user.emailCanChange && user.emailChangeAvailableAt) {
            const availableDate = new Date(user.emailChangeAvailableAt).toLocaleDateString();
            emailRule.textContent = `O e-mail poderá ser alterado novamente em ${availableDate}.`;
            emailRule.dataset.type = 'waiting';
        } else {
            emailRule.textContent = 'Você pode alterar o e-mail agora. Após salvar, uma nova troca só será permitida em 30 dias.';
            emailRule.dataset.type = 'warning';
        }
        const sexSelect = profileForm.sexCode;
        const sexRule = $('[data-sex-rule]', profileForm);
        sexSelect.value = user.sexCode || '';
        sexSelect.disabled = Boolean(user.sexCode && !user.sexCanChange);

        if (!user.sexCode) {
            sexRule.textContent = 'Defina com atenção. Depois, apenas uma correção será permitida, após 30 dias.';
            sexRule.dataset.type = 'info';
        } else if (user.sexChangeCount >= 1) {
            sexRule.textContent = 'Sexo bloqueado: a única correção permitida para esta conta já foi utilizada.';
            sexRule.dataset.type = 'locked';
        } else if (!user.sexCanChange && user.sexChangeAvailableAt) {
            const availableDate = new Date(user.sexChangeAvailableAt).toLocaleDateString();
            sexRule.textContent = `Você poderá fazer a única correção a partir de ${availableDate}.`;
            sexRule.dataset.type = 'waiting';
        } else {
            sexRule.textContent = 'Uma única correção está disponível. Depois de salvar, o sexo ficará bloqueado definitivamente.';
            sexRule.dataset.type = 'warning';
        }

        profileForm.countryCode.value = user.countryCode || '';
        profileForm.countryName.value = user.countryName || '';
        profileForm.countryCallingCode.value = user.countryCallingCode || '';

        // 20260712-1542
        const countrySearchInput = profileForm.elements.namedItem('countrySearch');
        if (countrySearchInput instanceof HTMLInputElement) {
            countrySearchInput.value = user.countryName || '';
        }

        const countryDdi = $('[data-country-calling-code]', profileForm);
        if (countryDdi) {
            countryDdi.textContent = user.countryCallingCode || '';
            countryDdi.hidden = !user.countryCallingCode;
        }
        profileForm.preferredLanguageCode.value = user.preferredLanguageCode || 'pt-BR';
        profileForm.bio.value = user.bio || '';

    }

    const methods = [];
    if (user.hasPassword) methods.push('Senha');
    if (user.hasGoogle) methods.push('Google');
    const methodsEl = $('[data-auth-methods]');
    if (methodsEl) methodsEl.textContent = methods.join(' + ') || 'Nenhum';

    const explanation = $('[data-auth-explanation]');
    if (explanation) {
        explanation.textContent = user.hasGoogle
            ? 'Sua conta pode ser acessada pelo Google. Você também pode definir ou trocar uma senha abaixo.'
            : 'Sua conta usa acesso por usuário/e-mail e senha.';
    }

    const passwordTitle = $('[data-password-title]');
    if (passwordTitle) passwordTitle.textContent = user.hasPassword ? 'Trocar senha' : 'Definir senha';
    const passwordButton = $('[data-password-form] button[type="submit"]');
    if (passwordButton) passwordButton.textContent = user.hasPassword ? 'Trocar senha' : 'Definir senha';
}

async function loadUser() {
    try {
        const data = await api('/api/auth/me');
        currentUser = data.user || null;
        renderUser(currentUser);
        return currentUser;
    } catch (error) {
        currentUser = null;
        if (error.status === 401 && document.body.dataset.authRequired === 'true' && !location.pathname.startsWith('/login')) {
            location.href = '/login';
        } else if (error.status !== 401) {
            toast(error.message);
        }
        return null;
    }
}

function renderPostHeaderActions(post) {
    const directButton = sameId(currentUser?.id, post.userId)
        ? ''
        : `<button class="direct-card-button" type="button" data-direct-user="${post.userId}" data-direct-name="${escapeHtml(post.author)}" title="Enviar bilhete" aria-label="Enviar bilhete">${ICONS.direct}</button>`;
    const deleteAttribute = post.parentPostId ? `data-delete-reply="${post.id}"` : `data-delete-post="${post.id}"`;
    const isOwner = sameId(currentUser?.id, post.userId);
    const editButton = isOwner
        ? `<button class="direct-card-button murmur-edit-button" type="button" data-edit-post="${post.id}" title="Editar murmúrio" aria-label="Editar murmúrio">${ICONS.edit}</button>`
        : '';
    const deleteButton = isOwner
        ? `<button class="direct-card-button murmur-delete-button" type="button" ${deleteAttribute} title="Apagar murmúrio" aria-label="Apagar murmúrio">${ICONS.delete}</button>`
        : '';
    return `<div class="murmur-head-actions">${editButton}${deleteButton}${directButton}</div>`;
}

