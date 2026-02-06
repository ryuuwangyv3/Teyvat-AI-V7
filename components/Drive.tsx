
import React, { useState, useEffect, useRef } from 'react';
import { 
  HardDrive, Folder, File, FolderPlus, Upload, Grid, List, 
  ChevronRight, MoreVertical, Download, Trash2, Eye, FileText, Image, Code, Music, Film, Loader2, Home, X, Link, Play,
  FilePlus, Edit, ArrowRight, CornerUpLeft, Check, Copy, ExternalLink, RefreshCw, Save, CloudLightning, Database, Globe
} from 'lucide-react';
import { DriveItem, FileType } from '../types';
import { 
    fetchDriveItems, fetchDriveItemContent, saveDriveItem, deleteDriveItem, 
    subscribeToTable, findDriveItemByName, updateDriveItem, uploadToSupabaseStorage, fetchTotalStorageUsage, fetchAllDriveItems 
} from '../services/supabaseService';

// --- UTILS: UTF-8 SAFE BASE64 ---
const utf8_to_b64 = (str: string) => {
  return window.btoa(unescape(encodeURIComponent(str)));
};

const b64_to_utf8 = (str: string) => {
  try {
    return decodeURIComponent(escape(window.atob(str)));
  } catch(e) {
    return window.atob(str);
  }
};

// 5GB Storage Limit
const STORAGE_LIMIT = 5 * 1024 * 1024 * 1024;

