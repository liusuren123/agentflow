/* ================================================================
 *  root.ts — workbench 项目根锚定（BK-0040 / 迭代 0036 · ADR-0016 §3.0）
 *  模块级常量，模块加载即冻结（tools.ts SANDBOX 同构），与启动形态无关
 *  （ADR-0016 §3.0 本机实测已否决 process.cwd() 案）；零 env——本链不新增
 *  任何环境变量语义（无 WORKBENCH_ROOT 类覆盖项，反转即中止转 needs-approval）。
 * ================================================================ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* 编译产物 apps/server/dist/workbench/root.js → 上溯四级 = 仓库根
   （workbench → dist → apps/server → apps → 仓库根）。
   根因注记（迭代 0054 / BK-0041 修）：原三级上溯锚到 apps/ 而非仓库根——
   「dist 上溯两级」系 tools.ts 位于 dist 根的口径，workbench 模块再深一级，
   须上溯 4 级；该差级曾长期被 git 向上搜 .git 掩盖（apps/ 仍在仓库内，
   status/log 输出与 cwd 无关），至 E2 pathspec 前缀过滤（相对 cwd 解析）才暴露。
   git 子进程 cwd 显式取该常量（ADR-0016 §3.4）。 */
export const PROJECT_ROOT =
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
