module.exports = Behavior({
    data: {
      showAIChat: false,
      messages: [],
      inputMessage: '',
      userInfo: null
    },
    methods: {
      // AI 聊天相关通用方法
      onAIChatClick() {
        console.log('onAIChatClick triggered');
        // 检查登录状态
        const token = wx.getStorageSync('token');
        const userInfo = wx.getStorageSync('userInfo');
  
        console.log('Token:', token);
        console.log('UserInfo:', userInfo);
  
        if (!token || !userInfo) {
          console.log('未登录');
          // 未登录，跳转到登录页面
          wx.navigateTo({
            url: '/pages/login/login',
            fail: (err) => {
              console.error('Navigation error:', err);
            }
          });
          return;
        }
  
        // 已登录，加载聊天历史
        this.fetchChatHistory();
        this.setData({ 
          showAIChat: true,
          userInfo: userInfo
        });
      },
  
      hideAIChat() {
        this.setData({ showAIChat: false });
      },
  
      fetchChatHistory() {
        const token = wx.getStorageSync('token');
        
        wx.request({
          url: `${getApp().globalData.BASE_URL}/chat/history`,
          method: 'GET',
          header: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
            const data = res.data as {
              success: boolean, 
              history: Array<{
                type: 'user' | 'ai', 
                content: string,
                fileUrl?: string
              }>
            };
  
            if (data.success) {
              this.setData({ 
                messages: data.history || []
              });
            }
          },
          fail: (err) => {
            console.error('获取聊天历史失败', err);
            wx.showToast({
              title: '加载聊天记录失败',
              icon: 'none'
            });
          }
        });
      },
  
      onInputChange(e) {
        this.setData({ inputMessage: e.detail.value });
      },
  
      sendMessage() {
        const { inputMessage } = this.data;
        const token = wx.getStorageSync('token');
  
        if (!inputMessage.trim()) return;
  
        wx.request({
          url: `${getApp().globalData.BASE_URL}/chat/chat`,
          method: 'POST',
          header: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          data: { message: inputMessage },
          success: (res: WechatMiniprogram.RequestSuccessCallbackResult) => {
            const data = res.data as {
              response: string
            };
  
            const newMessages = [
              ...this.data.messages,
              { type: 'user', content: inputMessage },
              { type: 'ai', content: data.response }
            ];
            this.setData({ 
              messages: newMessages, 
              inputMessage: '' 
            });
          },
          fail: (err) => {
            console.error('发送消息失败', err);
            wx.showToast({
              title: '发送消息失败',
              icon: 'none'
            });
          }
        });
      },
  
      chooseFile() {
        const token = wx.getStorageSync('token');
  
        wx.chooseMessageFile({
          count: 1,
          type: 'file',
          success: (res) => {
            const file = res.tempFiles[0];
            // 实现文件上传逻辑
            wx.uploadFile({
              url: `${getApp().globalData.BASE_URL}/chat/upload`,
              filePath: file.path,
              name: 'file',
              header: {
                Authorization: `Bearer ${token}`
              },
              success: (uploadRes) => {
                const data = JSON.parse(uploadRes.data);
                const fileUrl = data.fileUrl;
                const newMessages = [
                  ...this.data.messages,
                  { type: 'user', content: '已上传文件', fileUrl }
                ];
                this.setData({ messages: newMessages });
              },
              fail: (uploadErr) => {
                console.error('文件上传失败', uploadErr);
                wx.showToast({
                  title: '文件上传失败',
                  icon: 'none'
                });
              }
            });
          }
        });
      }
    }
  }); 