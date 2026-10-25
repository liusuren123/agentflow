/* zcode-workflow
description: 执行一次 AgentFlow 进化迭代（v3 · 特性分支工作树模型）：预检（STATE/熔断/主干干净）→
  原子分配迭代号并在 .zcode/worktree/feat/<NNNN>-<slug>/ 建隔离工作树 → GitHub issue 同步（needs-approval
  批复处理 / user-request 面板）→ 侦察档案（残缺标记/悬挂 run）→ 产品经理选题（doc 项不占心跳；S 项可免
  SPEC；无证据不立项，无候选即空转）→ 代码开发实现（脚本在工作树内统一跑 build/gate/test 门禁；修宪轮
  允许一次 gate:update）→ 测试经理验收 → 修复循环 ≤2 → 特性分支提交 → 合并仲裁员合回主干并检出解决冲突
  → 主干端到端复测（build/gate/test/smoke）+ 日志与图像证据留档 → 归档 + issue 回执关单。
  契约见 docs/evolution/WORKFLOW.md；权限边界见 docs/evolution/POLICY.md。
whenToUse: 每次进化心跳（定时/闲时唤起）或手动推进一轮迭代时调用。每轮迭代在独立特性分支与隔离工作树中
  进行，用户可同时开多路工作流而互不干扰（迭代号原子分配防撞号，主干合并由排他锁串行化）。
  issue 操作只用 gh CLI；循环的 issue 评论一律带 🤖 前缀；needs-approval 批复仅认用户本人评论。
*/

interface PlanResult {
  /** 所选 BACKLOG 项 ID（BK-xxxx）；补题/空转轮为 "-" */
  itemId: string;
  /** 项标题（一句话） */
  title: string;
  /** selected=正常开工；replenished=补题；ui_quarantined=触UI已转 issue 待批准；noop=空转 */
  outcome: "selected" | "replenished" | "ui_quarantined" | "noop";
  /** PRD 落盘路径（工作树相对；noop 时不落盘） */
  prdPath: string;
  /** S 项（非 doc、非触 UI）免独立 SPEC：PRD 须内嵌受影响文件清单与验收口径 */
  skipSpec?: boolean;
  /** 来源 issue 号（user-request / 批复转 ready 项：完成时回执关单） */
  sourceIssue?: number;
  /** 修宪轮（用户 issue 批准的 UI/golden 变更）：门禁失败时允许一次 gate:update 重录 */
  reconstitutional?: boolean;
  /** 批次化条目未到终轮（STATE.item 跨迭代续填该 ID）：迭代 PASS 只发进度回执，不关来源 issue */
  itemContinues?: boolean;
  /** 触 UI 的 user-request issue 号：脚本补 needs-approval 标签并评论说明 */
  uiIssueNumbers?: number[];
  /** ui_quarantined 时建 issue 用的影响面/动机一句话 */
  uiReason?: string;
}

interface SpecResult {
  specPath: string;
  touchedPaths: string[];
  acceptance: string;
  needsAdr: boolean;
}

interface BuildResult {
  commitMessage: string;
  summary: string;
  /** 本轮实际改动/新增的产品文件清单（受影响文件白名单口径，含新增文件，不含 docs/evolution） */
  productFiles?: string[];
  blockedReason?: string;
}

interface VerifyResult {
  verdict: "PASS" | "FAIL";
  reportPath: string;
  bugs: string[];
}

interface MergeResult {
  /** 是否已成功并回主干并提交 */
  merged: boolean;
  /** 合并过程中检出的冲突文件（空数组=无冲突） */
  conflicts: string[];
  /** 冲突解决方式摘要（按文件） */
  resolutions: string[];
  /** 合并提交哈希（成功后） */
  commit?: string;
  /** 主干复测四项结果：build / gate / test / smoke */
  retest?: { build: boolean; gate: boolean; test: boolean; smoke: boolean };
  /** 主干复测失败原因或合并阻塞原因 */
  blockedReason?: string;
  /** 证据目录（工作树相对路径） */
  evidenceDir?: string;
}

const MAIN = ".";
const WT_PARENT = ".zcode/worktree";
const TOOLS = ".zcode/tools/wt.mjs";
const MERGE_LOCK = ".zcode/locks/merge.lock";

phase("预检：循环状态、熔断与工作树分配");
const stateText = await files.read("docs/evolution/STATE.md");
const stateIteration = String(stateText.match(/^iteration:\s*(\S+)/m)?.[1] ?? "0000");

let fail = "";
/* 并行模型下的预检口径（v3）：
   - 主干「必须完全干净」会阻塞并行路（另一路的未提交产物会挡住本路），
     故只要求主干没有未提交的【产品代码】改动——机制件（docs/evolution）允许并行写入，
     合并时由合并仲裁员按契约分类解决。
   - STATE.phase 的 idle 检查同理降级：主干 phase 非 idle 只说明有并行路在途，
     不再作为拒绝开工的理由（撞号由迭代号原子分配防住，合并由排他锁串行化）。
   - 真正的熔断（连续失败）与基线门禁仍然生效，只是基线在工作树内跑。 */
const tree = await git.status();
const dirtyCode = [...tree.unstaged, ...tree.untracked].filter(
  (p) => !p.startsWith("docs/evolution/") && !p.startsWith("docs/adr/") && !p.startsWith(".zcode/"),
);
if (dirtyCode.length > 0) {
  fail = `主干有未提交的产品代码改动（${dirtyCode.slice(0, 5).join("、")}），拒绝开工（避免把他人半成品算进本轮）`;
}
const metricsText = await files.read("docs/evolution/metrics.md");
const dataRows = metricsText
  .split("\n")
  .filter((l) => l.startsWith("|") && !l.includes("---") && !l.includes("结果"));
let consecFails = 0;
for (const row of [...dataRows].reverse()) {
  if (/fail/i.test(row.split("|")[4] ?? "")) consecFails += 1;
  else break;
}
if (fail === "" && consecFails >= 3) {
  fail = `连续 ${consecFails} 次迭代失败，跨项熔断：等待人工根因分析（metrics.md）`;
}

const runGh = async (args: string[], timeoutMs = 60_000) => await world.run("gh", args, { timeoutMs });
const runGit = async (args: string[], timeoutMs = 60_000) => await world.run("git", args, { timeoutMs });
const runNode = async (args: string[], timeoutMs = 60_000) => await world.run("node", args, { timeoutMs });
const runTool = async (args: string[], timeoutMs = 60_000) => await world.run("node", [TOOLS, ...args], { timeoutMs });
const parseJson = <T,>(s: string, fb: T): T => {
  try {
    return JSON.parse(s || "") as T;
  } catch {
    return fb;
  }
};

const notewriter = agent("协调·记录员", {
  system:
    "你是 AgentFlow 进化工作流的记录员。先读 docs/evolution/WORKFLOW.md §5.4。只做被要求的状态文件更新，不改任何其他文件；做不到就 escalate 说明。",
});

if (fail !== "") {
  await notewriter.ask(
    `预检未通过：${fail}。请把 docs/evolution/STATE.md 的 phase 改为 stuck、last_result 写明该原因、updated 填当前时间。`,
  );
  return {
    conclusion: `迭代 ${stateIteration} 未开始（预检未通过）：${fail}`,
    findings: [],
    verified: ["预检检查由脚本执行（git.status 产品改动扫描 / metrics 连败熔断）"],
    notCovered: ["预检失败即止，未进入任何阶段"],
  };
}
log(`预检通过：主干干净，基线 build/gate/test 全绿`);

phase("分配迭代号并建立隔离工作树");
/* 迭代号原子分配：git ref 创建本身原子 + 辅助器顺延已占用号位
   → 用户同时开多路工作流时不会撞号、不会互相覆盖 */
