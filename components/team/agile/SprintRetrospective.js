"use client";

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Plus, ThumbsUp, ThumbsDown, HelpCircle, ArrowUpRight, Trash2 } from 'lucide-react';
import BodyContent from './BodyContent';

const RETROSPECTIVE_CATEGORIES = [
  {
    id: 'went_well',
    name: 'What went well',
    icon: <ThumbsUp className="h-5 w-5 text-green-600" />
  },
  {
    id: 'to_improve',
    name: 'To improve',
    icon: <ThumbsDown className="h-5 w-5 text-red-600" />
  }
];

const SprintRetrospective = ({ teamId, projectId, sprints }) => {
  const t = useTranslations('Agile');
  const [loading, setLoading] = useState(true);
  const [selectedSprint, setSelectedSprint] = useState(null);
  const [retrospectives, setRetrospectives] = useState({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemCategory, setItemCategory] = useState('went_well');
  const [itemText, setItemText] = useState('');
  const [actionItems, setActionItems] = useState([]);
  const [newActionItem, setNewActionItem] = useState({ text: '', assignee: '', dueDate: '' });
  
  // 获取回顾数据
  useEffect(() => {
    if (selectedSprint) {
      // 这里应该从数据库获取回顾数据
      // fetchRetrospectiveData(selectedSprint.id);
      
      // 模拟数据
      const mockRetrospective = {
        went_well: [
          '团队协作效率高',
          '新功能按时完成',
          '测试覆盖率达到目标'
        ],
        to_improve: [
          '沟通不畅导致部分需求理解有偏差',
          '技术债务有所累积',
          'Bug修复的响应时间需要缩短'
        ],
        action_items: [
          '建立每日15分钟快速沟通机制',
          '安排技术债务清理专项时间',
          '完善Bug响应流程'
        ],
        questions: [
          '如何更好地估计任务时间？',
          '能否优化代码审查流程？'
        ]
      };
      
      // 模拟行动项
      const mockActionItems = [
        { 
          id: 1, 
          text: '建立每日15分钟快速沟通机制', 
          assignee: '张三', 
          dueDate: new Date(2023, 6, 15),
          status: t('inProgress'),
        },
        { 
          id: 2, 
          text: '安排技术债务清理专项时间', 
          assignee: '李四', 
          dueDate: new Date(2023, 6, 20),
          status: t('completed'),
        },
        { 
          id: 3, 
          text: '完善Bug响应流程', 
          assignee: '王五', 
          dueDate: new Date(2023, 6, 25),
          status: t('pending'),
        }
      ];
      
      setRetrospectives(mockRetrospective);
      setActionItems(mockActionItems);
      setLoading(false);
    }
  }, [selectedSprint]);

  // 设置默认选择最新完成的冲刺
  useEffect(() => {
    if (sprints.length > 0 && !selectedSprint) {
      setSelectedSprint(sprints[sprints.length - 1]);
    } else if (sprints.length === 0) {
      setLoading(false);
    }
  }, [sprints]);

  // 添加回顾项
  const addRetrospectiveItem = () => {
    if (!itemText.trim() || !itemCategory) return;
    
    const newItems = [...(retrospectives[itemCategory] || []), itemText];
    
    setRetrospectives({
      ...retrospectives,
      [itemCategory]: newItems
    });
    
    setItemText('');
    setDialogOpen(false);
    
    // 在实际应用中，这里应该调用API保存回顾项
    toast.success(t('retrospectiveItemAdded'));
  };
  
  // 添加行动项
  const addActionItem = () => {
    if (!newActionItem.text.trim() || !newActionItem.assignee.trim()) return;
    
    const newItem = {
      id: Date.now(),
      text: newActionItem.text,
      assignee: newActionItem.assignee,
      dueDate: newActionItem.dueDate ? new Date(newActionItem.dueDate) : null,
      status: t('pending'),
    };
    
    setActionItems([...actionItems, newItem]);
    
    // 添加到回顾项中
    const newRetrospectiveItems = [...(retrospectives.action_items || []), newActionItem.text];
    setRetrospectives({
      ...retrospectives,
      action_items: newRetrospectiveItems
    });
    
    // 重置表单
    setNewActionItem({ text: '', assignee: '', dueDate: '' });
    
    // 在实际应用中，这里应该调用API保存行动项
    toast.success(t('actionItemAdded'));
  };
  
  // 删除回顾项
  const deleteRetrospectiveItem = (category, index) => {
    if (!retrospectives[category]) return;
    
    const newItems = [...retrospectives[category]];
    newItems.splice(index, 1);
    
    setRetrospectives({
      ...retrospectives,
      [category]: newItems
    });
    
    // 在实际应用中，这里应该调用API删除回顾项
    toast.success(t('retrospectiveItemDeleted'));
  };
  
  // 删除行动项
  const deleteActionItem = (id) => {
    const itemToDelete = actionItems.find(item => item.id === id);
    if (!itemToDelete) return;
    
    // 删除行动项
    setActionItems(actionItems.filter(item => item.id !== id));
    
    // 从回顾项中删除
    const text = itemToDelete.text;
    const itemIndex = retrospectives.action_items?.findIndex(item => item === text);
    
    if (itemIndex !== undefined && itemIndex >= 0) {
      const newItems = [...retrospectives.action_items];
      newItems.splice(itemIndex, 1);
      
      setRetrospectives({
        ...retrospectives,
        action_items: newItems
      });
    }
    
    // 在实际应用中，这里应该调用API删除行动项
    toast.success(t('actionItemDeleted'));
  };
  
  // 更新行动项状态
  const updateActionItemStatus = (id, status) => {
    const newItems = actionItems.map(item => {
      if (item.id === id) {
        return { ...item, status };
      }
      return item;
    });
    
    setActionItems(newItems);
    
    // 在实际应用中，这里应该调用API更新行动项状态
    toast.success(t("actionItemStatusUpdated"));
  };
  
  // 渲染添加回顾项对话框
  const renderAddItemDialog = () => (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('addRetrospectiveItem')}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Select value={itemCategory} onValueChange={setItemCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {RETROSPECTIVE_CATEGORIES.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    <div className="flex items-center">
                      {category.icon}
                      <span className="ml-2">{category.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Textarea 
              value={itemText}
              onChange={(e) => setItemText(e.target.value)}
              placeholder={t('enterRetrospectiveItemContent')}
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => setDialogOpen(false)}
          >
            {t('cancel')}
          </Button>
          <Button 
            onClick={addRetrospectiveItem}
            disabled={!itemText.trim()}
          >
            {t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (sprints.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full">
          <CardContent className="pt-6 text-center">
            <p>{t('noCompletedSprints')}</p>
            <p className="text-muted-foreground">{t('retrospectiveCanBeDoneAfterSprintCompletion')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full">
          <CardContent className="pt-6 text-center">
            <p>{t('loading')}</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <BodyContent>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t('retrospective')}</h2>
          </div>
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {t('addRetrospectiveItem')}
            </Button>
          </div>
        </div>
        
        {/* 回顾看板 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {RETROSPECTIVE_CATEGORIES.map(category => (
            <Card key={category.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium flex items-center">
                  {category.icon}
                  <span className="ml-2">{category.name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {(retrospectives[category.id] || []).map((item, index) => (
                    <li key={index} className="flex justify-between items-start p-2 bg-muted/50 rounded-md">
                      <span className="text-sm">{item}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => deleteRetrospectiveItem(category.id, index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                  {(retrospectives[category.id] || []).length === 0 && (
                    <li className="text-sm text-muted-foreground text-center py-2">
                      {t('noContentYet')}
                    </li>
                  )}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {renderAddItemDialog()}
      </div>
    </BodyContent>
  );
};

export default SprintRetrospective; 