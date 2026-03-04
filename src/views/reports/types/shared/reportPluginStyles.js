/** Shared CSS styles injected via <style> tags by all report type plugins. */
export const reportPluginStyles = `
.rpt-card { background: white; border-radius: 12px; border: 1px solid #e5e7eb; padding: 1.5rem; margin-bottom: 1.5rem; }
.rpt-card-accent { border-left: 4px solid #1e3a5f; }
.rpt-card-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; flex-wrap: wrap; gap: 0.75rem; }
.rpt-card-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.rpt-card-actions { display: flex; gap: 0.5rem; }
.rpt-badge { display: inline-flex; padding: 0.25rem 0.625rem; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 0.75rem; font-weight: 600; }
.rpt-empty { text-align: center; padding: 2rem; color: #64748b; font-size: 0.9375rem; background: #f8fafc; border-radius: 8px; }
.rpt-empty-icon { font-size: 2.5rem; color: #cbd5e1; margin-bottom: 0.75rem; display: block; }
.rpt-empty-success { background: #f0fdf4; }
.rpt-empty-success .rpt-empty-icon { color: #22c55e; }
.rpt-form-row { display: flex; flex-direction: column; gap: 1rem; }
.rpt-flex-col { flex-direction: column; }
.rpt-p-16 { padding: 1rem; }
.rpt-mb-16 { margin-bottom: 1rem; }
.rpt-mt-16 { margin-top: 1rem; }
.rpt-mt-20 { margin-top: 1.25rem; }
.rpt-section-spacing { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid #e5e7eb; }

.rpt-plant-summary-table { width: 100%; border-collapse: collapse; margin-top: 0.75rem; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
.rpt-plant-summary-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
.rpt-plant-summary-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; background: white; }
.rpt-plant-summary-table tr:last-child td { border-bottom: none; }
.rpt-plant-summary-table tr:hover td { background: #f8fafc; }

.rpt-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1e293b; background: white; box-sizing: border-box; }
.rpt-input:disabled { background: #f8fafc; color: #64748b; }
.rpt-input:focus { outline: none; border-color: #1e3a5f; box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.1); }
.rpt-textarea-notes { min-height: 60px; resize: vertical; }

.rpt-variance-cell { display: inline-flex; align-items: center; gap: 0.25rem; font-size: 0.8125rem; font-weight: 600; padding: 0.25rem 0.5rem; border-radius: 4px; }
.rpt-variance-positive { color: #059669; background: #d1fae5; }
.rpt-variance-negative { color: #dc2626; background: #fee2e2; }
.rpt-variance-neutral { color: #64748b; background: #f1f5f9; }
.rpt-variance-symbol { font-size: 0.6875rem; }

.rpt-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 0.75rem; margin-top: 1.25rem; margin-bottom: 1rem; }
.rpt-stat-card { text-align: center; padding: 0.875rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
.rpt-stat-label { font-size: 0.6875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
.rpt-stat-value { font-size: 1.125rem; font-weight: 700; color: #1e3a5f; }

.rpt-primary-btn { padding: 0.5rem 1rem; background: #1e3a5f; color: white; border: none; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.rpt-primary-btn:hover { background: #15304f; }
.rpt-primary-btn:disabled { background: #94a3b8; cursor: not-allowed; }
.rpt-secondary-btn { padding: 0.5rem 1rem; background: #f1f5f9; color: #475569; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.8125rem; font-weight: 600; cursor: pointer; transition: all 0.15s; }
.rpt-secondary-btn:hover { background: #e2e8f0; }
.rpt-secondary-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.rpt-agg-table { width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; margin-top: 1rem; }
.rpt-agg-table th { background: #f8fafc; padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; border-bottom: 1px solid #e5e7eb; }
.rpt-agg-table td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.rpt-agg-table tr:last-child td { border-bottom: none; }
.rpt-agg-table tr:hover td { background: #f8fafc; }

.rpt-ai-analysis { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a8a 100%); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem; color: white; }
.rpt-ai-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.75rem; }
.rpt-ai-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.rpt-ai-title { font-weight: 600; font-size: 0.9375rem; margin: 0; }
.rpt-ai-subtitle { font-size: 0.75rem; opacity: 0.8; margin: 0; }
.rpt-ai-content { font-size: 0.875rem; line-height: 1.6; opacity: 0.95; white-space: pre-wrap; }
.rpt-ai-loading { display: flex; align-items: center; justify-content: center; padding: 1rem; gap: 0.5rem; font-size: 0.875rem; opacity: 0.8; }
.rpt-ai-error { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 1rem; color: #991b1b; font-size: 0.875rem; margin-bottom: 1.5rem; }
.rpt-ai-regenerate { background: rgba(255,255,255,0.15); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 0.375rem 0.75rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; margin-top: 0.75rem; }
.rpt-ai-regenerate:hover { background: rgba(255,255,255,0.25); }

.rpt-loading { display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 2rem; color: #64748b; }
.rpt-loading i { font-size: 1.25rem; }

.rpt-section-header { display: flex; align-items: flex-start; gap: 0.75rem; margin-bottom: 1.25rem; }
.rpt-section-icon { width: 40px; height: 40px; border-radius: 10px; background: #e0f2fe; color: #0369a1; display: flex; align-items: center; justify-content: center; font-size: 1rem; }
.rpt-section-title { font-size: 1.125rem; font-weight: 600; color: #1e293b; margin: 0; }
.rpt-section-subtitle { font-size: 0.875rem; color: #64748b; margin: 0.25rem 0 0 0; }

.rpt-warnings { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; }
.rpt-warning-chip { display: inline-flex; align-items: center; gap: 0.375rem; padding: 0.5rem 0.75rem; background: #fef3c7; color: #92400e; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; }
.rpt-warning-icon { font-size: 0.875rem; }

.rpt-toolbar { display: flex; flex-wrap: wrap; gap: 0.75rem; align-items: center; margin-bottom: 1rem; padding: 1rem; background: #f8fafc; border-radius: 8px; border: 1px solid #e5e7eb; }
.rpt-filter-input { flex: 1; min-width: 200px; padding: 0.625rem 0.875rem; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.875rem; color: #1e293b; background: white; }
.rpt-filter-input:focus { outline: none; border-color: #1e3a5f; box-shadow: 0 0 0 2px rgba(30, 58, 95, 0.1); }
.rpt-toolbar-actions { display: flex; flex-wrap: wrap; gap: 0.5rem; }
.rpt-btn { padding: 0.5rem 0.875rem; background: white; border: 1px solid #e5e7eb; border-radius: 6px; font-size: 0.8125rem; font-weight: 500; color: #475569; cursor: pointer; transition: all 0.15s; }
.rpt-btn:hover { background: #f1f5f9; border-color: #cbd5e1; }

.rpt-table-wrapper { overflow-x: auto; border-radius: 8px; border: 1px solid #e5e7eb; background: white; }
.rpt-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.rpt-th { padding: 0.75rem 1rem; text-align: left; font-size: 0.75rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.rpt-th.right { text-align: right; }
.rpt-row { transition: background 0.15s; }
.rpt-row:hover { background: #f8fafc; }
.rpt-td { padding: 0.75rem 1rem; font-size: 0.9375rem; color: #1e293b; border-bottom: 1px solid #f1f5f9; vertical-align: middle; }
.rpt-td.emphasis { font-weight: 600; color: #1e293b; }
.rpt-td.secondary { color: #64748b; }
.rpt-td.warn { color: #d97706; font-weight: 500; }
.rpt-td.right { text-align: right; }
.rpt-icon-btn { padding: 0.375rem 0.5rem; background: transparent; border: 1px solid #e5e7eb; border-radius: 4px; cursor: pointer; font-size: 0.875rem; color: #64748b; transition: all 0.15s; }
.rpt-icon-btn:hover { background: #f1f5f9; color: #1e293b; }

.rpt-detail-row { padding: 0 !important; background: #f8fafc; }
.rpt-detail-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 1rem; padding: 1rem 1.5rem; }
.rpt-detail-grid-full { grid-column: 1 / -1; }
.rpt-field-label { font-size: 0.6875rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 0.25rem; }
.rpt-field-value { font-size: 0.9375rem; color: #1e293b; }
.rpt-field-value.emphasis { font-weight: 600; }
.rpt-error-text { color: #dc2626; }
.rpt-comment-text { font-size: 0.875rem; color: #475569; font-style: italic; }

.rpt-dots-bar { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; padding: 0.75rem; background: #f8fafc; border-radius: 8px; }
.rpt-dot { width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; cursor: pointer; transition: all 0.15s; }
.rpt-dot:hover { background: #94a3b8; transform: scale(1.1); }
.rpt-dot.active { background: #1e3a5f; transform: scale(1.3); }

.rpt-col-operator { width: 25%; }
.rpt-col-truck { width: 10%; }
.rpt-col-start { width: 20%; }
.rpt-col-end { width: 20%; }
.rpt-col-lph { width: 15%; }
.rpt-col-actions { width: 10%; }
`
