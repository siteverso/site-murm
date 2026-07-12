import { formatDateTime, getSexColumnDefinitions, hasUnreadMessages } from '/app-utils.mjs';

window.MurmAppUtils = Object.freeze({
  formatDateTime,
  getSexColumnDefinitions,
  hasUnreadMessages,
});

const scripts = ["/js/core/runtime.js", "/js/user/user.js", "/js/posts/murmur-pulse.js", "/js/posts/posts-and-replies.js", "/js/feed/feed-renderer.js", "/js/feed/feed-interactions.js", "/js/ui/ui.js", "/js/profile/profile.js", "/js/auth/auth.js", "/js/directs/directs.js", "/js/core/bootstrap.js"];

async function loadClassicScript(src) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=20260712-profile-reply-expand-1`;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar módulo JavaScript: ${src}`));
    document.head.appendChild(script);
  });
}

for (const src of scripts) {
  await loadClassicScript(src);
}
