// A separate file, not inline, so the Content-Security-Policy can stay script-src 'self'.
// The storage key must match THEME_STORAGE_KEY in src/shared/lib/theme.ts.
(function () {
  var preference = null;
  try {
    preference = localStorage.getItem('imp-theme');
  } catch (_) {
    // Storage can be blocked. Fall through to the system setting.
  }
  var dark =
    preference === 'dark' ||
    (preference !== 'light' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
})();
