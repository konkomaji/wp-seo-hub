import { useState, useEffect, useRef } from 'react';
import { X, Upload, Image, Tag, Folder, Send, Save, Loader, CheckCircle, AlertCircle, Eye, EyeOff, Copy, ChevronDown, ChevronUp, Globe, Lock, MessageSquare } from 'lucide-react';
import { generateId, saveLocalPost } from '../store/store';
import { fetchCategories, fetchTags, uploadMedia, createDraftPost, createTag } from '../utils/wpApi';
import { format } from 'date-fns';
import { C } from '../theme';

const SCHEMA_TYPES = [
  { value: '',             label: 'Default (auto-detect)' },
  { value: 'Article',      label: 'Article' },
  { value: 'BlogPosting',  label: 'Blog Post' },
  { value: 'NewsArticle',  label: 'News Article' },
  { value: 'HowTo',        label: 'How-To Guide' },
  { value: 'FAQPage',      label: 'FAQ Page' },
  { value: 'Product',      label: 'Product' },
  { value: 'Review',       label: 'Review' },
  { value: 'Recipe',       label: 'Recipe' },
  { value: 'Event',        label: 'Event' },
  { value: 'LocalBusiness', label: 'Local Business' },
  { value: 'VideoObject',  label: 'Video' },
  { value: 'Course',       label: 'Course' },
];

