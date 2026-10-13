import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, extractLinks, isAllowedLink, escapeHtml } from './markdown.mjs';

test('paragraphs, headings and lists', () => {
  const html = renderMarkdown('## Başlık\n\nİlk satır\nikinci satır\n\n- bir\n- iki');
  assert.equal(html, '<h2>Başlık</h2>\n<p>İlk satır ikinci satır</p>\n<ul><li>bir</li><li>iki</li></ul>');
});

test('bold and italic, Turkish letters intact', () => {
  assert.equal(renderMarkdown('**Şifre** ve *ığüş*'), '<p><strong>Şifre</strong> ve <em>ığüş</em></p>');
});

test('raw HTML is escaped', () => {
  const html = renderMarkdown('<script>alert(1)</script> & "x"');
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;') && html.includes('&amp;'));
});

test('only https cisco.com and meraki.com links become links', () => {
  assert.ok(isAllowedLink('https://www.cisco.com/c/en/us/x.html'));
  assert.ok(isAllowedLink('https://documentation.meraki.com/a'));
  for (const bad of ['http://www.cisco.com/a', 'https://evilcisco.com/a', 'https://cisco.com.evil.io/a', 'javascript:alert(1)', 'https://youtube.com/watch?v=x', '/tr/']) {
    assert.equal(isAllowedLink(bad), false, bad);
  }
  const ok = renderMarkdown('[Cisco](https://www.cisco.com/a)', { externalNote: 'yeni sekmede açılır' });
  assert.match(ok, /<a class="ext" href="https:\/\/www\.cisco\.com\/a" target="_blank" rel="noopener noreferrer">Cisco<svg/);
  assert.match(ok, /yeni sekmede açılır/);
  const bad = renderMarkdown('[kötü](https://evil.example/a)');
  assert.ok(!bad.includes('<a ') && bad.includes('kötü'));
});

test('extractLinks lists every link', () => {
  assert.deepEqual(extractLinks('a [x](https://a.io) b [y](https://b.io)'), [
    { text: 'x', url: 'https://a.io' },
    { text: 'y', url: 'https://b.io' },
  ]);
});

test('escapeHtml', () => assert.equal(escapeHtml(`<a href="x">'&`), '&lt;a href=&quot;x&quot;&gt;&#39;&amp;'));
