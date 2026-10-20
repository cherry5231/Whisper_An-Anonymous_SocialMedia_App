import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Sprout, Search, Plus, House, Compass, Users, UserRound, Sun, Moon,
  Heart, HandHeart, MessageCircle, Bookmark, Flag, ShieldCheck, LockKeyhole,
  Globe2, ChevronDown, X, Send, SlidersHorizontal, Leaf, LogIn, LogOut,
  Check, Settings2, AlertTriangle, ImagePlus, Camera, Trash2, ArrowLeft
} from 'lucide-react';
import { supabase, cloudEnabled } from './supabase';

const TOPICS = ['All topics', 'Relationships', 'College Life', 'Friendship', 'Mental Wellness', 'Family', 'Late Night Thoughts', 'Work & Career', 'Confessions'];
const EMOJIS = ['💚', '🫂', '🌱', '✨'];
const seedPosts = [
  { id:'seed-1', author:'mossy_mind', topic:'Relationships', body:"I think I’m finally learning that missing someone doesn’t mean I should let them back into my life.", visibility:'public', created_at:new Date(Date.now()-1000*60*18).toISOString(), reactions:{'💚':18,'🫂':9,'🌱':4}, comments:[{id:'c1',author:'fern_after_rain',body:'That is such a gentle but important reminder.'}], saved:false },
  { id:'seed-2', author:'littlefern', topic:'College Life', body:"Everyone around me seems to know what they’re doing. I’m proud of myself for showing up, even when I feel behind.", visibility:'public', created_at:new Date(Date.now()-1000*60*54).toISOString(), reactions:{'💚':31,'🫂':12,'🌱':8}, comments:[], saved:false },
  { id:'seed-3', author:'afterhours', topic:'Late Night Thoughts', body:"Does anyone else rehearse conversations in their head and then feel tired before anything has even happened?", visibility:'public', created_at:new Date(Date.now()-1000*60*60*3).toISOString(), reactions:{'💚':46,'🫂':5,'🌱':14}, comments:[{id:'c3',author:'quietcloud',body:'Every single day. You are not alone.'}], saved:false },
  { id:'seed-4', author:'greenwindow', topic:'Friendship', body:"A tiny confession: I’m trying to become the kind of friend who checks in first instead of waiting to be remembered.", visibility:'public', created_at:new Date(Date.now()-1000*60*60*7).toISOString(), reactions:{'💚':23,'🫂':15,'🌱':11}, comments:[], saved:false }
];
const seedCommunities = [
  {name:'Relationships', description:'Love, heartbreak, boundaries and all the in-between.', members:'2.4k', icon:'♡', color:'rose'},
  {name:'College Life', description:'Deadlines, new beginnings and figuring it out.', members:'1.8k', icon:'✳', color:'sage'},
  {name:'Late Night Thoughts', description:'For the thoughts that show up after midnight.', members:'3.1k', icon:'☾', color:'lilac'},
  {name:'Friendship', description:'Finding your people and learning to show up.', members:'940', icon:'⌁', color:'sand'},
  {name:'Mental Wellness', description:'Small steps, honest feelings, gentle support.', members:'1.6k', icon:'♡', color:'mint'},
  {name:'Family', description:'The complicated, beautiful, messy bits of home.', members:'720', icon:'⌂', color:'sage'}
];
const initialSettings = { privateAccount:false, anonymousReplies:true };
const read = (key, fallback) => { try { const v=localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const timeAgo = (date) => {
  const mins = Math.max(1, Math.floor((Date.now()-new Date(date).getTime())/60000));
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.floor(mins/60)}h ago`;
  return `${Math.floor(mins/1440)}d ago`;
};
const initials = name => (name || 'w').slice(0,1).toUpperCase();
const countReactions = p => Object.values(p.reactions||{}).reduce((a,b)=>a+b,0);

function App() {
  const [theme,setTheme] = useState(() => read('whisper-theme','light'));
  const [tab,setTab] = useState('Home');
  const [posts,setPosts] = useState(() => read('whisper-posts',seedPosts));
  const [comments,setComments] = useState([]);
  const [likes,setLikes] = useState([]);
  const [viewingProfile,setViewingProfile] = useState(null);
  const [coverUploading,setCoverUploading] = useState(false);
  const [avatarUploading,setAvatarUploading] = useState(false);
  const coverFileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const [joined,setJoined] = useState(() => read('whisper-joined',['Late Night Thoughts','Friendship']));
  const [settings,setSettings] = useState(() => read('whisper-settings',initialSettings));
  const [profile,setProfile] = useState(() => read('whisper-profile',{handle:'softfern',bio:'Learning to be kinder to myself.', avatar:'🌿', avatar_url:null, cover_photo_url:null, user_id:null}));
  const [query,setQuery] = useState('');
  const [topic,setTopic] = useState('All topics');
  const [sort,setSort] = useState('Latest');
  const [showComposer,setShowComposer] = useState(false);
  const [draft,setDraft] = useState('');
  const [draftTopic,setDraftTopic] = useState('Late Night Thoughts');
  const [draftVisibility,setDraftVisibility] = useState('public');
  const [commentOpen,setCommentOpen] = useState(null);
  const [commentDraft,setCommentDraft] = useState('');
  const [reportTarget,setReportTarget] = useState(null);
  const [reportReason,setReportReason] = useState('Harassment or bullying');
  const [toast,setToast] = useState('');
  const [session,setSession] = useState(null);
  const [authOpen,setAuthOpen] = useState(false);
  const [authMode,setAuthMode] = useState('signup');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [profileEdit,setProfileEdit] = useState(false);
  const [editHandle,setEditHandle] = useState(profile.handle);
  const [editBio,setEditBio] = useState(profile.bio);
  const [authLoading,setAuthLoading] = useState(false);

  useEffect(()=>{ localStorage.setItem('whisper-theme',JSON.stringify(theme)); },[theme]);
  useEffect(()=>{ if(!cloudEnabled) localStorage.setItem('whisper-posts',JSON.stringify(posts)); },[posts]);
  useEffect(()=>{ localStorage.setItem('whisper-joined',JSON.stringify(joined)); },[joined]);
  useEffect(()=>{ localStorage.setItem('whisper-settings',JSON.stringify(settings)); },[settings]);
  useEffect(()=>{ localStorage.setItem('whisper-profile',JSON.stringify(profile)); },[profile]);
  useEffect(()=>{
    if (!cloudEnabled) return;
    supabase.auth.getSession().then(({data})=>setSession(data.session));
    const {data:{subscription}} = supabase.auth.onAuthStateChange((_event,s)=>setSession(s));
    return ()=>subscription.unsubscribe();
  },[]);

  const loadCloudData = async () => {
    if (!cloudEnabled || !session?.user?.id) return;
    const [postResult, commentResult, likeResult] = await Promise.all([
      supabase.from('confessions').select('*').order('created_at',{ascending:false}),
      supabase.from('comments').select('*').order('created_at',{ascending:true}),
      supabase.from('post_likes').select('post_id,user_id')
    ]);
    if (postResult.error) { notify(postResult.error.message || 'Could not load posts.'); return; }
    if (commentResult.error) { notify('Could not load comments: ' + commentResult.error.message); return; }
    if (likeResult.error) { notify('Could not load likes: ' + likeResult.error.message); return; }
    const commentRows = commentResult.data || [];
    const likeRows = likeResult.data || [];
    setComments(commentRows);
    setLikes(likeRows);
    setPosts((postResult.data || []).map(row => ({
      ...row,
      author_id: row.author_id,
      author: row.author || 'whisper_member',
      avatar_url: row.avatar_url || null,
      reactions: row.reactions || {},
      comments: commentRows.filter(c => c.post_id === row.id),
      likeCount: likeRows.filter(l => l.post_id === row.id).length,
      likedByMe: likeRows.some(l => l.post_id === row.id && l.user_id === session.user.id)
    })));
  };

  useEffect(()=>{
    if (!cloudEnabled) return;
    if (!session?.user?.id) { setPosts([]); setComments([]); setLikes([]); return; }
    let active = true;
    const loadProfile = async () => {
      const {data,error} = await supabase.from('profiles').select('*').eq('id',session.user.id).maybeSingle();
      if (!active) return;
      if (error) { notify('Could not load profile: ' + error.message); return; }
      if (data) {
        setProfile(p=>({...p,user_id:data.id,handle:data.handle || p.handle,bio:data.bio || '',avatar_url:data.avatar_url || null,cover_photo_url:data.cover_photo_url || null}));
        setSettings(s=>({...s,privateAccount:!!data.is_private}));
      } else {
        const initial = {id:session.user.id,handle:profile.handle,bio:profile.bio,is_private:false,avatar_url:profile.avatar_url || null,cover_photo_url:profile.cover_photo_url || null};
        const {error:insertError} = await supabase.from('profiles').upsert(initial,{onConflict:'id'});
        if (insertError && active) notify('Could not initialize profile: ' + insertError.message);
      }
      await loadCloudData();
    };
    loadProfile();
    const channel = supabase.channel('whisper-live-data')
      .on('postgres_changes',{event:'*',schema:'public',table:'confessions'},()=>loadCloudData())
      .on('postgres_changes',{event:'*',schema:'public',table:'comments'},()=>loadCloudData())
      .on('postgres_changes',{event:'*',schema:'public',table:'post_likes'},()=>loadCloudData())
      .subscribe();
    return ()=>{active=false;supabase.removeChannel(channel);};
  },[session?.user?.id]);
  useEffect(()=>{
    if (!toast) return;
    const id=setTimeout(()=>setToast(''),2800);
    return ()=>clearTimeout(id);
  },[toast]);

  const visiblePosts = useMemo(()=>{
    let result=posts.filter(p => {
      const topicMatch=topic==='All topics'||p.topic===topic;
      const searchMatch=!query||`${p.body} ${p.topic} ${p.author}`.toLowerCase().includes(query.toLowerCase());
      const visibilityMatch=p.visibility==='public'||(session?.user?.id ? p.author_id===session.user.id : (!cloudEnabled && p.author===profile.handle));
      return topicMatch&&searchMatch&&visibilityMatch;
    });
    if (sort==='Most loved') result.sort((a,b)=>(b.likeCount ?? totalReactions(b))-(a.likeCount ?? totalReactions(a)));
    else if (sort==='Most discussed') result.sort((a,b)=>(b.comments?.length||0)-(a.comments?.length||0));
    else result.sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    return result;
  },[posts,topic,query,sort,profile.handle,session?.user?.id]);
  function totalReactions(p){ return Object.values(p.reactions||{}).reduce((a,b)=>a+b,0); }
  const notify = msg => setToast(msg);
  const requireAccount = action => {
    if (!cloudEnabled && !session) { notify(`Demo mode: ${action} is saved only in this browser.`); return false; }
    return true;
  };
  const reactTo = async (id) => {
    if (cloudEnabled) {
      if (!session?.user?.id) { setAuthMode('signin'); setAuthOpen(true); notify('Sign in to like a post.'); return; }
      const alreadyLiked = likes.some(l => l.post_id === id && l.user_id === session.user.id);
      if (alreadyLiked) {
        const {error} = await supabase.from('post_likes').delete().eq('post_id',id).eq('user_id',session.user.id);
        if (error) { notify(error.message); return; }
      } else {
        const {error} = await supabase.from('post_likes').insert({post_id:id,user_id:session.user.id});
        if (error && error.code !== '23505') { notify(error.message); return; }
      }
      await loadCloudData();
      return;
    }
    const demoKey='whisper-demo-liked-'+profile.handle;
    const current=read(demoKey,[]);
    const next=current.includes(id)?current.filter(x=>x!==id):[...current,id];
    localStorage.setItem(demoKey,JSON.stringify(next));
    setPosts(prev=>prev.map(p=>p.id!==id?p:{...p,likedByMe:next.includes(id),likeCount:Math.max(0,(p.likeCount||totalReactions(p))+(next.includes(id)?1:-1))}));
  };

  const addComment = async (id) => {
    const body=commentDraft.trim();
    if(!body) return;
    if (cloudEnabled) {
      if (!session?.user?.id) { setAuthMode('signin'); setAuthOpen(true); notify('Sign in to comment.'); return; }
      const {data,error} = await supabase.from('comments').insert({
        post_id:id, author_id:session.user.id, author_handle:profile.handle,
        avatar_url:profile.avatar_url || null, body
      }).select('*').single();
      if (error) { notify('Could not add comment: ' + error.message); return; }
      setComments(prev=>[...prev,data]);
      setPosts(prev=>prev.map(p=>p.id!==id?p:{...p,comments:[...(p.comments||[]),data]}));
    } else {
      const newComment={id:crypto.randomUUID(),post_id:id,author_id:null,author_handle:profile.handle,author:profile.handle,avatar_url:profile.avatar_url||null,body,created_at:new Date().toISOString()};
      setPosts(prev=>prev.map(p=>p.id!==id?p:{...p,comments:[...(p.comments||[]),newComment]}));
    }
    setCommentDraft(''); notify('Reply added');
  };

  const createPost = async () => {
    const body=draft.trim();
    if(body.length<8){notify('Add a little more to your confession first.');return;}
    if(body.length>1000){notify('Please keep confessions under 1,000 characters.');return;}
    if (cloudEnabled) {
      if (!session?.user?.id) { setAuthMode('signin'); setAuthOpen(true); notify('Sign in to publish across devices.'); return; }
      const row={author_id:session.user.id,author:profile.handle,avatar_url:profile.avatar_url||null,topic:draftTopic,body,visibility:draftVisibility,reactions:{},comments:[]};
      const {data,error}=await supabase.from('confessions').insert(row).select('*').single();
      if(error){notify('Could not post confession: '+error.message);return;}
      setPosts(prev=>[{...data,comments:[],likeCount:0,likedByMe:false},...prev]);
    } else {
      const newPost={id:crypto.randomUUID(),author:profile.handle,author_id:null,avatar_url:profile.avatar_url||null,topic:draftTopic,body,visibility:draftVisibility,created_at:new Date().toISOString(),reactions:{},comments:[],likeCount:0,likedByMe:false};
      setPosts(prev=>[newPost,...prev]);
    }
    setDraft('');setShowComposer(false);setTab('Home');setTopic('All topics');notify('Your confession is posted.');
  };

  const openPublicProfile = async (authorId, handle) => {
    if (session?.user?.id && authorId === session.user.id) { setTab('My profile'); return; }
    if (!cloudEnabled || !authorId) { notify('This profile is not available in demo mode yet.'); return; }
    const {data,error}=await supabase.from('profiles').select('*').eq('id',authorId).maybeSingle();
    if(error){notify('Could not open profile: '+error.message);return;}
    if(!data){notify('This user has not created a public profile yet.');return;}
    setViewingProfile(data); setTab('Public profile');
  };

  const uploadProfileImage = async (file, kind) => {
    if(!file) return;
    if(!session?.user?.id){setAuthMode('signin');setAuthOpen(true);notify('Sign in to upload profile photos.');return;}
    if(!file.type.startsWith('image/')){notify('Choose an image file.');return;}
    if(file.size>5*1024*1024){notify('Please choose an image under 5 MB.');return;}
    const setUploading=kind==='cover'?setCoverUploading:setAvatarUploading;
    setUploading(true);
    try {
      const ext=(file.name.split('.').pop()||'jpg').toLowerCase().replace(/[^a-z0-9]/g,'')||'jpg';
      const path=`${session.user.id}/${kind}-${Date.now()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from('Profile-Photo').upload(path,file,{upsert:true,contentType:file.type});
      if(uploadError) throw uploadError;
      const {data:urlData}=supabase.storage.from('Profile-Photo').getPublicUrl(path);
      const field=kind==='cover'?'cover_photo_url':'avatar_url';
      const updated={...profile,user_id:session.user.id,[field]:urlData.publicUrl};
      const {error:saveError}=await supabase.from('profiles').upsert({id:session.user.id,handle:updated.handle,bio:updated.bio,is_private:settings.privateAccount,avatar_url:updated.avatar_url||null,cover_photo_url:updated.cover_photo_url||null},{onConflict:'id'});
      if(saveError) throw saveError;
      if(kind==='avatar'){
        const {error:postError}=await supabase.from('confessions').update({avatar_url:urlData.publicUrl}).eq('author_id',session.user.id);
        const {error:commentError}=await supabase.from('comments').update({avatar_url:urlData.publicUrl}).eq('author_id',session.user.id);
        if(postError || commentError) notify('Photo saved, but older posts or comments may still show the previous photo.');
      }
      setProfile(updated); notify(kind==='cover'?'Cover photo updated!':'Profile photo updated!');
    } catch(err){notify('Photo upload failed: '+(err.message||'Check storage bucket permissions.'));}
    finally{setUploading(false);}
  };

  const toggleJoin = name => setJoined(prev=>prev.includes(name)?prev.filter(n=>n!==name):[...prev,name]);
  const sendReport = () => {
    if (!reportTarget) return;
    const reports=read('whisper-reports',[]);
    localStorage.setItem('whisper-reports',JSON.stringify([...reports,{id:crypto.randomUUID(),postId:reportTarget.id,reason:reportReason,created_at:new Date().toISOString()}]));
    setPosts(prev=>prev.filter(p=>p.id!==reportTarget.id));
    setReportTarget(null);notify('Report received. This post is hidden from your feed.');
  };
  const authenticate = async e => {
    e.preventDefault();
    if(!cloudEnabled){notify('Add Supabase keys in .env to enable real sign-in.');return;}
    setAuthLoading(true);
    try {
      const result=authMode==='signup'
        ? await supabase.auth.signUp({email,password})
        : await supabase.auth.signInWithPassword({email,password});
      if(result.error) throw result.error;
      if(authMode==='signup'&&!result.data.session) notify('Check your email to confirm your account.');
      else {setAuthOpen(false);notify('You are signed in.');}
    } catch(err){notify(err.message||'Could not sign in.');}
    finally{setAuthLoading(false);}
  };
  const signOut = async()=>{if(cloudEnabled) await supabase.auth.signOut();setSession(null);if(cloudEnabled){setPosts(prev=>prev.filter(p=>p.visibility==='public'));setComments([]);setLikes([]);}notify('Signed out');};
  const saveProfile = async()=>{
    const handle=editHandle.trim().replace(/^@/,'').replace(/[^a-zA-Z0-9_]/g,'').slice(0,22)||'softfern';
    const updated={...profile,handle,bio:editBio.trim().slice(0,120),user_id:session?.user?.id||profile.user_id};
    if(cloudEnabled && session?.user?.id){
      const {error}=await supabase.from('profiles').upsert({id:session.user.id,handle:updated.handle,bio:updated.bio,is_private:settings.privateAccount,avatar_url:updated.avatar_url||null,cover_photo_url:updated.cover_photo_url||null},{onConflict:'id'});
      if(error){notify('Could not save profile: '+error.message);return;}
      const {error:postError}=await supabase.from('confessions').update({author:updated.handle,avatar_url:updated.avatar_url||null}).eq('author_id',session.user.id);
      const {error:commentError}=await supabase.from('comments').update({author_handle:updated.handle,avatar_url:updated.avatar_url||null}).eq('author_id',session.user.id);
      if(postError || commentError) notify('Profile saved, but some older posts or comments could not be refreshed.');
    }
    setProfile(updated);setProfileEdit(false);notify('Profile updated');
  };

  return <div className={`app ${theme}`} data-theme={theme}>
    <style>{`
      .profile-link-button,.profile-name-link{cursor:pointer;border:0;background:none;color:inherit;font:inherit;padding:0;text-align:left}
      .profile-name-link{font-weight:750}.profile-name-link:hover{text-decoration:underline}
      .post-avatar img,.comment-avatar img,.profile-avatar-large img{width:100%;height:100%;object-fit:cover;border-radius:inherit;display:block}
      .post-avatar,.comment-avatar{overflow:hidden;flex-shrink:0}.post-avatar{border:0;display:grid;place-items:center}.comment-avatar{display:grid;place-items:center}
      .like-button{display:inline-flex;align-items:center;gap:7px;border:0;background:transparent;cursor:pointer;padding:7px 9px;border-radius:10px;color:var(--text,#40354b)}.like-button.liked{color:#e54868;background:rgba(229,72,104,.09)}
      .comment-row{display:flex;gap:10px;align-items:flex-start;margin:10px 0}.comment-copy{min-width:0;flex:1}.comment-copy p{margin:4px 0;overflow-wrap:anywhere}.profile-cover-photo{position:relative;isolation:isolate;background:#25202f;min-height:180px;border-radius:18px 18px 0 0;overflow:hidden}.profile-cover-image{position:absolute;inset:0;z-index:0;display:block;width:100%;height:100%;object-fit:cover;object-position:center;opacity:1!important;filter:none!important;mix-blend-mode:normal!important}.profile-cover-shade{position:absolute;inset:0;z-index:1;pointer-events:none;background:linear-gradient(180deg,rgba(20,15,30,.02) 0%,rgba(20,15,30,.12) 65%,rgba(20,15,30,.38) 100%)}.profile-cover-art,.profile-cover-label,.cover-edit-button{position:absolute;z-index:2}.profile-cover-label{left:18px;bottom:16px}.cover-edit-button{right:14px;bottom:14px;display:flex;align-items:center;gap:7px;border:1px solid rgba(255,255,255,.5);border-radius:10px;background:rgba(25,20,35,.72);color:white;padding:9px 12px;cursor:pointer}.app.dark .profile-cover-image{opacity:1!important;filter:none!important;mix-blend-mode:normal!important}.app.dark .profile-cover-shade{background:linear-gradient(180deg,rgba(20,15,30,.02) 0%,rgba(20,15,30,.12) 65%,rgba(20,15,30,.38) 100%)}.profile-avatar-photo{overflow:hidden;display:grid;place-items:center}.profile-avatar-photo img{border-radius:inherit}.cover-edit-below{display:flex;justify-content:flex-end;margin:8px 0 0}.cover-edit-below .button-secondary{display:inline-flex;align-items:center;gap:7px;padding:7px 11px;font-size:13px}.cover-remove-button{display:inline-flex;align-items:center;gap:6px;padding:7px 11px;border:1px solid #8b5cf6;border-radius:9px;background:#7c3aed;color:#fff;font-size:13px;font-weight:600;cursor:pointer}.cover-remove-button:hover{background:#6d28d9}.profile-photo-actions{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0 18px}.profile-photo-actions small{max-width:360px}.public-profile-page>.button-secondary{margin-bottom:16px}.profile-heading-row{gap:16px}
    `}</style>
    <aside className="sidebar">
      <button className="brand" onClick={()=>{setTab('Home');setTopic('All topics')}}><span className="brand-mark"><Sprout size={23}/></span><span>whisper<span className="brand-dot">.</span><small>YOUR QUIET CORNER</small></span></button>
      <button className="compose-side" onClick={()=>setShowComposer(true)}><Plus size={18}/> Write a confession</button>
      <div className="nav-label">YOUR SPACE</div>
      <nav className="main-nav">
        {[['Home',House],['Explore',Compass],['Communities',Users],['My profile',UserRound]].map(([name,Icon])=><button key={name} className={tab===name?'nav-item active':'nav-item'} onClick={()=>{setTab(name);if(name==='Explore')setTopic('All topics')}}><Icon size={18}/>{name}{name==='Communities'&&<span className="nav-count">{joined.length}</span>}</button>)}
      </nav>
      <div className="nav-label community-label">YOUR COMMUNITIES <button aria-label="Explore communities" onClick={()=>setTab('Communities')}><Plus size={14}/></button></div>
      <div className="side-communities">{joined.slice(0,5).map((name,i)=><button key={name} onClick={()=>{setTab('Home');setTopic(name)}}><span className={`tiny-dot dot-${i%4}`}/>{name}</button>)}{joined.length===0&&<p className="muted tiny">Join a community to see it here.</p>}</div>
      <div className="sidebar-bottom">
        <div className="privacy-note"><ShieldCheck size={17}/><span><b>Your identity stays yours.</b><small>Share at your own pace.</small></span></div>
        <button className="profile-mini" onClick={()=>setTab('My profile')}><span className="avatar">{profile.avatar}</span><span className="profile-mini-text"><b>@{profile.handle}</b><small>{settings.privateAccount?'Private account':'Anonymous member'}</small></span><Settings2 size={16}/></button>
      </div>
    </aside>

    <main className="main-area">
      <header className="topbar">
        <div className="mobile-brand"><Sprout size={20}/> whisper<span>.</span></div>
        <div className="search-wrap"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search confessions, topics, feelings..." aria-label="Search"/></div>
        <div className="top-actions">
          <span className="demo-status"><span/> {cloudEnabled?'Cloud connected':'Local demo'}</span>
          <button className="icon-button theme-toggle" onClick={()=>setTheme(theme==='light'?'dark':'light')} aria-label="Toggle color theme">{theme==='light'?<Moon size={18}/>:<Sun size={18}/>}</button>
          {session ? <>
            <button
              type="button"
              className="account-initial"
              title={session.user?.email || 'Signed-in account'}
              aria-label={`Signed in as ${session.user?.email || 'your account'}`}
              onClick={()=>setTab('My profile')}
              style={{
                width: 36, height: 36, minWidth: 36, borderRadius: '50%',
                border: '1px solid #8b5cf6', background: '#6d28d9', color: '#ffffff',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 800, fontSize: 15, textTransform: 'uppercase'
              }}
            >{(session.user?.email || 'U').trim().charAt(0).toUpperCase()}</button>
            <button className="sign-in-button" onClick={signOut} title="Log out" aria-label="Log out">
              <LogOut size={16}/> <span>Log out</span>
            </button>
          </> : <button className="sign-in-button" onClick={()=>{setAuthMode('signin');setAuthOpen(true)}}><LogIn size={16}/> Sign in</button>}
        </div>
      </header>

      <div className="content">
        {tab==='Home'&&<HomePage {...{profile,settings,setShowComposer,topic,setTopic,sort,setSort,visiblePosts,reactTo,commentOpen,setCommentOpen,commentDraft,setCommentDraft,addComment,setReportTarget,joined,theme,notify,openPublicProfile,session}}/>}
        {tab==='Explore'&&<ExplorePage {...{query,setQuery,setTab,setTopic,joined,visiblePosts,reactTo,setShowComposer,openPublicProfile}}/>}
        {tab==='Communities'&&<CommunitiesPage {...{joined,toggleJoin,setTab,setTopic,notify}}/>}
        {tab==='My profile'&&<ProfilePage {...{profile,setProfile,settings,setSettings,posts,profileEdit,setProfileEdit,editHandle,setEditHandle,editBio,setEditBio,saveProfile,session,signOut,setAuthOpen,setAuthMode,notify,coverFileRef,avatarFileRef,uploadProfileImage,coverUploading,avatarUploading}}/>}
        {tab==='Public profile'&&viewingProfile&&<PublicProfilePage user={viewingProfile} posts={posts} onBack={()=>setTab('Home')} openPublicProfile={openPublicProfile}/>}
      </div>
      <footer className="footer"><span>whisper<span className="brand-dot">.</span> <span>Make room for every feeling.</span></span><span><ShieldCheck size={13}/> Anonymous by design, kind by choice.</span></footer>
    </main>

    <nav className="mobile-nav">{[['Home',House],['Explore',Compass],['Write',Plus],['Communities',Users],['My profile',UserRound]].map(([name,Icon])=><button key={name} className={tab===name?'selected':''} onClick={()=>name==='Write'?setShowComposer(true):setTab(name)}><Icon size={19}/><small>{name}</small></button>)}</nav>

    {showComposer&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setShowComposer(false)}}><section className="modal composer-modal">
      <div className="modal-head"><div><span className="eyebrow">A LITTLE SPACE FOR YOU</span><h2>Let it out.</h2><p>Your story matters. Share only what feels right.</p></div><button className="icon-button" onClick={()=>setShowComposer(false)}><X size={19}/></button></div>
      <label className="field-label" htmlFor="confession">Your confession</label><textarea id="confession" autoFocus maxLength={1000} value={draft} onChange={e=>setDraft(e.target.value)} placeholder="Start wherever you are. No need to make it perfect..." rows={6}/>
      <div className="textarea-foot"><span><ShieldCheck size={14}/> Posted as @{profile.handle}</span><span>{draft.length}/1000</span></div>
      <div className="field-row"><div className="field-group"><label className="field-label">Choose a topic</label><select value={draftTopic} onChange={e=>setDraftTopic(e.target.value)}>{TOPICS.filter(t=>t!=='All topics').map(t=><option key={t}>{t}</option>)}</select></div><div className="field-group"><label className="field-label">Who can see this?</label><select value={draftVisibility} onChange={e=>setDraftVisibility(e.target.value)}><option value="public">🌍 Public — everyone</option><option value="private">🔒 Only me — private note</option></select></div></div>
      <div className="gentle-reminder"><Leaf size={16}/><span><b>A gentle reminder</b> — avoid names, addresses, phone numbers or details that could identify someone.</span></div>
      <div className="modal-actions"><button className="button-secondary" onClick={()=>setShowComposer(false)}>Maybe later</button><button className="button-primary" onClick={createPost}><Send size={16}/> Post confession</button></div>
    </section></div>}

    {reportTarget&&<div className="modal-backdrop"><section className="modal report-modal"><div className="modal-head"><div><span className="eyebrow">KEEP WHISPER KIND</span><h2>Report this post</h2><p>Choose the reason that best describes your concern.</p></div><button className="icon-button" onClick={()=>setReportTarget(null)}><X size={19}/></button></div><div className="report-options">{['Harassment or bullying','Hate or discrimination','Personal information / doxxing','Spam or scam','Threats or dangerous content','Something else'].map(r=><label key={r} className="radio-row"><input type="radio" name="report" checked={reportReason===r} onChange={()=>setReportReason(r)}/>{r}</label>)}</div><div className="modal-actions"><button className="button-secondary" onClick={()=>setReportTarget(null)}>Cancel</button><button className="button-primary" onClick={sendReport}><Flag size={16}/> Submit report</button></div></section></div>}

    {authOpen&&<div className="modal-backdrop"><section className="modal auth-modal"><div className="modal-head"><div className="auth-logo"><Sprout size={24}/></div><button className="icon-button" onClick={()=>setAuthOpen(false)}><X size={19}/></button></div><h2>{authMode==='signup'?'Make room for yourself.':'Welcome back.'}</h2><p>{cloudEnabled?'Sign in securely to keep your account across devices.':'Demo mode is active. Add Supabase credentials to enable real accounts.'}</p><form onSubmit={authenticate}><label className="field-label">Email</label><input className="text-input" type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><label className="field-label">Password</label><input className="text-input" type="password" minLength={6} required value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 6 characters"/><button className="button-primary full-width" disabled={authLoading}>{authLoading?'Please wait…':authMode==='signup'?'Create account':'Sign in'}</button></form><p className="auth-switch">{authMode==='signup'?'Already have an account?':'New to Whisper?'} <button onClick={()=>setAuthMode(authMode==='signup'?'signin':'signup')}>{authMode==='signup'?'Sign in':'Create an account'}</button></p><div className="auth-privacy"><LockKeyhole size={14}/> Your email is never shown on your public profile.</div></section></div>}

    {toast&&<div className="toast"><span className="toast-check"><Check size={15}/></span>{toast}</div>}
  </div>;
}

