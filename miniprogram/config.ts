// 环境配置
const env = 'development'; // 可以根据实际环境动态设置

const config = {
  development: {
    baseUrl: 'http://localhost:3000/api', // 开发环境地址
  },
  production: {
    baseUrl: 'https://120.46.13.61/api', // 生产环境地址
  }
};

export const BASE_URL = config[env].baseUrl; 