// app.ts
interface GlobalData {
  userInfo?: WechatMiniprogram.UserInfo;
  token?: string;
}

App<GlobalData>({
  globalData: {
    userInfo: undefined,
    token: undefined
  },

  onLaunch() {
    // 检查本地是否有登录态
    const token = wx.getStorageSync('token');
    if (token) {
      this.globalData.token = token;
    }
  },

  // 封装登录方法
  async login() {
    return new Promise((resolve, reject) => {
      wx.login({
        success: (res) => {
          if (res.code) {
            wx.request({
              url: 'http://localhost:3000/api/v1/auth/login',
              method: 'POST',
              data: { code: res.code },
              success: (response: any) => {
                if (response.data.token) {
                  this.globalData.token = response.data.token;
                  this.globalData.userInfo = response.data.user;
                  wx.setStorageSync('token', response.data.token);
                  wx.setStorageSync('userInfo', response.data.user);
                  resolve(response.data);
                } else {
                  reject(response.data);
                }
              },
              fail: (error) => {
                reject(error);
              }
            });
          } else {
            reject(res);
          }
        },
        fail: (error) => {
          reject(error);
        }
      });
    });
  }
});