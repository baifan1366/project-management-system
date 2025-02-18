import React, { useState } from 'react';
import { useTranslations } from 'next-intl';

export default function ChatDialog() {
  const [activeTab, setActiveTab] = useState('pm'); // 'pm' for private messages, 'group' for group chat
  const t = useTranslations('ChatDialog');

  return (
    <div className="border rounded-lg p-6 shadow-sm">
      <div className="flex justify-between mb-4">
        <button
          className={`px-4 py-2 ${activeTab === 'pm' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('pm')}
        >
          {t('privateMessages')}
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'group' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
          onClick={() => setActiveTab('group')}
        >
          {t('groupChat')}
        </button>
      </div>
      <div className="chat-content">
        {activeTab === 'pm' ? (
          <div>
            {/* 私人消息内容 */}
            <p>{t('privateMessagesContent')}</p>
          </div>
        ) : (
          <div>
            {/* 群聊内容 */}
            <p>{t('groupChatContent')}</p>
          </div>
        )}
      </div>
    </div>
  );
} 