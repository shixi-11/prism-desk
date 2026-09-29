import React from 'react';
import {FileText,X} from 'lucide-react';
import {tr} from './i18n.js';
import './pasted-text.css';
export default function PastedTexts({cards,onRemove,onOpen}){return !!cards.length&&<div className="pasted-texts">{cards.map(card=><div className="pasted-text-card" key={card.id}><button type="button" className="pasted-text-open" onClick={()=>onOpen(card)} aria-label={tr('查看粘贴的文本')}><FileText aria-hidden="true" size={26}/><span><strong>{card.title}</strong><small>{tr('粘贴的文本')}</small></span></button><button type="button" className="pasted-text-remove" onClick={()=>onRemove(card.id)} aria-label={tr('移除粘贴的文本')}><X size={15}/></button></div>)}</div>;}
