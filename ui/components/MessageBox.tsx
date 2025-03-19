'use client';

/* eslint-disable @next/next/no-img-element */
import React, { MutableRefObject, useEffect, useState } from 'react';
import { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import {
  BookCopy,
  Disc3,
  Volume2,
  StopCircle,
  Layers3,
  Plus,
  Database,
  Download,
  Image as ImageIcon,
} from 'lucide-react';
import Markdown from 'markdown-to-jsx';
import Copy from './MessageActions/Copy';
import Rewrite from './MessageActions/Rewrite';
import MessageSources from './MessageSources';
import SearchImages from './SearchImages';
import SearchVideos from './SearchVideos';
import { useSpeech } from 'react-text-to-speech';

// 图片展示组件
const ImageDisplay = ({ imageUrl, downloadUrl, text }: { imageUrl: string, downloadUrl: string, text: string }) => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isImageLoaded, setIsImageLoaded] = useState(false);

  // 处理图片下载
  const handleDownload = (e: React.MouseEvent) => {
    e.preventDefault();
    
    // 创建一个隐藏的a标签来下载
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'perplexica-image.svg'; // 更正确的扩展名
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mt-4 mb-2 border border-light-200 dark:border-dark-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="p-2 flex justify-between items-center bg-light-50 dark:bg-dark-100">
        <div className="flex items-center">
          <ImageIcon size={16} className="mr-2 text-black/70 dark:text-white/70" />
          <span className="text-sm text-black/70 dark:text-white/70">文字转图片结果</span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <span className="text-xs">{isFullscreen ? '退出全屏' : '全屏查看'}</span>
          </button>
          <button 
            onClick={handleDownload}
            className="flex items-center text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300"
          >
            <Download size={16} className="mr-1" />
            <span className="text-xs">下载图片</span>
          </button>
        </div>
      </div>
      <div className={`relative ${!isImageLoaded ? 'min-h-[200px] bg-gray-100 dark:bg-gray-800 animate-pulse' : ''}`}>
        <img 
          src={imageUrl} 
          alt="生成的图片" 
          className={`w-full object-contain ${isFullscreen ? 'fixed inset-0 z-50 bg-black/80 p-4 max-h-screen' : 'max-h-[500px]'}`}
          loading="lazy"
          onLoad={() => setIsImageLoaded(true)}
          onClick={() => setIsFullscreen(!isFullscreen)}
        />
        {!isImageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm text-gray-500">图片加载中...</span>
          </div>
        )}
      </div>
    </div>
  );
};

