'use client'

import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Asset, AssetLog, AssetMaintenanceRule } from '@/types'
import { Plus, Search, QrCode, Edit, Trash2, Eye, Download, Printer, History, Shield, Wrench, X, ChevronDown, Package } from 'lucide-react'
import { format, parseISO, isPast } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import QRCode from 'qrcode'

export default function PatrimonioPage() {
  const supabase = createClient()
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showDetail, setShowDetail] = useState<Asset | null>(null)
  const [editing, setEditing] = useState<Asset | null>(null)
  const [logs, setLogs] = useState<AssetLog[]>([])
  const [rules, setRules] = useState<AssetMaintenanceRule[]>([])
  const [showLogModal, setShowLogModal] = useState(false)
  const [showRuleModal, setShowRuleModal] = useState(false)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  const [form, setForm] = useState({
    nome_item: '', descricao: '', numero_serie: '', nota_fiscal: '',
    garantia_status: 'Sem garantia', data_garantia_fim: '', possui_manutencao: false,
  })
  const [logForm, setLogForm] = useState({ tipo: 'Manutenção', descricao: '', prestador_nome: '', prestador_contato: '' })
  const [ruleForm, setRuleForm] = useState({ tipo_manutencao: '', periodicidade_dias: 30, proxima_execucao: '' })

  useEffect(() => { loadAssets() }, [])

  async function loadAssets() {
    setLoading(true)
    const { data } = await supabase.from('assets').select('*').order('created_at', { ascending: false })
    setAssets(data || [])
    setLoading(false)
  }

  async function loadDetail(asset: Asset) {
    setShowDetail(asset)
    const [logsRes, rulesRes] = await Promise.all([
      supabase.from('asset_logs').select('*').eq('asset_id', asset.id).order('created_at', { ascending: false }),
      supabase.from('asset_maintenance_rules').select('*').eq('asset_id', asset.id),
    ])
    setLogs(logsRes.data || [])
    setRules(rulesRes.data || [])
  }

  async function handleSave() {
    const { data: { user } } = await supabase.auth.getUser()
    const qrUrl = `${appUrl}/asset/`

    if (editing) {
      const { error } = await supabase.from('assets').update({ ...form }).eq('id', editing.id)
      if (error) { toast.error('Erro ao atualizar'); return }
      toast.success('Ativo atualizado!')
    } else {
      const { data, error } = await supabase.from('assets').insert({
        ...form, created_by: user?.id,
      }).select().single()
      if (error) { toast.error('Erro ao salvar'); return }
      // Update QR Code URL
      await supabase.from('assets').update({ qr_code_url: `${qrUrl}${data.id}` }).eq('id', data.id)
      toast.success('Ativo cadastrado!')
    }
    setShowModal(false)
    setEditing(null)
    resetForm()
    loadAssets()
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir este ativo?')) return
    await supabase.from('assets').delete().eq('id', id)
    toast.success('Ativo removido')
    loadAssets()
  }

  async function handleAddLog() {
    if (!showDetail) return
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase.from('asset_logs').insert({
      ...logForm, asset_id: showDetail.id, created_by: user?.id
    })
    if (error) { toast.error('Erro ao registrar'); return }
    toast.success('Registro adicionado!')
    setShowLogModal(false)
    setLogForm({ tipo: 'Manutenção', descricao: '', prestador_nome: '', prestador_contato: '' })
    loadDetail(showDetail)
  }

  async function handleAddRule() {
    if (!showDetail) return
    const { error } = await supabase.from('asset_maintenance_rules').insert({
      ...ruleForm, asset_id: showDetail.id
    })
    if (error) { toast.error('Erro ao salvar regra'); return }
    toast.success('Regra de manutenção adicionada!')
    setShowRuleModal(false)
    setRuleForm({ tipo_manutencao: '', periodicidade_dias: 30, proxima_execucao: '' })
    loadDetail(showDetail)
  }

  async function downloadQR(asset: Asset) {
    const url = `${appUrl}/asset/${asset.id}`
    const dataUrl = await QRCode.toDataURL(url, {
      width: 400, margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    })
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `qr-${asset.nome_item.replace(/\s+/g, '-')}.png`
    a.click()
    toast.success('QR Code baixado!')
  }

  function openEdit(asset: Asset) {
    setEditing(asset)
    setForm({
      nome_item: asset.nome_item,
      descricao: asset.descricao || '',
      numero_serie: asset.numero_serie || '',
      nota_fiscal: asset.nota_fiscal || '',
      garantia_status: asset.garantia_status || 'Sem garantia',
      data_garantia_fim: asset.data_garantia_fim || '',
      possui_manutencao: asset.possui_manutencao,
    })
    setShowModal(true)
  }

  function resetForm() {
    setForm({ nome_item: '', descricao: '', numero_serie: '', nota_fiscal: '', garantia_status: 'Sem garantia', data_garantia_fim: '', possui_manutencao: false })
  }

  const filtered = assets.filter(a =>
    a.nome_item.toLowerCase().includes(search.toLowerCase()) ||
    (a.numero_serie || '').toLowerCase().includes(search.toLowerCase())
  )

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

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555555]" />
        <input
          className="input pl-9"
          placeholder="Buscar por nome ou número de série..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="spinner" /></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon"><Package size={28} className="text-[#555555]" /></div>
          <p className="text-[#555555] text-sm">Nenhum ativo encontrado</p>
          <button onClick={() => { resetForm(); setShowModal(true) }} className="btn-secondary mt-3 text-xs">
            Cadastrar primeiro ativo
          </button>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="hidden md:table-cell">Nº Série</th>
                <th className="hidden lg:table-cell">Garantia</th>
                <th className="hidden lg:table-cell">Manutenção</th>
                <th className="text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(asset => {
                const garantiaVencida = asset.data_garantia_fim && isPast(parseISO(asset.data_garantia_fim))
                return (
                  <tr key={asset.id}>
                    <td>
                      <div className="font-medium text-[#f0f0f0]">{asset.nome_item}</div>
                      {asset.descricao && <div className="text-xs text-[#555555] mt-0.5 truncate max-w-48">{asset.descricao}</div>}
                    </td>
                    <td className="hidden md:table-cell text-[#888888]">{asset.numero_serie || '—'}</td>
                    <td className="hidden lg:table-cell">
                      <span className={`badge ${garantiaVencida ? 'badge-danger' : asset.garantia_status === 'Sem garantia' ? 'badge-default' : 'badge-success'}`}>
                        {asset.garantia_status}
                      </span>
                    </td>
                    <td className="hidden lg:table-cell">
                      <span className={`badge ${asset.possui_manutencao ? 'badge-info' : 'badge-default'}`}>
                        {asset.possui_manutencao ? 'Sim' : 'Não'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => loadDetail(asset)} className="btn-icon text-[#888888]" title="Ver detalhes">
                          <Eye size={14} />
                        </button>
                        <button onClick={() => downloadQR(asset)} className="btn-icon text-[#888888]" title="Baixar QR Code">
                          <QrCode size={14} />
                        </button>
                        <button onClick={() => openEdit(asset)} className="btn-icon text-[#888888]" title="Editar">
                          <Edit size={14} />
                        </button>
                        <button onClick={() => handleDelete(asset.id)} className="btn-icon text-[#f87171]" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">{editing ? 'Editar Ativo' : 'Novo Ativo'}</h2>
              <button onClick={() => setShowModal(false)} className="btn-icon text-[#666666]"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="label">Nome do Item *</label>
                <input className="input" value={form.nome_item} onChange={e => setForm(f => ({ ...f, nome_item: e.target.value }))} placeholder="Ex: Ar Condicionado" />
              </div>
              <div className="input-group">
                <label className="label">Descrição</label>
                <textarea className="input resize-none h-20" value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do item..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Número de Série</label>
                  <input className="input" value={form.numero_serie} onChange={e => setForm(f => ({ ...f, numero_serie: e.target.value }))} />
                </div>
                <div className="input-group">
                  <label className="label">Nota Fiscal</label>
                  <input className="input" value={form.nota_fiscal} onChange={e => setForm(f => ({ ...f, nota_fiscal: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Status de Garantia</label>
                  <select className="input" value={form.garantia_status} onChange={e => setForm(f => ({ ...f, garantia_status: e.target.value }))}>
                    <option>Sem garantia</option>
                    <option>Em garantia</option>
                    <option>Garantia vencida</option>
                  </select>
                </div>
                <div className="input-group">
                  <label className="label">Fim da Garantia</label>
                  <input type="date" className="input" value={form.data_garantia_fim} onChange={e => setForm(f => ({ ...f, data_garantia_fim: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input type="checkbox" id="possui_manutencao" checked={form.possui_manutencao} onChange={e => setForm(f => ({ ...f, possui_manutencao: e.target.checked }))} className="w-4 h-4 rounded" />
                <label htmlFor="possui_manutencao" className="text-sm text-[#a0a0a0] cursor-pointer">Possui manutenção preventiva</label>
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
          <div className="modal animate-scale-in max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="text-sm font-semibold text-[#f0f0f0]">{showDetail.nome_item}</h2>
                <p className="text-xs text-[#555555]">ID: {showDetail.id.slice(0, 8)}...</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => downloadQR(showDetail)} className="btn-secondary text-xs">
                  <QrCode size={12} /> QR Code
                </button>
                <button onClick={() => setShowDetail(null)} className="btn-icon text-[#666666]"><X size={16} /></button>
              </div>
            </div>
            <div className="modal-body">
              {/* Info */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {[
                  ['Nº Série', showDetail.numero_serie],
                  ['Nota Fiscal', showDetail.nota_fiscal],
                  ['Garantia', showDetail.garantia_status],
                  ['Venc. Garantia', showDetail.data_garantia_fim ? format(parseISO(showDetail.data_garantia_fim), 'dd/MM/yyyy') : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="bg-[#1a1a1a] rounded-lg p-3">
                    <div className="text-[#555555] mb-1">{k}</div>
                    <div className="text-[#e0e0e0] font-medium">{v || '—'}</div>
                  </div>
                ))}
              </div>

              {/* Regras de manutenção */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#888888] uppercase tracking-wide">Manutenção Preventiva</span>
                  <button onClick={() => setShowRuleModal(true)} className="btn-secondary text-xs py-1">
                    <Plus size={11} /> Adicionar Regra
                  </button>
                </div>
                {rules.length === 0 ? (
                  <p className="text-xs text-[#444444] py-2">Nenhuma regra cadastrada</p>
                ) : (
                  <div className="space-y-2">
                    {rules.map(r => (
                      <div key={r.id} className="flex items-center justify-between bg-[#1a1a1a] rounded-lg p-3 text-xs">
                        <div>
                          <div className="text-[#e0e0e0] font-medium">{r.tipo_manutencao}</div>
                          <div className="text-[#555555]">A cada {r.periodicidade_dias} dias</div>
                        </div>
                        <div className="text-right">
                          <div className="text-[#888888]">Próxima</div>
                          <div className={r.proxima_execucao && isPast(parseISO(r.proxima_execucao)) ? 'text-[#f87171]' : 'text-[#4ade80]'}>
                            {r.proxima_execucao ? format(parseISO(r.proxima_execucao), 'dd/MM/yy') : '—'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-[#888888] uppercase tracking-wide">Histórico de Registros</span>
                  <button onClick={() => setShowLogModal(true)} className="btn-secondary text-xs py-1">
                    <Plus size={11} /> Registrar
                  </button>
                </div>
                {logs.length === 0 ? (
                  <p className="text-xs text-[#444444] py-2">Nenhum registro ainda</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {logs.map(log => (
                      <div key={log.id} className="bg-[#1a1a1a] rounded-lg p-3 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="badge badge-default">{log.tipo}</span>
                          <span className="text-[#555555]">{format(parseISO(log.created_at), 'dd/MM/yy HH:mm')}</span>
                        </div>
                        <p className="text-[#e0e0e0]">{log.descricao}</p>
                        {log.prestador_nome && <p className="text-[#666666] mt-1">Prestador: {log.prestador_nome} {log.prestador_contato ? `(${log.prestador_contato})` : ''}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Log */}
      {showLogModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">Novo Registro</h2>
              <button onClick={() => setShowLogModal(false)} className="btn-icon text-[#666666]"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="label">Tipo</label>
                <select className="input" value={logForm.tipo} onChange={e => setLogForm(f => ({ ...f, tipo: e.target.value }))}>
                  <option>Manutenção</option><option>Visita Técnica</option><option>Reparo</option><option>Inspeção</option><option>Observação</option>
                </select>
              </div>
              <div className="input-group">
                <label className="label">Descrição *</label>
                <textarea className="input resize-none h-24" value={logForm.descricao} onChange={e => setLogForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descreva o registro..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="input-group">
                  <label className="label">Prestador</label>
                  <input className="input" value={logForm.prestador_nome} onChange={e => setLogForm(f => ({ ...f, prestador_nome: e.target.value }))} placeholder="Nome" />
                </div>
                <div className="input-group">
                  <label className="label">Contato</label>
                  <input className="input" value={logForm.prestador_contato} onChange={e => setLogForm(f => ({ ...f, prestador_contato: e.target.value }))} placeholder="Telefone" />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowLogModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleAddLog} className="btn-primary">Registrar</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Regra Manutenção */}
      {showRuleModal && (
        <div className="modal-overlay" style={{ zIndex: 60 }}>
          <div className="modal animate-scale-in">
            <div className="modal-header">
              <h2 className="text-sm font-semibold text-[#f0f0f0]">Regra de Manutenção Preventiva</h2>
              <button onClick={() => setShowRuleModal(false)} className="btn-icon text-[#666666]"><X size={16} /></button>
            </div>
            <div className="modal-body">
              <div className="input-group">
                <label className="label">Tipo de Manutenção *</label>
                <input className="input" value={ruleForm.tipo_manutencao} onChange={e => setRuleForm(f => ({ ...f, tipo_manutencao: e.target.value }))} placeholder="Ex: Limpeza de filtro" />
              </div>
              <div className="input-group">
                <label className="label">Periodicidade (dias)</label>
                <input type="number" className="input" value={ruleForm.periodicidade_dias} onChange={e => setRuleForm(f => ({ ...f, periodicidade_dias: parseInt(e.target.value) }))} min="1" />
              </div>
              <div className="input-group">
                <label className="label">Próxima Execução</label>
                <input type="date" className="input" value={ruleForm.proxima_execucao} onChange={e => setRuleForm(f => ({ ...f, proxima_execucao: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowRuleModal(false)} className="btn-secondary">Cancelar</button>
              <button onClick={handleAddRule} className="btn-primary">Salvar Regra</button>
            </div>
          </div>
        </div>
      )}

      {/* Package icon fallback */}
      {false && <Package />}
    </div>
  )
}
