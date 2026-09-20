const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'evidence.html'), 'utf8');
const tracker = fs.readFileSync(path.join(root, 'assets/js/evidence-tracking.js'), 'utf8');
const bootstrap = html.match(/<script>\s*([\s\S]*?)<\/script>/)[1];

function load(url, repeats = 1) {
  const location = new URL(url, 'https://beneaththepinestv.com');
  const context = { URLSearchParams, location };
  context.window = context;
  vm.createContext(context);
  vm.runInContext(bootstrap, context);
  for (let i = 0; i < repeats; i++) vm.runInContext(tracker, context);
  return context.dataLayer.map(args => Array.from(args)).filter(args => args[0] === 'event');
}

test('page loads exactly one deferred tracker after the GA bootstrap', () => {
  assert.equal((html.match(/src="\/assets\/js\/evidence-tracking.js"/g) || []).length, 1);
  assert.match(html, /<script defer src="\/assets\/js\/evidence-tracking.js"><\/script>/);
  assert.ok(html.indexOf("gtag('config'") < html.indexOf('src="/assets/js/evidence-tracking.js"'));
});

for (let n = 1; n <= 25; n++) {
  const id = String(n).padStart(3, '0');
  test(`issued package ${id} stays distinct on both supported paths`, () => {
    for (const pathname of ['/evidence.html', '/evidence']) {
      const events = load(`${pathname}?id=${id}`, 2);
      assert.equal(events.length, 1);
      assert.equal(events[0][1], 'evidence_open');
      assert.equal(events[0][2].package_id, `PKG-${id}`);
      assert.equal(events[0][2].package_number, id);
      assert.equal(events[0][2].package_group, n <= 20 ? 'recipient' : 'test');
      assert.equal(events[0][2].tracking_version, 'package-v1');
      assert.equal(events[0][2].send_to, 'G-TNJHHH9DLY');
    }
  });
}

for (const query of ['', '?id=', '?id=000', '?id=026', '?id=999', '?id=1', '?id=21', '?id=0021', '?id=-01', '?id=abc', '?id=021%20', '?id=021&id=021', '?id=004&id=018', '?ID=021', '?id=21.0', '?id=%3Cscript%3E']) {
  test(`no attribution for ${query || 'missing ID'}`, () => assert.equal(load('/evidence.html' + query).length, 0));
}

test('other pages never create package attribution', () => {
  for (const pathname of ['/', '/family-tradition.html', '/evidence/021']) assert.equal(load(pathname + '?id=021').length, 0);
});
test('unrelated parameters and URL encoding do not mix up IDs', () => {
  assert.equal(load('/evidence.html?id=004&utm_source=card')[0][2].package_id, 'PKG-004');
  assert.equal(load('/evidence.html?id=%30%30%31')[0][2].package_id, 'PKG-001');
});
test('a new page load records another open; duplicate execution does not', () => {
  assert.equal(load('/evidence.html?id=021', 3).length, 1);
  assert.equal(load('/evidence.html?id=021').length, 1);
});
test('missing analytics fails harmlessly', () => {
  assert.doesNotThrow(() => vm.runInNewContext(tracker, {
    window: { location: { pathname: '/evidence.html', search: '?id=021' } }, URLSearchParams
  }));
});
