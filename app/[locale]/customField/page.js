'use client';

import { useTranslations } from 'next-intl';
import { fetchCustomFields, createCustomField } from '@/lib/redux/features/customFieldSlice';
import { fetchDefaultByName } from '@/lib/redux/features/defaultSlice';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Icons from 'lucide-react';
import CreateCustomField from '@/components/admin/CreateCustomField';
import { Button } from '@/components/ui/button';

export default function CustomField() {
  const t = useTranslations('CustomField');
  const dispatch = useDispatch();
  const availableFields = useSelector(state => state.customFields?.fields || []);
  const defaultSettings = useSelector(state => state.defaults?.data || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    type: '',
    description: '',
    icon: '',
  });

  // 增加一个状态来跟踪加载状态
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    dispatch(fetchCustomFields());
    dispatch(fetchDefaultByName('custom_field'));
  }, [dispatch]);

  useEffect(() => {
    if (defaultSettings.length > 0) {
      setIsLoading(false);
    }
  }, [defaultSettings]);

  useEffect(() => {
    const customField = defaultSettings.find(setting => setting.name === 'custom_field');
  }, [defaultSettings]);

  // 获取默认字段数量
  const getDefaultFieldCount = () => {
    if (!defaultSettings || defaultSettings.length === 0) return 2;
    
    // 检查数组嵌套结构
    let customFieldDefault = null;
    
    // 尝试在不同层级查找custom_field
    for (const setting of defaultSettings) {
      if (setting.name === 'custom_field') {
        customFieldDefault = setting;
        break;
      }
      
      // 如果是嵌套数组，尝试在第一层嵌套中查找
      if (Array.isArray(setting) && setting.length > 0) {
        const nestedSetting = setting.find(s => s.name === 'custom_field');
        if (nestedSetting) {
          customFieldDefault = nestedSetting;
          break;
        }
        
        // 如果是二层嵌套，尝试在第二层嵌套中查找
        for (const subSetting of setting) {
          if (Array.isArray(subSetting) && subSetting.length > 0) {
            const deepNestedSetting = subSetting.find(s => s.name === 'custom_field');
            if (deepNestedSetting) {
              customFieldDefault = deepNestedSetting;
              break;
            }
          }
        }
      }
    }
    
    // 检查是否找到了自定义字段设置
    if (!customFieldDefault) return 2;
    
    // 返回数量
    return customFieldDefault.qty || 2;
  };

  // 简化的图标获取函数
  const getIconComponent = (iconName) => {
    // 尝试直接从 Icons 对象获取组件
    if (iconName && Icons[iconName]) {
      return Icons[iconName];
    }    
    // 默认图标
    return Icons.Ban;
  };

  return (
    <div className="w-full">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
        <Button
          type="submit"
          onClick={() => setIsDialogOpen(true)}          
        >
          {t('add_field')}
        </Button>
      </div>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-50">
              <th className="p-3 text-left border-b">{t('ID')}</th>
              <th className="p-3 text-left border-b">{t('Name')}</th>
              <th className="p-3 text-left border-b">{t('Icon')}</th>
              <th className="p-3 text-left border-b">{t('Description')}</th>
              <th className="p-3 text-left border-b">{t('Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {Array.isArray(availableFields) && availableFields.length > 0 ? (
              availableFields.map((field, index) => {
                const IconComponent = getIconComponent(field.icon);
                const defaultCount = getDefaultFieldCount();
                const isDefault = index < defaultCount;

                return (
                  <tr key={field.id || field.type} className="hover:bg-gray-50">
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
                    <td className="p-3 border-b">
                      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
                        <IconComponent className="h-5 w-5 text-blue-600" />
                      </div>
                    </td>
                    <td className="p-3 border-b text-sm text-gray-600">
                      {field.description || t(`${field.name.toLowerCase()}_description`)}
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
                <td colSpan={5} className="text-center py-4 text-gray-500">
                  {t('no_available_fields')}
                </td>
              </tr>
            )}
          </tbody>
      </table>
      {isDialogOpen && (
        <CreateCustomField
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          field={newField}
          setField={setNewField}
        />
      )}
    </div>
  );
}
