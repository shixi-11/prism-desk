const fs=require('node:fs'),path=require('node:path');
function assistantContext(assistantPath,home=process.env.CODEX_HOME||path.join(process.env.USERPROFILE||require('node:os').homedir(),'.codex')){
 if(!assistantPath)return '';
 const existing=relative=>{const file=path.join(assistantPath,relative);return fs.existsSync(file)?file:null;};
 const rules=existing('AGENTS.md')||existing(path.join('portable','codex-home','AGENTS.md'));
 const map=existing(path.join('references','codex-memory-map.md'));
 const memory=path.join(home,'memories'),registry=path.join(memory,'MEMORY.md'),summary=path.join(memory,'memory_summary.md');
 return `${rules?`本轮先读取助手母包的全局规则 ${JSON.stringify(rules)}，已有相同版本上下文时无需重复读取；用户要求和本次执行权限优先。\n`:''}${map?`记忆导航：${JSON.stringify(map)}。\n`:''}${fs.existsSync(registry)?`当前本机记忆库：${JSON.stringify(memory)}。涉及项目、既有约定、历史工作或非简单任务时，${fs.existsSync(summary)?`先读 ${JSON.stringify(summary)}，再`:'先'}按关键词搜索 ${JSON.stringify(registry)}，仅展开相关记录并以当前文件核对。不要假定隔离账号自己的目录含有完整记忆。\n`:''}只读取本轮相关技能和记忆，不把技能全集、历史会话或私密心智全文一次性载入；不复制到账号目录，不写入公共项目，不自动更新长期记忆。\n`;
}
module.exports={assistantContext};
