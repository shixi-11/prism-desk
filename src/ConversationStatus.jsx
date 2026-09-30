import React from 'react';
import {tr} from './i18n.js';
import {conversationStatus} from './conversation-status.js';
export default function ConversationStatus(props) {
  const status=conversationStatus(props);
  if(!status)return null;
  const label=tr(status.label);
  // The highlight is a moving copy of the label. It only animates transforms, so the
  // compositor can run it without repainting the conversation on every frame.
  return <div className={`conversation-status ${status.moving?'is-active':''}`} data-state={status.kind} role="status" aria-live="polite" aria-atomic="true"><span className="conversation-status-text">{label}{status.moving&&<span className="conversation-status-shine" aria-hidden="true"><span>{label}</span></span>}</span></div>;
}
