'use client';

import { useTranslations } from 'next-intl';
import { fetchCustomFields, createCustomField } from '@/lib/redux/features/customFieldSlice';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as Icons from 'lucide-react';
import CreateCustomField from '@/components/CreateCustomField';
import { Button } from '@/components/ui/button';

export default function CustomField() {
  const t = useTranslations('CustomField');
  const dispatch = useDispatch();
  const availableFields = useSelector(state => state.customFields?.fields || []);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newField, setNewField] = useState({
    name: '',
    type: '',
    description: '',
    icon: '',
  });

  useEffect(() => {
    dispatch(fetchCustomFields());
  }, [dispatch]);

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
        {/* 添加字段按钮 */}
        <Button
          type="submit"
          onClick={() => setIsDialogOpen(true)}          
        >
          {t('add_field')}
        </Button>
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
              const isDefault = index < 2;

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
