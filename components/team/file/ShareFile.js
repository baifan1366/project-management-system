'use client'

import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Link2, Copy, CheckCircle, Send } from 'lucide-react'
import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'

export default function ShareFile({ open, onOpenChange, file }) {
  const t = useTranslations('File')
  const [copied, setCopied] = useState(false)
  const [fileLink, setFileLink] = useState('')
  const [fileName, setFileName] = useState('')
  
  // 当file属性变化时更新状态
  useEffect(() => {
    if (file) {
      // 使用文件的实际链接，如果存在的话
      setFileLink(file.file_url || `https://example.com/files/${file.id}`)
      setFileName(file.name || '未知文件')
    }
  }, [file])
  
  /**
   * 向单个用户发送文件链接
   */
  const handleSendToUser = (userId) => {
    // 实际应用中这里会调用API发送链接给特定用户
    console.log(`向用户 ${userId} 发送链接: ${fileLink}`)
  }
  
  /**
   * 复制链接到剪贴板
   * 复制成功后临时显示成功状态，3秒后重置
   */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(fileLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 3000)
  }

  // 模拟用户列表数据
  const users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' },
    { id: 3, name: '王五', email: 'wangwu@example.com' },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shareFile')}</DialogTitle>
          <DialogDescription>{t('shareFileDescription')}</DialogDescription>
        </DialogHeader>
        
        {/* 文件信息区域 */}
        <div className="space-y-4 py-2">
          <div className="flex items-center space-x-2">
            <Link2 className="h-5 w-5 text-gray-500" />
            <span className="font-medium">{fileName}</span>
          </div>
          
          {/* 链接输入框和复制按钮 */}
          <div className="flex items-center space-x-2">
            <Input 
              value={fileLink} 
              readOnly 
              className="flex-1"
            />
            <Button size="icon" onClick={handleCopyLink} variant="outline">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
        
        {/* 用户列表区域 */}
        <div className="space-y-2">
          <div className="font-medium">{t('selectUsers')}</div>
          <div className="max-h-60 overflow-y-auto border rounded-md divide-y">
            {users.map(user => (
              <div 
                key={user.id} 
                className="flex items-center justify-between p-3 hover:bg-gray-50"
              >
                <div className="cursor-pointer">
                  <div className="font-medium">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                </div>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                  onClick={() => handleSendToUser(user.id)}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        
        {/* 底部操作按钮 */}
        <div className="flex justify-end space-x-2 mt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
