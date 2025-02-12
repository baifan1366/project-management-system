'use client'; 

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

export default function CreateProjectPage() {
  const t = useTranslations('CreateProject');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // TODO: 处理项目创建逻辑

    // 创建成功后返回项目列表页
    router.push('/projects');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-6">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900 mr-4"
          >
            ←
          </button>
          <h1 className="text-2xl font-bold">{t('createProject')}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-1">
              {t('projectName')}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('team')}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('description')}
            </label> 
            <textarea
              rows="4"
              className="w-full px-3 py-2 border rounded-md"
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('startDate')}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {t('endDate')}
            </label>
            <input
              type="date"
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm border rounded-md"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm bg-primary text-white rounded-md"
            >
              {t('create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}