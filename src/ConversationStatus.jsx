import React from 'react';
import {tr} from './i18n.js';
import {conversationStatus} from './conversation-status.js';
export default function ConversationStatus(props) {
  const status=conversationStatus(props);
  if(!status)return null;
  return <div className={`conversation-status ${status.moving?'is-active':''}`} data-state={status.kind} role="status" aria-live="polite" aria-atomic="true"><span className="conversation-status-mark" aria-hidden="true"/><span>{tr(status.label)}</span></div>;
}
