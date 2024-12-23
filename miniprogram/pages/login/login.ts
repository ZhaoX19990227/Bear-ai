import { BASE_URL } from "../../config";

Page({
  data: {
    userInfo: {
      avatarUrl: "",
      nickname: "",
    },
    backgroundColors: [
      "#FFF8DC", // 奶油色
      "#F5DEB3", // 小麦色
      "#DEB887", // 柔和的棕色
    ],
  },

  onLoad() {
    // 从本地存储获取用户信息
    const userInfo = wx.getStorageSync("userInfo");
    if (userInfo) {
      this.setData({ userInfo });
    } else {
      this.fetchUserProfile();
    }
  },

  fetchUserProfile() {
    wx.request({
      url: `${BASE_URL}/user/profile`,
      method: "GET",
      header: {
        Authorization: `Bearer ${wx.getStorageSync("token")}`,
      },
      success: (res) => {
        if (res.data.userInfo) {
          this.setData({
            userInfo: res.data.userInfo,
          });
          wx.setStorageSync("userInfo", res.data.userInfo);
        }
      },
      fail: (err) => {
        wx.showToast({
          title: "获取用户信息失败",
          icon: "none",
        });
      },
    });
  },

  contactAuthor() {
    wx.showModal({
      title: "联系肥崽先生 🐻‍❄️",
      content: "是否添加作者微信？",
      confirmText: "确定",
      cancelText: "取消",
      success: (res) => {
        if (res.confirm) {
          wx.setClipboardData({
            data: "ZhaoX19990227",
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

  logout() {
    wx.showModal({
      title: "退出登录",
      content: "确定要退出登录吗？",
      success: (res) => {
        if (res.confirm) {
          // 清除本地存储
          wx.removeStorageSync("token");
          wx.removeStorageSync("userInfo");

          // 跳转到登录页
          wx.navigateTo({
            url: "/pages/user/user",
          });
        }
      },
    });
  },
});
