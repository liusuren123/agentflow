/* ================================================================
 *  types.ts — 引擎执行形状（ADR-0004 显式收口）
 *  NodeResult 与 engine 原实现逐一对应：value 沿边传播、ports 多路分发、
 *  out 为 node:done 摘要、ms/tokens 为耗时与 LLM usage、firePort 为
 *  条件分支命中端口（0 真 / 1 假；null = 全部出边激活）。
 * ================================================================ */
import type { Logger } from 'pino';

export interface NodeResult {
  value: unknown;
  ports?: unknown[];
  out: string;
  ms?: number;
  tokens?: number;
  firePort?: number | null;
}

/* 画布节点 / 边（与 POST /api/run body 同构；宽松形状，未知字段透传） */
export interface WFNode {
  id: number;
  type: string;
  x?: number;
  y?: number;
  title?: string;
  params?: Record<string, unknown>;
  mcp?: Record<string, string[]>;
  skills?: string[];
  bypass?: boolean;
  [k: string]: unknown;
}
export interface WFEdge { id: number; fn: number; fp: number; tn: number; tp: number }

/* SSE 事件出口（server.ts 组装 data: {...}\n\n 的唯一入口） */
export type EmitFn = (type: string, payload: Record<string, unknown>) => void;

export interface RunProgress { done: number; total: number; t0: number }
export interface ApprovalDecision { ok: boolean; comment: string }
export type ApprovalWaiters = Map<number, (d: ApprovalDecision) => void>;

/* 执行作用域：主流程一份；循环迭代各一份（结果/已执行/已激活边） */
export interface Scope {
  results: Map<number, NodeResult>;
  executed: Set<number>;
  firedEdges: Set<number>;
}

/* 运行上下文：POST /api/run 创建，贯穿整个执行链 */
export interface RunCtx {
  runId: string;
  wf: { name: string; nodes: WFNode[]; edges: WFEdge[] };
  inputs: Record<string, unknown>;
  ac: AbortController;
  emit: EmitFn;
  log: Logger;                 /* pino child（已含 runId） */
  outputs?: string[];
  progress?: RunProgress;
  resolveApproval?: (nodeId: number, ok: boolean, comment: string) => boolean;
  _topo?: number[];
}

/* 节点处理器入参（runNode 组装后分发） */
export interface HandlerArgs {
  n: WFNode;
  p: Record<string, any>;      /* 参数 = shared 默认值 ∪ 节点覆盖（动态形状） */
  def: { name?: string };
  input: unknown;
  inVals: unknown[];
  vars: Record<string, any>;
  scope: Scope;
  emit: EmitFn;
  iteration: number | null;
  approvalWaiters: ApprovalWaiters;
  byId: Map<number, WFNode>;
  edges: WFEdge[];
  outEs: (id: number) => WFEdge[];
  inEs: (id: number) => WFEdge[];
  ctx: RunCtx;
  sub: (cid: number, s2: Scope, v2: Record<string, any>, idx: number | null) => Promise<void>;
}

export type NodeHandler = (ctx: RunCtx, args: HandlerArgs) => Promise<NodeResult>;