const allocOut = await runTool([
  "alloc",
  MAIN,
  WT_PARENT,
  "main",
  stateIteration,
  "iter",
]);
if (allocOut.exitCode !== 0) {
  await notewriter.ask(
    `工作树分配失败：${allocOut.stderr.slice(0, 300)}。请把 docs/evolution/STATE.md 的 phase 改为 stuck、last_result 写明该原因。`,
  );
  return {
    conclusion: `迭代号与工作树分配失败，未开工：${allocOut.stderr.slice(0, 200)}`,
    findings: [],
    verified: ["预检由脚本执行（产品改动扫描 / 连败熔断）"],
    notCovered: ["工作树未建立，未进入任何阶段"],
  };
}
const alloc = parseJson<{ branch: string; path: string; iter: string }>(allocOut.stdout, {
  branch: "",
  path: "",
  iter: "",
});
if (!alloc.branch || !alloc.path) {
  return {
    conclusion: "工作树分配返回不可解析，未开工。",
    findings: [],
    verified: ["预检由脚本执行（产品改动扫描 / 连败熔断）"],
    notCovered: ["工作树未建立，未进入任何阶段"],
  };
}
const BRANCH = alloc.branch;
const WT = alloc.path;
const ITER = alloc.iter;
log(`已分配迭代 ${ITER}：分支 ${BRANCH}，工作树 ${WT}`);

/* 工作树依赖准备：node_modules 顶层依赖 junction 到主仓库，@agentflow/* 指向工作树自身
   （否则工作树编译的是主仓库源码，隔离即失效） */
const prepOut = await runTool(["prepare", WT, MAIN], 120_000);
if (prepOut.exitCode !== 0) {
  await notewriter.ask(
    `工作树依赖准备失败：${prepOut.stderr.slice(0, 300)}。请把 docs/evolution/STATE.md 的 phase 改为 stuck、last_result 写明该原因。`,
  );
  return {
    conclusion: `工作树依赖准备失败，未开工：${prepOut.stderr.slice(0, 200)}`,
    findings: [],
    verified: ["预检由脚本执行（产品改动扫描 / 连败熔断）"],
    notCovered: ["依赖未就位，未进入任何阶段"],
  };
}

/* 本轮所有相对路径都以工作树为根 */
const wtPath = (p: string) => `${WT}/${p}`;
/* 派给【工作树阶段】agent 的路径前缀（相对工作区根）。
   subagent 的文件工具（Read/Write/Edit）基准目录是工作区根，不是工作树——
   裸相对路径会把 PRD/SPEC/代码写到主干，隔离失效。故一律给完整前缀路径。 */
const WT_REL = `${WT_PARENT}/${BRANCH}`;
const wtRel = (p: string) => `${WT_REL}/${p}`;
const iterDir = `docs/evolution/iterations/${ITER}`;
const EVIDENCE_DIR = `${iterDir}/evidence`;
/* 本轮产物的固定落盘位置（不依赖 agent 返回值，避免路径歧义） */
const PRD_PATH = wtRel(`${iterDir}/PRD.md`);
const SPEC_PATH = wtRel(`${iterDir}/SPEC.md`);
const JOURNAL_PATH = wtRel(`${iterDir}/JOURNAL.md`);
const REPORT_PATH = wtRel(`${iterDir}/REPORT.md`);
const STATE_PATH = wtRel("docs/evolution/STATE.md");

phase("工作树基线门禁（起点健康度）");
/* 基线在工作树内跑：工作树是本轮真正的作业面，基线红 = 本轮起点已坏。
   放在工作树内还避免与并行路的合并窗口互相干扰（主干此刻可能正被另一路合并）。 */
{
  const baseBuild = await runTool(["run", WT, "npm", "run", "build"], 900_000);
  if (baseBuild.exitCode !== 0) {
    await runTool(["remove", MAIN, WT, BRANCH], 120_000);
    await notewriter.ask(
      `工作树基线 build 失败（迭代 ${ITER} 未开工）：${baseBuild.stdout.slice(-400)}${baseBuild.stderr.slice(0, 200)}。请把 docs/evolution/STATE.md 的 phase 改为 stuck、last_result 写明该原因。`,
    );
    return {
      conclusion: `迭代 ${ITER} 未开始（工作树基线 build 失败）：${baseBuild.stdout.slice(-200)}`,
      findings: [],
      verified: ["预检由脚本执行（产品改动扫描 / 连败熔断）"],
      notCovered: ["基线未绿，未进入任何阶段；工作树已清理"],
    };
  }
  const baseGate = await runTool(["run", WT, "npm", "run", "gate"], 900_000);
  if (baseGate.exitCode !== 0) {
    await runTool(["remove", MAIN, WT, BRANCH], 120_000);
    await notewriter.ask(
      `工作树基线像素门禁红（迭代 ${ITER} 未开工）：${baseGate.stdout.slice(-400)}。请把 docs/evolution/STATE.md 的 phase 改为 stuck、last_result 写明该原因。`,
    );
    return {
      conclusion: `迭代 ${ITER} 未开始（工作树基线像素门禁红）：${baseGate.stdout.slice(-200)}`,
      findings: [],
      verified: ["预检与工作树基线 build 由脚本执行且通过"],
      notCovered: ["基线未绿，未进入任何阶段；工作树已清理"],
    };
  }
  const baseTest = await runTool(["run", WT, "npm", "test"], 600_000);
  if (baseTest.exitCode !== 0) {
    await runTool(["remove", MAIN, WT, BRANCH], 120_000);
    await notewriter.ask(
      `工作树基线契约测试红（迭代 ${ITER} 未开工）：${baseTest.stdout.slice(-400)}。请把 docs/evolution/STATE.md 的 phase 改为 stuck、last_result 写明该原因。`,
    );
    return {
      conclusion: `迭代 ${ITER} 未开始（工作树基线契约测试红）：${baseTest.stdout.slice(-200)}`,
      findings: [],
      verified: ["预检与工作树基线 build/gate 由脚本执行且通过"],
      notCovered: ["基线未绿，未进入任何阶段；工作树已清理"],
    };
  }
  log(`工作树基线 build/gate/test 全绿，迭代 ${ITER} 开工`);
}

const notewriterWt = agent("协调·工作树记录员", {
  system:
    "你是 AgentFlow 进化工作流本轮迭代在隔离工作树内的记录员。先读 docs/evolution/WORKFLOW.md §5.4。只做被要求的状态文件更新，不改任何其他文件；**所有文件路径一律用带工作树前缀的完整路径（形如 .zcode/worktree/feat/<分支>/docs/...），裸相对路径会落到主干、必须避免**；做不到就 escalate 说明。",
});
await notewriterWt.ask(
  `本轮迭代号 ${ITER}，工作树根目录 ${WT_REL}。请把 ${STATE_PATH} 的 phase 改为 PLAN、iteration 改为 ${ITER}、item 填 -、started 与 updated 填当前时间、last_result 写「迭代 ${ITER} 已开工（工作树 ${BRANCH}）」。只改这一个文件（用上述完整路径，不要用裸相对路径）。`,
);

phase("GitHub issue 同步（用户输入与批复）");
type Issue = { number: number; title: string; labels: { name: string }[] };
const listOut = await runGh(["issue", "list", "--state", "open", "--limit", "50", "--json", "number,title,labels"]);
const issues: Issue[] = listOut.exitCode === 0 ? parseJson<Issue[]>(listOut.stdout, []) : [];
if (listOut.exitCode !== 0) log(`issue 面板拉取失败（本次心跳不带 issue 输入）：${listOut.stderr.slice(0, 200)}`);
const hasLabel = (it: Issue, name: string) => it.labels.some((l) => l.name === name);
const approvals: { number: number; title: string }[] = [];
const rejections: { number: number; title: string }[] = [];
for (const it of issues.filter((i) => hasLabel(i, "needs-approval"))) {
  const detail = await runGh(["issue", "view", String(it.number), "--json", "comments"]);
  const comments: { body: string }[] =
    detail.exitCode === 0 ? parseJson<{ comments?: { body: string }[] }>(detail.stdout, {}).comments ?? [] : [];
  const receipted = comments.some((c) => c.body.startsWith("🤖") && c.body.includes(`#${it.number} 已收到`));
  const lastUser = [...comments].reverse().find((c) => !c.body.startsWith("🤖"));
  /* \b 词边界对 CJK 不成立——0011/0020 两次漏检「批准」的根因，勿改回 \b */
  const verdict = lastUser
    ? /^\s*(?:批准|approve)(?:$|[\s，。,.!！)）])/i.test(lastUser.body)
      ? "approved"
      : /^\s*(?:驳回|reject)(?:$|[\s，。,.!！)）])/i.test(lastUser.body)
        ? "rejected"
        : ""
    : "";
  if (verdict === "" || receipted) continue;
  if (verdict === "rejected") {
    rejections.push({ number: it.number, title: it.title });
    await runGh([
      "issue",
      "close",
      String(it.number),
      "--comment",
      `🤖 #${it.number} 已收到驳回：项关闭（BACKLOG 对应行由本轮 PLAN 标记 skipped）。`,
    ]);
    log(`issue #${it.number} 用户驳回，已关单`);
  } else {
    approvals.push({ number: it.number, title: it.title });
    await runGh([
      "issue",
      "comment",
      String(it.number),
      "--body",
      `🤖 #${it.number} 已收到批准：进入实施通道（触 UI 项按修宪流程 ADR → 实现 → 同迭代重录 golden），完成时回执关单。`,
    ]);
    log(`issue #${it.number} 用户批准，进入修宪通道`);
  }
}

