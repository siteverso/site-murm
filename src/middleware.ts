import { defineMiddleware } from 'astro:middleware';
import { currentUser } from './lib/server/session';

const publicPages = new Set([
    '/login',
    '/criar-conta',
    '/lembrar-senha',
]);

export const onRequest = defineMiddleware(async (context, next) => {
    const pathname = context.url.pathname.replace(/\/$/, '') || '/';

    if (pathname.startsWith('/api/') || publicPages.has(pathname)) {
        return next();
    }

    const user = await currentUser(context);

    if (!user) {
        const loginUrl = new URL('/login', context.url);
        loginUrl.searchParams.set('returnTo', `${context.url.pathname}${context.url.search}`);
        return context.redirect(loginUrl.toString());
    }

    return next();
});
