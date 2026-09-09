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
    require('./goal-lifecycle.cjs').execution(task,state);
    if(state==='paused')require('./goal-lifecycle.cjs').pause(task);
    task.state = state;
    if (!["running", "stopping", "unknown"].includes(state)) delete task.activePid;
    this.store.save(task);
    this.emit("state", task);
  }
  confirmExecution(task,profile,reportedModel){
    if(!this.active||this.active.task.id!==task.id||!task.execution||this.active.confirmed)return;
    this.active.confirmed=true;
    delete task.relaySource;
    task.execution.confirmed=true;
    if(reportedModel)task.execution.reportedModel=reportedModel;
    const previous=task.lastExecution;
    task.lastExecution={...task.execution,confirmedAt:new Date().toISOString()};
    const changed=previous&&(previous.profile!==profile.id||previous.model!==profile.model||previous.effort!==profile.effort);
    this.event(task.id,'notice',{text:`${changed?'已切换':'已开始执行'} · ${profile.provider} / ${profile.name} · ${reportedModel||profile.model} · ${profile.effort}`,executionStatus:changed?'已切换':'已开始执行',accountName:profile.name,provider:profile.provider,execution:task.lastExecution});
    this.store.save(task);this.emit('state',task);
  }
  assertIdle(task) {
    if (this.active || ["running", "stopping", "unknown"].includes(task.state))
      throw Error("请等待当前执行结束；状态未知时需先核对工作目录。");
  }
  switch(id, profile) {
    const task = this.store.get(id);
    // Account selection belongs to this task; another task may keep running.
    if (this.active?.task.id === id || ["running", "stopping", "unknown"].includes(task.state))
      throw Error("请等待当前执行结束；状态未知时需先核对工作目录。");
    require('./task-settings.cjs').applyPendingMode(task);
    const nextProfile=profileFor(profile);
    if(nextProfile.disabled)throw Error('账号尚未启用，请先登录或选择其他账号。');
    require('./task-settings.cjs').validateMode(task.mode,nextProfile);
    if (task.profile === profile) return this.store.save(task);
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
  async steer(id,text,images=[]){
    const active=this.active;
    if(!active||active.task.id!==id||active.profile.provider!=='Codex'||!active.rpc||!active.turnId||active.cancelRequested)return false;
    await active.rpc.call('turn/steer',{threadId:active.task.sessions[active.profile.id],expectedTurnId:active.turnId,input:require('./attachments.cjs').codexInput(text,images)});
    this.event(id,'user',{text,images,profile:active.profile.id,steered:true});
    active.images=[...(active.images||[]),...images].slice(-5);
    this.store.context(active.task);return true;
  }
  async run(id, text, images=[], options={}) {
    if (typeof text !== "string" || !text.trim() || text.length > 60000)
      throw Error("请输入 1–60000 字的指令。");
    const task = this.store.get(id);
    this.assertIdle(task);
    if(task.goalLifecycle?.status==='paused')throw Error('目标已暂停，请先继续目标。');
    if(task.planReviewRequired&&!options.planning)throw Error('请核对计划并确认后执行');
    require('./task-settings.cjs').applyPendingMode(task);
    let profile = require('./models.cjs').selection(task,profileFor(task.profile));
    if(profile.disabled)throw Error('账号尚未启用，请先登录或选择其他账号。');
    require('./task-settings.cjs').validateMode(options.planning?'read-only':task.mode,profile);
    if(images.some(image=>image.kind!=='file')&&!['Codex','Claude','Grok'].includes(profile.provider))throw Error('当前入口暂不支持图片，请选择 Codex、Claude 或 Grok');
    this.event(id, "user", { text: text.trim(), images, profile: profile.id });
    this.active = { task, profile, images, planning:!!options.planning, phase: "starting", pending: new Map(), cancelRequested:false };
    delete task.stopReason;delete task.relaySource;
    const planRevision=task.workPlan?.revision;
    this.active.planRevision=planRevision;
    if(options.planning){task.planReviewRequired=true;delete task.sessions[profile.id];this.store.save(task);}
    this.state(task, "running");
    try {
      const attempted=new Set();let instruction=text;
      while(true) {
        if(task.pendingModelRefresh?.[profile.id]){delete task.sessions[profile.id];delete task.pendingModelRefresh[profile.id];this.store.save(task);}
        attempted.add(profile.id);
        Object.assign(this.active,{profile,questions:new Map(),confirmed:false,started:false,quotaExhausted:false,quotaByWindow:{},rpc:null,proc:null,turnId:null,grok:false,sessionId:null});
        task.execution = {profile:profile.id, model:profile.model, effort:profile.effort, mode:options.planning?'read-only':task.mode};
        const record=this.store.context(task);
        const instructions=environmentPrompt({...task,mode:task.execution.mode},capabilities(),record)+(options.planning?'\n本轮只制订计划，禁止实施。读取必要材料后给出可核对的步骤与验收条件，等待用户确认。最后用 JSON 代码块返回 {"steps":[{"text":"步骤及验收条件"}]}，供界面展示待确认步骤。':'');
        this.state(task,'running');
        try {
          const withGoals=instructions+'\n'+require('./task-plan.cjs').goalInstructions;
          if(profile.provider==='Codex')await this.codex(task,profile,instruction,withGoals);
          else if(profile.provider==='Claude')await this.claude(task,profile,instruction,withGoals);
          else if(profile.provider==='Gemini')await this.gemini(task,profile,instruction,withGoals);
          else await this.grok(task,profile,instruction,withGoals);
        } catch(e) {
          this.event(id,'notice',{text:e.message});
          if(['running','stopping'].includes(task.state))this.state(task,this.active.started?'unknown':'failed');
        }
        if(this.active.quotaExhausted)this.event(id,'notice',{text:`${profile.provider} / ${profile.name} 订阅额度已耗尽。${task.autoSwitch===false?'自动接续已关闭，请选择其他账号继续。':'正在检查可接续的账号。'}`});
        if(task.autoSwitch===false || this.active.cancelRequested || !this.active.quotaExhausted || task.state!=='failed')break;
        require('./task-settings.cjs').applyPendingMode(task);
        const ordered=[...(task.relayOrder||[]).map(id=>PROFILES.find(p=>p.id===id)).filter(Boolean),...PROFILES.filter(p=>!(task.relayOrder||[]).includes(p.id))];
        const next=ordered.find(p=>!p.disabled&&!attempted.has(p.id) && (!this.active.images.some(image=>image.kind!=='file')||['Codex','Claude','Grok'].includes(p.provider)) && (task.execution.mode==='read-only'||p.write&&['Codex','Claude','Grok'].includes(p.provider)));
        if(!next){this.event(id,'notice',{text:'已尝试所有符合当前权限的入口；没有自动重复调用。'});break;}
        this.active.pending.clear();
        this.emit('approval-reset',{taskId:task.id});
        this.event(id,'handoff',{progress:require('./handoff.cjs').snapshot(task,this.store.events(id)),text:`${profile.provider} / ${profile.name} 已由官方确认额度耗尽；旧执行已结束，自动切换到 ${next.provider} / ${next.name}，继续同一任务。`});
        profile=require('./models.cjs').selection(task,next);task.profile=next.id;delete task.sessions[next.id];this.store.save(task);
        task.relaySource='quota_exhausted';
        instruction='继续这条任务尚未完成的工作。先读取持久工作记录和当前项目文件，核对前序账号实际完成的部分；已有成功操作不得重复执行，部分写入先核实再续做。不要要求用户重新描述任务。';
      }
    } finally {
      if(this.active?.quotaExhausted)task.stopReason='quota_exhausted';
      delete task.relaySource;
      require('./task-plan.cjs').suggest(task,this.store.events(id),planRevision);
      if(options.planning){delete task.sessions[profile.id];if(task.state==='idle')require('./task-plan.cjs').capture(task,this.store.events(id),this.active?.planRevision);}
      task.requestedHandoff = this.active?.requestedHandoff || null;
      delete task.execution;
      delete task.activeQuestionIds;
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
      return this.run(id,options.planning?'继续制订计划，不实施，等待用户确认。':'先读取交接记录并核对已改动的文件，继续上一条尚未完成的工作；不要重复已经成功的操作。',[],options);
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
        if(require('./goal-tools.cjs').request(this,task,message))return;
        if(message.method==="item/tool/requestUserInput"&&require("./questions.cjs").request(this,task,message))return;
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
      if(message.method==='item/reasoning/summaryTextDelta')this.emit('reasoning',{taskId:task.id,itemId:p.itemId,text:p.delta});
      if(message.method==='item/reasoning/summaryPartAdded')this.emit('reasoning',{taskId:task.id,itemId:p.itemId,text:'\n\n'});
      if(message.method==='item/started'&&['commandExecution','fileChange','mcpToolCall','webSearch'].includes(p.item?.type))this.emit('activity',{taskId:task.id,text:p.item.command||p.item.type});
      if (message.method === "item/completed") {
        const item = p.item;
        if (item?.type === "agentMessage")
          this.event(task.id, "assistant", {
            text: item.text,
            profile: profile.id,
          });
        else if(item?.type==='reasoning'&&item.summary?.length)this.event(task.id,'reasoning',{text:item.summary.join('\n'),profile:profile.id});
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
        this.confirmExecution(task,profile);
      }
    });
    try {
      await rpc.init();
      const auth = await rpc.call("account/read");
      if (auth.account?.type !== "chatgpt")
        throw Error("该入口没有使用 ChatGPT 订阅登录，调用已阻止。");
      if(profile.email&&auth.account.email?.toLowerCase()!==profile.email.toLowerCase())throw Error('登录账号与已有账号身份不一致，请使用原账号登录。');
      if(this.active.cancelRequested){this.state(task,'paused');return;}
      const usage=await rpc.call('account/rateLimits/read');
      const quota=quotaView(usage);this.emit('quota',{id:profile.id,email:auth.account.email,...quota,status:'官方额度查询',checkedAt:new Date().toISOString()});
      // Usage readings are informational; the service decides whether this turn can run.
      const options = {
        cwd: task.cwd,
        model: profile.model,
        modelProvider: "openai",
        approvalPolicy: require('./task-settings.cjs').codexPermissions((task.execution?.mode||task.mode)).approvalPolicy,
        sandbox: require('./task-settings.cjs').codexPermissions((task.execution?.mode||task.mode)).sandbox,
        developerInstructions: instructions,
      };
      // Older native sessions did not register Prism's goal tools. Their full
      // task history remains in the persistent handoff record.
      const session = task.goalToolSessions?.[profile.id]===task.sessions[profile.id] ? task.sessions[profile.id] : null;
      const result = await rpc.call(
        session ? "thread/resume" : "thread/start",
        session ? { ...options, threadId: session } : {...options,dynamicTools:require('./goal-tools.cjs').tools},
      );
      task.sessions[profile.id] = result.thread.id;
      task.goalToolSessions={...task.goalToolSessions,[profile.id]:result.thread.id};
      this.store.save(task);
      if(this.active.cancelRequested){this.state(task,'paused');return;}
      this.event(task.id, "notice", {
        text: `已连接 ${profile.provider} · ${profile.name}。工作目录：${task.cwd}`,
      });
      this.active.started = true;
      const started = await rpc.call("turn/start", {
        threadId: result.thread.id,
        input: require('./attachments.cjs').codexInput(text,this.active.images),
        model: profile.model,
        effort: profile.effort || "xhigh",
        summary:'auto',
        sandboxPolicy:
          (task.execution?.mode||task.mode) === "full-access" ? { type: "dangerFullAccess" } : (task.execution?.mode||task.mode) === "read-only"
            ? { type: "readOnly" }
            : {
                type: "workspaceWrite",
                writableRoots: [task.cwd],
                networkAccess: true,
              },
      });
      this.active.turnId = started.turn.id;
      this.confirmExecution(task,profile);
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
    // Claude extra usage is controlled by the subscription's administrator.
    // Report the flag without blocking; subscription authentication still applies.
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
      (task.execution?.mode||task.mode) === "full-access" ? "bypassPermissions" : "dontAsk",
      "--allowedTools",
      (task.execution?.mode||task.mode) === "read-only"
        ? "Read,Glob,Grep"
        : "Read,Glob,Grep,Edit,Write,Bash",
      "--tools",
      (task.execution?.mode||task.mode) === "read-only"
        ? "Read,Glob,Grep"
        : "Read,Glob,Grep,Edit,Write,Bash",
    ];
    if((task.execution?.mode||task.mode) === "full-access")args.push("--dangerously-skip-permissions");
    if(this.active.images?.length)args.push('--input-format','stream-json');
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
          if(msg.rate_limit_info?.isUsingOverage)this.active.quotaExhausted=false;
        }
        if ((msg.type==='system'&&msg.subtype==='init')||msg.type==='assistant') this.confirmExecution(task,profile,msg.model||msg.message?.model);
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
    proc.stdin.end(this.active.images?.length?require('./attachments.cjs').claudeInput(text,this.active.images):text.trim());
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
    if(run.grok && run.sessionId){
      for(const [id,message]of run.pending)if(message.method==='session/request_permission'){run.rpc.write({id:message.id,result:{outcome:{outcome:'cancelled'}}});run.pending.delete(id);}
      this.emit('approval-reset',{taskId:run.task.id});
      this.state(run.task,'stopping');run.rpc.write({method:'session/cancel',params:{sessionId:run.sessionId}});return;
    }
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
    require('./task-settings.cjs').validateMode(run.task.pendingMode||run.task.mode,next);
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
    if(message.method==='session/request_permission')run.rpc.write({id:message.id,result:{outcome:require('./grok.cjs').permissionOutcome(message.params,decision)}});
    else run.rpc.write({ id: message.id, result: { decision } });
    this.event(run.task.id, "notice", {
      text: `本次工具请求：${decision === "accept" ? "已允许" : "已拒绝"}`,
    });
  }
  async grok(task,profile,text,instructions) {
    const usage=await require('./provider-quota.cjs').grokQuota(profile,task.cwd);this.emit('quota',usage);
    // Extra usage and top-up settings are managed on the provider's platform.
    return require('./grok.cjs').runGrok(this,task,profile,text,instructions);
  }
  async gemini(task,profile,text,instructions) {return require('./gemini.cjs').runGemini(this,task,profile,require('./attachments.cjs').attachmentText(text,this.active.images),instructions);}
}
module.exports = { Runner };
