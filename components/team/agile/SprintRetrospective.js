"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, ThumbsUp, ThumbsDown, Trash2 } from 'lucide-react';

const SprintRetrospective = ({ sprint, agileMembers = [], themeColor }) => {
  const t = useTranslations('Agile');
  const [loading, setLoading] = useState(true);
  const [whatWentWell, setWhatWentWell] = useState([]);
  const [toImprove, setToImprove] = useState([]);
  const [newWentWellItem, setNewWentWellItem] = useState('');
  const [newImproveItem, setNewImproveItem] = useState('');
  
  // 获取回顾数据
  useEffect(() => {
    if (sprint) {
      setLoading(true);
      // 处理whatWentWell可能是JSONB数组的情况
      setWhatWentWell(
        Array.isArray(sprint.whatWentWell) 
          ? sprint.whatWentWell 
          : (typeof sprint.whatWentWell === 'string' 
              ? sprint.whatWentWell.split('|||').filter(Boolean) 
              : [])
      );
      // 处理toImprove可能是JSONB数组的情况
      setToImprove(
        Array.isArray(sprint.toImprove) 
          ? sprint.toImprove 
          : (typeof sprint.toImprove === 'string' 
              ? sprint.toImprove.split('|||').filter(Boolean) 
              : [])
      );
      setLoading(false);
    }
  }, [sprint]);

  // 添加"做得好"项
  const addWentWellItem = async () => {
    if (!newWentWellItem.trim() || !sprint) return;
    
    try {
      const newItems = [...whatWentWell, newWentWellItem.trim()];
      setWhatWentWell(newItems);
      setNewWentWellItem('');
      
      // 更新服务器数据
      const response = await fetch(`/api/teams/agile/sprint/${sprint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          whatWentWell: newItems.join('|||')
        }),
      });
      
      if (!response.ok) throw new Error('添加项目失败');
      toast.success(t('itemAddedSuccess'));
    } catch (error) {
      console.error('添加项目失败:', error);
      toast.error(t('itemAddedError'));
    }
  };
  
  // 添加"待改进"项
  const addImproveItem = async () => {
    if (!newImproveItem.trim() || !sprint) return;
    
    try {
      const newItems = [...toImprove, newImproveItem.trim()];
      setToImprove(newItems);
      setNewImproveItem('');
      
      // 更新服务器数据
      const response = await fetch(`/api/teams/agile/sprint/${sprint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          toImprove: newItems.join('|||')
        }),
      });
      
      if (!response.ok) throw new Error('添加项目失败');
      toast.success(t('itemAddedSuccess'));
    } catch (error) {
      console.error('添加项目失败:', error);
      toast.error(t('itemAddedError'));
    }
  };
  
  // 删除回顾项
  const deleteWentWellItem = async (index) => {
    try {
      const newItems = [...whatWentWell];
      newItems.splice(index, 1);
      setWhatWentWell(newItems);
      
      // 更新服务器数据
      const response = await fetch(`/api/teams/agile/sprint/${sprint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          whatWentWell: newItems.join('|||')
        }),
      });
      
      if (!response.ok) throw new Error('删除项目失败');
      toast.success(t('itemDeletedSuccess'));
    } catch (error) {
      console.error('删除项目失败:', error);
      toast.error(t('itemDeletedError'));
    }
  };
  
  // 删除待改进项
  const deleteImproveItem = async (index) => {
    try {
      const newItems = [...toImprove];
      newItems.splice(index, 1);
      setToImprove(newItems);
      
      // 更新服务器数据
      const response = await fetch(`/api/teams/agile/sprint/${sprint.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          toImprove: newItems.join('|||')
        }),
      });
      
      if (!response.ok) throw new Error('删除项目失败');
      toast.success(t('itemDeletedSuccess'));
    } catch (error) {
      console.error('删除项目失败:', error);
      toast.error(t('itemDeletedError'));
    }
  };
  
  return (
    <Card className="">
      <CardHeader className="flex justify-between item-center">
        <CardTitle>
          {t('sprintRetrospective')}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <p>{t('loading')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 做得好部分 */}
            <div className="space-y-4">
              <div className="flex items-center">
                <ThumbsUp className="h-5 w-5 text-green-600 mr-2" />
                <h3 className="text-lg font-medium">{t('whatWentWell')}</h3>
              </div>
              
              <div className="flex space-x-2">
                <Input 
                  value={newWentWellItem}
                  onChange={(e) => setNewWentWellItem(e.target.value)}
                  placeholder={t('enterWhatWentWell')}
                  onKeyDown={(e) => e.key === 'Enter' && addWentWellItem()}
                  maxLength={50}
                />
                <Button onClick={addWentWellItem} variant={themeColor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <ul className="space-y-2">
                {whatWentWell.length > 0 ? (
                  whatWentWell.map((item, index) => (
                    <li key={index} className="flex justify-between items-start p-3 rounded bg-muted-background">
                      <span>{item}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteWentWellItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className="text-center p-4 bg-muted-background rounded">
                    {t('noItemsYet')}
                  </li>
                )}
              </ul>
            </div>
            
            {/* 待改进部分 */}
            <div className="space-y-4">
              <div className="flex items-center">
                <ThumbsDown className="h-5 w-5 text-red-600 mr-2" />
                <h3 className="text-lg font-medium">{t('toImprove')}</h3>
              </div>
              
              <div className="flex space-x-2">
                <Input 
                  value={newImproveItem}
                  onChange={(e) => setNewImproveItem(e.target.value)}
                  placeholder={t('enterToImprove')}
                  onKeyDown={(e) => e.key === 'Enter' && addImproveItem()}
                  maxLength={50}
                />
                <Button onClick={addImproveItem} variant={themeColor}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <ul className="space-y-2">
                {toImprove.length > 0 ? (
                  toImprove.map((item, index) => (
                    <li key={index} className="flex justify-between items-start p-3 rounded bg-muted-background">
                      <span>{item}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => deleteImproveItem(index)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </li>
                  ))
                ) : (
                  <li className="text-center p-4 bg-muted-background rounded">
                    {t('noItemsYet')}
                  </li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SprintRetrospective; 