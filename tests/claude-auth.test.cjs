require('./helpers/config-fixture.cjs');
const test=require('node:test'),assert=require('node:assert/strict'),{verifyClaudeStatus}=require('../electron/core.cjs');
test('Claude missing login is actionable and API login never passes the subscription check',()=>{
 for(const status of [{loggedIn:false,authMethod:'none'},{loggedIn:true,authMethod:'api_key'}])assert.throws(()=>verifyClaudeStatus({},status),e=>e.code==='AUTH_REQUIRED');
});
test('configured Claude account cannot silently change email or subscription',()=>{
 const profile={email:'owner@example.com',subscriptionType:'team'},status={loggedIn:true,authMethod:'claude.ai',email:'owner@example.com',subscriptionType:'team'};
 assert.equal(verifyClaudeStatus(profile,status).email,profile.email);
 assert.throws(()=>verifyClaudeStatus(profile,{...status,email:'different@example.com'}),e=>e.code==='AUTH_REQUIRED');
 assert.throws(()=>verifyClaudeStatus(profile,{...status,subscriptionType:'pro'}),e=>e.code==='AUTH_REQUIRED');
});