function HomePage({profile,settings,setShowComposer,topic,setTopic,sort,setSort,visiblePosts,reactTo,commentOpen,setCommentOpen,commentDraft,setCommentDraft,addComment,setReportTarget,joined,theme,notify,openPublicProfile,session}){
  return <div className="home-layout">
    <section className="feed-column">
      <div className="welcome-row"><div><span className="eyebrow">TUESDAY, OCTOBER 20</span><h1>A softer place<br/><em>to land.</em></h1><p>Whatever you’re carrying today, you don’t have to carry it alone.</p></div><div className="welcome-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-leaf"><Sprout size={58}/></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✧</span></div></div>
      <button className="composer-prompt" onClick={()=>setShowComposer(true)}><span className="prompt-avatar">{profile.avatar}</span><span className="prompt-copy">What’s on your mind, @{profile.handle}?</span><span className="prompt-cta"><Plus size={16}/> Confess</span></button>
      <div className="feed-toolbar"><div className="feed-title"><h2>Community whispers</h2><span className="live-dot"/></div><div className="feed-controls"><select aria-label="Filter by topic" value={topic} onChange={e=>setTopic(e.target.value)}>{TOPICS.map(t=><option key={t}>{t}</option>)}</select><select aria-label="Sort posts" value={sort} onChange={e=>setSort(e.target.value)}><option>Latest</option><option>Most loved</option><option>Most discussed</option></select><button className="filter-button" title="Filter options" onClick={()=>notify('Choose a topic and sort order using the menus.')}><SlidersHorizontal size={16}/></button></div></div>
      {visiblePosts.length===0?<div className="empty-state"><Sprout size={32}/><h3>No whispers found</h3><p>Try another search or be the first to share something here.</p><button className="button-primary" onClick={()=>setShowComposer(true)}>Write a confession</button></div>:<div className="post-list">{visiblePosts.map(post=><PostCard key={post.id} post={post} reactTo={reactTo} commentOpen={commentOpen} setCommentOpen={setCommentOpen} commentDraft={commentDraft} setCommentDraft={setCommentDraft} addComment={addComment} setReportTarget={setReportTarget} openPublicProfile={openPublicProfile} session={session}/>)}</div>}
      <div className="feed-end"><span/><p>You’re all caught up for now.</p><span/></div>
    </section>
    <aside className="right-rail">
      <div className="rail-card mood-card"><div className="rail-card-head"><span className="rail-icon"><Leaf size={17}/></span><span className="eyebrow">A MOMENT FOR YOU</span></div><h3>You don’t have to<br/>have it all figured out.</h3><p>Growing takes time. Give yourself the same patience you give everyone else.</p><div className="mood-footer"><span>Take a breath</span><span className="breath-dots"><i/><i/><i/></span></div></div>
      <div className="rail-card"><div className="rail-title"><h3>Your communities</h3><button onClick={()=>notify('Open Communities from the left menu to discover more.')}>Explore <span>↗</span></button></div>{(joined.length?joined.slice(0,4):['Late Night Thoughts']).map((name,i)=><button className="rail-community" key={name} onClick={()=>{setTopic(name)}}><span className={`community-glyph glyph-${i%4}`}>{['♡','☾','✳','⌁'][i%4]}</span><span className="rail-community-name"><b>{name}</b><small>{['A space to feel understood','You belong here','A little corner for you','Good people, honest words'][i%4]}</small></span><span className="rail-arrow">↗</span></button>)}</div>
      <div className="rail-card kindness-card"><div className="kindness-icon"><Heart size={18}/></div><h3>Kindness looks good on you.</h3><p>Every reaction, thoughtful reply, and moment of empathy makes this space safer for everyone.</p><div className="kindness-sign">A little love goes a long way <span>♥</span></div></div>
      <div className="rail-safety"><ShieldCheck size={16}/><span><b>A note on safety</b><br/>You can report posts that feel harmful. You deserve to feel safe here.</span></div>
    </aside>
  </div>;
}

