// Goal time counts execution time only. Pauses, idle time and app downtime do
// not accrue. Dates and accumulated milliseconds are stored with the task.
function ensure(task,now=Date.now()){
 if(!task.workPlan?.goal)return null;
 return task.goalLifecycle ||= {status:'active',createdAt:now,elapsedMs:0,runningSince:null};
}
function settle(task,now=Date.now()){
 const g=task.goalLifecycle;if(!g)return;
 if(Number.isFinite(g.runningSince))g.elapsedMs=(g.elapsedMs||0)+Math.max(0,now-g.runningSince);
 g.runningSince=null;
}
function execution(task,state,now=Date.now()){
 const g=ensure(task,now);if(!g)return;
 if(state==='running'&&g.status==='active'){if(!Number.isFinite(g.runningSince))g.runningSince=now;}
 else if(!['running','stopping'].includes(state))settle(task,now);
}
function pause(task,now=Date.now()){const g=ensure(task,now);if(!g)return;settle(task,now);g.status='paused';}
function resume(task){const g=ensure(task);if(g)g.status='active';}
function recover(task){if(task.goalLifecycle?.runningSince!=null){settle(task,Date.parse(task.updated)||task.goalLifecycle.runningSince);task.goalLifecycle.status='paused';}}
function remove(task){delete task.workPlan;delete task.goalLifecycle;delete task.goalSuggestion;delete task.planApproved;delete task.planReviewRequired;}
module.exports={ensure,settle,execution,pause,resume,recover,remove};
