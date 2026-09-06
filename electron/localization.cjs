const catalogs = {
  en: require('../src/locales/en.json'),
  'zh-TW': require('../src/locales/zh-TW.json'),
  ja: require('../src/locales/ja.json'),
  ko: require('../src/locales/ko.json'),
  es: require('../src/locales/es.json'),
  fr: require('../src/locales/fr.json'),
  de: require('../src/locales/de.json'),
  ar: require('../src/locales/ar.json'),
};

const languages = Object.freeze(['zh', 'zh-TW', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ar']);
const isSupportedLanguage = value => languages.includes(value);

function translate(language, value, params = {}) {
  if (typeof value !== 'string') return value;
  const dictionary = catalogs[language] || {};
  let result = dictionary[value] || value;
  if (!dictionary[value]) {
    for (const [pattern, key] of [
      [/团队-(\d+)/g, '团队-{n}'],
      [/个人-(\d+)/g, '个人-{n}'],
      [/^(\d+) 张$/, '{n} 张'],
      [/^(\d+) 条记录$/, '{n} 条记录'],
      [/^(\d+) 小时$/, '{n} 小时'],
    ]) {
      result = result.replace(pattern, (_, n) => (dictionary[key] || key).replace('{n}', n));
    }
  }
  return result.replace(/\{(\w+)\}/g, (match, key) => params[key] ?? match);
}

function directoryDialog(language) {
  return {
    properties: ['openDirectory'],
    title: translate(language, '选择工作目录'),
    buttonLabel: translate(language, '选择工作目录'),
  };
}

function resetCreditDialog(language, profile) {
  const tr = (text, params) => translate(language, text, params);
  return {
    type: 'question',
    title: tr('使用重置卡'),
    message: tr('确认对 {account} 使用一张重置卡？', {
      account: `Codex / ${tr(profile.name)}`,
    }),
    detail: tr('仅重置此订阅账号的符合条件额度，成功后消耗一张卡。不会切换账号，也不会购买额度。'),
    buttons: [tr('取消'), tr('确认使用一张')],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
}

module.exports = { languages, isSupportedLanguage, translate, directoryDialog, resetCreditDialog };
