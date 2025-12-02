import { DashboardSidebar, DashboardMainContent } from '@/components/dashboard/sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      <div className="flex">
        <DashboardSidebar />
        <DashboardMainContent>{children}</DashboardMainContent>
      </div>
    </div>
  );
}
