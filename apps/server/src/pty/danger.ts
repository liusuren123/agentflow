/* ================================================================
 *  danger.ts — PTY 危险命令只读模式清单（ADR-0014 §3.3 案 a · 迭代 0055 / BK-0044）
 *  仅警示 + 审计，不拦截：命中固定清单族 → warn 帧 + pino warn + 审计
 *  danger 标记位，写入照常透传 PTY。拦截清单/白名单模式为 ADR-0014
 *  §3.3 b/c 否决案（伪安全），本模块不存在任何「拒绝写入」分支；
 *  v1 清单为固定字面量族，不做配置化（配置面扩大属新决策，不在本轮授权内）。
 * ================================================================ */

export const DANGER_PATTERNS: readonly { re: RegExp; desc: string }[] = [
  { re: /\brm\s+[^&|;]*?-[a-z]*r[a-z]*f/i, desc: 'rm -rf 递归强删族' },
  { re: /\bmkfs(\.\w+)?\b/i, desc: 'mkfs 格式化' },
  { re: /\b(shutdown|reboot|halt|poweroff)\b/i, desc: '关机/重启族' },
  { re: /\bdd\s+[^&|;]*of=\/dev\/(sd|nvme|disk)/i, desc: 'dd 裸写块设备' },
  { re: /\bformat\s+[a-z]:/i, desc: 'Windows format 盘符' },
];

/** 命中返回首个模式描述，否则 null（只读扫描，无副作用） */
export function scanDangerous(data: string): string | null {
  for(const p of DANGER_PATTERNS){
    if(p.re.test(data)) return p.desc;
  }
  return null;
}
