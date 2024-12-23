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
        inputMessage: inputValue
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
      this.setData({
        isLoading: true,
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
            isLoading: false,
          });
        },
        fail: (err) => {
          console.error("发送消息失败", err);
          // 加载失败也要结束加载状态
          this.setData({
            isLoading: false,
          });
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
        success: (res) => {
          const file = res.tempFiles[0];
          // 实现文件上传逻辑
          wx.uploadFile({
            url: `${getApp().globalData.BASE_URL}/chat/upload`,
            filePath: file.path,
            name: "file",
            header: {
              Authorization: `Bearer ${token}`,
            },
            success: (uploadRes) => {
              const data = JSON.parse(uploadRes.data);
              const fileUrl = data.fileUrl;
              const newMessages = [
                ...this.data.messages,
                { type: "user", content: "已上传文件", fileUrl },
              ];
              this.setData({ messages: newMessages });
            },
            fail: (uploadErr) => {
              console.error("文件上传失败", uploadErr);
              wx.showToast({
                title: "文件上传失败",
                icon: "none",
              });
            },
          });
        },
      });
    },
  },
});

