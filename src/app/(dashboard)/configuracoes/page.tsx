'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Settings as SettingsType } from '@/types'
import { Save, Mail, Bell, QrCode, X, Plus } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ConfiguracoesPage() {
  const supabase = createClient()
  const [settings, setSettings] = useState<SettingsType | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [novoEmail, setNovoEmail] = useState('')

  useEffect(() => { loadSettings() }, [])

  async function loadSettings() {
    setLoading(true)
    const { data } = await supabase.from('settings').select('*').limit(1).single()
    if (data) {
      setSettings(data as SettingsType)
    } else {
       // Falha fallback se nao existir seed
       setSettings({
          id: '', emails_admin: ['admin@exemplo.com'], dias_alerta: 7, gerar_qrcode: true, updated_at: ''
       })
    }
    setLoading(false)
  }

  async function handleSave() {
    if (!settings) return
    setSaving(true)
    
    // Se não tiver ID (primeira vez sem seed) tenta pegar de novo ou faz insert. Assumimos update via RLS ou eq.
    const payload = {
      emails_admin: settings.emails_admin,
      dias_alerta: settings.dias_alerta,
      gerar_qrcode: settings.gerar_qrcode,
      updated_at: new Date().toISOString()
    }

    let error;
    if (settings.id) {
       const res = await supabase.from('settings').update(payload).eq('id', settings.id)
       error = res.error
    } else {
       // fallback para insert se nao existisse na db (o script sql ja fez o seed na real)
       const res = await supabase.from('settings').insert(payload)
       error = res.error
    }

    if (error) {
      toast.error('Erro ao salvar configurações')
      console.error(error)
    } else {
      toast.success('Configurações salvas!')
      loadSettings()
    }
    setSaving(false)
  }

  function handleAddEmail(e: React.FormEvent) {
    e.preventDefault()
    if (!novoEmail.trim() || !settings) return
    if (settings.emails_admin.includes(novoEmail)) {
       toast.error('Email já existe')
       return
    }
    setSettings({ ...settings, emails_admin: [...settings.emails_admin, novoEmail] })
    setNovoEmail('')
  }

  function handleRemoveEmail(email: string) {
    if (!settings) return
    setSettings({ ...settings, emails_admin: settings.emails_admin.filter(e => e !== email) })
  }

  if (loading) {
    return <div className="flex justify-center py-16"><div className="spinner" /></div>
  }

  if (!settings) return null

  return (
    <div className="max-w-3xl">
      <div className="page-header">
        <div>
          <h1 className="page-title">Configurações</h1>
          <p className="page-subtitle">Ajustes gerais do sistema</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="btn-primary">
          {saving ? <span className="spinner" /> : <Save size={15} />}
          Salvar
        </button>
      </div>

      <div className="space-y-6">
        {/* Notificações e Alertas */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#333333] pb-3">
            <Bell size={16} className="text-[#888888]" />
            <h2 className="text-sm font-semibold text-[#f0f0f0]">Notificações de Manutenção</h2>
          </div>
          
          <div className="space-y-4">
            <div className="input-group">
              <label className="label">Dias de antecedência para alerta (Preventiva)</label>
              <input 
                type="number" 
                className="input max-w-xs" 
                value={settings.dias_alerta} 
                onChange={e => setSettings({ ...settings, dias_alerta: parseInt(e.target.value) || 7 })}
                min="1"
              />
              <p className="text-xs text-[#555555] mt-1">
                 Quantos dias antes do vencimento da manutenção preventiva o sistema deve enviar alerta.
              </p>
            </div>

            <div className="pt-2">
               <label className="label">Emails de Administradores (Recebem alertas)</label>
               <form onSubmit={handleAddEmail} className="flex gap-2 max-w-md mb-3">
                  <input 
                    type="email" 
                    className="input" 
                    placeholder="Adicionar novo email..." 
                    value={novoEmail}
                    onChange={e => setNovoEmail(e.target.value)}
                  />
                  <button type="submit" className="btn-secondary px-3"><Plus size={16}/></button>
               </form>
               
               {settings.emails_admin.length === 0 ? (
                  <p className="text-xs text-[#555555]">Nenhum email configurado.</p>
               ) : (
                  <div className="flex flex-wrap gap-2">
                     {settings.emails_admin.map(email => (
                        <div key={email} className="flex items-center gap-2 bg-[#2a2a2a] border border-[#333333] px-3 py-1.5 rounded-lg text-sm">
                           <Mail size={14} className="text-[#888888]" />
                           <span className="text-[#e0e0e0]">{email}</span>
                           <button onClick={() => handleRemoveEmail(email)} className="text-[#f87171] hover:bg-[#3d1515] p-0.5 rounded ml-1 transition-colors">
                              <X size={14} />
                           </button>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </div>

        {/* Recursos */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4 border-b border-[#333333] pb-3">
            <QrCode size={16} className="text-[#888888]" />
            <h2 className="text-sm font-semibold text-[#f0f0f0]">Recursos do Sistema</h2>
          </div>

          <div className="flex items-center gap-3">
             <input 
               type="checkbox" 
               id="gerar_qrcode" 
               checked={settings.gerar_qrcode}
               onChange={e => setSettings({ ...settings, gerar_qrcode: e.target.checked })}
               className="w-4 h-4 rounded"
             />
             <div>
                <label htmlFor="gerar_qrcode" className="text-sm text-[#f0f0f0] cursor-pointer block">Habilitar geração de QR Code</label>
                <p className="text-xs text-[#555555]">Permite gerar links e imagens QR Code para o Patrimônio.</p>
             </div>
          </div>
        </div>
      </div>
    </div>
  )
}
