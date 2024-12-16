// index.ts
import { IMyApp } from '../../app';

Page({
  data: {
    // 轮播图数据
    swiperList: [
      {
        id: 1,
        url: 'https://attach-sit.oss-cn-shanghai.aliyuncs.com/default/d500c9fc14514f9585b762e3f0daf769.png?1=1',
        title: '健康饮食指南'
      },
      {
        id: 2,
        url: 'https://attach-sit.oss-cn-shanghai.aliyuncs.com/default/d500c9fc14514f9585b762e3f0daf769.png?1=1',
        title: '运动健康新趋势'
      }
    ],

    // 文章推荐数据
    articleList: [
      {
        id: 1,
        title: '如何科学控制饮食',
        summary: '掌握饮食平衡的关键技巧',
        cover: ''
      }
    ],

    // 今日饮食数据
    totalCalories: 0,
    totalProtein: 0,

    // 饮食记录相关
    mealTypes: ['早餐', '午餐', '晚餐', '加餐'],
    selectedMealTypeIndex: 0,
    showAddDietModal: false,
    newDietRecord: {
      mealType: '早餐',
      foodName: '',
      calories: null,
      protein: null
    },

    // 用户信息和登录状态
    userInfo: {},
    hasUserInfo: false,
    
    // AI 聊天相关
    showAIChat: false,
    messages: [] as Array<{type: 'user' | 'ai', content: string, avatarUrl?: string, fileUrl?: string}>,
    inputMessage: '',

    // 今日饮食记录列表
    todayDietRecords: [] as Array<{
      mealType: string;
      foodName: string;
      calories: number;
      protein: number;
      time: string;
    }>,

    // 在 data 中添加
    groupedDietRecords: [] as Array<{
      mealType: string;
      records: Array<{
        foodName: string;
        calories: number;
        protein: number;
        time: string;
      }>;
    }>,
  },

  onLoad() {
    this.checkLoginStatus();
    this.loadTodayDietInfo();
  },

  // 检查登录状态
  checkLoginStatus() {
    const app = getApp<IMyApp>();
    if (!app.globalData.userInfo) {
      wx.navigateTo({
        url: '/pages/login/login'
      });
    } else {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    }
  },

  // 加载今日饮食信息
  loadTodayDietInfo() {
    try {
      const records = wx.getStorageSync('dietRecords') || [];
      const todayRecords = records.filter(this.isToday);
      
      const totalCalories = todayRecords.reduce((sum, record) => sum + record.calories, 0);
      const totalProtein = todayRecords.reduce((sum, record) => sum + record.protein, 0);

      // 按照餐次类型分组
      const groupedRecords = this.groupDietRecordsByMealType(todayRecords);

      this.setData({
        totalCalories: Number(totalCalories.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1)),
        todayDietRecords: todayRecords,
        groupedDietRecords: groupedRecords
      });
    } catch (e) {
      console.error('加载今日饮食信息失败', e);
    }
  },

  // 判断记录是否为今天
  isToday(record: any): boolean {
    const recordDate = new Date(record.date);
    const today = new Date();
    return recordDate.toDateString() === today.toDateString();
  },

  // 显示添加饮食记录模态框
  showAddDietModal() {
    this.setData({ 
      showAddDietModal: true,
      newDietRecord: {
        mealType: this.data.mealTypes[this.data.selectedMealTypeIndex],
        foodName: '',
        calories: null,
        protein: null
      }
    });
  },

  // 隐藏添加饮食记录模态框
  hideAddDietModal() {
    this.setData({ showAddDietModal: false });
  },

  // 餐次类型选择
  onMealTypeChange(e: WechatMiniprogram.PickerChangeEvent) {
    const selectedIndex = e.detail.value;
    this.setData({
      selectedMealTypeIndex: selectedIndex,
      'newDietRecord.mealType': this.data.mealTypes[selectedIndex]
    });
  },

  // 输入处理
  onFoodNameInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'newDietRecord.foodName': e.detail.value });
  },

  onCaloriesInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'newDietRecord.calories': Number(e.detail.value) });
  },

  onProteinInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ 'newDietRecord.protein': Number(e.detail.value) });
  },

  // 确认添加饮食记录
  confirmAddDietRecord() {
    const { mealType, foodName, calories, protein } = this.data.newDietRecord;

    if (!foodName || !calories || !protein) {
      wx.showToast({
        title: '请填写完整信息',
        icon: 'none'
      });
      return;
    }

    const newRecord = {
      ...this.data.newDietRecord,
      date: new Date().toISOString(),
      time: this.getCurrentTime()
    };

    try {
      const records = wx.getStorageSync('dietRecords') || [];
      const updatedRecords = [...records, newRecord];
      
      wx.setStorageSync('dietRecords', updatedRecords);
      
      // 更新今日总计和记录列表
      const todayRecords = updatedRecords.filter(this.isToday);
      const totalCalories = todayRecords.reduce((sum, record) => sum + record.calories, 0);
      const totalProtein = todayRecords.reduce((sum, record) => sum + record.protein, 0);

      // 按照餐次类型分组
      const groupedRecords = this.groupDietRecordsByMealType(todayRecords);

      this.setData({
        totalCalories: Number(totalCalories.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1)),
        todayDietRecords: todayRecords,
        groupedDietRecords: groupedRecords,
        showAddDietModal: false
      });

      wx.showToast({
        title: '添加成功',
        icon: 'success'
      });
    } catch (e) {
      console.error('保存饮食记录失败', e);
      wx.showToast({
        title: '保存失败',
        icon: 'none'
      });
    }
  },

  // 获取当前时间
  getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, '0')}`;
  },

  // 轮播图点击事件
  onSwiperItemTap(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article-detail/article-detail?id=${id}`
    });
  },

  // 文章点击事件
  onArticleClick(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article-detail/article-detail?id=${id}`
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
        
        // 这里可以添加文件上传逻辑
        const userMessage = { 
          type: 'user', 
          content: '[文件]',
          fileUrl: tempFilePath,
          avatarUrl: this.data.userInfo.avatarUrl
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
    const { inputMessage, messages, userInfo } = this.data;
    
    if (!inputMessage.trim()) return;

    // 添加用户消息
    const userMessage = { 
      type: 'user', 
      content: inputMessage,
      avatarUrl: userInfo.avatarUrl
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

  // 添加分组方法
  groupDietRecordsByMealType(records: any[]): Array<{
    mealType: string;
    records: any[];
  }> {
    const mealTypeOrder = ['早餐', '午餐', '晚餐', '加餐'];
    
    // 按餐次类型分组
    const groupedRecords = records.reduce((acc, record) => {
      const existingGroup = acc.find(group => group.mealType === record.mealType);
      
      if (existingGroup) {
        existingGroup.records.push(record);
      } else {
        acc.push({
          mealType: record.mealType,
          records: [record]
        });
      }
      
      return acc;
    }, [] as Array<{mealType: string, records: any[]}>);

    // 按照预定义顺序排序
    return groupedRecords.sort((a, b) => 
      mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType)
    );
  },
});
