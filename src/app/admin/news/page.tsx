import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { isAdminAuthenticated } from '@/lib/auth'
import { getNewsConfig, saveNewsConfig, type NewsConfig } from '@/lib/news/config'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

async function saveSettings(formData: FormData) {
  'use server'

  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    redirect('/admin/login')
  }

  const maxStoriesPerBatch = Number(formData.get('maxStoriesPerBatch')) || 13
  const maxPerPublisher = Number(formData.get('maxPerPublisher')) || 3

  const publisherLines = (formData.get('publisherWeights') as string || '').split('\n').map(l => l.trim()).filter(Boolean)
  const keywordLines = (formData.get('keywordWeights') as string || '').split('\n').map(l => l.trim()).filter(Boolean)
  const feedLines = (formData.get('customFeeds') as string || '').split('\n').map(l => l.trim()).filter(Boolean)

  const publisherWeights: NewsConfig['publisherWeights'] = publisherLines.map(line => {
    const [publisher, weight] = line.split(',').map(s => s.trim())
    return { publisher, weight: Number(weight) || 0 }
  }).filter(p => p.publisher)

  const keywordWeights: NewsConfig['keywordWeights'] = keywordLines.map(line => {
    const [keyword, weight] = line.split(',').map(s => s.trim())
    return { keyword, weight: Number(weight) || 0 }
  }).filter(k => k.keyword)

  const customFeeds: NewsConfig['customFeeds'] = feedLines.map(line => {
    const [url, publisher] = line.split(',').map(s => s.trim())
    return { url, publisher: publisher || 'Custom Feed' }
  }).filter(f => f.url)

  const config: NewsConfig = {
    maxStoriesPerBatch,
    maxPerPublisher,
    publisherWeights,
    keywordWeights,
    customFeeds
  }

  await saveNewsConfig(config)
  revalidatePath('/admin/news')
}

export default async function NewsSettingsPage() {
  const authenticated = await isAdminAuthenticated()
  if (!authenticated) {
    redirect('/admin/login')
  }

  const config = await getNewsConfig()

  return (
    <div className="container-page py-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-meta uppercase tracking-wider">Newsroom</p>
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Curation Settings</h1>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              Adjust weighting and add new RSS sources. Format: one entry per line, comma-separated.
            </p>
          </div>
        </div>

        <form action={saveSettings} className="space-y-6">
          <Card>
            <CardContent className="p-5 space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Stories per batch</span>
                  <Input
                    name="maxStoriesPerBatch"
                    type="number"
                    min={1}
                    defaultValue={config.maxStoriesPerBatch}
                  />
                  <p className="text-meta text-xs">Cap per digest run.</p>
                </label>
                <label className="space-y-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">Max per publisher</span>
                  <Input
                    name="maxPerPublisher"
                    type="number"
                    min={1}
                    defaultValue={config.maxPerPublisher}
                  />
                  <p className="text-meta text-xs">Prevents a single feed from dominating.</p>
                </label>
              </div>

              <label className="space-y-1 block">
                <span className="text-sm font-medium text-[var(--text-primary)]">Publisher weights</span>
                <Textarea
                  name="publisherWeights"
                  rows={5}
                  defaultValue={config.publisherWeights.map(p => `${p.publisher}, ${p.weight}`).join('\n')}
                />
                <p className="text-meta text-xs">Format: publisher, weight (higher = preferred)</p>
              </label>

              <label className="space-y-1 block">
                <span className="text-sm font-medium text-[var(--text-primary)]">Keyword weights</span>
                <Textarea
                  name="keywordWeights"
                  rows={5}
                  defaultValue={config.keywordWeights.map(k => `${k.keyword}, ${k.weight}`).join('\n')}
                />
                <p className="text-meta text-xs">Format: keyword, weight. Matches title + snippet.</p>
              </label>

              <label className="space-y-1 block">
                <span className="text-sm font-medium text-[var(--text-primary)]">Custom RSS feeds</span>
                <Textarea
                  name="customFeeds"
                  rows={5}
                  defaultValue={config.customFeeds.map(f => `${f.url}, ${f.publisher}`).join('\n')}
                />
                <p className="text-meta text-xs">Format: feed_url, publisher name.</p>
              </label>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit">Save settings</Button>
          </div>
        </form>
      </div>
    </div>
  )
}
