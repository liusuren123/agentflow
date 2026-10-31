# workbench 安全面对抗审计报告（BK-0066 · 迭代 0076）

> 审计对象：`apps/server/src/workbench/` 三端点（E1 git 信息 / E2 diff 审查 / E3 目录树）。
> 起因：Mimosa 提交钩子自迭代 0055 起连续提示两项 high——`routes.ts:21` collectGitInfo
> 一跳可达 command-injection、`routes.ts:76` collectTree 是 path-traversal 入口
> （留痕原文 `docs/evolution/iterations/0057/MERGE.md`）。
> 方法：静态机制逐条亲核 + 动态探针全格实测 + 反演测试钉死（smoke B19-B23）。
> 实测环境：本机 win32 · 工作树 `feat/0076-iter`（HEAD 9c3a10c）· 主实例 node dist ·
> HTTP `/api/v1/*` · 2026-10-31。探针脚本为外部临时工具不入库（产品面零混入）。
> 契约定界：ADR-0016 §3（端点出参键集与错误字面量为承载契约面，非 shared DEFS）。

## 1. 结论摘要

- **两项 Mimosa high 最终裁定：均误报**（机制在位 + 全格实测拦截 + 反演哨兵钉死，
  论证见 §5）。
- **零加固**：未发现真实缺口，PRD §3-④ 条件加固未触发——本轮
  `apps/server/src/workbench/` 五文件零 diff（`git status` 在案），产品面 =
  `tests/smoke/smoke-server.mjs`（B19-B23）+ 本报告两个文件。
- 增量取证新记录（均非安全缺口，§6）：REF_MAX 200 过门后的 git 语义二态、
  Number()/toLowerCase 宽松放行族、pathspec-magic 良性语义族、E1 空串 400。

## 2. 范围与方法

| 项 | 口径 |
| --- | --- |
| 端点 × 入参 | E1 `limit`；E2 `base`/`head`/`path`/`stat`；E3 `path`/`depth` —— 共 3×7 格全覆盖（§4） |
| 静态取证 | 五源文件逐 file:line 亲核（§3 十道防线），不照抄历史文档 |
| 动态取证 | 恶意形态逐格 HTTP 实测，记录状态码 + 响应字面量（§4/§6） |
| 反演钉死 | 新增 smoke 断言 B19-B23 + 篡改→红→逐字节还原→复绿闭环（§7） |
| 非目标 | 不改 Mimosa 钩子（外部工具面）；不动 ADR-0016 契约定界；不加依赖/env/出站；不动 golden/pixel-gate/CI |

## 3. 静态机制清单（本轮逐锚点亲读，全部在位）

| # | 防线 | 锚点 | 语义 |
| --- | --- | --- | --- |
| 1 | E1 limit 整数门 | `routes.ts:17-19` | `Number(n) && Number.isInteger && 1<=n<=100`，否则 400「limit 必须是 1-100 的整数」 |
| 2 | argv 数组零 shell | `git.ts:30` | `spawn('git', args, {cwd, stdio})`——args 数组形态、无 shell/解释器选项，永不拼接命令行 |
| 3 | 只读命令白名单 | `git.ts:48,53,56` + `diff.ts:82` | rev-parse / status / log（E1）与 diff（E2）；limit 经 `String(limit)` 仅作 argv 元素 |
| 4 | 5s 超时强杀 | `git.ts:33,39` | setTimeout kill + killed 分支拒绝（500 固定字面量） |
| 5 | ref 字符白名单 | `diff.ts:26-27,47-52` | `REF_RE=/^[A-Za-z0-9._/@-]+$/` + `REF_MAX=200` + 空串 400 + `-` 开头选项注入拒绝 |
| 6 | path 防越界 | `diff.ts:34-37,54-58` / `tree.ts:41-44,52-55` | 双同构 `isWithinRoot`：resolve 归一后前缀比对，`../` 逃逸与绝对路径同拒 |
| 7 | 锚定根常量 | `root.ts:17-18` | `PROJECT_ROOT` 模块级常量，模块加载即冻结，非进程 cwd |
| 8 | tree 深度门 | `tree.ts:58-61` | depth 整数 1-6，否则 400「depth 必须是 1-6 的整数」 |
| 9 | tree 收敛面 | `tree.ts:34-35,112,140-143` | FOLD 四目录折叠占位 + `ENTRIES_CAP=500` + `.git` 恒不入树 + 符号链接不追踪（lstat 判型，零环引用） |
| 10 | 校验/承载分离 | `routes.ts:35-58,65-85` | 校验 400 直返 / not-repo·not-found 404 / 其余 500 固定字面量——细节进 logger 不进响应（`routes.ts:55,82`） |