phase("侦察档案（脚本侧廉价采集，供 PLAN 判证）");
const grepOut = await runGit(["grep", "-nE", "not implemented|TODO|FIXME|XXX|HACK", "--", "apps", "packages"], 30_000);
const hangOut = await runNode(
  [
    "-e",
    "try{const db=require('better-sqlite3')('data/agentflow.db',{readonly:true});console.log(JSON.stringify(db.prepare('select * from runs where status = ?').all('running')).slice(0,1200))}catch(e){console.log('probe-failed:'+e.message)}",
  ],
  30_000,
);
const dossier = [
  `【残缺标记】git grep "not implemented|TODO|FIXME|XXX|HACK"（apps+packages）：\n${grepOut.stdout.slice(0, 2500) || "（无命中）"}`,
  `【悬挂 run】data/agentflow.db status=running 探针：\n${hangOut.stdout.slice(0, 1200)}`,
  `【issue 面板】${issues.map((i) => `#${i.number}[${i.labels.map((l) => l.name).join("/") || "无标签"}] ${i.title}`).join("；") || "（空）"}`,
  `【批复】approved：${approvals.map((a) => `#${a.number}`).join(",") || "无"}；rejected：${rejections.map((r) => `#${r.number}`).join(",") || "无"}`,
  "【覆盖差集 / 文档漂移 / dogfooding】治理日产物（weekly/ 与 BACKLOG 既有证据行），心跳不重复采集",
].join("\n\n");

const pm = agent("产品经理", {
  system:
    "你是 AgentFlow 进化工作流本轮迭代的产品经理。开工前按顺序读 .zcode/agents/product-manager.md（你的完整职责）、CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md、docs/evolution/POLICY.md。遵守宪法铁律：触 UI 的需求只能转 needs-approval issue（返回 uiIssueNumbers 或 ui_quarantined），绝不承诺实现。无法完成或有冲突时 escalate 说明。",
});

phase("选题与需求（产品经理）");
/* 选题占位互斥（v3 并行必需）：各路持有 BACKLOG 的独立副本，PM 可能选中同一项 →
   两路做同一件事，最终在产品代码上冲突。迭代号分配防「撞号」，本项占位防「撞项」。
   机制：PM 选题前先查已占项并排除；选题后原子占位（mkdir 即互斥），
   已被别的路占住则要求 PM 重选（≤2 次）。 */
const claimedOut = await runTool(["claimed-items"], 30_000);
const claimedItems = parseJson<string[]>(claimedOut.stdout, []);
const claimedNote =
  claimedItems.length > 0
    ? `\n\n【并行占用提示】以下 BACKLOG 项已被其他并行工作流占位，**本轮严禁选择**：${claimedItems.join("、")}`
    : "";

let plan: PlanResult;
let planRetried = 0;
let itemClaimFailed = false;
for (;;) {
  plan = await pm.ask<PlanResult>(
  `按 WORKFLOW.md §4 的 PLAN 契约（v2）为迭代 ${ITER} 选题。**本轮在隔离工作树中进行，工作树根目录是 ${WT_REL}（分支 ${BRANCH}）——所有文件读写一律使用带 ${WT_REL}/ 前缀的完整路径（例如 PRD 写到 ${PRD_PATH}），绝不要用裸相对路径（那会落到主干），更不要碰主干目录**。先读 ${WT_REL}/docs/evolution/BACKLOG.md、ROADMAP.md、metrics.md 与最近 3 个 ${WT_REL}/docs/evolution/iterations/ 目录，再读下方档案：\n\n${dossier}${claimedNote}\n\n规则：\n① 档案 approved 的 issue：BACKLOG 已有「来源=issue#N」行的不重复建行，仅解除该行备注所载的转 ready 门槛；无行的建 ready 行（优先级 P0，来源=issue#N，备注「已获用户 issue 批复」）。优先选已获批的 ready 项为本轮项（返回 sourceIssue）；所选项即使来源列非 issue#N、但系某获批 issue 解阻的（备注含「issue#N 获批/解阻」字样），同样返回 sourceIssue=N，且该 issue 名下还有未竟姊妹子项时返回 itemContinues=true（迭代 done 只发进度回执、全部子项终轮才不设）；reconstitutional=true 仅当所选项触 UI/需重录 golden（ui-proposal 或触UI=是），纯后端/等价重组织的批复项一律 reconstitutional=false（批复只解除 POLICY 需批准面，不构成修宪轮，禁止 gate:update 与 golden 重录）。\n② 档案中 user-request issue 且 BACKLOG 无「issue#N」来源行的：建 proposed 行（P1，来源=issue#N，大小按内容估）；其中触 UI 的不建行，返回 uiIssueNumbers 交脚本转待批准。选题时若选了来源为 issue#N 的项，同样返回 sourceIssue。\n③ 档案 rejected 的 issue：BACKLOG 对应行（若有）状态改 skipped、备注「用户 issue 驳回」。\n④ 常规选题：最高优先 ready 项（优先 S/M；类型 doc 本轮跳过——攒治理日批量处理，ready 全为 doc 时视同枯竭）；枯竭时仅可依侦察档案补题，每个新项必须挂可验证证据指针（文件:行 / 探针输出 / issue 链接），无证据不得立项；仍无候选则返回 outcome=noop（此时不写任何文件、不改 STATE）。\n⑤ 选题后：PRD 写入 ${PRD_PATH}（必含触UI 分类结论与 Given/When/Then 验收标准；S 项免 SPEC 时还须内嵌受影响文件清单与验收口径并返回 skipSpec=true）；把 ${STATE_PATH} 的 phase 改 PLAN、item 填所选 ID、started/updated 填当前时间。批次/分期编排未到终轮时返回 itemContinues=true 且 STATE.item 保持该 ID 跨迭代续填（终轮才置 done，来源 issue 才关单）。\n⑥ BACKLOG 常规项发现触 UI：状态改 pending-approval、备注「转 issue 待批准」，返回 outcome=ui_quarantined 与 uiReason（动机/影响面一句话）。`,
  );
  if (plan.outcome !== "selected") break;
  const claimOut = await runTool(["claim-item", plan.itemId], 30_000);
  if (claimOut.exitCode === 0) {
    log(`已占位 BACKLOG 项 ${plan.itemId}（并行互斥）`);
    break;
  }
  /* 撞项：该项已被另一路占位 → 要求 PM 重选 */
  planRetried += 1;
  if (planRetried > 2) {
    /* 重试耗尽：放弃本轮选题。
       注意——此处【绝不】调用 release-item：占位从未由本路创建成功，
       release 会删掉【另一路】的占位、导致两路同时做同一项（2026-10-25 实发缺陷）。 */
    itemClaimFailed = true;
    log(`选题 ${plan.itemId} 连续被并行工作流占位，重试耗尽，本轮放弃选题`);
    break;
  }
  log(`选题 ${plan.itemId} 已被并行工作流占位，要求产品经理重选（第 ${planRetried} 次）`);
  await pm.ask(
    `你上一轮选中的 ${plan.itemId} 已被另一并行工作流占位，本轮不能做它。请重新按规则④选下一个可做的 ready 项（跳过 ${plan.itemId}；当前被其他并行工作流占位、同样禁选的项有：${claimedItems.join("、") || "无"}），并按原契约把 PRD 写入 ${PRD_PATH}、更新 ${STATE_PATH}（item 字段务必改成新选的项）。若已无可选候选，返回 outcome=noop。`,
  );
}
report({ iteration: ITER, stage: "PLAN", item: plan.itemId, outcome: plan.outcome });
log(`选题完成：${plan.outcome} · ${plan.itemId} ${plan.title}`);

