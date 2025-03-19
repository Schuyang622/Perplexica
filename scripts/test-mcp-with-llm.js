/**
 * MCP文字转图片功能与大模型集成测试脚本
 * 
 * 此脚本用于测试Perplexica的MCP文字转图片功能与大模型的集成
 * 运行方式: node scripts/test-mcp-with-llm.js
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

// 测试与大模型集成的文字转图片功能
async function testLLMIntegration() {
  return new Promise((resolve) => {
    console.log('\n测试大模型生成内容并转换为图片...');
    
    const ws = new WebSocket(BACKEND_WS_URL);
    const messageId = uuidv4();
    const chatId = uuidv4();
    let connected = false;
    let gotResponse = false;
    let gotImage = false;
    let gotGeneratedContent = false;
    
    ws.on('open', () => {
      console.log('✅ WebSocket连接成功!');
      connected = true;
      
      // 发送包含图片请求的消息，这次不提供明确的内容，让大模型自己生成
      ws.send(JSON.stringify({
        type: 'message',
        message: {
          messageId,
          chatId,
          content: '请解释什么是人工智能，并生成一张图片'
        },
        history: [
          ['human', '请解释什么是人工智能，并生成一张图片']
        ],
        focusMode: 'webSearch',
        optimizationMode: 'balanced'
      }));
      
      console.log('已发送测试消息...');
    });
    
    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        
        if (message.type === 'message') {
          console.log('收到文本消息:', message.data.substring(0, 50) + '...');
          gotResponse = true;
          
          // 检查消息内容是否包含有关AI的内容，表明大模型生成了内容
          if (message.data.toLowerCase().includes('人工智能') || 
              message.data.toLowerCase().includes('artificial intelligence') ||
              message.data.toLowerCase().includes('ai')) {
            gotGeneratedContent = true;
            console.log('✅ 检测到大模型生成的内容!');
          }
        }
        
        if (message.type === 'image') {
          console.log('✅ 收到图片消息!');
          console.log('图片URL:', message.data.imageUrl);
          gotImage = true;
        }
        
        if (message.type === 'messageEnd') {
          console.log('消息结束，测试完成');
          
          // 总结测试结果
          if (connected && gotResponse && gotImage && gotGeneratedContent) {
            console.log('\n✅ 大模型集成测试成功!');
            console.log('- 大模型成功生成了关于人工智能的内容');
            console.log('- 内容被成功转换为图片');
            resolve(true);
          } else {
            console.log('\n❌ 大模型集成测试失败!');
            console.log(`连接: ${connected ? '成功' : '失败'}`);
            console.log(`文本响应: ${gotResponse ? '成功' : '失败'}`);
            console.log(`大模型生成内容: ${gotGeneratedContent ? '成功' : '失败'}`);
            console.log(`图片生成: ${gotImage ? '成功' : '失败'}`);
            resolve(false);
          }
          
          ws.close();
        }
      } catch (error) {
        console.error('解析消息出错:', error);
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
    }, 60000); // 等待时间更长，因为大模型生成内容需要时间
  });
}

// 运行所有测试
async function runTests() {
  console.log('======= MCP文字转图片功能与大模型集成测试 =======\n');
  
  const serverConnected = await testMCPServerConnection();
  if (!serverConnected) {
    console.log('\n⚠️ MCP服务器连接失败，跳过后续测试');
    return;
  }
  
  const llmIntegrationSuccess = await testLLMIntegration();
  
  console.log('\n======= 测试结果汇总 =======');
  console.log(`MCP服务器连接: ${serverConnected ? '✅ 成功' : '❌ 失败'}`);
  console.log(`大模型集成测试: ${llmIntegrationSuccess ? '✅ 成功' : '❌ 失败'}`);
  
  if (serverConnected && llmIntegrationSuccess) {
    console.log('\n🎉 所有测试通过! MCP文字转图片功能已成功集成大模型');
    console.log('\n这表明系统能够:');
    console.log('1. 正确识别用户的图片生成请求');
    console.log('2. 调用大模型生成内容');
    console.log('3. 将生成的内容转换为图片');
    console.log('4. 向用户展示生成的内容和图片');
  } else {
    console.log('\n⚠️ 测试未全部通过，请检查错误信息');
  }
}

runTests().catch(error => {
  console.error('测试过程中发生错误:', error);
}); 