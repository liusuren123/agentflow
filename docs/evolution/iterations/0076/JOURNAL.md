# JOURNAL · 迭代 0076 · BK-0066 workbench 安全面对抗审查与反演加固（BUILD 轮）

> 执行角色：code-developer · 2026-10-31 · 隔离工作树 `feat/0076-iter`
> 依据：`iterations/0076/PRD.md`（skipSpec=true，§5 白名单 / §6 验收口径即实施定界）。
> 裁定先行：**两项 Mimosa high 均误报，真实缺口为零 → 条件加固（PRD §3-④）未触发，
> `apps/server/src/workbench/` 五文件零 diff**（§4 留证）。

## 1. 锚点亲核（PRD §2.2 机制表的现场复核）

BUILD 开工前逐 file:line 亲读工作树五源文件，与 PRD §2.2 十道防线表全部一致，
零漂移：`routes.ts:17-19`（limit 门）/ `:21`（collectGitInfo 调用）/ `:35-58,:65-85`
（E2/E3 handler 分离）/ `:55,:82`（细节进 logger）；`git.ts:30`（spawn 数组形态）/
`:33,39`（5s 强杀）/ `:48,53,56`（只读白名单）；`diff.ts:26-27`（REF_RE/REF_MAX）/
`:34-37`（isWithinRoot）/ `:47-52`（ref 校验）/ `:54-58`（path 校验）/ `:82-86`
（argv 装配）/ `:89-90`（revision 归类）；`tree.ts:34-35`（FOLD/CAP）/ `:41-44`
（isWithinRoot 私有同构）/ `:52-55`（path 校验）/ `:58-61`（depth 门）/ `:78`
（二次 resolve）/ `:112`（.git 排除）/ `:140-143`（符号链接不追踪）；`root.ts:17-18`
（PROJECT_ROOT 冻结）。无「代码现状 > PRD」转写。

## 2. 动态探针矩阵取证（PRD §3-①，外部临时脚本实测，脚本不入库）

自建探针（`startServer` 起 dist 主实例 + `/api/v1/*` HTTP 逐格打点）实测 32 形态，
关键输出（完整矩阵与裁定见 `docs/workbench-security-audit.md` §4/§6）：

- E1：`-1`/`2.5`/数组/空串/`1e999`/`NaN` → 400 同字面量；`' 20 '`/`1e2`/`0x64`/
  `+20`/`20.` → 200（Number() 宽松放行既有语义，记录不改动）；
- E2 ref：`main%0Ax`（换行）/数组 → 400 非法；`a`×201 → 400 非法；`a`×200 →
  **500「git command failed」**（本机实测，与 PRD AC2 预期 400 不符——见 §5 偏差记）；
