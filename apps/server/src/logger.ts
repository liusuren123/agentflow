/* ================================================================
 *  logger.ts — pino 结构化日志（ADR-0004）
 *  · 生产输出 JSON 单行；开发态可用 LOG_LEVEL=debug 放量
 *  · redact：Authorization / apiKey / api_key（任意层级），
 *    以及 req.headers.authorization —— 密钥绝不进日志
 *  · run 级日志一律用 logger.child({ runId }) 贯穿（见 server.ts）
 * ================================================================ */
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: {
    paths: [
      'Authorization', 'authorization', 'apiKey', 'api_key',
      '*.Authorization', '*.authorization', '*.apiKey', '*.api_key',
      'req.headers.authorization', 'req.headers.Authorization',
    ],
    censor: '[REDACTED]',
  },
});
