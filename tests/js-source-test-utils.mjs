import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';

const modulePaths = [
  '../public/js/core/runtime.js',
  '../public/js/user/user.js',
  '../public/js/posts/posts-and-replies.js',
  '../public/js/feed/feed-renderer.js',
  '../public/js/feed/feed-view-controller.js',
  '../public/js/feed/reply-thread-controller.js',
  '../public/js/feed/inline-post-editor.js',
  '../public/js/feed/published-reply-controller.js',
  '../public/js/feed/feed-interactions.js',
  '../public/js/ui/ui.js',
  '../public/js/profile/profile.js',
  '../public/js/auth/auth.js',
  '../public/js/directs/directs.js',
  '../public/js/core/bootstrap.js',
];

export async function readAppSource() {
  const chunks = await Promise.all(modulePaths.map(path => readFile(new URL(path, import.meta.url), 'utf8')));
  return chunks.join('\n');
}

export function readAppSourceSync() {
  return modulePaths.map(path => readFileSync(new URL(path, import.meta.url), 'utf8')).join('\n');
}
