'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import TaskNotion from './TaskNotion'
import { useTranslations } from 'next-intl'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function BodyContent() {
  const t = useTranslations('Notion')
  const params = useParams()
  const [teamId, setTeamId] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Extract team ID from params, URL is expected to be /teams/:teamId/notion
    if (params.teamId) {
      setTeamId(parseInt(params.teamId))
    } else {
      setError('No team ID provided')
    }
    setIsLoading(false)
  }, [params])

  // Show loading state
  if (isLoading) {
    return (
      <div className="p-4 w-full h-full">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-8 w-48" />
        </div>
        
        <Card className="p-4 h-[calc(100vh-120px)]">
          <Skeleton className="w-full h-full" />
        </Card>
      </div>
    )
  }

  // Show error state if no team ID
  if (error || !teamId) {
    return (
      <div className="p-4 w-full h-full">
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{t('error')}</AlertTitle>
          <AlertDescription>
            {error || t('noTeamSelected')}
          </AlertDescription>
        </Alert>
        
        <div className="flex flex-col items-center justify-center h-[calc(100vh-160px)]">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">{t('noTeamKnowledgeBase')}</h3>
          <p className="text-muted-foreground mb-4">{t('selectTeamToViewKnowledgeBase')}</p>
          <Button onClick={() => window.history.back()}>
            {t('goBack')}
          </Button>
        </div>
      </div>
    )
  }

  // Show knowledge base with team ID
  return (
    <div className="p-4 w-full h-full">
      <TaskNotion teamId={teamId} />
    </div>
  )
}
