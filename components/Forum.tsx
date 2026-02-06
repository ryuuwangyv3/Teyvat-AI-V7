
import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageCircle, Heart, Share2, Filter, Plus, Flame, Sparkles, BookOpen, Send, X, Loader2, ThumbsDown, Edit2, Trash2, Star, Image as ImageIcon, Maximize2, Check, CornerDownRight, MoreVertical } from 'lucide-react';
import LazyImage from './LazyImage';
import { 
    fetchForumPosts, createForumPost, updateForumPost, deleteForumPost, 
    updatePostCounters, subscribeToTable, fetchComments, postComment, updateForumComment, deleteForumComment 
} from '../services/supabaseService';
import { ForumPost, ForumComment, UserProfile } from '../types';

interface ForumProps {
    userProfile: UserProfile;
}

const Forum: React.FC<ForumProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewPost, setShowNewPost] = useState(false);
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Voting State (Local Persistence)
  const [userVotes, setUserVotes] = useState<Record<string, 'like' | 'dislike'>>({});

  // Comments State
  const [expandedPostId, setExpandedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<ForumComment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentText, setEditCommentText] = useState('');

  // Form State (Create & Edit)
  const [isEditing, setIsEditing] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formTag, setFormTag] = useState('General');
  const [formMedia, setFormMedia] = useState<string | null>(null);
  const [formRating, setFormRating] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const tags = ['General', 'Lore', 'AI Models', 'Art Showcase', 'Bugs', 'Teyvat News'];

  useEffect(() => {
      // Load local votes
      const storedVotes = localStorage.getItem('forum_votes');
      if (storedVotes) {
          setUserVotes(JSON.parse(storedVotes));
      }
  }, []);

  // Persist votes whenever they change
  useEffect(() => {
      localStorage.setItem('forum_votes', JSON.stringify(userVotes));
  }, [userVotes]);

  const loadPosts = async () => {
    setLoading(true);
    const data = await fetchForumPosts(activeTab === 'trending' ? 'trending' : 'latest');
    setPosts(data);
    setLoading(false);
  };

  // --- REAL-TIME POST UPDATES ---
  useEffect(() => {
    loadPosts();

    const channel = subscribeToTable('forum_posts', (payload) => {
        if (payload.eventType === 'INSERT') {
            // Only prepend if we are on 'Latest' to avoid disrupting 'Trending' order
            if (activeTab === 'latest') {
                setPosts(prev => [payload.new, ...prev]);
            } else {
                // For trending, re-fetch properly to maintain order
                loadPosts();
            }
        } else if (payload.eventType === 'UPDATE') {
            setPosts(prev => prev.map(p => p.id === payload.new.id ? payload.new : p));
        } else if (payload.eventType === 'DELETE') {
            setPosts(prev => prev.filter(p => p.id !== payload.old.id));
        }
    });

    return () => { if (channel) channel.unsubscribe(); };
  }, [activeTab]);

  // --- REAL-TIME COMMENTS ---
  useEffect(() => {
      const channel = subscribeToTable('forum_comments', (payload) => {
          // If we are viewing the post that got a new comment
          if (expandedPostId && payload.new && payload.new.post_id === expandedPostId) {
              if (payload.eventType === 'INSERT') {
                  setComments(prev => {
                      // Avoid duplicates if we inserted it optimistically
                      if (prev.find(c => c.id === payload.new.id)) return prev;
                      return [...prev, payload.new];
                  });
              } else if (payload.eventType === 'UPDATE') {
                  setComments(prev => prev.map(c => c.id === payload.new.id ? payload.new : c));
              } else if (payload.eventType === 'DELETE') {
                  setComments(prev => prev.filter(c => c.id !== payload.old.id));
              }
          }
      });
      return () => { if (channel) channel.unsubscribe(); };
  }, [expandedPostId]);

  // --- VOTE LOGIC ---
  const handleVote = async (postId: string, type: 'like' | 'dislike') => {
      const currentVote = userVotes[postId];
      const postIndex = posts.findIndex(p => p.id === postId);
      if (postIndex === -1) return;

      const post = posts[postIndex];
      let newLikes = post.likes || 0;
      let newDislikes = post.dislikes || 0;
      let newVoteState = { ...userVotes };

      // Optimistic UI Update Logic
      if (currentVote === type) {
          // Toggle OFF (Remove vote)
          if (type === 'like') newLikes = Math.max(0, newLikes - 1);
          else newDislikes = Math.max(0, newDislikes - 1);
          delete newVoteState[postId];
      } else {
          // New Vote or Switch Vote
          if (type === 'like') {
              newLikes++;
              if (currentVote === 'dislike') newDislikes = Math.max(0, newDislikes - 1);
          } else {
              newDislikes++;
              if (currentVote === 'like') newLikes = Math.max(0, newLikes - 1);
          }
          newVoteState[postId] = type;
      }

      // Apply Local State
      setUserVotes(newVoteState);
      setPosts(prev => {
          const updated = [...prev];
          updated[postIndex] = { ...post, likes: newLikes, dislikes: newDislikes };
          return updated;
      });

      // Send to Backend
      await updatePostCounters(postId, { likes: newLikes, dislikes: newDislikes });
  };

  // --- POST EDIT/DELETE ---
  const isOwner = (post: ForumPost) => {
      // Check ID match if available, otherwise check username (legacy/guest support)
      if (userProfile.id && post.author_id && userProfile.id === post.author_id) return true;
      if (post.author === userProfile.username) return true;
      return false;
  };

  const handleDeletePost = async (post: ForumPost) => {
      if (window.confirm("Are you sure you want to delete this transmission permanently?")) {
          // Optimistic remove
          setPosts(prev => prev.filter(p => p.id !== post.id));
          await deleteForumPost(post.id);
      }
  };

  const handleEditStart = (post: ForumPost) => {
      setIsEditing(post.id);
      setFormTitle(post.title);
      setFormContent(post.content);
      setFormTag(post.tag);
      setFormMedia(post.media_url || null);
      setFormRating(post.rating || 0);
      setShowNewPost(true);
  };

  // --- COMMENTS ---
  const toggleComments = async (postId: string) => {
      if (expandedPostId === postId) {
          setExpandedPostId(null);
          setComments([]);
      } else {
          setExpandedPostId(postId);
          setLoadingComments(true);
          const data = await fetchComments(postId);
          setComments(data);
          setLoadingComments(false);
      }
  };

  const handleSubmitComment = async (postId: string) => {
      if (!newComment.trim()) return;
      
      const authorName = userProfile.username || 'Traveler';
      const authorAvatar = userProfile.avatar || 'https://picsum.photos/seed/traveler/100';

      // Optimistic Insert
      const tempId = `temp_${Date.now()}`;
      const tempComment: ForumComment = {
          id: tempId,
          post_id: postId,
          author: authorName,
          avatar: authorAvatar,
          content: newComment,
          created_at: new Date().toISOString()
      };
      setComments(prev => [...prev, tempComment]);
      setNewComment('');

      const success = await postComment({
          post_id: postId,
          author: authorName,
          avatar: authorAvatar,
          content: tempComment.content
      });

      if (!success) {
          // Revert if failed
          setComments(prev => prev.filter(c => c.id !== tempId));
          alert("Failed to transmit comment.");
      }
  };

  // --- COMMENT ACTIONS ---
  const isCommentOwner = (comment: ForumComment) => {
      // Simple check by name/avatar since comments might not have author_id in this schema version
      return comment.author === userProfile.username;
  };

  const startEditComment = (comment: ForumComment) => {
      setEditingCommentId(comment.id);
      setEditCommentText(comment.content);
  };

  const saveEditedComment = async (commentId: string) => {
      if (!editCommentText.trim()) return;
      
      // Optimistic Update
      setComments(prev => prev.map(c => c.id === commentId ? { ...c, content: editCommentText } : c));
      setEditingCommentId(null);
      
      await updateForumComment(commentId, editCommentText);
  };

  const deleteComment = async (commentId: string) => {
      if (!confirm("Remove this comment?")) return;
      
      // Optimistic Remove
      setComments(prev => prev.filter(c => c.id !== commentId));
      await deleteForumComment(commentId);
  };

  // --- FORM HANDLING ---
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (file.size > 3 * 1024 * 1024) { // 3MB Limit
              alert("File too large. Max 3MB for Forum uploads.");
              return;
          }
          const reader = new FileReader();
          reader.onload = (ev) => {
              if (ev.target?.result) setFormMedia(ev.target.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setSubmitting(true);
      
      const authorName = userProfile.username || 'Traveler';
      const authorAvatar = userProfile.avatar || 'https://picsum.photos/seed/traveler/100';

      let success = false;

      if (isEditing) {
          success = await updateForumPost(isEditing, {
              title: formTitle,
              content: formContent,
              tag: formTag,
              media_url: formMedia || undefined,
              rating: formRating
          });
      } else {
          success = await createForumPost({
              author: authorName,
              avatar: authorAvatar,
              title: formTitle,
              content: formContent,
              tag: formTag,
              media_url: formMedia || undefined,
              rating: formRating,
              likes: 0,
              dislikes: 0
          });
      }

      if (success) {
          setShowNewPost(false);
          resetForm();
      } else {
          // If guest, maybe restricted by RLS
          if (!userProfile.isAuth) {
              alert("Transmission failed. Guest access may be restricted by the current Ley Line protocol. Try logging in.");
          } else {
              alert("Connection to Ley Lines failed. Please try again.");
          }
      }
      setSubmitting(false);
  };

  const resetForm = () => {
      setIsEditing(null);
      setFormTitle('');
      setFormContent('');
      setFormTag('General');
      setFormMedia(null);
      setFormRating(0);
  };

  const handleShare = async (post: ForumPost) => {
      const text = `${post.title} - Read on Teyvat AI Terminal`;
      
      let url = "https://teyvat-ai.vercel.app";
      try {
          if (window.location && window.location.href) {
              url = window.location.href;
          }
      } catch (e) {}

      if (navigator.share) {
        try {
            await navigator.share({ title: post.title, text: text, url: url });
        } catch (err) {
            navigator.clipboard.writeText(`${text}\n${url}`);
            alert("Link copied!");
        }
      } else {
        navigator.clipboard.writeText(`${text}\n${url}`);
        alert("Link copied!");
      }
  };

  const filteredPosts = posts.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.content.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="h-full flex flex-col lg:flex-row overflow-hidden relative">
      
      {/* Lightbox */}
      {lightboxImage && (
          <div className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center p-4" onClick={() => setLightboxImage(null)}>
              <button className="absolute top-4 right-4 text-white p-2 bg-white/10 rounded-full"><X /></button>
              <img src={lightboxImage} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />
          </div>
      )}

      {/* Create/Edit Modal */}
      {showNewPost && (
          <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
              <div className="genshin-panel w-full max-w-2xl p-6 rounded-3xl border border-amber-500/30 max-h-[90vh] overflow-y-auto custom-scrollbar flex flex-col shadow-2xl">
                  <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                      <h3 className="text-xl font-bold genshin-gold uppercase tracking-widest flex items-center gap-2">
                          <Edit2 className="w-5 h-5" /> {isEditing ? 'Edit Transmission' : 'New Transmission'}
                      </h3>
                      <button onClick={() => {setShowNewPost(false); resetForm();}} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="text-gray-500 hover:text-white" /></button>
                  </div>
                  <form onSubmit={handleFormSubmit} className="space-y-4 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Title</label>
                              <input 
                                type="text" 
                                value={formTitle}
                                onChange={e => setFormTitle(e.target.value)}
                                placeholder="Topic Title..." 
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none transition-colors" 
                                required 
                              />
                          </div>
                          <div className="space-y-1">
                              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Realm Tag</label>
                              <select 
                                value={formTag}
                                onChange={e => setFormTag(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-gray-300 focus:border-amber-500 outline-none transition-colors"
                              >
                                 {tags.map(t => <option key={t} value={t}>{t}</option>)}
                              </select>
                          </div>
                      </div>

                      {/* Rating Input */}
                      <div className="flex items-center gap-3 bg-black/20 p-3 rounded-xl border border-white/5">
                          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Rate Experience:</span>
                          <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                  <button type="button" key={star} onClick={() => setFormRating(star)} className="hover:scale-110 transition-transform">
                                      <Star className={`w-5 h-5 ${star <= formRating ? 'text-yellow-400 fill-current' : 'text-gray-600'}`} />
                                  </button>
                              ))}
                          </div>
                      </div>

                      {/* Media Input */}
                      <div className="w-full h-32 border-2 border-dashed border-white/10 rounded-xl flex items-center justify-center hover:bg-white/5 cursor-pointer relative overflow-hidden group transition-colors">
                          {formMedia ? (
                              <>
                                <img src={formMedia} className="w-full h-full object-cover opacity-60" />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-bold text-white uppercase tracking-widest flex items-center gap-2"><Edit2 className="w-4 h-4"/> Click to Change</span>
                                </div>
                              </>
                          ) : (
                              <div className="text-center text-gray-500 group-hover:text-gray-300 transition-colors">
                                  <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                                  <span className="text-[10px] font-bold uppercase tracking-widest">Upload Visual (Max 3MB)</span>
                              </div>
                          )}
                          <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                      </div>
                      
                      <div className="space-y-1">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Content</label>
                          <textarea 
                            value={formContent}
                            onChange={e => setFormContent(e.target.value)}
                            placeholder="What's happening in Teyvat?" 
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-amber-500 outline-none resize-none custom-scrollbar leading-relaxed" 
                            required 
                          />
                      </div>

                      <button 
                        type="submit" 
                        disabled={submitting}
                        className="w-full genshin-button py-3 rounded-xl font-bold text-white shadow-lg flex items-center justify-center gap-2 mt-2"
                      >
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {isEditing ? 'Update Archive' : 'Broadcast to Akasha'}
                      </button>
                  </form>
              </div>
          </div>
      )}

      {/* Sidebar / Filters */}
      <div className="w-full lg:w-72 bg-[#0b0e14]/50 border-r border-white/10 flex flex-col p-6 shrink-0">
        <h2 className="text-xl font-bold genshin-gold mb-6 uppercase tracking-widest flex items-center gap-2">
           <BookOpen className="w-5 h-5" /> Akasha Board
        </h2>
        
        <button onClick={() => {resetForm(); setShowNewPost(true);}} className="genshin-button w-full py-3 rounded-xl flex items-center justify-center gap-2 font-bold text-white shadow-lg mb-8 hover:scale-105 transition-transform group">
           <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
           <span>New Discussion</span>
        </button>

        <div className="space-y-1">
           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 px-2">Feeds</p>
           {['Latest', 'Trending'].map((feed) => (
             <button 
               key={feed}
               onClick={() => setActiveTab(feed.toLowerCase())}
               className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-all ${
                 activeTab === feed.toLowerCase() ? 'bg-white/10 text-amber-400 font-bold' : 'text-gray-400 hover:bg-white/5 hover:text-white'
               }`}
             >
                {feed === 'Trending' ? <Flame className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                <span>{feed}</span>
             </button>
           ))}
        </div>

        <div className="mt-8">
           <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 px-2">Realms (Tags)</p>
           <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                 <span key={tag} className="px-3 py-1 rounded-full border border-white/10 bg-black/20 text-xs text-gray-400 hover:border-amber-500 hover:text-amber-500 cursor-pointer transition-colors">
                    #{tag}
                 </span>
              ))}
           </div>
        </div>
      </div>

      {/* Main Feed */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 lg:p-10 bg-[#0b0e14] relative">
         <div className="max-w-4xl mx-auto">
            {/* Search Bar */}
            <div className="relative mb-8">
               <input 
                 type="text" 
                 value={searchQuery}
                 onChange={(e) => setSearchQuery(e.target.value)}
                 placeholder="Search the Akasha database..." 
                 className="w-full bg-[#1a1f2e] border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-amber-500 transition-colors shadow-inner"
               />
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5" />
            </div>

            {/* Posts List */}
            <div className="space-y-6 pb-20">
               {loading ? (
                   <div className="text-center py-20">
                       <Loader2 className="w-10 h-10 text-amber-500 animate-spin mx-auto mb-4" />
                       <p className="text-gray-500">Connecting to Ley Lines...</p>
                   </div>
               ) : (
                   filteredPosts.map((post) => (
                      <div key={post.id} className="genshin-panel p-6 rounded-3xl border border-white/10 hover:border-amber-500/30 transition-all group animate-in fade-in slide-in-from-bottom-2 relative overflow-hidden bg-gradient-to-br from-[#1a1f2e] to-[#0b0e14]">
                         
                         {/* Edit/Delete Controls for Author */}
                         {isOwner(post) && (
                             <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                 <button onClick={(e) => {e.stopPropagation(); handleEditStart(post)}} className="p-2 bg-black/50 hover:bg-amber-500 hover:text-black rounded-full transition-colors text-gray-400 border border-white/10" title="Edit Post">
                                     <Edit2 className="w-4 h-4" />
                                 </button>
                                 <button onClick={(e) => {e.stopPropagation(); handleDeletePost(post)}} className="p-2 bg-black/50 hover:bg-red-500 hover:text-white rounded-full transition-colors text-gray-400 border border-white/10" title="Delete Post">
                                     <Trash2 className="w-4 h-4" />
                                 </button>
                             </div>
                         )}

                         {/* Header */}
                         <div className="flex items-center gap-3 mb-4">
                            <LazyImage src={post.avatar || 'https://picsum.photos/seed/unknown/100'} className="w-10 h-10 rounded-full border border-white/10" alt={post.author} />
                            <div>
                               <div className="flex items-center gap-2">
                                  <span className="font-bold text-gray-200 text-sm hover:text-amber-400 transition-colors cursor-pointer">{post.author}</span>
                                  {post.rating ? (
                                      <div className="flex items-center gap-0.5 text-yellow-400 text-[10px] border border-yellow-500/30 px-1.5 rounded bg-yellow-500/10">
                                          <span className="font-bold">{post.rating}</span> <Star className="w-3 h-3 fill-current" />
                                      </div>
                                  ) : null}
                               </div>
                               <div className="flex items-center gap-2 text-[10px] text-gray-500 uppercase tracking-wide font-medium">
                                  <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span className="text-amber-500/80">#{post.tag}</span>
                               </div>
                            </div>
                         </div>

                         {/* Content */}
                         <h3 className="text-lg font-bold text-[#ece5d8] mb-2 leading-relaxed group-hover:text-amber-400 transition-colors font-serif">{post.title}</h3>
                         <p className="text-gray-400 text-sm leading-relaxed mb-4 whitespace-pre-line">{post.content}</p>

                         {/* Media Display */}
                         {post.media_url && (
                             <div className="mb-6 rounded-xl overflow-hidden border border-white/10 bg-black/40 relative cursor-zoom-in group/img" onClick={() => setLightboxImage(post.media_url!)}>
                                 <img src={post.media_url} className="w-full h-auto max-h-[400px] object-cover" />
                                 <div className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-lg opacity-0 group-hover/img:opacity-100 transition-opacity">
                                     <Maximize2 className="w-4 h-4 text-white" />
                                 </div>
                             </div>
                         )}

                         {/* Interaction Bar */}
                         <div className="flex items-center gap-4 border-t border-white/5 pt-4">
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleVote(post.id, 'like'); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                    userVotes[post.id] === 'like' ? 'bg-green-500/20 text-green-400' : 'bg-white/5 text-gray-400 hover:bg-green-500/10'
                                }`}
                            >
                               <Heart className={`w-4 h-4 ${userVotes[post.id] === 'like' ? 'fill-current' : ''}`} />
                               <span className="text-xs font-bold">{post.likes}</span>
                            </button>
                            
                            <button 
                                onClick={(e) => { e.stopPropagation(); handleVote(post.id, 'dislike'); }}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                                    userVotes[post.id] === 'dislike' ? 'bg-red-500/20 text-red-400' : 'bg-white/5 text-gray-400 hover:bg-red-500/10'
                                }`}
                            >
                               <ThumbsDown className={`w-4 h-4 ${userVotes[post.id] === 'dislike' ? 'fill-current' : ''}`} />
                               <span className="text-xs font-bold">{post.dislikes || 0}</span>
                            </button>

                            <button 
                                onClick={() => toggleComments(post.id)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${expandedPostId === post.id ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400 hover:bg-blue-500/10'}`}
                            >
                               <MessageCircle className="w-4 h-4" />
                               <span className="text-xs font-bold">Comments</span>
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); handleShare(post); }} className="flex items-center gap-2 text-gray-500 hover:text-amber-400 transition-colors ml-auto p-2 hover:bg-white/5 rounded-lg">
                               <Share2 className="w-4 h-4" />
                            </button>
                         </div>

                         {/* Comments Section */}
                         {expandedPostId === post.id && (
                             <div className="mt-6 pt-4 border-t border-white/5 animate-in slide-in-from-top-2">
                                 {loadingComments ? (
                                     <div className="text-center py-4"><Loader2 className="w-4 h-4 animate-spin mx-auto text-amber-500" /></div>
                                 ) : (
                                     <div className="space-y-4 mb-4">
                                         {comments.map(comment => (
                                             <div key={comment.id} className="flex gap-3 text-sm animate-in fade-in group/comment">
                                                 <LazyImage src={comment.avatar} className="w-8 h-8 rounded-full border border-white/10 shrink-0 object-cover" alt="Av" />
                                                 <div className="bg-white/5 rounded-xl p-3 flex-1 border border-white/5 relative">
                                                     <div className="flex justify-between items-start mb-1">
                                                         <div className="font-bold text-xs text-gray-300">{comment.author}</div>
                                                         
                                                         {/* Edit/Delete Comment */}
                                                         {isCommentOwner(comment) && editingCommentId !== comment.id && (
                                                             <div className="flex gap-2 opacity-0 group-hover/comment:opacity-100 transition-opacity">
                                                                 <button onClick={() => startEditComment(comment)} className="text-gray-500 hover:text-amber-400 transition-colors" title="Edit">
                                                                     <Edit2 className="w-3 h-3" />
                                                                 </button>
                                                                 <button onClick={() => deleteComment(comment.id)} className="text-gray-500 hover:text-red-400 transition-colors" title="Delete">
                                                                     <Trash2 className="w-3 h-3" />
                                                                 </button>
                                                             </div>
                                                         )}
                                                     </div>

                                                     {editingCommentId === comment.id ? (
                                                         <div className="flex flex-col gap-2">
                                                             <textarea 
                                                               value={editCommentText}
                                                               onChange={(e) => setEditCommentText(e.target.value)}
                                                               className="bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:border-amber-500 w-full resize-none outline-none"
                                                               autoFocus
                                                             />
                                                             <div className="flex gap-2 justify-end">
                                                                 <button onClick={() => setEditingCommentId(null)} className="text-xs text-gray-400 hover:text-white px-2 py-1">Cancel</button>
                                                                 <button onClick={() => saveEditedComment(comment.id)} className="text-xs bg-amber-500 text-black px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-white transition-colors">
                                                                     <Check className="w-3 h-3" /> Save
                                                                 </button>
                                                             </div>
                                                         </div>
                                                     ) : (
                                                         <p className="text-gray-400 text-xs leading-relaxed">{comment.content}</p>
                                                     )}
                                                 </div>
                                             </div>
                                         ))}
                                         {comments.length === 0 && <p className="text-center text-xs text-gray-600 italic py-4">No comments yet. Be the first to resonate.</p>}
                                     </div>
                                 )}

                                 <div className="flex gap-2 items-center">
                                     <input 
                                       type="text" 
                                       value={newComment}
                                       onChange={(e) => setNewComment(e.target.value)}
                                       onKeyDown={(e) => e.key === 'Enter' && handleSubmitComment(post.id)}
                                       placeholder="Add a comment..." 
                                       className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500 transition-all placeholder:text-gray-600"
                                     />
                                     <button 
                                        onClick={() => handleSubmitComment(post.id)} 
                                        className="p-3 bg-amber-500 text-black rounded-xl hover:bg-white shadow-lg transition-all disabled:opacity-50"
                                        disabled={!newComment.trim()}
                                     >
                                         <Send className="w-4 h-4" />
                                     </button>
                                 </div>
                             </div>
                         )}
                      </div>
                   ))
               )}

               {!loading && filteredPosts.length === 0 && (
                   <div className="text-center py-20 opacity-50 flex flex-col items-center">
                       <BookOpen className="w-16 h-16 text-gray-700 mb-4" />
                       <p className="text-gray-500 italic">No threads found in this sector.</p>
                       <button onClick={() => setShowNewPost(true)} className="mt-4 text-amber-500 hover:text-white text-xs font-bold uppercase tracking-widest transition-colors">Start a new discussion</button>
                   </div>
               )}
            </div>
         </div>
      </div>
    </div>
  );
};

export default Forum;