function PostCard({post,reactTo,commentOpen,setCommentOpen,commentDraft,setCommentDraft,addComment,setReportTarget,openPublicProfile,session}){
  const [expanded,setExpanded]=useState(false);
  const postComments=post.comments||[];
  const avatarFallback=['🌿','🌱','🍃','☘️','🪴'][((post.author||'w').length)%5];
  return <article className="post-card">
    <div className="post-top">
      <button className="post-avatar profile-link-button" onClick={()=>openPublicProfile?.(post.author_id,post.author)} aria-label={`Open @${post.author}'s profile`}>
        {post.avatar_url?<img src={post.avatar_url} alt=""/>:avatarFallback}
      </button>
      <div className="post-byline"><button className="profile-name-link" onClick={()=>openPublicProfile?.(post.author_id,post.author)}>@{post.author}</button><span>{post.topic} <i/> {timeAgo(post.created_at)}</span></div>
      <button className="post-more" aria-label="Report post" onClick={()=>setReportTarget(post)}><Flag size={16}/></button>
    </div>
    <p className="post-body">{post.body}</p>
    <div className="post-tags"><span className="topic-pill"><span/> {post.topic}</span>{post.visibility==='private'&&<span className="private-pill"><LockKeyhole size={12}/> Private</span>}</div>
    <div className="post-actions">
      <button className={`reaction-button like-button ${post.likedByMe?'liked':''}`} onClick={()=>reactTo(post.id)} aria-label={post.likedByMe?'Unlike post':'Like post'}><Heart size={17} fill={post.likedByMe?'currentColor':'none'}/><b>{post.likeCount ?? countReactions(post)}</b></button>
      <button className={`comment-action ${commentOpen===post.id?'is-open':''}`} onClick={()=>setCommentOpen(commentOpen===post.id?null:post.id)}><MessageCircle size={16}/><span>{postComments.length} comments</span></button>
      <button className="share-action" onClick={()=>setExpanded(!expanded)} aria-label="Share post"><Bookmark size={16}/></button>
    </div>
    {expanded&&<div className="inline-detail"><span>Share this feeling with kindness.</span><button onClick={()=>navigator.clipboard?.writeText(post.body).then(()=>{})}>Copy text</button></div>}
    {commentOpen===post.id&&<div className="comments-panel">
      {postComments.map(c=><div className="comment-row" key={c.id}>
        <button className="comment-avatar profile-link-button" onClick={()=>openPublicProfile?.(c.author_id,c.author_handle||c.author)} aria-label={`Open ${c.author_handle||c.author}'s profile`}>
          {c.avatar_url?<img src={c.avatar_url} alt=""/>:initials(c.author_handle||c.author)}
        </button>
        <div className="comment-copy"><button className="profile-name-link" onClick={()=>openPublicProfile?.(c.author_id,c.author_handle||c.author)}>@{c.author_handle||c.author||'member'}</button><p>{c.body}</p><small className="muted">{c.created_at?timeAgo(c.created_at):'Just now'}</small></div>
      </div>)}
      {postComments.length===0&&<p className="muted">Be the first to leave a thoughtful reply.</p>}
      <div className="comment-input-row"><input value={commentDraft} onChange={e=>setCommentDraft(e.target.value)} onKeyDown={e=>e.key==='Enter'&&addComment(post.id)} placeholder="Leave a kind reply…"/><button onClick={()=>addComment(post.id)} aria-label="Send reply"><Send size={15}/></button></div>
      <small className="muted">Your username and profile photo will be shown with your comment.</small>
    </div>}
  </article>;
}

