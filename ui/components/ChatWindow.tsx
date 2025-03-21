'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Document } from '@langchain/core/documents';
import Navbar from './Navbar';
import Chat from './Chat';
import EmptyChat from './EmptyChat';
import crypto from 'crypto';
import { toast } from 'sonner';
import { useSearchParams } from 'next/navigation';
import { getSuggestions } from '@/lib/actions';
import { Settings } from 'lucide-react';
import Link from 'next/link';
import NextError from 'next/error';
import { useSocket } from '@/lib/socket';
import { chatWithCache } from '@/lib/pythonApi';
import { ChatMessage, HistoryEntry, File } from '@/types';

const loadMessages = async (
  chatId: string,
  setMessages: (messages: ChatMessage[]) => void,
  setIsMessagesLoaded: (loaded: boolean) => void,
  setChatHistory: (history: [string, string][]) => void,
  setFocusMode: (mode: string) => void,
  setNotFound: (notFound: boolean) => void,
  setFiles: (files: File[]) => void,
  setFileIds: (fileIds: string[]) => void,
) => {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_API_URL}/chats/${chatId}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    },
  );

  if (res.status === 404) {
    setNotFound(true);
    setIsMessagesLoaded(true);
    return;
  }

  const data = await res.json();

  const messages = data.messages.map((msg: any) => {
    return {
      ...msg,
      ...JSON.parse(msg.metadata),
    };
  }) as ChatMessage[];

  setMessages(messages);

  const history = messages.map((msg) => {
    return [msg.role, msg.content];
  }) as [string, string][];

  console.debug(new Date(), 'app:messages_loaded');

  document.title = messages[0].content;

  const files = data.chat.files.map((file: any) => {
    return {
      fileName: file.name,
      fileExtension: file.name.split('.').pop(),
      fileId: file.fileId,
    };
  });

  setFiles(files);
  setFileIds(files.map((file: File) => file.fileId));

  setChatHistory(history);
  setFocusMode(data.chat.focusMode);
  setIsMessagesLoaded(true);
};

