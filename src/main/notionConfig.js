import { app, safeStorage } from 'electron'
import { join } from 'path'
import { readFile, writeFile, rm } from 'fs/promises'

const configFile = () => join(app.getPath('userData'), 'notion.json')

export async function saveNotionConfig({ token, dataSourceId }) {
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Safe storage encryption is not available on this system')
    }
    const encrypted = safeStorage.encryptString(token).toString('base64')
    await writeFile(
        configFile(),
        JSON.stringify({ dataSourceId, token: encrypted }, null, 2),
        'utf8'
    )
}

export async function loadNotionConfig() {
    let raw
    try {
        raw = await readFile(configFile(), 'utf8')
    } catch (err) {
        if (err.code === 'ENOENT') {
            return null
        }
        throw err
    }
    const saved = JSON.parse(raw)
    if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Safe storage encryption is not available to decrypt the token')
    }
    const token = safeStorage.decryptString(Buffer.from(saved.token, 'base64'))
    return { token, dataSourceId: saved.dataSourceId }
}

export async function clearNotionConfig() {
    await rm(configFile(), { force: true })
}