const MessageBox = ({
  message,
  messageIndex,
  history,
  loading,
  dividerRef,
  isLast,
  rewrite,
  sendMessage,
}: {
  message: ChatMessage;
  messageIndex: number;
  history: ChatMessage[];
  loading: boolean;
  dividerRef?: MutableRefObject<HTMLDivElement | null>;
  isLast: boolean;
  rewrite: (messageId: string) => void;
  sendMessage: (message: string) => void;
}) => {
  const [parsedMessage, setParsedMessage] = useState(message.content);
  const [speechMessage, setSpeechMessage] = useState(message.content);
  const [imageData, setImageData] = useState<{ imageUrl: string, downloadUrl: string, text: string } | null>(null);

  useEffect(() => {
    // 检查消息中是否包含图片数据
    if (message.role === 'assistant' && message.imageData) {
      setImageData(message.imageData);
    }
    
    const regex = /\[(\d+)\]/g;

    if (
      message.role === 'assistant' &&
      message?.sources &&
      message.sources.length > 0
    ) {
      return setParsedMessage(
        message.content.replace(
          regex,
          (_, number) =>
            `<a href="${message.sources?.[number - 1]?.metadata?.url}" target="_blank" className="bg-light-secondary dark:bg-dark-secondary px-1 rounded ml-1 no-underline text-xs text-black/70 dark:text-white/70 relative">${number}</a>`,
        ),
      );
    }

    setSpeechMessage(message.content.replace(regex, ''));
    setParsedMessage(message.content);
  }, [message, message.content, message.sources]);

  const { speechStatus, start, stop } = useSpeech({ text: speechMessage });

  return (
    <div
      className={cn(
        'group flex gap-4 lg:gap-6 lg:mx-16 mx-0 h-fit mb-auto',
        message.role === 'assistant'
          ? 'hover:bg-light-200/80 dark:hover:bg-dark-200/80 rounded-lg p-5'
          : 'p-5',
      )}
    >
      <div
        className={cn(
          'h-8 w-8 rounded-md border flex items-center justify-center shrink-0',
          message.role === 'assistant'
            ? 'border-black/10 dark:border-white/10 bg-gradient-to-br from-[#4481eb] to-[#04befe]'
            : 'border-black/10 dark:border-white/10 bg-black/50 dark:bg-white/50',
        )}
      >
        {message.role === 'assistant' ? (
          <Disc3 className="h-4 w-4 text-white" />
        ) : (
          <p className="text-white dark:text-black">Y</p>
        )}
      </div>
      <div className="flex flex-col items-start w-full">
        <div className="flex flex-row items-center mb-2 space-x-2">
          <p
            className={cn(
              'text-sm font-medium',
              message.role === 'assistant'
                ? 'dark:text-white/80 text-black/80'
                : 'dark:text-white/80 text-black/80',
            )}
          >
            {message.role === 'assistant' ? 'Perplexica' : 'You'}
          </p>
          
          {message.role === 'assistant' && message.cachedResponse && (
            <div className="flex items-center text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-sm">
              <Database className="w-3 h-3 mr-1" />
              <span>缓存</span>
            </div>
          )}
        </div>
        {message.role === 'user' && (
          <div
            className={cn(
              'w-full',
              messageIndex === 0 ? 'pt-16' : 'pt-8',
              'break-words',
            )}
          >
            <h2 className="text-black dark:text-white font-medium text-3xl lg:w-9/12">
              {message.content}
            </h2>
          </div>
        )}

        {message.role === 'assistant' && (
          <div className="flex flex-col space-y-9 lg:space-y-0 lg:flex-row lg:justify-between lg:space-x-9">
            <div
              ref={dividerRef}
              className="flex flex-col space-y-6 w-full lg:w-9/12"
            >
              {message.sources && message.sources.length > 0 && (
                <div className="flex flex-col space-y-2">
                  <div className="flex flex-row items-center space-x-2">
                    <BookCopy className="text-black dark:text-white" size={20} />
                    <h3 className="text-black dark:text-white font-medium text-xl">
                      Sources
                    </h3>
                  </div>
                  <MessageSources sources={message.sources} />
                </div>
              )}
              <div className="flex flex-col space-y-2">
                <div className="flex flex-row items-center space-x-2">
                  <Disc3
                    className={cn(
                      'text-black dark:text-white',
                      isLast && loading ? 'animate-spin' : 'animate-none',
                    )}
                    size={20}
                  />
                  <h3 className="text-black dark:text-white font-medium text-xl">
                    Answer
                  </h3>
                </div>
                <Markdown
                  className={cn(
                    'prose prose-h1:mb-3 prose-h2:mb-2 prose-h2:mt-6 prose-h2:font-[800] prose-h3:mt-4 prose-h3:mb-1.5 prose-h3:font-[600] dark:prose-invert prose-p:leading-relaxed prose-pre:p-0 font-[400]',
                    'max-w-none break-words text-black dark:text-white',
                  )}
                >
                  {parsedMessage}
                </Markdown>
                
                {/* 显示图片部分 */}
                {!loading && imageData && (
                  <ImageDisplay
                    imageUrl={imageData.imageUrl}
                    downloadUrl={imageData.downloadUrl}
                    text={imageData.text}
                  />
                )}
                
                {loading && isLast ? null : (
                  <div className="flex flex-row items-center justify-between w-full text-black dark:text-white py-4 -mx-2">
                    <div className="flex flex-row items-center space-x-1">
                      {/*  <button className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black text-black dark:hover:text-white">
                        <Share size={18} />
                      </button> */}
                      {message.messageId && (
                        <Rewrite rewrite={rewrite} messageId={message.messageId} />
                      )}
                    </div>
                    <div className="flex flex-row items-center space-x-1">
                      <Copy initialMessage={message.content} message={message} />
                      <button
                        onClick={() => {
                          if (speechStatus === 'started') {
                            stop();
                          } else {
                            start();
                          }
                        }}
                        className="p-2 text-black/70 dark:text-white/70 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary transition duration-200 hover:text-black dark:hover:text-white"
                      >
                        {speechStatus === 'started' ? (
                          <StopCircle size={18} />
                        ) : (
                          <Volume2 size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                )}
                {isLast &&
                  message.suggestions &&
                  message.suggestions.length > 0 &&
                  message.role === 'assistant' &&
                  !loading && (
                    <>
                      <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                      <div className="flex flex-col space-y-3 text-black dark:text-white">
                        <div className="flex flex-row items-center space-x-2 mt-4">
                          <Layers3 />
                          <h3 className="text-xl font-medium">Related</h3>
                        </div>
                        <div className="flex flex-col space-y-3">
                          {message.suggestions.map((suggestion, i) => (
                            <div
                              className="flex flex-col space-y-3 text-sm"
                              key={i}
                            >
                              <div className="h-px w-full bg-light-secondary dark:bg-dark-secondary" />
                              <div
                                onClick={() => {
                                  sendMessage(suggestion);
                                }}
                                className="cursor-pointer flex flex-row justify-between font-medium space-x-2 items-center"
                              >
                                <p className="transition duration-200 hover:text-[#24A0ED]">
                                  {suggestion}
                                </p>
                                <Plus
                                  size={20}
                                  className="text-[#24A0ED] flex-shrink-0"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
              </div>
            </div>
            <div className="lg:sticky lg:top-20 flex flex-col items-center space-y-3 w-full lg:w-3/12 z-30 h-full pb-4">
              <SearchImages
                query={history[messageIndex - 1].content}
                chatHistory={history.slice(0, messageIndex - 1)}
              />
              <SearchVideos
                chatHistory={history.slice(0, messageIndex - 1)}
                query={history[messageIndex - 1].content}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBox;
