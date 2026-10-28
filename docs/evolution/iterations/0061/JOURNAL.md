# JOURNAL · 迭代 0061 · BUILD 过程记录

> 产出角色：code-developer（BUILD 阶段）· 2026-10-28 10:28 · 工作树 feat/0061-iter
> 输入：iterations/0061/PRD.md + SPEC.md；全程按 SPEC §5.2 执行序（先确定性复现
> 或采样失败率>0，后修复）与最保守口径执行。

## 1. 交付物

| 文件 | 改动 | 说明 |
| --- | --- | --- |
| `tests/e2e/pty-echo-matrix.mjs` | 新增 264 行（≤400 硬性达标，`node --check` 过） | 判别矩阵 A-D + 六点位 E2E 驱动（默认全量 / `--baseline` / `--probe` 三模式），复用 tests/smoke/lib.mjs 基建与根 devDependency playwright，零新依赖 |
| `package.json` | +1 行 `test:pty-e2e` 脚本（:26） | SPEC §4.1 定稿落点 |
| `docs/evolution/iterations/0057/{PRD,SPEC,JOURNAL,REPORT}.md` | 补录 ×4（机制件，不入 productFiles） | REQ-0061-05；每件头部补录标注合规，不可复原项如实标注 |
| `apps/web/src/legacy/app.js` | +2/−2 行（TERM 段 onFrame 帧路由，:3264-3268） | **修复轮追加（BUG-0061-01，§5）**：end 分支会话终态覆盖守卫 |

**首轮产品代码零改动**（诚实路径，§3）+ 修复轮仅 app.js TERM 段 +2/−2（§5）；
server-sync.js / apps/server / packages/shared / CSS / DOM 结构全轮零改动。golden 零接触、
`gate:update` 零消费（SPEC §7 预期兑现：未触碰任何静态面）。

## 2. SPEC §5.2 执行序实跑数据（全部本会话工作树内实跑）

### 2.1 第 1 步 · 修复前基线（--baseline，C/D 各 ×10 采样）

命令：`node tests/e2e/pty-echo-matrix.mjs --baseline`（工作树内，server 自起
PTY_ENABLED=1 + env 钉值，页面 = apps/web/dist 真实产物）。

- 形态 C：**10/10 绿 · 失败率 0（未复现）**
- 形态 D：**10/10 绿 · 失败率 0（未复现）**
- 汇总：PASS 203 / FAIL 0（含 PE0 ×3 + 每轮 10 项断言）

### 2.2 第 2 步 · --probe 三通道取证（单轮 C 形态，两跑）

关键输出（第二跑，通道增强后）：

```
[round C-p1] GREEN · topo=[1,3,2] T.out="终端会话就绪 · #e394ccd6 · 已注入命令 · 回显 12 字" status="连接会话…"
[probe] 面板 sid=e394ccd6-… · 本轮新建会话 2 个
[probe] ch2 独立订阅者帧（6）：ready@1 data@1 data@1 data@1 data@544ms data@1232ms
[probe] ch2 含 marker 帧：有
[probe] ch1 DOM 时间线：[{t:714,len:212,tail:"…>echo af61cp1 ",run:true,st:"连接会话…"},
  {t:1224,…,run:false,st:"流已结束"},{t:1232,…,st:"连接会话…"}]
```

判别结论（SPEC §5.1 假设面逐项）：

| 假设 | 证据 | 判定 |
| --- | --- | --- |
| P1 会话漂移 | node:done `#e394ccd6` == 面板绑定 sid（37/37 轮 PE1-*-sid 全 PASS） | **阴性** |
| P2 harness「已订阅」判据不足 | 重建驱动以「xterm 已渲染回放」为订阅确立判据后，C/D 20 轮基线失败率 0 | **0057 失败的最优解释**（SPEC §5.1 预案兑现） |
| P3 读侧丢弃窗 | ch1 时间线 tail 于 run:true 期已含注入命令回显（`…>echo af61cp1`）——live 帧渲染实证；「流已结束」@1224 系 ⑦ 关闭→abort→本地合成 end 帧（设计行为），非中途断流 | **阴性** |
| P4 跨轮会话积累 | 会话纪律（每轮停新建会话+断言回归基线）下 37/37 轮 clean；PTY_MAX_SESSIONS=4 满员降级路径在库有 PT05 冒烟锁 | **本轮排除**；0057 harness 无清理纪律时为 P2 的复合放大器（推断，证据：0057「完整 E2E 6/6 失败」与上限 4 的会话积累时序吻合，标注为推断非实测） |
| 服务端帧丢失（排除项） | ch2 独立订阅者收到含 marker 的 live data 帧（@544ms/@1232ms） | 三证维持，未推翻 |

### 2.3 第 3 步 · 诚实路径（SPEC §5.2 第 3 步，硬性）

修复前基线**失败率 = 0（未复现）**→ **不盲改产品代码**（SPEC §5.3 P2 行：
「产品代码零改动（harness 判据已由 §4.1 修复）」；P4 行：驱动脚本会话纪律承载）。
以 PE3 十轮采样 + probe 三通道证据出「无法复现」结论，验收基建（驱动脚本稳定性）
达标：全量模式 16 轮（A/B×1 + C/D×2 + C×10 采样）**PASS 170 / FAIL 0**，
PE3-summary「C 形态高频采样 10 轮失败率 0」。累计 37/37 轮绿（基线 20 + probe 1 + 全量 16）。

