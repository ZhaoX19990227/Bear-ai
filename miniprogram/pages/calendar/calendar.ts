import { BASE_URL } from "../../config";
import aiChatBehavior from "../../behaviors/ai-chat-behavior";
Page({
  behaviors: [aiChatBehavior],
  data: {
    userInfo: null,
    currentDate: "",
    selectedDate: "",
    dietRecords: [],
    exerciseRecords: [],
    weightRecords: [],
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    day: new Date().getDate(),
    today: true,
    selectedDay: null,
    weekdays: ["日", "一", "二", "三", "四", "五", "六"],
    calendarData: [],
    calendarExpanded: false, // 日历是否展开
    // AI 聊天相关
    showAIChat: false,
    messages: [] as Array<{
      id?: number;
      content: string;
      avatarUrl?: string;
      fileUrl?: string;
      isFile?: boolean;
    }>,
    inputMessage: "",
  },

  onLoad() {
    this.checkLoginStatus();
    this.generateCalendar();
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth() + 1;
    const day = currentDate.getDate();

    // 计算日历数据并找到当天所在的周索引
    const calendarData = this.generateCalendarData(year, month);
    const weekIndex = this.findWeekIndex(calendarData, day);

    this.setData({
      year,
      month,
      day,
      calendarData,
      currentWeekIndex: weekIndex,
      calendarExpanded: false, // 默认部分展示
    });
  },
  findWeekIndex(calendarData, day) {
    for (let i = 0; i < calendarData.length; i++) {
      if (calendarData[i].includes(day)) {
        return i; // 返回当天所在的周索引
      }
    }
    return 0; // 如果未找到，默认返回第一周
  },

  toggleCalendar() {
    this.setData({
      calendarExpanded: !this.data.calendarExpanded,
    });
  },
  generateCalendarData(year, month) {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const calendarData = [];
    let week = new Array(firstDay).fill(0);

    for (let i = 1; i <= daysInMonth; i++) {
      week.push(i);
      if (week.length === 7 || i === daysInMonth) {
        calendarData.push(week);
        week = [];
      }
    }

    return calendarData;
  },

  // 生成日历数据
  generateCalendar() {
    const { year, month } = this.data;
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const calendar = [];

    let week = Array(firstDay).fill(0); // 填充空白天
    for (let i = 1; i <= daysInMonth; i++) {
      week.push(i);
      if (week.length === 7 || i === daysInMonth) {
        calendar.push(week);
        week = [];
      }
    }

    this.setData({ calendarData: calendar });
  },

  prevMonth() {
    const { year, month } = this.data;
    const newMonth = month === 1 ? 12 : month - 1;
    const newYear = month === 1 ? year - 1 : year;

    this.setData({ year: newYear, month: newMonth }, this.generateCalendar);
  },

  nextMonth() {
    const { year, month } = this.data;
    const newMonth = month === 12 ? 1 : month + 1;
    const newYear = month === 12 ? year + 1 : year;

    this.setData({ year: newYear, month: newMonth }, this.generateCalendar);
  },
  locateThisMonth() {
    const currentDate = new Date();
    this.setData(
      {
        year: currentDate.getFullYear(),
        month: currentDate.getMonth() + 1,
        day: currentDate.getDate(),
        today: true,
      },
      this.generateCalendar
    );
  },

  selectDate(e: any) {
    const selectedDay = e.currentTarget.dataset.value;
    this.setData({ selectedDay, today: false });
    console.log(
      `选中日期: ${this.data.year}-${this.data.month}-${selectedDay}`
    );
    this.fetchDietRecords(selectedDay);
  },

  fetchDietRecords(date) {
    const token = wx.getStorageSync("token");
    wx.request({
      url: `${BASE_URL}/diet/records`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        date: date,
      },
      success: (res) => {
        if (res.statusCode === 200 && res.data.code === 0) {
          this.setData({
            dietRecords: res.data.data,
          });
        }
      },
      fail: (err) => {
        console.error("获取饮食记录失败:", err);
      },
    });
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
      this.fetchUserData();
    }
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
});
