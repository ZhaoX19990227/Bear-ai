import { BASE_URL } from "../../config";
const aiChatBehavior = require("../../behaviors/ai-chat-behavior");

Page({
  behaviors: [aiChatBehavior],
  data: {
    userInfo: null,
    currentDate: "",
    selectedDate: "",
    dietRecords: [],
    exerciseRecords: [],
    weightRecords: [],
    messages: [],
    showAIChat: false,
  },
  onLoad() {
    this.checkLoginStatus();
  },
  checkLoginStatus() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (!token || !userInfo) {
      this.setData({
        messages: [
          {
            type: "ai",
            content: "👋 嗨！请先在个人中心完成微信授权登录哦~",
          },
        ],
        userInfo: null,
      });

      wx.navigateTo({
        url: "/pages/user/user",
      });
    } else {
      this.setData({ userInfo });
      this.initCalendar();
      this.fetchUserData();
    }
  },
  initCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    this.setData({
      currentDate: `${year}-${month < 10 ? "0" + month : month}-${
        day < 10 ? "0" + day : day
      }`,
      selectedDate: `${year}-${month < 10 ? "0" + month : month}-${
        day < 10 ? "0" + day : day
      }`,
    });
  },
  fetchUserData() {
    wx.request({
      url: `${getApp().globalData.BASE_URL}/user/calendar-data`,
      method: "GET",
      header: {
        Authorization: `Bearer ${wx.getStorageSync("token")}`,
      },
      success: (res) => {
        this.setData({
          dietRecords: res.data.dietRecords,
          exerciseRecords: res.data.exerciseRecords,
          weightRecords: res.data.weightRecords,
        });
      },
    });
  },
  onDateChange(e) {
    const selectedDate = e.detail.value;
    this.setData({ selectedDate });
    this.fetchDateSpecificData(selectedDate);
  },
  fetchDateSpecificData(date) {
    wx.request({
      url: `${getApp().globalData.BASE_URL}/user/date-records`,
      method: "GET",
      header: {
        Authorization: `Bearer ${wx.getStorageSync("token")}`,
      },
      data: { date },
      success: (res) => {
        this.setData({
          dietRecords: res.data.dietRecords,
          exerciseRecords: res.data.exerciseRecords,
          weightRecords: res.data.weightRecords,
        });
      },
    });
  },
  addDietRecord() {
    wx.navigateTo({
      url: "/pages/diet-record/diet-record",
    });
  },
  addExerciseRecord() {
    wx.navigateTo({
      url: "/pages/exercise-record/exercise-record",
    });
  },
  addWeightRecord() {
    wx.navigateTo({
      url: "/pages/weight-record/weight-record",
    });
  },
  fetchChatHistory() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    if (!token || !userInfo) {
      this.setData({
        messages: [{ 
          type: 'ai', 
          content: '👋 嗨！请先在个人中心完成微信授权登录哦~' 
        }]
      });
      return;
    }

    wx.request({
      url: `${getApp().globalData.BASE_URL}/chat/history`,
      method: 'GET',
      header: {
        Authorization: `Bearer ${token}`,
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

        if (data.success && data.history.length > 0) {
          const formattedMessages = data.history.map(record => ({
            id: record.id,
            type: record.type,
            content: record.id_file === 1 
              ? `📎 ${record.file_name || '未知文件'}` 
              : record.content,
            isFile: record.id_file === 1
          }));

          this.setData({ messages: formattedMessages });
        } else {
          this.setData({
            messages: [{ 
              type: 'ai', 
              content: '👋 嗨！我是小肉熊AI，很高兴为您服务。' 
            }]
          });
        }
      },
      fail: (err) => {
        console.error('加载聊天历史失败:', err);
        this.setData({
          messages: [{ 
            type: 'ai', 
            content: '😔 加载聊天记录失败，请稍后重试。' 
          }]
        });
      }
    });
  },
  onAIChatClick() {
    console.log('onAIChatClick triggered in calendar page');
    // 检查登录状态
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');

    console.log('Token:', token);
    console.log('UserInfo:', userInfo);

    if (!token || !userInfo) {
      console.log('未登录');
      // 未登录，跳转到登录页面（tabbar页面）
      wx.switchTab({
        url: '/pages/login/login',
        fail: (err) => {
          console.error('Switch tab error:', err);
        }
      });
      return;
    }

    // 已登录，加载聊天历史
    this.fetchChatHistory();
    this.setData({ 
      showAIChat: true,
      userInfo: userInfo
    });
  },
});
