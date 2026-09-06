const fs = require("node:fs");
const path = require("node:path");
const { EventEmitter } = require("node:events");
const {
  Rpc,
  profileFor,
  spawnCLI,
  capabilities,
  environmentPrompt,
  claudeAuth,
  PROFILES,
  quotaView,
} = require("./core.cjs");
const {recordClaude,codexExhausted}=require('./quota.cjs');

class Runner extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    this.active = null;
  }
  event(id, type, data) {
    const e = this.store.append(id, type, data);
    this.emit("event", { taskId: id, event: e });
    return e;
  }
  state(task, state) {
    task.state = state;
    if (!["running", "stopping", "unknown"].includes(state)) delete task.activePid;
    this.store.save(task);
    this.emit("state", task);
  }
  assertIdle(task) {
    if (this.active || ["running", "stopping", "unknown"].includes(task.state))
      throw Error("请等待当前执行结束；状态未知时需先核对工作目录。");
  }
  switch(id, profile) {
    const task = this.store.get(id);
    this.assertIdle(task);
    const nextProfile=profileFor(profile);
    if(task.mode==='workspace-write' && !nextProfile.write) throw Error('这个入口仅支持只读研究，请先将任务改为只读。');
    if (task.profile === profile) return task;
    const previous = task.profile;
    const progress = require('./handoff.cjs').snapshot(task, this.store.events(id));
    task.profile = profile;
    // A provider that returns after another writer must load the complete delta,
    // so start a fresh native session while retaining the logical task forever.
    delete task.sessions[profile];
    this.event(id, "handoff", {
      progress,
      text: `执行账号从 ${profileFor(previous).provider} / ${profileFor(previous).name} 切换到 ${nextProfile.provider} / ${nextProfile.name}。任务与工作目录保持不变；下一条指令将读取持久工作记录。`,
    });
    this.store.context(task);
    return this.store.save(task);
  }
  async run(id, text) {
    if (typeof text !== "string" || !text.trim() || text.length > 60000)
      throw Error("请输入 1–60000 字的指令。");
    const task = this.store.get(id);
    this.assertIdle(task);
    let profile = require('./models.cjs').selection(task,profileFor(task.profile));
    if(task.mode==='workspace-write' && !profile.write) throw Error('这个入口仅支持只读研究。');
    this.event(id, "user", { text: text.trim(), profile: profile.id });
    this.active = { task, profile, phase: "starting", pending: new Map(), cancelRequested:false };
    this.state(task, "running");
    try {
      const attempted=new Set();let instruction=text;
      while(true) {
        if(task.pendingModelRefresh?.[profile.id]){delete task.sessions[profile.id];delete task.pendingModelRefresh[profile.id];this.store.save(task);}
        attempted.add(profile.id);
        Object.assign(this.active,{profile,started:false,quotaExhausted:false,quotaByWindow:{},rpc:null,proc:null,turnId:null,grok:false,sessionId:null});
        task.execution = {profile:profile.id, model:profile.model, effort:profile.effort};
        const record=this.store.context(task);
        const instructions=environmentPrompt(task,capabilities(),record);
        this.state(task,'running');
        try {
          if(profile.provider==='Codex')await this.codex(task,profile,instruction,instructions);
          else if(profile.provider==='Claude')await this.claude(task,profile,instruction,instructions);
          else if(profile.provider==='Gemini')await this.gemini(task,profile,instruction,instructions);
          else await this.grok(task,profile,instruction,instructions);
        } catch(e) {
          this.event(id,'notice',{text:e.message});
          if(['running','stopping'].includes(task.state))this.state(task,this.active.started?'unknown':'failed');
        }
        if(this.active.quotaExhausted)this.event(id,'notice',{text:`${profile.provider} / ${profile.name} 订阅额度已耗尽。${task.autoSwitch===false?'自动接续已关闭，请选择其他账号继续。':'正在检查可接续的账号。'}`});
        if(task.autoSwitch===false || this.active.cancelRequested || !this.active.quotaExhausted || task.state!=='failed')break;
        const next=PROFILES.find(p=>!attempted.has(p.id) && (task.mode==='read-only'||p.write));
        if(!next){this.event(id,'notice',{text:'已尝试所有符合当前权限的入口；没有自动重复调用。'});break;}
        this.active.pending.clear();
        this.emit('approval-reset',{taskId:task.id});
        this.event(id,'handoff',{progress:require('./handoff.cjs').snapshot(task,this.store.events(id)),text:`${profile.provider} / ${profile.name} 已由官方确认额度耗尽；旧执行已结束，自动切换到 ${next.provider} / ${next.name}，继续同一任务。`});
        profile=require('./models.cjs').selection(task,next);task.profile=next.id;delete task.sessions[next.id];this.store.save(task);
        instruction='继续这条任务尚未完成的工作。先读取持久工作记录和当前项目文件，核对前序账号实际完成的部分；已有成功操作不得重复执行，部分写入先核实再续做。不要要求用户重新描述任务。';
      }
    } finally {
      task.requestedHandoff = this.active?.requestedHandoff || null;
      delete task.execution;
      this.store.save(task);
      this.active = null;
      this.store.context(task);
      this.emit("idle", task);
    }
    const next = task.requestedHandoff;
    if(next && ['idle','paused'].includes(task.state)) {
      task.requestedHandoff = null;
      this.store.save(task);
      this.switch(id,next);
      return this.run(id,'先读取交接记录并核对已改动的文件，继续上一条尚未完成的工作；不要重复已经成功的操作。');
    }
    if(next){task.requestedHandoff=null;this.store.save(task);this.event(id,'notice',{text:'未能确认旧执行安全结束，已取消自动交接。请先核对进度。'});}
    return this.store.get(id);
  }
  async codex(task, profile, text, instructions) {
    const rpc = new Rpc(profile, task.cwd);
    task.activePid = rpc.proc.pid;
    this.store.save(task);
    this.active.rpc = rpc;
    let terminal = null;
    let resolveTurn;
    const finished = new Promise((resolve) => {
      resolveTurn = resolve;
    });
    rpc.on("closed", () => {
      if (!terminal) resolveTurn();
    });
    rpc.on("message", (message) => {
      const p = message.params || {};
      if (message.id !== undefined) {
        if (message.method?.endsWith("requestApproval")) {
          this.active?.pending.set(String(message.id), message);
          this.emit("approval", {
            taskId: task.id,
            id: String(message.id),
            method: message.method,
            params: p,
          });
        } else {
          rpc.write({
            id: message.id,
            error: {
              code: -32601,
              message: "This request is not supported by Prism yet.",
            },
          });
          this.event(task.id, "notice", {
            text: `CLI 请求了暂未接入的能力：${message.method}`,
          });
        }
        return;
      }
      if (message.method === "item/agentMessage/delta")
        this.emit("delta", {
          taskId: task.id,
          itemId: p.itemId,
          text: p.delta,
        });
      if (message.method === "item/completed") {
        const item = p.item;
        if (item?.type === "agentMessage")
          this.event(task.id, "assistant", {
            text: item.text,
            profile: profile.id,
          });
        else if (
          [
            "commandExecution",
            "fileChange",
            "mcpToolCall",
            "webSearch",
          ].includes(item?.type)
        )
          this.event(task.id, "tool", {
            text: item.command || item.type,
            data: item,
            profile: profile.id,
          });
      }
      if (message.method === "turn/plan/updated")
        this.event(task.id, "plan", { data: p });
      if (message.method === "turn/diff/updated")
        this.event(task.id, "diff", { text: p.diff });
      if (message.method === "turn/completed") {
        terminal = p.turn;
        resolveTurn();
      }
      if (message.method === "turn/started") {
        this.active.turnId = p.turn.id;
        this.active.started = true;
      }
    });
    try {
      await rpc.init();
      const auth = await rpc.call("account/read");
      if (auth.account?.type !== "chatgpt")
        throw Error("该入口没有使用 ChatGPT 订阅登录，调用已阻止。");
      if(this.active.cancelRequested){this.state(task,'paused');return;}
      const usage=await rpc.call('account/rateLimits/read');
      const quota=quotaView(usage);this.emit('quota',{id:profile.id,...quota,status:'官方额度查询',checkedAt:new Date().toISOString()});
      if(quota.remaining===0){this.active.quotaExhausted=true;this.state(task,'failed');return;}
      const options = {
        cwd: task.cwd,
        model: profile.model,
        modelProvider: "openai",
        approvalPolicy: "on-request",
        sandbox: task.mode === "read-only" ? "read-only" : "workspace-write",
        developerInstructions: instructions,
      };
      const session = task.sessions[profile.id];
      const result = await rpc.call(
        session ? "thread/resume" : "thread/start",
        session ? { ...options, threadId: session } : options,
      );
      task.sessions[profile.id] = result.thread.id;
      this.store.save(task);
      if(this.active.cancelRequested){this.state(task,'paused');return;}
      this.event(task.id, "notice", {
        text: `已连接 ${profile.provider} · ${profile.name}。工作目录：${task.cwd}`,
      });
      this.active.started = true;
      const started = await rpc.call("turn/start", {
        threadId: result.thread.id,
        input: [{ type: "text", text: text.trim() }],
        model: profile.model,
        effort: profile.effort || "xhigh",
        sandboxPolicy:
          task.mode === "read-only"
            ? { type: "readOnly" }
            : {
                type: "workspaceWrite",
                writableRoots: [task.cwd],
                networkAccess: true,
              },
      });
      this.active.turnId = started.turn.id;
      this.active.started = true;
      if(this.active.cancelRequested)await rpc.call('turn/interrupt',{threadId:task.sessions[profile.id],turnId:started.turn.id});
      await finished;
    } finally {
      await rpc.end();
    }
    if (!terminal)
      throw Error(
        "执行连接意外结束，不能确认任务完成。检查记录与文件后再继续。",
      );
    if (terminal.status === "completed") this.state(task, "idle");
    else if (terminal.status === "interrupted") {
      this.event(task.id, "notice", {
        text: "本次执行已停止，子进程已退出。已写入的文件仍保留，请先检查进度。",
      });
      this.state(task, "paused");
    } else {
      this.active.quotaExhausted=codexExhausted(terminal.error);
      this.event(task.id, "notice", {
        text: terminal.error?.message || "执行失败，可查看日志或更换账号继续。",
        data: terminal.error,
      });
      this.state(task, "failed");
    }
  }
  async claude(task, profile, text, instructions) {
    const usage=await require('./provider-quota.cjs').claudeQuota(profile,task.cwd);
    this.emit('quota',usage);
    if(usage.extraUsageEnabled!==false)throw Error(usage.extraUsageEnabled===true?'此 Claude 账号已启用额外付费用量。请先在 Claude 关闭额外用量，或选择其他账号；棱镜未发起模型请求。':'无法确认此 Claude 账号已关闭额外付费用量；棱镜未发起模型请求，请刷新或选择其他账号。');
    if(usage.remaining===0){this.active.quotaExhausted=true;this.state(task,'failed');return;}
    if(this.active.cancelRequested){this.state(task,'paused');return;}
    const settingsFile = path.join(
      this.store.dir(task.id),
      "claude-settings.json",
    );
    fs.writeFileSync(
      settingsFile,
      JSON.stringify({ apiKeyHelper: "", env: {} }),
    );
    const args = [
      "--print",
      "--verbose",
      "--output-format",
      "stream-json",
      "--include-partial-messages",
      "--model",
      profile.model,
      "--effort",
      profile.effort || "high",
      "--setting-sources",
      "",
      "--settings",
      settingsFile,
      "--strict-mcp-config",
      "--mcp-config",
      '{"mcpServers":{}}',
      "--append-system-prompt",
      instructions,
      "--permission-mode",
      "dontAsk",
      "--allowedTools",
      task.mode === "read-only"
        ? "Read,Glob,Grep"
        : "Read,Glob,Grep,Edit,Write,Bash",
      "--tools",
      task.mode === "read-only"
        ? "Read,Glob,Grep"
        : "Read,Glob,Grep,Edit,Write,Bash",
    ];
    if (task.sessions[profile.id])
      args.push("--resume", task.sessions[profile.id]);
    const proc = spawnCLI(profile, args, task.cwd);
    task.activePid = proc.pid;
    this.store.save(task);
    this.active.proc = proc;
    let buffer = "";
    let result = null;
    let errorText = "";
    this.active.started = true;
    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");
    proc.stdout.on("data", (data) => {
      buffer += data;
      let i;
      while ((i = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, i);
        buffer = buffer.slice(i + 1);
        let msg;
        try {
          msg = JSON.parse(line);
        } catch {
          continue;
        }
        if(msg.type==='rate_limit_event') {
          const q=recordClaude(profile.id,msg.rate_limit_info,profile.model);if(q){this.emit('quota',q);this.active.quotaByWindow[msg.rate_limit_info.rateLimitType||'unknown']=require('./quota.cjs').normalizeClaude(msg.rate_limit_info,Date.now(),profile.model);this.active.quotaExhausted=Object.values(this.active.quotaByWindow).some(w=>w?.exhausted);}
          if(msg.rate_limit_info?.isUsingOverage){this.event(task.id,'notice',{text:'CLI 返回额外付费用量状态，棱镜已停止此执行。'});this.active.cancelRequested=true;this.active.quotaExhausted=false;proc.kill();}
        }
        if (msg.session_id) {
          task.sessions[profile.id] = msg.session_id;
          this.store.save(task);
        }
        if (
          msg.type === "stream_event" &&
          msg.event?.delta?.type === "text_delta"
        )
          this.emit("delta", { taskId: task.id, text: msg.event.delta.text });
        if (msg.type === "assistant")
          for (const part of msg.message?.content || []) {
            if (part.type === "text")
              this.event(task.id, "assistant", {
                text: part.text,
                profile: profile.id,
              });
            else if (part.type === "tool_use")
              this.event(task.id, "tool", {
                text: part.name,
                data: part,
                profile: profile.id,
              });
          }
        if (msg.type === "user")
          for (const part of msg.message?.content || [])
            if (part.type === "tool_result")
              this.event(task.id, "tool", {
                text: "工具结果",
                data: part,
                profile: profile.id,
              });
        if (msg.type === "result") result = msg;
      }
    });
    proc.stderr.on("data", (data) => {
      errorText = (errorText + data).slice(-4000);
    });
    proc.stdin.end(text.trim());
    const code = await new Promise((resolve, reject) => {
      proc.on("close", resolve);
      proc.on("error", reject);
    });
    if(this.active.stopSignal)await this.active.stopSignal.catch(()=>{});
    if(this.active.cancelRequested && this.active.stopAcknowledged && code===1223){
      this.event(task.id,'notice',{text:'Claude 执行及其子进程已停止；交接时将核对可能的部分写入。'});
      delete task.sessions[profile.id];
      this.state(task,'paused');
    }
    else if (code === 0 && result && !result.is_error) this.state(task, "idle");
    else if (result) {
      this.event(task.id, "notice", {
        text: result.result || "CLI 未完成本次工作。",
        data: { subtype: result.subtype, errors: result.errors },
      });
      this.state(task, "failed");
    } else if(this.active.quotaExhausted && !this.active.cancelRequested) this.state(task,'failed');
    else
      throw Error(
        `Claude 未返回完整结束记录（退出码 ${code}）。${errorText.slice(-600)}`,
      );
  }
  async stop() {
    const run = this.active;
    if (!run) return;
    if(run.started && !run.proc?.requestStop && !(run.grok && run.sessionId) && !(run.rpc && run.turnId))
      throw Error('该执行暂不支持可靠的中途停止。请等待结束后切换，避免重复修改文件。');
    run.cancelRequested=true;
    if(!run.started){this.state(run.task,'stopping');return;}
    if(run.proc?.requestStop){
      this.state(run.task,'stopping');
      run.stopSignal=run.proc.requestStop().then(()=>{run.stopAcknowledged=true;});
      try{await run.stopSignal;}catch(e){run.cancelRequested=false;this.state(run.task,'running');throw e;}
      return;
    }
    if(run.grok && run.sessionId){this.state(run.task,'stopping');run.rpc.write({method:'session/cancel',params:{sessionId:run.sessionId}});return;}
    if (!run.rpc || !run.turnId)
      throw Error(
        "该执行暂不支持可靠的中途停止。请等待结束后切换，避免重复修改文件。",
      );
    this.state(run.task, "stopping");
    await run.rpc.call("turn/interrupt", {
      threadId: run.task.sessions[run.profile.id],
      turnId: run.turnId,
    });
  }
  async stopAndContinue(id, profile) {
    const run = this.active;
    if(!run || run.task.id!==id)throw Error('当前任务没有正在执行的请求');
    if(run.requestedHandoff)throw Error('正在等待旧执行停止');
    const next = profileFor(profile);
    if(run.task.mode==='workspace-write'&&!next.write)throw Error('目标账号仅支持只读研究');
    if(run.started && !run.proc?.requestStop && !(run.grok && run.sessionId) && !(run.rpc && run.turnId))throw Error('此入口暂不支持可靠中断，请等待本轮结束');
    run.requestedHandoff=profile;
    try { await this.stop(); } catch(e){delete run.requestedHandoff;throw e;}
  }
  approve(id, decision) {
    if (!["accept", "decline"].includes(decision))
      throw Error("审批选项无效。");
    const run = this.active;
    const message = run?.pending.get(String(id));
    if (!message) throw Error("这项确认已失效。");
    run.pending.delete(String(id));
    run.rpc.write({ id: message.id, result: { decision } });
    this.event(run.task.id, "notice", {
      text: `本次工具请求：${decision === "accept" ? "已允许" : "已拒绝"}`,
    });
  }
  async grok(task,profile,text,instructions) {
    const usage=await require('./provider-quota.cjs').grokQuota(profile,task.cwd);this.emit('quota',usage);
    if(usage.extraUsageEnabled!==false)throw Error('此 Grok 账号的额外付费或自动充值状态未确认关闭；棱镜未发起模型请求，请检查账号计费设置。');
    if(usage.remaining===0){this.active.quotaExhausted=true;this.state(task,'failed');return;}
    return require('./grok.cjs').runGrok(this,task,profile,text,instructions);
  }
  async gemini(task,profile,text,instructions) {return require('./gemini.cjs').runGemini(this,task,profile,text,instructions);}
}
module.exports = { Runner };
