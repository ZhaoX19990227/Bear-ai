import { BASE_URL } from "../../config";
import aiChatBehavior from "../../behaviors/ai-chat-behavior";

// 定义饮食记录的接口
interface DietRecord {
  id?: number;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  foodName: string;
  calories: number;
  protein: number;
  fat: number;
  weight: number;
}

// 定义分组后的饮食记录接口
interface GroupedDietRecord {
  mealType: string;
  records: DietRecord[];
}

Page({
  behaviors: [aiChatBehavior],
  data: {
    userInfo: null,
    currentDate: "",
    selectedDate: "",
    dietRecords: [] as DietRecord[],
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
    // 在 data 中添加
    groupedDietRecords: [] as Array<{
      mealType: string;
      records: Array<{
        food_name: string;
        calories: number;
        protein: number;
        fat: number;
        weight: number;
        time: string;
      }>;
    }>,
  },

  onShow() {
    this.fetchDietRecords(new Date().getDate());
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

// 添加分组方法
groupDietRecordsByMealType(records: any[]): Array<{
  mealType: string;
  records: any[];
}> {
  const mealTypeOrder = ["早餐", "午餐", "下午茶", "晚餐", "加餐", "其他"];

  // 动态获取实际出现的 mealType
  const actualMealTypes = Array.from(
    new Set(records.map((record) => record.mealType))
  );

  // 合并并去重
  const combinedMealTypeOrder = [
    ...new Set([...mealTypeOrder, ...actualMealTypes]),
  ];
  const groupedRecords = records.reduce((acc, record) => {
    const existingGroup = acc.find(
      (group) => group.mealType === record.mealType
    );

    if (existingGroup) {
      existingGroup.records.push(record);
    } else {
      acc.push({
        mealType: record.mealType,
        records: [record],
      });
    }

    return acc;
  }, [] as Array<{ mealType: string; records: any[] }>);

  // 按照预定义顺序排序
  return groupedRecords.sort(
    (a, b) =>
      combinedMealTypeOrder.indexOf(a.mealType) -
      combinedMealTypeOrder.indexOf(b.mealType)
  );
},

  fetchDietRecords(selectedDay) {
    const token = wx.getStorageSync("token");
    const selectedDate = `${this.data.year}-${this.data.month.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    console.log("selectedDate", selectedDate);
    wx.request({
      url: `${BASE_URL}/diet/recordsByDate`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
      },
      data: {
        date: selectedDate
      },
      success: (res) => {
        if (res.statusCode === 200) {
          const dietRecords = res.data;
        
          // 计算总计
          const totalCalories = dietRecords.reduce((sum, record) => sum + record.calories, 0).toFixed(2);
          const totalProtein = dietRecords.reduce((sum, record) => sum + record.protein, 0).toFixed(2);
          const totalFat = dietRecords.reduce((sum, record) => sum + record.fat, 0).toFixed(2);

          // 分组饮食记录
          const records = this.groupDietRecordsByMealType(dietRecords);

          this.setData({
            dietRecords,
            groupedDietRecords:records,
            totalCalories,
            totalProtein,
            totalFat
          });
        }
      },
      fail: (err) => {
        console.error("获取饮食记录失败:", err);
        wx.showToast({
          title: "获取饮食记录失败",
          icon: "none"
        });
      }
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
