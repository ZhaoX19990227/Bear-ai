// 配置minio.js
import { Client } from 'minio';

export const minioClient = new Client({
  endPoint: '120.46.13.61', // MinIO 服务器地址
  port: 9000, // MinIO 端口
  useSSL: false, // 如果使用 HTTPS，请设置为 true
  accessKey: 'Fo567ox7gNkIq0ToUByf', // MinIO 访问密钥
  secretKey: 'mmDy4qfsSMe4e2sHRODwiVnAtRfh9LmE7X7EKv4B' // MinIO 秘密密钥
});