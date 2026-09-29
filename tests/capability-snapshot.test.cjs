require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict');
test('publishing a refreshed capability snapshot does not rescan skill files',t=>{
 const manager=require('../electron/shared-capabilities.cjs').manager();const original=manager.view;let scans=0;
 const snapshot={token:'fixture',active:[{name:'example'}],assistant:{exists:true},sources:[],plugins:[],errors:[]};
 manager.view=()=>{scans++;return snapshot;};t.after(()=>manager.view=original);
 const {capabilities}=require('../electron/core.cjs');const result=capabilities(snapshot);
 assert.equal(scans,0);assert.equal(result.sync.token,'fixture');assert.deepEqual(result.skills,snapshot.active);
 capabilities();assert.equal(scans,1);
});
