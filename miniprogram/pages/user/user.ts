import { BASE_URL } from "../../config";

Page({
  data: {
    userInfo: null,
  },

  onLoad() {
    // 获取存储的用户信息
    const user = wx.getStorageSync("user_info");

    if (user) {
      this.setData({
        userInfo: user, // 将用户信息绑定到页面
      });
    }
  },

  // 可以根据需要添加修改个人信息、退出登录等功能
  onEditProfile() {
    wx.navigateTo({
      url: "/pages/editProfile/editProfile",
    });
  },

  // 退出登录
  onLogout() {
    wx.removeStorageSync("token");
    wx.removeStorageSync("user");
    wx.showToast({
      title: "已退出登录",
      icon: "success",
    });

    // 跳转回登录页面
    wx.redirectTo({
      url: "/pages/login/login",
    });
  },
});
