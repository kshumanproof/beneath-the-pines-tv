/* Package attribution only. No video tracking, recipient data, or local storage. */
(function () {
  'use strict';

  // Both existing URLs serve the same evidence page. Do not attribute other pages.
  if (!/^\/evidence(?:\.html)?\/?$/.test(window.location.pathname)) return;
  var ids = new URLSearchParams(window.location.search).getAll('id');
  if (ids.length !== 1 || !/^[0-9]{3}$/.test(ids[0])) return;
  var id = ids[0];

  // Only issued IDs are valid. Extend this range when more packages are prepared.
  if (Number(id) < 1 || Number(id) > 25) return;
  if (window.__familyTraditionEvidenceOpenQueued || typeof window.gtag !== 'function') return;
  window.__familyTraditionEvidenceOpenQueued = true;

  // GA may coerce numeric-looking custom dimensions. The prefix protects zeroes;
  // the Command Center can remove "PKG-" to recover the exact three-digit ID.
  window.gtag('event', 'evidence_open', {
    package_id: 'PKG-' + id,
    package_number: id,
    package_group: Number(id) <= 20 ? 'recipient' : 'test',
    tracking_version: 'package-v1',
    send_to: 'G-TNJHHH9DLY'
  });
})();
