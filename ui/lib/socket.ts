/// <reference types="react" />
/// <reference types="sonner" />

import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

/**
 * 创建并管理WebSocket连接的钩子函数
 * @param url WebSocket服务器URL
 * @param setIsWSReady 设置WebSocket是否准备好的函数
 * @param setError 设置是否发生错误的函数
 * @returns WebSocket实例
 */
export const useSocket = (
  url: string,
  setIsWSReady: (ready: boolean) => void,
  setError: (error: boolean) => void,
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const retryCountRef = useRef(0);
  const isCleaningUpRef = useRef(false);
  const MAX_RETRIES = 3;
  const INITIAL_BACKOFF = 1000; // 1秒
  const isConnectionErrorRef = useRef(false);

  const getBackoffDelay = (retryCount: number) => {
    return Math.min(INITIAL_BACKOFF * Math.pow(2, retryCount), 10000); // 最大10秒
  };

  useEffect(() => {
    const connectWs = async () => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
      }

      try {
        // 获取本地存储中的模型信息
        let chatModel = localStorage.getItem('chatModel');
        let chatModelProvider = localStorage.getItem('chatModelProvider');
        let embeddingModel = localStorage.getItem('embeddingModel');
        let embeddingModelProvider = localStorage.getItem(
          'embeddingModelProvider',
        );

        const autoImageSearch = localStorage.getItem('autoImageSearch');
        const autoVideoSearch = localStorage.getItem('autoVideoSearch');

        if (!autoImageSearch) {
          localStorage.setItem('autoImageSearch', 'true');
        }

        if (!autoVideoSearch) {
          localStorage.setItem('autoVideoSearch', 'false');
        }

        // 获取可用的模型提供者和模型
        const providers = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/models`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ).then(async (res) => {
          if (!res.ok)
            throw new Error(
              `Failed to fetch models: ${res.status} ${res.statusText}`,
            );
          return res.json();
        });

        // 如果模型信息不完整，初始化模型信息
        if (
          !chatModel ||
          !chatModelProvider ||
          !embeddingModel ||
          !embeddingModelProvider
        ) {
          if (!chatModel || !chatModelProvider) {
            const chatModelProviders = providers.chatModelProviders;

            chatModelProvider =
              chatModelProvider || Object.keys(chatModelProviders)[0];

            chatModel = Object.keys(chatModelProviders[chatModelProvider])[0];

            if (
              !chatModelProviders ||
              Object.keys(chatModelProviders).length === 0
            )
              return toast.error('No chat models available');
          }

          if (!embeddingModel || !embeddingModelProvider) {
            const embeddingModelProviders = providers.embeddingModelProviders;

            if (
              !embeddingModelProviders ||
              Object.keys(embeddingModelProviders).length === 0
            )
              return toast.error('No embedding models available');

            embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
            embeddingModel = Object.keys(
              embeddingModelProviders[embeddingModelProvider],
            )[0];
          }

          localStorage.setItem('chatModel', chatModel!);
          localStorage.setItem('chatModelProvider', chatModelProvider);
          localStorage.setItem('embeddingModel', embeddingModel!);
          localStorage.setItem(
            'embeddingModelProvider',
            embeddingModelProvider,
          );
        } else {
          // 验证模型的有效性
          const chatModelProviders = providers.chatModelProviders;
          const embeddingModelProviders = providers.embeddingModelProviders;

          if (
            Object.keys(chatModelProviders).length > 0 &&
            !chatModelProviders[chatModelProvider]
          ) {
            const chatModelProvidersKeys = Object.keys(chatModelProviders);
            chatModelProvider =
              chatModelProvidersKeys.find(
                (key) => Object.keys(chatModelProviders[key]).length > 0,
              ) || chatModelProvidersKeys[0];

            localStorage.setItem('chatModelProvider', chatModelProvider);
          }

          if (
            chatModelProvider &&
            !chatModelProviders[chatModelProvider][chatModel]
          ) {
            chatModel = Object.keys(
              chatModelProviders[
                Object.keys(chatModelProviders[chatModelProvider]).length > 0
                  ? chatModelProvider
                  : Object.keys(chatModelProviders)[0]
              ],
            )[0];
            localStorage.setItem('chatModel', chatModel);
          }

          if (
            Object.keys(embeddingModelProviders).length > 0 &&
            !embeddingModelProviders[embeddingModelProvider]
          ) {
            embeddingModelProvider = Object.keys(embeddingModelProviders)[0];
            localStorage.setItem(
              'embeddingModelProvider',
              embeddingModelProvider,
            );
          }

          if (
            embeddingModelProvider &&
            !embeddingModelProviders[embeddingModelProvider][embeddingModel]
          ) {
            embeddingModel = Object.keys(
              embeddingModelProviders[embeddingModelProvider],
            )[0];
            localStorage.setItem('embeddingModel', embeddingModel);
          }
        }

        // 准备WebSocket URL和查询参数
        const wsURL = new URL(url);
        const searchParams = new URLSearchParams({});

        searchParams.append('chatModel', chatModel!);
        searchParams.append('chatModelProvider', chatModelProvider);

        if (chatModelProvider === 'custom_openai') {
          searchParams.append(
            'openAIApiKey',
            localStorage.getItem('openAIApiKey')!,
          );
          searchParams.append(
            'openAIBaseURL',
            localStorage.getItem('openAIBaseURL')!,
          );
        }

        searchParams.append('embeddingModel', embeddingModel!);
        searchParams.append('embeddingModelProvider', embeddingModelProvider);

        wsURL.search = searchParams.toString();

        // 创建WebSocket连接
        const ws = new WebSocket(wsURL.toString());
        wsRef.current = ws;

        const timeoutId = setTimeout(() => {
          if (ws.readyState !== 1) {
            toast.error(
              '无法连接到服务器，请稍后重试。',
            );
          }
        }, 10000);

        ws.addEventListener('message', (e) => {
          const data = JSON.parse(e.data);
          if (data.type === 'signal' && data.data === 'open') {
            const interval = setInterval(() => {
              if (ws.readyState === 1) {
                setIsWSReady(true);
                setError(false);
                if (retryCountRef.current > 0) {
                  toast.success('连接已恢复。');
                }
                retryCountRef.current = 0;
                clearInterval(interval);
              }
            }, 5);
            clearTimeout(timeoutId);
            console.debug(new Date(), 'ws:connected');
          }
          if (data.type === 'error') {
            isConnectionErrorRef.current = true;
            setError(true);
            toast.error(data.data);
          }
        });

        ws.onerror = () => {
          clearTimeout(timeoutId);
          setIsWSReady(false);
          toast.error('WebSocket连接错误。');
        };

        ws.onclose = () => {
          clearTimeout(timeoutId);
          setIsWSReady(false);
          console.debug(new Date(), 'ws:disconnected');
          if (!isCleaningUpRef.current && !isConnectionErrorRef.current) {
            toast.error('连接已断开。正在尝试重新连接...');
            attemptReconnect();
          }
        };
      } catch (error) {
        console.debug(new Date(), 'ws:error', error);
        setIsWSReady(false);
        attemptReconnect();
      }
    };

    const attemptReconnect = () => {
      retryCountRef.current += 1;

      if (retryCountRef.current > MAX_RETRIES) {
        console.debug(new Date(), 'ws:max_retries');
        setError(true);
        toast.error(
          '多次尝试连接服务器失败。请刷新页面重试。'
        );
        return;
      }

      const backoffDelay = getBackoffDelay(retryCountRef.current);
      console.debug(
        new Date(),
        `ws:retry attempt=${retryCountRef.current}/${MAX_RETRIES} delay=${backoffDelay}ms`,
      );

      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWs();
      }, backoffDelay);
    };

    connectWs();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.close();
        isCleaningUpRef.current = true;
        console.debug(new Date(), 'ws:cleanup');
      }
    };
  }, [url, setIsWSReady, setError]);

  return wsRef.current;
}; 