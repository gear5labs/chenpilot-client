'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/store';
import { ClientOnlyChatLayout } from '@/components/layout/ClientOnlyChatLayout';
import ChatEngine from '@/components/chat/ChatEngine';

function ChatPageContent() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/auth/login');
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return (
      <ClientOnlyChatLayout>
        <div className="h-full flex items-center justify-center bg-[#0F0F23] text-white">
          <p className="text-gray-300">Redirecting to login...</p>
        </div>
      </ClientOnlyChatLayout>
    );
  }

  return (
    <ClientOnlyChatLayout>
      <ChatEngine />
    </ClientOnlyChatLayout>
  );
}

export default ChatPageContent;