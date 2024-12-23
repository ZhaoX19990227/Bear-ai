import { BASE_URL } from "../../config";
import WXBizDataCrypt from "../../utils/WXBizDataCrypt";

Page({
  data: {
    userInfo: {
      avatarUrl: "",
      nickname: "",
    },
    hasUserInfo: false,
    canIUseGetUserProfile: false,
    StatusBar: 0,
    CustomBar: 0,
    canBack: false,
    code: "",
    sessionKey: "",
    showPopup: false,
    inputNickname: "",
    avatarReady: false,
    nicknameReady: false,
  },

  onLoad() {
    wx.login({
      success: (res) => {
        if (res.code) {
          this.setData({
            code: res.code,
          });
          this.getSessionKey(res.code);
        } else {
          console.error("登录失败！" + res.errMsg);
        }
      },
    });

    if (wx.getUserProfile) {
      this.setData({
        canIUseGetUserProfile: true,
      });
    } else {
      console.log("当前版本不支持 getUserProfile");
    }
  },

  // 获取 sessionKey 的方法
  getSessionKey(code: string) {
    wx.request({
      url: `${BASE_URL}/auth/login`,
      method: "POST",
      data: { code: code },
      success: (res: any) => {
        if (res.data.sessionKey) {
          this.setData({
            sessionKey: res.data.sessionKey,
            token: res.data.token,
            userInfo: res.data.user,
          });
          console.log("获取 sessionKey 成功");
          wx.setStorageSync("token", res.data.token);
          wx.setStorageSync("userInfo", res.data.user);
        } else {
          console.error("获取 sessionKey 失败");
        }
      },
      fail: (err) => {
        console.error("请求 sessionKey 失败", err);
      },
    });
  },

  onChooseAvatar(e) {
    const { avatarUrl } = e.detail;
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        avatarUrl,
      },
      avatarReady: true,
      showPopup: true,
    });
  },

  onBlur(e) {
    const inputNickname = e.detail.value.trim();
    this.setData({
      userInfo: {
        ...this.data.userInfo,
        nickname: inputNickname,
      },
    });
  },

  closePopup() {
    this.setData({
      showPopup: false,
    });
  },

  confirmUserInfo() {
    if (!this.data.userInfo.nickname) {
      wx.showToast({
        title: "请输入昵称",
        icon: "none",
      });
      return;
    }

    const updatedUserInfo = {
      ...this.data.userInfo,
      nickname: this.data.userInfo.nickname,
    };

    this.setData({
      userInfo: updatedUserInfo,
      nicknameReady: true,
      showPopup: false,
    });

    // 检查头像和昵称是否都已准备好
    this.checkUserInfoComplete();
  },

  checkUserInfoComplete() {
    const { avatarReady, nicknameReady, userInfo } = this.data;

    if (avatarReady && nicknameReady) {
      // 更新用户信息到后端
      wx.request({
        url: `${BASE_URL}/user/update`,
        method: "POST",
        header: {
          "content-type": "application/json",
          Authorization: `Bearer ${wx.getStorageSync("token")}`,
        },
        data: {
          avatarUrl: userInfo.avatarUrl,
          nickname: userInfo.nickname,
        },
        success: (res) => {
          // 更新本地存储
          wx.setStorageSync("userInfo", userInfo);

          wx.showToast({
            title: "登录成功",
            icon: "success",
            success: () => {
              wx.switchTab({
                url: "/pages/index/index",
              });
            },
          });
        },
        fail: (err) => {
          console.error("更新用户信息失败", err);
          wx.showToast({
            title: "更新失败，请重试",
            icon: "none",
          });
        },
      });
    }
  },

  // 解密用户信息
  decryptUserInfo(encryptedData: string, iv: string) {
    // 检查参数是否存在
    if (!this.data.sessionKey || !encryptedData || !iv) {
      wx.showToast({
        title: "解密参数缺失",
        icon: "none",
      });
      return;
    }

    // 直接使用微信提供的解密方法
    wx.checkSession({
      success: () => {
        // session_key 未过期，可以直接解密
        wx.request({
          url: `${BASE_URL}/auth/decrypt`, // 后端解密接口
          method: "POST",
          header: {
            "content-type": "application/json", // 明确指定 JSON 类型
          },
          data: JSON.stringify({
            encryptedData: encryptedData,
            iv: iv,
            sessionKey: this.data.sessionKey,
          }),
          success: (res: any) => {
            console.log("解密响应:", res); // 添加日志
            if (res.data && res.data.userInfo) {
              this.setData({
                userInfo: res.data.userInfo,
                hasUserInfo: true,
              });
            } else {
              wx.showToast({
                title: "解密失败，请重试",
                icon: "none",
              });
            }
          },
          fail: (err) => {
            console.error("解密请求失败:", err);
            wx.showToast({
              title: "解密失败，请重试",
              icon: "none",
            });
          },
        });
      },
      fail: () => {
        // session_key 已过期，需要重新登录
        wx.login({
          success: (res) => {
            if (res.code) {
              this.getSessionKey(res.code);
            }
          },
        });
      },
    });
  },
  // 获取用户信息，使用 wx.getUserProfile
  getUserProfile(e) {
    // 调用微信接口获取用户信息
    wx.getUserProfile({
      desc: "用于完善会员资料", // 授权的用途
      success: (res) => {
        console.log("获取用户信息成功:", res);

        const { encryptedData, iv } = res; // 解密需要的加密数据和 IV
        if (!encryptedData || !iv) {
          wx.showToast({
            title: "未获取到加密信息",
            icon: "none",
          });
          return;
        }
        // 调用解密方法
        this.decryptUserInfo(encryptedData, iv);
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
