// Google Analytics with a simple consent gate.
//
// Cloudflare Web Analytics runs separately (cookieless, auto-injected, no
// consent needed). GA4 sets cookies, so it only loads after the visitor
// clicks Accept; the choice is remembered in localStorage and the banner
// doesn't reappear. Declining leaves GA unloaded entirely.
(function () {
  var GA_ID = 'G-G6WS09KNKH';
  var KEY = 'lp-analytics-consent';

  function loadGA() {
    if (window.__gaLoaded) return;
    window.__gaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID);
  }

  var choice = null;
  try { choice = localStorage.getItem(KEY); } catch (e) {}
  if (choice === 'granted') { loadGA(); return; }
  if (choice === 'denied') { return; }

  function decide(val) {
    try { localStorage.setItem(KEY, val); } catch (e) {}
    if (val === 'granted') loadGA();
    var el = document.getElementById('lp-consent');
    if (el) el.remove();
  }

  function showBanner() {
    if (document.getElementById('lp-consent')) return;
    var bar = document.createElement('div');
    bar.id = 'lp-consent';
    bar.setAttribute('role', 'dialog');
    bar.setAttribute('aria-label', 'Analytics consent');
    bar.style.cssText = 'position:fixed;bottom:0;left:0;right:0;z-index:99999;background:var(--surface,#161616);border-top:1px solid var(--gold,#F5C020);color:var(--text,#F0EDE6);font-family:"IBM Plex Mono",monospace;font-size:.78rem;line-height:1.6;padding:.85rem 1.25rem;display:flex;align-items:center;justify-content:center;gap:.9rem;flex-wrap:wrap;';

    var txt = document.createElement('span');
    txt.style.cssText = 'max-width:620px;';
    txt.textContent = 'We use Google Analytics to understand site traffic. Privacy-friendly analytics runs either way.';

    var accept = document.createElement('button');
    accept.type = 'button';
    accept.textContent = 'Accept';
    accept.style.cssText = 'font-family:inherit;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;font-weight:700;cursor:pointer;background:var(--gold,#F5C020);color:var(--off-black,#0E0E0E);border:none;padding:.45rem 1.1rem;';

    var decline = document.createElement('button');
    decline.type = 'button';
    decline.textContent = 'Decline';
    decline.style.cssText = 'font-family:inherit;font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;cursor:pointer;background:transparent;color:var(--muted,#9a9a9a);border:1px solid var(--border,#2C2C2C);padding:.45rem 1.1rem;';

    accept.addEventListener('click', function () { decide('granted'); });
    decline.addEventListener('click', function () { decide('denied'); });

    bar.appendChild(txt);
    bar.appendChild(accept);
    bar.appendChild(decline);
    document.body.appendChild(bar);
  }

  if (document.body) showBanner();
  else document.addEventListener('DOMContentLoaded', showBanner);
})();
