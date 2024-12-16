import { competitionClient, systemMessage } from '../config/ai.js';
import pool from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 存储用户聊天历史
const userHistories = {};

// 获取当前文件的路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 定义临时文件存储目录
const TEMP_DIR = path.join(__dirname, '../temp');

// 确保临时目录存在
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// 发送消息
export const sendMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { message } = req.body;

    // 初始化用户历史记录
    if (!userHistories[userId]) {
      userHistories[userId] = [systemMessage];
    }

    // 添加用户消息到历史记录
    userHistories[userId].push({ role: 'user', content: message });

    // 如果历史记录超过3轮，移除最旧的一轮（保留系统消息）
    if (userHistories[userId].length > 7) {
      userHistories[userId].splice(1, 2);
    }

    // 调 Moonshot API
    const response = await competitionClient.chat.completions.create({
      model: 'moonshot-v1-8k',
      messages: userHistories[userId],
      temperature: 0.3,
    });

    const aiMessage = response.choices[0].message;

    // 将 AI 回复添加到历史记录
    userHistories[userId].push(aiMessage);

    // 保存聊天记录到数据库
    await pool.query(
      'INSERT INTO chat_history (user_id, message, response, created_at) VALUES (?, ?, ?, NOW())',
      [userId, message, aiMessage.content]
    );

    res.json({
      success: true,
      message: aiMessage.content
    });
  } catch (error) {
    console.error('聊天失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '抱歉，我暂时无法回答您的问题。' 
    });
  }
};

// 处理文件消息
export const handleFileMessage = async (req, res) => {
  try {
    const userId = req.user.userId;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ 
        success: false, 
        message: '未找到上传的文件' 
      });
    }

    // 解码文件名
    const fileName = Buffer.from(file.originalname, 'binary').toString('utf8');
    const tempFilePath = path.join(TEMP_DIR, `${Date.now()}-${fileName}`);

    // 保存文件到临时目录
    await fs.promises.writeFile(tempFilePath, file.buffer);

    try {
      // 上传文件到 Moonshot
      const fileObject = await competitionClient.files.create({
        file: fs.createReadStream(tempFilePath),
        purpose: 'file-extract'
      });

      // 获取文件内容
      const fileContent = await competitionClient.files.content(fileObject.id);
      const textContent = await fileContent.text();

      // 构造消息
      const messages = [
        systemMessage,
        {
          role: 'system',
          content: textContent,
        },
        { 
          role: 'user', 
          content: '请简单介绍这个文件的内容' 
        },
      ];

      // 获取AI回复
      const completion = await competitionClient.chat.completions.create({
        model: 'moonshot-v1-32k',
        messages: messages,
        temperature: 0.3,
      });

      const reply = completion.choices[0].message.content;

      // 保存用户的文件消息和AI的回复到聊天记录，使用解码后的文件名
      await pool.query(
        'INSERT INTO chat_history (user_id, message, response, created_at, is_file) VALUES (?, ?, ?, NOW(), true)',
        [userId, `📎 ${fileName}`, reply]
      );

      res.json({
        success: true,
        message: reply
      });
    } catch (error) {
      console.error('AI处理文件失败:', error);
      throw error;
    }
  } catch (error) {
    console.error('文件处理失败:', error);
    res.status(500).json({ 
      success: false, 
      message: '文件处理失败' 
    });
  } finally {
    // 清理临时文件
    try {
      if (fs.existsSync(tempFilePath)) {
        await fs.promises.unlink(tempFilePath);
      }
    } catch (err) {
      console.error('删除临时文件失败:', err);
    }
  }
};

// 获取聊天历史记录
export const getChatHistory = async (req, res) => {
  try {
    const userId = req.user.userId;
    const page = parseInt(req.query.page) || 1;
    const pageSize = parseInt(req.query.pageSize) || 50;
    const offset = (page - 1) * pageSize;

    // 获取聊天记录
    const [history] = await pool.query(
      `SELECT 
        message,
        response,
        created_at,
        CASE 
          WHEN message LIKE '📎%' THEN true 
          ELSE false 
        END as is_file
      FROM chat_history 
      WHERE user_id = ? 
      ORDER BY created_at ASC
      LIMIT ? OFFSET ?`,
      [userId, pageSize, offset]
    );

    // 转换为对���格式
    const conversations = [];
    history.forEach(record => {
      // 添加用户消息
      conversations.push({
        type: 'user',
        content: record.message,
        timestamp: record.created_at,
        isFile: record.is_file
      });
      // 添加AI回复
      conversations.push({
        type: 'ai',
        content: record.response,
        timestamp: record.created_at
      });
    });

    res.json({
      success: true,
      history: conversations
    });
  } catch (error) {
    console.error('获取聊天历史失败:', error);
    res.status(500).json({
      success: false,
      message: '获取聊天历史失败'
    });
  }
}; 