## 4. 攻击面矩阵（逐格实测；「B-xx」= smoke 断言 ID）

### E1 `/api/v1/workbench/git` · limit

| 形态 | 进入路径 | 拦截点 | 实测 | 裁定 |
| --- | --- | --- | --- | --- |
| `0` / `101` / `abc` | query→`routes.ts:17` | 整数门 `routes.ts:18` | 400「limit 必须是 1-100 的整数」（B03） | 拦截 |
| `-1` / `2.5` | 同上 | 同上 | 400 同字面量（B19） | 拦截 |
| `limit=1&limit=2`（数组） | express 多值→数组→`Number(array)=NaN` | 同上 | 400 同字面量（B19） | 拦截 |
| `limit=`（空串） | `Number('')=0`<1 | 同上 | 400 同字面量（B19） | 拦截 |
| `1e999`（∞） / `NaN` | 非整数 | 同上 | 400 同字面量（探针） | 拦截 |
| `' 20 '` / `1e2` / `0x64` / `%2B20` / `20.` | Number() 宽松转换→20/100 | 上限 100 门仍在 | 200（commits ≤100） | 既有语义，记录不改动（§6.2） |

E1 唯一可达 git argv 的值是 1..100 整数（`git.ts:56` `String(limit)`）——无用户可控
字符串进入命令行（详见 §5.1 链路裁定）。

### E2 `/api/v1/workbench/diff` · base / head

| 形态 | 进入路径 | 拦截点 | 实测 | 裁定 |
| --- | --- | --- | --- | --- |
| `-x`（选项注入）/ `main;rm` / 空串 / `HEAD~1` | query→`diff.ts:47-52` | `-` 前缀 + REF_RE + 空串检查 | 400「base 或 head ref 非法」（B09） | 拦截 |
| `main%0Ax`（换行注入，head 对称） | 解码后 `\n` 不在 REF_RE | `diff.ts:48-50` | 400 同字面量（B20） | 拦截 |
| `base=a&base=b`（数组） | `typeof v!=='string'` | 同上 | 400 同字面量（B20） | 拦截 |
| `a`×201（REF_MAX 外） | `v.length>200` | `diff.ts:48` | 400 同字面量（B20） | 拦截 |
| `a`×200（过形状门） | `diff.ts:84-85` 作 argv 元素 | git 自身语义（§6.1） | 400「base 或 head ref 不存在或不可解析」或 500「git command failed」二态集（B20 集合钉死） | 恒固定字面量零泄露 |
| `deadbeef`（合法形状不可解析） | git stderr 命中 unknown revision | `diff.ts:89-90` | 400 语义级（B09） | 契约内 |

### E2 · path

