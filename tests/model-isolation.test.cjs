const {root}=require('./helpers/config-fixture.cjs');
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),{createRequire}=require('node:module');
const core=require('../electron/core.cjs'),preferences=require('../electron/model-preferences.cjs');
class Rpc{async init(){}async end(){}async call(){return {data:['gpt-6.1-sol','gpt-6-astra'].map(model=>({model,displayName:model,supportedReasoningEfforts:['low','high','xhigh'].map(reasoningEffort=>({reasoningEffort})),defaultReasoningEffort:'high',serviceTiers:[{id:'priority'}]}))};}}
const file=path.resolve(__dirname,'../electron/models.cjs'),moduleFixture={exports:{}},localRequire=createRequire(file);
vm.runInNewContext(fs.readFileSync(file,'utf8'),{module:moduleFixture,exports:moduleFixture.exports,require:id=>id==='./core.cjs'?{...core,Rpc}:localRequire(id),process,Buffer,setTimeout,clearTimeout});
const models=moduleFixture.exports;
function fixture(name){preferences.remember({provider:'Codex'},{model:'gpt-6.1-sol',effort:'high'});const store=new core.TaskStore(path.join(root,name));return {store,p:core.profileFor('codex-test-1')};}
test('editing one conversation does not change another, while new conversations inherit the last manual choice',async()=>{
 const {store,p}=fixture('isolation'),a=store.create({title:'A'}),b=store.create({title:'B'});
 const running={active:{task:a,profile:{...p,model:'gpt-6.1-sol',effort:'high'}}};
 await models.updateSelectionForRunner(store,running,a.id,{model:'gpt-6-astra',effort:'low',serviceTier:'priority'});
 assert.equal(models.selection(store.get(a.id),p).model,'gpt-6-astra');
 const old=models.selection(store.get(b.id),p);assert.equal(old.model,'gpt-6.1-sol');assert.equal(old.effort,'high');assert.equal(old.serviceTier,'default');
 assert.equal(running.active.profile.effort,'high','A running execution retains its original effective selection');
 const c=store.create({title:'C',profile:'codex-test-2'}),next=models.selection(c,core.profileFor(c.profile));
 assert.equal(next.model,'gpt-6-astra');assert.equal(next.effort,'low');assert.equal(next.serviceTier,'default');
 await models.rememberSelection(p.id,root,{model:'gpt-6.1-sol',effort:'xhigh'},store);
 assert.equal(models.selection(store.get(a.id),p).effort,'low');assert.equal(models.selection(store.get(b.id),p).effort,'high');assert.equal(models.selection(store.get(c.id),p).effort,'low');
 const restored=new core.TaskStore(store.root);assert.equal(models.selection(restored.get(b.id),p).model,'gpt-6.1-sol');
});
test('legacy conversations retain explicit and last-executed choices without changing timestamps or hidden states',()=>{
 const {store,p}=fixture('legacy-isolation'),tasks=['active','active','archived','deleted'].map((view,index)=>{const task=store.create({title:'Legacy '+index});delete task.modelDefaults;if(view==='archived')task.archivedAt='2026-01-01';if(view==='deleted')task.deletedAt='2026-01-01';return task;});
 tasks[0].lastExecution={profile:p.id,model:'gpt-6-astra',effort:'low',serviceTier:'priority'};
 tasks[2].modelSettings={[p.id]:{model:'custom-model',effort:'xhigh'}};
 for(const task of tasks)store.save(task);const times=tasks.map(t=>t.updated);
 assert.equal(store.pinModelDefaults(),4);assert.equal(store.pinModelDefaults(),0);
 preferences.remember(p,{model:'gpt-6-astra',effort:'xhigh'});
 const saved=tasks.map(t=>store.get(t.id,true));assert.deepEqual(saved.map(t=>t.updated),times);
 assert.equal(models.selection(saved[0],p).effort,'low');assert.equal(models.selection(saved[0],p).serviceTier,'priority');
 assert.equal(models.selection(saved[1],p).model,'gpt-6.1-sol');assert.equal(models.selection(saved[2],p).model,'custom-model');assert.ok(saved[2].archivedAt);assert.ok(saved[3].deletedAt);
 assert.equal(models.selection(saved[3],p).effort,'high');
});
