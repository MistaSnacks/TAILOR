import { TailorLoading } from '@/components/ui/tailor-loader';

export default function DashboardLoading() {
    return (
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
            <TailorLoading mode="general" />
        </div>
    );
}
