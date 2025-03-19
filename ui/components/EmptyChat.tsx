import { ToggleRight, Settings } from 'lucide-react';
import EmptyChatMessageInput from './EmptyChatMessageInput';
import { useState } from 'react';
import { File } from '@/types';
import Link from 'next/link';

const EmptyChat = ({
  sendMessage,
  focusMode,
  setFocusMode,
  optimizationMode,
  setOptimizationMode,
  fileIds,
  setFileIds,
  files,
  setFiles,
  useCacheApi,
  setUseCacheApi,
  autoImageSearch,
  handleAutoImageSearchChange,
  autoVideoSearch,
  handleAutoVideoSearchChange,
}: {
  sendMessage: (message: string) => void;
  focusMode: string;
  setFocusMode: (mode: string) => void;
  optimizationMode: string;
  setOptimizationMode: (mode: string) => void;
  fileIds: string[];
  setFileIds: (fileIds: string[]) => void;
  files: File[];
  setFiles: (files: File[]) => void;
  useCacheApi: boolean;
  setUseCacheApi: (use: boolean) => void;
  autoImageSearch: boolean;
  handleAutoImageSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  autoVideoSearch: boolean;
  handleAutoVideoSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const handleUseCacheApiChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUseCacheApi(event.target.checked);
  };

  return (
    <div className="relative">
      <div className="absolute w-full flex flex-row items-center justify-between px-5 mt-5">
        <div className="flex items-center space-x-2 text-black/70 dark:text-white/70 text-sm cursor-pointer" onClick={() => setUseCacheApi(!useCacheApi)}>
          <ToggleRight className={`h-5 w-5 ${useCacheApi ? 'text-blue-500' : 'text-gray-400'}`} />
          <span>使用缓存API {useCacheApi ? '(已启用)' : '(已禁用)'}</span>
        </div>
        <Link href="/settings">
          <Settings className="cursor-pointer lg:hidden" />
        </Link>
      </div>
      <div className="flex flex-col items-center justify-center min-h-screen max-w-screen-sm mx-auto p-2 space-y-8">
        <h2 className="text-black/70 dark:text-white/70 text-3xl font-medium -mt-8">
          Research begins here.
        </h2>
        <EmptyChatMessageInput
          sendMessage={sendMessage}
          focusMode={focusMode}
          setFocusMode={setFocusMode}
          optimizationMode={optimizationMode}
          setOptimizationMode={setOptimizationMode}
          fileIds={fileIds}
          setFileIds={setFileIds}
          files={files}
          setFiles={setFiles}
        />
        
        {/* MCP文字转图片功能提示 */}
        <div className="mt-8 border border-light-secondary/50 dark:border-dark-secondary/50 p-4 rounded-md">
          <h3 className="text-lg font-medium text-black dark:text-white mb-2">
            MCP文字转图片功能
          </h3>
          <p className="text-sm text-black/70 dark:text-white/70 mb-4">
            您可以要求Perplexica将回答转换为精美的图片格式。尝试以下示例：
          </p>
          <div className="space-y-2">
            <button
              onClick={() => sendMessage('请解释什么是人工智能，并生成一张图片')}
              className="w-full text-left p-2 text-sm hover:bg-light-secondary dark:hover:bg-dark-secondary rounded-md transition-colors text-black/80 dark:text-white/80"
            >
              请解释什么是人工智能，并生成一张图片
            </button>
            <button
              onClick={() => sendMessage('把以下内容制作成图片：中国的四大发明及其历史意义')}
              className="w-full text-left p-2 text-sm hover:bg-light-secondary dark:hover:bg-dark-secondary rounded-md transition-colors text-black/80 dark:text-white/80"
            >
              把以下内容制作成图片：中国的四大发明及其历史意义
            </button>
            <button
              onClick={() => sendMessage('介绍太阳系的行星，并以图片形式展示')}
              className="w-full text-left p-2 text-sm hover:bg-light-secondary dark:hover:bg-dark-secondary rounded-md transition-colors text-black/80 dark:text-white/80"
            >
              介绍太阳系的行星，并以图片形式展示
            </button>
          </div>
        </div>

        <label className="flex items-start pt-1">
          <div className="flex items-center h-5">
            <input
              id="auto-image-search"
              aria-describedby="autoimagesearch-text"
              name="auto-image-search"
              type="checkbox"
              checked={autoImageSearch}
              onChange={handleAutoImageSearchChange}
              className="w-4 h-4 rounded"
            />
          </div>
          <div className="ml-3 text-sm">
            <span id="autoimagesearch-text" className="text-black/70 dark:text-white/70">
              自动图片搜索
            </span>
          </div>
        </label>
      </div>
    </div>
  );
};

export default EmptyChat;
