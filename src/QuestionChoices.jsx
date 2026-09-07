import React,{useState} from 'react';
import {tr} from './i18n.js';
export function proseQuestion(text){
 const clean=(text||'').replace(/```[\s\S]*?```/g,'');
 const match=clean.match(/([^\n]*[?？][^\n]*)\n+((?:\s*(?:[-*•]|\d+[.)、])\s+[^\n]+\n?){2,6})\s*$/);
 if(!match)return null;
 const options=match[2].trim().split('\n').map(s=>s.trim().replace(/^(?:[-*•]|\d+[.)、])\s+/,''));
 return {id:'choice',question:match[1],options:options.map(label=>({label})),prefix:clean.slice(0,match.index).trim()};
}
export default function QuestionChoices({questions,onAnswer,disabled,answer}){
 const [values,setValues]=useState({}),[custom,setCustom]=useState({}),[busy,setBusy]=useState(false),[sent,setSent]=useState(false),[error,setError]=useState('');
 if(answer||sent)return <div className="question-sent" role="status">{questions.map(q=><p key={q.id}>{q.question}</p>)}<p>{answer||`${tr('已提交选择')} · ${questions.map(q=>values[q.id]).filter(Boolean).join('；')}`}</p></div>;
 const submit=async()=>{setBusy(true);setError('');try{await onAnswer(Object.fromEntries(questions.map(q=>[q.id,{answers:[values[q.id]||'']}])));setSent(true);}catch(e){setError(e.message);}finally{setBusy(false);}};
 return <div className="question-choices">{questions.map(q=><fieldset key={q.id} disabled={disabled||busy}><legend>{q.question}</legend>{q.options?.map((o,i)=><button type="button" key={i} className="outline" aria-pressed={!custom[q.id]&&values[q.id]===o.label} onClick={()=>{setCustom({...custom,[q.id]:false});setValues({...values,[q.id]:o.label});}}>{o.label}{o.description&&<small>{o.description}</small>}</button>)}<button type="button" className="outline" aria-pressed={!!custom[q.id]} onClick={()=>{setCustom({...custom,[q.id]:true});setValues({...values,[q.id]:''});}}>{tr('自己填写')}</button>{(custom[q.id]||!q.options?.length)&&<textarea aria-label={q.question} value={values[q.id]||''} onChange={e=>setValues({...values,[q.id]:e.target.value})}/>}</fieldset>)}<button disabled={disabled||busy||questions.some(q=>!values[q.id]?.trim())} onClick={submit}>{tr('提交选择')}</button>{error&&<p role="alert">{error}</p>}</div>;
}
