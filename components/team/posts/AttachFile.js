'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, File, X, FileText, Sheet, Film, Music, Eye, ChevronLeft } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'
import { useGetUser } from '@/lib/hooks/useGetUser';
import { api } from '@/lib/api';
import { useParams } from "next/navigation";
import { useSelector } from "react-redux"

export default function AttachFile({ isOpen, onClose, postId, teamId, onFileAttached }) {
  const t = useTranslations('File')
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const { user } = useGetUser();
  const userId = user?.id
  const params = useParams()
  const { id: projectId } = params
  const [themeColor, setThemeColor] = useState('#64748b')
  const project = useSelector(state => 
    state.projects.projects.find(p => String(p.id) === String(projectId))
  );
  
  useEffect(() => {
    if (project?.theme_color) {
      setThemeColor(project.theme_color);
    }
  }, [project]);
  
  // Handle file selection
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || [])
    addFiles(selectedFiles)
  }

  // Add files to the list
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

  // Remove file
  const removeFile = (id) => {
    setFiles(files => {
      const updatedFiles = files.filter(file => file.id !== id)
      
      // Clean up URL object
      const fileToRemove = files.find(file => file.id === id)
      if (fileToRemove && fileToRemove.preview) {
        URL.revokeObjectURL(fileToRemove.preview)
      }
      
      return updatedFiles
    })
  }

  // Handle drag and drop
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

  // Trigger file selection
  const handleSelectFilesClick = () => {
    fileInputRef.current?.click()
  }

  // Format file size
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Get file icon
  const getFileIcon = (fileType) => {
    // Return appropriate icon based on file type
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

  // Open file preview
  const openPreview = (file) => {
    setPreviewFile(file)
  }

  // Close file preview
  const closePreview = () => {
    setPreviewFile(null)
  }

  // Render preview content
  const renderPreviewContent = () => {
    if (!previewFile) return null

    // Render different preview components based on file type
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
      // Create a preview for text files
      const [textContent, setTextContent] = useState(t('loading'))
      
      // Read text content
      useEffect(() => {
        const reader = new FileReader()
        reader.onload = (e) => {
          setTextContent(e.target.result)
        }
        reader.onerror = () => {
          setTextContent(t('cannotReadFile'))
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
      // For other file types that cannot be previewed
      return (
        <div className="text-center py-8">
          <div className="mx-auto w-16 h-16 mb-4 flex items-center justify-center">
            {getFileIcon(previewFile.type)}
          </div>
          <h3 className="text-xl font-medium mb-2">{previewFile.name}</h3>
          <p className="text-gray-500 mb-4">{formatFileSize(previewFile.size)}</p>
          <p className="text-gray-500">{t('cannotPreview')}</p>
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
            {t('download')}
          </Button>
        </div>
      )
    }
  }

  // 修改handleConfirmUpload函数，不上传文件而是返回文件信息
  const handleConfirmUpload = async () => {
    if (!files.length) return
    
    try {
      // 不再上传文件，而是将文件对象返回给父组件
      const selectedFiles = files.map(fileItem => ({
        file: fileItem.file,
        name: fileItem.name,
        type: fileItem.type,
        size: fileItem.size,
        preview: fileItem.preview
      }))
      
      // 调用回调函数，将文件信息传递回去
      if (typeof onFileAttached === 'function') {
        onFileAttached(selectedFiles)
      }
      
      // 不要清理预览URL，因为父组件可能需要继续使用
      setFiles([])
      onClose()
    } catch (error) {
      console.error('Error handling files:', error)
      toast.error(t('error'), {
        description: error.message,
      })
    }
  }
  
  // 处理单个文件上传的完整流程 - 这个函数现在不在这里调用，但保留供参考
  const processFileUpload = async (fileItem) => {
    try {
      // 生成唯一的文件路径
      const timestamp = new Date().getTime()
      const fileName = fileItem.name
      const uniqueFileName = `${timestamp}_${fileName}`
      
      // 如果是新帖子，使用临时路径
      const filePath = postId === 'new' 
        ? `temp/posts/${timestamp}/${uniqueFileName}`
        : `posts/${postId}/${uniqueFileName}`
      
      // 上传文件到Supabase存储
      const { data: storageData, error: storageError } = await supabase.storage
        .from('attachments')
        .upload(filePath, fileItem.file)
      
      if (storageError) throw storageError
      
      // 获取公共URL
      const { data: publicUrlData } = supabase.storage
        .from('attachments')
        .getPublicUrl(filePath)
        
      const publicUrl = publicUrlData.publicUrl
      
      // 创建附件记录
      const { data: attachmentData, error: attachmentError } = await supabase
        .from('attachment')
        .insert({
          file_name: fileName,
          file_url: publicUrl,
          uploaded_by: userId,
          file_type: fileItem.type,
          size: fileItem.size,
          file_path: filePath
        })
        .select()
        .single()
      
      if (attachmentError) throw attachmentError
      
      return {
        id: attachmentData.id,
        name: fileName,
        url: publicUrl,
        type: fileItem.type,
        size: fileItem.size
      }
      
    } catch (error) {
      console.error('Error uploading file:', error)
      throw new Error(t('errorUploadingFile'))
    }
  }

  // Clean up on dialog close
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
      <DialogContent 
        className={`sm:max-w-${previewFile ? '4xl' : '600px'}`}
        onPointerDownOutside={(e) => {
          e.preventDefault();
          // 不关闭父对话框，只关闭当前对话框
          handleClose();
        }}
        onEscapeKeyDown={(e) => {
          e.preventDefault();
          // 不关闭父对话框，只关闭当前对话框
          handleClose();
        }}
      >
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
              <DialogDescription>
                {t('uploadAttachmentToPost')}
              </DialogDescription>
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
                variant={themeColor} 
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
                    <div key={file.id} className="flex items-center justify-between bg-accent p-2 rounded-md">
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
                          title={t('preview')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:text-red-500"
                          onClick={() => removeFile(file.id)}
                          title={t('delete')}
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
                <Button variant="outline" type="button" disabled={isUploading}>{t('cancel')}</Button>
              </DialogClose>
              <Button 
                type="button" 
                variant={themeColor}
                onClick={handleConfirmUpload}
                disabled={files.length === 0 || isUploading}
              >
                {isUploading ? t('uploading') : t('upload')}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