命令：`npm run test:pty-e2e`（默认全量模式；package.json 脚本实跑验证）。

## 3. BUG-0057-02 处置结论（BUILD 口径，交 VERIFY 按实跑数据裁定）

在库产品代码（0057 合并 810835e + 修复轮 b442840 加固）在正确 harness 语义下
**未表现出缺陷**：注入命令回显与输出帧均 live 到达面板 xterm 并渲染（probe ch1/ch2
双通道实证），会话绑定无漂移，拓扑差异（并行第二根改变 Kahn 序）不影响回显路由。
0057 期「C/D 2/2 复现、E2E 6/6 失败、diag 偶过」的最优解释 = 驱动侧判据不足（P2）
复合会话积累（P4）——两者均由本轮重建的确定性驱动脚本结构性封死（订阅确立强判据
+ 会话纪律）。本轮修复形态 = **验收基建重建**（PRD REQ-0061-02/03 载体），产品面
仅新增测试资产。

## 4. 边界与如实声明

- build/gate/test/smoke 全量门禁与 git 提交归脚本统一执行，本阶段未运行（BUILD 自测
  = test:pty-e2e 全量 + 基线/probe，见 §2）；产品改动面（package.json 脚本行 + 新
  测试文件）不触及构建输入与渲染路径，对 gate/test 无影响路径可循。
- probe ch1 时间线 len 恒 212 系观察者伪影（首次记录即渲染后状态；重开面板后观察
  元素引用失效），已以 tail 字段补强复核——判绿依据是 c4 直接 DOM 断言，不依赖该
  时间线。
- 驱动脚本为 win32 本机实测口径（cmd.exe banner/提示符判据含 `[>$%#]` 覆盖 POSIX
  shell；PTY spawn = node-pty conpty，0055 轮已验）。

## 5. 修复轮 · BUG-0061-01（Minor · 存量缺陷，VERIFY/门禁轮发现）

**缺陷**：会话停止后面板状态行终态为「流已结束」——服务端 exit 帧（reason=stop）的
「会话已结束（reason）」被 server-sync.js:107 本地合成 end 帧后到覆盖（app.js 两分支
同写状态行），六 reason 终态文本结构性不可达；功能语义全正确（停止生效/重开新建分支
正确），仅终态文本信息弱化。0057 期手动点位从未验证，故本轮诚实路径自测未覆盖。

**修复**（SPEC §6 清单内 app.js TERM 段，+2/−2）：termAttach 的 onFrame 闭包加
`sessionEnded` 标志——exit 分支置位并渲染「会话已结束（reason）」；end 分支
`if(!sessionEnded)` 才写「流已结束」。帧序保证正确性：服务端 closePtySession 先
sseWriteEvent(exit) 后 res.end()（session.ts:123-126）→ exit 帧先到达置位，随后
body 耗尽的合成 end 帧被守卫拦下；纯 end 无 exit 的路径（s19 静态 body、主动 close）
行为不变。

**复验实跑**（工作树内，官方门禁仍归脚本）：

1. **V6② 终态定向**（一次性脚本 tests/e2e/tmp-verify-stop.mjs，用后已删）：开面板
   订阅 → 点 stop → **PASS 6/6**——「会话已结束（stop）」呈现且 1s+300ms 双采样
   稳定不被覆盖、会话表确清空、重开走新建会话分支（旧会话失活不接管）。采样窗口
   为终态「不再变化」的固定口径（无状态量可等），已如实标注于脚本头注。
2. **全量矩阵回归** `npm run test:pty-e2e`：**PASS 170 / FAIL 0**（A/B×1 + C/D×2
   全链 + PE3 C×10 采样失败率 0）——与修复前持平，零回退。
3. `npm run build:web`（复验前置，vite 1.05s 出件）——非官方门禁口径；官方
   build/gate/test/smoke 归脚本统一执行。golden s19 预期零波及（静态 body 无 exit 帧，
   sessionEnded 恒 false，像素路径不变），以脚本 gate 实测为准。

**再派发复核（同 BUG 修复 ask 重派，2026-10-28 10:5x）**：修复确认在位（app.js diff
+3/−2；dist 10:50 新于源码 10:47），本轮重新实跑两项复验——V6② 定向脚本（重建后
运行、用后即删）**PASS 6/6**、全量矩阵 `npm run test:pty-e2e` **PASS 170 / FAIL 0**，
与首轮修复后持平。**工作树旁证观察（非本轮改动面，如实上报归脚本处置）**：
`tests/golden/ui/*.invariants.json` ×20 于我方轮次之外被改写——`git diff --numstat`
为空（**纯行尾改写，内容零变化**，autocrlf=true 下 status 显 M），PNG 全部未动；
首轮 BUILD 起点时 golden 全干净，该改写发生在脚本门禁阶段，不在本轮 productFiles
（tests/e2e/pty-echo-matrix.mjs、package.json、apps/web/src/legacy/app.js）内，未触碰。
