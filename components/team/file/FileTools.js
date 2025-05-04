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
import { useToast } from '@/hooks/use-toast'

export default function FileTools({ isOpen, onClose, taskId, currentPath = '/', onFilesUploaded }) {
  const t = useTranslations('CreateTask')
  const { toast } = useToast()
  const [files, setFiles] = useState([])
  const [isDragging, setIsDragging] = useState(false)
  const [previewFile, setPreviewFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

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

  // Confirm upload
  const handleConfirmUpload = async () => {
    if (!files.length) return
    if (!taskId) {
      toast({
        title: t('uploadError'),
        description: t('noTaskIdProvided'),
        variant: 'destructive'
      })
      return
    }
    
    try {
      setIsUploading(true)
      
      // Get current task data to access attachment_ids
      const { data: taskData, error: taskError } = await supabase
        .from('task')
        .select('attachment_ids')
        .eq('id', taskId)
        .single()
      
      if (taskError) throw taskError
      
      const attachmentIds = taskData?.attachment_ids || []
      const newAttachmentIds = []
      
      // Upload each file
      for (const fileItem of files) {
        // Generate a unique file path
        const timestamp = new Date().getTime()
        const fileExt = fileItem.name.split('.').pop()
        const fileName = `${timestamp}_${fileItem.name}`
        const filePath = `tasks/${taskId}/${fileName}`
        
        // Upload file to Supabase storage
        const { data: storageData, error: storageError } = await supabase.storage
          .from('attachments')
          .upload(filePath, fileItem.file)
        
        if (storageError) throw storageError
        
        // Get public URL
        const { data: publicUrlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(filePath)
          
        const publicUrl = publicUrlData.publicUrl
        
        // Insert record into attachment table
        const { data: attachmentData, error: attachmentError } = await supabase
          .from('attachment')
          .insert({
            file_name: fileItem.name,
            file_url: publicUrl,
            task_id: taskId,
            uploaded_by: '/* user id from context */', // Replace with authenticated user ID
            file_path: currentPath,
            file_type: fileItem.type,
            size: fileItem.size
          })
          .select()
        
        if (attachmentError) throw attachmentError
        
        newAttachmentIds.push(attachmentData[0].id)
      }
      
      // Update task with new attachment IDs
      const { error: updateError } = await supabase
        .from('task')
        .update({ 
          attachment_ids: [...attachmentIds, ...newAttachmentIds],
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId)
      
      if (updateError) throw updateError
      
      // Clean up
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
      
      setFiles([])
      
      toast({
        title: t('uploadSuccess'),
        description: t('filesUploadedSuccessfully'),
        variant: 'default'
      })
      
      // Call callback function if provided
      if (typeof onFilesUploaded === 'function') {
        onFilesUploaded()
      }
      
      onClose()
    } catch (error) {
      console.error('Upload error:', error)
      toast({
        title: t('uploadError'),
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setIsUploading(false)
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
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
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
                {currentPath === '/' ? t('uploadToRootFolder') : t('uploadingTo') + ` ${currentPath}`}
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
                          title={t('preview')}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
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
                <Button variant="outline" type="button">{t('cancel')}</Button>
              </DialogClose>
              <Button 
                type="button" 
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
