/* ================================================================
 *  types.ts — 节点注册表类型定义（单一事实源的一部分）
 *  与前端 DEFS / 后端 engine 的数据形状一一对应，修改需走 ADR。
 * ================================================================ */

/** 端口类型（决定连线颜色与兼容性） */
export type PortType = 'any' | 'text' | 'list' | 'object' | 'number';

export interface PortDef {
  /** 端口名（画布显示） */
  n: string;
  /** 端口类型 */
  t: PortType;
}

export type ParamDef =
  | { k: string; l: string; t: 'combo'; o: string[]; d: string; if?: (p: Record<string, unknown>) => boolean; kw?: string }
  | { k: string; l: string; t: 'text'; d: string; if?: (p: Record<string, unknown>) => boolean; kw?: string }
  | { k: string; l: string; t: 'textarea'; d: string; if?: (p: Record<string, unknown>) => boolean; kw?: string }
  | { k: string; l: string; t: 'number'; d: number; min?: number; max?: number; step?: number; if?: (p: Record<string, unknown>) => boolean; kw?: string }
  | { k: string; l: string; t: 'toggle'; d: boolean; if?: (p: Record<string, unknown>) => boolean; kw?: string };

export type NodeCategory = 'input' | 'chat' | 'knowledge' | 'tools' | 'logic' | 'output' | 'human';

export interface NodeDef {
  /** 节点类型名（显示） */
  name: string;
  cat: NodeCategory;
  icon: string;
  desc: string;
  inputs: PortDef[];
  outputs: PortDef[];
  params: ParamDef[];
  /** 搜索关键词 */
  kw?: string;
  /** 能力声明：节点属性面板显示 MCP/技能配置 */
  caps?: ('mcp' | 'skill')[];
}

/** 画布上的节点实例 */
export interface WorkflowNode {
  id: number;
  type: string;
  x: number;
  y: number;
  title?: string;
  params?: Record<string, unknown>;
  mcp?: Record<string, string[]>;
  skills?: string[];
  bypass?: boolean;
}

export interface WorkflowEdge {
  id: number;
  fn: number;
  fp: number;
  tn: number;
  tp: number;
}

export interface Workflow {
  name: string;
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}

/** 运行时节点结果（后端 node:done 携带的输入预览等） */
export interface NodeInputPreview {
  tp: number;
  from: string;
  fromFp: number;
  val: string;
}
