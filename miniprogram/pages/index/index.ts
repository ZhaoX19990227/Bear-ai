// index.ts
import { BASE_URL } from "../../config";
const aiChatBehavior = require("../../behaviors/ai-chat-behavior");
import fatSecretApi from "../../utils/fatSecretApi";
import { fetchRandomImages } from "../../utils/pixabay";

Page({
  loading: false,
  behaviors: [aiChatBehavior],
  data: {
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
    console.log("onLoad",this.data.selectedMealTypeIndex);
    console.log("123",this.data.mealTypes[this.data.selectedMealTypeIndex])
    this.checkLoginStatus();
    // this.fetchHealthyArticles(); // 页面加载时立即获取一次健康文章
    // 设置定时任务每天凌晨1点执行
    // this.setupCronJob();
    this.loadSwiperImages(); // 加载轮播图图片
    this.setData({
      "newDietRecord.mealType": this.data.mealTypes[this.data.selectedMealTypeIndex]
    });
   
  },
  async loadSwiperImages() {
    const API_KEY = "47290386-8fe1fd5c22b614fe4f8e5136f";
    const keyword = "美食，健康饮食";

    try {
      const imageUrls = await fetchRandomImages(keyword, API_KEY);
      // 确保 imageUrls 是一个数组
      if (!Array.isArray(imageUrls)) {
        console.error("Expected an array of image URLs but got:", imageUrls);
        return;
      }

      // 更新轮播图数据
      this.setData({
        swiperList: imageUrls.slice(0, 5).map((url, index) => ({
          id: index + 1,
          url: url,
          // title: `${keyword} 图片 ${index + 1}`
        })),
      });
    } catch (error) {
      console.error("Failed to load swiper images:", error);
    }
  },
  // setupCronJob() {
  //   if (typeof wx !== 'undefined' && typeof wx.getBackgroundFetchToken === 'function') {
  //     // 如果是微信小程序环境并且支持后台更新机制，则使用它
  //     wx.getBackgroundFetchToken({
  //       success(res) {
  //         console.log('Background fetch token:', res.token);
  //       }
  //     });
  //   } else {
  //     // 使用 node-cron 或其他方法模拟定时任务（仅限开发测试）
  //     console.warn('Background fetch not supported, using fallback cron job.');
  //     const cron = require("node-cron");
  //     cron.schedule("0 1 * * *", () => {
  //       console.log("Fetching healthy articles at 1 AM...");
  //       this.fetchHealthyArticles();
  //     });
  //   }
  // },

  // async fetchHealthyArticles() {
  //   try {
  //     const appId = "8d7de087"; // 在微信小程序中直接填写或从本地缓存读取
  //     const appKey = "0f2e1dcbb409f49cf2d9bd41b63627dd"; // 同上
  //     const url = `https://api.edamam.com/search?q=healthy&app_id=${appId}&app_key=${appKey}`;

  //     // 使用 wx.request 替代 axios
  //     wx.request({
  //       url: url,
  //       method: 'GET',
  //       success: (res) => {
  //         if (res.statusCode === 200) {
  //           const articles = res.data.hits.map((hit: any) => ({
  //             title: hit.recipe.label,
  //             image: hit.recipe.image,
  //             source: hit.recipe.source,
  //             url: hit.recipe.url,
  //           }));

  //           // 更新文章列表数据
  //           this.setData({
  //             fetchedArticles: articles,
  //           });

  //           console.log("Fetched healthy articles:", articles);
  //         } else {
  //           console.error("Error fetching articles. Status code:", res.statusCode);
  //         }
  //       },
  //       fail: (error) => {
  //         console.error("Error fetching articles:", error);
  //       }
  //     });
  //   } catch (error) {
  //     console.error("Unexpected error fetching articles:", error);
  //   }
  // },
  // onArticleClick(e: WechatMiniprogram.CustomEvent) {
  //   const id = e.currentTarget.dataset.id;
  //   wx.navigateTo({
  //     url: `/pages/article-detail/article-detail?id=${id}`,
  //   });
  // },

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
          if (res.statusCode === 200 && res.data.code === 0) {
            // 检查响应状态
            const records = res.data.data;
            const updatedRecords = [...records, this.data.newRecord];

            // 更新页面数据
            this.setData({
              dietRecords: updatedRecords,
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
      "newDietRecord.foodName": value
    });
  },

  onFoodNameFocus() {
    // 当输入框获得焦点时，清空 placeholder
    this.setData({
      foodNamePlaceholder: ""
    });
  },

  onFoodNameBlur() {
    // 当输入框失去焦点时，检查内容是否为空并恢复 placeholder
    if (!this.data.newDietRecord.foodName.trim()) {
      this.setData({
        foodNamePlaceholder: "食物名称"
      });
    }
  },
  onFoodWeightFocus() {
    // 当输入框获得焦点时，清空 placeholder
    this.setData({
      weightPlaceholder: ""
    });
  },

  onFoodWeightBlur() {
    // 当输入框失去焦点时，检查内容是否为空并恢复 placeholder
    if (!this.data.newDietRecord.weight) {
      this.setData({
        weightPlaceholder: "食物重量 (g)"
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
      }).success(() => {
        this.setData({
          selectedMealTypeIndex: 0,
          showAddDietModal: false,
        });
        this.loadTodayDietInfo();
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
              "你是 小胖，由 肥崽战士 提供的人工智能助手。你更擅长中文和英文的对话。你会为用户提供安全，有帮助，准确的回答。你会拒绝一切涉及恐怖主义，种族歧视，黄色暴力等问题的回答。回复结尾加上一个emoji。",
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
            message: string;
            response: string;
            type: "user" | "ai";
            ifFile: boolean;
          }>;
        };

        if (data.success && data.history.length > 0) {
          const formattedMessages = data.history.map((record) => ({
            id: record.id,
            type: record.type,
            content: record.ifFile
              ? `📎 ${record.message || "未知文件"}`
              : record.message,
            isFile: record.ifFile,
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

    this.setData({ loading: true });
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
    } catch (error) {
      console.error("搜索食物失败:", error);
      wx.showToast({
        title: "搜索食物失败",
        icon: "none",
      });
    } finally {
      this.setData({ loading: false });
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
