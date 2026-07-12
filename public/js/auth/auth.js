// noinspection JSUnresolvedReference

function bindAuth() {
    $('[data-signup-form]')?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const message = $('[data-form-message]', form);
        const submit = $('button[type="submit"]', form);

        setFormMessage(message);
        setButtonLoading(submit, true, 'Criando conta…');

        try {
            await api('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({
                    username: form.username.value,
                    email: form.email.value,
                    password: form.password.value,
                    confirmPassword: form.confirmPassword.value,
                }),
            });
            location.replace('/');
        } catch (error) {
            setFormMessage(message, error.message, 'error');
            setButtonLoading(submit, false);
        }
    });

    $('[data-login-form]')?.addEventListener('submit', async event => {
        event.preventDefault();
        const form = event.currentTarget;
        const message = $('[data-form-message]', form);
        const submit = $('button[type="submit"]', form);
        setFormMessage(message);
        setButtonLoading(submit, true, 'Verificando…');

        try {
            await api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({
                    identifier: form.identifier.value,
                    password: form.password.value,
                    remember: form.remember.checked,
                }),
            });
            setFormMessage(message, 'Credenciais verificadas. Entrando…', 'success');
            location.href = '/';
        } catch (error) {
            setFormMessage(message, error.message, 'error');
            setButtonLoading(submit, false);
        }
    });

    const googleRoot = $('[data-google-login]');
    if (googleRoot) {
        const start = () => {
            if (!window.google?.accounts?.id) return setTimeout(start, 100);
            // noinspection JSUnusedGlobalSymbols
            google.accounts.id.initialize({
                client_id: googleRoot.dataset.googleClientId, callback: async response => {
                    const message = $('[data-google-message]');
                    setFormMessage(message, 'Verificando sua conta Google…', 'info');
                    try {
                        await api('/api/auth/google', {method: 'POST', body: JSON.stringify({credential: response.credential})});
                        setFormMessage(message, 'Conta confirmada. Entrando…', 'success');
                        location.href = '/';
                    } catch (error) {
                        setFormMessage(message, error.message, 'error');
                    }
                }
            });
            const googleButton = $('[data-google-button]');
            const availableWidth = googleButton.clientWidth || googleButton.getBoundingClientRect().width || 0;
            const safeWidth = Math.max(220, Math.floor(Math.min(380, availableWidth - 12)));
            google.accounts.id.renderButton(googleButton, {
                theme: document.documentElement.dataset.theme === 'dark' ? 'filled_black' : 'outline',
                size: 'large',
                shape: 'pill',
                width: safeWidth,
                text: 'continue_with',
            });
        };
        start();
    }
}

