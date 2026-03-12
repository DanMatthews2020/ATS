import { Sidebar } from '@/components/layout/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-surface)]">
      <Sidebar />
      <main
        style={{ marginLeft: 'var(--sidebar-width)' }}
        className="min-h-screen flex flex-col"
      >
        {children}
      </main>
    </div>
  );
}
