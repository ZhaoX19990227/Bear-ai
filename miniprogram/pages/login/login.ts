import { BASE_URL } from "../../config";

Page({
  data: {
    userInfo: {},
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    StatusBar: 0,
    CustomBar: 0,
    canBack: false,
    code: "",
  },

  onLoad() {
    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    } else {
      console.log("当前版本不支持 getUserProfile");
    }
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail 
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        avatarUrl,
      },
    })
  },
  // 获取用户信息，使用 wx.getUserProfile
  getUserProfile(e) {
    // 调用微信接口获取用户信息
    wx.getUserProfile({
      desc: "用于完善会员资料", // 授权的用途
      success: (res) => {
        console.log("获取用户信息成功:", res);
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true,
        });
      },
      fail: (err) => {
        console.log("获取用户信息失败:", err);
        wx.showToast({
          title: "授权失败，请重试",
          icon: "none",
        });
      },
    });
  },

  // 获取用户信息回调
  getUserInfo(e) {
    const userInfo = e.detail.userInfo;
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
      });
    }
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
  BackPage() {
    wx.navigateBack();
  },
});
