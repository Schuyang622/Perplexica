// 类型声明文件
import { Document } from '@langchain/core/documents';

// 图片数据类型
export interface ImageData {
  imageUrl: string;
  downloadUrl: string;
  text: string;
}

// 消息类型
export interface ChatMessage {
  content: string;
  role: string;
  messageId?: string;
  chatId?: string;
  createdAt?: Date;
  isLinking?: boolean;
  isCached?: boolean;
  documents?: Array<Document>;
  sources?: Array<Document>;
  cachedResponse?: boolean;
  error?: string;
  suggestions?: string[];
  imageData?: ImageData;
}

// 历史记录类型
export interface HistoryEntry {
  title: string;
  id: string;
  createdAt: Date;
}

// 文件类型
export interface File {
  fileName: string;
  fileExtension: string;
  fileId: string;
} 