for (const n of plan.uiIssueNumbers ?? []) {
  await runGh(["issue", "edit", String(n), "--add-label", "needs-approval"]);
  await runGh([
    "issue",
    "comment",
    String(n),
    "--body",
    `🤖 #${n} 已收录：经评估触 UI 三层，转为待批准——批复「批准」进入修宪通道（ADR → 实现 → 重录 golden），「驳回」则关闭。`,
  ]);
}

/* 选题占位重试耗尽：本轮无可做项（ready 队列已被并行路占满）→ 不实现、
   丢弃工作树、主干只记一行。与 noop 同属「合法空转」，但需说明原因。 */
if (itemClaimFailed) {
  await runTool(["remove", MAIN, WT, BRANCH], 120_000);
  await notewriter.ask(
    `迭代 ${ITER} 未开工：候选 BACKLOG 项已被并行工作流占位，重试后仍无可选项（本轮合法空转）。请把 docs/evolution/STATE.md 的 last_result 改为一句话（含「并行路已占满 ready 队列，本轮空转」与占位项 ${plan.itemId}）、iteration 改为 ${ITER}、updated 填当前时间；不改其他字段。`,
  );
  const cfSweep = await git.status();
  if (cfSweep.unstaged.length + cfSweep.untracked.length > 0) {
    await world.run("git", ["add", "docs/evolution/STATE.md"]);
    await world.run("git", ["commit", "-m", `chore(evolution): 归档迭代 ${ITER}（并行占位空转）`]);
  }
  return {
    conclusion: `迭代 ${ITER} 合法空转：候选 BACKLOG 项（${plan.itemId}）已被并行工作流占位，重试耗尽后无可选项，本轮未实现、工作树已清理、主干未记账。`,
    findings: [],
    verified: ["开工基线由脚本执行（build/gate/test 全绿）", "选题占位互斥生效（撞项被检出并避让）"],
    notCovered: ["本轮无实现，无验收"],
  };
}

/* 空转/补题/触UI隔离：无产品改动，但 PLAN 可能在工作树内改了 BACKLOG。
   统一处理：工作树产物照常提交到特性分支并合回主干（保证 BACKLOG 行不丢），
   再由合并仲裁员在主干复测留证；空转轮（无任何文件改动）直接清理工作树收尾。 */
if (plan.outcome !== "selected") {
  if (plan.outcome === "noop") {
    /* 空转：PLAN 声明不写任何文件——直接清理工作树，主干只更新 STATE 一行 */
    await runTool(["remove", MAIN, WT, BRANCH], 120_000);
    await notewriter.ask(
      `本轮空转（WORKFLOW v2 空转合法，迭代号 ${ITER}）：把 docs/evolution/STATE.md 的 last_result 改为一句话（含侦察无带证据候选的结论与 ready 队列现状）、iteration 改为 ${ITER}、updated 填当前时间；不改其他字段、不写其他任何文件。`,
    );
    const noopSweep = await git.status();
    if (noopSweep.unstaged.length + noopSweep.untracked.length > 0) {
      await world.run("git", ["add", "docs/evolution/STATE.md"]);
      await world.run("git", ["commit", "-m", `chore(evolution): 归档迭代 ${ITER}（noop）`]);
    }
    return {
      conclusion: `迭代 ${ITER} 空转收尾：侦察无带证据候选，未立项、未产出迭代文档；基线 build/gate/test 由脚本执行且全绿，工作树已清理。`,
      findings: [],
      verified: ["开工基线由脚本执行（build/gate/test 全绿）"],
      notCovered: ["本轮无实现，无验收"],
    };
  }
  if (plan.outcome === "ui_quarantined") {
    const body = [
      "### 来源",
      `进化迭代 ${ITER} · PLAN 判定触 UI（${plan.itemId} ${plan.title}）。`,
      "",
      "### 提案",
      plan.uiReason ?? plan.title,
      "",
      "### 影响面",
      "触 UI 三层——修宪通道：批准后 ADR 入 docs/adr/ → 实现 → 同迭代重录 golden。",
      "",
      "### 怎么批复",
      "评论 **批准** 或 **驳回**（仅认 owner 本人；循环评论带 🤖 前缀）。",
    ].join("\n");
    const created = await runGh([
      "issue",
      "create",
      "--title",
      `【待批准】${plan.itemId} · ${plan.title}`,
      "--label",
      "needs-approval",
      "--body",
      body,
    ]);
    log(created.exitCode === 0 ? `触 UI 项已转 issue：${created.stdout.trim()}` : `issue 创建失败（BACKLOG 已标 pending-approval，治理日补开）：${created.stderr.slice(0, 200)}`);
  }
  /* 补题/触UI隔离：工作树内可能有 BACKLOG 改动 → 走提交+合并路径 */
  phase("工作树内归档提交（补题/触UI隔离）");
  const minorSt = parseJson<{ staged: string[]; unstaged: string[]; untracked: string[] }>(
    (await runTool(["status", WT])).stdout,
    { staged: [], unstaged: [], untracked: [] },
  );
  const minorChanged = [...minorSt.staged, ...minorSt.unstaged, ...minorSt.untracked];
  const minorDocs = minorChanged.filter((p) => p.startsWith("docs/evolution/") || p.startsWith("docs/adr/"));
  if (minorDocs.length > 0) {
    await runGit(["-C", WT, "add", ...minorDocs], 120_000);
    const minorCommit = await runGit(
      ["-C", WT, "commit", "-m", `chore(evolution): 迭代 ${ITER} 归档（${plan.outcome === "replenished" ? "补题" : "触UI隔离"}）`],
      300_000,
    );
    if (minorCommit.exitCode === 0) {
      log(`补题/触UI隔离轮：工作树归档提交完成（${minorDocs.length} 个机制件）`);
    } else {
      log(`补题/触UI隔离轮：工作树归档提交失败（${minorCommit.stderr.slice(0, 200)}）`);
    }
  }
  /* 交合并仲裁员把机制件并回主干并复测 */
  phase("合并仲裁（合并仲裁员合回主干）");
  const minorLock = await runTool(["lock", MERGE_LOCK, "--wait", "600000"], 660_000);
  if (minorLock.exitCode !== 0) {
    await notewriter.ask(
      `合并锁获取超时（另一路工作流正在合并主干），迭代 ${ITER} 的机制件留在分支 ${BRANCH}。请把 docs/evolution/STATE.md 的 phase 改为 idle、last_result 写「迭代 ${ITER} 机制件留在分支 ${BRANCH}，未并入主干」、updated 填当前时间；不要改其他字段。`,
    );
    return {
      conclusion: `迭代 ${ITER}（${plan.outcome === "replenished" ? "补题" : "触UI隔离"}）的机制件未并入主干（合并锁被占用），成果保留在分支 ${BRANCH}。`,
      findings: [],
      verified: ["开工基线由脚本执行（build/gate/test 全绿）"],
      notCovered: ["主干复测未执行（合并未发生）"],
    };
  }
  const minorArbiter = agent("合并仲裁员·机制件轮", {
    system:
      "你是 AgentFlow 进化工作流的合并仲裁员。先读 .zcode/agents/merge-arbiter.md（你的完整职责）、CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md、docs/evolution/POLICY.md。本轮是纯机制件变更（无产品代码），合并冲突仅限 docs/evolution/ 下的状态文件，按你的职责定义分类解决即可；产品代码冲突如出现则如实报告不得自行择一。复测必须实跑并留证，禁止伪造通过。",
  });
  const minorMerge = await minorArbiter.ask<MergeResult>(
    `把迭代 ${ITER}（${plan.itemId} ${plan.title}）的机制件变更从特性分支合回主干并完成主干复测。\n\n【上下文】\n- 主干目录：${MAIN}（分支 main）；特性分支：${BRANCH}\n- 本轮性质：纯机制件（docs/evolution 与 docs/adr），无产品代码改动\n- 迭代目录：${iterDir}（本轮可能没有该目录，属正常）\n\n【步骤】\n1. 确认主干工作区干净；不干净则不要强行合并，如实报告并停止。\n2. 在主干执行 git merge --no-ff ${BRANCH}；检出冲突并分类解决（STATE.md 以主干值为基线推进；metrics.md 两侧行都保留；BACKLOG.md 同 ID 取语义更靠后的状态）。\n3. 合并成功则提交（merge(evolution): 合并迭代 ${ITER} ${plan.title}），返回合并提交哈希与冲突清单。\n4. 主干复测：实跑 npm run build、npm run gate、npm test，逐项记录真实退出码。任一项红如实报告失败。\n5. 证据留档：日志写入 ${EVIDENCE_DIR}/（build.log、gate.log、test.log），图像证据用 \`node ${TOOLS} evidence apps/web/dist ${EVIDENCE_DIR}\` 采集；把合并结果、冲突处理、复测红绿、证据路径写入 ${iterDir}/MERGE.md（本轮无该目录则新建）。\n\n【返回】严格按字段返回：merged（布尔）、conflicts（字符串数组）、resolutions（字符串数组）、commit（字符串，可选）、retest（{build,gate,test,smoke} 四个布尔）、evidenceDir（字符串，可选）、blockedReason（字符串，可选）。`,
  );
  await runTool(["unlock", MERGE_LOCK], 30_000);
  await notewriter.ask(
    `迭代 ${ITER}（${plan.itemId} ${plan.title}）本轮为「${plan.outcome === "replenished" ? "补题" : "触UI隔离"}」，无实现、无产品提交。按 WORKFLOW.md §4 CLOSE 契约更新 docs/evolution/：metrics 追加一行（结果列填 ${plan.outcome}，主题列填所涉 ROADMAP 主题），BACKLOG 相应更新状态，STATE 的 phase=idle、iteration=${String(Number(ITER) + 1).padStart(4, "0")}、item=-、last_result 一句话、updated 当前时间。`,
  );
  const minorSweep = await git.status();
  if (minorSweep.unstaged.length + minorSweep.untracked.length > 0) {
    await world.run("git", ["add", "docs/evolution", "docs/adr"]);
    await world.run("git", ["commit", "-m", `chore(evolution): 归档迭代 ${ITER}（${plan.outcome}）`]);
  }
  await runTool(["remove", MAIN, WT, BRANCH], 120_000);
  return {
    conclusion: `迭代 ${ITER} 结束：${plan.outcome === "replenished" ? "backlog 已补充带证据新题（未实现）" : "触 UI 项已转 needs-approval issue，等待用户批复"}；机制件已并入主干并复测（merged=${minorMerge.merged}），工作树已清理。`,
    findings: [],
    verified: [
      "开工基线由脚本执行（build/gate/test 全绿）",
      `主干复测：build=${minorMerge.retest?.build ?? false} gate=${minorMerge.retest?.gate ?? false} test=${minorMerge.retest?.test ?? false}`,
    ],
    notCovered: ["本轮无产品实现，无产品验收"],
  };
}

