import { BASE_URL } from "../config";

export default Behavior({
  data: {
    showAIChat: false,
    messages: [],
    inputMessage: "",
    userInfo: null,
  },
  methods: {
    // AI 聊天相关通用方法
    onAIChatClick() {
      console.log("onAIChatClick");
      const token = wx.getStorageSync("token");
      const userInfo = wx.getStorageSync("userInfo");

      if (!token || !userInfo) {
        // 未登录，跳转到登录页面
        wx.navigateTo({
          url: "/pages/user/user",
          fail: (err) => {
            console.error("Navigation error:", err);
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
    onInputChange(e) {
      const inputValue = e.detail.value;
      this.setData({
        inputMessage: inputValue,
      });
    },

    hideAIChat() {
      this.setData({ showAIChat: false });
    },

    fetchChatHistory() {
      const token = wx.getStorageSync("token");

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
              id: string;
              message: string;
              response: string;
              isFile: boolean;
              createdAt: string;
            }>;
          };

          if (data.success) {
            // 将每条历史记录转换为用户消息和AI消息
            const processedMessages = data.history.flatMap((record) => [
              {
                type: "user",
                content: record.message,
                createdAt: record.createdAt,
              },
              {
                type: "ai",
                content: record.response,
                createdAt: record.createdAt,
              },
            ]);

            this.setData({
              messages: processedMessages,
            });
          }
        },
        fail: (err) => {
          console.error("获取聊天历史失败", err);
          wx.showToast({
            title: "加载聊天记录失败",
            icon: "none",
          });
        },
      });
    },

    sendMessage() {
      const { inputMessage } = this.data;
      const token = wx.getStorageSync("token");

      if (!inputMessage.trim()) return;

      // 开始加载
      wx.showLoading({
        title: "小肉熊AI思考中...",
      });

      wx.request({
        url: `${BASE_URL}/chat/chat`,
        method: "POST",
        header: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        data: { message: inputMessage },
        success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
          const data = res.data as {
            response: string;
          };

          const newMessages = [
            ...this.data.messages,
            { type: "user", content: inputMessage },
            { type: "ai", content: data.response },
          ];
          this.setData({
            messages: newMessages,
            inputMessage: "",
          });
          wx.hideLoading();
        },
        fail: (err) => {
          console.error("发送消息失败", err);
          wx.hideLoading();
          wx.showToast({
            title: "发送消息失败",
            icon: "none",
          });
        },
      });
    },

    chooseFile() {
      const token = wx.getStorageSync("token");

      wx.chooseMessageFile({
        count: 1,
        type: "file",
        extension: ["txt", "pdf", "doc", "docx", "md"],
        success: (res) => {
          const file = res.tempFiles[0];

          // 先保存用户的文件名
          const userMessage = {
            type: "user",
            content: file.name,
            isFile: true,
          };
          this.setData({
            messages: [...this.data.messages, userMessage],
          });

          // 使用 Promise 确保顺序执行
          this.createFileRecord(token, file.name)
            .then((recordId) => {
              wx.showLoading({
                title: "文件处理中...",
              }),
              // 上传文件
              wx.uploadFile({
                url: `${BASE_URL}/chat/upload`,
                filePath: file.path,
                name: "file",
                formData: {
                  recordId: recordId,
                  fileName: file.name,
                },
                method: "POST",
                header: {
                  Authorization: `Bearer ${token}`,
                },
                success: (uploadRes) => {
                  // 处理上传成功逻辑
                  console.log("uploadRes", uploadRes);
                  wx.hideLoading();
                  const newMessages = [
                    ...this.data.messages,
                    { type: "ai", content: uploadRes.data.response },
                  ];
                  this.setData({
                    messages: newMessages,
                  });
                },
              });
            })
            .catch((error) => {
              console.error("创建文件记录失败", error);
              wx.hideLoading();
            });
        },
      });
    },

    // 新增方法，返回 Promise
    createFileRecord(token, fileName) {
      return new Promise((resolve, reject) => {
        wx.request({
          url: `${BASE_URL}/chat/chatForFile`,
          method: "POST",
          header: {
            Authorization: `Bearer ${token}`,
          },
          data: { message: fileName },
          success: (res) => {
            console.log("res", res);
            resolve(res.data.recordId);
          },
          fail: (error) => {
            reject(error);
          },
        });
      });
    },
  },
});
