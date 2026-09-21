/*
 * Family Tradition — full film access request.
 *
 * 1. On every page (index + family-tradition), remembers where this visit
 *    came from (landing page, outside referrer, UTM tags) for the rest of
 *    the browser session, so a visitor can arrive on a campaign link,
 *    browse, and request access later without losing that attribution.
 * 2. On the Family Tradition page, runs the request form: opens the modal,
 *    validates, posts to the Google Apps Script endpoint, and shows the
 *    confirmation. Access is never granted automatically.
 */
(function () {
  'use strict';

  // Paste the Apps Script web app URL here after deploying it (see apps-script/README.md).
  var ENDPOINT = 'https://script.google.com/macros/s/AKfycby7Vh6jAMSFFpyd3yODQ07N2tvu471G61E6wxIrhc1fnSvmEux3dPnFCa2bQn-oQ0OCew/exec';
  var FALLBACK_EMAIL = 'kris@badbellafilms.com';
  var STORAGE_KEY = 'ft_attribution_v1';
  var UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];

  // ---------- Attribution ----------

  function readStored() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || null; } catch (e) { return null; }
  }

  function writeStored(value) {
    try { sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch (e) { /* storage blocked: keep in memory */ }
  }

  function externalReferrer() {
    var ref = document.referrer || '';
    if (!ref) return '';
    try {
      if (new URL(ref).hostname === location.hostname) return '';
    } catch (e) { return ''; }
    return ref;
  }

  function captureAttribution() {
    var params = new URLSearchParams(location.search);
    var utms = {};
    var hasUtm = false;
    UTM_KEYS.forEach(function (key) {
      var v = (params.get(key) || '').trim().slice(0, 200);
      utms[key] = v;
      if (v) hasUtm = true;
    });

    var stored = readStored();

    // First page of the session, or a new campaign link mid-session: start fresh.
    if (!stored || hasUtm) {
      stored = {
        landing_page: (location.pathname + location.search).slice(0, 500),
        referrer: externalReferrer().slice(0, 500)
      };
      UTM_KEYS.forEach(function (key) { stored[key] = utms[key]; });
      writeStored(stored);
    }
    return stored;
  }

  var attribution = captureAttribution();

  // ---------- Form ----------

  var modal = document.querySelector('[data-access-modal]');
  if (!modal) return; // attribution-only page

  var form = modal.querySelector('[data-access-form]');
  var formView = modal.querySelector('[data-access-form-view]');
  var doneView = modal.querySelector('[data-access-done-view]');
  var errorBox = modal.querySelector('[data-access-error]');
  var submitBtn = modal.querySelector('[data-access-submit]');
  var openedAt = 0;
  var lastFocus = null;

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params || {});
  }

  function openModal(event) {
    if (event) event.preventDefault();
    if (typeof window.closeMobileMenu === 'function') window.closeMobileMenu();
    lastFocus = document.activeElement;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
    document.documentElement.style.overflow = 'hidden';
    if (!openedAt) openedAt = Date.now();
    var first = form.querySelector('input[name="name"]');
    if (first && !formView.classList.contains('hidden')) setTimeout(function () { first.focus(); }, 50);
    track('screener_form_open');
  }

  function closeModal() {
    if (modal.classList.contains('hidden')) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
    document.documentElement.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  document.querySelectorAll('[data-access-open]').forEach(function (el) {
    el.addEventListener('click', openModal);
  });
  modal.querySelectorAll('[data-access-close]').forEach(function (el) {
    el.addEventListener('click', closeModal);
  });
  modal.addEventListener('click', function (event) {
    if (event.target === modal) closeModal();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeModal();
  });

  function showError(message) {
    errorBox.innerHTML = message;
    errorBox.classList.remove('hidden');
  }

  function fallbackMessage() {
    return 'Something went wrong sending your request. Please email <a class="underline" href="mailto:' +
      FALLBACK_EMAIL + '?subject=Family%20Tradition%20Screener%20Request">' + FALLBACK_EMAIL + '</a> instead.';
  }

  function value(name) {
    var field = form.elements[name];
    return field ? String(field.value || '').trim() : '';
  }

  form.addEventListener('submit', function (event) {
    event.preventDefault();
    errorBox.classList.add('hidden');

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    var payload = {
      name: value('name').slice(0, 120),
      email: value('email').slice(0, 254),
      company: value('company').slice(0, 160),
      role: value('role').slice(0, 160),
      heard_about: value('heard_about').slice(0, 60),
      message: value('message').slice(0, 2000),
      website: value('website'), // honeypot, should stay empty
      elapsed_ms: openedAt ? Date.now() - openedAt : 0,
      submission_page: (location.pathname + location.search).slice(0, 500),
      landing_page: attribution.landing_page || '',
      referrer: attribution.referrer || ''
    };
    UTM_KEYS.forEach(function (key) { payload[key] = attribution[key] || ''; });

    if (ENDPOINT.indexOf('https://') !== 0) {
      showError(fallbackMessage());
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    // text/plain keeps this a "simple" request so Apps Script accepts it cross-origin.
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (!data || !data.ok) throw new Error((data && data.error) || 'Request failed');
        formView.classList.add('hidden');
        doneView.classList.remove('hidden');
        track('screener_request', {
          request_id: data.id || '',
          heard_about: payload.heard_about || '(not set)'
        });
      })
      .catch(function (err) {
        if (err && err.message === 'invalid_email') {
          showError('That email address doesn’t look right. Please check it and try again.');
        } else {
          showError(fallbackMessage());
        }
      })
      .then(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Request Access';
      });
  });
})();
