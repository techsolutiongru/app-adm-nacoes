import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from 'react-hot-toast'

export const metadata: Metadata = {
  title: 'ADM CCB - Nações ERP',
  description: 'Sistema de gestão da Congregação Cristã no Brasil - Nações',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            className: 'toast-custom',
            duration: 3000,
            style: {
              background: '#1e1e1e',
              color: '#f0f0f0',
              border: '1px solid #333333',
              borderRadius: '12px',
              fontSize: '13px',
            },
          }}
        />
      </body>
    </html>
  )
}
