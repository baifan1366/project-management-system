'use client'

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"

export default function AddTaskDialog({ taskColor, showTaskForm, setShowTaskForm, newTask, setNewTask, handleAddTask }) {
  const handleTaskInputChange = (e) => {
    const { name, value } = e.target;
    setNewTask(prev => ({
      ...prev,
      [name]: value
    }));
  }
  
  return (
    <Dialog open={showTaskForm} onOpenChange={setShowTaskForm}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-black">添加新任务</DialogTitle>
          <DialogDescription>
            请填写以下信息创建新任务
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <label className="block text-sm font-medium mb-1">任务名称</label>
            <input
              type="text"
              name="text"
              value={newTask.text}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">开始日期</label>
            <input
              type="date"
              name="start_date"
              value={newTask.start_date instanceof Date 
                ? newTask.start_date.toISOString().split('T')[0] 
                : newTask.start_date}
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">持续天数</label>
            <input
              type="number"
              name="duration"
              value={newTask.duration}
              min="1"
              onChange={handleTaskInputChange}
              className="w-full border rounded-md p-2"
            />
          </div>
        </div>
        
        <DialogFooter className="flex justify-end gap-2">
          <Button 
            variant={taskColor}
            onClick={() => setShowTaskForm(false)}
          >
            取消
          </Button>
          <Button 
            onClick={handleAddTask}
            variant={taskColor}
          >
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