const Drive: React.FC = () => {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderHistory, setFolderHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [items, setItems] = useState<DriveItem[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<DriveItem | null>(null);
  const [totalUsage, setTotalUsage] = useState<number>(0);
  
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [showNewFileInput, setShowNewFileInput] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  
  const [isRenaming, setIsRenaming] = useState(false);
  
  // Upload State
  const [uploadStatus, setUploadStatus] = useState<{ processing: boolean; current: number; total: number; filename: string }>({
      processing: false, current: 0, total: 0, filename: ''
  });
  
  const [previewContent, setPreviewContent] = useState<DriveItem | null>(null);
  const [previewMode, setPreviewMode] = useState<'code' | 'render'>('render');
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [simulatedHtml, setSimulatedHtml] = useState<string | null>(null);

  const [showEditor, setShowEditor] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [showMoveModal, setShowMoveModal] = useState(false);
  const [moveTargetHistory, setMoveTargetHistory] = useState<{id: string | null, name: string}[]>([{id: null, name: 'Root'}]);
  const [moveTargetItems, setMoveTargetItems] = useState<DriveItem[]>([]);

  // Copy Path State
  const [itemToCopy, setItemToCopy] = useState<DriveItem | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const loadItems = async () => {
    setIsLoading(true);
    const data = await fetchDriveItems(currentFolderId);
    setItems(data.sort((a, b) => (a.type === 'folder' && b.type !== 'folder' ? -1 : 1)));
    setIsLoading(false);
  };

  const refreshStorageStats = async () => {
      const usage = await fetchTotalStorageUsage();
      setTotalUsage(usage);
  };

  useEffect(() => {
    loadItems();
    refreshStorageStats();

    const channel = subscribeToTable('drive_items', (payload) => {
        // Real-time update for list and storage stats
        if (payload.new && (payload.new.parent_id === currentFolderId || payload.old?.parent_id === currentFolderId)) {
            loadItems();
        }
        if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE' || payload.eventType === 'UPDATE') {
            refreshStorageStats();
        }
    });
    return () => { if (channel) channel.unsubscribe(); };
  }, [currentFolderId]);

  const handleNavigate = (folderId: string | null, folderName: string) => {
    setCurrentFolderId(folderId);
    const index = folderHistory.findIndex(f => f.id === folderId);
    if (index !== -1) {
        setFolderHistory(prev => prev.slice(0, index + 1));
    } else {
        setFolderHistory(prev => [...prev, { id: folderId, name: folderName }]);
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;
    const newFolder: DriveItem = {
        id: crypto.randomUUID(),
        parent_id: currentFolderId,
        name: newItemName,
        type: 'folder',
        size: 0,
        created_at: Date.now(),
        updated_at: Date.now()
    };
    await saveDriveItem(newFolder);
    setNewItemName('');
    setShowNewFolderInput(false);
    loadItems();
  };

  const handleCreateFile = async () => {
      if (!newItemName.trim()) return;
      let name = newItemName;
      if (!name.includes('.')) name += '.txt';

      const mimeMap: Record<string, string> = {
          'txt': 'text/plain', 'html': 'text/html', 'css': 'text/css', 'js': 'application/javascript', 'json': 'application/json', 'md': 'text/markdown'
      };
      const ext = name.split('.').pop() || 'txt';
      const mime = mimeMap[ext] || 'text/plain';
      const emptyContent = `data:${mime};base64,`; 

      const newFile: DriveItem = {
          id: crypto.randomUUID(),
          parent_id: currentFolderId,
          name: name,
          type: ext === 'js' || ext === 'json' ? 'code' : 'text',
          mime_type: mime,
          size: 0,
          content: emptyContent,
          created_at: Date.now(),
          updated_at: Date.now()
      };

      await saveDriveItem(newFile);
      setNewItemName('');
      setShowNewFileInput(false);
      loadItems();
  };

  const determineFileType = (file: File): FileType => {
      const name = file.name.toLowerCase();
      const type = file.type.toLowerCase();

      // Media Detection (Robust)
      if (type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|tiff|heic)$/.test(name)) return 'image';
      if (type.startsWith('video/') || /\.(mp4|webm|ogg|mov|avi|mkv|flv|wmv|m4v|3gp)$/.test(name)) return 'video';
      if (type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|flac|aac|wma)$/.test(name)) return 'audio';

      // Extensive Code & Config Extensions
      const codeExts = [
          '.js', '.jsx', '.ts', '.tsx', '.json', '.env', '.html', '.css', '.scss', '.less',
          '.py', '.php', '.sh', '.bash', '.md', '.yml', '.yaml', '.xml', '.sql', '.toml',
          '.java', '.c', '.cpp', '.cs', '.go', '.rb', '.lua', '.rs', '.swift', '.kt', 
          '.bat', '.ps1', '.cmd', '.pl', '.r', '.dart', '.vue', '.svelte', '.astro', '.ini', '.cfg', '.conf'
      ];
      
      // Check if file ends with any code extension (handles filenames like ".env" correctly)
      if (codeExts.some(ext => name.endsWith(ext))) return 'code';
      
      // Generic Text Fallback
      if (type.startsWith('text/') || name.endsWith('.txt') || name.endsWith('.log') || name.endsWith('.csv')) return 'text';
      
      // Default to binary
      return 'binary';
  };

  // --- MULTIPLE FILE UPLOAD (UNLIMITED COUNT, 5GB STORAGE LIMIT) ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    // Calculate total size of new batch
    let batchSize = 0;
    for (let i = 0; i < files.length; i++) {
        batchSize += files[i].size;
    }

    // Check against Global Limit
    if (totalUsage + batchSize > STORAGE_LIMIT) {
        const gb = (STORAGE_LIMIT / (1024 * 1024 * 1024)).toFixed(1);
        alert(`Storage Full: Upload exceeds the ${gb}GB Limit. Please free up space.`);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
    }
    
    setUploadStatus({ processing: true, current: 0, total: files.length, filename: 'Initializing...' });
    
    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            setUploadStatus(prev => ({ ...prev, current: i + 1, filename: file.name }));

            let contentUrl: string | null = null;
            const fileType = determineFileType(file);
            
            // Use Supabase Storage for binaries or files > 100KB
            // Code/Text files < 100KB stay in DB for easier editing
            if (file.size > 100 * 1024 || !['text', 'code'].includes(fileType)) {
                contentUrl = await uploadToSupabaseStorage(file, file.name);
            }

            if (!contentUrl) {
                // Fallback to Base64 for local/guest or small files
                await new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = async (ev) => {
                        const result = ev.target?.result as string;
                        await saveDriveItem({
                            id: crypto.randomUUID(),
                            parent_id: currentFolderId,
                            name: file.name,
                            type: fileType,
                            size: file.size,
                            mime_type: file.type || 'text/plain',
                            content: result,
                            created_at: Date.now(),
                            updated_at: Date.now()
                        });
                        resolve();
                    };
                    reader.readAsDataURL(file);
                });
            } else {
                await saveDriveItem({
                    id: crypto.randomUUID(),
                    parent_id: currentFolderId,
                    name: file.name,
                    type: fileType,
                    size: file.size,
                    mime_type: file.type || 'text/plain',
                    content: contentUrl,
                    created_at: Date.now(),
                    updated_at: Date.now()
                });
            }
        }
    } catch (err) {
        alert("Upload process interrupted.");
    } finally {
        setUploadStatus(prev => ({ ...prev, processing: false }));
        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
        loadItems(); // Refresh view
        refreshStorageStats(); // Refresh stats
    }
  };

  // --- RECURSIVE FOLDER UPLOAD (UNLIMITED COUNT, 5GB LIMIT) ---
  const handleFolderUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      
      // Calculate total size
      let batchSize = 0;
      for (let i = 0; i < files.length; i++) {
          batchSize += files[i].size;
      }

      // Check Limit
      if (totalUsage + batchSize > STORAGE_LIMIT) {
        const gb = (STORAGE_LIMIT / (1024 * 1024 * 1024)).toFixed(1);
        alert(`Storage Full: Upload exceeds the ${gb}GB Limit. Please free up space.`);
        if (folderInputRef.current) folderInputRef.current.value = '';
        return;
      }
      
      setUploadStatus({ processing: true, current: 0, total: files.length, filename: 'Analyzing Structure...' });
      
      // Cache for created folders in this session to avoid DB spam
      const folderCache = new Map<string, string>();

      const ensureFolder = async (name: string, parentId: string | null): Promise<string> => {
          const cacheKey = `${parentId || 'root'}/${name}`;
          if (folderCache.has(cacheKey)) {
              return folderCache.get(cacheKey)!;
          }

          const existingItems = await fetchDriveItems(parentId);
          const existingFolder = existingItems.find(i => i.name === name && i.type === 'folder');
          
          if (existingFolder) {
              folderCache.set(cacheKey, existingFolder.id);
              return existingFolder.id;
          }

          const newId = crypto.randomUUID();
          await saveDriveItem({
              id: newId,
              parent_id: parentId,
              name: name,
              type: 'folder',
              size: 0,
              created_at: Date.now(),
              updated_at: Date.now()
          });
          
          folderCache.set(cacheKey, newId);
          return newId;
      };

      try {
          for (let i = 0; i < files.length; i++) {
              const file = files[i];
              setUploadStatus(prev => ({ ...prev, current: i + 1, filename: file.name }));

              const pathParts = file.webkitRelativePath.split('/');
              let parentId = currentFolderId;
              
              for (let j = 0; j < pathParts.length - 1; j++) {
                  const folderName = pathParts[j];
                  parentId = await ensureFolder(folderName, parentId);
              }
              
              let contentUrl: string | null = null;
              const fileType = determineFileType(file);
              
              if (file.size > 100 * 1024 || !['text', 'code'].includes(fileType)) {
                  contentUrl = await uploadToSupabaseStorage(file, file.name);
              }

              if (!contentUrl) {
                  await new Promise<void>((resolve) => {
                      const reader = new FileReader();
                      reader.onload = async (ev) => {
                          const result = ev.target?.result as string;
                          await saveDriveItem({
                              id: crypto.randomUUID(),
                              parent_id: parentId,
                              name: file.name,
                              type: fileType,
                              size: file.size,
                              mime_type: file.type || 'text/plain',
                              content: result,
                              created_at: Date.now(),
                              updated_at: Date.now()
                          });
                          resolve();
                      };
                      reader.readAsDataURL(file);
                  });
              } else {
                  await saveDriveItem({
                      id: crypto.randomUUID(),
                      parent_id: parentId,
                      name: file.name,
                      type: fileType,
                      size: file.size,
                      mime_type: file.type || 'text/plain',
                      content: contentUrl,
                      created_at: Date.now(),
                      updated_at: Date.now()
                  });
              }
          }
      } catch (err) {
          console.error("Folder upload error", err);
          alert("Some files failed to upload.");
      } finally {
          setUploadStatus(prev => ({ ...prev, processing: false }));
          loadItems();
          refreshStorageStats();
          if (folderInputRef.current) folderInputRef.current.value = '';
      }
  };

  const handleDelete = async (item: DriveItem) => {
    if (confirm(`Permanently delete ${item.name}? This cannot be undone.`)) {
        await deleteDriveItem(item.id);
        setSelectedItem(null);
        loadItems();
        refreshStorageStats();
    }
  };

  const handleRename = async () => {
      if (!selectedItem || !newItemName.trim()) return;
      await updateDriveItem(selectedItem.id, { name: newItemName });
      setIsRenaming(false);
      setNewItemName('');
      setSelectedItem(prev => prev ? ({...prev, name: newItemName}) : null);
      loadItems();
  };

  const handleOpenMoveModal = () => {
      setShowMoveModal(true);
      setMoveTargetHistory([{id: null, name: 'Root'}]);
      loadMoveTargetItems(null);
  };

  const loadMoveTargetItems = async (folderId: string | null) => {
      const all = await fetchDriveItems(folderId);
      setMoveTargetItems(all.filter(i => i.type === 'folder' && i.id !== selectedItem?.id));
  };

  const navigateMoveTarget = (folderId: string | null, folderName: string) => {
      if (selectedItem?.type === 'folder' && folderId === selectedItem.id) return;
      const index = moveTargetHistory.findIndex(f => f.id === folderId);
      if (index !== -1) {
          setMoveTargetHistory(prev => prev.slice(0, index + 1));
      } else {
          setMoveTargetHistory(prev => [...prev, { id: folderId, name: folderName }]);
      }
      loadMoveTargetItems(folderId);
  };

  const executeMove = async () => {
      if (!selectedItem) return;
      const targetFolderId = moveTargetHistory[moveTargetHistory.length - 1].id;
      if (targetFolderId === selectedItem.id) {
          alert("Cannot move a folder into itself.");
          return;
      }
      await updateDriveItem(selectedItem.id, { parent_id: targetFolderId });
      setShowMoveModal(false);
      setSelectedItem(null);
      loadItems();
  };

  const handleEditContent = async (item: DriveItem) => {
      setIsLoading(true);
      const content = await fetchDriveItemContent(item.id);
      setIsLoading(false);
      if (content) {
          try {
              let decoded = "";
              if (content.startsWith("http")) {
                  const res = await fetch(content);
                  decoded = await res.text();
              } else if (content.includes("base64,")) {
                  const base64Part = content.split(',')[1];
                  decoded = b64_to_utf8(base64Part);
              } else {
                  decoded = content;
              }
              setEditorContent(decoded);
              setSelectedItem(item);
              setShowEditor(true);
          } catch (e) {
              console.error(e);
              alert("Cannot edit this file. Format corrupted or not text.");
          }
      } else {
          setEditorContent('');
          setSelectedItem(item);
          setShowEditor(true);
      }
  };

  const handleSaveEdit = async () => {
      if (!selectedItem) return;
      setIsSaving(true);
      try {
          const mime = selectedItem.mime_type || 'text/plain';
          const blob = new Blob([editorContent], { type: mime });
          
          let newContent = "";
          // If already on storage, re-upload to storage
          if (selectedItem.content?.startsWith('http')) {
              newContent = await uploadToSupabaseStorage(blob, selectedItem.name) || selectedItem.content;
          } else {
              const encoded = utf8_to_b64(editorContent);
              newContent = `data:${mime};base64,${encoded}`;
          }

          await updateDriveItem(selectedItem.id, { content: newContent, size: editorContent.length });
          setShowEditor(false);
          if (previewContent?.id === selectedItem.id) {
              setPreviewContent({...selectedItem, content: newContent});
              if (selectedItem.name.endsWith('.html')) {
                  const simulated = await injectVirtualResources(editorContent, selectedItem.parent_id);
                  setSimulatedHtml(simulated);
              }
          }
          refreshStorageStats();
      } catch (e) {
          alert("Failed to save content.");
      } finally {
          setIsSaving(false);
      }
  };

  const handleCopyCode = () => {
      navigator.clipboard.writeText(editorContent);
      alert("Code copied to clipboard!");
  };

  // --- PATH RESOLUTION SYSTEM ---
  // Resolves paths like "../css/style.css" or "assets/logo.png" against the VFS Tree
  const injectVirtualResources = async (htmlContent: string, startFolderId: string | null) => {
      const allItems = await fetchAllDriveItems(); 

      const resolveFileFromPath = (currentId: string | null, path: string): DriveItem | null => {
          const parts = path.split('/').filter(p => p !== '' && p !== '.');
          let pointerId = currentId;

          for (let i = 0; i < parts.length; i++) {
              const part = parts[i];
              const isLast = i === parts.length - 1;

              if (part === '..') {
                  if (pointerId === null) return null; 
                  const currentFolder = allItems.find(x => x.id === pointerId);
                  pointerId = currentFolder ? (currentFolder.parent_id || null) : null;
              } else {
                  const found = allItems.find(x => 
                      (pointerId === null ? !x.parent_id : x.parent_id === pointerId) && 
                      x.name === part
                  );
                  if (!found) return null; 
                  if (isLast) return found; 
                  else if (found.type === 'folder') pointerId = found.id; 
                  else return null; 
              }
          }
          return null;
      };

      let processed = htmlContent;
      const replacePaths = (content: string) => {
          return content.replace(/(src|href|poster|action|data|url)\s*=\s*["']([^"']+)["']|url\((['"]?)(.*?)\3\)/gi, (match, attr, val1, quote, val2) => {
              const url = val1 || val2;
              if (!url || url.startsWith('http') || url.startsWith('data:') || url.startsWith('#') || url.startsWith('mailto:')) return match;
              const resolvedItem = resolveFileFromPath(startFolderId, url);
              if (resolvedItem && resolvedItem.content) {
                  if (attr) return `${attr}="${resolvedItem.content}"`;
                  else return `url("${resolvedItem.content}")`;
              }
              return match;
          });
      };
      processed = replacePaths(processed);
      processed = processed.replace(/@import\s+["']([^"']+)["'];/g, (match, url) => {
          const resolvedItem = resolveFileFromPath(startFolderId, url);
          if (resolvedItem && resolvedItem.content) return `@import "${resolvedItem.content}";`;
          return match;
      });
      return processed;
  };

  const handlePreview = async (item: DriveItem) => {
      setIsPreviewLoading(true);
      const content = await fetchDriveItemContent(item.id);
      setIsPreviewLoading(false);
      if (content) {
          setPreviewContent({ ...item, content });
          if (item.name.endsWith('.html')) {
              try {
                  let decoded = "";
                  if (content.startsWith('http')) {
                      const res = await fetch(content);
                      decoded = await res.text();
                  } else {
                      decoded = b64_to_utf8(content.split(',')[1] || '');
                  }
                  setSimulatedHtml(null); 
                  injectVirtualResources(decoded, item.parent_id).then(res => {
                      setSimulatedHtml(res);
                  });
                  setPreviewMode('render');
              } catch(e) {
                  setSimulatedHtml("<h1>Error decoding HTML</h1>");
              }
          } else {
              setSimulatedHtml(null);
          }
      } else {
          alert("Could not load file content.");
      }
  };

  const handleFullWebPreview = async () => {
      if (!simulatedHtml) return;
      const blob = new Blob([simulatedHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
  };

  const handleDownload = async (item: DriveItem) => {
      let content = item.content;
      if (!content) {
          content = await fetchDriveItemContent(item.id) || undefined;
      }
      if (content) {
          const a = document.createElement('a');
          a.href = content;
          a.download = item.name;
          a.click();
      } else {
          alert("File content unavailable.");
      }
  };

  // --- COPY PATH LOGIC & MODAL ---
  const handleCopyPath = (item: DriveItem) => {
      setItemToCopy(item);
  };

  const performCopy = (path: string) => {
      navigator.clipboard.writeText(path);
      alert(`Copied: ${path}`);
      setItemToCopy(null);
  };

  const getIcon = (type: FileType) => {
      switch (type) {
          case 'folder': return <Folder className="w-10 h-10 text-amber-500 fill-amber-500/20" />;
          case 'image': return <Image className="w-10 h-10 text-purple-400" />;
          case 'code': return <Code className="w-10 h-10 text-blue-400" />;
          case 'audio': return <Music className="w-10 h-10 text-green-400" />;
          case 'video': return <Film className="w-10 h-10 text-red-400" />;
          default: return <FileText className="w-10 h-10 text-gray-400" />;
      }
  };

  const formatSize = (bytes: number) => {
      if (bytes === 0) return '0 B';
      const k = 1024;
      const sizes = ['B', 'KB', 'MB', 'GB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="h-full flex flex-col p-6 lg:p-10 relative overflow-hidden select-none">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
                <h1 className="text-3xl font-bold genshin-gold flex items-center gap-3">
                    <HardDrive className="w-8 h-8" />
                    Archive Storage
                </h1>
                <div className="flex items-center gap-4 mt-2">
                    <p className="text-gray-400 text-sm">Secure Vault for Neural Patterns and Data Fragments.</p>
                    <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-black/40 rounded-full border border-white/10 text-[9px] uppercase font-bold tracking-widest text-gray-400">
                        <Database className={`w-3 h-3 ${totalUsage > STORAGE_LIMIT * 0.9 ? 'text-red-500' : 'text-blue-400'}`} />
                        <span>Usage: {formatSize(totalUsage)} / 5.0 GB</span>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
                <button onClick={() => setShowNewFolderInput(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2 text-sm font-bold transition-all text-gray-300">
                    <FolderPlus className="w-4 h-4 text-amber-500" /> <span>Folder</span>
                </button>
                <button onClick={() => setShowNewFileInput(true)} className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center gap-2 text-sm font-bold transition-all text-gray-300">
                    <FilePlus className="w-4 h-4 text-green-400" /> <span>File</span>
                </button>
                <button onClick={() => folderInputRef.current?.click()} className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 flex items-center gap-2 text-sm font-bold transition-all">
                    <Upload className="w-4 h-4" /> <span>Up Folder</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-xl genshin-button text-white flex items-center gap-2 text-sm font-bold shadow-lg transition-all">
                    <Upload className="w-4 h-4" /> <span>Up Files</span>
                </button>
                <input type="file" ref={fileInputRef} className="hidden" multiple onChange={handleFileUpload} />
                <input 
                    type="file" 
                    ref={folderInputRef} 
                    className="hidden" 
                    onChange={handleFolderUpload} 
                    {...({webkitdirectory: "", directory: ""} as any)} 
                />
            </div>
        </div>

        {/* Breadcrumbs & View Toggle */}
        <div className="flex items-center justify-between mb-6 bg-black/40 p-3 rounded-2xl border border-white/10">
            <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar">
                {folderHistory.map((folder, index) => (
                    <div key={folder.id || 'root'} className="flex items-center">
                        {index > 0 && <ChevronRight className="w-4 h-4 text-gray-600 mx-1" />}
                        <button 
                            onClick={() => handleNavigate(folder.id, folder.name)}
                            className={`flex items-center gap-2 px-2 py-1 rounded-lg text-sm font-medium hover:bg-white/10 transition-colors ${index === folderHistory.length - 1 ? 'text-amber-500' : 'text-gray-400'}`}
                        >
                            {folder.id === null && <Home className="w-3 h-3" />}
                            {folder.name}
                        </button>
                    </div>
                ))}
            </div>
            <div className="flex gap-1 bg-white/5 p-1 rounded-lg">
                <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded ${viewMode === 'grid' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}><Grid className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('list')} className={`p-1.5 rounded ${viewMode === 'list' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}><List className="w-4 h-4" /></button>
            </div>
        </div>

        {(showNewFolderInput || showNewFileInput) && (
            <div className="mb-6 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 bg-black/40 p-4 rounded-xl border border-amber-500/50">
                {showNewFolderInput ? <Folder className="w-6 h-6 text-amber-500" /> : <File className="w-6 h-6 text-green-400" />}
                <input autoFocus type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { showNewFolderInput ? handleCreateFolder() : handleCreateFile(); } }} placeholder={showNewFolderInput ? "Folder Name..." : "File Name (e.g., notes.txt)"} className="bg-transparent border-b border-amber-500 px-2 py-1 text-white outline-none w-64 text-sm select-text" />
                <div className="flex gap-2 ml-4">
                    <button onClick={showNewFolderInput ? handleCreateFolder : handleCreateFile} className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-xs font-bold hover:bg-green-500/30">Create</button>
                    <button onClick={() => { setShowNewFolderInput(false); setShowNewFileInput(false); }} className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">Cancel</button>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar relative min-h-[300px]">
            {isLoading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm z-10">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-2" />
                    <p className="text-amber-500 font-bold text-xs tracking-widest uppercase">Processing Files...</p>
                </div>
            ) : items.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center opacity-30 pointer-events-none">
                    <HardDrive className="w-24 h-24 text-gray-500 mb-4" />
                    <p className="text-xl font-bold">Storage Empty</p>
                    <p className="text-sm">Drag & Drop files or create a folder to begin.</p>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {items.map(item => (
                        <div key={item.id} onClick={() => item.type === 'folder' ? handleNavigate(item.id, item.name) : setSelectedItem(item)} className="genshin-panel p-4 rounded-xl border border-white/5 hover:border-amber-500/50 hover:bg-white/5 transition-all cursor-pointer group flex flex-col items-center text-center relative">
                            <div className="mb-3 transform group-hover:scale-110 transition-transform">{getIcon(item.type)}</div>
                            <div className="w-full">
                                <p className="text-xs font-bold text-gray-200 truncate w-full mb-1">{item.name}</p>
                                <p className="text-[10px] text-gray-500 uppercase">{item.type === 'folder' ? 'DIR' : formatSize(item.size)}</p>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }} className="absolute top-2 right-2 p-1 text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full"><MoreVertical className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-1">
                    {items.map(item => (
                        <div key={item.id} onClick={() => item.type === 'folder' ? handleNavigate(item.id, item.name) : setSelectedItem(item)} className="flex items-center gap-4 p-3 rounded-xl border border-white/5 hover:border-amber-500/30 hover:bg-white/5 transition-all cursor-pointer group">
                             <div className="shrink-0">{getIcon(item.type)}</div>
                             <div className="flex-1 min-w-0"><p className="text-sm font-bold text-gray-200 truncate">{item.name}</p></div>
                             <div className="text-xs text-gray-500 w-24 text-right">{item.type === 'folder' ? '-' : formatSize(item.size)}</div>
                             <div className="text-xs text-gray-500 w-32 text-right hidden md:block">{new Date(item.created_at).toLocaleDateString()}</div>
                             <button onClick={(e) => { e.stopPropagation(); handleDelete(item); }} className="p-2 text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4" /></button>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* UPLOAD STATUS OVERLAY */}
        {uploadStatus.processing && (
            <div className="fixed bottom-6 right-6 z-[200] w-80 bg-[#13182b]/95 backdrop-blur-xl border border-[#d3bc8e]/30 rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.6)] p-4 animate-in slide-in-from-bottom-6">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <CloudLightning className="w-4 h-4 text-amber-500 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[#d3bc8e]">Uploading Assets</span>
                    </div>
                    <span className="text-xs font-mono text-gray-400">{Math.round((uploadStatus.current / uploadStatus.total) * 100)}%</span>
                </div>
                <div className="w-full h-1 bg-black/50 rounded-full mb-3 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-300" style={{ width: `${(uploadStatus.current / uploadStatus.total) * 100}%` }}></div>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 truncate max-w-[180px]">{uploadStatus.filename}</span>
                    <span className="text-[9px] font-bold text-gray-500">{uploadStatus.current}/{uploadStatus.total}</span>
                </div>
            </div>
        )}

        {/* COPY PATH MODAL */}
        {itemToCopy && (
            <div className="fixed inset-0 z-[200] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in zoom-in-95 duration-200">
                <div className="w-full max-w-sm bg-[#13182b] border-2 border-amber-500/40 rounded-[2rem] overflow-hidden shadow-[0_0_60px_rgba(211,188,142,0.2)]">
                    <div className="p-6 border-b border-white/5 bg-gradient-to-r from-amber-500/10 to-transparent">
                        <h3 className="text-lg font-black genshin-gold uppercase tracking-[0.2em] font-serif flex items-center gap-2">
                            <Copy className="w-5 h-5" /> Copy Protocol
                        </h3>
                        <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">Select Path Format for Artifact</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {/* Option 1: VFS Path */}
                        <button 
                            onClick={() => {
                                const path = folderHistory.slice(1).map(f => f.name).join('/');
                                const fullPath = `vfs://root/${path ? path + '/' : ''}${itemToCopy.name}`;
                                performCopy(fullPath);
                            }}
                            className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 rounded-full bg-blue-500/10 border border-blue-500/20 group-hover:bg-amber-500/20 group-hover:border-amber-500/40 transition-colors">
                                    <Database className="w-5 h-5 text-blue-400 group-hover:text-amber-400" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest group-hover:text-amber-400">System Virtual Path</h4>
                                    <p className="text-[9px] text-gray-500 mt-1 font-mono">vfs://root/...</p>
                                </div>
                            </div>
                        </button>

                        {/* Option 2: Relative Code Path */}
                        <button 
                            onClick={() => {
                                const path = folderHistory.slice(1).map(f => f.name).join('/');
                                const relativePath = `./${path ? path + '/' : ''}${itemToCopy.name}`;
                                performCopy(relativePath);
                            }}
                            className="w-full p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-green-500/10 hover:border-green-500/50 transition-all group text-left relative overflow-hidden"
                        >
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="p-3 rounded-full bg-green-500/10 border border-green-500/20 group-hover:bg-green-500/20 group-hover:border-green-500/40 transition-colors">
                                    <Code className="w-5 h-5 text-green-400 group-hover:text-green-300" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-black text-white uppercase tracking-widest group-hover:text-green-400">Relative Code Path</h4>
                                    <p className="text-[9px] text-gray-500 mt-1 font-mono">./Folder/File.ext</p>
                                </div>
                            </div>
                        </button>
                    </div>
                    <div className="p-4 bg-black/40 border-t border-white/5 flex justify-center">
                        <button onClick={() => setItemToCopy(null)} className="text-xs text-gray-500 hover:text-red-400 font-bold uppercase tracking-widest transition-colors flex items-center gap-2">
                            <X className="w-3 h-3" /> Cancel Selection
                        </button>
                    </div>
                </div>
            </div>
        )}

        {selectedItem && !showEditor && !showMoveModal && (
             <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
                 <div className="genshin-panel w-full max-w-md p-6 rounded-3xl border border-amber-500/30 relative shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                     <button onClick={() => setSelectedItem(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X className="w-5 h-5" /></button>
                     <div className="flex items-center gap-4 mb-6">
                        <div className="p-4 bg-white/5 rounded-2xl border border-white/10">{getIcon(selectedItem.type)}</div>
                        <div className="flex-1 min-w-0">
                            {isRenaming ? (
                                <div className="flex items-center gap-2">
                                    <input type="text" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} className="bg-black/50 border border-amber-500 rounded px-2 py-1 text-white w-full select-text" autoFocus />
                                    <button onClick={handleRename} className="text-green-400 hover:text-white"><Check className="w-4 h-4"/></button>
                                    <button onClick={() => setIsRenaming(false)} className="text-red-400 hover:text-white"><X className="w-4 h-4"/></button>
                                </div>
                            ) : (
                                <h3 className="text-lg font-bold text-white break-all line-clamp-2" onClick={() => { setIsRenaming(true); setNewItemName(selectedItem.name); }}>{selectedItem.name} <Edit className="w-3 h-3 inline text-gray-500 ml-1 hover:text-amber-500 cursor-pointer"/></h3>
                            )}
                            <p className="text-xs text-gray-500 uppercase mt-1">{selectedItem.type} • {formatSize(selectedItem.size)}</p>
                        </div>
                     </div>
                     <div className="grid grid-cols-2 gap-3 mb-6">
                         {selectedItem.type !== 'folder' && (
                             <button onClick={() => handlePreview(selectedItem)} disabled={isPreviewLoading} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold disabled:opacity-50">
                                 {isPreviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
                             </button>
                         )}
                         {['text', 'code'].includes(selectedItem.type) && (
                             <button onClick={() => handleEditContent(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold">
                                 <Edit className="w-4 h-4" /> Edit Content
                             </button>
                         )}
                         <button onClick={handleOpenMoveModal} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold"><CornerUpLeft className="w-4 h-4" /> Move</button>
                         <button onClick={() => handleDownload(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold"><Download className="w-4 h-4" /> Download</button>
                         <button onClick={() => handleCopyPath(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-sm font-bold"><Link className="w-4 h-4" /> Copy Path</button>
                         <button onClick={() => handleDelete(selectedItem)} className="flex items-center justify-center gap-2 p-3 bg-red-500/10 hover:bg-red-500/20 rounded-xl border border-red-500/30 text-red-400 text-sm font-bold"><Trash2 className="w-4 h-4" /> Delete</button>
                     </div>
                 </div>
             </div>
        )}

        {/* EDITOR MODAL */}
        {showEditor && selectedItem && (
            <div className="fixed inset-0 z-[120] bg-[#0b0e14] flex flex-col animate-in slide-in-from-bottom-10 select-text">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 md:p-4 border-b border-white/10 bg-[#131823] shrink-0 safe-area-top select-none gap-3 z-50 relative shadow-md">
                    <div className="flex items-center gap-3 overflow-hidden w-full md:w-auto">
                        <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                        <div className="flex flex-col min-w-0 flex-1">
                            <span className="font-bold text-white text-sm truncate">{selectedItem.name}</span>
                            <span className="text-[10px] text-gray-500 italic hidden md:block">Editing</span>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 shrink-0 w-full md:w-auto justify-end">
                        <button onClick={handleCopyCode} className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm hover:bg-white/10 flex items-center gap-2 text-gray-300 whitespace-nowrap"><Copy className="w-4 h-4" /> <span className="hidden md:inline">Copy</span></button>
                        <button onClick={handleSaveEdit} disabled={isSaving} className="px-4 py-2 bg-amber-500 text-black rounded-lg text-sm font-bold hover:bg-amber-400 flex items-center gap-2 shadow-lg transition-all whitespace-nowrap">{isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} <span>Save</span></button>
                        <button onClick={() => setShowEditor(false)} className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm font-bold hover:bg-red-500/20 flex items-center gap-2 transition-all whitespace-nowrap"><X className="w-4 h-4" /> <span className="hidden md:inline">Close</span></button>
                    </div>
                </div>
                <div className="flex-1 relative w-full h-full select-text">
                    <textarea 
                        value={editorContent}
                        onChange={(e) => setEditorContent(e.target.value)}
                        className="w-full h-full bg-[#0b0e14] text-green-400 font-mono p-4 outline-none resize-none custom-scrollbar leading-relaxed select-text pb-20 md:pb-4"
                        spellCheck={false}
                        autoCorrect="off"
                        autoCapitalize="off"
                        onContextMenu={(e) => e.stopPropagation()} 
                    />
                </div>
            </div>
        )}

        {/* PREVIEW MODAL - UPDATED LAYOUT */}
        {previewContent && (
             <div className="fixed inset-0 z-[150] bg-black/95 flex flex-col animate-in zoom-in-95 duration-200 select-text">
                 {/* Header controls separated securely with higher z-index */}
                 <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 bg-[#131823] border-b border-white/10 shrink-0 select-none gap-4 z-50 relative shadow-lg">
                     <span className="font-bold text-white truncate w-full md:w-auto md:max-w-md text-sm md:text-base pr-4">{previewContent.name}</span>
                     <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
                         {previewContent.name.endsWith('.html') && (
                             <>
                                 <div className="flex bg-black/50 rounded-full border border-white/10 p-1 shrink-0">
                                     <button onClick={() => setPreviewMode('render')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold uppercase transition-colors ${previewMode === 'render' ? 'bg-amber-500 text-black' : 'text-gray-400 hover:text-white'}`}><Play className="w-3 h-3 inline md:mr-1" /> <span className="hidden md:inline">Live</span></button>
                                     <button onClick={() => setPreviewMode('code')} className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-xs font-bold uppercase transition-colors ${previewMode === 'code' ? 'bg-blue-500 text-black' : 'text-gray-400 hover:text-white'}`}><Code className="w-3 h-3 inline md:mr-1" /> <span className="hidden md:inline">Code</span></button>
                                 </div>
                                 <button onClick={handleFullWebPreview} className="p-2 md:p-3 bg-green-500 text-black rounded-full hover:bg-green-400 shadow-lg font-bold flex items-center justify-center shrink-0" title="Open Full Site"><ExternalLink className="w-4 h-4 md:w-5 md:h-5" /></button>
                             </>
                         )}
                         <button onClick={() => { setPreviewContent(null); setSimulatedHtml(null); }} className="flex items-center gap-2 px-4 py-2 bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 rounded-full transition-colors font-bold shrink-0"><X className="w-4 h-4" /> <span className="hidden md:inline">Close</span></button>
                     </div>
                 </div>
                 
                 {/* Iframe / Content Container - Flex-1 ensures it fills space but respects header */}
                 <div className="flex-1 w-full relative overflow-hidden bg-[#1e1e1e] select-text z-0">
                    {previewContent.type === 'image' ? (
                        <div className="w-full h-full flex items-center justify-center p-4">
                            <img src={previewContent.content} className="max-w-full max-h-full rounded-lg shadow-2xl object-contain" />
                        </div>
                    ) : previewContent.name.endsWith('.html') && previewMode === 'render' ? (
                        simulatedHtml ? (
                            <iframe srcDoc={simulatedHtml} className="w-full h-full bg-white border-0 block" title="Live Preview" sandbox="allow-scripts allow-modals allow-forms allow-popups" />
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full gap-2"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /><span className="text-xs text-gray-400">Compiling Assets...</span></div>
                        )
                    ) : (
                        <pre onContextMenu={(e) => e.stopPropagation()} className="bg-[#1e1e1e] p-6 text-gray-300 font-mono text-sm overflow-auto w-full h-full border-0 whitespace-pre-wrap select-text cursor-text pb-20">
                            {(() => { 
                                try { 
                                    if (!previewContent.content) return "No content.";
                                    if (previewContent.content.startsWith('http')) return "Direct external link: " + previewContent.content;
                                    return b64_to_utf8(previewContent.content?.split(',')[1] || ''); 
                                } catch (e) { 
                                    return "Preview unavailable (Binary Data)"; 
                                } 
                            })()}
                        </pre>
                    )}
                 </div>
             </div>
        )}
    </div>
  );
};

export default Drive;
