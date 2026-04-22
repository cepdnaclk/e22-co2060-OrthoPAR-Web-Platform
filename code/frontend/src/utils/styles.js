// ─── Styles ───────────────────────────────────────────────────────────────────
export const styles = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: 'DM Sans', sans-serif; background: #F4F7FB; color: #1A2332; height: 100vh; overflow: hidden; }

  .app { display: flex; height: 100vh; overflow: hidden; }

  /* Sidebar */
  .sidebar {
    width: 260px;
    min-width: 260px;
    background: #FFFFFF;
    border-right: 1px solid #E2E8F0;
    display: flex;
    flex-direction: column;
    padding: 24px 0;
    z-index: 10;
  }
  .sidebar-logo {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0 20px 24px;
    border-bottom: 1px solid #E2E8F0;
    margin-bottom: 16px;
  }
  .logo-mark {
    width: 34px;
    height: 34px;
    background: #0077B6;
    border-radius: 9px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    flex-shrink: 0;
  }
  .logo-text { font-size: 14px; font-weight: 700; color: #1A2332; line-height: 1.2; }
  .logo-sub { font-size: 10px; color: #64748B; font-weight: 400; letter-spacing: 0.05em; text-transform: uppercase; }

  .nav-section { padding: 0 12px; margin-bottom: 4px; }
  .nav-label { font-size: 10px; font-weight: 600; color: #94A3B8; letter-spacing: 0.08em; text-transform: uppercase; padding: 0 8px 8px; }
  .nav-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 10px; border-radius: 8px;
    color: #64748B; font-size: 13.5px; font-weight: 500;
    cursor: pointer; transition: all 0.15s; margin-bottom: 2px;
    border: none; background: none; width: 100%; text-align: left;
  }
  .nav-item:hover { background: #F4F7FB; color: #1A2332; }
  .nav-item.active { background: #E8F4FD; color: #0077B6; font-weight: 600; }

  .sidebar-footer {
    margin-top: auto; padding: 16px 20px; border-top: 1px solid #E2E8F0;
    display: flex; align-items: center; gap: 10px;
  }
  .avatar {
    width: 32px; height: 32px; border-radius: 50%;
    background: linear-gradient(135deg, #0077B6, #00B4D8);
    display: flex; align-items: center; justify-content: center;
    color: white; font-size: 12px; font-weight: 700; flex-shrink: 0;
  }
  .avatar-name { font-size: 12px; font-weight: 600; color: #1A2332; }
  .avatar-role { font-size: 10px; color: #64748B; }

  /* Main */
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }

  /* Top bar */
  .topbar {
    height: 64px;
    width: 100%;
    background: #FFFFFF;
    border-bottom: 1px solid #e2e8f0;
    display: flex; align-items: center; justify-content: space-between;
    flex-shrink: 0;
    padding: 14px 28px;
  }
  .topbar-title { font-size: 16px; font-weight: 700; color: #1A2332; }
  .topbar-sub { font-size: 12px; color: #64748B; margin-top: 1px; }
  .search-wrap { position: relative; }
  .search-input {
    padding: 8px 14px 8px 36px; border-radius: 8px;
    border: 1px solid #E2E8F0; background: #F4F7FB;
    font-size: 13px; color: #1A2332; width: 220px;
    font-family: 'DM Sans', sans-serif; outline: none;
    transition: border-color 0.15s;
  }
  .search-input:focus { border-color: #0077B6; background: #FFFFFF; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94A3B8; pointer-events: none; }

  /* Content area */
  .content { flex: 1; overflow-y: auto; padding: 24px 28px; }

  /* Dashboard */
  .stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
  .stat-card {
    background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 12px;
    padding: 18px 20px; position: relative; overflow: hidden;
  }
  .stat-card::after {
    content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
    background: var(--accent, #0077B6);
  }
  .stat-label { font-size: 11px; font-weight: 600; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .stat-value { font-size: 28px; font-weight: 700; color: #1A2332; line-height: 1; }
  .stat-delta { font-size: 11px; color: #64748B; margin-top: 4px; }

  .section-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
  .section-title { font-size: 14px; font-weight: 700; color: #1A2332; }
  .section-link { font-size: 12px; font-weight: 600; color: #0077B6; cursor: pointer; border: none; background: none; }

  .upload-card {
    background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;
    padding: 20px; margin-bottom: 24px;
  }
  .drop-zone {
    border: 2px dashed #CBD5E1; border-radius: 10px;
    padding: 40px 20px; text-align: center; cursor: pointer;
    transition: all 0.2s; position: relative;
  }
  .drop-zone:hover, .drop-zone.drag-over {
    border-color: #0077B6; background: #E8F4FD;
  }
  .drop-icon { color: #0077B6; margin-bottom: 12px; opacity: 0.8; }
  .drop-title { font-size: 14px; font-weight: 600; color: #1A2332; margin-bottom: 4px; }
  .drop-sub { font-size: 12px; color: #64748B; }
  .drop-formats { margin-top: 12px; }
  .format-badge {
    display: inline-block; padding: 2px 8px; border-radius: 4px;
    background: #F4F7FB; border: 1px solid #E2E8F0;
    font-size: 10px; font-weight: 600; color: #64748B; margin: 2px;
    font-family: 'DM Mono', monospace;
  }

  .analyze-btn {
    display: inline-flex; align-items: center; gap: 8px;
    padding: 10px 20px; background: #0077B6; color: white;
    border: none; border-radius: 8px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .analyze-btn:hover { background: #005A8E; }
  .analyze-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  /* Table */
  .table-card {
    background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 14px;
    overflow: hidden;
  }
  .table-header {
    display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
    padding: 12px 20px; background: #F4F7FB; border-bottom: 1px solid #E2E8F0;
    font-size: 11px; font-weight: 700; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.06em;
  }
  .table-row {
    display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
    padding: 13px 20px; border-bottom: 1px solid #E2E8F0;
    align-items: center; transition: background 0.12s; cursor: pointer;
    font-size: 13px;
  }
  .table-row:last-child { border-bottom: none; }
  .table-row:hover { background: #F4F7FB; }
  .patient-id { font-family: 'DM Mono', monospace; font-weight: 500; color: #0077B6; font-size: 12.5px; }
  .score-cell { font-weight: 700; color: #1A2332; }

  .badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 9px; border-radius: 20px;
    font-size: 11px; font-weight: 600;
  }
  .badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

  /* Analysis Studio */
  .studio { display: flex; height: 100%; overflow: hidden; }
  .viewer-panel {
    flex: 3; background: #0F172A; position: relative; overflow: hidden;
    display: flex; flex-direction: column;
  }
  .viewer-topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 16px; border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }
  .viewer-title { font-size: 12px; font-weight: 600; color: rgba(255,255,255,0.7); letter-spacing: 0.05em; text-transform: uppercase; }
  .viewer-controls { display: flex; gap: 6px; }
  .viewer-btn {
    display: flex; align-items: center; gap: 5px;
    padding: 5px 10px; border-radius: 6px;
    background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12);
    color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 500; cursor: pointer;
    transition: all 0.15s; font-family: 'DM Sans', sans-serif;
  }
  .viewer-btn:hover { background: rgba(255,255,255,0.14); color: white; }
  .viewer-btn.active { background: rgba(0,119,182,0.4); border-color: #0077B6; color: #60C3F0; }
  .viewer-canvas { flex: 1; position: relative; }
  .viewer-badge {
    position: absolute; bottom: 14px; left: 14px;
    background: rgba(15,23,42,0.8); border: 1px solid rgba(255,255,255,0.1);
    padding: 6px 10px; border-radius: 6px;
    font-size: 10px; color: rgba(255,255,255,0.5); font-family: 'DM Mono', monospace;
    backdrop-filter: blur(8px);
  }
  .viewer-badge span { color: rgba(255,255,255,0.8); }
  .rotate-hint {
    position: absolute; bottom: 14px; right: 14px;
    background: rgba(15,23,42,0.6); border: 1px solid rgba(255,255,255,0.08);
    padding: 5px 9px; border-radius: 6px;
    font-size: 10px; color: rgba(255,255,255,0.4);
    backdrop-filter: blur(8px);
  }

  /* Scorecard */
  .scorecard {
    flex: 2; background: #FFFFFF; border-left: 1px solid #E2E8F0;
    display: flex; flex-direction: column; overflow: hidden;
  }
  .scorecard-header {
    padding: 20px 22px; border-bottom: 1px solid #E2E8F0; flex-shrink: 0;
  }
  .score-display { margin-bottom: 14px; }
  .score-number {
    font-size: 52px; font-weight: 800; line-height: 1;
    background: linear-gradient(135deg, #0077B6, #00B4D8);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  .score-label { font-size: 12px; color: #64748B; margin-top: 2px; font-weight: 500; }
  .score-status-row { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
  .score-bar-wrap { flex: 1; height: 6px; background: #E2E8F0; border-radius: 99px; overflow: hidden; }
  .score-bar { height: 100%; border-radius: 99px; transition: width 0.6s cubic-bezier(.4,0,.2,1); }

  .scorecard-body { flex: 1; overflow-y: auto; padding: 16px 22px; }

  /* Override table */
  .override-table { width: 100%; border-collapse: collapse; }
  .override-table thead tr {
    border-bottom: 2px solid #E2E8F0;
  }
  .override-table th {
    font-size: 10px; font-weight: 700; color: #64748B;
    text-transform: uppercase; letter-spacing: 0.07em;
    padding: 8px 8px 10px; text-align: left;
  }
  .override-table th:last-child { text-align: center; }
  .override-table td { padding: 0; vertical-align: middle; }

  .metric-row {
    border-bottom: 1px solid #E2E8F0; transition: background 0.15s;
  }
  .metric-row.modified { background: #FFFBEB; }
  .metric-row:last-child { border-bottom: none; }

  .metric-cell { padding: 10px 8px; }
  .metric-name { font-size: 12.5px; font-weight: 600; color: #1A2332; }
  .metric-unit { font-size: 10px; color: #94A3B8; }

  .ai-value {
    font-size: 12.5px; font-family: 'DM Mono', monospace;
    color: #64748B; transition: all 0.2s;
  }
  .ai-value.struck { text-decoration: line-through; color: #94A3B8; opacity: 0.6; }

  .manual-input {
    width: 78px; padding: 5px 8px; border-radius: 6px;
    border: 1.5px solid #E2E8F0; font-size: 12.5px;
    font-family: 'DM Mono', monospace; color: #1A2332;
    background: #F4F7FB; outline: none; transition: border-color 0.15s;
    font-weight: 500;
  }
  .manual-input:focus { border-color: #0077B6; background: white; }
  .manual-input.overridden { border-color: #F59E0B; background: #FFFBEB; color: #92400E; }

  .manual-badge {
    display: inline-block; margin-left: 4px;
    padding: 1px 5px; border-radius: 3px;
    background: #FFFBEB; color: #F59E0B;
    font-size: 9px; font-weight: 700; letter-spacing: 0.05em;
    border: 1px solid rgba(245,158,11,0.3);
  }

  .points-cell {
    text-align: center; font-size: 13px; font-weight: 700; color: #0077B6;
    font-family: 'DM Mono', monospace; padding: 10px 8px;
  }
  .points-cell .pts-label { font-size: 10px; font-weight: 500; color: #94A3B8; }

  .scorecard-footer {
    padding: 16px 22px; border-top: 1px solid #E2E8F0;
    flex-shrink: 0; background: #F4F7FB;
  }
  .total-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 14px;
  }
  .total-label { font-size: 13px; font-weight: 700; color: #1A2332; }
  .total-score { font-size: 22px; font-weight: 800; color: #0077B6; font-family: 'DM Mono', monospace; }

  .action-btns { display: flex; gap: 8px; }
  .btn-secondary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border: 1.5px solid #E2E8F0; border-radius: 7px;
    background: white; color: #1A2332; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: all 0.15s; font-family: 'DM Sans', sans-serif;
    flex: 1; justify-content: center;
  }
  .btn-secondary:hover { border-color: #0077B6; color: #0077B6; background: #E8F4FD; }
  .btn-primary {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; background: #0077B6; border: none; border-radius: 7px;
    color: white; font-size: 12px; font-weight: 600;
    cursor: pointer; transition: background 0.15s; font-family: 'DM Sans', sans-serif;
    flex: 1; justify-content: center;
  }
  .btn-primary:hover { background: #005A8E; }

  .modified-count {
    font-size: 11px; color: #F59E0B; font-weight: 600;
    display: flex; align-items: center; gap: 4px;
  }

  /* Upload progress */
  .upload-progress {
    margin-top: 16px; background: #F4F7FB; border-radius: 8px;
    padding: 12px 16px; border: 1px solid #E2E8F0;
  }
  .progress-label { font-size: 12px; font-weight: 600; color: #1A2332; margin-bottom: 8px; display: flex; justify-content: space-between; }
  .progress-bar-wrap { height: 5px; background: #E2E8F0; border-radius: 99px; overflow: hidden; }
  .progress-bar {
    height: 100%; border-radius: 99px;
    background: linear-gradient(90deg, #0077B6, #00B4D8);
    transition: width 0.3s ease;
  }

  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
  .fade-in { animation: fadeIn 0.35s ease forwards; }

  @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
  .processing { animation: pulse 1.5s ease infinite; }

  /* Scrollbar */
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
`;