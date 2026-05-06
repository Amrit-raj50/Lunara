import React, { useState, useEffect, useRef } from 'react';
import { Save, FolderOpen, CheckCircle, AlertCircle, Layers, Upload, FileVideo, FileAudio, Image, Film, Trash2, X, Play, Loader2, Plus } from 'lucide-react';
import NLETimeline from './NLETimeline.jsx';
import { API_BASE_URL } from './apiConfig.js';

/* ── Preview Modal ── */
function PreviewModal({ videoUrl, onClose }) {
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div style={{ background: '#161b27', borderRadius: 12, width: '90%', maxWidth: 960, position: 'relative', border: '1px solid #2d3748', overflow: 'hidden' }}>
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #2d3748', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#e2e8f0' }}>Video Preview</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#718096', cursor: 'pointer' }}><X size={24} /></button>
        </div>
        <div style={{ padding: 20, background: '#000', display: 'flex', justifyContent: 'center' }}>
          <video src={videoUrl} controls autoPlay style={{ width: '100%', maxHeight: '70vh', borderRadius: 4 }} />
        </div>
        <div style={{ padding: '16px 20px', borderTop: '1px solid #2d3748', textAlign: 'right', display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
          <a href={videoUrl} download="preview.mp4" style={{ padding: '8px 24px', background: '#161b27', color: '#e2e8f0', border: '1px solid #2d3748', borderRadius: 6, fontWeight: 700, cursor: 'pointer', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <Upload size={16} style={{ transform: 'rotate(180deg)' }} /> Download Preview
          </a>
          <button onClick={onClose} style={{ padding: '8px 24px', background: '#7c6af7', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Left Editing Panel ── */
function ClipEditorPanel({ clip, trackIndex, clipIndex, tracks, setTracks, onClose }) {
  const fileInputRef = useRef(null);
  if (!clip) return null;

  const updateField = (key, val) => {
    const n = [...tracks];
    n[trackIndex].clips[clipIndex][key] = val;
    setTracks(n);
  };

  const handleFileImport = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    updateField('file_path', f.name);
    updateField('label', f.name.replace(/\.[^.]+$/, ''));
    // Store file object for later upload
    updateField('_localFile', f);

    // Auto-detect duration
    if (f.type.startsWith('video/') || f.type.startsWith('audio/')) {
      const url = URL.createObjectURL(f);
      const media = document.createElement(f.type.startsWith('video/') ? 'video' : 'audio');
      media.src = url;
      media.onloadedmetadata = () => {
        updateField('duration', media.duration);
        URL.revokeObjectURL(url);
      };
    }
  };

  const trackType = tracks[trackIndex]?.track_type || 'video';
  const colors = {
    video: { accent: '#22c55e', bg: '#0f2d1f', icon: <FileVideo size={18} /> },
    audio: { accent: '#3b82f6', bg: '#0f1d30', icon: <FileAudio size={18} /> },
    overlay: { accent: '#a855f7', bg: '#1f0f30', icon: <Image size={18} /> },
    music: { accent: '#ef4444', bg: '#2d0f0f', icon: <Film size={18} /> },
  }[trackType] || { accent: '#22c55e', bg: '#0f2d1f', icon: <FileVideo size={18} /> };

  const inputStyle = { width: '100%', padding: '8px 10px', background: '#161b27', border: '1px solid #2d3748', color: '#e2e8f0', borderRadius: 6, fontSize: '0.85rem', outline: 'none' };
  const labelStyle = { fontSize: '0.75rem', color: '#718096', display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 };

  return (
    <div style={{ width: 280, background: '#0d1117', border: '1px solid #2d3748', borderRadius: 8, display: 'flex', flexDirection: 'column', overflowY: 'auto', flexShrink: 0 }}>
      {/* Header */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid #2d3748', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ color: colors.accent }}>{colors.icon}</div>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#e2e8f0' }}>Clip Editor</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a5568', cursor: 'pointer', padding: 4 }}><X size={16} /></button>
      </div>

      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Import File */}
        <div style={{ background: colors.bg, border: `1px dashed ${colors.accent}55`, borderRadius: 8, padding: 16, textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={e => e.currentTarget.style.borderColor = colors.accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = colors.accent + '55'}>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }}
            accept={trackType === 'video' || trackType === 'overlay' ? 'video/*,image/*' : 'audio/*'}
            onChange={handleFileImport} />
          <Upload size={20} color={colors.accent} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: colors.accent }}>
            {clip.file_path ? '📁 ' + clip.file_path.split('/').pop() : 'Import File'}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#4a5568', marginTop: 4 }}>Click to browse local files</div>
        </div>

        {/* Label */}
        <div>
          <label style={labelStyle}>Label</label>
          <input value={clip.label} onChange={e => updateField('label', e.target.value)} style={inputStyle} />
        </div>

        {/* Timing */}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Start (s)</label>
            <input type="number" step="0.1" min="0" value={clip.start_time.toFixed(2)}
              onChange={e => updateField('start_time', parseFloat(e.target.value) || 0)} style={inputStyle} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Duration (s)</label>
            <input type="number" step="0.1" min="0.25" value={clip.duration.toFixed(2)}
              onChange={e => updateField('duration', parseFloat(e.target.value) || 0.25)} style={inputStyle} />
          </div>
        </div>

        {/* File Path */}
        <div>
          <label style={labelStyle}>Asset Path</label>
          <input value={clip.file_path || ''} onChange={e => updateField('file_path', e.target.value)}
            placeholder="path/to/file.mp4" style={inputStyle} />
        </div>

        {/* Placeholder toggle */}
        <div style={{ background: '#0f2d1f', border: '1px solid #22c55e33', borderRadius: 7, padding: 12 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <input type="checkbox" id="ph-left" checked={!!clip.is_placeholder} onChange={e => updateField('is_placeholder', e.target.checked)} style={{ marginTop: 2 }} />
            <div>
              <label htmlFor="ph-left" style={{ fontSize: '0.85rem', fontWeight: 700, color: '#22c55e', cursor: 'pointer' }}>Dynamic Placeholder</label>
              <p style={{ margin: '4px 0 0', fontSize: '0.72rem', color: '#4a5568', lineHeight: 1.5 }}>Replaced with user's video during Batch Render.</p>
            </div>
          </div>
        </div>

        {/* Delete */}
        <button onClick={() => { const n = [...tracks]; n[trackIndex].clips.splice(clipIndex, 1); setTracks(n); onClose(); }}
          style={{ background: '#1a0f0f', border: '1px solid #ef444466', color: '#ef4444', padding: '9px 14px', borderRadius: 6, cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
          <Trash2 size={14} /> Delete Clip
        </button>
      </div>
    </div>
  );
}

export function TemplateBuilderView() {
  const [templateName, setTemplateName] = useState('New NLE Template');
  const [templateId] = useState(crypto.randomUUID());
  const [tracks, setTracks] = useState([
    { track_id: crypto.randomUUID(), name: `Video 1`, track_type: `video`, clips: [], muted: false, locked: false },
    { track_id: crypto.randomUUID(), name: `Overlay 1`, track_type: `overlay`, clips: [], muted: false, locked: false },
    { track_id: crypto.randomUUID(), name: `Audio 1`, track_type: `audio`, clips: [], muted: false, locked: false },
    { track_id: crypto.randomUUID(), name: `Music 1`, track_type: `music`, clips: [], muted: false, locked: false },
  ]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(``);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then(r => r.json())
      .then(d => setSavedTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
      // Strip non-serializable fields (like _localFile) before sending
      const cleanTracks = tracks.map(t => ({
        ...t,
        clips: t.clips.map(c => {
          const { _localFile, ...rest } = c;
          return rest;
        }),
      }));
      const res = await fetch(`${API_BASE_URL}/api/templates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: templateId, name: templateName, tracks: cleanTracks }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      setSaveMsg(`✓ Saved!`);
      // Refresh templates list
      fetch(`${API_BASE_URL}/api/templates`).then(r => r.json()).then(d => setSavedTemplates(d.templates || [])).catch(() => {});
      setTimeout(() => setSaveMsg(``), 2000);
    } catch (err) { setSaveMsg(`Error: ` + err.message); }
    setIsSaving(false);
  };

  const generatePreview = async () => {
    setIsPreviewing(true);
    try {
      // 1. Upload local files if any
      const updatedTracks = [...tracks];
      for (let t of updatedTracks) {
        for (let c of t.clips) {
          if (c._localFile) {
            const fd = new FormData();
            fd.append(`file`, c._localFile);
            const res = await fetch(`${API_BASE_URL}/api/upload_clip`, { method: 'POST', body: fd });
            const data = await res.json();
            c.file_path = data.file_path;
            delete c._localFile; // uploaded
          }
        }
      }
      setTracks(updatedTracks);

      // 2. Request preview
      const res = await fetch(`${API_BASE_URL}/api/render/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: templateName, tracks: updatedTracks }),
      });
      const data = await res.json();
      if (data.preview_url) setPreviewUrl(data.preview_url);
      else throw new Error(data.error || `Preview failed`);
    } catch (err) { alert(`Preview Error: ` + err.message); }
    setIsPreviewing(false);
  };

  const loadTemplate = (tmpl) => {
    setTemplateName(tmpl.name);
    setTracks(tmpl.tracks || []);
    setSelectedClip(null);
    setShowTemplateList(false);
  };

  const selClip = selectedClip ? tracks[selectedClip.trackIndex]?.clips[selectedClip.clipIndex] : null;

  return (
    <div style={{ display: `flex`, flexDirection: `column`, flex: 1, padding: `20px 24px`, gap: 16, minHeight: 0, background: `#0d1117` }}>
      {/* Top bar */}
      <div style={{ display: `flex`, alignItems: `center`, gap: 12 }}>
        <div style={{ display: `flex`, alignItems: `center`, gap: 8 }}>
          <Layers size={22} color="#7c6af7" />
          <span style={{ fontSize: `1.4rem`, fontWeight: 800, color: `#e2e8f0` }}>NLE Template Builder</span>
        </div>
        <input value={templateName} onChange={e => setTemplateName(e.target.value)}
          style={{ padding: `7px 14px`, background: `#161b27`, border: `1px solid #2d3748`, color: `#e2e8f0`, borderRadius: 6, fontSize: `0.95rem`, width: 260 }} />
        <div style={{ flex: 1 }} />
        <div style={{ position: `relative` }}>
          <button onClick={() => setShowTemplateList(!showTemplateList)} style={{ padding: `8px 16px`, background: `#161b27`, border: `1px solid #2d3748`, color: `#a0aec0`, borderRadius: 6, cursor: `pointer`, display: `flex`, alignItems: `center`, gap: 6, fontSize: `0.9rem` }}>
            <FolderOpen size={15} /> Load
          </button>
          {showTemplateList && (
            <div style={{ position: `absolute`, right: 0, top: 40, background: `#161b27`, border: `1px solid #2d3748`, borderRadius: 8, minWidth: 240, zIndex: 100, boxShadow: `0 8px 32px rgba(0,0,0,0.5)` }}>
              {savedTemplates.length === 0
                ? <div style={{ padding: 16, color: `#4a5568`, fontSize: `0.85rem`, textAlign: `center` }}>No saved templates</div>
                : savedTemplates.map(t => (
                  <div key={t.template_id} onClick={() => loadTemplate(t)} style={{ padding: `10px 16px`, cursor: `pointer`, borderBottom: `1px solid #2d3748`, color: `#e2e8f0`, fontSize: `0.9rem` }}
                    onMouseEnter={e => e.currentTarget.style.background = `#1a202c`}
                    onMouseLeave={e => e.currentTarget.style.background = `transparent`}>
                    {t.name}
                  </div>
                ))
              }
            </div>
          )}
        </div>
        <button onClick={() => setTracks([...tracks, { track_id: crypto.randomUUID(), name: `Body`, track_type: `video`, clips: [], muted: false, locked: false }])} 
          style={{ padding: `8px 16px`, background: `#0d2d1f`, border: `1px solid #22c55e`, color: `#22c55e`, borderRadius: 6, cursor: `pointer`, fontWeight: 700, display: `flex`, alignItems: `center`, gap: 6, fontSize: `0.9rem` }}>
          <Plus size={15} /> Add Body Track
        </button>
        <button onClick={generatePreview} disabled={isPreviewing} style={{ padding: `8px 16px`, background: `#2d3748`, border: `1px solid #4a5568`, color: `#fff`, borderRadius: 6, cursor: `pointer`, fontWeight: 700, display: `flex`, alignItems: `center`, gap: 6, fontSize: `0.9rem` }}>
          {isPreviewing ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />} {isPreviewing ? `Rendering…` : `Preview`}
        </button>
        <button onClick={saveTemplate} disabled={isSaving} style={{ padding: `8px 20px`, background: `#7c6af7`, border: `none`, color: `#fff`, borderRadius: 6, cursor: `pointer`, fontWeight: 700, display: `flex`, alignItems: `center`, gap: 6, fontSize: `0.9rem` }}>
          <Save size={15} /> {isSaving ? `Saving…` : `Save Template`}
        </button>
        {saveMsg && <span style={{ fontSize: `0.85rem`, color: `#22c55e`, fontWeight: 700 }}>{saveMsg}</span>}
      </div>

      {previewUrl && <PreviewModal videoUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}

      {/* Main layout: Left Panel + Timeline */}
      <div style={{ display: `flex`, gap: 16, flex: 1, minHeight: 0 }}>
        {/* Left Editing Panel - shown when clip is selected */}
        {selClip && (
          <ClipEditorPanel
            clip={selClip}
            trackIndex={selectedClip.trackIndex}
            clipIndex={selectedClip.clipIndex}
            tracks={tracks}
            setTracks={setTracks}
            onClose={() => setSelectedClip(null)}
          />
        )}

        {/* Timeline */}
        <div style={{ flex: 1, minHeight: 0, display: `flex`, flexDirection: `column` }}>
          <NLETimeline tracks={tracks} setTracks={setTracks} selectedClip={selectedClip} setSelectedClip={setSelectedClip} />
          <div style={{ marginTop: 8, fontSize: `0.75rem`, color: `#4a5568` }}>
            💡 <strong style={{ color: `#718096` }}>Tip:</strong> Double-click on a track lane to add a clip. Right-click any clip for more options. Drag clips to reposition.
          </div>
        </div>
      </div>
    </div>
  );
}

export function BatchRenderView() {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(``);
  const [bodyClips, setBodyClips] = useState([]);
  const [outputPrefix, setOutputPrefix] = useState(`video_render`);
  const [thumbTitle, setThumbTitle] = useState(`Episode {n}`);
  const [exportSrt, setExportSrt] = useState(true);
  const [burnSubs, setBurnSubs] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`)
      .then(r => r.json())
      .then(d => { setTemplates(d.templates || []); if (d.templates?.length) setSelectedTemplate(d.templates[0].template_id); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!jobId || jobStatus?.status === `done` || jobStatus?.status === `error`) return;
    const t = setInterval(() => fetch(`${API_BASE_URL}/api/render/${jobId}`).then(r => r.json()).then(setJobStatus), 1000);
    return () => clearInterval(t);
  }, [jobId, jobStatus]);

  const startRender = async () => {
    const fd = new FormData();
    fd.append(`template_id`, selectedTemplate);
    fd.append(`body_clips`, JSON.stringify(bodyClips.map(c => c.path)));
    fd.append(`output_prefix`, outputPrefix);
    fd.append(`thumbnail_title`, thumbTitle);
    fd.append(`export_srt`, exportSrt);
    fd.append(`burn_subs`, burnSubs);
    const r = await fetch(`${API_BASE_URL}/api/render/batch`, { method: 'POST', body: fd });
    const d = await r.json();
    setJobId(d.job_id);
  };

  const previewClip = async (clipPath) => {
    setIsPreviewing(true);
    try {
      const tmpl = templates.find(t => t.template_id === selectedTemplate);
      const res = await fetch(`${API_BASE_URL}/api/render/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...tmpl, body_clip: clipPath }),
      });
      const data = await res.json();
      if (data.preview_url) setPreviewUrl(data.preview_url);
      else throw new Error(data.error || `Preview failed`);
    } catch (err) { alert(`Preview Error: ` + err.message); }
    setIsPreviewing(false);
  };

  const S = (label, val, onChange, type = `text`, extra = {}) => (
    <div>
      <label style={{ display: `block`, fontSize: `0.8rem`, marginBottom: 5, color: `#718096` }}>{label}</label>
      <input type={type} value={val} onChange={e => onChange(e.target.value)}
        style={{ width: `100%`, padding: `8px 10px`, background: `#161b27`, border: `1px solid #2d3748`, color: `#e2e8f0`, borderRadius: 5, fontSize: `0.88rem`, ...extra }} />
    </div>
  );

  return (
    <div style={{ padding: `28px 32px`, flex: 1, display: `flex`, flexDirection: `column`, background: `#0d1117`, color: `#e2e8f0` }}>
      <div style={{ display: `flex`, alignItems: `center`, justifyContent: `space-between`, marginBottom: 24 }}>
        <h2 style={{ margin: 0, fontSize: `1.6rem`, fontWeight: 800 }}>Batch Rendering</h2>
        <button 
          onClick={() => bodyClips.length > 0 ? previewClip(bodyClips[0].path) : alert("Add at least one body clip to preview.")} 
          disabled={isPreviewing || bodyClips.length === 0}
          style={{ padding: `10px 24px`, background: `#2d3748`, border: `1px solid #4a5568`, color: `#fff`, borderRadius: 8, cursor: `pointer`, fontWeight: 700, display: `flex`, alignItems: `center`, gap: 8, fontSize: `0.95rem` }}
        >
          {isPreviewing ? <Loader2 size={18} className="animate-spin" /> : <Play size={18} />} 
          {isPreviewing ? `Rendering Preview…` : `Preview First Render`}
        </button>
      </div>
      <div style={{ display: `flex`, gap: 20, marginBottom: 20 }}>
        <div style={{ flex: 1, background: `#0d1117`, border: `1px solid #2d3748`, borderRadius: 8, padding: 20, display: `flex`, flexDirection: `column`, gap: 14 }}>
          <h3 style={{ margin: 0, fontSize: `1rem`, color: `#a0aec0` }}>Configuration</h3>
          <div>
            <label style={{ display: `block`, fontSize: `0.8rem`, marginBottom: 5, color: `#718096` }}>Framework Template</label>
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
              style={{ width: `100%`, padding: `8px`, background: `#161b27`, border: `1px solid #2d3748`, color: `#e2e8f0`, borderRadius: 5 }}>
              {templates.map(t => <option key={t.template_id} value={t.template_id}>{t.name}</option>)}
            </select>
          </div>
          {S(`Output Prefix`, outputPrefix, setOutputPrefix)}
          {S(`Thumbnail Title (use {n} for number)`, thumbTitle, setThumbTitle)}
          <div style={{ background: `#161b27`, border: `1px solid #2d3748`, borderRadius: 6, padding: 14 }}>
            <div style={{ fontSize: `0.85rem`, fontWeight: 700, marginBottom: 10, color: `#a0aec0` }}>Auto-Captions (Whisper AI)</div>
            {[[`export_srt_cb`, `Export .SRT subtitle file`, exportSrt, setExportSrt], [`burn_subs_cb`, `Burn subtitles into video`, burnSubs, setBurnSubs]].map(([id, label, val, set]) => (
              <label key={id} style={{ display: `flex`, alignItems: `center`, gap: 8, marginBottom: 8, cursor: `pointer`, fontSize: `0.85rem` }}>
                <input type="checkbox" id={id} checked={val} onChange={e => set(e.target.checked)} /> {label}
              </label>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, background: `#0d1117`, border: `1px solid #2d3748`, borderRadius: 8, padding: 20, display: `flex`, flexDirection: `column` }}>
          <h3 style={{ margin: `0 0 14px`, fontSize: `1rem`, color: `#a0aec0` }}>Body Clips ({bodyClips.length})</h3>
          <div style={{ flex: 1, background: `#161b27`, border: `1px solid #2d3748`, borderRadius: 6, padding: 10, marginBottom: 12, overflowY: `auto`, maxHeight: 180 }}>
            {bodyClips.length === 0
              ? <div style={{ color: `#4a5568`, fontSize: `0.85rem`, textAlign: `center`, marginTop: 40 }}>No body clips added.</div>
              : bodyClips.map((c, i) => (
                <div key={i} style={{ display: `flex`, justifyContent: `space-between`, alignItems: `center`, padding: `6px 4px`, borderBottom: `1px solid #2d3748`, fontSize: `0.85rem` }}>
                  <span>{i + 1}. {c.name}</span>
                  <div style={{ display: `flex`, gap: 8 }}>
                    <button onClick={() => previewClip(c.path)} title="Preview" style={{ background: `none`, border: `none`, color: `#7c6af7`, cursor: `pointer`, display: `flex`, alignItems: `center` }}>
                      <Play size={14} />
                    </button>
                    <button onClick={() => setBodyClips(bodyClips.filter((_, j) => j !== i))} style={{ background: `none`, border: `none`, color: `#ef4444`, cursor: `pointer`, fontSize: 14 }}>×</button>
                  </div>
                </div>
              ))
            }
          </div>
          {previewUrl && <PreviewModal videoUrl={previewUrl} onClose={() => setPreviewUrl(null)} />}
          {isPreviewing && (
            <div style={{ position: `fixed`, top: 0, left: 0, right: 0, bottom: 0, background: `rgba(0,0,0,0.5)`, zIndex: 10000, display: `flex`, alignItems: `center`, justifyContent: `center`, color: `#fff`, flexDirection: `column`, gap: 12 }}>
              <Loader2 className="animate-spin" size={40} />
              <div style={{ fontWeight: 700 }}>Generating Preview…</div>
            </div>
          )}
          <div style={{ display: `flex`, gap: 8 }}>
            <label style={{ flex: 1, textAlign: `center`, cursor: `pointer`, padding: `8px`, borderRadius: 5, border: `1px solid #2d3748`, color: `#a0aec0`, fontSize: `0.85rem`, display: `flex`, alignItems: `center`, justifyContent: `center`, gap: 6 }}>
              <input type="file" style={{ display: `none` }} onChange={async (e) => {
                const f = e.target.files[0];
                if (f) {
                  // Instant upload
                  const fd = new FormData();
                  fd.append(`file`, f);
                  try {
                    const res = await fetch(`${API_BASE_URL}/api/upload_clip`, { method: 'POST', body: fd });
                    const data = await res.json();
                    setBodyClips([...bodyClips, { name: f.name, path: data.file_path }]);
                  } catch (err) {
                    alert("Upload failed: " + err.message);
                  }
                }
              }} />
              <Upload size={14} /> Add Body Clip
            </label>
            <button onClick={() => setBodyClips([])} style={{ padding: `8px 14px`, border: `1px solid #ef444466`, background: `transparent`, color: `#ef4444`, borderRadius: 5, cursor: `pointer` }}>Clear</button>
          </div>
        </div>
      </div>

      <button onClick={startRender} disabled={bodyClips.length === 0 || !!jobId}
        style={{ padding: '14px', background: bodyClips.length === 0 || !!jobId ? '#2d3748' : '#7c6af7', border: 'none', color: '#fff', borderRadius: 8, cursor: bodyClips.length === 0 || !!jobId ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '1.05rem', marginBottom: 24 }}>
        {jobId ? (jobStatus?.status === 'done' ? '✓ Rendering Complete!' : '⏳ Rendering in Progress…') : `▶ Render All ${bodyClips.length} Videos`}
      </button>

      {jobId && jobStatus && (
        <div style={{ background: '#0d1117', border: '1px solid #2d3748', borderRadius: 8, padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ margin: 0 }}>Render Queue</h3>
            <span style={{ fontSize: '0.85rem', color: '#718096' }}>{jobStatus.status?.toUpperCase()}</span>
          </div>
          <div style={{ height: 8, background: '#161b27', borderRadius: 4, marginBottom: 20, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#5dcaa5', width: `${(jobStatus.progress || 0) * 100}%`, transition: 'width 0.4s' }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
            <thead><tr style={{ borderBottom: '1px solid #2d3748', color: '#718096', textAlign: 'left' }}>
              <th style={{ paddingBottom: 8 }}>#</th>
              <th style={{ paddingBottom: 8 }}>Clip</th>
              <th style={{ paddingBottom: 8 }}>Status</th>
            </tr></thead>
            <tbody>
              {bodyClips.map((c, i) => {
                const res = jobStatus.results?.find(r => r.video_index === i + 1);
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #1a202c' }}>
                    <td style={{ padding: '10px 0' }}>{i + 1}</td>
                    <td style={{ padding: '10px 0' }}>{c.name}</td>
                    <td style={{ padding: '10px 0', display: 'flex', alignItems: 'center', gap: 12 }}>
                      {!res ? <span style={{ color: '#4a5568' }}>Pending</span>
                        : res.success ? (
                          <>
                            <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4 }}><CheckCircle size={13} /> Done</span>
                            <a href={`${API_BASE_URL}/api/render/output/${res.output_name}`} download style={{ color: '#7c6af7', textDecoration: 'none', fontSize: '0.75rem', fontWeight: 700, border: '1px solid #7c6af7', padding: '2px 8px', borderRadius: 4 }}>Download</a>
                          </>
                        )
                          : <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 4 }}><AlertCircle size={13} /> Error</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
