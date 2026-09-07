const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {QuotaDisplay}=require('../electron/quota-display.cjs');
test('transient failures preserve a dated reading but authentication failures erase it',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-display-'));try{const d=new QuotaDisplay(root);d.save({id:'one',remaining:40,checkedAt:'2026-09-07T00:00:00Z',email:'test@example.com'});const failed=d.failure('one',Error('offline'));assert.equal(failed.remaining,40);assert.equal(failed.cached,true);assert.equal(failed.checkedAt,'2026-09-07T00:00:00Z');d.save(failed);const auth=d.failure('one',Object.assign(Error('login'),{code:'AUTH_REQUIRED'}));assert.equal(auth.remaining,null);assert.equal(auth.email,undefined);d.save(auth);assert.equal(d.values.one.email,undefined);}finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('display snapshots survive restart, retain timestamps, exclude secrets and cleared logins',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'prism-display-'));
 try{const display=new QuotaDisplay(root),checkedAt='2026-09-07T00:00:00Z';display.save({id:'one',email:'test@example.com',remaining:72,checkedAt,accessToken:'must-not-store'});const restored=new QuotaDisplay(root).snapshot([{id:'one'},{id:'deleted',loginRequired:true}]);assert.equal(restored.one.checkedAt,checkedAt);assert.equal(restored.one.cached,true);assert.equal(restored.one.remaining,72);assert.equal(restored.one.accessToken,undefined);assert.deepEqual(display.snapshot([{id:'one',loginRequired:true}]),{});display.clear('one');assert.deepEqual(new QuotaDisplay(root).snapshot([{id:'one'}]),{});}finally{fs.rmSync(root,{recursive:true,force:true});}
});