function ExplorePage({query,setQuery,setTab,setTopic,joined,visiblePosts,reactTo,setShowComposer,openPublicProfile}){
  return <section className="page-section"><div className="page-heading"><span className="eyebrow">FOLLOW YOUR CURIOSITY</span><h1>Explore <em>the whispers.</em></h1><p>Find a story, a feeling, or a community that feels like you.</p></div><div className="explore-search"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search words, topics, feelings..."/></div><h2 className="section-heading">Browse by topic</h2><div className="topic-grid">{TOPICS.filter(t=>t!=='All topics').map((t,i)=><button key={t} className={`topic-tile tile-${i%4}`} onClick={()=>{setTopic(t);setTab('Home')}}><span className="tile-symbol">{['♡','✳','⌁','☾'][i%4]}</span><b>{t}</b><span>Explore stories <span>↗</span></span></button>)}</div><div className="section-heading-row"><h2 className="section-heading">Stories you might relate to</h2><button className="text-link" onClick={()=>{setTopic('All topics');setTab('Home')}}>View feed ↗</button></div><div className="post-list">{visiblePosts.slice(0,3).map(p=><PostCard key={p.id} post={p} reactTo={reactTo} commentOpen={null} setCommentOpen={()=>{}} commentDraft="" setCommentDraft={()=>{}} addComment={()=>{}} setReportTarget={()=>{}} openPublicProfile={openPublicProfile}/>)}</div><button className="button-primary" onClick={()=>setShowComposer(true)}><Plus size={16}/> Add your voice</button></section>;
}

