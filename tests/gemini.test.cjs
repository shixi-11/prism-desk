require('./helpers/config-fixture.cjs');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {prepareGemini,geminiStatus}=require('../electron/gemini.cjs');
const bundle=process.env.PRISM_GEMINI_TEST_BUNDLE;
if(bundle && (!path.isAbsolute(bundle) || !fs.existsSync(bundle))) throw Error('PRISM_GEMINI_TEST_BUNDLE must point to an existing absolute Gemini policy bundle path.');
test('Gemini official policy engine blocks writes, shell, MCP and exiting read-only mode', {skip:!bundle && 'Set PRISM_GEMINI_TEST_BUNDLE to validate an installed official Gemini policy engine'}, async()=>{
  const home=fs.mkdtempSync(path.join(os.tmpdir(),'prism-gemini-policy-'));
  try {
    const profile={id:'gemini-test',home};
    const {policy,settings}=prepareGemini(profile);
    assert.equal(geminiStatus(profile).loginRequired,true);
    const {PolicyEngine,loadPoliciesFromToml,resolveModel}=await import(pathToFileURL(bundle));
    const parsed=await loadPoliciesFromToml([policy],()=>5);
    assert.deepEqual(parsed.errors,[]);
    const engine=new PolicyEngine({rules:parsed.rules,approvalMode:'plan',nonInteractive:true});
    for(const name of ['write_file','replace','run_shell_command','exit_plan_mode','invoke_agent','activate_skill','mcp__blender__execute_code']) {
      const result=await engine.check({name,args:{}});
      assert.equal(result.decision,'deny',name);
    }
    for(const name of ['read_file','list_directory','glob','grep_search']) {
      const result=await engine.check({name,args:{}});
      assert.equal(result.decision,'allow',name);
    }
    assert.ok(resolveModel('auto').startsWith('gemini-'));
    const locked=JSON.parse(fs.readFileSync(settings));
    assert.equal(locked.security.auth.enforcedType,'oauth-personal');
  } finally {fs.rmSync(home,{recursive:true,force:true});}
});
