const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { languages, isSupportedLanguage, translate, directoryDialog, resetCreditDialog } = require('../electron/localization.cjs');
const source = require('../src/locales/en.json');
const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
test('account onboarding labels and validation messages have all translated keys',()=>{
  for(const relative of ['src/AccountManager.jsx','electron/accounts.cjs','electron/account-login.cjs','electron/account-providers.cjs']){
    const text=fs.readFileSync(path.join(__dirname,'..',relative),'utf8');
    for(const match of text.matchAll(/'([^'\r\n]*[\u4e00-\u9fff][^'\r\n]*)'/g))assert.ok(source[match[1]],`${relative}: ${match[1]}`);
  }
});

test('all eight translated catalogs cover the source keys and preserve interpolation tokens', () => {
  assert.equal(languages.length, 9);
  for (const language of languages.filter(value => value !== 'zh')) {
    const filename = path.join(__dirname, '..', 'src', 'locales', `${language}.json`);
    const catalog = JSON.parse(fs.readFileSync(filename, 'utf8'));
    assert.deepEqual(Object.keys(catalog).sort(), Object.keys(source).sort(), language);
    for (const [key, value] of Object.entries(catalog)) {
      assert.equal(typeof value, 'string', `${language}: ${key}`);
      assert.ok(value.trim(), `${language}: empty ${key}`);
      assert.deepEqual(placeholders(value), placeholders(key), `${language}: ${key}`);
    }
  }
});

test('native localization supports nine languages and translates dynamic account names and quantities', () => {
  for (const language of languages) {
    assert.equal(isSupportedLanguage(language), true);
    const expected = language === 'zh' ? {} : require(`../src/locales/${language}.json`);
    for (const [raw, key] of [
      ['团队-12', '团队-{n}'], ['个人-12', '个人-{n}'],
      ['12 张', '{n} 张'], ['12 条记录', '{n} 条记录'], ['12 小时', '{n} 小时'],
    ]) {
      assert.equal(translate(language, raw), (expected[key] || key).replace('{n}', '12'), `${language}: ${raw}`);
    }
    assert.equal(translate(language, 'My-project-12'), 'My-project-12');
  }
  for (const invalid of ['zh-CN', 'xx', null, {}, '../en']) assert.equal(isSupportedLanguage(invalid), false);
  assert.equal(translate('xx', '选择工作目录'), '选择工作目录');
});

test('native dialogs translate labels and account interpolation while keeping reset confirmation opt-in', () => {
  for (const language of languages) {
    const folder = directoryDialog(language);
    assert.deepEqual(folder.properties, ['openDirectory']);
    assert.equal(folder.title, translate(language, '选择工作目录'));
    assert.equal(folder.buttonLabel, folder.title);
    const reset = resetCreditDialog(language, { name: '团队-12' });
    const account = `Codex / ${translate(language, '团队-12')}`;
    assert.ok(reset.message.includes(account), language);
    assert.equal(reset.message.includes('{account}'), false);
    assert.equal(reset.title, translate(language, '使用重置卡'));
    assert.equal(reset.detail, translate(language, '仅重置此订阅账号的符合条件额度，成功后消耗一张卡。不会切换账号，也不会购买额度。'));
    assert.deepEqual(reset.buttons, [translate(language, '取消'), translate(language, '确认使用一张')]);
    assert.equal(reset.defaultId, 0);
    assert.equal(reset.cancelId, 0);
    assert.equal(reset.noLink, true);
  }
  assert.equal(translate('en', '确认对 {account} 使用一张重置卡？', { account: '$& {n}' }), 'Use one reset credit for $& {n}?');
});
