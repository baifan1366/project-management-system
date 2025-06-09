'use client'

import { useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { 
  File, FileText, MoreHorizontal, 
  Download, Trash, FolderUp, 
  Sheet, Folder, Eye, Send
} from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

/**
 * 网格视图组件，以卡片网格形式显示文件和文件夹
 */
export default function GridView({ 
  files, 
  isLoading, 
  selectedFiles, 
  handleSelectFile, 
  handleSelectAll, 
  navigateToFolder,
  openFilePreview,
  downloadFile,
  moveFileToParentFolder,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  confirmAndDeleteFiles,
  openShareFile,
  t
}) {
  // 当前悬停的文件索引
  const [hoveredIndex, setHoveredIndex] = useState(null)

  // 获取文件图标
  const getFileIcon = (type) => {
    switch(type) {
      case 'folder':
        return <Folder className="h-10 w-10 text-blue-500" />
      case 'excel':
        return <Sheet className="h-10 w-10 text-green-600" />
      case 'word':
        return <FileText className="h-10 w-10 text-blue-600" />
      case 'pdf':
        return <File className="h-10 w-10 text-red-600" />
      default:
        return <File className="h-10 w-10 text-gray-600" />
    }
  }

  // 处理双击事件
  const handleDoubleClick = (file) => {
    if (file.type === 'folder') {
      navigateToFolder(file)
    } else {
      openFilePreview(file)
    }
  }
  
  // 处理拖拽开始
  const handleDragStart = (e, file) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      id: file.id,
      name: file.name,
      type: file.type,
      path: file.path
    }))
    e.currentTarget.classList.add('opacity-50')
    if (onDragStart) onDragStart(file)
  }

  // 处理拖拽结束
  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('opacity-50')
  }

  // 处理拖拽经过
  const handleDragOver = (e, file) => {
    // 只有文件夹才能接收拖拽
    if (file.type === 'folder') {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.add('border-2', 'border-dashed', 'border-green-500')
      
      // 添加放置指示器
      e.dataTransfer.dropEffect = 'move'
      
      if (onDragOver) onDragOver(file)
    }
  }

  // 处理拖拽离开
  const handleDragLeave = (e, file) => {
    if (file.type === 'folder') {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.remove('border-2', 'border-dashed', 'border-green-500')
      
      if (onDragLeave) onDragLeave(file)
    }
  }

  // 处理放置
  const handleDrop = (e, file) => {
    if (file.type === 'folder') {
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.classList.remove('border-2', 'border-dashed', 'border-green-500')
      
      try {
        const data = JSON.parse(e.dataTransfer.getData('application/json'))
        
        if (data && data.id) {
          if (onDrop) onDrop(data, file)
        }
      } catch (error) {
        console.error('Error parsing dragged data:', error)
      }
    }
  }

  if (isLoading) {
    return (
      <div className="grid place-items-center h-64">
        <p>{t('loading')}</p>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="grid place-items-center h-64 border rounded-md">
        <p>{t('noFileFound')}</p>
      </div>
    )
  }

  return (
    <div className="border rounded-md p-4">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {files.map((file, index) => (
          <Card
            key={file.id.toString()}
            className={`overflow-hidden transition-all duration-200 ${
              selectedFiles.includes(file.id) ? 'ring-2 ring-primary' : ''
            }`}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            draggable="true"
            onDragStart={(e) => handleDragStart(e, file)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => handleDragOver(e, file)}
            onDragLeave={(e) => handleDragLeave(e, file)}
            onDrop={(e) => handleDrop(e, file)}
            data-is-folder={file.type === 'folder' ? 'true' : 'false'}
            data-file-id={file.id}
          >
            <CardHeader className="p-3 pb-0 pt-2">
              <div className="flex justify-between items-start">
                <Checkbox
                  checked={selectedFiles.includes(file.id)}
                  onCheckedChange={() => handleSelectFile(file.id)}
                  className="mt-1"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {file.type !== 'folder' && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => openFilePreview(file)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {t('preview')}
                      </DropdownMenuItem>
                    )}
                    {file.type !== 'folder' && (
                      <DropdownMenuItem className="cursor-pointer" onClick={() => downloadFile(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        {t('download')}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem className="cursor-pointer" onClick={() => openShareFile(file)}>
                      <Send className="mr-2 h-4 w-4" />
                      {t('share')}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer" onClick={() => moveFileToParentFolder(file)}>
                      <FolderUp className="mr-2 h-4 w-4" />
                      {t('moveToParentFolder')}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer text-red-500 hover:text-red-600 focus:text-red-600"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        confirmAndDeleteFiles(file.id, file.name)
                      }}
                    >
                      <Trash className="mr-2 h-4 w-4" />
                      {t('delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>
            <CardContent 
              className="flex flex-col items-center justify-center p-4 cursor-pointer"
              onDoubleClick={() => handleDoubleClick(file)}
              onClick={() => file.type !== 'folder' && openFilePreview(file)}
            >
              {getFileIcon(file.type)}
              <div 
                className={`mt-2 text-center w-full truncate font-medium ${file.type === 'folder' ? 'hover:underline cursor-pointer' : ''}`}
                onClick={(e) => {
                  if (file.type === 'folder') {
                    e.stopPropagation()
                    navigateToFolder(file)
                  }
                }}
              >
                {file.name}
              </div>
              {file.type === 'folder' && (
                <div className="mt-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {t('folder')}
                </div>
              )}
            </CardContent>
            <CardFooter className="px-3 py-2 text-xs text-gray-500 bg-gray-50">
              <div className="w-full">
                <div className="flex justify-between">
                  <span>{file.modified}</span>
                  <span className="truncate max-w-[100px]">{file.modifiedBy}</span>
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