function CommunitiesPage({joined,toggleJoin,setTab,setTopic,notify}){
  const [search,setSearch]=useState('');
  const filtered=seedCommunities.filter(c=>`${c.name} ${c.description}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="page-section"><div className="page-heading"><span className="eyebrow">BETTER, TOGETHER</span><h1>Find your <em>people.</em></h1><p>Little corners for shared experiences, honest stories, and the comfort of being understood.</p></div><div className="explore-search"><Search size={19}/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Find a community..."/></div><div className="community-grid">{filtered.map((c,i)=><article className="community-card" key={c.name}><div className={`community-cover cover-${c.color}`}><span>{c.icon}</span><div className="cover-leaf"><Sprout size={36}/></div><span className="community-count"><Users size={13}/>{c.members}</span></div><div className="community-card-body"><h3>{c.name}</h3><p>{c.description}</p><div className="community-card-foot"><span><Users size={14}/>{c.members} members</span><button className={joined.includes(c.name)?'join-button joined':'join-button'} onClick={()=>{toggleJoin(c.name);notify(joined.includes(c.name)?`Left ${c.name}`:`Joined ${c.name}`)}}>{joined.includes(c.name)?<><Check size={14}/> Joined</>:<><Plus size={14}/> Join</>}</button></div><button className="community-view" onClick={()=>{setTopic(c.name);setTab('Home')}}>View whispers <span>↗</span></button></div></article>)}</div>{filtered.length===0&&<div className="empty-state"><h3>No communities found</h3><p>Try another name or topic.</p></div>}</section>;
}

function ProfilePage({profile,setProfile,settings,setSettings,posts,profileEdit,setProfileEdit,editHandle,setEditHandle,editBio,setEditBio,saveProfile,session,signOut,setAuthOpen,setAuthMode,notify,coverFileRef,avatarFileRef,uploadProfileImage,coverUploading,avatarUploading}){
  const ownPosts=posts.filter(p=>session?.user?.id ? p.author_id===session.user.id : p.author===profile.handle);
  return <section className="page-section profile-page">
    <div className="profile-cover profile-cover-photo">
      {profile.cover_photo_url ? <img className="profile-cover-image" src={profile.cover_photo_url} alt={`@${profile.handle}'s cover`} /> : <div className="profile-cover-art"><Sprout size={74}/></div>}
      <div className="profile-cover-shade" />
      <span className="profile-cover-label"><ShieldCheck size={14}/> YOUR SPACE, YOUR RULES</span>
      {session&&!profile.cover_photo_url&&<button className="cover-edit-button" onClick={()=>coverFileRef.current?.click()}><ImagePlus size={15}/>{coverUploading?'Uploading…':'Add cover photo'}</button>}
      <input ref={coverFileRef} type="file" accept="image/*" hidden onChange={e=>{uploadProfileImage(e.target.files?.[0],'cover');e.target.value='';}}/>
    </div>
    {session&&profile.cover_photo_url&&<div className="cover-edit-below"><button className="button-secondary" onClick={()=>coverFileRef.current?.click()}><ImagePlus size={15}/>{coverUploading?'Uploading…':'Edit cover photo'}</button><button className="cover-remove-button" onClick={async()=>{if(!window.confirm('Remove your cover photo?'))return;const updated={...profile,cover_photo_url:null};if(cloudEnabled&&session?.user?.id){const {error}=await supabase.from('profiles').upsert({id:session.user.id,handle:updated.handle,bio:updated.bio,is_private:settings.privateAccount,avatar_url:updated.avatar_url||null,cover_photo_url:null},{onConflict:'id'});if(error){notify('Could not remove cover photo: '+error.message);return;}}setProfile(updated);notify('Cover photo removed.');}}><Trash2 size={14}/>Remove cover photo</button></div>}
    <div className="profile-main">
      <div className="profile-avatar-large profile-avatar-photo">{profile.avatar_url?<img src={profile.avatar_url} alt="Profile"/>:profile.avatar}</div>
      <div className="profile-heading-row"><div><h1>@{profile.handle}</h1><p>{profile.bio||'A quiet soul finding their words.'}</p><span className="profile-meta"><span><Leaf size={14}/>{ownPosts.length} posts</span><span><LockKeyhole size={14}/>{settings.privateAccount?'Private account':'Public account'}</span></span></div><button className="button-secondary" onClick={()=>{setEditHandle(profile.handle);setEditBio(profile.bio);setProfileEdit(!profileEdit)}}><Settings2 size={15}/> Edit profile</button></div>
      {session&&<div className="profile-photo-actions"><button className="button-secondary" onClick={()=>avatarFileRef.current?.click()}><Camera size={15}/>{avatarUploading?'Uploading…':'Change profile photo'}</button><input ref={avatarFileRef} type="file" accept="image/*" hidden onChange={e=>{uploadProfileImage(e.target.files?.[0],'avatar');e.target.value='';}}/><small className="muted">Profile photo appears beside your comments and posts. Cover photo appears at the top of your profile.</small></div>}
      {profileEdit&&<div className="settings-panel"><div className="field-group"><label className="field-label">Anonymous handle</label><input className="text-input" value={editHandle} onChange={e=>setEditHandle(e.target.value)} maxLength={22}/></div><div className="field-group"><label className="field-label">Bio</label><textarea rows={2} maxLength={120} value={editBio} onChange={e=>setEditBio(e.target.value)}/></div><button className="button-primary" onClick={saveProfile}>Save profile</button></div>}
      <div className="settings-panel"><div className="settings-title"><Settings2 size={18}/><div><h3>Privacy & account</h3><p>Choose how visible you want to be.</p></div></div><div className="setting-row"><span className="setting-icon"><LockKeyhole size={17}/></span><span className="setting-copy"><b>Private account</b><small>Private notes stay private; public confessions remain public.</small></span><button className={`switch ${settings.privateAccount?'on':''}`} role="switch" aria-checked={settings.privateAccount} onClick={async()=>{const next=!settings.privateAccount;setSettings(s=>({...s,privateAccount:next}));if(cloudEnabled&&session?.user?.id){const {error}=await supabase.from('profiles').upsert({id:session.user.id,handle:profile.handle,bio:profile.bio,is_private:next,avatar_url:profile.avatar_url||null,cover_photo_url:profile.cover_photo_url||null},{onConflict:'id'});if(error)notify(error.message);}}}><span/></button></div><div className="setting-row"><span className="setting-icon"><MessageCircle size={17}/></span><span className="setting-copy"><b>Anonymous replies</b><small>Replies display your chosen Whisper handle.</small></span><button className={`switch ${settings.anonymousReplies?'on':''}`} role="switch" aria-checked={settings.anonymousReplies} onClick={()=>setSettings(s=>({...s,anonymousReplies:!s.anonymousReplies}))}><span/></button></div><div className="setting-row"><span className="setting-icon"><ShieldCheck size={17}/></span><span className="setting-copy"><b>Anonymous identity</b><small>Your public handle is separate from your email address.</small></span><span className="verified-pill"><Check size={13}/> Active</span></div><div className="account-actions">{session?<button className="button-secondary" onClick={signOut}><LogOut size={15}/> Sign out</button>:<button className="button-primary" onClick={()=>{setAuthMode('signup');setAuthOpen(true)}}><LogIn size={15}/> Create account</button>}<button className="danger-link" onClick={()=>notify('To delete a cloud account, add an authenticated account-deletion Edge Function before launch.')}>Account deletion info</button></div></div>
      <div className="profile-posts-head"><h2>Your posts</h2><span>{ownPosts.length}</span></div>{ownPosts.length?ownPosts.map(p=><article className="post-card" key={p.id}><span className="topic-pill"><span/>{p.topic}</span><p className="post-body">{p.body}</p><small className="muted">{timeAgo(p.created_at)} · {p.visibility==='private'?'Private':'Public'}</small></article>):<div className="empty-state compact"><Sprout size={30}/><h3>Your story starts here.</h3><p>Your confessions will appear here. Only share what feels comfortable.</p></div>}
    </div>
  </section>;
}

function PublicProfilePage({user,posts,onBack}){
  const userPosts=posts.filter(p=>p.author_id===user.id&&p.visibility==='public');
  return <section className="page-section profile-page public-profile-page">
    <button className="button-secondary" onClick={onBack}><ArrowLeft size={15}/> Back to feed</button>
    <div className="profile-cover profile-cover-photo">{user.cover_photo_url ? <img className="profile-cover-image" src={user.cover_photo_url} alt={`@${user.handle}'s cover`} /> : <div className="profile-cover-art"><Sprout size={74}/></div>}<div className="profile-cover-shade"/><span className="profile-cover-label"><ShieldCheck size={14}/> THEIR SPACE, THEIR RULES</span></div>
    <div className="profile-main"><div className="profile-avatar-large profile-avatar-photo">{user.avatar_url?<img src={user.avatar_url} alt="Profile"/>:<span>{initials(user.handle)}</span>}</div><div className="profile-heading-row"><div><h1>@{user.handle}</h1><p>{user.bio||'A quiet soul finding their words.'}</p><span className="profile-meta"><span><Leaf size={14}/>{userPosts.length} public posts</span></span></div></div><div className="profile-posts-head"><h2>Public posts</h2><span>{userPosts.length}</span></div>{userPosts.length?userPosts.map(p=><article className="post-card" key={p.id}><span className="topic-pill"><span/>{p.topic}</span><p className="post-body">{p.body}</p><small className="muted">{timeAgo(p.created_at)}</small></article>):<div className="empty-state compact"><Sprout size={30}/><h3>No public posts yet</h3><p>When this person shares public confessions, they will appear here.</p></div>}</div>
  </section>;
}

export default App;