const ChatWindow = ({ id }: { id?: string }) => {
  const searchParams = useSearchParams();
  const initialMessage = searchParams.get('q');

  const [chatId, setChatId] = useState<string | undefined>(id);
  const [newChatCreated, setNewChatCreated] = useState(false);

  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [isWSReady, setIsWSReady] = useState(false);
  const ws = useSocket(
    `${process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') || ''}/ws`,
    setIsWSReady,
    setHasError,
  );

  const [loading, setLoading] = useState(false);
  const [messageAppeared, setMessageAppeared] = useState(false);

  const [chatHistory, setChatHistory] = useState<[string, string][]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [fileIds, setFileIds] = useState<string[]>([]);

  const [focusMode, setFocusMode] = useState('webSearch');
  const [optimizationMode, setOptimizationMode] = useState('speed');

  const [isMessagesLoaded, setIsMessagesLoaded] = useState(false);

  const [notFound, setNotFound] = useState(false);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [useCacheApi, setUseCacheApi] = useState(true);
  const [autoImageSearch, setAutoImageSearch] = useState(false);
  const [autoVideoSearch, setAutoVideoSearch] = useState(false);

  useEffect(() => {
    // 从localStorage加载自动视频和图片搜索的设置
    const savedAutoImageSearch = localStorage.getItem('autoImageSearch') === 'true';
    const savedAutoVideoSearch = localStorage.getItem('autoVideoSearch') === 'true';
    
    setAutoImageSearch(savedAutoImageSearch);
    setAutoVideoSearch(savedAutoVideoSearch);
    
    if (
      chatId &&
      !newChatCreated &&
      !isMessagesLoaded &&
      messages.length === 0
    ) {
      loadMessages(
        chatId,
        setMessages,
        setIsMessagesLoaded,
        setChatHistory,
        setFocusMode,
        setNotFound,
        setFiles,
        setFileIds,
      );
    } else if (!chatId) {
      setNewChatCreated(true);
      setIsMessagesLoaded(true);
      setChatId(crypto.randomBytes(20).toString('hex'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (ws?.readyState === 1) {
        ws.close();
        console.debug(new Date(), 'ws:cleanup');
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (isMessagesLoaded && isWSReady) {
      setIsReady(true);
      console.debug(new Date(), 'app:ready');
    } else {
      setIsReady(false);
    }
  }, [isMessagesLoaded, isWSReady]);

  const sendMessage = async (message: string, messageId?: string) => {
    if (loading) return;
    
    setLoading(true);
    setMessageAppeared(false);

    let sources: Document[] | undefined = undefined;
    let recievedMessage = '';
    let added = false;

    messageId = messageId ?? crypto.randomBytes(7).toString('hex');

    setMessages((prevMessages: ChatMessage[]) => [
      ...prevMessages,
      {
        content: message,
        messageId: messageId,
        chatId: chatId!,
        role: 'user',
        createdAt: new Date(),
      },
    ]);

    if (useCacheApi) {
      try {
        const response = await chatWithCache(
          message,
          chatHistory,
          focusMode,
          optimizationMode
        );

        if (response) {
          recievedMessage = response.message;
          sources = response.sources;
          
          setMessageAppeared(true);
          
          setMessages((prevMessages: ChatMessage[]) => [
            ...prevMessages,
            {
              content: recievedMessage,
              messageId: messageId!,
              chatId: chatId!,
              role: 'assistant',
              sources: sources,
              createdAt: new Date(),
              cachedResponse: response.cached,
              imageData: response.imageUrl ? {
                success: true,
                imageUrl: response.imageUrl,
                downloadUrl: response.downloadUrl || response.imageUrl,
                text: recievedMessage
              } : undefined
            },
          ]);
          
          setChatHistory((prevHistory: [string, string][]) => [
            ...prevHistory,
            ['human', message],
            ['assistant', recievedMessage],
          ]);
          
          if (sources && sources.length > 0) {
            const suggestions = await getSuggestions(messagesRef.current);
            setMessages((prev: ChatMessage[]) =>
              prev.map((msg: ChatMessage) => {
                if (msg.messageId === messageId) {
                  return { ...msg, suggestions: suggestions };
                }
                return msg;
              }),
            );
          }
          
          const autoImageSearch = localStorage.getItem('autoImageSearch');
          const autoVideoSearch = localStorage.getItem('autoVideoSearch');
          
          if (autoImageSearch === 'true') {
            document.getElementById('search-images')?.click();
          }
          
          if (autoVideoSearch === 'true') {
            document.getElementById('search-videos')?.click();
          }
          
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('使用缓存API出错:', error);
      }
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      toast.error('无法连接到服务器');
      setLoading(false);
      return;
    }

    ws.send(
      JSON.stringify({
        type: 'message',
        message: {
          messageId: messageId,
          chatId: chatId!,
          content: message,
        },
        files: fileIds,
        focusMode: focusMode,
        optimizationMode: optimizationMode,
        history: [...chatHistory, ['human', message]],
      }),
    );

    const messageHandler = async (e: MessageEvent) => {
      const data = JSON.parse(e.data);

      if (data.type === 'error') {
        toast.error(data.data);
        setLoading(false);
        return;
      }

      if (data.type === 'image') {
        setMessages((prev: ChatMessage[]) =>
          prev.map((message: ChatMessage) => {
            if (message.messageId === data.messageId) {
              return { 
                ...message, 
                imageData: data.data
              };
            }
            return message;
          })
        );
      }

      if (data.type === 'sources') {
        sources = data.data;
        if (!added) {
          setMessages((prevMessages: ChatMessage[]) => [
            ...prevMessages,
            {
              content: '',
              messageId: data.messageId,
              chatId: chatId!,
              role: 'assistant',
              sources: sources,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }
        setMessageAppeared(true);
      }

      if (data.type === 'message') {
        if (!added) {
          setMessages((prevMessages: ChatMessage[]) => [
            ...prevMessages,
            {
              content: data.data,
              messageId: data.messageId,
              chatId: chatId!,
              role: 'assistant',
              sources: sources,
              createdAt: new Date(),
            },
          ]);
          added = true;
        }

        setMessages((prev: ChatMessage[]) =>
          prev.map((message: ChatMessage) => {
            if (message.messageId === data.messageId) {
              return { ...message, content: message.content + data.data };
            }

            return message;
          }),
        );

        recievedMessage += data.data;
        setMessageAppeared(true);
      }

      if (data.type === 'messageEnd') {
        setChatHistory((prevHistory: [string, string][]) => [
          ...prevHistory,
          ['human', message],
          ['assistant', recievedMessage],
        ]);

        ws?.removeEventListener('message', messageHandler);
        setLoading(false);

        const lastMsg = messagesRef.current[messagesRef.current.length - 1];

        if (
          lastMsg.role === 'assistant' &&
          lastMsg.sources &&
          lastMsg.sources.length > 0 &&
          !lastMsg.suggestions
        ) {
          const suggestions = await getSuggestions(messagesRef.current);
          setMessages((prev: ChatMessage[]) =>
            prev.map((msg: ChatMessage) => {
              if (msg.messageId === lastMsg.messageId) {
                return { ...msg, suggestions: suggestions };
              }
              return msg;
            }),
          );
        }

        const autoImageSearch = localStorage.getItem('autoImageSearch');
        const autoVideoSearch = localStorage.getItem('autoVideoSearch');

        if (autoImageSearch === 'true') {
          document.getElementById('search-images')?.click();
        }

        if (autoVideoSearch === 'true') {
          document.getElementById('search-videos')?.click();
        }
      }
    };

    ws?.addEventListener('message', messageHandler);
  };

  const rewrite = (messageId: string) => {
    const index = messages.findIndex((msg) => msg.messageId === messageId);

    if (index === -1) return;

    const message = messages[index - 1];

    setMessages((prev: ChatMessage[]) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });
    setChatHistory((prev: [string, string][]) => {
      return [...prev.slice(0, messages.length > 2 ? index - 1 : 0)];
    });

    sendMessage(message.content, message.messageId);
  };

  useEffect(() => {
    if (isReady && initialMessage && ws?.readyState === 1) {
      sendMessage(initialMessage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ws?.readyState, isReady, initialMessage, isWSReady]);

  const handleAutoImageSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setAutoImageSearch(value);
    localStorage.setItem('autoImageSearch', value.toString());
  };

  const handleAutoVideoSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.checked;
    setAutoVideoSearch(value);
    localStorage.setItem('autoVideoSearch', value.toString());
  };

  if (hasError) {
    return (
      <div className="relative">
        <div className="absolute w-full flex flex-row items-center justify-end mr-5 mt-5">
          <Link href="/settings">
            <Settings className="cursor-pointer lg:hidden" />
          </Link>
        </div>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="dark:text-white/70 text-black/70 text-sm">
            Failed to connect to the server. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return isReady ? (
    notFound ? (
      <NextError statusCode={404} />
    ) : (
      <div>
        {messages.length > 0 ? (
          <>
            <Navbar chatId={chatId!} messages={messages} />
            <Chat
              loading={loading}
              messages={messages}
              sendMessage={sendMessage}
              messageAppeared={messageAppeared}
              rewrite={rewrite}
              fileIds={fileIds}
              setFileIds={setFileIds}
              files={files}
              setFiles={setFiles}
            />
          </>
        ) : (
          <EmptyChat
            sendMessage={sendMessage}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            optimizationMode={optimizationMode}
            setOptimizationMode={setOptimizationMode}
            fileIds={fileIds}
            setFileIds={setFileIds}
            files={files}
            setFiles={setFiles}
            useCacheApi={useCacheApi}
            setUseCacheApi={setUseCacheApi}
            autoImageSearch={autoImageSearch}
            handleAutoImageSearchChange={handleAutoImageSearchChange}
            autoVideoSearch={autoVideoSearch}
            handleAutoVideoSearchChange={handleAutoVideoSearchChange}
          />
        )}
      </div>
    )
  ) : (
    <div className="flex flex-row items-center justify-center min-h-screen">
      <svg
        aria-hidden="true"
        className="w-8 h-8 text-light-200 fill-light-secondary dark:text-[#202020] animate-spin dark:fill-[#ffffff3b]"
        viewBox="0 0 100 101"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M100 50.5908C100.003 78.2051 78.1951 100.003 50.5908 100C22.9765 99.9972 0.997224 78.018 1 50.4037C1.00281 22.7993 22.8108 0.997224 50.4251 1C78.0395 1.00281 100.018 22.8108 100 50.4251ZM9.08164 50.594C9.06312 73.3997 27.7909 92.1272 50.5966 92.1457C73.4023 92.1642 92.1298 73.4365 92.1483 50.6308C92.1669 27.8251 73.4392 9.0973 50.6335 9.07878C27.8278 9.06026 9.10003 27.787 9.08164 50.594Z"
          fill="currentColor"
        />
        <path
          d="M93.9676 39.0409C96.393 38.4037 97.8624 35.9116 96.9801 33.5533C95.1945 28.8227 92.871 24.3692 90.0681 20.348C85.6237 14.1775 79.4473 9.36872 72.0454 6.45794C64.6435 3.54717 56.3134 2.65431 48.3133 3.89319C45.869 4.27179 44.3768 6.77534 45.014 9.20079C45.6512 11.6262 48.1343 13.0956 50.5786 12.717C56.5073 11.8281 62.5542 12.5399 68.0406 14.7911C73.527 17.0422 78.2187 20.7487 81.5841 25.4923C83.7976 28.5886 85.4467 32.059 86.4416 35.7474C87.1273 38.1189 89.5423 39.6781 91.9676 39.0409Z"
          fill="currentFill"
        />
      </svg>
    </div>
  );
};

export default ChatWindow;
