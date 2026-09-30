const {test}=require('node:test'),assert=require('node:assert/strict');
const clock=()=>{let next=1;const jobs=new Map();return {schedule:(fn)=>{const id=next++;jobs.set(id,fn);return id;},cancel:id=>jobs.delete(id),run(){const pending=[...jobs.values()];jobs.clear();pending.forEach(fn=>fn());},get size(){return jobs.size;}};};

test('streamed chunks are combined into one interface update per interval',async()=>{
 const {createLiveText}=await import('../src/live-text.js');
 const timers=clock(),published=[];
 const live=createLiveText(v=>published.push(v),timers);
 for(const text of ['思','考','中']) live.change({activity:'',thinking:old=>old+text});
 live.change({thinking:'',activity:'',streaming:old=>old+'回复'});
 live.change({streaming:old=>old+'继续'});
 assert.equal(published.length,0);
 assert.equal(timers.size,1);
 timers.run();
 assert.deepEqual(published,[{thinking:'',activity:'',streaming:'回复继续'}]);
});

test('reasoning keeps accumulating until the interval publishes it',async()=>{
 const {createLiveText}=await import('../src/live-text.js');
 const timers=clock(),published=[];
 const live=createLiveText(v=>published.push(v),timers);
 live.change({thinking:old=>old+'a'});timers.run();
 live.change({thinking:old=>old+'b'});timers.run();
 assert.deepEqual(published.map(v=>v.thinking),['a','ab']);
});

test('resets publish immediately and replace a pending chunk update',async()=>{
 const {createLiveText}=await import('../src/live-text.js');
 const timers=clock(),published=[];
 const live=createLiveText(v=>published.push(v),timers);
 live.change({streaming:old=>old+'旧任务的回复'});
 live.change({streaming:'',thinking:'',activity:''},{now:true});
 assert.equal(timers.size,0);
 assert.deepEqual(published,[{thinking:'',activity:'',streaming:''}]);
 timers.run();
 assert.equal(published.length,1);
});

test('disposing drops a pending update',async()=>{
 const {createLiveText}=await import('../src/live-text.js');
 const timers=clock(),published=[];
 const live=createLiveText(v=>published.push(v),timers);
 live.change({activity:'npm test'});
 live.dispose();
 timers.run();
 assert.equal(published.length,0);
});
