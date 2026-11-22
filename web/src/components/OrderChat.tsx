import React, { useState } from 'react';
import { Send, MessageSquare } from 'lucide-react';
import { api, formatTime } from '../api/client';
import type { OrderMessage } from '../types';

interface OrderChatProps {
  orderId: string;
  messages: OrderMessage[];
  senderRole: 'customer' | 'driver' | 'merchant' | 'admin';
  senderName: string;
  dark?: boolean;
  quickReplies?: string[];
  onSent: (messages: OrderMessage[]) => void;
}

export function OrderChat({
  orderId,
  messages,
  senderRole,
  senderName,
  dark = false,
  quickReplies = [],
  onSent,
}: OrderChatProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (bodyText: string) => {
    const trimmed = bodyText.trim();
    if (!trimmed || sending) return;
    setSending(true);
    try {
      const res = await api.sendMessage(orderId, {
        sender_role: senderRole,
        sender_name: senderName,
        body: trimmed,
      });
      setText('');
      onSent(res.messages);
    } finally {
      setSending(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void handleSend(text);
  };

  return (
    <div className={`chat-box ${dark ? 'chat-dark' : ''}`}>
      <div className="chat-header">
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <MessageSquare size={15} />
          リアルタイム連絡チャット（品切れ相談・到着連絡）
        </span>
        <span style={{ fontSize: 11, opacity: 0.7 }}>{messages.length}件</span>
      </div>

      <div className="chat-messages">
        {messages.length === 0 ? (
          <div className="chat-empty">
            メッセージはまだありません。店頭での品切れ確認や置き配の連絡に利用できます。
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_role === senderRole;
            const roleTag =
              m.sender_role === 'driver'
                ? 'ドライバー'
                : m.sender_role === 'customer'
                ? 'お客様'
                : m.sender_role === 'merchant'
                ? '店舗'
                : '運営';
            return (
              <div key={m.id} className={`chat-bubble-wrap ${mine ? 'mine' : 'other'}`}>
                <span className="chat-sender">
                  {m.sender_name}（{roleTag}）・{formatTime(m.created_at)}
                </span>
                <div className="chat-bubble">{m.body}</div>
              </div>
            );
          })
        )}
      </div>

      {quickReplies.length > 0 && (
        <div style={{ padding: '6px 10px 0', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {quickReplies.map((qr) => (
            <button
              key={qr}
              type="button"
              onClick={() => void handleSend(qr)}
              disabled={sending}
              style={{
                fontSize: 11,
                padding: '4px 9px',
                borderRadius: 999,
                border: dark ? '1px solid rgba(255,255,255,0.16)' : '1px solid rgba(20,20,19,0.14)',
                background: dark ? 'rgba(255,255,255,0.06)' : '#fff',
                color: dark ? '#e5e7eb' : '#4e4d49',
              }}
            >
              {qr}
            </button>
          ))}
        </div>
      )}

      <form className="chat-form" onSubmit={onSubmit}>
        <input
          className="input"
          placeholder="メッセージを入力..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={sending}
        />
        <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
          <Send size={14} />
          送信
        </button>
      </form>
    </div>
  );
}
