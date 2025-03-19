import {
  BadgePercent,
  ChevronDown,
  Globe,
  Pencil,
  ScanEye,
  SwatchBook,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Transition,
} from '@headlessui/react';
import { SiReddit, SiYoutube } from '@icons-pack/react-simple-icons';
import { Fragment, useEffect, useState } from 'react';

interface FocusMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  isSystem: boolean;
  apiEndpoint?: string;
}

// 默认内置的Focus模式
const defaultFocusModes = [
  {
    key: 'webSearch',
    title: 'All',
    description: 'Searches across all of the internet',
    icon: <Globe size={20} />,
  },
  {
    key: 'academicSearch',
    title: 'Academic',
    description: 'Search in published academic papers',
    icon: <SwatchBook size={20} />,
  },
  {
    key: 'writingAssistant',
    title: 'Writing',
    description: 'Chat without searching the web',
    icon: <Pencil size={16} />,
  },
  {
    key: 'wolframAlphaSearch',
    title: 'Wolfram Alpha',
    description: 'Computational knowledge engine',
    icon: <BadgePercent size={20} />,
  },
  {
    key: 'youtubeSearch',
    title: 'Youtube',
    description: 'Search and watch videos',
    icon: (
      <SiYoutube
        className="h-5 w-auto mr-0.5"
        onPointerEnterCapture={undefined}
        onPointerLeaveCapture={undefined}
      />
    ),
  },
  {
    key: 'redditSearch',
    title: 'Reddit',
    description: 'Search for discussions and opinions',
    icon: (
      <SiReddit
        className="h-5 w-auto mr-0.5"
        onPointerEnterCapture={undefined}
        onPointerLeaveCapture={undefined}
      />
    ),
  },
];

// 根据图标名称渲染对应的图标组件
const renderIcon = (iconName: string) => {
  switch (iconName) {
    case 'Globe':
      return <Globe size={20} />;
    case 'SwatchBook':
      return <SwatchBook size={20} />;
    case 'Pencil':
      return <Pencil size={16} />;
    case 'BadgePercent':
      return <BadgePercent size={20} />;
    case 'Youtube':
      return (
        <SiYoutube
          className="h-5 w-auto mr-0.5"
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        />
      );
    case 'Reddit':
      return (
        <SiReddit
          className="h-5 w-auto mr-0.5"
          onPointerEnterCapture={undefined}
          onPointerLeaveCapture={undefined}
        />
      );
    default:
      return <ScanEye size={20} />;
  }
};

const Focus = ({
  focusMode,
  setFocusMode,
}: {
  focusMode: string;
  setFocusMode: (mode: string) => void;
}) => {
  const [customFocusModes, setCustomFocusModes] = useState<FocusMode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // 获取自定义Focus模式
  useEffect(() => {
    const fetchCustomFocusModes = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/focus-modes`);
        
        if (response.ok) {
          const data = await response.json();
          setCustomFocusModes(data.filter((mode: FocusMode) => !mode.isSystem));
        }
      } catch (error) {
        console.error('无法加载自定义Focus模式:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomFocusModes();
  }, []);
  
  // 合并系统默认的模式和自定义模式
  const allFocusModes = [
    ...defaultFocusModes,
    ...customFocusModes.map(mode => ({
      key: mode.id,
      title: mode.name,
      description: mode.description,
      icon: renderIcon(mode.icon),
    }))
  ];

  return (
    <Popover className="relative w-full max-w-[15rem] md:max-w-md lg:max-w-lg mt-[6.5px]">
      <PopoverButton
        type="button"
        className=" text-black/50 dark:text-white/50 rounded-xl hover:bg-light-secondary dark:hover:bg-dark-secondary active:scale-95 transition duration-200 hover:text-black dark:hover:text-white"
      >
        {focusMode !== 'webSearch' ? (
          <div className="flex flex-row items-center space-x-1">
            {allFocusModes.find((mode) => mode.key === focusMode)?.icon || <ScanEye size={20} />}
            <p className="text-xs font-medium hidden lg:block">
              {allFocusModes.find((mode) => mode.key === focusMode)?.title || 'Focus'}
            </p>
            <ChevronDown size={20} className="-translate-x-1" />
          </div>
        ) : (
          <div className="flex flex-row items-center space-x-1">
            <ScanEye size={20} />
            <p className="text-xs font-medium hidden lg:block">Focus</p>
          </div>
        )}
      </PopoverButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-150"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-1"
      >
        <PopoverPanel className="absolute z-10 w-64 md:w-[500px] left-0">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 bg-light-primary dark:bg-dark-primary border rounded-lg border-light-200 dark:border-dark-200 w-full p-4 max-h-[200px] md:max-h-none overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-4 col-span-full">
                <div className="animate-spin h-5 w-5 border-2 border-black/50 dark:border-white/50 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {allFocusModes.map((mode, i) => (
                  <PopoverButton
                    onClick={() => setFocusMode(mode.key)}
                    key={i}
                    className={cn(
                      'p-2 rounded-lg flex flex-col items-start justify-start text-start space-y-2 duration-200 cursor-pointer transition',
                      focusMode === mode.key
                        ? 'bg-light-secondary dark:bg-dark-secondary'
                        : 'hover:bg-light-secondary dark:hover:bg-dark-secondary',
                    )}
                  >
                    <div
                      className={cn(
                        'flex flex-row items-center space-x-1',
                        focusMode === mode.key
                          ? 'text-[#24A0ED]'
                          : 'text-black dark:text-white',
                      )}
                    >
                      {mode.icon}
                      <p className="text-sm font-medium">{mode.title}</p>
                    </div>
                    <p className="text-black/70 dark:text-white/70 text-xs">
                      {mode.description}
                    </p>
                  </PopoverButton>
                ))}
                
                {/* 添加指向Focus模式管理页面的链接 */}
                <div className="col-span-full mt-2 border-t border-light-200 dark:border-dark-200 pt-2">
                  <a 
                    href="/settings/focus-modes" 
                    className="text-xs text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 inline-flex items-center"
                  >
                    管理Focus模式
                  </a>
                </div>
              </>
            )}
          </div>
        </PopoverPanel>
      </Transition>
    </Popover>
  );
};

export default Focus;
