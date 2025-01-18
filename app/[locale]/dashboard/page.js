import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const t = useTranslations('Dashboard');

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">{t('welcome')}</h1>
      
      <div className="grid md:grid-cols-2 gap-6">
        {/* 快速访问卡片 */}
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t('quickAccess')}</h2>
          <div className="grid grid-cols-2 gap-4">
            <a href="/dashboard/teams" className="p-4 border rounded-md hover:bg-primary/5">
              <h3 className="font-medium">{t('teams')}</h3>
              <p className="text-sm text-muted-foreground">{t('manageTeams')}</p>
            </a>
            <a href="/dashboard/projects" className="p-4 border rounded-md hover:bg-primary/5">
              <h3 className="font-medium">{t('projects')}</h3>
              <p className="text-sm text-muted-foreground">{t('manageProjects')}</p>
            </a>
          </div>
        </div>

        {/* 活动概览卡片 */}
        <div className="border rounded-lg p-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">{t('recentActivity')}</h2>
          <div className="space-y-4">
            {/* 这里将来可以添加实际的活动数据 */}
            <p className="text-muted-foreground">{t('noRecentActivity')}</p>
          </div>
        </div>
      </div>
    </div>
  );
} 