const dev = agent("代码开发", {
  system:
    "你是 AgentFlow 进化工作流本轮迭代的代码开发。开工前按顺序读 .zcode/agents/code-developer.md（你的完整职责）、CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md。遵守宪法：未经用户批准（issue 批复或对话确认）的 UI 变更必须拒绝执行；修宪轮（用户已批准）按 SPEC 的 golden 重录方案执行。完整门禁与 git 提交由脚本在你之后统一执行，你不要自行运行。无法完成或有冲突时 escalate 说明，不要绕过或伪造。",
});
const tester = agent("测试经理", {
  system:
    "你是 AgentFlow 进化工作流本轮迭代的测试经理。开工前按顺序读 .zcode/agents/test-manager.md（你的完整职责）、CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md。结论必须有证据，禁止无证据的「通过」；无法验证时 escalate 说明。",
});

phase("规格设计（SPEC 设计师）");
let spec: SpecResult;
if (plan.skipSpec) {
  spec = {
    specPath: PRD_PATH,
    touchedPaths: [],
    acceptance: "PRD 内嵌验收口径（S 项免独立 SPEC，WORKFLOW v2）",
    needsAdr: false,
  };
  log("S 项免独立 SPEC：验收口径内嵌 PRD");
} else {
  const specDesigner = agent("SPEC 设计师", {
    system:
      "你是 AgentFlow 进化工作流本轮迭代的 SPEC 设计师。开工前按顺序读 .zcode/agents/spec-designer.md（你的完整职责）、CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md。规格与代码/宪法冲突时如实指出并 escalate，不得虚构未实现能力。",
  });
  spec = await specDesigner.ask<SpecResult>(
    `按 WORKFLOW.md §4 的 SPEC 契约处理迭代 ${ITER}（${plan.itemId} ${plan.title}）：**本轮在隔离工作树中进行，工作树根目录是 ${WT_REL}（分支 ${BRANCH}）——所有文件读写一律使用带 ${WT_REL}/ 前缀的完整路径（例如 SPEC 写到 ${SPEC_PATH}），绝不要用裸相对路径（那会落到主干）**。读 ${PRD_PATH} 与 ${WT_REL}/ 下的相关代码，把技术规格写入 ${SPEC_PATH}（必含受影响文件清单、模块边界、验收口径=npm run build / npm run gate / npm test + 手动 E2E 点位），并把 ${STATE_PATH} 的 phase 改为 SPEC。需要架构决策时在 ${WT_REL}/docs/adr/ 新建草案（编号顺延，标注「待用户批准」）并返回 needsAdr=true。${plan.reconstitutional ? "本迭代为修宪轮（用户已 issue 批准）：SPEC 必须含 golden 重录方案（重录范围与宪法第 3 条依据），ADR 标注「已获用户 issue #${plan.sourceIssue} 批复」。" : ""}`,
  );
}
log(`SPEC 完成：${spec.touchedPaths.length} 个受影响文件${spec.needsAdr ? "，含 ADR 草案" : ""}`);

let feedback = "";
let finalState: "passed" | "failed" | "blocked" = "blocked";
let commitMessage = "";
let summary = "";
let goldenReRecorded = false;
let builtProductFiles: string[] = [];

