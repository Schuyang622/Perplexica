import express from 'express';
import logger from '../utils/logger';
import fs from 'fs';
import path from 'path';

const router = express.Router();
const FOCUS_MODES_FILE = path.join(process.cwd(), 'data', 'focus-modes.json');

// 确保focus-modes.json文件存在
const initFocusModesFile = () => {
  try {
    if (!fs.existsSync(path.join(process.cwd(), 'data'))) {
      fs.mkdirSync(path.join(process.cwd(), 'data'));
    }
    
    if (!fs.existsSync(FOCUS_MODES_FILE)) {
      // 初始化文件，包含系统预设的Focus模式
      const defaultFocusModes = [
        {
          id: 'webSearch',
          name: 'All',
          description: 'Searches across all of the internet',
          icon: 'Globe',
          isSystem: true,
          apiEndpoint: ''
        },
        {
          id: 'academicSearch',
          name: 'Academic',
          description: 'Search in published academic papers',
          icon: 'SwatchBook',
          isSystem: true,
          apiEndpoint: ''
        },
        {
          id: 'writingAssistant',
          name: 'Writing',
          description: 'Chat without searching the web',
          icon: 'Pencil',
          isSystem: true,
          apiEndpoint: ''
        },
        {
          id: 'wolframAlphaSearch',
          name: 'Wolfram Alpha',
          description: 'Computational knowledge engine',
          icon: 'BadgePercent',
          isSystem: true,
          apiEndpoint: ''
        },
        {
          id: 'youtubeSearch',
          name: 'Youtube',
          description: 'Search and watch videos',
          icon: 'Youtube',
          isSystem: true,
          apiEndpoint: ''
        },
        {
          id: 'redditSearch',
          name: 'Reddit',
          description: 'Search for discussions and opinions',
          icon: 'Reddit',
          isSystem: true,
          apiEndpoint: ''
        }
      ];
      
      fs.writeFileSync(FOCUS_MODES_FILE, JSON.stringify(defaultFocusModes, null, 2));
    }
  } catch (err: any) {
    logger.error(`Error initializing focus modes file: ${err.message}`);
  }
};

// 获取所有Focus模式
router.get('/', async (_, res) => {
  try {
    initFocusModesFile();
    
    const focusModes = JSON.parse(fs.readFileSync(FOCUS_MODES_FILE, 'utf-8'));
    res.status(200).json(focusModes);
  } catch (err: any) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error getting focus modes: ${err.message}`);
  }
});

// 创建新的Focus模式
router.post('/', async (req, res) => {
  try {
    initFocusModesFile();
    
    const { name, description, apiEndpoint, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const focusModes = JSON.parse(fs.readFileSync(FOCUS_MODES_FILE, 'utf-8'));
    
    // 生成一个新的唯一ID
    const id = `custom_${Date.now()}`;
    
    const newFocusMode = {
      id,
      name,
      description: description || '',
      icon: icon || 'ScanEye',
      isSystem: false,
      apiEndpoint: apiEndpoint || ''
    };
    
    focusModes.push(newFocusMode);
    
    fs.writeFileSync(FOCUS_MODES_FILE, JSON.stringify(focusModes, null, 2));
    
    res.status(201).json(newFocusMode);
  } catch (err: any) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error creating focus mode: ${err.message}`);
  }
});

// 更新Focus模式
router.put('/:id', async (req, res) => {
  try {
    initFocusModesFile();
    
    const { id } = req.params;
    const { name, description, apiEndpoint, icon } = req.body;
    
    if (!name) {
      return res.status(400).json({ message: 'Name is required' });
    }
    
    const focusModes = JSON.parse(fs.readFileSync(FOCUS_MODES_FILE, 'utf-8'));
    
    const index = focusModes.findIndex((mode: any) => mode.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Focus mode not found' });
    }
    
    // 不允许修改系统预设的模式
    if (focusModes[index].isSystem) {
      return res.status(403).json({ message: 'Cannot modify system focus modes' });
    }
    
    const updatedFocusMode = {
      ...focusModes[index],
      name,
      description: description || '',
      icon: icon || focusModes[index].icon,
      apiEndpoint: apiEndpoint || ''
    };
    
    focusModes[index] = updatedFocusMode;
    
    fs.writeFileSync(FOCUS_MODES_FILE, JSON.stringify(focusModes, null, 2));
    
    res.status(200).json(updatedFocusMode);
  } catch (err: any) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error updating focus mode: ${err.message}`);
  }
});

// 删除Focus模式
router.delete('/:id', async (req, res) => {
  try {
    initFocusModesFile();
    
    const { id } = req.params;
    
    const focusModes = JSON.parse(fs.readFileSync(FOCUS_MODES_FILE, 'utf-8'));
    
    const index = focusModes.findIndex((mode: any) => mode.id === id);
    
    if (index === -1) {
      return res.status(404).json({ message: 'Focus mode not found' });
    }
    
    // 不允许删除系统预设的模式
    if (focusModes[index].isSystem) {
      return res.status(403).json({ message: 'Cannot delete system focus modes' });
    }
    
    focusModes.splice(index, 1);
    
    fs.writeFileSync(FOCUS_MODES_FILE, JSON.stringify(focusModes, null, 2));
    
    res.status(200).json({ message: 'Focus mode deleted' });
  } catch (err: any) {
    res.status(500).json({ message: 'An error has occurred.' });
    logger.error(`Error deleting focus mode: ${err.message}`);
  }
});

export default router; 