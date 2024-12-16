interface LoginPageData {
  canIUseGetUserProfile: boolean;
  StatusBar: number;
  CustomBar: number;
  canBack: boolean;
}

Page<LoginPageData>({
  data: {
    canIUseGetUserProfile: false,
    StatusBar: 0,
    CustomBar: 0,
    canBack: false
  },

  onLoad() {
    const app = getApp<GlobalData>();
    this.setData({
      StatusBar: app.globalData.StatusBar || 0,
      CustomBar: app.globalData.CustomBar || 0,
      canIUseGetUserProfile: typeof wx.getUserProfile === 'function'
    });
  },

  onGetUserInfo() {
    const app = getApp<GlobalData>();
    
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: async (res) => {
        try {
          wx.showLoading({
            title: '登录中...',
            mask: true
          });

          const loginResult = await app.login();
          
          // 更新用户信息
          wx.setStorageSync('userInfo', res.userInfo);
          app.globalData.userInfo = res.userInfo;

          wx.hideLoading();
          wx.showToast({
            title: '登录成功',
            icon: 'success',
            duration: 1500,
            success: () => {
              setTimeout(() => {
                wx.switchTab({
                  url: '/pages/index/index'
                });
              }, 1500);
            }
          });
        } catch (error) {
          wx.hideLoading();
          wx.showToast({
            title: '登录失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.showToast({
          title: '授权失败',
          icon: 'none'
        });
      }
    });
  },

  BackPage() {
    wx.navigateBack();
  }
}); 