for (let round = 1; round <= 3; round += 1) {
  phase("实现与门禁（代码开发·工作树内）");
  const buildAsk =
    round === 1
      ? `按 WORKFLOW.md §4 的 BUILD 契约实现迭代 ${ITER}（${plan.itemId} ${plan.title}）：**本轮在隔离工作树中进行，工作树根目录是 ${WT_REL}（分支 ${BRANCH}）——所有文件读写与代码改动一律使用带 ${WT_REL}/ 前缀的完整路径（例如代码改 ${WT_REL}/apps/... 、${WT_REL}/packages/...），绝不要用裸相对路径（那会落到主干，主干保持干净是并行不冲突的前提）**。读 ${PRD_PATH} 与 ${plan.skipSpec ? PRD_PATH : SPEC_PATH}${plan.skipSpec ? "（S 项免 SPEC：受影响文件清单与验收口径内嵌 PRD）" : ""}，按受影响文件清单实现；把 ${STATE_PATH} 的 phase 改为 BUILD，过程写入 ${JOURNAL_PATH}。若需扩大影响面或发现未经批准的 UI 触及：立即停止改动并返回 blockedReason。完整门禁（build/gate/test${plan.reconstitutional ? "，含按 SPEC 方案重录 golden" : ""}）与 git 提交由脚本统一执行，你不要自行运行；若确需自测，请 cd 到 ${WT_REL} 后再执行命令。返回 productFiles=本轮实际改动/新增的产品文件清单（**相对工作树根**的路径，受影响文件白名单口径、含新增文件、不含 docs/evolution）——脚本只 add 该清单，清单外文件（如外部工具骨架）不得混入产品提交。`
      : `修复验收/门禁发现的问题后完成本轮（仍在工作树 ${WT_REL} 内操作，路径一律带 ${WT_REL}/ 前缀）：\n${feedback}\n更新 ${JOURNAL_PATH}；同样不要自行运行门禁或提交。`;
  const built = await dev.ask<BuildResult>(buildAsk);
  builtProductFiles = built.productFiles ?? [];
  if ((built.blockedReason ?? "") !== "") {
    finalState = "blocked";
    summary = built.blockedReason ?? "";
    break;
  }
  /* 门禁在工作树内执行（隔离：本轮改动必须在自己的树里自证） */
  const b = await runTool(["run", WT, "npm", "run", "build"], 900_000);
  if (b.exitCode !== 0) {
    feedback = `[门禁] 工作树内 build 失败：\n${b.stdout.slice(-600)}${b.stderr.slice(0, 400)}`;
    finalState = "failed";
    continue;
  }
  const g = await runTool(["run", WT, "npm", "run", "gate"], 900_000);
  if (g.exitCode !== 0) {
    if (plan.reconstitutional && !goldenReRecorded) {
      const redo = await runTool(["run", WT, "npm", "run", "gate:update"], 900_000);
      goldenReRecorded = redo.exitCode === 0;
      if (goldenReRecorded) {
        log("修宪轮：按宪法第 3 条（用户 issue 批复）在工作树内重录 golden 一次，复跑门禁");
        continue;
      }
      feedback = `[门禁] 修宪轮 gate:update 重录失败：\n${redo.stdout.slice(-600)}`;
      finalState = "failed";
      continue;
    }
    feedback = `[门禁] 工作树内像素门禁红（宪法违例，必须修复）：\n${g.stdout.slice(-600)}`;
    finalState = "failed";
    continue;
  }
  const t = await runTool(["run", WT, "npm", "test"], 600_000);
  if (t.exitCode !== 0) {
    feedback = `[门禁] 工作树内契约测试红：\n${t.stdout.slice(-600)}`;
    finalState = "failed";
    continue;
  }

  phase("验收（测试经理·工作树内）");
  const verify = await tester.ask<VerifyResult>(
    `按 WORKFLOW.md §4 的 VERIFY 契约验收迭代 ${ITER}（${plan.itemId} ${plan.title}）：**验收在隔离工作树 ${WT_REL}（分支 ${BRANCH}）内进行，所有文件读写一律使用带 ${WT_REL}/ 前缀的完整路径，绝不要用裸相对路径（那会落到主干）**。逐条执行 ${PRD_PATH} 的 Given/When/Then 与 ${plan.skipSpec ? PRD_PATH : SPEC_PATH} 的验收口径${plan.skipSpec ? "（S 项：验收口径内嵌 PRD）" : ""}，并做交互回归抽查；把验收报告写入 ${REPORT_PATH}（结论与证据必备），并把 ${STATE_PATH} 的 phase 改为 VERIFY。注意：build/gate/test 已由脚本在工作树内运行且通过，不要重复跑全套；针对性 E2E 按你的职责执行，若要跑命令请先 cd 到 ${WT_REL}。`,
  );
  report({ iteration: ITER, stage: "VERIFY", round, verdict: verify.verdict, bugs: verify.bugs.length });
  if (verify.verdict === "PASS") {
    finalState = "passed";
    commitMessage = built.commitMessage;
    summary = built.summary;
    break;
  }
  feedback = verify.bugs.join("\n");
  finalState = "failed";
}

phase("特性分支提交（工作树内）");
/* 工作树内只提交「本轮产物 + 过程性机制件」：
   - 迭代产物（PRD/SPEC/JOURNAL/REPORT）与 BACKLOG 的过程改动 → 必须随分支合回主干
   - STATE.md 与 metrics.md 的【最终记账】不在工作树做：终态取决于主干复测结果，
     合并前无法确定；放到合并后由主干侧统一记账（锁内），既避免 STATE 冲突，
     也避免并行路在主干抢索引。 */
const nextIter = String(Number(ITER) + 1).padStart(4, "0");
let branchCommit = "";
if (finalState === "passed") {
  const stOut = await runTool(["status", WT]);
  const st = parseJson<{ staged: string[]; unstaged: string[]; untracked: string[] }>(stOut.stdout, {
    staged: [],
    unstaged: [],
    untracked: [],
  });
  const changed = [...st.staged, ...st.unstaged, ...st.untracked];
  /* 只进 BUILD 申报的 productFiles 白名单（0021 实发：openspec/ 外部骨架曾被全量收口卷进产品提交） */
  const whitelist = builtProductFiles.filter((p) => p !== "" && !p.startsWith("docs/evolution/"));
  const productPaths = whitelist.length > 0 ? whitelist.filter((p) => changed.includes(p)) : changed.filter((p) => !p.startsWith("docs/evolution/"));
  if (whitelist.length === 0) log("警告：BUILD 未返回 productFiles，退回全量非 docs/evolution 收口（可能混入外部文件）");
  const extras = changed.filter((p) => !p.startsWith("docs/evolution/") && !productPaths.includes(p));
  if (extras.length > 0) log(`白名单外改动不进产品提交（留在工作树）：${extras.join("、")}`);
  if (productPaths.length === 0) {
    finalState = "blocked";
    summary = "防打转校验：产品提交为空（docs/evolution 之外无任何改动），不予提交";
  } else {
    const addOut = await runGit(["-C", WT, "add", ...productPaths], 120_000);
    if (addOut.exitCode !== 0) {
      finalState = "failed";
      summary = `git add 失败：${addOut.stderr.slice(0, 300)}`;
    } else {
      const commitOut = await runGit(["-C", WT, "commit", "-m", commitMessage], 300_000);
      if (commitOut.exitCode === 0) {
        const shaOut = await runGit(["-C", WT, "rev-parse", "HEAD"]);
        branchCommit = shaOut.stdout.trim();
        log(`特性分支产品提交完成：${commitMessage}（${branchCommit.slice(0, 8)}）`);
      } else {
        finalState = "failed";
        summary = `提交被拒（钩子拦截或仓库规则）：${commitOut.stdout.slice(0, 300)}${commitOut.stderr.slice(0, 300)}`;
      }
    }
  }
}
/* 机制件提交：本轮迭代产物（PRD/SPEC/JOURNAL/REPORT）+ 收尾的状态/度量更新
   必须随分支合回主干——否则合并后主干拿不到本轮任何文档。
   （与产品提交分开成两个 commit：Conventional Commits 一个提交只做一件事） */
if (finalState === "passed") {
  const st2 = parseJson<{ staged: string[]; unstaged: string[]; untracked: string[] }>(
    (await runTool(["status", WT])).stdout,
    { staged: [], unstaged: [], untracked: [] },
  );
  const changed2 = [...st2.staged, ...st2.unstaged, ...st2.untracked];
  /* STATE.md 与 metrics.md 排除：最终记账在合并复测后由主干侧统一做（见下方「主干最终记账」段） */
  const docPaths = changed2.filter(
    (p) =>
      (p.startsWith(`docs/evolution/iterations/${ITER}/`) ||
        p.startsWith("docs/adr/") ||
        p === "docs/evolution/BACKLOG.md"),
  );
  if (docPaths.length > 0) {
    await runGit(["-C", WT, "add", ...docPaths], 120_000);
    const docCommit = await runGit(
      ["-C", WT, "commit", "-m", `docs(evolution): 归档迭代 ${ITER} 产物与机制件`],
      300_000,
    );
    if (docCommit.exitCode === 0) {
      log(`迭代产物与机制件提交完成（${docPaths.length} 个文件）`);
    } else {
      finalState = "failed";
      summary = `迭代产物提交被拒：${docCommit.stdout.slice(0, 300)}${docCommit.stderr.slice(0, 300)}`;
    }
  } else {
    log("警告：迭代产物目录无待提交文件（PRD/SPEC/REPORT 是否已落盘需人工核对）");
  }
}
if (finalState !== "passed") {
  /* 回滚：工作树整体丢弃（隔离模型下无需逐文件清理——分支未提交，主干零影响） */
  const resetOut = await runGit(["-C", WT, "reset", "--hard", "HEAD"], 120_000);
  const cleanOut = await runGit(["-C", WT, "clean", "-fd"], 120_000);
  if (resetOut.exitCode !== 0 || cleanOut.exitCode !== 0) {
    log("警告：工作树清理未完全成功，需人工检查");
  }
}

