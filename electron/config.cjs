const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

// This file contains configuration conventions only. Credentials remain in the
// provider's own login directory and must never be copied into configuration.
function defaultConfig(env = process.env) {
  const home = env.USERPROFILE || os.homedir();
  const local = env.LOCALAPPDATA || path.join(home, '.local', 'share');
  const accountRoot = path.join(local, 'Prism', 'accounts');
  const definitions = [
    ['Codex', 'codex.exe', 'gpt-5.6-sol', true],
    ['Claude', 'claude.exe', 'opus', true],
    ['Grok', 'grok.exe', 'grok-4.6', false],
  ];
  return {
    profiles: definitions.map(([provider, executable, model, write]) => ({
      id: `${provider.toLowerCase()}-personal-1`, provider, name: '个人-1',
      home: path.join(accountRoot, `${provider.toLowerCase()}-personal-1`),
      executable, model, write,
    })),
    assistant: {path: '', instructions: ''},
    skillsPath: '',
    geminiEntry: '',
    storageRoot: '',
    apps: {},
  };
}

function validate(config) {
  const ids = new Set();
  if (!Array.isArray(config.profiles) || !config.profiles.length) throw Error('Configuration requires at least one profile.');
  for (const profile of config.profiles) {
    if (!profile || !['Codex','Claude','Grok','Gemini'].includes(profile.provider)) throw Error('Unsupported profile provider.');
    if (typeof profile.id !== 'string' || !/^[a-zA-Z0-9_-]+$/.test(profile.id) || ids.has(profile.id)) throw Error('Profile IDs must be unique and contain only letters, numbers, hyphens and underscores.');
    ids.add(profile.id);
    for (const field of ['name','model','home','executable']) if (typeof profile[field] !== 'string' || !profile[field]) throw Error(`Profile ${profile.id} requires ${field}.`);
    if (!path.isAbsolute(profile.home)) throw Error(`Profile ${profile.id} requires an absolute login directory.`);
    if (typeof profile.write !== 'boolean') throw Error(`Profile ${profile.id} requires an explicit write permission.`);
  }
  if (!config.assistant || typeof config.assistant.path !== 'string' || typeof config.assistant.instructions !== 'string') throw Error('Invalid assistant configuration.');
  for (const field of ['skillsPath','geminiEntry','storageRoot']) if (typeof config[field] !== 'string') throw Error(`Invalid ${field} configuration.`);
  for (const value of [config.assistant.path, config.skillsPath, config.geminiEntry, config.storageRoot]) if (value && !path.isAbsolute(value)) throw Error('Configured resource paths must be absolute.');
  if (!config.apps || typeof config.apps !== 'object' || Array.isArray(config.apps)) throw Error('Invalid apps configuration.');
  return config;
}

function loadConfig(file = process.env.PRISM_CONFIG || path.join(__dirname, '../.local/config.json'), env = process.env) {
  const defaults = defaultConfig(env);
  if (!fs.existsSync(file)) {
    if (env.PRISM_CONFIG && file === env.PRISM_CONFIG) throw Error('The explicitly selected PRISM configuration file does not exist.');
    return validate(defaults);
  }
  // A malformed local configuration must not silently switch account identity.
  const local = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!local || typeof local !== 'object' || Array.isArray(local)) throw Error('Invalid PRISM configuration.');
  return validate({...defaults, ...local, assistant: {...defaults.assistant, ...local.assistant}});
}

const CONFIG_PATH=process.env.PRISM_CONFIG||path.join(__dirname,'../.local/config.json');
const CONFIG = loadConfig();
function saveProfiles(profiles){
  const latest=loadConfig(CONFIG_PATH);
  if(!require('node:util').isDeepStrictEqual(latest.profiles,CONFIG.profiles))throw Error('账号配置已在外部改变，请重启后重试。');
  const next=validate({...latest,profiles});
  fs.mkdirSync(path.dirname(CONFIG_PATH),{recursive:true});
  const backup=CONFIG_PATH+'.bak';if(fs.existsSync(CONFIG_PATH)&&!fs.existsSync(backup))fs.copyFileSync(CONFIG_PATH,backup);
  const temp=CONFIG_PATH+'.'+require('node:crypto').randomUUID()+'.tmp';
  try{fs.writeFileSync(temp,JSON.stringify(next,null,2));fs.renameSync(temp,CONFIG_PATH);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  CONFIG.profiles.splice(0,CONFIG.profiles.length,...profiles);
  return CONFIG.profiles;
}
module.exports = {CONFIG, CONFIG_PATH, loadConfig, defaultConfig, saveProfiles};
