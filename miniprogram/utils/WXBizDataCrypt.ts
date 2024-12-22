class WXBizDataCrypt {
  appId: string;
  sessionKey: string;

  constructor(appId: string, sessionKey: string) {
    this.appId = appId;
    this.sessionKey = sessionKey;
  }

  decryptData(encryptedData: string, iv: string) {
    try {
      // 使用微信小程序的解密方法
      const result = wx.decryptData({
        encryptedData,
        iv,
        sessionKey: this.sessionKey
      });

      // 校验 appId
      if (result.watermark && result.watermark.appid !== this.appId) {
        throw new Error('Illegal Buffer');
      }

      return result;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Decryption failed');
    }
  }
}

export default WXBizDataCrypt;