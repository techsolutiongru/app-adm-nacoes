import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { format, parseISO, isPast } from 'date-fns'
import { CheckCircle, AlertTriangle, Clock, Calendar } from 'lucide-react'

// Criamos um client sem autenticação (anon key) porque essa página é pública
function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export default async function PublicAssetPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { id } = params

  const { data: asset, error } = await supabase
    .from('assets')
    .select(`
      *,
      maintenance (
        id, tipo, descricao, data_programada, data_realizada, status
      )
    `)
    .eq('id', id)
    .single()

  if (error || !asset) {
    return notFound()
  }

  const garantiaVencida = asset.data_garantia_fim && isPast(parseISO(asset.data_garantia_fim))
  
  // Ordenar as manutenções (mais recentes primeiro)
  const maintenances = (asset.maintenance || []).sort((a: any, b: any) => 
    new Date(b.data_programada).getTime() - new Date(a.data_programada).getTime()
  )

  return (
    <div className="min-h-screen bg-[#f5f5f5] text-gray-800 p-4 md:p-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
        {/* Header Institucional */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row items-center md:items-start gap-6">
          <img src="/logo.png" alt="Logo ADM Nações" className="h-16 object-contain" />
          <div className="text-center md:text-left flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{asset.nome_item}</h1>
            <p className="text-sm text-gray-500 mt-1">Série: <span className="font-medium text-gray-700">{asset.numero_serie || 'Não informado'}</span></p>
            {asset.descricao && (
              <p className="text-sm text-gray-600 mt-3 p-3 bg-gray-50 rounded border border-gray-100">
                {asset.descricao}
              </p>
            )}
          </div>
        </div>

        {/* Detalhes Técnicos */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Informações do Patrimônio
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Nota Fiscal</span>
              <span className="text-sm font-medium text-gray-800">{asset.nota_fiscal || 'Não informada'}</span>
            </div>
            
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Status de Garantia</span>
              <div className="flex items-center gap-2 mt-1">
                {garantiaVencida ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    <AlertTriangle size={14} /> Vencida
                  </span>
                ) : asset.garantia_status === 'Sem garantia' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                    Sem cobertura
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle size={14} /> Em garantia
                  </span>
                )}
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fim da Garantia</span>
              <span className="text-sm font-medium text-gray-800">
                {asset.data_garantia_fim ? format(parseISO(asset.data_garantia_fim), 'dd/MM/yyyy') : 'Não aplicável'}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
              <span className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Registrado em</span>
              <span className="text-sm font-medium text-gray-800">
                {asset.created_at ? format(parseISO(asset.created_at), 'dd/MM/yyyy HH:mm') : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Histórico de Manutenções */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            Histórico de Manutenções
          </h2>
          
          {maintenances.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-100">
              <Clock className="mx-auto h-8 w-8 text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">Nenhuma manutenção registrada para este item.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {maintenances.map((m: any) => (
                <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-800">{m.tipo}</span>
                      {m.status === 'pendente' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 uppercase tracking-wide">Pendente</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 uppercase tracking-wide">Concluída</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{m.descricao}</p>
                  </div>
                  
                  <div className="flex flex-col sm:text-right text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-1 sm:justify-end">
                      <Calendar size={12} /> Prog: {format(parseISO(m.data_programada), 'dd/MM/yyyy')}
                    </div>
                    {m.data_realizada && (
                      <div className="flex items-center gap-1 sm:justify-end text-green-700">
                        <CheckCircle size={12} /> Feita: {format(parseISO(m.data_realizada), 'dd/MM/yyyy')}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
