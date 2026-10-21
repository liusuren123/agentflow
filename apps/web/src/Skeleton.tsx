/* ================================================================
 *  Skeleton.tsx — 静态骨架的等价 JSX（ADR-0002 CP-C）
 *  由 skeleton.html 机械转换（该文件使命结束，已删除；原文权威在
 *  git 历史与 golden 基线）。规则：id/class/层级/属性值逐字保留；
 *  class→className；style 串→对象（CSS 值逐字）；非 void 标签显式
 *  闭合；<table> 内显式 <tbody>（原 DOM 由解析器自动插入，形状一致）。
 * ================================================================ */

export default function Skeleton(){
  return <>
    <div id="app">
      {/* ======== 顶栏：WorkflowTabs + 新建 ======== */}
      <header id="tabsbar">
        <span className="brand">◆ AgentFlow</span>
        <div id="tabs-list"></div>
        <button id="tab-new" title="新建空白工作流"></button>
      </header>

      <div id="main">
        {/* ======== 左侧图标工具栏（SideToolbar） ======== */}
        <nav id="rail">
          <div className="rail-group">
            <button className="rail-btn" id="rail-menu" title="主菜单">
              <svg viewBox="0 0 24 24"><line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="18" x2="20" y2="18"/></svg>
              <span className="rl">菜单</span>
            </button>
            <div className="rail-sep"></div>
            <button className="rail-btn" data-stab="history" title="任务历史">
              <svg viewBox="0 0 24 24"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/><path d="M12 7v5l3 3"/></svg>
              <span className="rl">历史</span>
            </button>
            <button className="rail-btn" data-stab="nodes" title="节点库">
              <svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><path d="M10 6.5h4a3 3 0 0 1 3 3V14"/></svg>
              <span className="rl">节点</span>
            </button>
            <button className="rail-btn" data-stab="workflows" title="工作流">
              <svg viewBox="0 0 24 24"><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>
              <span className="rl">工作流</span>
            </button>
            <button className="rail-btn" data-stab="templates" title="模板">
              <svg viewBox="0 0 24 24"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/></svg>
              <span className="rl">模板</span>
            </button>
          </div>
          <div className="rail-group bottom">
            <button className="rail-btn" id="rail-help" title="帮助 / 快捷键">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 3.4 2.3c-.8.3-.9 1-.9 1.7"/><circle cx="12" cy="17" r=".5"/></svg>
              <span className="rl">帮助</span>
            </button>
            <button className="rail-btn" id="rail-bp" title="底部面板（日志）">
              <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="14" x2="21" y2="14"/></svg>
              <span className="rl">日志</span>
            </button>
            <button className="rail-btn" data-stab="settings" title="设置">
              <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.6 1.6 0 0 0 .3 1.7l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.7-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.2a1.6 1.6 0 0 0-1-1.5 1.6 1.6 0 0 0-1.7.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.7 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.2a1.6 1.6 0 0 0 1.5-1 1.6 1.6 0 0 0-.3-1.7l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.7.3h.1a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.2a1.6 1.6 0 0 0 1 1.5h.1a1.6 1.6 0 0 0 1.7-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.7v.1a1.6 1.6 0 0 0 1.5 1h.2a2 2 0 1 1 0 4h-.2a1.6 1.6 0 0 0-1.5 1z"/></svg>
              <span className="rl">设置</span>
            </button>
          </div>
        </nav>

        {/* ======== 侧栏内容面板 ======== */}
        <aside id="sidebar">
          <div className="side-head"><h3 id="side-title">节点库</h3>
            <div className="sh-act"><button className="sh-btn" id="side-close" title="关闭侧栏"></button></div>
          </div>
          <div className="side-body" id="side-body"></div>
        </aside>

        {/* ======== 中央：画布 + 底部面板 ======== */}
        <div id="center">
          <div id="viewport">
            <div id="world">
              <svg id="edges"><path id="ghost-link" d="" style={{display:'none'}} /></svg>
              <div id="nodes-layer"></div>
            </div>
            <div id="empty-hint">
              <div className="big"></div>
              <p>画布是空的 · 从左侧<b>节点库</b>拖入节点，或<b>双击画布</b>搜索添加<br />
              <kbd>滚轮</kbd> 缩放 · <kbd>拖拽空白</kbd> 平移 · <kbd>Ctrl+拖拽</kbd> 框选 · <kbd>右键</kbd> 菜单</p>
            </div>
            <div id="boxsel"></div>
            <div id="canvas-stats"></div>

            {/* 顶部居中浮动运行卡（仿 ComfyActionbar） */}
            <div id="floatbar">
              <button id="float-run"></button>
              <button id="float-stop"></button>
              <div id="float-prog"><span className="dotp"></span><span id="float-prog-txt"></span></div>
              <div style={{width:'1px',height:'18px',background:'var(--border2)',margin:'0 3px'}}></div>
              <button className="fbtn" id="fl-undo" title="撤销 (Ctrl+Z)"><svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/></svg></button>
              <button className="fbtn" id="fl-redo" title="重做 (Ctrl+Y)"><svg viewBox="0 0 24 24"><path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/></svg></button>
              <div id="float-bar"><i></i></div>
            </div>

            {/* 选中节点悬浮工具条（仿 SelectionToolbox.vue） */}
            <div id="node-tb">
              <button className="ntb-btn" id="ntb-del" title="删除 (Del)"></button>
              <div className="ntb-sep"></div>
              <button className="ntb-btn" id="ntb-info" title="节点信息"></button>
              <button className="ntb-btn" id="ntb-bypass" title="旁路（跳过执行）"></button>
              <button className="ntb-btn" id="ntb-refresh" title="重置节点状态"></button>
              <button className="ntb-btn exec" id="ntb-exec" title="仅执行此节点"></button>
              <button className="ntb-btn" id="ntb-more" title="更多"></button>
            </div>

            {/* 右下工具条（仿 GraphCanvasMenu） */}
            <div id="canvas-tools">
              <button className="ct-btn on" id="mode-pan" title="平移模式（默认）"><svg viewBox="0 0 24 24"><path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-5.9-2.3L3 16.5a2 2 0 0 1 3-2.7L8 16"/></svg></button>
              <button className="ct-btn" id="mode-select" title="框选模式（左键拖拽框选）"><svg viewBox="0 0 24 24"><path d="M4 4l6.5 16 2.2-6.3L19 11.5z"/></svg></button>
              <div className="ct-sep"></div>
              <button className="ct-btn" id="zoom-fit" title="适应视图 (Home)"><svg viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/><circle cx="12" cy="12" r="3"/></svg></button>
              <button className="ct-btn" id="zoom-out" title="缩小">−</button>
              <span className="ct-zoom" id="zoom-lvl" title="重置为 100%">100%</span>
              <button className="ct-btn" id="zoom-in" title="放大">＋</button>
            </div>
            <div id="minimap-wrap"><canvas id="minimap" width="196" height="128"></canvas></div>
          </div>

          {/* 底部面板：执行日志 */}
          <div id="bottompanel">
            <div id="bp-head"><span className="ldot"></span>执行日志
              <button className="ibtn" id="log-clear">清空</button>
              <button className="ibtn" id="bp-close">收起</button>
            </div>
            <div id="log-body"></div>
          </div>
        </div>

        {/* ======== 右侧属性面板（NodePropertiesPanel） ======== */}
        <aside id="rightbar"><div id="props"></div></aside>
      </div>
    </div>

    {/* 搜索弹窗 */}
    <div className="modal-mask" id="search-modal">
      <div className="box">
        <input id="search-input" placeholder="搜索要添加的节点… (ESC 关闭)" spellCheck={false} />
        <div id="search-list"></div>
      </div>
    </div>

    {/* 帮助弹窗 */}
    <div className="modal-mask" id="help-modal">
      <div className="box">
        <h2>快捷键</h2>
        <table>
          <tbody>
          <tr><td><kbd>双击画布</kbd></td><td>搜索添加节点</td></tr>
          <tr><td><kbd>滚轮</kbd></td><td>缩放画布</td></tr>
          <tr><td><kbd>拖拽空白处</kbd></td><td>平移画布（框选模式下为框选）</td></tr>
          <tr><td><kbd>Ctrl + 拖拽</kbd></td><td>强制框选节点</td></tr>
          <tr><td><kbd>拖拽端口 → 端口</kbd></td><td>创建连线</td></tr>
          <tr><td><kbd>Delete</kbd></td><td>删除选中节点 / 连线</td></tr>
          <tr><td><kbd>Ctrl+C</kbd> / <kbd>Ctrl+V</kbd></td><td>复制 / 粘贴节点</td></tr>
          <tr><td><kbd>Ctrl+Z</kbd> / <kbd>Ctrl+Y</kbd></td><td>撤销 / 重做</td></tr>
          <tr><td><kbd>Ctrl+A</kbd></td><td>全选节点</td></tr>
          <tr><td><kbd>Ctrl+S</kbd></td><td>保存工作流</td></tr>
          <tr><td><kbd>Home</kbd></td><td>适应视图</td></tr>
          </tbody>
        </table>
        <div className="close-row"><button className="ibtn" id="help-close">知道了</button></div>
      </div>
    </div>

    {/* 人工审批弹窗（真实执行时弹出） */}
    <div className="modal-mask" id="approve-modal">
      <div className="box">
        <h2>人工审批</h2>
        <div id="approve-info" style={{fontSize:'12px',color:'var(--text2)',lineHeight:'1.7',margin:'2px 0 10px'}}></div>
        <div className="close-row">
          <button className="ibtn" id="approve-reject" style={{borderColor:'#7a3d3d'}}>拒绝</button>
          <button className="ibtn" id="approve-ok">通过</button>
        </div>
      </div>
    </div>

    <div id="ctxmenu"></div>
    <div id="toasts"></div>
    <div id="pal-drag-ghost"></div>
    <input type="file" id="file-import" accept=".json" style={{display:'none'}} />
  </>;
}
