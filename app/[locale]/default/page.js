'use client';

import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { fetchDefaults, updateDefault } from '@/lib/redux/features/defaultSlice';
import { useTranslations } from 'next-intl';    
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Loader } from 'lucide-react';

export default function DefaultPage() {
    const t = useTranslations('Default');
    const dispatch = useDispatch();
    const defaultData = useSelector((state) => state.defaults.data);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [userNames, setUserNames] = useState({});
    const [isLoading, setIsLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        async function loadInitialData() {
            setDataLoading(true);
            await dispatch(fetchDefaults());
            setDataLoading(false);
        }
        loadInitialData();
    }, [dispatch]);
    
    useEffect(() => {
        async function fetchUserNames() {
            if (!Array.isArray(defaultData) || defaultData.length === 0) {
                setDataLoading(false);
                return;
            }
            
            const userIds = [...new Set(defaultData.map(item => item.edited_by).filter(Boolean))];
            
            if (userIds.length === 0) {
                setDataLoading(false);
                return;
            }
            
            const newUserIds = userIds.filter(id => !userNames[id]);
            if (newUserIds.length === 0) {
                return;
            }
            
            setDataLoading(true);
            try {
                const { data, error } = await supabase
                    .from('user')
                    .select('id, name')
                    .in('id', newUserIds);
                
                if (error) throw error;
                
                const namesMap = {...userNames};
                data.forEach(user => {
                    namesMap[user.id] = user.name;
                });
                
                setUserNames(namesMap);
            } catch (error) {
                console.error('获取用户名称失败:', error);
            } finally {
                setDataLoading(false);
            }
        }
        
        fetchUserNames();
    }, [defaultData, userNames]);

    const handleEdit = (defaultItem) => {
        setEditingId(defaultItem.id);
        setEditValue(defaultItem.qty);
    };

    const handleSave = async (defaultItem) => {
        try {
            setIsLoading(true);
            const { data: userData, error: userError } = await supabase.auth.getUser();
            
            if (userError) {
                throw new Error('认证错误');
            }

            const userId = userData?.user?.id;
            
            if (!userId) {
                throw new Error('无法获取用户 ID');
            }
            
            const editData = {
                id: defaultItem.id,
                qty: editValue,
                name: defaultItem.name,
                updated_at: new Date().toISOString(),
                edited_by: userId
            };
                        
            await dispatch(updateDefault({ 
                name: defaultItem.name, 
                defaultData: editData 
            })).unwrap();
            setEditingId(null);
        } catch (error) {
            console.error('保存失败:', error);
        } finally {
            setIsLoading(false);
            dispatch(fetchDefaults());
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        return new Date(dateString).toLocaleString();
    };

    if (dataLoading) {
        return (
            <div className="flex items-center justify-center p-2">
                <Loader className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('title')}</h1>
            <table className="w-full border-collapse">
                <thead>
                    <tr>
                        <th className="border p-2">{t('id')}</th>
                        <th className="border p-2">{t('name')}</th>
                        <th className="border p-2">{t('qty')}</th>
                        <th className="border p-2">{t('updated_at')}</th>
                        <th className="border p-2">{t('edited_by')}</th>
                        <th className="border p-2">{t('actions')}</th>
                    </tr>
                </thead>
                <tbody>
                    {Array.isArray(defaultData) && defaultData.map((defaultItem, index) => (
                        <tr key={defaultItem.id || `default-item-${index}`}>
                            <td className="border p-2">{defaultItem.id}</td>
                            <td className="border p-2">{defaultItem.name ? t(defaultItem.name) : ''}</td>
                            <td className="border p-2">
                                {editingId === defaultItem.id ? (
                                    <input
                                        type="text"
                                        value={editValue}
                                        className="border p-1 rounded"
                                        onChange={(e) => setEditValue(e.target.value)}
                                    />
                                ) : (
                                    defaultItem.qty
                                )}
                            </td>
                            <td className="border p-2">{formatDate(defaultItem.updated_at)}</td>
                            <td className="border p-2">{defaultItem.edited_by ? userNames[defaultItem.edited_by] || '加载中...' : ''}</td>
                            <td className="border p-2">
                                {editingId === defaultItem.id ? (
                                    <Button
                                        onClick={() => handleSave(defaultItem)}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? t('saving') : t('save')}
                                    </Button>
                                ) : (
                                    <Button
                                        onClick={() => handleEdit(defaultItem)}
                                    >
                                        {t('edit')}
                                    </Button>
                                )}
                            </td>
                        </tr>
                    ))}
                </tbody>    
            </table>
        </div>
    )
}