export default function PostComposer({ client, scheduledDate, editPost, onClose, onSaved }) {
  const [title, setTitle]             = useState(editPost?.title || '');
  const [content, setContent]         = useState(editPost?.content || '');
  const [excerpt, setExcerpt]         = useState(editPost?.excerpt || '');
  const [slug, setSlug]               = useState(editPost?.slug || '');
  const [focusKeyword, setFocusKeyword]   = useState(editPost?.focusKeyword || '');
  const [metaTitle, setMetaTitle]         = useState(editPost?.metaTitle || '');
  const [metaDescription, setMetaDescription] = useState(editPost?.metaDescription || '');

  // Advanced SEO
  const [noindex, setNoindex]             = useState(editPost?.noindex || false);
  const [nofollow, setNofollow]           = useState(editPost?.nofollow || false);
  const [canonicalUrl, setCanonicalUrl]   = useState(editPost?.canonicalUrl || '');
  const [ogTitle, setOgTitle]             = useState(editPost?.ogTitle || '');
  const [ogDescription, setOgDescription] = useState(editPost?.ogDescription || '');
  const [twitterTitle, setTwitterTitle]   = useState(editPost?.twitterTitle || '');
  const [schemaType, setSchemaType]       = useState(editPost?.schemaType || '');

  // Post options
  const [postStatus, setPostStatus]       = useState(editPost?.postStatus || 'draft');
  const [commentStatus, setCommentStatus] = useState(editPost?.commentStatus || 'open');
  const [postPassword, setPostPassword]   = useState('');
  const [schedDate, setSchedDate]         = useState(
    scheduledDate ? format(scheduledDate, 'yyyy-MM-dd') : (editPost?.schedDate || '')
  );
  const [schedTime, setSchedTime]         = useState(editPost?.schedTime || '09:00');

  // Media
  const [featuredImage, setFeaturedImage]     = useState(editPost?.featuredImagePreview || null);
  const [featuredImageFile, setFeaturedImageFile] = useState(null);

  // Taxonomy
  const [categories, setCategories] = useState([]);
  const [tags, setTags]             = useState([]);
  const [selectedCats, setSelectedCats] = useState(editPost?.categoryIds || []);
  const [selectedTags, setSelectedTags] = useState(editPost?.tagIds || []);
  const [newTag, setNewTag]         = useState('');

  // UI state
  const [pushing, setPushing]       = useState(false);
  const [saving, setSaving]         = useState(false);
  const [status, setStatus]         = useState(null);
  const [wordCount, setWordCount]   = useState(0);
  const [seoTab, setSeoTab]         = useState('basic');
  const [preview, setPreview]       = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (client) {
      fetchCategories(client).then(setCategories).catch(() => {});
      fetchTags(client).then(setTags).catch(() => {});
    }
  }, [client]);

  useEffect(() => {
    const stripped = content.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    setWordCount(stripped ? stripped.split(' ').length : 0);
    if (!slug && title) setSlug(title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
    if (!metaTitle && title) setMetaTitle(title);
  }, [content, title]);

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFeaturedImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setFeaturedImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    const existing = tags.find(t => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) { if (!selectedTags.includes(existing.id)) setSelectedTags(s => [...s, existing.id]); }
    else { setTags(t => [...t, { id: `new_${trimmed}`, name: trimmed, isNew: true }]); setSelectedTags(s => [...s, `new_${trimmed}`]); }
    setNewTag('');
  };

  const getLocalPost = () => ({
    localId:              editPost?.localId || generateId(),
    title, content, excerpt, slug, focusKeyword, metaTitle, metaDescription,
    noindex, nofollow, canonicalUrl, ogTitle, ogDescription, twitterTitle, schemaType,
    postStatus, commentStatus, schedDate, schedTime,
    categoryIds:          selectedCats,
    tagIds:               selectedTags,
    featuredImagePreview: featuredImage,
    scheduledDate:        schedDate ? new Date(`${schedDate}T${schedTime}`).toISOString() : scheduledDate?.toISOString(),
    clientId:             client.id,
    clientName:           client.name,
    savedAt:              new Date().toISOString(),
    wpPostId:             editPost?.wpPostId || null,
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    await saveLocalPost(client.id, getLocalPost());
    setSaving(false);
    setStatus({ ok: true, msg: 'Saved locally.' });
    onSaved?.();
  };

  const handlePushToWP = async () => {
    if (!title || !content) { setStatus({ ok: false, msg: 'Title and content are required.' }); return; }
    setPushing(true); setStatus(null);
    try {
      let featuredMediaId = null;
      if (featuredImageFile) {
        setStatus({ ok: null, msg: 'Uploading featured image…' });
        const media = await uploadMedia(client, featuredImageFile);
        featuredMediaId = media.id;
      }
      const resolvedTagIds = [];
      for (const id of selectedTags) {
        if (typeof id === 'string' && id.startsWith('new_')) {
          const created = await createTag(client, id.replace('new_', ''));
          if (created) resolvedTagIds.push(created.id);
        } else resolvedTagIds.push(id);
      }

      // Determine effective status + schedule
      let effectiveStatus = postStatus;
      let scheduledIso    = '';
      if (postStatus === 'future' && schedDate) {
        scheduledIso    = new Date(`${schedDate}T${schedTime}`).toISOString();
        effectiveStatus = 'future';
      }

      setStatus({ ok: null, msg: 'Pushing post to WordPress…' });
      const wpPost = await createDraftPost(client, {
        title, content, excerpt, slug,
        status:         effectiveStatus,
        categoryIds:    selectedCats,
        tagIds:         resolvedTagIds,
        featuredMediaId,
        focusKeyword,   metaTitle,   metaDescription,
        scheduledDate:  scheduledIso,
        noindex,        nofollow,
        canonicalUrl,   ogTitle,     ogDescription,
        twitterTitle,   schemaType,
        commentStatus,  postPassword,
      });

      const post = { ...getLocalPost(), wpPostId: wpPost.id, wpPostLink: wpPost.link, pushedAt: new Date().toISOString() };
      await saveLocalPost(client.id, post);
      setStatus({ ok: true, msg: `${effectiveStatus === 'publish' ? 'Published' : effectiveStatus === 'future' ? 'Scheduled' : 'Draft created'} in WordPress! ID: ${wpPost.id}` });
      onSaved?.();
    } catch (e) {
      setStatus({ ok: false, msg: e.message });
    }
    setPushing(false);
  };

  const claudeContext = `You are writing a blog post for ${client.name}${client.industry ? ` (${client.industry})` : ''}.
Company Info: ${client.description || 'N/A'}
Focus Keyword: ${focusKeyword || 'Not set'}
Target Slug: /${slug || ''}
Write a comprehensive, SEO-optimised blog post. Use H2 and H3 headings. Include a meta description of 150–160 characters.`;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 1000, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
      <div style={{ background: C.bg3, border: `1px solid ${C.b2}`, borderRadius: 14, width: '100%', maxWidth: 920, position: 'relative' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 24px', borderBottom: `1px solid ${C.b1}` }}>
          <div>
            <div style={{ fontSize: 11, color: C.accent, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{client.name}</div>
            <div style={{ fontSize: 15, color: C.t1, fontWeight: 500 }}>
              {schedDate ? `Post for ${format(new Date(schedDate), 'EEE, MMM d')}` : 'New Post'}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: C.t3 }}>{wordCount} words</span>
            <button onClick={() => setPreview(!preview)} style={iconBtn}>{preview ? <EyeOff size={15} /> : <Eye size={15} />}</button>
            <button onClick={onClose} style={iconBtn}><X size={15} /></button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: preview ? '1fr 1fr' : '1fr', gap: 0 }}>
          <div style={{ padding: 24 }}>

            {/* Title */}
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Post title…"
              style={{ ...inputStyle, fontSize: 18, fontFamily: C.fontSerif, marginBottom: 16 }} />

            {/* Content */}
            <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Write your content here (HTML or plain text)…"
              style={{ ...inputStyle, height: 260, resize: 'vertical', fontFamily: 'monospace', fontSize: 13, marginBottom: 12 }} />

            {/* Excerpt */}
            <textarea value={excerpt} onChange={e => setExcerpt(e.target.value)} placeholder="Short excerpt / teaser (optional)…"
              style={{ ...inputStyle, height: 56, resize: 'none', fontSize: 13, marginBottom: 20 }} />

            {/* Featured Image */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}><Image size={12} style={{ marginRight: 5 }} />Featured Image</label>
              <div onClick={() => fileRef.current.click()}
                style={{ border: `1px dashed ${C.b3}`, borderRadius: 10, padding: featuredImage ? 0 : '20px 16px', cursor: 'pointer', textAlign: 'center', overflow: 'hidden', position: 'relative' }}>
                {featuredImage ? (
                  <>
                    <img src={featuredImage} alt="Featured" style={{ width: '100%', maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <button onClick={e => { e.stopPropagation(); setFeaturedImage(null); setFeaturedImageFile(null); }} style={{ ...iconBtn, background: C.bg1 + 'cc' }}><X size={13} /></button>
                    </div>
                  </>
                ) : (
                  <>
                    <Image size={22} color={C.t4} style={{ margin: '0 auto 8px' }} />
                    <div style={{ fontSize: 13, color: C.t3 }}>Click to upload featured image</div>
                    <div style={{ fontSize: 11, color: C.t4, marginTop: 3 }}>JPG, PNG, WebP — uploads to WP Media Library</div>
                  </>
                )}
                <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Categories */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}><Folder size={12} style={{ marginRight: 5 }} />Categories</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {categories.map(cat => (
                  <button key={cat.id} onClick={() => setSelectedCats(s => s.includes(cat.id) ? s.filter(c => c !== cat.id) : [...s, cat.id])}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                      background: selectedCats.includes(cat.id) ? C.accentBg : C.bg4,
                      border: `1px solid ${selectedCats.includes(cat.id) ? C.accentBd : C.b2}`,
                      color: selectedCats.includes(cat.id) ? C.accent : C.t3 }}>
                    {cat.name}
                  </button>
                ))}
                {categories.length === 0 && <span style={{ fontSize: 12, color: C.t4 }}>Connect client to load categories</span>}
              </div>
            </div>

            {/* Tags */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle}><Tag size={12} style={{ marginRight: 5 }} />Tags</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                {tags.map(tag => (
                  <button key={tag.id} onClick={() => setSelectedTags(s => s.includes(tag.id) ? s.filter(t => t !== tag.id) : [...s, tag.id])}
                    style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, cursor: 'pointer', fontFamily: 'inherit',
                      background: selectedTags.includes(tag.id) ? C.blueBg : C.bg4,
                      border: `1px solid ${selectedTags.includes(tag.id) ? C.blueBd : C.b2}`,
                      color: selectedTags.includes(tag.id) ? C.blue : C.t3 }}>
                    {tag.name}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add new tag…" style={{ ...inputStyle, fontSize: 12, padding: '7px 10px', flex: 1 }} />
                <button onClick={handleAddTag} style={{ ...iconBtn }}>Add</button>
              </div>
            </div>

            {/* SEO Panel */}
            <div style={{ background: C.bg4, border: `1px solid ${C.b2}`, borderRadius: 10, marginBottom: 20 }}>
              {/* Tab header */}
              <div style={{ display: 'flex', borderBottom: `1px solid ${C.b1}` }}>
                {[
                  { id: 'basic',    label: 'Basic SEO' },
                  { id: 'advanced', label: 'Advanced SEO' },
                  { id: 'social',   label: 'Social / OG' },
                ].map(t => (
                  <button key={t.id} onClick={() => setSeoTab(t.id)}
                    style={{ flex: 1, padding: '10px', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12,
                      color: seoTab === t.id ? C.accent : C.t3,
                      borderBottom: `2px solid ${seoTab === t.id ? C.accent : 'transparent'}`,
                      marginBottom: -1 }}>
                    {t.label}
                  </button>
                ))}
              </div>

              <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

                {seoTab === 'basic' && <>
                  <div>
                    <label style={labelStyle}>Focus Keyword</label>
                    <input value={focusKeyword} onChange={e => setFocusKeyword(e.target.value)} placeholder="Primary SEO keyword for this post" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>URL Slug</label>
                    <div style={{ display: 'flex', alignItems: 'center', background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 7, overflow: 'hidden' }}>
                      <span style={{ padding: '9px 10px', color: C.t3, fontSize: 12, borderRight: `1px solid ${C.b2}` }}>/</span>
                      <input value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} style={{ ...inputStyle, border: 'none', borderRadius: 0 }} />
                    </div>
                  </div>
                  <div>
                    <label style={{ ...labelStyle, justifyContent: 'space-between' }}>
                      Meta Title
                      <span style={{ color: metaTitle.length > 60 ? C.red : C.t4 }}>{metaTitle.length}/60</span>
                    </label>
                    <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} placeholder="SEO title (50–60 chars)"
                      style={{ ...inputStyle, borderColor: metaTitle.length > 60 ? C.redBd : C.b2 }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, justifyContent: 'space-between' }}>
                      Meta Description
                      <span style={{ color: metaDescription.length > 160 ? C.red : C.t4 }}>{metaDescription.length}/160</span>
                    </label>
                    <textarea value={metaDescription} onChange={e => setMetaDescription(e.target.value)} placeholder="SEO description (150–160 chars)"
                      style={{ ...inputStyle, height: 70, resize: 'none', fontSize: 13, borderColor: metaDescription.length > 160 ? C.redBd : C.b2 }} />
                  </div>
                </>}

                {seoTab === 'advanced' && <>
                  <div>
                    <label style={labelStyle}>Schema Type (Structured Data)</label>
                    <select value={schemaType} onChange={e => setSchemaType(e.target.value)}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      {SCHEMA_TYPES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Canonical URL <span style={{ color: C.t4, fontWeight: 400 }}>(leave blank = current URL)</span></label>
                    <input value={canonicalUrl} onChange={e => setCanonicalUrl(e.target.value)} placeholder="https://yoursite.com/canonical-url/" style={inputStyle} />
                  </div>
                  <div style={{ display: 'flex', gap: 20 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.t2 }}>
                      <input type="checkbox" checked={noindex} onChange={e => setNoindex(e.target.checked)} style={{ width: 16, height: 16 }} />
                      Noindex <span style={{ fontSize: 11, color: C.t4 }}>(hide from search engines)</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.t2 }}>
                      <input type="checkbox" checked={nofollow} onChange={e => setNofollow(e.target.checked)} style={{ width: 16, height: 16 }} />
                      Nofollow <span style={{ fontSize: 11, color: C.t4 }}>(no link equity passed)</span>
                    </label>
                  </div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: C.t2 }}>
                      <input type="checkbox" checked={commentStatus === 'open'} onChange={e => setCommentStatus(e.target.checked ? 'open' : 'closed')} style={{ width: 16, height: 16 }} />
                      <MessageSquare size={13} /> Allow Comments
                    </label>
                  </div>
                </>}

                {seoTab === 'social' && <>
                  <div>
                    <label style={{ ...labelStyle, justifyContent: 'space-between' }}>
                      OG Title (Facebook / LinkedIn)
                      <span style={{ color: C.t4 }}>{ogTitle.length}/90</span>
                    </label>
                    <input value={ogTitle} onChange={e => setOgTitle(e.target.value)} placeholder="Leave blank to use meta title" style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, justifyContent: 'space-between' }}>
                      OG Description
                      <span style={{ color: C.t4 }}>{ogDescription.length}/200</span>
                    </label>
                    <textarea value={ogDescription} onChange={e => setOgDescription(e.target.value)} placeholder="Leave blank to use meta description"
                      style={{ ...inputStyle, height: 70, resize: 'none', fontSize: 13 }} />
                  </div>
                  <div>
                    <label style={{ ...labelStyle, justifyContent: 'space-between' }}>
                      Twitter Title
                      <span style={{ color: C.t4 }}>{twitterTitle.length}/70</span>
                    </label>
                    <input value={twitterTitle} onChange={e => setTwitterTitle(e.target.value)} placeholder="Leave blank to use meta title" style={inputStyle} />
                  </div>
                  <div style={{ fontSize: 12, color: C.t4, lineHeight: 1.6 }}>
                    OG image is the featured image. OG Title/Description override the meta title/desc for social sharing previews on Facebook, LinkedIn, Twitter/X, and WhatsApp.
                  </div>
                </>}
              </div>
            </div>

            {/* Publish Options */}
            <div style={{ background: C.bg4, border: `1px solid ${C.b2}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 12, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Publish Settings</div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                {[
                  { v: 'draft',   label: 'Save as Draft' },
                  { v: 'publish', label: 'Publish Now' },
                  { v: 'future',  label: 'Schedule' },
                  { v: 'private', label: 'Private' },
                ].map(s => (
                  <label key={s.v} style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer', fontSize: 13, color: postStatus === s.v ? C.accent : C.t3, fontWeight: postStatus === s.v ? 500 : 400 }}>
                    <input type="radio" name="postStatus" value={s.v} checked={postStatus === s.v} onChange={() => setPostStatus(s.v)} />
                    {s.label}
                  </label>
                ))}
              </div>

              {postStatus === 'future' && (
                <div style={{ display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Date</label>
                    <input type="date" value={schedDate} onChange={e => setSchedDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ width: 120 }}>
                    <label style={labelStyle}>Time</label>
                    <input type="time" value={schedTime} onChange={e => setSchedTime(e.target.value)} style={inputStyle} />
                  </div>
                </div>
              )}

              {postStatus === 'private' && (
                <div>
                  <label style={labelStyle}><Lock size={12} style={{ marginRight: 5 }} />Password Protection <span style={{ color: C.t4 }}>(optional — leave blank for admin/editor-only access)</span></label>
                  <input type="password" value={postPassword} onChange={e => setPostPassword(e.target.value)} placeholder="Set a password to allow public access with password" style={inputStyle} />
                </div>
              )}
            </div>

            {/* Claude context prompt */}
            <div style={{ background: C.greenBg, border: `1px solid ${C.greenBd}`, borderRadius: 10, padding: '12px 14px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <span style={{ fontSize: 12, color: C.green, fontWeight: 500 }}>Quick Claude Prompt</span>
                <button onClick={() => navigator.clipboard.writeText(claudeContext)} style={{ ...iconBtn, fontSize: 11, color: C.green, padding: '3px 8px' }}>
                  <Copy size={11} /> Copy
                </button>
              </div>
              <pre style={{ margin: 0, fontSize: 11, color: '#4a8a4a', fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{claudeContext}</pre>
            </div>

            {/* Status */}
            {status && (
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 14,
                background: status.ok === true ? C.greenBg : status.ok === false ? C.redBg : C.accentBg,
                border: `1px solid ${status.ok === true ? C.greenBd : status.ok === false ? C.redBd : C.accentBd}` }}>
                {status.ok === true  ? <CheckCircle size={14} color={C.green}  style={{ flexShrink: 0, marginTop: 1 }} />
                : status.ok === false ? <AlertCircle size={14} color={C.red}    style={{ flexShrink: 0, marginTop: 1 }} />
                : <Loader size={14} color={C.accent} style={{ flexShrink: 0, marginTop: 1, animation: 'spin 1s linear infinite' }} />}
                <span style={{ fontSize: 13, color: status.ok === true ? C.green : status.ok === false ? C.red : C.accent }}>{status.msg}</span>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={handleSaveDraft} disabled={saving}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: C.bg4, color: C.t2, border: `1px solid ${C.b3}`, borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Save size={14} /> Save Locally
              </button>
              <button onClick={handlePushToWP} disabled={pushing}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: postStatus === 'publish' ? C.green : C.accent, color: C.bg1, border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}>
                {pushing ? <Loader size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={14} />}
                {pushing ? 'Pushing…'
                  : postStatus === 'publish' ? 'Publish to WordPress'
                  : postStatus === 'future'  ? 'Schedule on WordPress'
                  : postStatus === 'private' ? 'Save Private on WordPress'
                  : 'Push Draft to WordPress'}
              </button>
            </div>
          </div>

          {/* Preview */}
          {preview && (
            <div style={{ borderLeft: `1px solid ${C.b1}`, padding: 24, overflowY: 'auto', maxHeight: '90vh' }}>
              <div style={{ fontSize: 11, color: C.t3, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Preview</div>
              {featuredImage && <img src={featuredImage} alt="" style={{ width: '100%', borderRadius: 8, marginBottom: 16 }} />}
              <h1 style={{ fontFamily: C.fontSerif, fontSize: 22, color: C.t1, margin: '0 0 12px', lineHeight: 1.3 }}>{title || 'Post Title'}</h1>
              {focusKeyword && <div style={{ display: 'inline-block', fontSize: 11, color: C.accent, background: C.accentBg, border: `1px solid ${C.accentBd}`, borderRadius: 20, padding: '3px 10px', marginBottom: 16 }}>{focusKeyword}</div>}
              {schemaType && <div style={{ fontSize: 11, color: C.purple, background: C.purpleBg, border: `1px solid ${C.purpleBd}`, borderRadius: 20, padding: '3px 10px', marginBottom: 16, marginLeft: 6, display: 'inline-block' }}>Schema: {schemaType}</div>}
              <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.8 }} dangerouslySetInnerHTML={{ __html: content || '<em style="color:#404060">Content will appear here…</em>' }} />
              {metaTitle && (
                <div style={{ marginTop: 20, padding: '12px 14px', background: C.bg2, borderRadius: 8, border: `1px solid ${C.b1}` }}>
                  <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Meta Title ({metaTitle.length} chars)</div>
                  <div style={{ fontSize: 13, color: C.t1, fontWeight: 500 }}>{metaTitle}</div>
                </div>
              )}
              {metaDescription && (
                <div style={{ marginTop: 8, padding: '12px 14px', background: C.bg2, borderRadius: 8, border: `1px solid ${C.b1}` }}>
                  <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Meta Description ({metaDescription.length} chars)</div>
                  <div style={{ fontSize: 12, color: C.t2 }}>{metaDescription}</div>
                </div>
              )}
              {(ogTitle || ogDescription) && (
                <div style={{ marginTop: 8, padding: '12px 14px', background: C.bg2, borderRadius: 8, border: `1px solid ${C.b1}` }}>
                  <div style={{ fontSize: 11, color: C.t3, marginBottom: 4 }}>Social Preview (OG)</div>
                  {ogTitle && <div style={{ fontSize: 13, color: C.t1, fontWeight: 500, marginBottom: 3 }}>{ogTitle}</div>}
                  {ogDescription && <div style={{ fontSize: 12, color: C.t2 }}>{ogDescription}</div>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const labelStyle = { display: 'flex', marginBottom: 6, fontSize: 12, color: C.t3, letterSpacing: '0.04em', alignItems: 'center' };
const inputStyle = { width: '100%', background: C.bg2, border: `1px solid ${C.b2}`, borderRadius: 7, padding: '9px 12px', color: C.t1, fontSize: 14, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' };
const iconBtn = { background: C.bg4, border: `1px solid ${C.b2}`, borderRadius: 6, padding: '6px 9px', color: C.t3, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, fontFamily: 'inherit' };
