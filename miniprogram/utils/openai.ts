interface OpenAIConfig {
  apiKey: string;
  baseURL: string;
}

interface Message {
  role: "user" | "system" | "assistant";
  content: string;
}

interface ChatCompletionResponse {
  choices: Array<{
    message: {
      role: "assistant";
      content: string;
    };
  }>;
  [key: string]: any; // 允许包含其他响应字段
}

export class OpenAI {
  private apiKey: string;
  private baseURL: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
  }

  async chatCompletion(messages: Message[]): Promise<ChatCompletionResponse> {
    return new Promise((resolve, reject) => {
      wx.request({
        url: `${this.baseURL}/chat/completions`,
        method: "POST",
        header: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        data: {
          model: "moonshot-v1-32k",
          messages: messages,
          temperature: 0.5,
        },
        success(res) {
          if (res.statusCode === 200) {
            resolve(res.data as ChatCompletionResponse);
          } else {
            reject(new Error(`API Error: ${res.statusCode}, ${res.data}`));
          }
        },
        fail(err) {
          reject(err);
        },
      });
    });
  }
}
