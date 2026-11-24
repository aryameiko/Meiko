/* Apply the saved theme before first paint to avoid a flash. A separate file (not inline) so the
 * Content-Security-Policy can forbid inline scripts. */
try { var t = JSON.parse(localStorage.getItem('meiko:v1:settings') || '{}').theme; if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t); } catch (e) {}
