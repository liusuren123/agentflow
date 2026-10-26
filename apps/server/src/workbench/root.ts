/* ================================================================
 *  root.ts — workbench 项目根锚定（BK-0040 / 迭代 0036 · ADR-0016 §3.0）
 *  模块级常量，模块加载即冻结（tools.ts SANDBOX 同构），与启动形态无关
 *  （ADR-0016 §3.0 本机实测已否决 process.cwd() 案）；零 env——本链不新增
 *  任何环境变量语义（无 WORKBENCH_ROOT 类覆盖项，反转即中止转 needs-approval）。
 * ================================================================ */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/* 编译产物 apps/server/dist/workbench/root.js → 上溯三级 = 仓库根
   （dist/workbench → dist → apps/server → 仓库根；server.ts:44 为 dist 平铺
   两级，本模块深一层故三级——off-by-one 即锚错为 apps/server，smoke B01/B04
   双向拦截）；git 子进程 cwd 显式取该常量（ADR-0016 §3.4）。 */
export const PROJECT_ROOT =
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
