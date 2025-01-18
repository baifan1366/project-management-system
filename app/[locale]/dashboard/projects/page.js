import { useTranslations } from 'next-intl';

export default function ProjectsPage() {
  const t = useTranslations('Projects');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('projects')}</h1>
        <button className="btn bg-primary text-white px-4 py-2 rounded-md">
          {t('createProject')}
        </button>
      </div>

      {/* 项目过滤器 */}
      <div className="flex gap-4 mb-6">
        <button className="text-sm px-4 py-2 rounded-md bg-primary/10 text-primary">
          {t('all')}
        </button>
        <button className="text-sm px-4 py-2 rounded-md hover:bg-primary/5">
          {t('active')}
        </button>
        <button className="text-sm px-4 py-2 rounded-md hover:bg-primary/5">
          {t('completed')}
        </button>
      </div>

      {/* 项目列表 */}
      <div className="grid gap-6">
        {/* 示例项目卡片 */}
        <div className="border rounded-lg p-6 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold">网站重构项目</h2>
              <p className="text-sm text-muted-foreground">{t('team')}: 开发团队</p>
            </div>
            <span className="px-2 py-1 text-sm bg-green-100 text-green-800 rounded">
              {t('inProgress')}
            </span>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-muted-foreground mb-2">
              <span>{t('progress')}</span>
              <span>65%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-primary h-2 rounded-full" style={{width: '65%'}}></div>
            </div>
          </div>
        </div>

        {/* 空状态 */}
        <div className="text-center py-12 border rounded-lg">
          <p className="text-muted-foreground">{t('noProjects')}</p>
        </div>
      </div>
    </div>
  );
} 