phase("合并仲裁（合并仲裁员合回主干）");
/* 合并锁：多路工作流同时完成时，主干合并串行化，避免同时写主干索引 */
const lockOut = await runTool(["lock", MERGE_LOCK, "--wait", "600000"], 660_000);
if (lockOut.exitCode !== 0) {
  const arbiterBlocked = agent("协调·合并仲裁", {
    system:
      "你是 AgentFlow 进化工作流的合并仲裁协调员。先读 docs/evolution/WORKFLOW.md §4 CLOSE 契约与 docs/evolution/POLICY.md。只做被要求的状态文件更新，不改任何其他文件。",
  });
  await arbiterBlocked.ask(
    `合并锁获取超时（另一路工作流正在合并主干）。请把 docs/evolution/STATE.md 的 phase 改为 idle、last_result 写「迭代 ${ITER} 成果已留在分支 ${BRANCH}，因主干合并锁占用未并入」、updated 填当前时间；不要改其他字段。`,
  );
  /* 有意保留选题占位：本轮成果仍在分支待合并，该项仍在进行中——释放会让另一路
     选中同一项、两边都改同一处代码。占位随分支合并后由下一轮释放。 */
  return {
    conclusion: `迭代 ${ITER} 实现与验收已完成（分支 ${BRANCH}），但主干合并锁被其他工作流占用，未能并入主干；成果保留在分支与工作树中，待下一轮合并。`,
    findings: [],
    verified: ["工作树内门禁（build/gate/test）与验收由脚本与测试经理执行"],
    notCovered: ["未在主干执行端到端复测（合并未发生）"],
  };
}

const arbiter = agent("合并仲裁员", {
  system:
    "你是 AgentFlow 进化工作流的合并仲裁员。先读 .zcode/agents/merge-arbiter.md（你的完整职责）、CONSTITUTION.md、AGENTS.md、docs/evolution/WORKFLOW.md、docs/evolution/POLICY.md。合并与冲突解决必须按你的职责定义分类处理；产品代码冲突不得自行择一，如实报告交用户裁决。复测必须实跑并留证，禁止伪造通过。",
});

const merge = await arbiter.ask<MergeResult>(
  `把本轮迭代 ${ITER}（${plan.itemId} ${plan.title}）的成果从特性分支合回主干，并完成主干端到端复测与证据留档。

【上下文】
- 主干目录（你的工作目录）：${MAIN}（仓库根，分支 main）
- 特性分支：${BRANCH}
- 迭代目录（工作树内，相对主干）：${iterDir}
- 本轮提交信息：${commitMessage || "（无，本轮未提交）"}
- 验收报告：${iterDir}/REPORT.md（若存在）
- 本轮是否修宪轮（允许一次 golden 重录）：${plan.reconstitutional === true ? "是" : "否"}（否 = 禁止 gate:update）

【步骤】
1. 确认主干工作区干净（git status）；有未提交改动则不要强行合并，如实报告并停止。
2. 在主干执行合并（git merge --no-ff ${BRANCH}）。检出冲突文件并按你的职责定义分类解决：STATE.md 以主干值为基线推进本轮状态；metrics.md 两侧行都保留；BACKLOG.md 同 ID 取语义更靠后的状态；docs/evolution/iterations/** 保留更完整一侧；apps/ packages/ tools/ tests/ 下的产品代码冲突不得自行择一——如实报告冲突文件与两侧差异，停止合并交用户裁决。
3. 合并成功则提交（merge(evolution): 合并迭代 ${ITER} ${plan.title}），返回合并提交哈希与冲突清单及解决方式。
4. 主干端到端复测：依次实跑 npm run build、npm run gate、npm test、npm run smoke:server，逐项记录真实退出码与关键输出。任一项红如实报告失败，不要放宽门禁、不要为变绿而重录 golden。
5. 证据留档：日志写入 ${EVIDENCE_DIR}/（build.log、gate.log、test.log、smoke.log），图像证据用脚本采集——在主干执行 \`node ${TOOLS} evidence apps/web/dist ${EVIDENCE_DIR}\`（产出 4 张确定性截图与 manifest.json）。然后把合并结果、冲突清单与处理方式、复测四项红绿、证据路径写入 ${iterDir}/MERGE.md。

【返回】严格按字段返回：merged（本轮是否已成功并回主干并提交）、conflicts（检出的冲突文件数组）、resolutions（每条冲突的处理说明数组）、commit（合并提交哈希，可选）、retest（{build,gate,test,smoke} 四个布尔）、evidenceDir（证据目录路径，可选）、blockedReason（无法完成的原因，可选）。`,
);
report({
  iteration: ITER,
  stage: "MERGE",
  merged: merge.merged,
  conflicts: merge.conflicts.length,
  retest: merge.retest ?? null,
});

await runTool(["unlock", MERGE_LOCK], 30_000);

if (!merge.merged) {
phase("合并受阻收尾（成果保留在分支）");
/* 同上：成果保留在分支待用户裁决，选题占位有意保留（该项仍在进行中） */
await notewriter.ask(
    `迭代 ${ITER} 成果未并入主干（${merge.blockedReason ?? "合并受阻"}）。请把 docs/evolution/STATE.md 的 phase 改为 idle、iteration 保持 ${ITER}、item 填 ${plan.itemId}、last_result 写「迭代 ${ITER} 成果留在分支 ${BRANCH}（${merge.blockedReason ?? "合并受阻"}），未并入主干」、updated 填当前时间；不要改其他字段。`,
  );
  const sweep = await git.status();
  if (sweep.unstaged.length + sweep.untracked.length > 0) {
    await world.run("git", ["add", "docs/evolution/STATE.md"]);
    await world.run("git", ["commit", "-m", `chore(evolution): 归档迭代 ${ITER}（合并受阻）`]);
  }
  return {
    conclusion: `迭代 ${ITER}（${plan.itemId} ${plan.title}）实现与验收通过，但合并受阻未并入主干：${merge.blockedReason ?? "原因未提供"}；成果保留在分支 ${BRANCH} 与工作树 ${WT}。`,
    findings: merge.conflicts.map((c) => ({
      where: c,
      what: "合并冲突文件，未自行择一解决",
      evidence: "合并仲裁员检出并如实报告，等用户裁决",
      status: "unconfirmed" as const,
      severity: "high" as const,
    })),
    verified: ["工作树内门禁（build/gate/test）与验收由脚本与测试经理执行"],
    notCovered: ["主干端到端复测未执行（合并未完成）"],
  };
}

phase("主干复测与证据核验");
/* 合并仲裁员已实跑复测；脚本独立复核证据文件是否落盘（防止口头声称通过） */
const evOut = await runTool(["read", wtPath(`${EVIDENCE_DIR}/manifest.json`)], 30_000);
const evidenceOk = evOut.exitCode === 0 && evOut.stdout.includes("scenes");
const retest = merge.retest ?? { build: false, gate: false, test: false, smoke: false };
const retestOk = retest.build && retest.gate && retest.test && retest.smoke;
/* 终态三要素：工作树内门禁与验收 + 主干复测四项 + 证据落盘 */
const outcomeText =
  finalState === "passed" ? (retestOk && evidenceOk ? "done" : "failed") : finalState === "failed" ? "failed" : "blocked";
log(`主干复测：build=${retest.build} gate=${retest.gate} test=${retest.test} smoke=${retest.smoke}；证据落盘=${evidenceOk}；终态=${outcomeText}`);

phase("主干最终记账（状态、度量与 BACKLOG）");
/* 终态取决于主干复测结果，故最终记账必须在【合并复测之后】做，且在合并锁内执行
   （并行路同时改主干会抢索引）。STATE/metrics/BACKLOG 由此处统一推进。 */
