// index.ts
import { IMyApp } from '../../app';

Page({
  data: {
    motto: '探索 AI 的无限可能',
    userInfo: {},
    hasUserInfo: false,
    canIUseNicknameComp: wx.canIUse('button.open-type.chooseAvatar'),
    canIUseGetUserProfile: wx.canIUse('getUserProfile'),
    showModal: true
  },

  onLoad() {
    const app = getApp<IMyApp>();
    if (app.globalData.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo,
        hasUserInfo: true
      });
    }
  },

  onShow() {
    // 每次页面显示时都显示欢迎模态框
    this.setData({ showModal: true });
  },

  getUserProfile() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (res) => {
        const app = getApp<IMyApp>();
        app.globalData.userInfo = res.userInfo;
        this.setData({
          userInfo: res.userInfo,
          hasUserInfo: true
        });
      }
    });
  },

  onChooseAvatar(e: WechatMiniprogram.ChooseAvatarEvent) {
    const { avatarUrl } = e.detail;
    this.setData({
      'userInfo.avatarUrl': avatarUrl
    });
  },

  onInputChange(e: WechatMiniprogram.InputEvent) {
    const nickName = e.detail.value;
    this.setData({
      'userInfo.nickName': nickName
    });
  },

  hideModal() {
    this.setData({ showModal: false });
  },

  onFeatureClick() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  onSettingsClick() {
    wx.showToast({
      title: '设置功能开发中',
      icon: 'none'
    });
  }
});
