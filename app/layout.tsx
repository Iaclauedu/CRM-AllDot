import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Alldot. CRM - Plataforma B2B de Vendas & Negociações',
  description:
    'CRM B2B moderno com pipeline Kanban, visão 360º de negócios e estética profissional inspirada no RD Station e ClickUp com identidade visual AllDot.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${inter.variable} font-sans bg-[#F8FAFC] text-slate-900 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