const bookLock = await runTool(["lock", MERGE_LOCK, "--wait", "600000"], 660_000);
if (bookLock.exitCode === 0) {
  const archivist = agent("协调·归档员", {
    system:
      "你是 AgentFlow 进化工作流的归档协调员。先读 docs/evolution/WORKFLOW.md（§3 文件契约与 §4 CLOSE 契约）。只更新 docs/evolution/ 下的状态文件，不改任何其他文件；字段与格式必须与契约一致；做不到就 escalate 说明。",
  });
  await archivist.ask(
    `迭代 ${ITER}（${plan.itemId} ${plan.title}）终态=${outcomeText}。${
      finalState === "passed"
        ? `产品提交「${commitMessage}」已并入主干（合并提交 ${merge.commit ?? "未记录"}）；${summary}`
        : finalState === "failed"
          ? `修复循环耗尽或门禁未过。失败要点：${feedback.slice(0, 400)}`
          : `实现中止：${summary}`
    }。主干复测结果 build=${retest.build} gate=${retest.gate} test=${retest.test} smoke=${retest.smoke}；证据目录 ${EVIDENCE_DIR}（落盘=${evidenceOk}）。按 WORKFLOW.md §4 CLOSE 契约更新主干上的 docs/evolution/：BACKLOG 项状态改为 ${outcomeText}（failed 时把失败要点写入备注）、metrics 追加一行（结果=${outcomeText}，gate/test 列按本轮实际填写，主题列填该项来源主题，行数±用 git 实查）、STATE 的 phase=idle、iteration=${nextIter}、item=-、repair_round=0、last_result 一句话（须含主干复测结果与证据路径）、updated 当前时间。`,
  );
  const bookSt = await git.status();
  const bookPaths = [...bookSt.unstaged, ...bookSt.untracked].filter(
    (p) => p.startsWith("docs/evolution/") && !p.startsWith(`docs/evolution/iterations/${ITER}/`),
  );
  if (bookPaths.length > 0) {
    await world.run("git", ["add", ...bookPaths]);
    await world.run("git", ["commit", "-m", `chore(evolution): 归档迭代 ${ITER}（${outcomeText}）`]);
  }
  await runTool(["unlock", MERGE_LOCK], 30_000);
} else {
  log("提示：最终记账未取得合并锁（并行路正在合并），本轮记账待下一轮补做");
}

phase("主干收尾（issue 回执与证据提交）");
if (plan.sourceIssue) {
  if (outcomeText === "done" && plan.itemContinues === true) {
    await runGh([
      "issue",
      "comment",
      String(plan.sourceIssue),
      "--body",
      `🤖 #${plan.sourceIssue} 批次推进：迭代 ${ITER} PASS（${summary}，产品提交「${commitMessage}」，已并入主干）。条目批次未竟（STATE.item 续填 ${plan.itemId}），终轮完成才关单。验收证据见 ${iterDir}/REPORT.md 与 ${iterDir}/MERGE.md`,
    ]);
  } else if (outcomeText === "done") {
    await runGh([
      "issue",
      "close",
      String(plan.sourceIssue),
      "--comment",
      `🤖 #${plan.sourceIssue} 已完成：${summary}（产品提交「${commitMessage}」，已并入主干）。验收与复测证据见 ${iterDir}/REPORT.md 与 ${iterDir}/MERGE.md`,
    ]);
  } else {
    await runGh([
      "issue",
      "comment",
      String(plan.sourceIssue),
      "--body",
      `🤖 #${plan.sourceIssue} 本轮终态 ${outcomeText}（${summary.slice(0, 200)}），issue 保持开放待下轮重试或用户处置。`,
    ]);
  }
}

/* 合并仲裁员在主干写了 MERGE.md 与证据目录 → 提交这些产物（锁内，避免与并行路抢索引） */
const postLock = await runTool(["lock", MERGE_LOCK, "--wait", "600000"], 660_000);
if (postLock.exitCode === 0) {
  const postSt = await git.status();
  const postPaths = [...postSt.unstaged, ...postSt.untracked].filter((p) =>
    p.startsWith(`docs/evolution/iterations/${ITER}/`),
  );
  if (postPaths.length > 0) {
    await world.run("git", ["add", ...postPaths]);
    await world.run("git", ["commit", "-m", `docs(evolution): 迭代 ${ITER} 合并复测证据`]);
  } else {
    log("提示：主干无待提交的证据产物（可能已随合并提交或未落盘）");
  }
  await runTool(["unlock", MERGE_LOCK], 30_000);
} else {
  log("提示：证据提交未取得合并锁，证据产物留待人工提交");
}

/* 工作树清理：分支已并入主干，移除工作树与分支 */
await runTool(["remove", MAIN, WT, BRANCH], 120_000);
/* 释放选题占位：本轮已收尾，该项可被后续迭代再选（撞项互斥的持有期 = 迭代在途期） */
if (plan.outcome === "selected") {
  await runTool(["release-item", plan.itemId], 30_000);
}

await artifact.markdown(
  "iteration-report",
  [
    `# 进化迭代 ${ITER}：${plan.title}`,
    "",
    `- 项：${plan.itemId}（${plan.title}）${plan.sourceIssue ? ` · 来源 issue #${plan.sourceIssue}` : ""}`,
    `- 终态：${outcomeText}${goldenReRecorded ? "（修宪轮：golden 已重录）" : ""}`,
    finalState === "passed" ? `- 产品提交：${commitMessage}` : `- 未提交：${feedback.slice(0, 200)}`,
    `- 分支与合并：${BRANCH}${merge.commit ? ` → 主干 ${merge.commit.slice(0, 8)}` : ""}${merge.conflicts.length > 0 ? ` · 冲突 ${merge.conflicts.length} 处` : " · 无冲突"}`,
    `- 主干复测：build=${retest.build} gate=${retest.gate} test=${retest.test} smoke=${retest.smoke}`,
    `- 证据：${EVIDENCE_DIR}/（日志 + 图像，落盘=${evidenceOk}）`,
    `- 明细：${iterDir}/（${plan.skipSpec ? "PRD（含内嵌验收）/REPORT/JOURNAL/MERGE" : "PRD / SPEC / REPORT / JOURNAL / MERGE"}）`,
    "",
    "## 摘要",
    summary,
    "",
    "## 冲突处理",
    merge.resolutions.length > 0 ? merge.resolutions.join("\n") : "（无冲突）",
  ].join("\n"),
  {
    title: (() => {
      const prefix = `迭代 ${ITER}：`;
      const suffix = ` · ${outcomeText}`;
      const max = 120 - prefix.length - suffix.length;
      const body = plan.title.length <= max ? plan.title : plan.title.slice(0, max - 1) + "…";
      return prefix + body + suffix;
    })(),
    description: "本轮进化迭代的结论、合并与主干复测证据索引。",
    primary: true,
  },
);

return {
  conclusion: `迭代 ${ITER}（${plan.itemId} ${plan.title}）${
    outcomeText === "done"
      ? "已完成：在隔离工作树实现、验收通过、合并回主干，主干端到端复测四项全绿并留下日志与图像证据"
      : outcomeText === "failed"
        ? "失败：工作树内门禁或主干复测未过，成果已按契约处理"
        : "中止（blocked）：实现中止，成果保留在分支待人工处理"
  }。`,
  findings: merge.conflicts.map((c) => ({
    where: c,
    what: "本轮合并检出并解决的冲突文件",
    evidence: merge.resolutions.join("；").slice(0, 500),
    status: "verified" as const,
    severity: "medium" as const,
  })),
  verified: [
    "开工基线门禁（npm run build / npm run gate / npm test）在隔离工作树内执行并全绿",
    `工作树内门禁（build/gate/test）与验收在隔离工作树 ${WT} 内执行`,
    `主干端到端复测：build=${retest.build} gate=${retest.gate} test=${retest.test} smoke=${retest.smoke}（由合并仲裁员实跑）`,
    evidenceOk ? `图像与日志证据已落盘：${EVIDENCE_DIR}/` : "证据目录未落盘（已如实标记）",
  ],
  notCovered: [
    merge.conflicts.length > 0 ? "冲突涉及的语义取舍需人工复核" : "无冲突需仲裁事项",
    "推送远端与 CI 的 ui-constitution 权威验证未纳入本工作流（由协调者按需触发）",
  ],
};
