interface FatSecretFood {
  food_id: string;
  food_name: string;
  food_type: string;
  food_description: string;
}

const CLIENT_ID = "0a8456b27d354173bcad7c73404e1038";
const CLIENT_SECRET = "01eb275e0a5845899cdb7a5e51bf6792";

class FatSecretApi {
  private accessToken: string | null = null;
  private tokenExpiresAt: number | null = null; // 用于保存令牌的过期时间戳

  // 获取 OAuth 2.0 访问令牌
  private async getAccessToken(): Promise<string> {
    // 如果有缓存的令牌且未过期，则直接使用
    if (
      this.accessToken &&
      this.tokenExpiresAt &&
      Date.now() < this.tokenExpiresAt
    ) {
      return this.accessToken;
    }

    const url = "https://oauth.fatsecret.com/connect/token";

    try {
      const response =
        await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>(
          (resolve, reject) => {
            wx.request({
              url,
              method: "POST",
              header: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
              data: `grant_type=client_credentials&client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&scope=basic`,
              success: resolve,
              fail: reject,
            });
          }
        );

      if (response.statusCode === 200) {
        const data = response.data as {
          access_token: string;
          token_type: string;
          expires_in: number;
        };

        if (data.access_token && data.token_type === "Bearer") {
          const expiresInMs = data.expires_in * 1000; // 将秒数转换为毫秒
          this.accessToken = data.access_token;
          this.tokenExpiresAt = Date.now() + expiresInMs - 60000; // 提前1分钟刷新

          return this.accessToken;
        } else {
          console.error("响应格式不符合预期:", data);
          throw new Error("Unexpected response format");
        }
      } else {
        console.error(
          "获取访问令牌失败，状态码:",
          response.statusCode,
          "响应内容:",
          response.data
        );
        throw new Error(`Failed to get access token: ${response.statusCode}`);
      }
    } catch (error) {
      console.error("请求令牌时出错:", error);
      throw error;
    }
  }

  // 搜索食物
  public async searchFood(query: string): Promise<FatSecretFood[]> {
    const token = await this.getAccessToken();
    const url = `https://platform.fatsecret.com/rest/server.api?method=foods.search&search_expression=${encodeURIComponent(
      query
    )}&format=json`;

    try {
      // 发起 GET 请求
      const response =
        await new Promise<WechatMiniprogram.RequestSuccessCallbackResult>(
          (resolve, reject) => {
            wx.request({
              url,
              method: "GET",
              header: {
                Authorization: `Bearer ${token}`,
              },
              success: resolve,
              fail: reject,
            });
          }
        );

      // 调试输出完整的响应内容
      console.log("搜索接口响应:", response);

      if (response.statusCode === 200) {
        const data = response.data as { foods?: { food: FatSecretFood[] } };

        // 检查 foods.food 是否存在
        if (data.foods && Array.isArray(data.foods.food)) {
          console.log("搜索结果:", data.foods.food);
          return response.data.foods.food[0];
        } else {
          console.error("返回数据格式不正确:", data);
          throw new Error("Unexpected response format");
        }
      } else if (response.statusCode === 401) {
        console.warn("Token 过期，尝试重新获取...");
        this.accessToken = null; // 清空缓存的令牌
        return await this.searchFood(query); // 重新调用
      } else {
        console.error(
          "搜索失败，状态码:",
          response.statusCode,
          "响应内容:",
          response.data
        );
        throw new Error(`Failed to search food: ${response.statusCode}`);
      }
    } catch (error) {
      console.error("搜索食物时发生错误:", error);
      throw error;
    }
  }
  // 解析食物描述的工具函数
  public parseFoodDescription(description: string) {
    // 提取重量（例如：1080g）
    const weightMatch = description.match(/Per\s([\d.]+g)/);
    const weight = weightMatch ? weightMatch[1] : "100g"; // 默认值是100g

    // 提取热量、脂肪、蛋白质
    const calorieMatch = description.match(/Calories:\s([\d.]+)kcal/);
    const fatMatch = description.match(/Fat:\s([\d.]+)g/);
    const proteinMatch = description.match(/Protein:\s([\d.]+)g/);

    return {
      calories: calorieMatch
        ? `${parseFloat(calorieMatch[1])}/${weight}`
        : `0/${weight}`,
      fat: fatMatch ? `${parseFloat(fatMatch[1])}/${weight}` : `0/${weight}`,
      protein: proteinMatch
        ? `${parseFloat(proteinMatch[1])}/${weight}`
        : `0/${weight}`,
      weight: weight, // 方便调试或其他用途
    };
  }
  public parseWeight(description: string): number {
    // 提取单位（例如：1080g）
    // 正则匹配单位，例如 1080g
    const weightMatch = description.match(/Per\s([\d.]+)g/);
    return weightMatch ? Number(weightMatch[1]) : 100; // 默认为100g
  }

  // 提取食物描述中的数值
  public extractValue(description: string, key: string): string {
    // 提取对应的数值
    const regex = new RegExp(`${key}:\\s*([\\d.]+)`);
    const match = description.match(regex);
    return match ? match[1] : "";
  }
}

export default new FatSecretApi();
