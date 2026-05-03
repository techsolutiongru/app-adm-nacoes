'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FileText, Download, Filter, BarChart2 } from 'lucide-react'
import { format, subDays } from 'date-fns'
import toast from 'react-hot-toast'

const LOG = (label: string, data: unknown) => console.log(`[Relatórios] ${label}:`, data)

export default function RelatoriosPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [modulo, setModulo] = useState('manutencao')
  const [periodo, setPeriodo] = useState('30')
  const [resultados, setResultados] = useState<any[]>([])
  const [colunas, setColunas] = useState<string[]>([])

  async function gerarRelatorio() {
    setLoading(true)
    try {
      let dataInicio = new Date(0).toISOString()
      if (periodo !== 'tudo') dataInicio = subDays(new Date(), parseInt(periodo)).toISOString()

      let data: any[] = [], cols: string[] = []

      if (modulo === 'manutencao') {
        const res = await supabase.from('maintenance_orders')
          .select('id, descricao, prioridade, status, data_solicitacao, valor_estimado, responsavel, maintenance_categories(nome)')
          .gte('created_at', dataInicio).order('created_at', { ascending: false })
        LOG('relatório manutenção', res)
        data = (res.data || []).map(item => ({
          ID: item.id.slice(0, 8), Descrição: item.descricao,
          Categoria: (item.maintenance_categories as any)?.nome || '-',
          Prioridade: item.prioridade, Status: item.status,
          Solicitado: format(new Date(item.data_solicitacao), 'dd/MM/yyyy'),
          Responsável: item.responsavel || '-', Valor: item.valor_estimado || '-'
        }))
        cols = ['ID', 'Descrição', 'Categoria', 'Prioridade', 'Status', 'Solicitado', 'Responsável', 'Valor']
      } else if (modulo === 'patrimonio') {
        const res = await supabase.from('assets').select('*').gte('created_at', dataInicio).order('nome_item')
        LOG('relatório patrimônio', res)
        data = (res.data || []).map(item => ({
          Item: item.nome_item, Série: item.numero_serie || '-', NF: item.nota_fiscal || '-',
          Garantia: item.garantia_status || '-',
          Vencimento: item.data_garantia_fim ? format(new Date(item.data_garantia_fim), 'dd/MM/yyyy') : '-',
          Manutenção_Prev: item.possui_manutencao ? 'Sim' : 'Não'
        }))
        cols = ['Item', 'Série', 'NF', 'Garantia', 'Vencimento', 'Manutenção_Prev']
      } else {
        data = [{ Msg: 'Relatório de escala em desenvolvimento' }]; cols = ['Msg']
      }

      setResultados(data); setColunas(cols)
      toast.success(`Relatório gerado: ${data.length} registros`)
    } catch (e) {
      console.error('[Relatórios] Erro:', e)
      toast.error('Erro ao gerar relatório')
    } finally { setLoading(false) }
  }

  async function exportarExcel() {
    if (resultados.length === 0) return
    const XLSX = (await import('xlsx')).default
    const ws = XLSX.utils.json_to_sheet(resultados)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório')
    XLSX.writeFile(wb, `relatorio_${modulo}_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`)
  }

  async function exportarPDF() {
    if (resultados.length === 0) return
    const { jsPDF } = await import('jspdf')
    await import('jspdf-autotable')
    const doc = new jsPDF()
    doc.setFontSize(16); doc.text(`Relatório: ${modulo.toUpperCase()}`, 14, 20)
    doc.setFontSize(10); doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 14, 28)
    const tableData = resultados.map(row => colunas.map(col => row[col]))
    ;(doc as any).autoTable({ head: [colunas], body: tableData, startY: 35, styles: { fontSize: 8 }, headStyles: { fillColor: [55, 65, 81] } })
    doc.save(`relatorio_${modulo}_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`)
  }

  return (
    <div>
      <div className="page-header">
        <div><h1 className="page-title">Relatórios</h1><p className="page-subtitle">Exportação de dados do sistema</p></div>
      </div>

      <div className="card mb-6">
        <div className="flex flex-wrap items-end gap-4">
          <div className="input-group flex-1 min-w-[200px]">
            <label className="label">Módulo</label>
            <select className="input" value={modulo} onChange={e => setModulo(e.target.value)}>
              <option value="manutencao">Ordens de Serviço</option>
              <option value="patrimonio">Patrimônio</option>
              <option value="escala">Escala de Voluntários</option>
            </select>
          </div>
          <div className="input-group flex-1 min-w-[200px]">
            <label className="label">Período</label>
            <select className="input" value={periodo} onChange={e => setPeriodo(e.target.value)}>
              <option value="7">Últimos 7 dias</option><option value="30">Últimos 30 dias</option>
              <option value="90">Últimos 90 dias</option><option value="tudo">Todo o período</option>
            </select>
          </div>
          <button onClick={gerarRelatorio} disabled={loading} className="btn-primary py-[9px]">
            {loading ? <span className="spinner" /> : <Filter size={16} />} Gerar Visão
          </button>
        </div>
      </div>

      {resultados.length > 0 ? (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Visualização ({resultados.length} registros)</h3>
            <div className="flex gap-2">
              <button onClick={exportarExcel} className="btn-secondary py-1 text-xs text-green-600 hover:border-green-400">
                <Download size={14} /> Excel
              </button>
              <button onClick={exportarPDF} className="btn-secondary py-1 text-xs text-red-600 hover:border-red-400">
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>
          <div className="table-wrapper max-h-[500px] overflow-y-auto">
            <table>
              <thead className="sticky top-0 z-10"><tr>{colunas.map(col => <th key={col}>{col}</th>)}</tr></thead>
              <tbody>{resultados.map((row, i) => <tr key={i}>{colunas.map(col => <td key={col} className="whitespace-nowrap">{row[col]}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-state-icon"><BarChart2 size={28} className="text-gray-400" /></div>
          <p className="text-gray-400 text-sm">Selecione os filtros e clique em Gerar Visão</p>
        </div>
      )}
    </div>
  )
}
