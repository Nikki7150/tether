export const NOTION_VERSION = '2025-09-03'
const localDate = (ms) => new Date(ms).toLocaleDateString('en-CA')

export async function syncCompletedTasks({ token, dataSourceId, tasks }) {
    const syncedIds = []
    for (const task of tasks) {
        let done = false
        for (let attempt = 0; attempt < 3 && !done; attempt++) {
            let res
            try {
                res = await fetch('https://api.notion.com/v1/pages', {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Notion-Version': NOTION_VERSION,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        parent: { data_source_id: dataSourceId },
                        properties: {
                            Name: { title: [{ text: { content: task.text } }] },
                            Completed: { checkbox: true },
                            Date: { date: { start: localDate(task.completedAt) } },
                        },
                    }),
                })
            } catch {
                return { syncedIds, error: 'network' }
            }
            if (res.ok) {
                syncedIds.push(task.id)
                done = true
            } else if (res.status === 429) {
                const retryAfterSec = Number(res.headers.get('retry-after')) || 1
                const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
                await sleep(retryAfterSec * 1000)
                continue
            } else if (res.status === 401) {
                return { syncedIds, error: 'auth' }
            } else {
                console.error(`Failed to sync task ${task.id} (HTTP ${res.status})`)
                break
            }
        }
    }
    return { syncedIds }
}