| 形态 | 进入路径 | 拦截点 | 实测 | 裁定 |
| --- | --- | --- | --- | --- |
| `../` / `../../` / `D:/` / `/etc` | query→`diff.ts:54-58` | `isWithinRoot`（`diff.ts:34-37`） | 400「path 越界」（B10） | 拦截 |
| `..\..\`（win32 分隔符变体） | resolve 在 win32 视 `\` 为分隔符，归一越界 | 同上 | 400 同字面量（B21） | 拦截 |
| `path=a&path=b`（数组） | `typeof p!=='string'` | 同上 | 400 同字面量（B21） | 拦截 |
| `:(top)` / `:/docs` / `:(glob)**/*.md` / `:(top,glob)**/*.md` / `:(exclude)docs` / `.` / 空串 | 过 isWithinRoot → `diff.ts:86` 作 pathspec | git pathspec 语义（限仓库根内） | 全 200，结果集落在仓库内容面（2/1/1/1/1/2/2 文件，固定提交对锚）（B22 锁定） | 良性语义，锁定（§6.3） |

### E2 · stat

| 形态 | 进入路径 | 拦截点 | 实测 | 裁定 |
| --- | --- | --- | --- | --- |
| `abc` / `2` | query→`diff.ts:61-66` | 枚举门 0/1/true/false | 400「stat 必须是 0/1/true/false」（B08；`2`/数组 探针） | 拦截 |
| `1&stat=0`（数组） | `typeof s!=='string'`→`t=''` | 同上 | 400 同字面量（探针） | 拦截 |
| `True` / `TRUE` | `toLowerCase()` | 枚举门仍在 | 200（stat 模式） | 既有语义，记录不改动（§6.2） |

stat 是纯模式开关（`diff.ts:83` `--numstat`），不进 git argv 字符串。

### E3 `/api/v1/workbench/tree` · path

| 形态 | 进入路径 | 拦截点 | 实测 | 裁定 |
| --- | --- | --- | --- | --- |
| `../` / `../../` / `D:/` / `/etc` | query→`tree.ts:52-55` | `isWithinRoot`（`tree.ts:41-44`） | 400「path 越界」（B16） | 拦截 |
| `..\..\` / 数组多值 | 同 E2 同构 | 同上 | 400 同字面量（B21） | 拦截 |
| `no-such-dir-xyz` / `package.json`（存在但为文件） | `tree.ts:78-91` lstat 判型 | not-found 面 | 404「path 不存在或不是目录」（B17） | 契约内 |
| `node_modules`（折叠目录显式下钻） | `tree.ts:93-94` 折叠短路 | FOLD 恒空 | 200 children=[]（B17） | 折叠语义 |
| `.` / 空串 | resolve=根 / 缺省跳过 | — | 200 根树（探针） | 良性 |

### E3 · depth

| 形态 | 进入路径 | 拦截点 | 实测 | 裁定 |
| --- | --- | --- | --- | --- |
| `0` / `7` / `abc` / `2.5` | query→`tree.ts:58-61` | 整数门 1-6 | 400「depth 必须是 1-6 的整数」（B15） | 拦截 |
| `depth=1&depth=2`（数组） | `Number(array)=NaN` | 同上 | 400 同字面量（B21） | 拦截 |
| `' 2 '` 形 / `0x2` / `2.0` | Number() 宽松转换 | 上限 6 门仍在 | 200 | 既有语义，记录不改动（§6.2） |

## 5. Mimosa 两项 high 的端到端链路裁定（实测复核，非照抄初判）

### 5.1 `routes.ts:21` collectGitInfo → command-injection（high）→ 裁定：误报

完整链路：`GET /api/v1/workbench/git?limit=X` → `routes.ts:17` `Number(X ?? 20)`
→ `routes.ts:18` 整数门（非 1-100 整数即 400）→ `routes.ts:21` `collectGitInfo(n)`
→ `git.ts:56` `runGit(['log','-n',String(limit),'--format=...'])` → `git.ts:30`
`spawn('git', args, {cwd,…})`——args 恒数组、无 shell/解释器选项。

- **可达性**：能通过整数门的值只有 1..100 的整数，其 `String()` 形态 ∈
  `{'1'..'100'}`——不存在任何用户可控字符串能成为命令行成分或 argv 拼接片段。
- **实测**：负例全族（0/101/abc/-1/2.5/数组/空串/1e999/NaN）全部 400 同字面量
  （B03/B19）；宽松放行族最远到 200 且 commits ≤100（§6.2）。
- **源码锁**：B23 断言 spawn 恒 1 处且形态 `spawn('git', args`、argv 装配行零模板
  字面量零拼接、`runGit(` 首参恒数组/args；反演红侧实证见 §7（AC3）。
- 裁定依据：启发式按「collect+exec 一跳」计分，但 argv 数组形态 + 整数门使
  command-injection 在本链路**不可达**。

### 5.2 `routes.ts:76` collectTree → path-traversal（high）→ 裁定：误报

完整链路：`GET /api/v1/workbench/tree?path=X` → `tree.ts:52-55` `isWithinRoot`
（`tree.ts:41-44` resolve 归一前缀比对）→ `collectTree` `tree.ts:78` 二次 resolve →
`tree.ts:81-91` lstat 锚定根判型 → walk `readdir`（`tree.ts:106`）/`lstat`
（`tree.ts:115`）逐条判型 → `.git` 恒不入树（`tree.ts:112`）→ FOLD 折叠
（`tree.ts:34-35,123-124`）→ 符号链接不追踪（`tree.ts:140-143`）。

- **实测**：越界全形态（`../`、`../../`、`D:/`、`/etc`、`..\..\`、数组）全 400
  「path 越界」（B10/B16/B21）；存在但非目录 / 不存在 → 404（B17）；折叠目录显式
  下钻恒空（B17）；默认契约含 `.git` 递归零出现 + 全树 ≤500 条（B13）。
- **fs 面**：E3 零子进程（B18 `spawn` 零命中）、fs 调用面仅 readdir/lstat 只读
  两员（B18 写面禁词零命中）——不存在借 path 写出的通道。
- 裁定依据：入口前缀校验 + 承载内二次 resolve + lstat 不追链接三重收口，
  path-traversal 在本链路**不可达**；符号链接不追踪同时封死「软链指外」变体。

## 6. 增量取证发现（实测记录，均非安全缺口 → 不加固）

### 6.1 REF_MAX 200 过门后的 git 语义二态（B20 集合断言钉死）

200 字符白名单形状 ref（如 `a`×200）通过形状门后作 argv 元素传给
`git diff`（`diff.ts:84`）。git 对既非合法对象名（40/64 hex）又非仓库内路径的
长串按 **pathspec 解释**并做 stat 探测：

- stat 干净 miss（POSIX / 短根路径）→ `fatal: ambiguous argument '…': unknown
  revision or path not in the working tree.` → 命中 `diff.ts:89` 正则 →
  **400「base 或 head ref 不存在或不可解析」**；
- stat 自身失败（win32 长根路径：仓库绝对路径 + 200 字符超 stat 路径上限 →
  `fatal: failed to stat '…': Filename too long`，本机实测）→ 不命中正则 →
  `failed` → **500「git command failed」**（固定字面量，stderr 细节进 logger
  不进响应，`routes.ts:55`）。

两态均为固定字面量、零泄露；具体落到哪态取决于部署机路径长度，**不预设单一
状态码**（PRD §7.1 实测优先口径），B20 以二态集合断言钉死「恒定字面量」。
是否新增 400 拒绝分支 → 裁定**不加**：改错误归类即动 E2 契约面，且无安全增益
（防盲目改码）。本机实测记录：`base=a`×200 → 500；`a`×201（REF_MAX 内正常门）
→ 400「base 或 head ref 非法」。

### 6.2 Number()/toLowerCase 宽松放行族（既有语义，记录不改动，PRD §7.2）

- E1 limit：`' 20 '`(20) / `1e2`(100) / `0x64`(100) / `+20`(20) / `20.`(20) → 200；
- E3 depth：`' 2'` / `0x2` / `2.0` → 200；
- E2 stat：`True` / `TRUE`（toLowerCase 命中）→ 200。

宽松转换只影响数值形状，界值门（1..100 / 1..6 / 0,1 枚举）与「值只作 argv 元素/
纯开关」不变——无越权面，改动反动契约语义，零安全增益。

### 6.3 pathspec-magic 良性语义族（B22 锁定实测形态，REQ-0076-02 第 6 类）

`:(top)`、`:/docs`、`:(glob)**/*.md`、`:(top,glob)**/*.md`、`:(exclude)docs`、
`.`、空串均能通过 `isWithinRoot`（resolve 落根内）并以 git pathspec 语义执行。
固定提交对 ed2f8ed↔d880b62 实测：依次 200 且 files=2/1/1/1/1/2/2，结果集全部
落在仓库内容面（pathspec 匹配由 git 自身限定在仓库根内），**零越界读、零
stderr 泄露**。裁定：良性语义，不加 400 拒绝分支；B22 锁定实测形态作回归哨兵。

### 6.4 E1 空串 `limit=` → 400

`Number('')=0`<1 → 400（B19 钉死）。空串「在而缺省不在」语义与 E2 ref 空串
（B09）同型，矩阵补格。

## 7. 反演钉死哨兵（B19-B23）与红绿证据

| 断言 | 守护校验点 | 钉死内容 |
| --- | --- | --- |
| B19 | E1 limit 整数门 | -1 / 2.5 / 数组多值 / 空串 → 400 |
| B20 | ref 白名单（REF_RE/REF_MAX/数组） | 换行注入 / head 对称 / 数组 / 201 拒；200 过门二态集 |
| B21 | `isWithinRoot`（双端点）+ depth 门 | `..\..\` 反斜杠逃逸 / path 数组 / depth 数组 |
| B22 | pathspec-magic 承载面 | `:(top)` / `:/docs` / `.` / 空串实测良性形态 |
| B23 | argv 装配形态源码锁 | spawn 恒 1 处 `'git'+args`；装配行零模板/零拼接；`runGit(` 首参恒数组/args |

反演红侧证据（2026-10-31 本机实测，fail-fast 口径）：

- **AC3**（B23 反演）：`diff.ts:84` `args.push(q.base ?? 'HEAD')` 临时改为
  `` args.push(`${q.base ?? 'HEAD'}`) ``（模板字面量，行为等价）→
  `npm run smoke:server` → `FAIL B23 … "badAsm":1`、前面 150 断言全绿（行为
  等价性自证）、**exit 1** → `git checkout -- apps/server/src/workbench/diff.ts`
  逐字节还原（`git status` 零残留）。
- **AC4**（B20 反演）：`diff.ts:27` `REF_MAX=200` 临时改为
  `Number.MAX_SAFE_INTEGER` → **须先 `npm run build:server`**（端点断言打 dist
  编译产物，仅改 src 不可观测——实测教训在案）→ smoke →
  `FAIL B20 … base 201 字符:500:git command failed`、**exit 1** → 还原 +
  `npm run build:server` → 复跑 **208 passed / 0 failed、exit 0**。

## 8. 结论

1. 两项 Mimosa high（`routes.ts:21` command-injection 一跳、`routes.ts:76`
   path-traversal 入口）**最终裁定：均误报**——ADR-0016 设计机制十条防线全部
   在位（§3），3 端点 × 7 入参全格动态实测无一处越界读、无一处 stderr/细节
   泄露（§4），且由 B19-B23 反演哨兵机器钉死（§7）。
2. **零加固**：真实缺口为零，条件加固（PRD §3-④）未触发；
   `apps/server/src/workbench/` 五文件本轮零 diff。
3. 收敛口径：Mimosa 钩子按自身规则扫描，提示是否消失不由本仓控制；本轮验收
   只认本报告的逐格裁定与 smoke 机器证明（PRD §7.5）。后续提交若钩子仍提示
   两项 high，以本报告为审查底稿复核增量 diff 即可，无需重复全量取证。

## 9. 复测命令口径（仓库根可复制执行）

```sh
npm run build            # gate 前置（shared + web）
npm run gate             # 宪法门禁（21 场景，0 容差；全程禁 gate:update）
npm test                 # shared 契约测试
npm run smoke:server     # 后端冒烟：B19-B23 在 B 组；本轮口径 208 passed / 0 failed
```

反演复测（篡改→红→逐字节还原→绿）见 §7 两条闭环；注意 AC4 类端点反演必须
`npm run build:server` 后再跑 smoke。

## 10. 证据锚点索引（file:line 均已亲核可开）

`routes.ts:17-19`（limit 门）· `routes.ts:21`（collectGitInfo 调用）·
`routes.ts:35-58`（E2 handler 校验/承载分离）· `routes.ts:55`（细节进 logger）·
`routes.ts:65-85`（E3 handler）· `routes.ts:76`（collectTree 调用）·
`git.ts:30`（spawn 数组形态）· `git.ts:33,39`（5s 强杀）· `git.ts:48,53,56`
（只读白名单三命令）· `diff.ts:26-27`（REF_RE/REF_MAX）· `diff.ts:34-37`
（isWithinRoot）· `diff.ts:47-52`（ref 校验）· `diff.ts:54-58`（path 校验）·
`diff.ts:82-86`（argv 装配）· `diff.ts:89-90`（revision 归类）·
`tree.ts:34-35`（FOLD/CAP）· `tree.ts:41-44`（isWithinRoot 私有同构）·
`tree.ts:52-55`（path 校验）· `tree.ts:58-61`（depth 门）· `tree.ts:78,81-91`
（二次 resolve + lstat 判型）· `tree.ts:112`（.git 排除）· `tree.ts:140-143`
（符号链接不追踪）· `root.ts:17-18`（PROJECT_ROOT 冻结）。
