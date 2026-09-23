const test=require('node:test'),assert=require('node:assert/strict');
const {taskLink,taskId,fromArgs}=require('../electron/task-links.cjs');
const id='12345678-1234-1234-1234-123456789abc';
test('task links contain only a task ID and reject commands, credentials, queries and traversal',()=>{
 assert.equal(taskId(taskLink(id)),id);assert.equal(fromArgs(['exe','folder',taskLink(id)]),id);
 for(const value of ['https://task/'+id,'prism://other/'+id,'prism://task/'+id+'?run=1','prism://task/'+id+'#x','prism://task/../'+id,'prism://user@task/'+id,'prism://task/%31'+id.slice(1),'prism://task/no-id',null])assert.equal(taskId(value),null);
 assert.throws(()=>taskLink('../file'));
});
test('copy submenu matches the requested order and accelerators',()=>{
 const {taskMenuTemplate}=require('../electron/task-menu.cjs');let chosen;
 const menu=taskMenuTemplate({},[],x=>x,x=>chosen=x).find(x=>x.label==='复制').submenu;
 assert.deepEqual(menu.map(x=>x.label),['复制工作目录','复制深度链接','复制为 Markdown']);
 assert.deepEqual(menu.map(x=>x.accelerator),['Ctrl+Shift+C','Alt+Ctrl+L',undefined]);
 menu[1].click();assert.equal(chosen.action,'copy-link');menu[2].click();assert.equal(chosen.action,'copy-conversation');
});
