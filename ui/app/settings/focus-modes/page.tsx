'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, ScanEye, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import * as Icons from 'lucide-react';

interface FocusMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  isSystem: boolean;
  apiEndpoint?: string;
}

interface Notification {
  type: 'success' | 'error';
  message: string;
}

const Page = () => {
  const [focusModes, setFocusModes] = useState<FocusMode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);
  const [formData, setFormData] = useState<Partial<FocusMode>>({
    name: '',
    description: '',
    icon: 'ScanEye',
    apiEndpoint: '',
  });
  const [icons] = useState(() => {
    const iconNames = Object.keys(Icons).filter(
      (key) => key !== 'default' && typeof Icons[key as keyof typeof Icons] === 'function'
    );
    return iconNames;
  });
  const [showIconSelector, setShowIconSelector] = useState(false);
  
  useEffect(() => {
    fetchFocusModes();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
  };

  const fetchFocusModes = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/focus-modes`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch focus modes');
      }
      
      const data = await response.json();
      setFocusModes(data);
    } catch (error) {
      showNotification('error', '无法加载Focus模式');
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleIconSelect = (iconName: string) => {
    setFormData((prev) => ({ ...prev, icon: iconName }));
    setShowIconSelector(false);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      icon: 'ScanEye',
      apiEndpoint: '',
    });
    setIsCreating(false);
    setIsEditing(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name?.trim()) {
      showNotification('error', '名称不能为空');
      return;
    }
    
    try {
      if (isEditing) {
        // 更新
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/focus-modes/${isEditing}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to update focus mode');
        }
        
        showNotification('success', 'Focus模式已更新');
      } else {
        // 创建
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/focus-modes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(formData),
        });
        
        if (!response.ok) {
          throw new Error('Failed to create focus mode');
        }
        
        showNotification('success', '新的Focus模式已创建');
      }
      
      resetForm();
      fetchFocusModes();
    } catch (error) {
      showNotification('error', isEditing ? '更新Focus模式失败' : '创建Focus模式失败');
      console.error(error);
    }
  };

  const startEdit = (mode: FocusMode) => {
    setIsEditing(mode.id);
    setFormData({
      name: mode.name,
      description: mode.description,
      icon: mode.icon,
      apiEndpoint: mode.apiEndpoint || '',
    });
    setIsCreating(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('确定要删除这个Focus模式吗？')) {
      return;
    }
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/focus-modes/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete focus mode');
      }
      
      showNotification('success', 'Focus模式已删除');
      fetchFocusModes();
    } catch (error) {
      showNotification('error', '删除Focus模式失败');
      console.error(error);
    }
  };

  const renderIcon = (iconName: string) => {
    const IconComponent = Icons[iconName as keyof typeof Icons] as React.FC<{ size?: number }>;
    return IconComponent ? <IconComponent size={24} /> : <ScanEye size={24} />;
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md flex items-center space-x-2 ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle size={16} />
          ) : (
            <XCircle size={16} />
          )}
          <span>{notification.message}</span>
        </div>
      )}
      
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/settings"
              className="text-black dark:text-white/70 hover:text-black/70 dark:hover:text-white"
            >
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-2xl font-semibold text-black dark:text-white">Focus模式管理</h1>
          </div>
          {!isCreating && (
            <button
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 text-sm bg-light-secondary dark:bg-dark-secondary rounded-lg inline-flex items-center space-x-2 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
            >
              <Plus size={16} />
              <span>新建Focus模式</span>
            </button>
          )}
        </div>

        {isCreating && (
          <div className="bg-light-secondary/50 dark:bg-dark-secondary/50 p-6 rounded-xl border border-light-200 dark:border-dark-200">
            <h2 className="text-lg font-medium mb-4 text-black dark:text-white">
              {isEditing ? '编辑Focus模式' : '创建新的Focus模式'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">
                  名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="bg-light-primary dark:bg-dark-primary w-full px-3 py-2 border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white"
                  placeholder="输入名称"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">
                  描述
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="bg-light-primary dark:bg-dark-primary w-full px-3 py-2 border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white"
                  placeholder="输入描述"
                  rows={3}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">
                  图标
                </label>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowIconSelector(!showIconSelector)}
                      className="bg-light-primary dark:bg-dark-primary w-10 h-10 flex items-center justify-center border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white"
                    >
                      {renderIcon(formData.icon || 'ScanEye')}
                    </button>
                    
                    {showIconSelector && (
                      <div className="absolute z-10 mt-1 bg-light-primary dark:bg-dark-primary border border-light-200 dark:border-dark-200 rounded-lg shadow-lg p-2 grid grid-cols-8 gap-1 w-96 max-h-60 overflow-y-auto">
                        {icons.map((iconName) => (
                          <button
                            key={iconName}
                            type="button"
                            onClick={() => handleIconSelect(iconName)}
                            className="w-10 h-10 flex items-center justify-center hover:bg-light-secondary dark:hover:bg-dark-secondary rounded-md transition-colors"
                          >
                            {renderIcon(iconName)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-sm text-black/70 dark:text-white/70">
                    {formData.icon || 'ScanEye'}
                  </span>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-black/70 dark:text-white/70 mb-1">
                  API Endpoint
                </label>
                <input
                  type="text"
                  name="apiEndpoint"
                  value={formData.apiEndpoint}
                  onChange={handleInputChange}
                  className="bg-light-primary dark:bg-dark-primary w-full px-3 py-2 border border-light-200 dark:border-dark-200 rounded-lg text-black dark:text-white"
                  placeholder="输入API Endpoint"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 text-sm text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                >
                  {isEditing ? '保存修改' : '创建模式'}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="space-y-4">
          <h2 className="text-lg font-medium text-black dark:text-white">所有Focus模式</h2>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-black/50 dark:text-white/50" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {focusModes.map((mode) => (
                <div
                  key={mode.id}
                  className={cn(
                    "p-4 rounded-xl border",
                    mode.isSystem ? "bg-light-secondary/30 dark:bg-dark-secondary/30 border-light-200 dark:border-dark-200" : "bg-light-secondary/50 dark:bg-dark-secondary/50 border-light-200 dark:border-dark-200"
                  )}
                >
                  <div className="flex justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="p-2 bg-light-primary dark:bg-dark-primary rounded-lg">
                        {renderIcon(mode.icon)}
                      </div>
                      <div>
                        <h3 className="font-medium text-black dark:text-white">{mode.name}</h3>
                        <p className="text-sm text-black/70 dark:text-white/70 mt-1">
                          {mode.description}
                        </p>
                        {mode.apiEndpoint && (
                          <p className="text-xs text-black/50 dark:text-white/50 mt-2">
                            API: {mode.apiEndpoint}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!mode.isSystem && (
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(mode)}
                          className="p-1.5 text-black/70 dark:text-white/70 hover:text-black dark:hover:text-white rounded-lg transition-colors"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(mode.id)}
                          className="p-1.5 text-red-500/70 hover:text-red-500 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                  
                  {mode.isSystem && (
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-1 text-xs bg-black/10 dark:bg-white/10 rounded-full text-black/70 dark:text-white/70">
                        系统默认
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Page; 