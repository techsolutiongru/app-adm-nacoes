import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Resend } from 'resend'
import { format, parseISO, differenceInHours } from 'date-fns'

const resend = new Resend(process.env.RESEND_API_KEY)

function createClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll() { return [] }, setAll() {} } }
  )
}

export async function GET() {
  try {
    const supabase = createClient()
    const now = new Date()

    // 1. Buscar todas as manutenções pendentes que já venceram ou vencem hoje
    const { data: maintenances, error: maintError } = await supabase
      .from('maintenance')
      .select('*, assets(nome_item)')
      .eq('status', 'pendente')
      .lte('data_programada', now.toISOString().split('T')[0])

    if (maintError) throw maintError
    if (!maintenances || maintenances.length === 0) {
      return NextResponse.json({ message: 'Nenhuma manutenção atrasada encontrada.' })
    }

    // 2. Buscar admins para enviar email
    const { data: admins, error: adminError } = await supabase
      .from('users')
      .select('email')
      .eq('role', 'admin')

    if (adminError) throw adminError
    const adminEmails = admins?.map(a => a.email) || []
    
    // Fallback caso não haja admins na tabela users, tenta da settings
    if (adminEmails.length === 0) {
      const { data: settings } = await supabase.from('settings').select('emails_admin').single()
      if (settings?.emails_admin) {
        try {
          const parsed = JSON.parse(settings.emails_admin)
          if (Array.isArray(parsed)) adminEmails.push(...parsed)
        } catch(e) {}
      }
    }

    if (adminEmails.length === 0) {
      return NextResponse.json({ message: 'Nenhum e-mail de admin configurado para receber alertas.' })
    }

    let notificacoesEnviadas = 0

    // 3. Processar cada manutenção
    for (const m of maintenances) {
      // Verificar last_notified_at (não notificar mais de 1x por dia)
      if (m.last_notified_at) {
        const hoursSinceLastNotification = differenceInHours(now, parseISO(m.last_notified_at))
        if (hoursSinceLastNotification < 24) continue
      }

      // 4. Enviar email
      const assetName = m.assets?.nome_item || 'Patrimônio Desconhecido'
      const subject = `⚠️ ALERTA: Manutenção Atrasada - ${assetName}`
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px;">
          <h2 style="color: #dc2626; margin-top: 0;">Alerta de Manutenção Preventiva</h2>
          <p>Olá Administrador,</p>
          <p>O sistema identificou uma manutenção pendente que já ultrapassou a data programada.</p>
          
          <div style="background-color: #f9fafb; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Patrimônio:</strong> ${assetName}</p>
            <p style="margin: 0 0 10px 0;"><strong>Tipo:</strong> ${m.tipo}</p>
            <p style="margin: 0 0 10px 0;"><strong>Descrição:</strong> ${m.descricao}</p>
            <p style="margin: 0 0 10px 0;"><strong>Data Programada:</strong> ${format(parseISO(m.data_programada), 'dd/MM/yyyy')}</p>
            <p style="margin: 0;"><strong>Status:</strong> <span style="color: #d97706; font-weight: bold;">PENDENTE</span></p>
          </div>
          
          <p>Por favor, acesse o painel do sistema para atualizar o status desta manutenção.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #6b7280; text-align: center;">Este é um e-mail automático do sistema ADM Nações ERP.</p>
        </div>
      `

      if (process.env.RESEND_API_KEY) {
        try {
          await resend.emails.send({
            from: 'Sistema ADM Nações <onboarding@resend.dev>', // Usando domínio de dev da resend temporariamente
            to: adminEmails,
            subject: subject,
            html: html
          })
          
          // 5. Atualizar last_notified_at
          await supabase.from('maintenance').update({ last_notified_at: now.toISOString() }).eq('id', m.id)
          notificacoesEnviadas++
        } catch (err) {
          console.error(`Erro ao enviar email para manutenção ${m.id}:`, err)
        }
      } else {
        console.log(`[DEV MODE] Email não enviado. Falta RESEND_API_KEY. Subject: ${subject}`)
        await supabase.from('maintenance').update({ last_notified_at: now.toISOString() }).eq('id', m.id)
        notificacoesEnviadas++
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Processamento concluído. ${notificacoesEnviadas} notificações enviadas.` 
    })

  } catch (error: any) {
    console.error('[Cron API Error]', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
