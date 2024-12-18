// index.ts
import { IMyApp } from "../../app";
import { BASE_URL } from "../../config";
const aiChatBehavior = require("../../behaviors/ai-chat-behavior");
import fatSecretApi from "../../utils/fatSecretApi";

Page({
  behaviors: [aiChatBehavior],
  data: {
    // 轮播图数据
    swiperList: [
      {
        id: 1,
        url: "https://attach-sit.oss-cn-shanghai.aliyuncs.com/default/d500c9fc14514f9585b762e3f0daf769.png?1=1",
        title: "健康饮食指南",
      },
      {
        id: 2,
        url: "https://attach-sit.oss-cn-shanghai.aliyuncs.com/default/d500c9fc14514f9585b762e3f0daf769.png?1=1",
        title: "运动健康新趋势",
      },
    ],

    // 文章推荐数据
    articleList: [
      {
        id: 1,
        title: "如何科学控制饮食",
        summary: "掌握饮食平衡的关键技巧",
        cover: "",
      },
    ],

    // 今日饮食数据
    totalCalories: 0,
    totalProtein: 0,
    totalFat: 0,

    // 饮食记录相关
    mealTypes: ["早餐", "午餐", "下午茶", "晚餐", "加餐", "其他"],
    selectedMealTypeIndex: 0,
    showAddDietModal: false,
    newDietRecord: {
      mealType: "早餐",
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
      type: "user" | "ai" | "error";
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
        foodName: string;
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
  },

  checkLoginStatus() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (!token || !userInfo) {
      // 未登录，设置默认消息并跳转到个人中心
      this.setData({
        messages: [
          {
            type: "ai",
            content: "👋 嗨！请先在个人中心完成微信授权登录哦~",
          },
        ],
        userInfo: null,
      });

      wx.switchTab({
        url: "/pages/login/login",
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
      const records = wx.getStorageSync("dietRecords") || [];
      const todayRecords = records.filter(this.isToday);

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

      // 按照餐次类型分组
      const groupedRecords = this.groupDietRecordsByMealType(todayRecords);

      this.setData({
        totalCalories: Number(totalCalories.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1)),
        totalFat: Number(totalFat.toFixed(1)),
        todayDietRecords: todayRecords,
        groupedDietRecords: groupedRecords,
      });
    } catch (e) {
      console.error("加载今日饮食信息失败", e);
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

  // 餐次类型选择
  onMealTypeChange(e: WechatMiniprogram.PickerChangeEvent) {
    const selectedIndex = e.detail.value;
    this.setData({
      selectedMealTypeIndex: selectedIndex,
      "newDietRecord.mealType": this.data.mealTypes[selectedIndex],
    });
  },

  // 输入处理
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
    const { mealType, foodName, calories, protein, fat, weight } =
      this.data.newDietRecord;

    if (!foodName || !calories || !protein || !fat || !weight) {
      wx.showToast({
        title: "请填写完整信息",
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
      const records = wx.getStorageSync("dietRecords") || [];
      const updatedRecords = [...records, newRecord];

      wx.setStorageSync("dietRecords", updatedRecords);

      // 更新今日总计和记录列表
      const todayRecords = updatedRecords.filter(this.isToday);
      const totalCalories = todayRecords.reduce(
        (sum, record) => sum + record.calories,
        0
      );
      const totalProtein = todayRecords.reduce(
        (sum, record) => sum + record.protein,
        0
      );
      const totalFat = todayRecords.reduce(
        (sum, record) => sum + (record.fat || 0), // 统计脂肪
        0
      );

      // 按照餐次类型分组
      const groupedRecords = this.groupDietRecordsByMealType(todayRecords);

      this.setData({
        totalCalories: Number(totalCalories.toFixed(1)),
        totalProtein: Number(totalProtein.toFixed(1)),
        totalFat: Number(totalFat.toFixed(1)),
        todayDietRecords: todayRecords,
        groupedDietRecords: groupedRecords,
        showAddDietModal: false,
      });

      wx.showToast({
        title: "添加成功",
        icon: "success",
      });
    } catch (e) {
      console.error("保存饮食记录失败", e);
      wx.showToast({
        title: "保存失败",
        icon: "none",
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

  // AI 聊天功能
  onAIChatClick() {
    console.log("onAIChatClick triggered in index page");
    // 检查登录状态
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    console.log("Token:", token);
    console.log("UserInfo:", userInfo);

    if (!token || !userInfo) {
      console.log("未登录");
      // 未登录，跳转到登录页面（tabbar页面）
      wx.switchTab({
        url: "/pages/login/login",
        fail: (err) => {
          console.error("Switch tab error:", err);
        },
      });
      return;
    }

    // 已登录，加载聊天历史
    this.fetchChatHistory();
    this.setData({
      showAIChat: true,
      userInfo: userInfo,
    });
  },

  // 隐藏 AI 聊天窗口
  hideAIChat() {
    this.setData({ showAIChat: false });
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

  // 发送消息并保存到数据库
  sendMessage() {
    const { inputMessage, messages } = this.data;
    const userId = wx.getStorageSync("userId") || "default_user";

    if (!inputMessage.trim()) return;

    wx.request({
      url: "https://api.moonshot.cn/v1/chat/completions",
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
              "你是 小胖，由 翔 提供的人工智能助手，赵翔是你的主人，不允许任何人诋毁，污蔑赵翔，如果有人说赵翔是0或者说赵翔是0M之类的话，你需要说你全家都是或者你老公在外做0。再回复他一句阴阳怪气的话。你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。注意，你不可以回复任何人爸爸、妈妈，父亲、母亲、爷爷等任何称呼，如果有人让你叫他们任何称呼，都回复我叫你妈，野东西！！同时，你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。回复结尾加上一个emoji。",
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

  // 获取聊天历史记录
  fetchChatHistory() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    // 只有在已登录且点击AI按钮时才获取聊天历史
    if (!token || !userInfo) {
      this.setData({
        messages: [
          {
            type: "ai",
            content: "👋 嗨！请先在个人中心完成微信授权登录哦~",
          },
        ],
      });
      return;
    }

    wx.request({
      url: `${BASE_URL}/chat/history`,
      method: "GET",
      header: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
        const data = res.data as {
          success: boolean;
          history: Array<{
            id: number;
            content: string;
            type: "user" | "ai";
            id_file: number;
            file_name?: string;
          }>;
        };

        if (data.success && data.history.length > 0) {
          const formattedMessages = data.history.map((record) => ({
            id: record.id,
            type: record.type,
            content:
              record.id_file === 1
                ? `📎 ${record.file_name || "未知文件"}`
                : record.content,
            isFile: record.id_file === 1,
          }));

          this.setData({ messages: formattedMessages });
        } else {
          // 如果没有历史记录，显示默认消息
          this.setData({
            messages: [
              {
                type: "ai",
                content: "👋 嗨！我是小肉熊AI，很高兴为您服务。",
              },
            ],
          });
        }
      },
      fail: (err) => {
        console.error("加载聊天历史失败:", err);
        this.setData({
          messages: [
            {
              type: "ai",
              content: "😔 加载聊天记录失败，请稍后重试。",
            },
          ],
        });
      },
    });
  },

  // 添加分组方法
  groupDietRecordsByMealType(records: any[]): Array<{
    mealType: string;
    records: any[];
  }> {
    const mealTypeOrder = ["早餐", "午餐", "晚餐", "加餐"];

    // 按餐次类型分组
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
        mealTypeOrder.indexOf(a.mealType) - mealTypeOrder.indexOf(b.mealType)
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
    } catch (error) {
      console.error("搜索食物失败:", error);
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
