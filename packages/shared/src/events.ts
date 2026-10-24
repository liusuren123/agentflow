/* ================================================================
 *  events.ts — SSE 执行事件契约（前后端单一事实源）
 *  后端 emit 的 15 种事件与前端 onEvent 的 case 一一对应；
 *  本 schema 用于测试与联调校验，运行时不强制（性能考虑）。
 * ================================================================ */
import { z } from 'zod';

export const RunEventSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('run:accepted'), runId: z.string() }),
  z.object({ type: z.literal('run:start'), name: z.string(), total: z.number() }),
  z.object({ type: z.literal('run:progress'), done: z.number(), total: z.number(), elapsed: z.number() }),
  z.object({ type: z.literal('node:start'), id: z.number(), title: z.string(), defName: z.string().optional(), iteration: z.number().nullable() }),
  z.object({ type: z.literal('node:bypass'), id: z.number(), title: z.string() }),
  z.object({ type: z.literal('node:delta'), id: z.number(), text: z.string() }),
  z.object({
    type: z.literal('node:done'),
    id: z.number(), title: z.string(), out: z.string().nullable(),
    ms: z.number().optional(), tokens: z.number().optional(),
    firePort: z.number().nullable(), iteration: z.number().nullable(),
    inputs: z.array(z.object({ tp: z.number(), from: z.string(), fromFp: z.number(), val: z.string() })).optional(),
  }),
  z.object({ type: z.literal('node:error'), id: z.number(), title: z.string(), message: z.string() }),
  z.object({ type: z.literal('cond'), id: z.number(), title: z.string(), expr: z.string().optional(), branch: z.string() }),
  z.object({ type: z.literal('log'), msg: z.string(), lvl: z.enum(['info', 'sys', 'ok', 'warn']).optional() }),
  z.object({ type: z.literal('output'), text: z.string() }),
  z.object({ type: z.literal('approval:required'), runId: z.string(), nodeId: z.number(), title: z.string(), role: z.string(), inputPreview: z.string() }),
  z.object({ type: z.literal('approval:done'), nodeId: z.number(), approve: z.boolean() }),
  z.object({ type: z.literal('run:error'), message: z.string() }),
  z.object({
    type: z.literal('run:done'),
    ms: z.number(), done: z.number(), total: z.number(),
    /* ok = 本次运行未被中止（≠全部节点成功）；消费端 apps/web/src/server-sync.js:105-107 按「ok !== false && !ev.stopped」定级渲染 */
    ok: z.boolean(), stopped: z.boolean().optional(),
    outputs: z.array(z.string()).optional(),
    vars: z.record(z.string()).optional(),
  }),
]);

export type RunEvent = z.infer<typeof RunEventSchema>;

export function validateEvent(ev: unknown): RunEvent {
  return RunEventSchema.parse(ev);
}
