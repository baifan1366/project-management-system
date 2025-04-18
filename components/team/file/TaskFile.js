'use client'

import { useState, useEffect } from 'react'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { 
  File, FileText, Upload, MoreHorizontal, 
  Download, Trash, Share, Plus, Search, FolderPlus,
  ChevronDown, FileUp, FolderUp,
  Table2, ExternalLink, Sheet, Folder
} from 'lucide-react'
import { useTranslations } from 'next-intl'
import FileTools from './FileTools'

export default function TaskFile() {
  const t = useTranslations('CreateTask')
  // 模拟文件数据
  const [files, setFiles] = useState([
    { 
      id: 1, 
      name: 'Class Materials', 
      type: 'folder',
      modified: '2023-10-15',
      modifiedBy: 'Pau Kiu Nai'
    },
    { 
      id: 2, 
      name: 'TIA4213-2510-Group_Selection.xlsx', 
      type: 'excel',
      modified: new Date().toISOString().split('T')[0],
      modifiedBy: 'YAM CHEE FAI'
    },
    { 
      id: 3, 
      name: 'Project Requirements.docx', 
      type: 'word',
      modified: new Date().toISOString().split('T')[0],
      modifiedBy: 'Admin User'
    },
    { 
      id: 4, 
      name: 'Meeting Notes.pdf', 
      type: 'pdf',
      modified: new Date().toISOString().split('T')[0],
      modifiedBy: 'System'
    }
  ])
  const [showFileTools, setShowFileTools] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedFiles, setSelectedFiles] = useState([])
  
  // 处理文件选择
  const handleSelectFile = (fileId) => {
    setSelectedFiles(prev => {
      if (prev.includes(fileId)) {
        return prev.filter(id => id !== fileId)
      } else {
        return [...prev, fileId]
      }
    })
  }
  
  // 处理全选/取消全选
  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id))
    }
  }
  
  // 删除选中的文件
  const handleDeleteSelected = () => {
    setFiles(files.filter(file => !selectedFiles.includes(file.id)))
    setSelectedFiles([])
  }
  
  // 文件类型图标映射
  const getFileIcon = (type) => {
    switch(type) {
      case 'folder':
        return <Folder className="h-4 w-4" />
      case 'excel':
        return <Sheet className="h-4 w-4" />
      case 'word':
        return <FileText className="h-4 w-4" />
      case 'pdf':
        return <File className="h-4 w-4" />
      default:
        return <File className="h-4 w-4" />
    }
  }
  
  // 过滤文件
  const filteredFiles = files.filter(file => 
    file.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="w-full px-0 py-2">
      <div className="flex justify-between items-center mb-2">
        <div className="flex gap-2">
          <DropdownMenu>
            <Button variant="ghost" className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors" asChild>
              <DropdownMenuTrigger className="flex items-center">
                <Upload className="h-4 w-4 mr-1" />
                {t('upload')}
                <ChevronDown className="h-4 w-4 ml-1" />
              </DropdownMenuTrigger>
            </Button>
            <DropdownMenuContent>
              <DropdownMenuItem 
                className="cursor-pointer text-gray-800 hover:text-black hover:font-medium transition-colors" 
                onClick={() => setShowFileTools(true)}
              >
                <FileUp className="mr-2 h-4 w-4" />
                {t('uploadFile')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-gray-800 hover:text-black hover:font-medium transition-colors">
                <FolderUp className="mr-2 h-4 w-4" />
                {t('uploadFolder')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="relative w-96">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground"/>
            <Input
                placeholder={t('searchFile')}
                className="pl-8 h-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>          
        </div>
        
        <div className="flex gap-2">
          {selectedFiles.length > 0 && (
            <Button 
              variant="ghost" 
              className="gap-1 text-destructive hover:text-destructive/80 hover:font-medium transition-colors"
              onClick={handleDeleteSelected}
            >
              <Trash className="h-4 w-4 mr-1" />
              {t('delete')} ({selectedFiles.length})
            </Button>
          )}

          <Button variant="ghost" className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors">
            <Table2 className="h-4 w-4 mr-1" />
            <span className="text-sm">{t('editInGridView')}</span>
          </Button>

          <Button variant="ghost" className="gap-1 text-gray-800 hover:text-black hover:font-medium transition-colors">
            <ExternalLink className="h-4 w-4 mr-1" />
            {t('share')}
          </Button>
        </div>
      </div>
      
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[3%]"> 
                <Checkbox
                  checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead className="w-[45%]">{t('name')}</TableHead>
              <TableHead className="w-[25%]">{t('modifiedDate')}</TableHead>
              <TableHead className="w-[20%]">{t('modifiedBy')}</TableHead>
              <TableHead className="w-[5%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredFiles.length > 0 ? (
              filteredFiles.map((file) => (
                <TableRow key={file.id}>
                  <TableCell>
                    <Checkbox
                      checked={selectedFiles.includes(file.id)}
                      onCheckedChange={() => handleSelectFile(file.id)}
                    />
                  </TableCell>
                  <TableCell className="font-medium flex items-center h-12 gap-2">
                    {getFileIcon(file.type)}
                    {file.name}
                  </TableCell>
                  <TableCell>{file.modified}</TableCell>
                  <TableCell>{file.modifiedBy}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem className="cursor-pointer text-gray-800 hover:text-black hover:font-medium transition-colors">
                          <Download className="mr-2 h-4 w-4" />
                          {t('download')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-gray-800 hover:text-black hover:font-medium transition-colors">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t('share')}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="cursor-pointer text-destructive hover:font-medium transition-colors">
                          <Trash className="mr-2 h-4 w-4" />
                          {t('delete')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  {t('noFileFound')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {showFileTools && <FileTools isOpen={showFileTools} onClose={() => setShowFileTools(false)}/>}
    </div>
  )
}