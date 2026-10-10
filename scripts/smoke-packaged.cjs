const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

function playwright() {
  return require(process.env.PRISM_PLAYWRIGHT_MODULE || 'playwright');
}

function bundleExecutable(bundle) {
  const plist = path.join(bundle, 'Contents', 'Info.plist');
  const name = execFileSync('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', plist], { encoding: 'utf8' }).trim();
  const executable = path.join(bundle, 'Contents', 'MacOS', name);
  if (!fs.statSync(executable).isFile()) throw Error(`Packaged executable was not found: ${executable}`);
  return executable;
}

async function main() {
  const input = process.argv[2];
  if (!input) throw Error('Usage: node scripts/smoke-packaged.cjs <app-bundle-or-executable> [--metadata <file>]');
  const target = path.resolve(input);
  const isBundle = process.platform === 'darwin' && target.toLowerCase().endsWith('.app');
  if (isBundle && !fs.statSync(target).isDirectory()) throw Error('Expected a packaged .app directory.');
  if (!isBundle && !fs.statSync(target).isFile()) throw Error('Expected the packaged executable file.');

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prism-packaged-smoke-'));
  let application;
  let stagedBundle;
  try {
    let executablePath = target;
    if (isBundle) {
      // Run a private copy so this smoke test cannot collide with a user's installed instance.
      stagedBundle = path.join(root, path.basename(target));
      fs.cpSync(target, stagedBundle, { recursive: true, preserveTimestamps: true, verbatimSymlinks: true });
      execFileSync('codesign', ['--verify', '--deep', '--strict', stagedBundle], { stdio: 'inherit' });
      executablePath = bundleExecutable(stagedBundle);
    }
    const home = path.join(root, 'home');
    const local = path.join(home, 'AppData', 'Local');
    const roaming = path.join(home, 'AppData', 'Roaming');
    const temp = path.join(root, 'tmp');
    for (const directory of [home, local, roaming, temp, path.join(root, 'xdg-config'), path.join(root, 'xdg-data')]) fs.mkdirSync(directory, { recursive: true });
    const env = {
      ...process.env,
      HOME: home,
      USERPROFILE: home,
      LOCALAPPDATA: local,
      APPDATA: roaming,
      TMPDIR: temp,
      TEMP: temp,
      TMP: temp,
      XDG_CONFIG_HOME: path.join(root, 'xdg-config'),
      XDG_DATA_HOME: path.join(root, 'xdg-data'),
      PRISM_TEST_DATA: root,
      PRISM_TEST_HIDE: '1',
    };
    const { _electron } = playwright();
    const launch = () => _electron.launch({ executablePath, env, timeout: 60000 });
    const waitForTitle=async name=>{
      const expected=`${name} v${require('../package.json').version}`,deadline=Date.now()+10000;
      let actual;
      do{
        actual=await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].getTitle());
        if(actual===expected)return;
        await new Promise(resolve=>setTimeout(resolve,100));
      }while(Date.now()<deadline);
      assert.equal(actual,expected,'Window title must follow the selected language');
    };
    const openWindow = async app => {
      const page = await app.firstWindow();
      await page.waitForFunction(() => Boolean(window.prism), null, { timeout: 30000 });
      await page.locator('.composer textarea').waitFor({state:'visible',timeout:30000});
      return page;
    };
    const appInfo = async app => app.evaluate(({ app: electronApp }) => ({ packaged: electronApp.isPackaged, version: electronApp.getVersion(), arch: process.arch }));

    application = await launch();
    let page = await openWindow(application);
    const info = await appInfo(application);
    assert.equal(info.packaged, true, 'Electron must run the packaged app');
    const expectedVersion = require('../package.json').version;
    assert.equal(info.version, expectedVersion, 'Packaged app version must match package.json');

    const initial = await page.evaluate(() => window.prism.init());
    if(process.platform==='win32'){
      const marker=path.join(path.dirname(executablePath),'prism-install-language.txt');
      if(fs.existsSync(marker))assert.equal(initial.settings.language,{'1033':'en','2052':'zh','1028':'zh-TW'}[fs.readFileSync(marker,'utf8').trim()],'A new data directory must use the actual installer language');
    }
    const initialData=await application.evaluate(({app})=>app.getPath('userData'));
    await page.locator('.language-toggle').selectOption('en');
    await waitForTitle('Prism');
    assert.equal(await application.evaluate(({app})=>app.getName()),'Prism');
    await page.locator('.language-toggle').selectOption('zh');
    await waitForTitle('棱镜');
    assert.equal(await application.evaluate(({app})=>app.getPath('userData')),initialData,'Changing the app name must preserve the data directory');
    if(process.platform==='win32'){
      const shortcuts=await application.evaluate(({app,shell},directory)=>{
        const requireModule=process.getBuiltinModule('module').createRequire(app.getAppPath()+'/package.json');
        const fs=requireModule('node:fs'),path=requireModule('node:path');
        const locations={exe:app.getPath('exe'),appData:path.join(directory,'roaming'),desktop:path.join(directory,'desktop'),userData:path.join(directory,'user-data')};
        const menu=path.join(locations.appData,'Microsoft','Windows','Start Menu','Programs');
        for(const folder of [menu,locations.desktop]){
          fs.mkdirSync(folder,{recursive:true});
          if(!shell.writeShortcutLink(path.join(folder,'Prism Desk.lnk'),'create',{target:locations.exe,description:'Previous installation'}))throw Error('Could not create isolated shortcut fixture');
        }
        const testApp={isPackaged:true,getPath:key=>locations[key],setAsDefaultProtocolClient:()=>true};
        const register=requireModule('./electron/desktop-identity.cjs').register;
        const snapshots=[];
        for(const [language,name] of [['zh','棱镜'],['en','Prism']]){
          register(testApp,shell,directory,language,()=>{});
          snapshots.push([menu,locations.desktop].map(folder=>({files:fs.readdirSync(folder),link:shell.readShortcutLink(path.join(folder,name+'.lnk'))})));
        }
        return {target:locations.exe,snapshots};
      },path.join(root,'native-shortcut-check'));
      for(const [index,name] of ['棱镜','Prism'].entries())for(const shortcut of shortcuts.snapshots[index]){
        assert.deepEqual(shortcut.files,[name+'.lnk']);
        assert.equal(fs.realpathSync.native(shortcut.link.target).toLowerCase(),fs.realpathSync.native(shortcuts.target).toLowerCase());
        assert.equal(shortcut.link.appUserModelId,'org.prismdesk.desktop');
      }
    }
    assert.equal(initial.capabilities?.taichu?.exists, false, 'Smoke data must not load a configured assistant');
    assert.equal(initial.capabilities?.taichu?.path, '', 'Smoke data must not expose a private assistant path');
    assert.ok(initial.profiles.every(profile => !('home' in profile) && !('executable' in profile)), 'Init must not expose account directories or executable paths');
    assert.equal(initial.profiles.find(p=>p.provider==='Codex').model,'gpt-6.1-sol');
    assert.equal(initial.profiles.find(p=>p.provider==='Codex').effort,'high');
    assert.ok(!('assistant' in initial.settings), 'Init must not load private assistant settings');
    const updateStatus = await page.evaluate(() => window.prism.updateStatus());
    assert.equal(updateStatus.version, info.version);
    assert.equal(updateStatus.distribution, process.platform === 'darwin' ? 'mac-dmg' : 'installer');
    const storageRelative = path.relative(path.resolve(root), path.resolve(initial.taskStorage));
    assert.ok(storageRelative && !storageRelative.startsWith('..') && !path.isAbsolute(storageRelative), 'Task storage must stay inside PRISM_TEST_DATA');
    const account=await page.evaluate(()=>window.prism.saveAccount({provider:'Codex',name:'Packaged account fixture'}));
    const accountBase=process.platform==='darwin'?path.join(home,'Library','Application Support','Prism','accounts'):path.join(local,'Prism','accounts');
    assert.equal(path.dirname(account.home),accountBase,'New accounts must use the documented writable user directory');

    const smokeId = `packaged-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const taskTitle = `Packaged smoke ${smokeId}`;
    const created = await page.evaluate(async ({ id, title }) => window.prism.create({ title, mode: 'read-only' }), { id: smokeId, title: taskTitle });
    assert.equal(typeof created.id, 'string', 'window.prism.create must create a real task');
    const recentToggle=page.locator('.sidebar-section-toggle').filter({hasText:/recent|最近/i}).first();
    await recentToggle.waitFor({state:'visible',timeout:10000});
    if(await recentToggle.getAttribute('aria-expanded')!=='true')await recentToggle.click();
    const taskEntry = page.getByRole('button', { name: taskTitle, exact: true });
    await taskEntry.waitFor({ state: 'visible', timeout: 10000 });
    await taskEntry.click();
    const composer = page.locator('.composer textarea');
    const draftText = `packaged persistence check ${smokeId}`;
    await composer.fill(draftText);
    const draftFile = path.join(root, 'drafts', 'primary.json');
    const saveDeadline = Date.now() + 10000;
    let persistedDraft;
    while (Date.now() < saveDeadline) {
      try { persistedDraft = JSON.parse(fs.readFileSync(draftFile, 'utf8'))[created.id]; } catch {}
      if (persistedDraft?.text === draftText) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.equal(persistedDraft?.text, draftText, 'Composer autosave must persist the UI draft before restart');

    // Exercise the real UI, IPC and disk store without sending a model request.
    await page.getByRole('button',{name:'任务模板',exact:true}).click();
    await page.getByRole('button',{name:'保存当前草稿',exact:true}).click();
    await page.getByLabel('模板名称',{exact:true}).fill('Reusable review');
    await page.getByLabel('模板内容',{exact:true}).fill('Review the current changes.\nKeep the approved layout.');
    await page.getByRole('button',{name:'保存',exact:true}).click();
    await page.getByRole('heading',{name:'Reusable review',exact:true}).waitFor();
    if(process.env.PRISM_TEMPLATE_SCREENSHOT){
      fs.mkdirSync(path.dirname(process.env.PRISM_TEMPLATE_SCREENSHOT),{recursive:true});
      await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].showInactive());
      await page.screenshot({path:process.env.PRISM_TEMPLATE_SCREENSHOT,animations:'disabled'});
      await application.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].hide());
    }
    await page.getByLabel('搜索模板',{exact:true}).fill('approved');
    await page.getByRole('button',{name:'插入当前任务',exact:true}).click();
    assert.equal(await composer.inputValue(),draftText,'Inserting a template must retain existing draft text');
    await page.locator('.pasted-texts').getByText('Reusable review',{exact:true}).waitFor();
    const savedTemplates=await page.evaluate(()=>window.prism.listTemplates());
    assert.equal(savedTemplates.length,1);
    assert.equal(savedTemplates[0].body,'Review the current changes.\nKeep the approved layout.');

    await page.locator('.language-toggle').selectOption('en');
    await waitForTitle('Prism');
    await application.close();
    application = await launch();
    page = await openWindow(application);
    const restored = await page.evaluate(async () => window.prism.init());
    assert.equal(restored.settings.language,'en','Manual language must survive restart');
    assert.equal(await application.evaluate(({app})=>app.getPath('userData')),initialData,'Restart after a name change must preserve the data directory');
    await waitForTitle('Prism');
    await page.locator('.language-toggle').selectOption('zh');
    assert.ok(restored.tasks.some(task => task.id === created.id), 'Created task must persist across app restart');
    assert.ok(restored.profiles.some(profile=>profile.id===account.id),'Saved account settings must persist across app restart');
    assert.equal(restored.drafts[created.id]?.text, draftText, 'UI draft must persist across app restart');
    assert.equal(await page.locator('.composer textarea').inputValue(), draftText, 'Persisted draft must be restored into the composer');
    assert.equal(restored.drafts[created.id]?.pastedTexts?.[0]?.text,savedTemplates[0].body,'Template card must survive draft restart');
    assert.deepEqual(await page.evaluate(()=>window.prism.listTemplates()),savedTemplates,'Templates must survive app restart');
    await page.getByRole('button',{name:'任务模板',exact:true}).click();
    await page.getByRole('button',{name:'编辑 Reusable review',exact:true}).click();
    await page.getByLabel('模板内容',{exact:true}).fill('Updated review instructions');
    await page.getByRole('button',{name:'保存',exact:true}).click();
    await page.getByRole('button',{name:'删除 Reusable review',exact:true}).click();
    await page.getByRole('button',{name:'取消',exact:true}).click();
    assert.equal((await page.evaluate(()=>window.prism.listTemplates())).length,1,'Cancel deletion must retain the template');
    await page.getByRole('button',{name:'删除 Reusable review',exact:true}).click();
    await page.locator('.task-templates').getByRole('button',{name:'删除',exact:true}).click();
    await page.getByText('暂无模板',{exact:true}).waitFor();
    assert.deepEqual(await page.evaluate(()=>window.prism.listTemplates()),[],'Confirmed deletion must remove the stored template');
    await page.getByRole('button',{name:'关闭',exact:true}).click();
    const secondUpdateStatus = await page.evaluate(() => window.prism.updateStatus());
    assert.equal(secondUpdateStatus.distribution, updateStatus.distribution);
    const updateButtons = page.locator('button[aria-label]');
    const updateButtonIndex = await updateButtons.evaluateAll(buttons => buttons.findIndex(button => /update|actualiz|mise à jour|mise a jour|更新|アップデート|更新を確認|업데이트/i.test(button.getAttribute('aria-label') || '')));
    assert.ok(updateButtonIndex >= 0, 'Packaged UI must expose the update settings entry');
    await updateButtons.nth(updateButtonIndex).click();
    const versionLabel = page.locator('.update-settings .update-version').first();
    await versionLabel.waitFor({ state: 'visible', timeout: 10000 });
    await page.waitForFunction(version => document.querySelector('.update-settings .update-version')?.textContent.includes(version), info.version, { timeout: 10000 });
    assert.ok((await versionLabel.innerText()).includes(info.version), 'Update settings must show the packaged app version');

    await application.close();
    const migratedRoot=path.join(root,'migrated-installation');
    require('../electron/install-migration.cjs').registerSource({sharedRoot:migratedRoot,configFile:path.join(root,'config.json'),userData:root});
    env.PRISM_TEST_DATA=migratedRoot;
    application=await launch();page=await openWindow(application);
    const migrated=await page.evaluate(()=>window.prism.init());
    assert.ok(migrated.profiles.some(profile=>profile.id===account.id),'First installed launch must import existing account references');
    assert.ok(migrated.tasks.some(task=>task.id===created.id),'First installed launch must import source tasks');
    assert.equal(migrated.drafts[created.id]?.text,draftText,'First installed launch must import source drafts');
    await application.close();application=await launch();page=await openWindow(application);
    const migrationRestart=await page.evaluate(()=>window.prism.init());
    assert.equal(migrationRestart.profiles.length,migrated.profiles.length,'Migration must remain stable across restart');
    assert.equal(migrationRestart.drafts[created.id]?.text,draftText);

    const commit = process.env.GITHUB_SHA || execFileSync('git', ['rev-parse', 'HEAD'], { cwd: path.resolve(__dirname, '..'), encoding: 'utf8' }).trim();
    const metadata = { version: info.version, commit, arch: info.arch };
    const metadataIndex = process.argv.indexOf('--metadata');
    if (metadataIndex >= 0) {
      const file = path.resolve(process.argv[metadataIndex + 1] || '');
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, JSON.stringify(metadata, null, 2) + '\n');
    }
    process.stdout.write(JSON.stringify(metadata) + '\n');
  } catch(error) {
    if(application&&process.env.PRISM_TEMPLATE_SCREENSHOT){
      try{const page=await application.firstWindow();await page.screenshot({path:process.env.PRISM_TEMPLATE_SCREENSHOT.replace(/\.png$/,'.failure.png')});}catch{}
    }
    throw error;
  } finally {
    if (application) await application.close().catch(() => {});
    const resolved = fs.realpathSync.native(root);
    if (path.dirname(resolved) !== fs.realpathSync.native(os.tmpdir())) throw Error('Refusing to remove smoke data outside the temporary directory.');
    try { fs.rmSync(resolved, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 }); }
    catch (error) {
      if (process.platform !== 'win32' || !['EPERM', 'EBUSY', 'ENOTEMPTY'].includes(error.code)) throw error;
      process.stderr.write('Windows kept the isolated temporary directory because an OS file handle was still active.\n');
    }
  }
}

main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
