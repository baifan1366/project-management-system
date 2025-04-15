'use client'

import { Button } from '../../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function EditTaskDialog({ 
  taskColor,
  showEditForm,
  setShowEditForm,
  editTask,
  setEditTask,
  handleUpdateTask,
  handleDeleteTask
}) {
  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setEditTask(prev => ({
      ...prev,
      [name]: value
    }));
  }

  const handleCancel = () => {
    // 重置表单状态
    setEditTask({
      id: null,
      text: '',
      start_date: new Date(),
      duration: 1,
      progress: 0
    });
    // 关闭对话框
    setShowEditForm(false);
  }
  
  return (
    <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-black">编辑任务</DialogTitle>
          <DialogDescription>
            修改任务信息或调整完成进度
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">任务名称</label>
            <input
              type="text"
              name="text"
              value={editTask.text}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开始日期</label>
            <input
              type="date"
              name="start_date"
              value={editTask.start_date instanceof Date 
                ? editTask.start_date.toISOString().split('T')[0] 
                : editTask.start_date.split(' ')[0]}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">持续天数</label>
            <input
              type="number"
              name="duration"
              value={editTask.duration}
              min="1"
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">完成进度</label>
            <div className="flex items-center">
              <input
                type="range"
                name="progress"
                value={editTask.progress * 100}
                min="0"
                max="100"
                step="10"
                onChange={(e) => setEditTask(prev => ({
                  ...prev,
                  progress: Number(e.target.value) / 100
                }))}
                className="w-full"
              />
              <span className="ml-2 min-w-[40px]">{Math.round(editTask.progress * 100)}%</span>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between">
          <Button 
            variant="destructive"
            onClick={handleDeleteTask}
            className="bg-red-500 hover:bg-red-600"
          >
            删除
          </Button>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={handleCancel}
            >
              取消
            </Button>
            <Button 
              onClick={handleUpdateTask}
              variant={taskColor}
            >
              保存
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
