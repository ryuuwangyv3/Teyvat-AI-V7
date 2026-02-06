
import { GitHubConfig, DriveItem, FileType } from '../types';
import { saveDriveItem, fetchDriveItems, findDriveItemByName, logSystemEvent } from './supabaseService';

/**
 * Celestial Bridge Service
 * Integrates GitHub Repositories directly with Irminsul Drive (VFS)
 */

interface GitHubTreeItem {
    path: string;
    mode: string;
    type: 'blob' | 'tree';
    sha: string;
    size?: number;
    url: string;
}

// Default Repository Coordinates provided by Traveler
export const DEFAULT_GITHUB_CONFIG: GitHubConfig = {
    owner: "ryuuwangyv3",
    repo: "Teyvatv1",
    branch: "main",
    autoSync: true
};

const getMimeType = (fileName: string): string => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const map: Record<string, string> = {
        'js': 'application/javascript',
        'ts': 'application/typescript',
        'html': 'text/html',
        'css': 'text/css',
        'json': 'application/json',
        'md': 'text/markdown',
        'txt': 'text/plain',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'svg': 'image/svg+xml',
        'gif': 'image/gif'
    };
    return map[ext || ''] || 'text/plain';
};

const getFileType = (fileName: string): FileType => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp'].includes(ext || '')) return 'image';
    if (['js', 'ts', 'py', 'json', 'c', 'cpp', 'html', 'css'].includes(ext || '')) return 'code';
    if (['md', 'txt'].includes(ext || '')) return 'text';
    if (['mp3', 'wav', 'ogg'].includes(ext || '')) return 'audio';
    if (['mp4', 'webm', 'mov'].includes(ext || '')) return 'video';
    return 'binary';
};

export const syncGithubRepo = async (config: GitHubConfig): Promise<{ success: boolean; synced: number; errors: number }> => {
    const owner = config.owner || DEFAULT_GITHUB_CONFIG.owner;
    const repo = config.repo || DEFAULT_GITHUB_CONFIG.repo;
    const branch = config.branch || DEFAULT_GITHUB_CONFIG.branch;

    if (!owner || !repo) return { success: false, synced: 0, errors: 0 };

    const headers: Record<string, string> = {
        'Accept': 'application/vnd.github.v3+json'
    };
    
    // Check for token in config or env (Vite replaced)
    const token = config.token || process.env.GITHUB_TOKEN;
    if (token) headers['Authorization'] = `token ${token}`;

    try {
        await logSystemEvent(`Resonating with GitHub (Pull): ${owner}/${repo} [${branch}]`, 'info');

        // 1. Fetch recursive tree
        const treeUrl = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        const treeResponse = await fetch(treeUrl, { headers });
        
        if (!treeResponse.ok) {
            if (treeResponse.status === 403) throw new Error("GitHub Rate Limit exceeded. Please provide a token in Admin Console.");
            throw new Error(`GitHub API Error: ${treeResponse.statusText}`);
        }
        
        const treeData = await treeResponse.json();
        const tree: GitHubTreeItem[] = treeData.tree;

        let syncedCount = 0;
        let errorCount = 0;

        // Mapping folder paths to VFS IDs
        const folderPathToId = new Map<string, string | null>();
        folderPathToId.set('', null);

        // A. Filter and Process Tree
        const folders = tree.filter(i => i.type === 'tree');
        const blobs = tree.filter(i => i.type === 'blob');

        // B. Ensure Folders Exist in VFS
        for (const f of folders) {
            const pathParts = f.path.split('/');
            const name = pathParts.pop() || '';
            const parentPath = pathParts.join('/');
            const parentId = folderPathToId.get(parentPath) || null;

            // Check if exists
            const existingItems = await fetchDriveItems(parentId);
            const found = existingItems.find(item => item.name === name && item.type === 'folder');
            
            if (found) {
                folderPathToId.set(f.path, found.id);
            } else {
                const newId = crypto.randomUUID();
                await saveDriveItem({
                    id: newId,
                    parent_id: parentId,
                    name,
                    type: 'folder',
                    size: 0,
                    created_at: Date.now(),
                    updated_at: Date.now()
                });
                folderPathToId.set(f.path, newId);
            }
        }

        // C. Sync Blobs (Files) - Only if SHA differs
        for (const b of blobs) {
            const pathParts = b.path.split('/');
            const name = pathParts.pop() || '';
            const parentPath = pathParts.join('/');
            const parentId = folderPathToId.get(parentPath) || null;

            const existingItems = await fetchDriveItems(parentId);
            const found = existingItems.find(item => item.name === name && item.type !== 'folder');

            // Skip if exists and has same SHA (no changes)
            if (found && found.github_sha === b.sha) continue;

            try {
                // Fetch blob content
                const blobUrl = `https://api.github.com/repos/${owner}/${repo}/git/blobs/${b.sha}`;
                const blobResponse = await fetch(blobUrl, { headers });
                const blobData = await blobResponse.json();
                
                let content = "";
                const type = getFileType(name);
                const mime = getMimeType(name);

                if (blobData.encoding === 'base64') {
                    // For text/code, we store as base64 data URL for compatibility with existing VFS logic
                    content = `data:${mime};base64,${blobData.content.replace(/\s/g, '')}`;
                }

                await saveDriveItem({
                    id: found?.id || crypto.randomUUID(),
                    parent_id: parentId,
                    name,
                    type,
                    size: b.size || 0,
                    mime_type: mime,
                    content,
                    created_at: found?.created_at || Date.now(),
                    updated_at: Date.now(),
                    github_sha: b.sha
                });
                
                syncedCount++;
            } catch (err) {
                console.error(`Sync error for ${b.path}:`, err);
                errorCount++;
            }
        }

        if (syncedCount > 0) {
            await logSystemEvent(`Irminsul Sync: Pulled ${syncedCount} fragments from GitHub.`, 'success');
        }

        return { success: true, synced: syncedCount, errors: errorCount };

    } catch (err: any) {
        await logSystemEvent(`GitHub Resonance Disturbance: ${err.message}`, 'error');
        return { success: false, synced: 0, errors: 0 };
    }
};

