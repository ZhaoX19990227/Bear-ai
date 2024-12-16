Page({
  data: {
    currentDate: "2024-12-16", // 当前日期
    dietList: [] as Array<{ food: string }>, // 当天的饮食记录

    // 新增 AI 聊天相关数据
    showAIChat: false,
    messages: [] as Array<{type: 'user' | 'ai', content: string, avatarUrl?: string, fileUrl?: string}>,
    inputMessage: '',
  },

  onLoad() {
    this.fetchDietData(); // 加载饮食记录
  },

  onDateSelect(e: WechatMiniprogram.CustomEvent) {
    const selectedDate: string = e.detail.date;
    this.setData({ currentDate: selectedDate });
    this.fetchDietData(); // 获取对应日期的饮食记录
  },

  fetchDietData() {
    // 模拟获取数据
    this.setData({
      dietList: [
        { food: "早餐：煎蛋三明治" },
        { food: "午餐：鸡胸肉沙拉" },
        { food: "晚餐：意大利面" },
      ],
    });
  },

  addFood() {
    wx.showModal({
      title: "添加食物",
      content: "请输入食物名称",
      success: (res) => {
        if (res.confirm) {
          const newFood = { food: "新食物记录" };
          this.setData({ dietList: [...this.data.dietList, newFood] });
        }
      },
    });
  },

  // AI 聊天功能
  onAIChatClick() {
    this.setData({ 
      showAIChat: true,
      messages: this.data.messages.length === 0 
        ? [{ type: 'ai', content: '你好！我是小肉熊AI，很高兴为您服务。' }]
        : this.data.messages
    });
  },

  // 隐藏 AI 聊天窗口
  hideAIChat() {
    this.setData({ showAIChat: false });
  },

  // 选择文件
  chooseFile() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image', 'video'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        const userMessage = { 
          type: 'user', 
          content: '[文件]',
          fileUrl: tempFilePath,
          avatarUrl: this.data.userInfo?.avatarUrl || ''
        };

        const aiMessage = { 
          type: 'ai', 
          content: '我已收到您的文件，正在处理中...'
        };

        this.setData({
          messages: [...this.data.messages, userMessage, aiMessage]
        });
      }
    });
  },

  // 输入消息处理
  onInputChange(e: WechatMiniprogram.InputEvent) {
    this.setData({ inputMessage: e.detail.value });
  },

  // 发送消息
  sendMessage() {
    const { inputMessage, messages } = this.data;
    
    if (!inputMessage.trim()) return;

    // 添加用户消息
    const userMessage = { 
      type: 'user', 
      content: inputMessage,
      avatarUrl: this.data.userInfo?.avatarUrl || ''
    };

    // 模拟 AI 回复（实际应该调用后端 AI 接口）
    const aiMessage = { 
      type: 'ai', 
      content: this.generateAIResponse(inputMessage)
    };

    this.setData({
      messages: [...messages, userMessage, aiMessage],
      inputMessage: ''
    });
  },

  // AI 响应生成器
  generateAIResponse(userInput: string): string {
    // 简单的规则匹配回复
    const responses: { [key: string]: string } = {
      '你好': '你好！很高兴为您服务。',
      '健康': '保持健康的生活方式很重要，包括均衡饮食、适度运动和充足睡眠。',
      '饮食': '我可以帮您记录和分析饮食，提供个性化的营养建议。',
      '默认': '我听不太懂您的意思，可以再详细说说吗？'
    };

    // 遍历关键词匹配
    for (const keyword in responses) {
      if (userInput.includes(keyword)) {
        return responses[keyword];
      }
    }

    return responses['默认'];
  },
});
