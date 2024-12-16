// app.ts
export interface IMyApp {
  globalData: {
    userInfo?: WechatMiniprogram.UserInfo;
    StatusBar?: number;
    CustomBar?: number;
  };
  login?: () => Promise<any>;
}

App<IMyApp>({
  globalData: {
    userInfo: undefined,
    StatusBar: 0,
    CustomBar: 0
  },

  onLaunch() {
    // 获取系统信息
    wx.getSystemInfo({
      success: e => {
        this.globalData.StatusBar = e.statusBarHeight;
        const custom = wx.getMenuButtonBoundingClientRect();
        this.globalData.CustomBar = custom.bottom + custom.top - e.statusBarHeight;
      }
    });

    // 尝试从本地存储恢复用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
  },

  // 登录方法（可以在未来扩展）
  login() {
    return new Promise((resolve, reject) => {
      // 模拟登录逻辑
      resolve({});
    });
  }
});