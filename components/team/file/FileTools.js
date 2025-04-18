'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Upload, File, X, FileText, Sheet, Film, Music, Eye, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'

export default function FileTools({ isOpen, onClose }) {
  const t = useTranslations('CreateTask')
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const fileInputRef = useRef(null)

  // 处理文件选择
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)
  }

  // 添加文件到列表
  const addFiles = (selectedFiles) => {
    const newFiles = selectedFiles.map(file => ({
      id: Date.now() + Math.random(),
      file,
      preview: URL.createObjectURL(file),
      name: file.name,
      type: file.type,
      size: file.size
    }))
    
    setFiles(prev => [...prev, ...newFiles])
  }

  // 移除文件
  const removeFile = (id) => {
    setFiles(files => {
      const updatedFiles = files.filter(file => file.id !== id)
      
      // 清理URL对象
      const fileToRemove = files.find(file => file.id === id)
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      
      return updatedFiles
    })
  }

  // 处理拖放
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const droppedFiles = Array.from(e.dataTransfer.files || [])
    addFiles(droppedFiles)
  }

  // 触发文件选择
  const handleSelectFilesClick = () => {
    fileInputRef.current?.click()
  }

  // 格式化文件大小
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // 获取文件图标
  const getFileIcon = (fileType) => {
    // 根据文件类型返回对应图标
    if (fileType.includes('pdf')) {
      return <File className="w-5 h-5 text-red-500" />
    } else if (fileType.includes('word') || fileType.includes('doc')) {
      return <FileText className="w-5 h-5 text-blue-500" />
    } else if (fileType.includes('excel') || fileType.includes('sheet') || fileType.includes('csv') || fileType.includes('xls')) {
      return <Sheet className="w-5 h-5 text-green-500" />
    } else if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('7z') || fileType.includes('tar') || fileType.includes('gz')) {
      return <File className="w-5 h-5 text-amber-500" />
    } else if (fileType.includes('video') || fileType.includes('mp4') || fileType.includes('avi') || fileType.includes('mov')) {
      return <Film className="w-5 h-5 text-purple-500" />
    } else if (fileType.includes('audio') || fileType.includes('mp3') || fileType.includes('wav') || fileType.includes('ogg')) {
      return <Music className="w-5 h-5 text-indigo-500" />
    } else {
      return <File className="w-5 h-5 text-gray-500" />
    }
  }

  // 打开文件预览
  const openPreview = (file) => {
    setPreviewFile(file)
  }

  // 关闭文件预览
  const closePreview = () => {
    setPreviewFile(null)
  }

  // 渲染文件预览内容
  const renderPreviewContent = () => {
    if (!previewFile) return null

    // 根据文件类型渲染不同的预览组件
    if (previewFile.type.startsWith('image/')) {
      return (
        <img 
          src={previewFile.preview} 
          alt={previewFile.name}
          className="max-w-full max-h-[500px] object-contain mx-auto"
        />
      )
    } else if (previewFile.type.includes('pdf')) {
      return (
        <iframe 
          src={previewFile.preview} 
          className="w-full h-[500px]" 
          title={previewFile.name}
        />
      )
    } else if (previewFile.type.includes('video')) {
      return (
        <video 
          src={previewFile.preview} 
          controls 
          className="max-w-full max-h-[500px] mx-auto"
        />
      )
    } else if (previewFile.type.includes('audio')) {
      return (
        <audio 
          src={previewFile.preview} 
          controls 
          className="w-full mt-8"
        />
      )
    } else if (previewFile.type.includes('text') || 
              previewFile.type.includes('javascript') || 
              previewFile.type.includes('json') || 
              previewFile.type.includes('html') || 
              previewFile.type.includes('css')) {
      // 为文本文件创建预览
      const [textContent, setTextContent] = useState('加载中...')
      
      // 读取文本内容
      useEffect(() => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setTextContent(e.target.result)
        }
        reader.onerror = () => {
          setTextContent('无法读取文件内容')
        }
        reader.readAsText(previewFile.file)
      }, [previewFile])
      
      return (
        <div className="w-full h-[500px] overflow-auto bg-gray-50 p-4 rounded border">
          <pre className="whitespace-pre-wrap break-words text-sm">
            {textContent}
          </pre>
        </div>
      )
    } else {
      // 对于其他无法预览的文件类型
      return (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            {getFileIcon(previewFile.type)}
          </div>
          <h3 className="text-xl font-medium mb-2">{previewFile.name}</h3>
          <p className="text-gray-500 mb-4">{formatFileSize(previewFile.size)}</p>
          <p className="text-gray-500">无法预览此类型的文件，请下载后查看</p>
          <Button
            className="mt-4"
            onClick={() => {
              const a = document.createElement('a')
              a.href = previewFile.preview
              a.download = previewFile.name
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
            }}
          >
            下载文件
          </Button>
        </div>
      )
    }
  }

  // 确认上传
  const handleConfirmUpload = () => {
    // 这里可以实现实际的文件上传逻辑
    console.log('Files to upload:', files)
    
    // 上传完成后清理
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    
    setFiles([])
    onClose()
  }

  // 关闭对话框时清理
  const handleClose = () => {
    files.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setFiles([])
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className={`sm:max-w-${previewFile ? '4xl' : '600px'}`}>
        {previewFile ? (
          <>
            <div className="flex items-center mb-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={closePreview} 
                className="mr-2"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-medium truncate">{previewFile.name}</h2>
            </div>
            <div className="preview-container">
              {renderPreviewContent()}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>{t('uploadFile')}</DialogTitle>
            </DialogHeader>
            
            <div 
              className={`mt-3 border-2 border-dashed rounded-lg p-6 text-center ${
                isDragging ? 'border-primary bg-primary/5' : 'border-gray-300'
              }`}
              onDragEnter={handleDragEnter}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <Upload className="mx-auto h-10 w-10 text-gray-400" />
              <p className="mt-2 text-sm font-medium">{t('dragAndDropFiles')}</p>
              <p className="mt-1 text-xs text-gray-500">{t('or')}</p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={handleSelectFilesClick}
              >
                {t('selectFiles')}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileChange}
                accept="*/*"
              />
            </div>
            
            {files.length > 0 && (
              <div className="mt-5">
                <h3 className="font-medium mb-2">{t('selectedFiles')}</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto p-1">
                  {files.map(file => (
                    <div key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                      <div 
                        className="flex items-center space-x-2 cursor-pointer flex-1" 
                        onClick={() => openPreview(file)}
                      >
                        {file.type.startsWith('image/') ? (
                          <img 
                            src={file.preview} 
                            alt={file.name}
                            className="w-8 h-8 object-cover rounded"
                          />
                        ) : (
                          getFileIcon(file.type)
                        )}
                        <div className="flex flex-col">
                          <span className="text-sm font-medium truncate max-w-[300px]">{file.name}</span>
                          <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 mr-1"
                          onClick={() => openPreview(file)}
                          title="预览"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => removeFile(file.id)}
                          title="删除"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <DialogFooter className="mt-5">
              <DialogClose asChild>
                <Button variant="outline" type="button">{t('cancel')}</Button>
              </DialogClose>
              <Button 
                type="button" 
                onClick={handleConfirmUpload}
                disabled={files.length === 0}
              >
                {t('upload')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
