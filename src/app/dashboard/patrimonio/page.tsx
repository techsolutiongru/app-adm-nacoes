'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Asset, AssetLog, AssetMaintenanceRule } from '@/types'
import { Plus, Search, QrCode, Edit, Trash2, Eye, X, Package, Printer, AlertTriangle } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'
import ConfirmModal from '@/components/ConfirmModal'

const LOG = (label: string, data: unknown) => console.log(`[Patrimônio] ${label}:`, data)

export default function PatrimonioPage() {
  const supabase = createClient()
  const [assets, setAssets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<any | null>(null)
  const [editing, setEditing] = useState<Asset | null>(null)
  
  const [logs, setLogs] = useState<AssetLog[]>([])
  const [rules, setRules] = useState<AssetMaintenanceRule[]>([])
  const [maintenances, setMaintenances] = useState<any[]>([])
  
  const [showLogModal, setShowLogModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false)
  
  const [confirmDelete, setConfirmDelete] = useState<Asset | null>(null)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const [form, setForm] = useState({ nome_item: '', descricao: '', numero_serie: '', nota_fiscal: '', garantia_status: 'Sem garantia', data_garantia_fim: '', possui_manutencao: false })
  const [logForm, setLogForm] = useState({ tipo: 'Manutenção', descricao: '', prestador_nome: '', prestador_contato: '' })
  const [ruleForm, setRuleForm] = useState({ tipo_manutencao: '', periodicidade_dias: 30, proxima_execucao: '' })
  const [maintenanceForm, setMaintenanceForm] = useState({ tipo: '', descricao: '', data_programada: '' })

  useEffect(() => { loadAssets() }, [])

  async function loadAssets() {
    setLoading(true)
    const { data, error } = await supabase.from('assets').select(`
      *,
      maintenance ( id, status, data_programada )
    `).order('created_at', { ascending: false })
    
    if (error) {
      console.error("Erro completo ao carregar ativos:", JSON.stringify(error, null, 2))
    } else {
      setAssets(data || [])
    }
    
    setLoading(false)
  }

  async function loadDetail(asset: any) {
    setShowDetail(asset)
    const [logsRes, rulesRes, maintRes] = await Promise.all([
      supabase.from('asset_logs').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }),
      supabase.from('asset_maintenance_rules').select('*').eq('asset_id', asset.id),
      supabase.from('maintenance').select('*').eq('asset_id', asset.id).order('data_programada', { ascending: true })
    ])
    setLogs(logsRes.data || [])
    setRules(rulesRes.data || [])
    setMaintenances(maintRes.data || [])
  }

  async function handleSave() {
    const payload: any = { ...form }
    if (!payload.data_garantia_fim) payload.data_garantia_fim = null
    LOG('payload', payload)
    
    if (editing) {
      const { data, error } = await supabase.from('assets').update(payload).eq('id', editing.id).select()
      LOG('update', { data, error })
      if (error) { 
        console.error("Erro completo:", JSON.stringify(error, null, 2))
        toast.error(`Erro ao atualizar: ${error.message || 'Erro desconhecido'}`)
        return 
      }
      toast.success('Ativo atualizado!')
      loadAssets()
    } else {
      const { data, error } = await supabase.from('assets').insert([payload]).select()
      LOG('insert', { data, error })
      
      if (error || !data || data.length === 0) { 
        console.error("Erro completo:", JSON.stringify(error, null, 2))
        toast.error(`Erro ao salvar: ${error?.message || 'Falha ao retornar dados do insert'}`)
        return 
      }
      
      // Update QR Code
      const newAsset = data[0]
      await supabase.from('assets').update({ qr_code_url: `${appUrl}/patrimonio/${newAsset.id}` }).eq('id', newAsset.id)
      
      toast.success('Ativo cadastrado!')
      
      // Manually update the state to guarantee it shows up immediately
      setAssets(prev => [newAsset, ...prev])
      
      // Optional: reload to get relationships like maintenance
      loadAssets()
    }
    
    setShowModal(false)
    setEditing(null)
    resetForm()
  }

  async function handleDelete(asset: Asset) {
    const { error } = await supabase.from('assets').delete().eq('id', asset.id)
    if (error) { console.error(error); toast.error(`Erro ao excluir: ${error.message}`); return }
    toast.success('Ativo removido'); setConfirmDelete(null); loadAssets()
  }

  async function handleAddLog() {
    if (!showDetail) return
    const payload = { ...logForm, asset_id: showDetail.id }
    const { error } = await supabase.from('asset_logs').insert([payload]).select()
    if (error) { console.error(error); toast.error(`Erro ao registrar: ${error.message}`); return }
    toast.success('Registro adicionado!'); setShowLogModal(false)
    setLogForm({ tipo: 'Manutenção', descricao: '', prestador_nome: '', prestador_contato: '' })
    loadDetail(showDetail)
  }

  async function handleAddRule() {
    if (!showDetail) return
    const payload = { ...ruleForm, asset_id: showDetail.id }
    const { error } = await supabase.from('asset_maintenance_rules').insert([payload]).select()
    if (error) { console.error(error); toast.error(`Erro ao salvar regra: ${error.message}`); return }
    toast.success('Regra adicionada!'); setShowRuleModal(false)
    setRuleForm({ tipo_manutencao: '', periodicidade_dias: 30, proxima_execucao: '' })
    loadDetail(showDetail)
  }

  async function handleAddMaintenance() {
    if (!showDetail) return
    const payload = { ...maintenanceForm, asset_id: showDetail.id, status: 'pendente' }
    const { error } = await supabase.from('maintenance').insert([payload]).select()
    if (error) { console.error(error); toast.error(`Erro ao agendar: ${error.message}`); return }
    toast.success('Manutenção agendada!'); setShowMaintenanceModal(false)
    setMaintenanceForm({ tipo: '', descricao: '', data_programada: '' })
    loadDetail(showDetail)
    loadAssets()
  }

  async function handleCompleteMaintenance(id: string) {
    const payload = { status: 'concluída', data_realizada: new Date().toISOString() }
    const { error } = await supabase.from('maintenance').update(payload).eq('id', id)
    if (error) { toast.error('Erro ao concluir'); return }
    toast.success('Manutenção concluída!')
    loadDetail(showDetail)
    loadAssets()
  }

  async function downloadQR(asset: Asset) {
    const url = `${appUrl}/patrimonio/${asset.id}`
    const dataUrl = await QRCode.toDataURL(url, { width: 400, margin: 2 })
    const a = document.createElement('a'); a.href = dataUrl; a.download = `qr-${asset.nome_item.replace(/\s+/g, '-')}.png`; a.click()
    toast.success('QR Code baixado!')
  }

  async function printLabel(asset: Asset) {
    const url = `${appUrl}/patrimonio/${asset.id}`
    QRCode.toDataURL(url, { width: 140, margin: 0 }, (err, dataUrl) => {
      if (err) return toast.error('Erro ao gerar QR Code')
      const printWindow = window.open('', '_blank', 'width=600,height=400')
      if (!printWindow) return toast.error('Bloqueador de pop-ups impediu a impressão')
      
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Etiqueta</title>
            <style>
              @page { margin: 0; size: 90mm 30mm; }
              body { 
                font-family: Arial, sans-serif; margin: 0; padding: 12px; 
                width: 90mm; height: 30mm; box-sizing: border-box; 
                display: flex; align-items: center; justify-content: space-between; 
                background: #f5f5f5; color: #000; overflow: hidden;
              }
              .left { flex: 1; padding-right: 15px; display: flex; flex-direction: column; justify-content: center; }
              .right { width: 85px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; }
              h1 { font-size: 11px; margin: 0 0 6px 0; text-transform: uppercase; font-weight: bold; line-height: 1.2; }
              p { font-size: 10px; margin: 0; font-weight: bold; }
              .logo { max-width: 90px; max-height: 35px; margin-bottom: 5px; object-fit: contain; }
              .qr { width: 75px; height: 75px; }
              .scan-text { font-size: 8px; font-weight: bold; margin-top: 2px; letter-spacing: 0.5px; }
            </style>
          </head>
          <body>
            <div class="left">
              <img src="${appUrl}/logo-ccb-light.png" class="logo" alt="Logo" onerror="this.style.display='none'" />
              <h1>PATRIMÔNIO: ${asset.nome_item}</h1>
              <p>SÉRIE: ${asset.numero_serie || 'N/A'}</p>
            </div>
            <div class="right">
              <img src="${dataUrl}" class="qr" />
              <div class="scan-text">SCAN PARA INFO</div>
            </div>
            <script>
              window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 300); }
            </script>
          </body>
        </html>
      `)
      printWindow.document.close()
    })
  }

  function openEdit(asset: Asset) {
    setEditing(asset)
    setForm({ nome_item: asset.nome_item, descricao: asset.descricao || '', numero_serie: asset.numero_serie || '', nota_fiscal: asset.nota_fiscal || '', garantia_status: asset.garantia_status || 'Sem garantia', data_garantia_fim: asset.data_garantia_fim || '', possui_manutencao: asset.possui_manutencao })
    setShowModal(true)
  }

  function resetForm() { setForm({ nome_item: '', descricao: '', numero_serie: '', nota_fiscal: '', garantia_status: 'Sem garantia', data_garantia_fim: '', possui_manutencao: false }) }

  const filtered = assets.filter(a =>
    a.nome_item.toLowerCase().includes(search.toLowerCase()) || (a.numero_serie || '').toLowerCase().includes(search.toLowerCase())
  )

  function garantiaBadge(asset: Asset) {
    if (asset.data_garantia_fim && isPast(parseISO(asset.data_garantia_fim))) return 'badge-danger'
    if (asset.garantia_status === 'Sem garantia') return 'badge-default'
    return 'badge-success'
  }
  
  function checkAlert(asset: any) {
    if (!asset.maintenance) return false;
    const now = new Date();
    return asset.maintenance.some((m: any) => m.status === 'pendente' && new Date(m.data_programada) <= now);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Patrimônio</h1>
          <p className="page-subtitle">{assets.length} ativo(s) cadastrado(s)</p>
        </div>
        <button id="btn-novo-ativo" onClick={() => { resetForm(); setEditing(null); setShowModal(true) }} className="btn-primary">
          <Plus size={15} /> Novo Ativo
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input className="input pl-9" placeholder="Buscar por nome ou número de série..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Package size={28} className="text-gray-400" /></div>
          <p className="text-gray-400 text-sm">Nenhum ativo encontrado</p>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="btn-secondary mt-3 text-xs">Cadastrar primeiro ativo</button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="hidden md:table-cell">Nº Série</th>
                <th className="hidden lg:table-cell">Garantia</th>
                <th className="hidden lg:table-cell">Alertas</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(asset => {
                const hasAlert = checkAlert(asset);
                return (
                  <tr key={asset.id}>
                    <td>
                      <div className="font-medium text-gray-800">{asset.nome_item}</div>
                      {asset.descricao && <div className="text-xs text-gray-400 mt-0.5 truncate max-w-48">{asset.descricao}</div>}
                    </td>
                    <td className="hidden md:table-cell text-gray-500">{asset.numero_serie || '—'}</td>
                    <td className="hidden lg:table-cell"><span className={`badge ${garantiaBadge(asset)}`}>{asset.garantia_status}</span></td>
                    <td className="hidden lg:table-cell">
                      {hasAlert ? (
                        <span className="badge badge-danger flex items-center gap-1 w-fit"><AlertTriangle size={12}/> Pendente</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => loadDetail(asset)} className="btn-icon" aria-label="Ver detalhes"><Eye size={14} /></button>
                        <button onClick={() => printLabel(asset)} className="btn-icon" aria-label="Imprimir Etiqueta"><Printer size={14} /></button>
                        <button onClick={() => downloadQR(asset)} className="btn-icon" aria-label="QR Code"><QrCode size={14} /></button>
                        <button onClick={() => openEdit(asset)} className="btn-icon" aria-label="Editar"><Edit size={14} /></button>
                        <button onClick={() => setConfirmDelete(asset)} className="btn-icon" aria-label="Excluir" style={{ color: '#dc2626' }}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmModal isOpen={!!confirmDelete} title="Excluir Ativo" message={`Deseja excluir "${confirmDelete?.nome_item}"? Esta ação não pode ser desfeita.`} confirmLabel="Excluir" variant="danger" onConfirm={() => confirmDelete && handleDelete(confirmDelete)} onCancel={() => setConfirmDelete(null)} />

      {/* Modal Cadastro */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-gray-800">{editing ? 'Editar Ativo' : 'Novo Ativo'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group"><label className="label">Nome do Item *</label><input className="input" value={form.nome_item} onChange={e => setForm(f => ({ ...f, nome_item: e.target.value }))} placeholder="Ex: Ar Condicionado" /></div>
              <div className="input-group"><label className="label">Descrição</label><textarea className="input resize-none h-20" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do item..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><label className="label">Número de Série</label><input className="input" value={form.numero_serie} onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))} /></div>
                <div className="input-group"><label className="label">Nota Fiscal</label><input className="input" value={form.nota_fiscal} onChange={e => setForm(f => ({ ...f, nota_fiscal: e.target.value }))} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><label className="label">Status de Garantia</label>
                  <select className="input" value={form.garantia_status} onChange={e => setForm(f => ({ ...f, garantia_status: e.target.value }))}>
                    <option>Sem garantia</option><option>Em garantia</option><option>Garantia vencida</option>
                  </select>
                </div>
                <div className="input-group"><label className="label">Fim da Garantia</label><input type="date" className="input" value={form.data_garantia_fim} onChange={e => setForm(f => ({ ...f, data_garantia_fim: e.target.value }))} /></div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="possui_manutencao" checked={form.possui_manutencao} onChange={e => setForm(f => ({ ...f, possui_manutencao: e.target.checked }))} className="w-4 h-4 rounded" />
                <label htmlFor="possui_manutencao" className="text-sm text-gray-600 cursor-pointer">Possui manutenção preventiva</label>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleSave} className="btn-primary">{editing ? 'Salvar alterações' : 'Cadastrar'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhe */}
      {showDetail && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowDetail(null)}>
          <div className="modal animate-scale-in max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="modal-header sticky top-0 bg-white z-10 border-b">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">{showDetail.nome_item}</h2>
                <p className="text-xs text-gray-400">ID: {showDetail.id.slice(0, 8)}...</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => printLabel(showDetail)} className="btn-primary text-xs"><Printer size={12} /> Gerar Etiqueta</button>
                <button onClick={() => setShowDetail(null)} className="btn-icon"><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body p-6 space-y-6">
              
              {/* Informações Básicas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                {[['Nº Série', showDetail.numero_serie], ['Nota Fiscal', showDetail.nota_fiscal], ['Garantia', showDetail.garantia_status],
                  ['Venc. Garantia', showDetail.data_garantia_fim ? format(parseISO(showDetail.data_garantia_fim), 'dd/MM/yyyy') : '—']
                ].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="text-gray-400 mb-1">{k}</div>
                    <div className="text-gray-800 font-medium">{v || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Manutenções Programadas (Nova Tabela) */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <span className="text-sm font-semibold text-gray-700">Manutenções Programadas</span>
                  <button onClick={() => setShowMaintenanceModal(true)} className="btn-secondary text-xs py-1"><Plus size={11} /> Agendar</button>
                </div>
                {maintenances.length === 0 ? <p className="text-xs text-gray-400 py-2">Nenhuma manutenção agendada.</p> : (
                  <div className="space-y-2">
                    {maintenances.map(m => {
                      const isOverdue = m.status === 'pendente' && new Date(m.data_programada) <= new Date();
                      return (
                        <div key={m.id} className="flex items-center justify-between bg-white rounded-lg p-3 text-sm border border-gray-200 shadow-sm">
                          <div>
                            <div className="font-medium text-gray-800">{m.tipo}</div>
                            <div className="text-xs text-gray-500 mt-0.5">{m.descricao}</div>
                          </div>
                          <div className="flex items-center gap-4 text-right">
                            <div>
                              <div className="text-xs text-gray-400">Data Programada</div>
                              <div className={isOverdue ? 'text-red-600 font-bold' : 'text-gray-700 font-medium'}>
                                {format(parseISO(m.data_programada), 'dd/MM/yyyy')}
                              </div>
                            </div>
                            <div className="min-w-24">
                              {m.status === 'pendente' ? (
                                <button onClick={() => handleCompleteMaintenance(m.id)} className="btn-primary text-xs w-full">Concluir</button>
                              ) : (
                                <span className="badge badge-success w-full justify-center">Concluída</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Regras (Antigo) */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <span className="text-sm font-semibold text-gray-700">Regras Automáticas</span>
                  <button onClick={() => setShowRuleModal(true)} className="btn-secondary text-xs py-1"><Plus size={11} /> Nova Regra</button>
                </div>
                {rules.length === 0 ? <p className="text-xs text-gray-400 py-2">Nenhuma regra automática cadastrada.</p> : (
                  <div className="space-y-2">
                    {rules.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3 text-xs border border-gray-100">
                        <div>
                          <div className="text-gray-800 font-medium">{r.tipo_manutencao}</div>
                          <div className="text-gray-400">A cada {r.periodicidade_dias} dias</div>
                        </div>
                        <div className="text-right">
                          <div className="text-gray-400">Próxima</div>
                          <div className={r.proxima_execucao && isPast(parseISO(r.proxima_execucao)) ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                            {r.proxima_execucao ? format(parseISO(r.proxima_execucao), 'dd/MM/yy') : '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico (Antigo) */}
              <div>
                <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <span className="text-sm font-semibold text-gray-700">Histórico de Ocorrências</span>
                  <button onClick={() => setShowLogModal(true)} className="btn-secondary text-xs py-1"><Plus size={11} /> Registrar</button>
                </div>
                {logs.length === 0 ? <p className="text-xs text-gray-400 py-2">Nenhum registro ainda</p> : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                    {logs.map(log => (
                      <div key={log.id} className="bg-gray-50 rounded-lg p-3 text-xs border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="badge badge-default">{log.tipo}</span>
                          <span className="text-gray-400">{format(parseISO(log.created_at), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <p className="text-gray-700">{log.descricao}</p>
                        {log.prestador_nome && <p className="text-gray-400 mt-1">Prestador: {log.prestador_nome} {log.prestador_contato ? `(${log.prestador_contato})` : ''}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Agendar Manutenção */}
      {showMaintenanceModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal animate-scale-in">
            <div className="modal-header"><h2 className="text-sm font-semibold text-gray-800">Agendar Manutenção</h2><button onClick={() => setShowMaintenanceModal(false)} className="btn-icon"><X size={16} /></button></div>
            <div className="modal-body">
              <div className="input-group">
                <label className="label">Tipo *</label>
                <input className="input" value={maintenanceForm.tipo} onChange={e => setMaintenanceForm(f => ({ ...f, tipo: e.target.value }))} placeholder="Ex: Troca de Filtro" />
              </div>
              <div className="input-group">
                <label className="label">Descrição *</label>
                <textarea className="input resize-none h-20" value={maintenanceForm.descricao} onChange={e => setMaintenanceForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Detalhes da manutenção..." />
              </div>
              <div className="input-group">
                <label className="label">Data Programada *</label>
                <input type="date" className="input" value={maintenanceForm.data_programada} onChange={e => setMaintenanceForm(f => ({ ...f, data_programada: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer"><button onClick={() => setShowMaintenanceModal(false)} className="btn-secondary">Cancelar</button><button onClick={handleAddMaintenance} className="btn-primary">Agendar</button></div>
          </div>
        </div>
      )}

      {/* Outros modais */}
      {showLogModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal animate-scale-in">
            <div className="modal-header"><h2 className="text-sm font-semibold text-gray-800">Novo Registro</h2><button onClick={() => setShowLogModal(false)} className="btn-icon"><X size={16} /></button></div>
            <div className="modal-body">
              <div className="input-group"><label className="label">Tipo</label>
                <select className="input" value={logForm.tipo} onChange={e => setLogForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option>Manutenção</option><option>Visita Técnica</option><option>Reparo</option><option>Inspeção</option><option>Observação</option>
                </select>
              </div>
              <div className="input-group"><label className="label">Descrição *</label><textarea className="input resize-none h-24" value={logForm.descricao} onChange={e => setLogForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o registro..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group"><label className="label">Prestador</label><input className="input" value={logForm.prestador_nome} onChange={e => setLogForm(f => ({ ...f, prestador_nome: e.target.value }))} placeholder="Nome" /></div>
                <div className="input-group"><label className="label">Contato</label><input className="input" value={logForm.prestador_contato} onChange={e => setLogForm(f => ({ ...f, prestador_contato: e.target.value }))} placeholder="Telefone" /></div>
              </div>
            </div>
            <div className="modal-footer"><button onClick={() => setShowLogModal(false)} className="btn-secondary">Cancelar</button><button onClick={handleAddLog} className="btn-primary">Registrar</button></div>
          </div>
        </div>
      )}

      {showRuleModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal animate-scale-in">
            <div className="modal-header"><h2 className="text-sm font-semibold text-gray-800">Regra de Manutenção Preventiva</h2><button onClick={() => setShowRuleModal(false)} className="btn-icon"><X size={16} /></button></div>
            <div className="modal-body">
              <div className="input-group"><label className="label">Tipo de Manutenção *</label><input className="input" value={ruleForm.tipo_manutencao} onChange={e => setRuleForm(f => ({ ...f, tipo_manutencao: e.target.value }))} placeholder="Ex: Limpeza de filtro" /></div>
              <div className="input-group"><label className="label">Periodicidade (dias)</label><input type="number" className="input" value={ruleForm.periodicidade_dias} onChange={e => setRuleForm(f => ({ ...f, periodicidade_dias: parseInt(e.target.value) || 30 }))} min="1" /></div>
              <div className="input-group"><label className="label">Próxima Execução</label><input type="date" className="input" value={ruleForm.proxima_execucao} onChange={e => setRuleForm(f => ({ ...f, proxima_execucao: e.target.value }))} /></div>
            </div>
            <div className="modal-footer"><button onClick={() => setShowRuleModal(false)} className="btn-secondary">Cancelar</button><button onClick={handleAddRule} className="btn-primary">Salvar Regra</button></div>
          </div>
        </div>
      )}
    </div>
  )
}
