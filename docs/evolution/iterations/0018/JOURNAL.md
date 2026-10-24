# JOURNAL · 迭代 0018 · BK-0031（BUILD）

> 执行角色：code-developer · 2026-10-24 17:47~18:01 · 输入：本目录 PRD.md（S 项
> skipSpec=true，受影响文件清单与验收口径内嵌 PRD REQ-0031-05 / AC1~AC7）。
> 门禁与 git 提交由工作流脚本统一执行，本阶段不自行运行（见 §3 决策 2）。

## 1. 交付物（PRD 白名单四路径逐项）

| # | 产物 | 关键证据（本会话实跑） |
| --- | --- | --- |
| REQ-0031-01 | `packages/shared/test/nodes.baseline.json`（新增） | `npm run build:shared`（tsc，exit 0）后按 PRD 固化命令生成；node 逐项校验：总 11521 字节 = JSON 体 11520 + 末尾恰 1 换行、无 BOM、全文件无 CR、16 键、键序 = nodes.ts:10-106 声明序（trigger,…,approval）、无 `"if"` 键——与 PRD「11520 字节（不含末尾换行）」定长哨一致，未触发「字节不符即停」 |
| AC1 再生产 | 同上 | 重新生成到临时文件 `cmp` 输出空 + sha256 双文件一致 `08ba12290a4ac18c4a0e32144273d1bac59f2f3fbd94429b67a80e882116f275` |
| REQ-0031-02 | `.gitattributes`（新增） | 仅一行 `packages/shared/test/nodes.baseline.json text eol=lf`；`git check-attr text eol -- <快照>` → `text: set / eol: lf` 生效；对 README.md/package.json 抽查 → `unspecified`（存量文件检出形态零牵动）；`od -c` 证实文件本体 LF + 单末尾换行 |
| REQ-0031-03 | `docs/node-definition-protocol-migration-spec.md`（新增） | 342 行 ≤400；(a)~(g) 七要素齐备：四步各含文件面/红→绿次序/验证命令（§3.1-3.4）、九条验收机器可执行化（§5，验收 1 推荐常驻契约测试附三条理由、验收 2 if 探针六行真值表、验收 6 五点位 E2E）、两批 8+8 拆分表无遗漏无重复（§4：批次 1 delay/trigger/llm/userinput/code/retrieval/condition/http 覆盖全部结构形态；批次 2 prompt/websearch/notify/loop/merge/reply/setvar/approval 同构）、守卫测试设计（§6 静态提取法+行归属+精确僵尸清单断言）、快照证明力边界五条（§7）、回滚步骤（§8）、行数预算表（§9）；文档头草案状态标注在位（:3） |
| REQ-0031-04 | SPEC 附录 A issue 草案 | 标题含「BK-0021 NDP 节点定义目录制迁移」+ 请批关键词；正文五要素自包含（①请批面含 POLICY.md:23 条款引用 ②等价证据方案 NDP §10 验收 9 逐条 ③BK-0023 随批增量段（events.ts:32 语义注释 + server-sync.js:105-107 消费端证据 + CLOSE 随批关账口径）④两批 8+8 预告 ⑤证据链接五项）；ADR-0012 附录 A 同款「字面量 + 批准/驳回结语」机制 |
| REQ-0031-05 | `docs/evolution/BACKLOG.md` BK-0021 行备注追加 | 三产物路径（快照/SPEC/附录 A）+ 转 ready 唯一条件重申；增量 1 行内（单元格内追加，非新行）；**状态列未动**——BK-0021 与 BK-0023 均仍 `proposed`（AC4 不变式） |
| 状态 | `docs/evolution/STATE.md` | phase: PLAN → BUILD，updated 17:59 |

## 2. 指针复核（AC6 预检，本会话亲核后才写入 SPEC/issue）

- 与 NDP 记载漂移两处（+7 行，与 0017 REPORT OBS-001 同现象）：`app.js:2048→2055`
  （`DEFS.llm.params[0].o` 覆写）、`app.js:1859-1876→1866 起`（RUN_META）。SPEC
  §5.8 表按**现行行号**记载并标注漂移；issue 草案正文只引 stable 引用（文件名+
  未漂移行号），避免草案开启即过期。
- 未漂移复核命中：`nodes.ts:9/:14-15/:110-119`、`contract.test.mjs:12-19`、
  `events.ts:32`、`server-sync.js:105-107`、`llm.ts:15/34/35/36/:38`、
  `engine.ts:23-24/:26/:128`、`app.js:103/:178/:193-197/:763`、
  `handlers.ts:22-23`（trigger 签名 + 硬编码「手动触发」，NDP 记 :18-20）。

## 3. 决策与偏差

1. **`npm run build:shared` 由本阶段执行**：PRD REQ-0031-01 把它定为快照生成的
   必前置（防 dist 陈旧取到旧 DEFS，风险 2），属实现步骤而非完成门禁；完整
   `npm run build + gate + test + smoke` 未运行、git 未提交——按派发指令归脚本。
2. **AC2（test 链零扰动）与 AC7（回归面）本阶段未跑**：PRD 虽有「BUILD 期以
   真实 test 链复核」表述，派发指令明确「完整门禁由脚本统一执行、你不要自行
   运行」，以指令为准——AC2 的 `.json` 不被 `node --test` 拾取已有 PRD 背证的
   v24.21.0 临时目录实验，真实 test 链结果以脚本门禁为准采信；本 JOURNAL 不
   虚报该两项为已过。
3. **SPEC §4 批次 1 选取原则**：NDP 试点（delay+trigger）之上补齐「全部结构
   变体」（visibleIf/僵尸参数/caps 双与单/toggle/boolean 默认值/number 三件套/
   textarea 换行/空 inputs/双 inputs/双 outputs/list·object·text 端口/
   engine p.expr 耦合/同名键 p.to 一义），批次 2 为同构重复——空 outputs 与
   p.max、p.to 余义显式列入批次 2 批内必验。
4. **README 生成器落点**：推荐 `tools/gen-node-readmes.mjs`（单文件，不触
   `tools/pixel-gate/` 子树——POLICY 限制仅及该子树），SPEC §1/§9 标注为
   推荐值、实施轮 SPEC 评审可定稿调整；不提前创建。
5. 守卫测试**不硬编码** NDP 记载的「34 行/37 处」行数（会随代码漂移），只断言
   键集合与归属；数字作为 NDP §4.2 记载值引用。

## 4. 未做 / 边界（如实）

- 未开 needs-approval issue（草案仅落盘，开 issue 归脚本；批复只认用户本人）。
- 未触碰：`packages/shared/src/**`（含 events.ts——BK-0023 只在 issue 成文请批）、
  `apps/**`、`tools/**`、`.github/**`、`package.json`/lock（零依赖）。
- BK-0021/BK-0023 状态、ROADMAP、metrics 未动（CLOSE 职责）。
- `npm test` / `npm run gate` / `smoke:server` 未自行运行（脚本统一门禁）。
