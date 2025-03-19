/**
 * MCP文字转图片功能测试脚本
 * 
 * 此脚本用于测试Perplexica的MCP文字转图片功能
 * 运行方式: node scripts/test-mcp.js
 */

const axios = require('axios');
const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const MCP_SERVER_URL = process.env.MCP_SERVER_URL || 'http://localhost:3100/mcp';
const BACKEND_WS_URL = process.env.BACKEND_WS_URL || 'ws://localhost:3001';

// 测试MCP服务器基本连接
async function testMCPServerConnection() {
  console.log('测试MCP服务器连接...');
  try {
    const response = await axios.get(MCP_SERVER_URL);
    console.log('✅ MCP服务器连接成功!');
    console.log('服务器信息:', response.data);
    return true;
  } catch (error) {
    console.error('❌ MCP服务器连接失败:', error.message);
    return false;
  }
}

// 测试MCP文字转图片功能
async function testTextToImage() {
  console.log('\n测试文字转图片功能...');
  try {
    const testText = `# Perplexica测试
这是一段测试文本，用于验证MCP文字转图片功能是否正常工作。

## 功能特点
- 支持Markdown格式
- 自动换行
- 美观的排版

感谢您使用Perplexica!`;

    const response = await axios.post(`${MCP_SERVER_URL}/text-to-image`, {
      text: testText,
      theme: 'light'
    });
    
    if (response.data.success) {
      console.log('✅ 文字转图片成功!');
      console.log('图片URL:', response.data.imageUrl);
      console.log('下载URL:', response.data.downloadUrl);
      return true;
    } else {
      console.error('❌ 文字转图片失败:', response.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ 文字转图片请求失败:', error.message);
    return false;
  }
}

// 测试WebSocket连接和消息处理
async function testWebSocketIntegration() {
  return new Promise((resolve) => {
    console.log('\n测试WebSocket集成...');
    
    const ws = new WebSocket(BACKEND_WS_URL);
    const messageId = uuidv4();
    const chatId = uuidv4();
    let connected = false;
    let gotResponse = false;
    let gotImage = false;
    
    ws.on('open', () => {
      console.log('✅ WebSocket连接成功!');
      connected = true;
      
      // 发送包含图片请求的消息
      ws.send(JSON.stringify({
        type: 'message',
        message: {
          messageId,
          chatId,
          content: '请把以下内容转为图片: Perplexica是一个智能搜索引擎，帮助用户快速找到高质量信息。'
        },
        history: [
          ['human', '请把以下内容转为图片: Perplexica是一个智能搜索引擎，帮助用户快速找到高质量信息。']
        ]
      }));
      
      console.log('已发送测试消息...');
    });
    
    ws.on('message', (data) => {
      const message = JSON.parse(data);
      
      if (message.type === 'message') {
        console.log('收到文本消息:', message.data.substring(0, 50) + '...');
        gotResponse = true;
      }
      
      if (message.type === 'image') {
        console.log('✅ 收到图片消息!');
        console.log('图片URL:', message.data.imageUrl);
        gotImage = true;
      }
      
      if (message.type === 'messageEnd') {
        console.log('消息结束，测试完成');
        
        // 总结测试结果
        if (connected && gotResponse && gotImage) {
          console.log('\n✅ WebSocket集成测试成功!');
          resolve(true);
        } else {
          console.log('\n❌ WebSocket集成测试失败!');
          console.log(`连接: ${connected ? '成功' : '失败'}`);
          console.log(`文本响应: ${gotResponse ? '成功' : '失败'}`);
          console.log(`图片生成: ${gotImage ? '成功' : '失败'}`);
          resolve(false);
        }
        
        ws.close();
      }
    });
    
    ws.on('error', (error) => {
      console.error('❌ WebSocket错误:', error.message);
      resolve(false);
    });
    
    // 超时处理
    setTimeout(() => {
      if (ws.readyState === WebSocket.OPEN) {
        console.log('❌ 测试超时!');
        ws.close();
        resolve(false);
      }
    }, 30000);
  });
}

// 运行所有测试
async function runTests() {
  console.log('======= MCP文字转图片功能测试 =======\n');
  
  const serverConnected = await testMCPServerConnection();
  if (!serverConnected) {
    console.log('\n⚠️ MCP服务器连接失败，跳过后续测试');
    return;
  }
  
  const imageGenerationSuccess = await testTextToImage();
  if (!imageGenerationSuccess) {
    console.log('\n⚠️ 文字转图片功能测试失败，跳过后续测试');
    return;
  }
  
  const wsIntegrationSuccess = await testWebSocketIntegration();
  
  console.log('\n======= 测试结果汇总 =======');
  console.log(`MCP服务器连接: ${serverConnected ? '✅ 成功' : '❌ 失败'}`);
  console.log(`文字转图片功能: ${imageGenerationSuccess ? '✅ 成功' : '❌ 失败'}`);
  console.log(`WebSocket集成: ${wsIntegrationSuccess ? '✅ 成功' : '❌ 失败'}`);
  
  if (serverConnected && imageGenerationSuccess && wsIntegrationSuccess) {
    console.log('\n🎉 所有测试通过! MCP文字转图片功能正常工作');
  } else {
    console.log('\n⚠️ 测试未全部通过，请检查错误信息');
  }
}

runTests().catch(error => {
  console.error('测试过程中发生错误:', error);
}); 