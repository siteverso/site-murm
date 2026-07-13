import { formatDateTime, getRelevanceColumnDefinitions, getSexColumnDefinitions, getUserColumnDefinitions, hasUnreadMessages } from '/app-utils.mjs';

window.MurmAppUtils = Object.freeze({
  formatDateTime,
  getRelevanceColumnDefinitions,
  getSexColumnDefinitions,
  getUserColumnDefinitions,
  hasUnreadMessages,
});

const scripts = ["/js/feed/core/feed-contracts.js", "/js/feed/core/feed-context.js", "/js/core/runtime.js", "/js/user/user.js", "/js/posts/murmur-pulse.js", "/js/posts/posts-and-replies.js", "/js/feed/feed-renderer.js", "/js/feed/deck-return-motion.js", "/js/feed/card-deck.js", "/js/feed/random-murmur.js", "/js/feed/feed-view-controller.js", "/js/feed/reply-thread-controller.js", "/js/feed/inline-post-editor.js", "/js/feed/published-reply-controller.js", "/js/feed/feed-interactions.js", "/js/ui/ui.js", "/js/profile/profile.js", "/js/auth/auth.js", "/js/directs/directs.js", "/js/core/bootstrap.js"];

async function loadClassicScript(src) {
  await new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `${src}?v=20260713-feed-structure-1`;
    script.async = false;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Falha ao carregar módulo JavaScript: ${src}`));
    document.head.appendChild(script);
  });
}

for (const src of scripts) {
  await loadClassicScript(src);
}
