import { BASE_URL } from "../../config";
import aiChatBehavior from "../../behaviors/ai-chat-behavior";
import fatSecretApi from "../../utils/fatSecretApi";
import { fetchRandomImages } from "../../utils/pixabay";
import { OpenAI } from "../../utils/openai";
import { minioClient } from "../../utils/minio";

const competitionClient = new OpenAI({
  apiKey: "sk-pWsA340xdccN0pfTqzEBPw7JWwsLpSyVrFahIlownsdvavLz",
  baseURL: "https://api.moonshot.cn/v1",
});

Page({
  behaviors: [aiChatBehavior],
  data: {
    allowedFileTypes: ["doc", "pdf", "ppt", "txt"],
    // 轮播图数据
    swiperList: [],

    // 文章推荐数据
    articleList: [],

    // 今日饮食数据
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,

    // 饮食记录相关
    mealTypes: ["早餐", "午餐", "下午茶", "晚餐", "加餐", "其他"],
    selectedMealTypeIndex: 0,
    showAddDietModal: false,
    newDietRecord: {
      mealType: "",
      foodName: "",
      calories: null,
      protein: null,
      fat: null,
      weight: null,
    },

    // 用户信息和登录状态
    userInfo: wx.getStorageSync("userInfo") || null,
    hasUserInfo: false,

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

    // 今日饮食记录列表
    todayDietRecords: [] as Array<{
      mealType: string;
      foodName: string;
      calories: number;
      protein: number;
      fat: number;
      weight: number;
      time: string;
    }>,

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

  onLoad() {
    this.checkLoginStatus();
    // this.fetchHealthyArticles(); // 页面加载时立即获取一次健康文章
    // 设置定时任务每天凌晨1点执行
    // this.setupCronJob();
    this.loadSwiperImages(); // 加载轮播图图片
    this.setData({
      "newDietRecord.mealType":
        this.data.mealTypes[this.data.selectedMealTypeIndex],
    });
  },
  async loadSwiperImages() {
    const API_KEY = "47290386-8fe1fd5c22b614fe4f8e5136f";
    const keyword = "美食，健康饮食，水果";

    try {
      const imageUrls = await fetchRandomImages(keyword, API_KEY);
      if (!Array.isArray(imageUrls)) {
        console.error("Expected an array of image URLs but got:", imageUrls);
        return;
      }

      // 更新轮播图数据
      this.setData({
        swiperList: imageUrls.slice(0, 5).map((url, index) => ({
          id: index + 1,
          url: url,
        })),
      });
    } catch (error) {
      console.error("Failed to load swiper images:", error);
    }
  },

  checkLoginStatus() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (!token || !userInfo) {
      wx.navigateTo({
        url: "/pages/user/user",
      });
    } else {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
      });
      this.loadTodayDietInfo();
    }
  },

  // 加载今日饮食信息
  loadTodayDietInfo() {
    try {
      const token = wx.getStorageSync("token");
      if (!token) {
        return;
      }
      wx.request({
        url: `${BASE_URL}/diet/records`,
        method: "GET",
        header: {
          Authorization: `Bearer ${token}`,
        },
        success: (res) => {
          console.log("res:", JSON.stringify(res.data));
          if (res.statusCode && res.data) {
            // 检查响应状态
            const records = res.data;
            const updatedRecords = [...records, ...this.data.todayDietRecords];
            // 更新页面数据
            this.setData({
              todayDietRecords: updatedRecords,
              todayRecords: records, // 直接使用从后端获取的当天记录
            });
            // 如果有其他需要更新的操作，比如 UI 或者计算总计
            this.updateTodayTotals();
          } else {
            console.error("获取今日饮食记录失败:", res);
            wx.showToast({
              title: "获取今日饮食记录失败",
              icon: "none",
            });
          }
        },
        fail: (err) => {
          console.error("请求失败:", err);
          wx.showToast({
            title: "请求失败，请重试",
            icon: "none",
          });
        },
      });
    } catch (e) {
      console.error("加载今日饮食信息失败", e);
    }
  },
  updateTodayTotals() {
    const todayRecords = this.data.todayDietRecords;
    const totalCalories = todayRecords.reduce(
      (sum, record) => sum + record.calories,
      0
    );
    const totalProtein = todayRecords.reduce(
      (sum, record) => sum + record.protein,
      0
    );
    const totalFat = todayRecords.reduce(
      (sum, record) => sum + (record.fat || 0),
      0
    );
    console.log("todayRecords", todayRecords);
    // 按照餐次类型分组
    const groupedRecords = this.groupDietRecordsByMealType(todayRecords);

    this.setData({
      totalCalories: Number(totalCalories.toFixed(1)),
      totalProtein: Number(totalProtein.toFixed(1)),
      totalFat: Number(totalFat.toFixed(1)),
      todayDietRecords: todayRecords,
      groupedDietRecords: groupedRecords,
    });
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
      foodNamePlaceholder: "食物名称",
      weightPlaceholder: "食物重量 (g)",
      showAddDietModal: true,
      newDietRecord: {
        mealType: this.data.mealTypes[this.data.selectedMealTypeIndex],
        foodName: "",
        calories: null,
        protein: null,
        fat: null,
        weight: null,
      },
    });
  },

  // 隐藏添加饮食记录模态框
  hideAddDietModal() {
    this.setData({ showAddDietModal: false });
  },

  onFoodNameInput(e) {
    const value = e.detail.value;
    this.setData({
      "newDietRecord.foodName": value,
    });
  },

  onFoodNameFocus() {
    // 当输入框获得焦点时，清空 placeholder
    this.setData({
      foodNamePlaceholder: "",
    });
  },

  onFoodNameBlur() {
    // 当输入框失去焦点时，检查内容是否为空并恢复 placeholder
    if (!this.data.newDietRecord.foodName.trim()) {
      this.setData({
        foodNamePlaceholder: "食物名称",
      });
    }
  },
  onFoodWeightFocus() {
    // 当输入框获得焦点时，清空 placeholder
    this.setData({
      weightPlaceholder: "",
    });
  },

  onFoodWeightBlur() {
    // 当输入框失去焦点时，检查内容是否为空并恢复 placeholder
    if (!this.data.newDietRecord.weight) {
      this.setData({
        weightPlaceholder: "食物重量 (g)",
      });
    }
  },

  // 输入处理
  onMealTypeChange(e) {
    console.log("onMealTypeChange", e);
    const selectedIndex = e.detail.value;
    this.setData({
      selectedMealTypeIndex: selectedIndex,
      "newDietRecord.mealType": this.data.mealTypes[selectedIndex],
    });
  },

  onFoodNameInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ "newDietRecord.foodName": e.detail.value });
  },

  onCaloriesInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ "newDietRecord.calories": Number(e.detail.value) });
  },

  onProteinInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ "newDietRecord.protein": Number(e.detail.value) });
  },
  onFatInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ "newDietRecord.fat": Number(e.detail.value) });
  },
  onWeightInput(e: WechatMiniprogram.InputEvent) {
    this.setData({ "newDietRecord.weight": Number(e.detail.value) });
  },

  // 确认添加饮食记录
  confirmAddDietRecord() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (!token || !userInfo) {
      wx.navigateTo({
        url: "/pages/user/user",
      });
    } else {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
      });
    }

    const { mealType, foodName, calories, protein, fat, weight } =
      this.data.newDietRecord;

    console.log("Confirm Add Diet Record:", {
      mealType,
      foodName,
      calories,
      protein,
      fat,
      weight,
    });

    if (!mealType || !foodName || !calories || !protein || !fat || !weight) {
      wx.showToast({
        title: "请填写完整信息哦～🐻",
        icon: "none",
      });
      return;
    }

    const newRecord = {
      ...this.data.newDietRecord,
      date: new Date().toISOString(),
      time: this.getCurrentTime(),
    };

    try {
      const token = wx.getStorageSync("token");
      wx.request({
        url: `${BASE_URL}/diet/record`,
        method: "POST",
        header: {
          Authorization: `Bearer ${token}`,
        },
        data: newRecord,
        success: (res) => {
          console.log("res", res);
          if (res.statusCode) {
            this.setData({
              selectedMealTypeIndex: 0,
              showAddDietModal: false,
            });
            this.loadTodayDietInfo();
          }
        },
      });
    } catch (e) {
      console.error("保存饮食记录失败", e);
      wx.showToast({
        title: "保存失败",
        icon: "none",
      });
      this.setData({
        selectedMealTypeIndex: 0,
        showAddDietModal: false,
      });
    }
  },

  // 获取当前时间
  getCurrentTime(): string {
    const now = new Date();
    return `${now.getHours()}:${now.getMinutes().toString().padStart(2, "0")}`;
  },

  // 轮播图点击事件
  onSwiperItemTap(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article-detail/article-detail?id=${id}`,
    });
  },

  // 文章点击事件
  onArticleClick(e: WechatMiniprogram.CustomEvent) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/article-detail/article-detail?id=${id}`,
    });
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
  async searchFoodByName() {
    const { foodName, weight } = this.data.newDietRecord;

    if (!foodName) {
      wx.showToast({
        title: "请输入食物名称",
        icon: "none",
      });
      return;
    }
    if (!weight) {
      wx.showToast({
        title: "请输入食物重量",
        icon: "none",
      });
      return;
    }
    wx.showLoading({
      title: "小肉熊AI思考中...",
    });

    try {
      const food = await fatSecretApi.searchFood(foodName);
      console.log("搜索到的食物:", food);

      const description = food.food_description;

      // 解析单位
      const weightUnit = fatSecretApi.parseWeight(description);

      const { calories, fat, protein } = fatSecretApi.parseFoodDescription(
        food.food_description
      );
      const baseWeight = fatSecretApi.parseWeight(description); // 解析基础重量和单位
      this.setData({
        newDietRecord: {
          mealType: this.data.newDietRecord.mealType,
          foodName: foodName,
          weight: weight,
          calories: (
            (Number(fatSecretApi.extractValue(description, "Calories")) /
              Number(baseWeight)) *
            Number(weight)
          ).toFixed(2),
          protein: (
            (Number(fatSecretApi.extractValue(description, "Protein")) /
              Number(baseWeight)) *
            Number(weight)
          ).toFixed(2),
          fat: (
            (Number(fatSecretApi.extractValue(description, "Fat")) /
              Number(baseWeight)) *
            Number(weight)
          ).toFixed(2),
        },
      });
      this.calculateResults(); // 初始渲染
      wx.hideLoading();
    } catch (error) {
      console.error("搜索食物失败:", error);
      wx.hideLoading();
      wx.showToast({
        title: "搜索食物失败",
        icon: "none",
      });
    }
  },
  onFoodWeightInput(e: any) {
    const weight = e.detail.value;
    this.setData({
      "newDietRecord.weight": weight,
    });
    this.calculateResults();
  },
  // 计算最终结果
  calculateResults() {
    const { baseWeight, newDietRecord } = this.data;

    if (!baseWeight || !newDietRecord.weight) return;

    const weightRatio = parseFloat(newDietRecord.weight) / baseWeight;

    const calculatedResults = {
      calories: (parseFloat(newDietRecord.calories) * weightRatio).toFixed(2),
      protein: (parseFloat(newDietRecord.protein) * weightRatio).toFixed(2),
      fat: (parseFloat(newDietRecord.fat) * weightRatio).toFixed(2),
      weight: newDietRecord.weight,
      baseWeight: baseWeight,
      weightUnit: `/${baseWeight}g`,
    };

    this.setData({
      calculatedResults: calculatedResults,
    });
  },
});
