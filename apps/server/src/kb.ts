/* ================================================================
 *  kb.ts — 内置知识库（真实本地语料 + bigram TF-IDF 余弦检索）
 *  三个知识库与前端下拉一致：产品手册 v2.3 / FAQ-售前 / 工单历史 2026
 *  检索为确定性真实计算（非随机模拟），中文按二字组切分
 * ================================================================ */

const KB: Record<string, { src: string; text: string }[]> = {
  '产品手册 v2.3': [
    { src:'退货政策 §2.1', text:'商品自签收之日起 7 天内可申请无理由退货，需保持商品及包装完好、不影响二次销售；定制类商品与贴身衣物不支持无理由退货。' },
    { src:'退货政策 §2.3', text:'超过 7 天且在保修期（整机 1 年、主要部件 2 年）内出现质量问题，可凭订单号在「我的-售后」发起售后工单，由质检确认后办理退换或维修。' },
    { src:'退货政策 §2.5', text:'退货退款将在质检通过后 3 个工作日内原路退回；优惠券与积分抵扣部分将按原比例退回，运费险可抵扣首重运费。' },
    { src:'配送说明 §1', text:'现货商品 48 小时内发货，偏远地区追加 1-2 天；支持顺丰加急（补差价 15 元），大件商品由第三方物流配送并送上楼。' },
    { src:'配送说明 §3', text:'订单可在发货前在「我的订单」中修改收货地址；发货后修改需联系客服拦截，拦截不成功将以到付形式转寄。' },
    { src:'会员制度 §1', text:'会员分普通/白银/黄金/黑金四级，按近 365 天消费额自动升级；黄金会员享 95 折与专属客服，黑金会员另享生日礼与新品优先购。' },
    { src:'发票制度 §2', text:'支持电子普票与增值税专票，下单后 90 天内可在订单详情申请开票；专票需提供完整开票信息，1 个工作日内开出。' },
    { src:'支付方式 §1', text:'支持微信支付、支付宝、云闪付及主流银行卡；单笔满 5000 元支持三期免息分期，大额订单可对公转账。' },
    { src:'质保服务 §4', text:'主机保修 1 年，电池、充电器等易损件保修 6 个月；人为损坏、进水、私自拆机不在保修范围内，可付费维修。' },
    { src:'账号安全 §3', text:'账号异地登录会触发短信验证；忘记密码可通过绑定手机号或邮箱找回，连续 5 次输错将锁定 30 分钟。' },
    { src:'价格保护 §1', text:'下单后 7 天内商品降价，可申请价保退还差价（以支付口径为准）；百亿补贴、秒杀与赠品活动不参与价保。' },
    { src:'以旧换新 §2', text:'手机、平板、笔记本支持以旧换新，旧机估价在收货质检后 24 小时内到账为新机代金券，加价补贴活动可叠加。' },
  ],
  'FAQ-售前': [
    { src:'FAQ-价格', text:'问：现在有什么优惠？答：新人首单立减 20 元，页面领券可叠加满 300 减 40；以商品详情页展示的活动为准。' },
    { src:'FAQ-库存', text:'问：什么时候有货？答：缺货商品可点击「到货通知」，补货后第一时间短信提醒；预售商品按页面标注的发货时间发货。' },
    { src:'FAQ-规格', text:'问：两款型号有什么区别？答：Pro 版处理器升级、内存翻倍并支持快充；标准版性价比更高，日常使用差异不大。' },
    { src:'FAQ-支付', text:'问：可以分期吗？答：单笔满 5000 元支持 3 期免息，结账页选择分期方式即可；学生认证用户另有专属分期额度。' },
    { src:'FAQ-发货', text:'问：多久发货？答：现货 48 小时内发出，预售与定制商品以详情页标注为准，发货后有短信与物流跟踪。' },
    { src:'FAQ-正品', text:'问：是正品吗？答：平台自营与品牌旗舰店均为品牌直供，支持官方验货；假一赔十。' },
    { src:'FAQ-线下', text:'问：有线下门店吗？答：全国 32 家体验店可在App「门店」页查询，线上下单可选择门店自提。' },
    { src:'FAQ-企业采购', text:'问：企业采购有优惠吗？答：企业认证后享批量阶梯价与月结账期，50 台以上可联系大客户经理定制方案。' },
  ],
  '工单历史 2026': [
    { src:'工单 #8817 · 已解决', text:'用户反馈无法修改收货地址：订单已发货，客服发起物流拦截成功，商品退回后重新下单，运费由平台承担。' },
    { src:'工单 #8842 · 已解决', text:'用户反馈退款未到账：云闪付渠道退款周期较长，财务核查后第 4 个工作日原路退回，已短信告知用户。' },
    { src:'工单 #8903 · 已解决', text:'用户反馈商品质量问题（无法开机）：质检确认属保修范围，安排上门取件换新，48 小时内完成。' },
    { src:'工单 #8956 · 已解决', text:'用户投诉价保被拒：订单使用了百亿补贴券不符合价保规则，客服解释后赠送 50 元无门槛券安抚。' },
    { src:'工单 #9012 · 已解决', text:'用户询问发票抬头修改：电子普票在 90 天内可在订单详情自行红冲重开，已引导用户操作完成。' },
    { src:'工单 #9067 · 已解决', text:'会员等级未升级问题：系统按近 365 天消费额次日刷新，用户消费跨月未计入，已手动校正并补发权益。' },
  ],
};

