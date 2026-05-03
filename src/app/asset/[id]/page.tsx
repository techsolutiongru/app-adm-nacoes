import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import QRCodeReact from './QRCodeReact'

export default async function AssetPublicPage({ params }: { params: { id: string } }) {
  const supabase = await createClient()
  const { data: asset } = await supabase
    .from('assets')
    .select('*, asset_maintenance_rules(*), asset_logs(*)')
    .eq('id', params.id)
    .single()

  if (!asset) notFound()

  const garantiaVencida = asset.data_garantia_fim && new Date(asset.data_garantia_fim) < new Date()
  const assetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/asset/${asset.id}`

  return (
    <div className="min-h-screen bg-[#0f0f0f] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-xs text-[#555555] mb-1">Congregação Cristã no Brasil — Nações</div>
          <div className="text-xs text-[#444444]">Patrimônio Digital</div>
        </div>

        {/* Card principal */}
        <div className="card border border-[#2a2a2a] mb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-base font-bold text-[#f0f0f0]">{asset.nome_item}</h1>
              {asset.descricao && <p className="text-xs text-[#666666] mt-1">{asset.descricao}</p>}
            </div>
            <div className="qr-print-area">
              <QRCodeReact value={assetUrl} size={80} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {asset.numero_serie && (
              <div className="bg-[#1a1a1a] rounded-lg p-2.5">
                <div className="text-[#555555] mb-0.5">Nº de Série</div>
                <div className="text-[#e0e0e0] font-medium">{asset.numero_serie}</div>
              </div>
            )}
            {asset.nota_fiscal && (
              <div className="bg-[#1a1a1a] rounded-lg p-2.5">
                <div className="text-[#555555] mb-0.5">Nota Fiscal</div>
                <div className="text-[#e0e0e0] font-medium">{asset.nota_fiscal}</div>
              </div>
            )}
            <div className="bg-[#1a1a1a] rounded-lg p-2.5">
              <div className="text-[#555555] mb-0.5">Garantia</div>
              <div className={garantiaVencida ? 'text-[#f87171] font-medium' : 'text-[#e0e0e0] font-medium'}>
                {asset.garantia_status || 'Sem garantia'}
              </div>
            </div>
            {asset.data_garantia_fim && (
              <div className="bg-[#1a1a1a] rounded-lg p-2.5">
                <div className="text-[#555555] mb-0.5">Venc. Garantia</div>
                <div className={garantiaVencida ? 'text-[#f87171] font-medium' : 'text-[#4ade80] font-medium'}>
                  {format(parseISO(asset.data_garantia_fim), 'dd/MM/yyyy')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Manutenção preventiva */}
        {asset.asset_maintenance_rules?.length > 0 && (
          <div className="card border border-[#2a2a2a] mb-4">
            <div className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-3">Manutenção Preventiva</div>
            <div className="space-y-2">
              {asset.asset_maintenance_rules.map((rule: any) => {
                const vencida = rule.proxima_execucao && new Date(rule.proxima_execucao) < new Date()
                return (
                  <div key={rule.id} className="flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[#e0e0e0]">{rule.tipo_manutencao}</div>
                      <div className="text-[#555555]">A cada {rule.periodicidade_dias} dias</div>
                    </div>
                    {rule.proxima_execucao && (
                      <div className={`text-right ${vencida ? 'text-[#f87171]' : 'text-[#4ade80]'}`}>
                        <div>{vencida ? '⚠ Vencida' : '✓ Em dia'}</div>
                        <div className="text-[#666666]">{format(parseISO(rule.proxima_execucao), 'dd/MM/yy')}</div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Histórico */}
        {asset.asset_logs?.length > 0 && (
          <div className="card border border-[#2a2a2a]">
            <div className="text-xs font-semibold text-[#888888] uppercase tracking-wide mb-3">Últimos Registros</div>
            <div className="space-y-2">
              {asset.asset_logs.slice(0, 3).map((log: any) => (
                <div key={log.id} className="text-xs border-b border-[#2a2a2a] pb-2 last:border-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="badge badge-default">{log.tipo}</span>
                    <span className="text-[#555555]">{format(parseISO(log.created_at), 'dd/MM/yy')}</span>
                  </div>
                  <p className="text-[#a0a0a0]">{log.descricao}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-center mt-6 text-xs text-[#444444]">
          Cadastrado em {format(parseISO(asset.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>
    </div>
  )
}