export const pushToGithub = async (items: DriveItem[], config: GitHubConfig) => {
    const owner = config.owner || DEFAULT_GITHUB_CONFIG.owner;
    const repo = config.repo || DEFAULT_GITHUB_CONFIG.repo;
    const branch = config.branch || DEFAULT_GITHUB_CONFIG.branch;
    const token = config.token;

    if (!token) return { success: false, message: "No GitHub Token" };

    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
    };

    try {
        await logSystemEvent(`Initiating GitHub Push: ${owner}/${repo}`, 'info');

        // 1. Get latest commit SHA
        const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, { headers });
        if (!refRes.ok) throw new Error("Could not access repository ref.");
        const refData = await refRes.json();
        const latestCommitSha = refData.object.sha;

        // 2. Get tree SHA
        const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${latestCommitSha}`, { headers });
        const commitData = await commitRes.json();
        const treeSha = commitData.tree.sha;

        // 3. Create Blobs & Tree Items
        const treeItems = [];
        let changeCount = 0;

        for (const item of items) {
            // Only sync text/code files stored with content in DB (not external storage links)
            if (item.type !== 'folder' && item.content && !item.content.startsWith('http') && item.content.includes('base64,')) {
                
                let content = item.content.split(',')[1]; // Extract base64
                
                const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ content, encoding: 'base64' })
                });
                
                if (blobRes.ok) {
                    const blobData = await blobRes.json();
                    treeItems.push({
                        path: item.name, // Flat structure for simple sync (can be improved to use full path)
                        mode: '100644',
                        type: 'blob',
                        sha: blobData.sha
                    });
                    changeCount++;
                }
            }
        }

        if (treeItems.length === 0) return { success: true, message: "No compatible files to sync" };

        // 4. Create Tree
        const newTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                base_tree: treeSha,
                tree: treeItems
            })
        });
        const newTreeData = await newTreeRes.json();

        // 5. Create Commit
        const newCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                message: `Akasha Auto-Sync: ${new Date().toLocaleString()}`,
                tree: newTreeData.sha,
                parents: [latestCommitSha]
            })
        });
        const newCommitData = await newCommitRes.json();

        // 6. Update Ref
        await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ sha: newCommitData.sha })
        });

        await logSystemEvent(`GitHub Push Complete: Synced ${changeCount} files.`, 'success');
        return { success: true, message: "Synced" };

    } catch (e: any) {
        await logSystemEvent(`GitHub Push Failed: ${e.message}`, 'error');
        return { success: false, message: e.message };
    }
};
