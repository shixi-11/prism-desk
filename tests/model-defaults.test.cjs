const {root}=require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {selection}=require('../electron/models.cjs');
test('Codex defaults to Astra low while explicit choices and other providers remain effective',()=>{
 const p={id:'a',provider:'Codex',model:'old'};assert.equal(selection({},p).model,'gpt-6-astra');assert.equal(selection({},p).effort,'low');
 assert.equal(selection({modelSettings:{a:{model:'custom',effort:'high'}}},p).effort,'high');assert.equal(selection({}, {id:'c',provider:'Claude',model:'opus'}).model,'opus');
});
test('requested defaults update existing and archived tasks once, preserving unrelated settings',()=>{
 const file=path.join(root,'model-request.json'),tasks=[{id:'a',modelSettings:{codex:{serviceTier:'priority'},claude:{model:'opus'}}},{id:'b'}];let saves=0;
 fs.writeFileSync(file,JSON.stringify({profileIds:['codex','claude'],model:'gpt-6-astra',effort:'low'}));
 const store={list:v=>v==='archived'?[tasks[1]]:[tasks[0]],save:()=>saves++},profiles=[{id:'codex',provider:'Codex'},{id:'claude',provider:'Claude'}];
 const {apply}=require('../electron/model-preference-request.cjs');assert.equal(apply(store,profiles,file),2);assert.equal(tasks[0].modelSettings.codex.serviceTier,'priority');assert.equal(tasks[0].modelSettings.claude.model,'opus');assert.equal(tasks[1].modelSettings.codex.effort,'low');assert.equal(apply(store,profiles,file),0);assert.equal(saves,2);
});
