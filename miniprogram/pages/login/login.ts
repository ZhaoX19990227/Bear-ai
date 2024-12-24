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
    showUserInfoModal: false,
    userInfoForm: {
      age: null,
      height: null,
      weight: null,
      gender: '',
      email: '',
    },
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
  openUserInfoModal() {
    this.setData({ showUserInfoModal: true });
  },
  closeUserInfoModal() {
    this.setData({ showUserInfoModal: false });
  },
  selectGender(e) {
    const gender = e.currentTarget.dataset.gender;
    this.setData({
      'userInfoForm.gender': gender
    });
  },
  onUserInfoInput(e) {
    const { field } = e.currentTarget.dataset;
    const value = e.detail.value;
    this.setData({
      [`userInfoForm.${field}`]: value
    });
  },
  preventTap() {
    return true;
  },
  submitUserInfo() {
    const { age, height, weight, gender, email } = this.data.userInfoForm;
    
    // 简单验证
    if (!age || !height || !weight || !gender || !email) {
      wx.showToast({
        title: '请填写所有信息',
        icon: 'none'
      });
      return;
    }

    // 邮箱验证
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      wx.showToast({
        title: '请输入正确的邮箱',
        icon: 'none'
      });
      return;
    }
    const token = wx.getStorageSync('token');
    wx.request({
      url: `${BASE_URL}/user/complete-info`,
      method: 'POST',
      header: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      data: this.data.userInfoForm,
      success: (res) => {
        if (res.statusCode === 200) {
          wx.showToast({
            title: '信息完善成功',
            icon: 'success'
          });
          this.setData({
            showUserInfoModal: false
          });
          // 可以更新本地用户信息
          wx.setStorageSync('userInfo', {
            ...wx.getStorageSync('userInfo'),
            ...this.data.userInfoForm
          });
        } else {
          wx.showToast({
            title: '信息完善失败',
            icon: 'none'
          });
        }
      },
      ail: (err) => {
        console.error('信息完善失败', err);
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      }
    });
  },
  closeUserInfoModal() {
    this.setData({
      showUserInfoModal: false
    });
  },

});
