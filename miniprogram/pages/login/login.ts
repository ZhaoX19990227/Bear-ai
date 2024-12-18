import { BASE_URL } from "../../config";

Page({
  data: {
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    userInfo: null,
    StatusBar: 0,
    CustomBar: 0,
    canBack: false,
  },

  onLoad() {
    const app = getApp();
    this.setData({
      StatusBar: app.globalData.StatusBar || 0,
      CustomBar: app.globalData.CustomBar || 0,
      canIUseGetUserProfile: typeof wx.getUserProfile === "function",
    });
    this.checkLoginStatus();
  },

  onGetUserInfo() {
    this.getUserProfile();
  },

  checkLoginStatus() {
    const token = wx.getStorageSync("token");
    const userInfo = wx.getStorageSync("userInfo");

    if (token && userInfo) {
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
      });
    }
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: "用于完善用户资料",
      success: (res) => {
        wx.showLoading({
          title: "登录中...",
          mask: true,
        });

        wx.login({
          success: (loginRes) => {
            wx.request({
              // url: `${BASE_URL}/auth/login`,
              url: `https://6268-49-73-53-154.ngrok-free.app/api/auth/login`,
              method: "POST",
              data: {
                code: loginRes.code,
              },
              success: (response: any) => {
                wx.hideLoading();
                if (response.data.success) {
                  const { openId, sessionKey, unionId } = response.data;

                  wx.setStorageSync("openId", openId);
                  wx.setStorageSync("sessionKey", sessionKey);
                  wx.setStorageSync("unionId", unionId);
                  wx.setStorageSync("userInfo", res.userInfo);

                  this.setData({
                    userInfo: res.userInfo,
                    hasUserInfo: true,
                  });

                  wx.showToast({
                    title: "登录成功",
                    icon: "success",
                  });

                  wx.switchTab({
                    url: "/pages/index/index",
                  });
                } else {
                  wx.showToast({
                    title: "登录失败：" + response.data.message,
                    icon: "none",
                  });
                }
              },
              fail: (err) => {
                wx.hideLoading();
                wx.showToast({
                  title: "网络错误：" + err.errMsg,
                  icon: "none",
                });
              },
            });
          },
        });
      },
      fail: () => {
        wx.showToast({
          title: "授权失败",
          icon: "none",
        });
      },
    });
  },

  getUserInfo(e) {
    const userInfo = e.detail.userInfo;
    if (userInfo) {
      wx.setStorageSync("userInfo", userInfo);
      this.setData({
        userInfo: userInfo,
        hasUserInfo: true,
      });
    }
  },

  contactAuthor() {
    wx.showModal({
      title: "联系作者",
      content: "是否添加作者微信？",
      confirmText: "确定",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: "zhaoxiang_ai",
            success: () => {
              wx.showToast({
                title: "微信号已复制",
                icon: "success",
              });
            },
          });
        }
      },
    });
  },

  openAiAssistant() {
    wx.navigateTo({
      url: "/pages/ai-chat/ai-chat",
    });
  },

  BackPage() {
    wx.navigateBack();
  },
});
