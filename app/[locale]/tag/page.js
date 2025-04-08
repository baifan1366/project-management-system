'use client';

import { useTranslations } from 'next-intl';
import { fetchAllTags } from '@/lib/redux/features/tagSlice';
import { fetchDefaultByName } from '@/lib/redux/features/defaultSlice';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Icons from 'lucide-react';

export default function Tag() {
  const t = useTranslations('Tag');
  const dispatch = useDispatch();
  const availableFields = useSelector(state => state.tags?.tags || []);
  const defaultSettings = useSelector(state => state.defaults?.data || []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchAllTags());
    dispatch(fetchDefaultByName('tag'));
  }, [dispatch]);

  useEffect(() => {
    if (defaultSettings.length > 0) {
      setIsLoading(false);
    }
  }, [defaultSettings]);

  useEffect(() => {
    console.log('defaultSettings:', defaultSettings);
    const tag = defaultSettings.find(setting => setting.name === 'tag');
    console.log('tag:', tag);
  }, [defaultSettings]);

  // 获取默认字段数量
  const getDefaultFieldCount = () => {
    if (!defaultSettings || defaultSettings.length === 0) return 2;
    
    // 检查数组嵌套结构
    let tagDefault = null;
    
    // 尝试在不同层级查找custom_field
    for (const setting of defaultSettings) {
      if (setting.name === 'tag') {
        tagDefault = setting;
        break;
      }
      
      // 如果是嵌套数组，尝试在第一层嵌套中查找
      if (Array.isArray(setting) && setting.length > 0) {
        const nestedSetting = setting.find(s => s.name === 'tag');
        if (nestedSetting) {
          tagDefault = nestedSetting;
          break;
        }
        
        // 如果是二层嵌套，尝试在第二层嵌套中查找
        for (const subSetting of setting) {
          if (Array.isArray(subSetting) && subSetting.length > 0) {
            const deepNestedSetting = subSetting.find(s => s.name === 'tag');
            if (deepNestedSetting) {
              tagDefault = deepNestedSetting;
              break;
            }
          }
        }
      }
    }
    
    // 检查是否找到了自定义字段设置
    if (!tagDefault) return 2;
    
    // 返回数量
    return tagDefault.qty || 2;
  };

  return (
    <div className="w-full">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <table className="w-full border-collapse">
        <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="p-3 text-left border-b">{t('ID')}</th>
                <th className="p-3 text-left border-b">{t('Name')}</th>
                <th className="p-3 text-left border-b">{t('Type')}</th>
                <th className="p-3 text-left border-b">{t('Description')}</th>
                <th className="p-3 text-left border-b">{t('Actions')}</th>
            </tr>
        </thead>
        <tbody>
            {Array.isArray(availableFields) && availableFields.length > 0 ? (
            availableFields.map((field, index) => {
                const defaultCount = getDefaultFieldCount();
                const isDefault = index < defaultCount;

                return (
                <tr key={field.id || field.type} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="p-3 border-b">
                    <span className="flex items-center gap-2">
                        {field.id}
                        {isDefault && (
                        <span className="text-xs text-gray-400">{t('default')}</span>
                        )}
                    </span>
                    </td>
                    <td className="p-3 border-b">
                    <span className="flex items-center gap-2">
                        {field.name}
                    </span>
                    </td>
                    <td className="p-3 border-b text-sm text-gray-600">
                    {field.type}
                    </td>
                    <td className="p-3 border-b text-sm text-gray-600">
                    {field.description}
                    </td>
                    <td className="p-3 border-b">
                    <div className="flex gap-2">
                        <button
                        className="p-2 hover:bg-gray-100 rounded-md"
                        onClick={() => handleEdit(field.id)}
                        >
                        <Icons.Edit2 className="h-4 w-4 text-gray-600" />
                        </button>
                        {!isDefault && (
                        <button
                            className="p-2 hover:bg-gray-100 rounded-md"
                            onClick={() => handleRemove(field.id)}
                        >
                            <Icons.Trash2 className="h-4 w-4 text-red-600" />
                        </button>
                        )}
                    </div>
                    </td>
                </tr>
                );
            })
            ) : (
            <tr>
                <td colSpan={4} className="text-center py-4 text-gray-500">
                {t('no_available_fields')}
                </td>
            </tr>
            )}
        </tbody>
        </table>
    </div>
  );
}
