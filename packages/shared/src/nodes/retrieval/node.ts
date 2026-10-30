/* retrieval — 知识库检索（NDP 纯数据模块）
 * 数据为 nodes.ts 2026-10 定稿 DEFS 的机械转写（迭代 0021 / BK-0021 批次 1）。
 * capabilities.data = 本地 TF-IDF 检索，无出站网络。 */
import type { NodeDefJson } from '../../nodes.schema.js';

export default {
  protocol: 1,
  type: 'retrieval',
  identity: { name: '知识库检索', category: 'knowledge', icon: 'book-open',
    keywords: 'rag knowledge retrieve 检索 知识库 向量',
    description: '从知识库中检索相关片段（RAG）。' },
  ports: {
    inputs:  [{ id: 'in-query', label: '查询', type: 'text' }],
    outputs: [{ id: 'out-hits', label: '片段', type: 'list' }],
  },
  params: [
    { id: 'kb', label: '知识库', widget: 'combo',
      options: [
        { value: '产品手册 v2.3', label: '产品手册 v2.3' },
        { value: 'FAQ-售前', label: 'FAQ-售前' },
        { value: '工单历史 2026', label: '工单历史 2026' },
      ], default: '产品手册 v2.3' },
    { id: 'topk', label: 'Top K', widget: 'number', default: 3, min: 1, max: 20, step: 1 },
    { id: 'th', label: '相似度阈值', widget: 'number', default: 0.5, min: 0, max: 1, step: 0.05 },
    { id: 'onError', label: '失败策略', widget: 'combo',
      options: [
        { value: '跟随全局', label: '跟随全局' },
        { value: '跳过',     label: '跳过' },
        { value: '重试',     label: '重试' },
        { value: '中止',     label: '中止' },
      ], default: '跟随全局' },
    { id: 'onErrorRetries', label: '重试次数', widget: 'number', default: 2, min: 0, max: 5, step: 1 },
  ],
  binding: { handler: 'retrieval', capabilities: { data: true } },
} satisfies NodeDefJson;
