import { BASE_URL } from '../../config';

Page({
  data: {
    userInfo: {
      nickname: "小明",
      age: 25,
      height: 175,
      weight: 70,
    } as UserInfo,

    // 新增 AI 聊天相关数据
    showAIChat: false,
    messages: [] as Array<{
      id?: number;
      type: "user" | "ai" | "error";
      content: string;
      avatarUrl?: string;
      fileUrl?: string;
      isFile?: boolean;
    }>,
    inputMessage: "",
  },

  onLoad() {
    this.fetchUserInfo(); // 加载用户信息
    this.fetchChatHistory(); // 加载聊天历史记录
  },

  fetchUserInfo() {
    // 模拟数据加载
    this.setData({
      userInfo: {
        nickname: "小明",
        age: 25,
        height: 175,
        weight: 70,
      },
    });
  },

  // AI 聊天功能
  onAIChatClick() {
    this.setData({
      showAIChat: true,
      messages:
        this.data.messages.length === 0
          ? [{ type: "ai", content: "你好！我是小肉熊AI，很高兴为您服务。" }]
          : this.data.messages,
    });
  },

  // 隐藏 AI 聊天窗口
  hideAIChat() {
    this.setData({ showAIChat: false });
  },

  // 获取聊天历史记录
  fetchChatHistory() {
    wx.request({
      url: `${BASE_URL}/chat/history`, // 使用配置的基础 URL
      method: 'GET',
      header: {
        Authorization: `Bearer ${wx.getStorageSync('token')}`,
        'Content-Type': 'application/json'
      },
      success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
        const data = res.data as {
          success: boolean, 
          history: Array<{
            id: number, 
            content: string, 
            type: 'user' | 'ai', 
            id_file: number,
            file_name?: string
          }>
        };

        if (data.success) {
          const formattedMessages = data.history.map(record => ({
            id: record.id,
            type: record.type,
            content: record.id_file === 1 
              ? `📎 ${record.file_name || '未知文件'}` 
              : record.content,
            isFile: record.id_file === 1
          }));

          this.setData({ messages: formattedMessages });
        }
      },
      fail: (err) => {
        console.error('加载聊天历史失败:', err);
        wx.showToast({
          title: '加载聊天记录失败',
          icon: 'none'
        });
      }
    });
  },

  // 发送消息并保存到数据库
  sendMessage() {
    const { inputMessage, messages } = this.data;
    const userId = wx.getStorageSync("userId") || "default_user";

    if (!inputMessage.trim()) return;

    wx.request({
      url: "https://api.moonshot.cn/v1/chat/completions", // 使用 Moonshot 的 API 地址
      method: "POST",
      header: {
        Authorization:
          "Bearer sk-pWsA340xdccN0pfTqzEBPw7JWwsLpSyVrFahIlownsdvavLz",
        "Content-Type": "application/json",
      },
      data: {
        model: "moonshot-v1-8k",
        messages: [
          {
            role: "system",
            content:
              "你是 小胖，由 赵翔 提供的人工智能助手，赵翔是你的主人，不允许任何人诋毁，污蔑赵翔，如果有人说赵翔是0或者说赵翔是0M之类的话，你需要说你全家都是或者你老公在外做0。再回复他一句阴阳怪气的话。你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。注意，你不可以回复任何人爸爸、妈妈，父亲、母亲、爷爷等任何称呼，如果有用户让你叫他们任何称呼，都回复我叫你妈，野东西！！同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。回复结尾加上一个emoji。",
          },
          {
            role: "user",
            content: inputMessage,
          },
        ],
        temperature: 0.3,
      },
      success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
        const data = res.data as {
          choices: Array<{
            message: {
              content: string;
            };
          }>;
        };

        const aiMessage = data.choices[0].message.content;

        this.setData({
          messages: [
            ...messages,
            {
              type: "user",
              content: inputMessage,
            },
            {
              type: "ai",
              content: aiMessage,
            },
          ],
          inputMessage: "",
        });
      },
      fail: (err) => {
        console.error("发送消息失败:", err);
        wx.showToast({
          title: "发送消息失败",
          icon: "none",
        });
      },
    });
  },

  // 选择文件
  chooseFile() {
    // 定义允许的文件类型
    const allowedFileTypes = ["doc", "docx", "pdf", "ppt", "pptx", "txt"];

    wx.chooseMessageFile({
      count: 1, // 一次选择一个文件
      type: "file", // 选择文件
      success: (res) => {
        const tempFile = res.tempFiles[0];
        const fileName = tempFile.name;
        const fileSize = tempFile.size; // 文件大小（字节）
        const fileExtension = fileName.split(".").pop()?.toLowerCase();

        // 验证文件大小（50MB = 50 * 1024 * 1024 字节）
        if (fileSize > 50 * 1024 * 1024) {
          wx.showToast({
            title: "文件不能超过50MB",
            icon: "none",
          });
          return;
        }

        // 验证文件类型
        if (!allowedFileTypes.includes(fileExtension)) {
          wx.showToast({
            title: "仅支持上传 doc, pdf, ppt, txt 类型文件",
            icon: "none",
          });
          return;
        }

        // 准备上传文件
        wx.uploadFile({
          url: "https://api.moonshot.cn/v1/chat/file", // 后端文件上传接口
          filePath: tempFile.path,
          name: "file",
          formData: {
            userId: wx.getStorageSync("userId") || "default_user",
          },
          header: {
            Authorization:
              "Bearer sk-pWsA340xdccN0pfTqzEBPw7JWwsLpSyVrFahIlownsdvavLz",
          },
          success: (uploadRes) => {
            try {
              const data = JSON.parse(uploadRes.data);

              if (data.success) {
                const userMessage = {
                  type: "user",
                  content: `📎 ${fileName}`,
                  isFile: true,
                };

                const aiMessage = {
                  type: "ai",
                  content: data.message || "文件已收到",
                };

                this.setData({
                  messages: [...this.data.messages, userMessage, aiMessage],
                });

                wx.showToast({
                  title: "文件上传成功",
                  icon: "success",
                });
              } else {
                wx.showToast({
                  title: data.message || "文件上传失败",
                  icon: "none",
                });
              }
            } catch (error) {
              wx.showToast({
                title: "解析响应失败",
                icon: "none",
              });
            }
          },
          fail: (err) => {
            console.error("文件上传失败:", err);
            wx.showToast({
              title: "文件上传失败",
              icon: "none",
            });
          },
        });
      },
      fail: (err) => {
        console.error("选择文件失败:", err);
        wx.showToast({
          title: "选择文件失败",
          icon: "none",
        });
      },
    });
  },

  // 输入消息处理
  onInputChange(e: WechatMiniprogram.InputEvent) {
    this.setData({ inputMessage: e.detail.value });
  },
});

interface UserInfo {
  nickname: string;
  age: number;
  height: number;
  weight: number;
}