/* ---------- 切词：拉丁词 + CJK 二字组 ---------- */
function terms(text: unknown): string[] {
  const out: string[] = [];
  const s = String(text ?? '');
  const latin = s.toLowerCase().match(/[a-z0-9]+/g) || [];
  out.push(...latin);
  const cjk = s.match(/[\u4e00-\u9fa5]+/g) || [];
  for(const seg of cjk){
    if(seg.length === 1) out.push(seg);
    for(let i=0; i<seg.length-1; i++) out.push(seg.slice(i, i+2));
  }
  return out;
}

/* ---------- 索引（启动时构建一次） ---------- */
type DocVec = { vec: Map<string, number>; norm: number; src: string; text: string };
const index = new Map<string, DocVec[]>(); // kbName -> [{vec, norm, src, text}]
for(const [name, docs] of Object.entries(KB)){
  const df = new Map<string, number>();
  const docVecs = docs.map(d=>{
    const vec = new Map<string, number>();
    for(const t of terms(d.text)) vec.set(t, (vec.get(t) || 0)+1);
    for(const t of vec.keys()) df.set(t, (df.get(t) || 0)+1);
    return { vec, src:d.src, text:d.text };
  });
  const N = docs.length;
  index.set(name, docVecs.map(d=>{
    const vec = new Map<string, number>();
    let norm = 0;
    for(const [t,tf] of d.vec){
      const idf = Math.log(1 + N/(df.get(t) || 1));
      const w = (1+Math.log(tf)) * idf;
      vec.set(t, w); norm += w*w;
    }
    return { vec, norm:Math.sqrt(norm)||1, src:d.src, text:d.text };
  }));
}

/* ---------- 检索 ---------- */
export function retrieve(kbName: string, query: string, topK = 3, threshold = 0.05){
  const docs = index.get(kbName) || index.get('产品手册 v2.3') || [];
  const qTerms = terms(query);
  if(!qTerms.length) return [];
  const qVec = new Map<string, number>();
  for(const t of qTerms) qVec.set(t, (qVec.get(t) || 0)+1);
  let qNorm = 0;
  for(const [t,tf] of qVec){ const w = 1+Math.log(tf); qVec.set(t,w); qNorm += w*w; }
  qNorm = Math.sqrt(qNorm)||1;
  const scored = docs.map(d=>{
    let dot = 0;
    for(const [t,w] of qVec){ const dw = d.vec.get(t); if(dw) dot += w*dw; }
    return { score:+(dot/(qNorm*d.norm)).toFixed(4), src:d.src, text:d.text };
  }).filter(r=>r.score >= threshold).sort((a,b)=>b.score-a.score);
  return scored.slice(0, Math.max(1, topK|0));
}

export function kbNames(): string[] { return Object.keys(KB); }