- E2/E3 path：`..\..\`/数组 → 400 越界（双端点）；E3 depth 数组 → 400；
- E2 pathspec-magic：`:(top)`/`:/docs`/`:(glob)**/*.md`/`:(top,glob)**/*.md`/
  `:(exclude)docs`/`.`/空串 → 全 200 且结果集落仓库内容面（2/1/1/1/1/2/2 文件，
  固定提交对锚）——良性语义；
- E3 depth 宽松：`' 2'`/`0x2`/`2.0` → 200（记录不改动）。

git 语义根因实查：`git diff <a×200>` stderr = `fatal: failed to stat '…':
Filename too long`（win32 长根路径 stat 上限），不命中 `diff.ts:89` revision 正则
→ 500 固定字面量；POSIX/短根环境 stat 干净 miss → `ambiguous argument` → 400
语义级。两态均零 stderr 泄露（`routes.ts:55`）。

## 3. 断言落盘（PRD §3-②，B 组顺延 B19-B23，+107 行）

`tests/smoke/smoke-server.mjs`：文件头 B 组描述段补 B19-B23 段；B18 后插入五块
（编号顺延，零撞号）——

- **B19**：E1 limit 反演补钉（-1 / 2.5 / 数组多值 / 空串 → 400；宽松放行族按
  REQ-0076-02 第 5 类二分口径只取证不钉死）；
- **B20**：E2 ref 增量负例（换行注入 base/head 对称 / 数组 / 201 拒）+ 200 过门
  **二态集合断言**（400 语义级 ∪ 500 固定字面量，环境相关不强预设，PRD §7.1）；
- **B21**：path 反斜杠逃逸（E2/E3）+ path 数组（E2/E3）+ depth 数组 → 各 400；
- **B22**：pathspec-magic 实测良性形态锁定（`:(top)` files=2 / `:/docs` files=1
  docs/ 前缀 / `.` files=2 / 空串 files=2，固定提交对锚）；
- **B23**：argv 装配形态源码锁（五文件 `spawn(` 恒 1 处且 `spawn('git', args`
  形态；git.ts+diff.ts 装配行（runGit(/args.push( 非注释行）零反引号零字符串
  拼接；`runGit(` 首参恒数组/args）——写盘前以同逻辑 node 实查源码：
  `{spawnHits:1, form:true, asmLines:10, badAsm:0, badRunGit:0}` 全数验证。

## 4. 条件加固裁定（PRD §3-④）：零加固

全格实测无越界读、无 stderr/细节泄露、错误响应恒固定字面量 → 真实缺口为零 →
不触码。`git status` 全轮终态：产品面恰 `tests/smoke/smoke-server.mjs`（M，
+107）+ `docs/workbench-security-audit.md`（新增，248 行）；`apps/web`/
`packages/shared`/`tests/golden`/`tools/pixel-gate`/`.github`/`package*.json`/
`docs/adr`/`apps/server/src/workbench/` 零 diff（禁区白名单逐区实查在案）。

## 5. 偏差与预案记档（对 PRD 的两处实测对齐，均 PRD §7 条款授权口径内）

1. **AC2 第 3 类「REF_MAX 200/201」实测与预期不符**：PRD AC2 预期 200 字符得
   「契约内 400」；本机实测 500「git command failed」（win32 长根路径 stat 形态，
   §2）。处置按 PRD §7.1「实测 + 文档化 + 断言锁定实测形态，不强预设」：B20 以
   二态集合断言钉死恒定字面量零泄露，实测与机制解释写入审计报告 §6.1，不改码。
2. **AC4 反演须重建 dist**：端点断言打 dist 编译产物——首跑只篡改 src 未红
   （208/0），补 `npm run build:server` 后 B20 如期红。教训写入审计报告 §7/§9
   （「AC4 类端点反演必须 build:server 后再跑 smoke」）；AC3 源码锁读 src 无此需。

## 6. 自测与反演红绿证据（真实命令与输出）

- 全量 smoke ×2 绿：`npm run smoke:server` → `==== smoke:server：208 passed /
  0 failed ====`、exit 0（基线 203/0 + 新增 B19-B23 恰 5；既有断言零回退，
  PASS B19~B23 五行在案）；
- **AC3 红侧**：篡改 `diff.ts:84` `args.push(q.base ?? 'HEAD')` → 模板字面量形态
  （行为等价）→ smoke → `FAIL B23 …"badAsm":1`、此前 150 断言全绿、**exit 1**；
- 逐字节还原：`git checkout -- apps/server/src/workbench/diff.ts` →
  `git status`（apps/server/）零输出；
- **AC4 红侧**：篡改 `diff.ts:27` `REF_MAX = Number.MAX_SAFE_INTEGER` →
  `npm run build:server` → smoke → `FAIL B20 …base 201 字符:500:git command
  failed`、此前 147 断言全绿、**exit 1**；
- 终态复绿：还原 + `npm run build:server` → smoke → **208 passed / 0 failed、
  exit 0**；`git status --short` 全树终态仅 STATE.md（机制件）+ 两产品文件 +
  迭代目录，零篡改残留。

## 7. 门禁边界申明

按 BUILD 派发契约：`npm run build` / `npm run gate` / `npm test` 与 git 提交由
脚本统一执行，本轮未自行运行（gate 与 golden 零接触；全程禁 `npm run gate:update`
——非修宪轮）。自测仅动用 `npm run smoke:server` 与 `npm run build:server`
（反演闭环所需，src 逐字节还原后 dist 重建与基线源码等价）。

## 8. 交接 VERIFY 的验收点指位

- AC1/AC5 → `docs/workbench-security-audit.md`（§4 矩阵 / §5 两端到端裁定 /
  §10 锚点索引，锚点抽样已自检 ≥8 组全命中）；
- AC2/AC3/AC4 → smoke B19-B23 + 本 JOURNAL §6 反演输出；
- AC6 → 命令口径见审计报告 §9（build/gate/test/smoke 四命令，VERIFY 工作树根实跑）；
- AC7 → 本 JOURNAL §4 禁区实查记录。
