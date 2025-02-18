import { useTranslations } from 'next-intl';

export default function TeamsPage() {
  const t = useTranslations('Teams');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('teams')}</h1>
        <button className="btn bg-primary text-white px-4 py-2 rounded-md">
          {t('createTeam')}
        </button>
      </div>

      {/* 团队列表 */}
      <div className="grid gap-6">
        {/* 示例团队卡片 */}
        <div className="border rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">开发团队</h2>
              <p className="text-sm text-muted-foreground">5 {t('members')}</p>
            </div>
            <button className="text-sm text-primary">{t('manage')}</button>
          </div>
          <div className="flex gap-2">
            <span className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
              3 {t('activeProjects')}
            </span>
          </div>
        </div>

        {/* 空状态 */}
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">{t('noTeams')}</p>
        </div>
      </div>
    </div>
  );
} 