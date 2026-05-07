import React, { useState, useEffect, useRef } from 'react';
import { Save, FolderOpen, CheckCircle, AlertCircle, Layers, Upload, FileVideo, FileAudio, Image, Film, Trash2, X, Play, Loader2, Plus, Music } from 'lucide-react';
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

/* ── Premium Sidebar Clip Editor ── */
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
    updateField('_localFile', f);

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
  const theme = {
    video: { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.2)', icon: <Film size={18} /> },
    audio: { accent: '#3b82f6', glow: 'rgba(59, 130, 246, 0.2)', icon: <FileAudio size={18} /> },
    overlay: { accent: '#8b5cf6', glow: 'rgba(139, 92, 246, 0.2)', icon: <Image size={18} /> },
    music: { accent: '#ef4444', glow: 'rgba(239, 68, 68, 0.2)', icon: <Music size={18} /> },
  }[trackType] || { accent: '#10b981', glow: 'rgba(16, 185, 129, 0.2)', icon: <Film size={18} /> };

  const inputStyle = { 
    width: '100%', 
    padding: '10px 12px', 
    background: 'rgba(255,255,255,0.03)', 
    border: '1px solid rgba(255,255,255,0.1)', 
    color: '#fff', 
    borderRadius: 8, 
    fontSize: '0.85rem', 
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s'
  };
  
  const labelStyle = { 
    fontSize: '0.7rem', 
    color: '#94a3b8', 
    display: 'block', 
    marginBottom: 6, 
    fontWeight: 700, 
    textTransform: 'uppercase', 
    letterSpacing: '0.05em' 
  };

  return (
    <div style={{ 
      width: 320, 
      background: 'rgba(15, 23, 42, 0.8)', 
      backdropFilter: 'blur(16px)', 
      borderRight: '1px solid rgba(255,255,255,0.1)', 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100%',
      boxShadow: '10px 0 30px rgba(0,0,0,0.3)',
      zIndex: 50
    }}>
      <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: 8, borderRadius: 8, background: theme.glow, color: theme.accent }}>{theme.icon}</div>
          <span style={{ fontSize: '1rem', fontWeight: 800, color: '#f8fafc', letterSpacing: -0.5 }}>Inspector</span>
        </div>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 6, borderRadius: '50%', display: 'flex' }}><X size={16} /></button>
      </div>

      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
        {/* Asset Card */}
        <div style={{ 
          background: 'rgba(255,255,255,0.02)', 
          border: `1px dashed ${theme.accent}44`, 
          borderRadius: 12, 
          padding: 24, 
          textAlign: 'center', 
          cursor: 'pointer',
          transition: 'all 0.2s'
        }}
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = theme.accent; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = theme.accent + '44'; }}>
          <input ref={fileInputRef} type="file" style={{ display: 'none' }}
            accept={trackType === 'video' || trackType === 'overlay' ? 'video/*,image/*' : 'audio/*'}
            onChange={handleFileImport} />
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: theme.glow, color: theme.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <Upload size={20} />
          </div>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#f1f5f9', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {clip.file_path ? clip.file_path.split('/').pop() : 'Link Media Asset'}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Click to browse or drag & drop</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={labelStyle}>Clip Label</label>
            <input value={clip.label} onChange={e => updateField('label', e.target.value)} style={inputStyle} placeholder="Enter name..." />
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Start Time</label>
              <div style={{ position: 'relative' }}>
                <input type="number" step="0.1" min="0" value={clip.start_time.toFixed(2)}
                  onChange={e => updateField('start_time', parseFloat(e.target.value) || 0)} style={inputStyle} />
                <span style={{ position: 'absolute', right: 10, top: 10, fontSize: '0.7rem', color: '#475569' }}>s</span>
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Duration</label>
              <div style={{ position: 'relative' }}>
                <input type="number" step="0.1" min="0.25" value={clip.duration.toFixed(2)}
                  onChange={e => updateField('duration', parseFloat(e.target.value) || 0.25)} style={inputStyle} />
                <span style={{ position: 'absolute', right: 10, top: 10, fontSize: '0.7rem', color: '#475569' }}>s</span>
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Storage Path</label>
            <input value={clip.file_path || ''} onChange={e => updateField('file_path', e.target.value)}
              placeholder="e.g. storage/clips/file.mp4" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: '0.75rem' }} />
          </div>

          <div style={{ 
            background: clip.is_placeholder ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255,255,255,0.02)', 
            border: `1px solid ${clip.is_placeholder ? '#10b98133' : 'rgba(255,255,255,0.1)'}`, 
            borderRadius: 10, 
            padding: 16 
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <input type="checkbox" id="ph-check" checked={!!clip.is_placeholder} onChange={e => updateField('is_placeholder', e.target.checked)} style={{ marginTop: 4, width: 16, height: 16, accentColor: '#10b981' }} />
              <div>
                <label htmlFor="ph-check" style={{ fontSize: '0.85rem', fontWeight: 700, color: clip.is_placeholder ? '#10b981' : '#e2e8f0', cursor: 'pointer' }}>Dynamic Placeholder</label>
                <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#64748b', lineHeight: 1.5 }}>This clip will be replaced by the user's uploaded video during batch processing.</p>
              </div>
            </div>
          </div>
        </div>

        <button onClick={() => { const n = [...tracks]; n[trackIndex].clips.splice(clipIndex, 1); setTracks(n); onClose(); }}
          style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            color: '#ef4444', 
            padding: '12px', 
            borderRadius: 8, 
            cursor: 'pointer', 
            fontSize: '0.85rem', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: 8, 
            marginTop: 'auto',
            transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
          <Trash2 size={16} /> Delete Clip
        </button>
      </div>
    </div>
  );
}

export function TemplateBuilderView() {
  const [templateName, setTemplateName] = useState('Untitled Project');
  const [templateId] = useState(crypto.randomUUID());
  const [tracks, setTracks] = useState([
    { track_id: crypto.randomUUID(), name: `Video 1`, track_type: `video`, clips: [], muted: false, locked: false },
    { track_id: crypto.randomUUID(), name: `Overlay 1`, track_type: `overlay`, clips: [], muted: false, locked: false },
    { track_id: crypto.randomUUID(), name: `Audio 1`, track_type: `audio`, clips: [], muted: false, locked: false },
  ]);
  const [selectedClip, setSelectedClip] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(``);
  const [savedTemplates, setSavedTemplates] = useState([]);
  const [showTemplateList, setShowTemplateList] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [isAutoPreviewEnabled, setIsAutoPreviewEnabled] = useState(true);
  const debounceTimerRef = useRef(null);

  // Auto-preview effect with smarter triggers
  useEffect(() => {
    if (!isAutoPreviewEnabled) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

    const hasValidClips = tracks.some(t => t.clips.some(c => c.is_placeholder || c.file_path || c._localFile));
    if (!hasValidClips) return;

    debounceTimerRef.current = setTimeout(() => {
      generatePreview(true);
    }, 2500); // Slightly longer debounce for better stability

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [tracks, templateName, isAutoPreviewEnabled]);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/templates`).then(r => r.json()).then(d => setSavedTemplates(d.templates || [])).catch(() => {});
  }, []);

  const saveTemplate = async () => {
    setIsSaving(true);
    try {
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
      setSaveMsg(`✓ Saved`);
      fetch(`${API_BASE_URL}/api/templates`).then(r => r.json()).then(d => setSavedTemplates(d.templates || [])).catch(() => {});
      setTimeout(() => setSaveMsg(``), 3000);
    } catch (err) { setSaveMsg(`Error: ` + err.message); }
    setIsSaving(false);
  };

  const generatePreview = async (isAuto = false) => {
    setIsPreviewing(true);
    try {
      const updatedTracks = JSON.parse(JSON.stringify(tracks));
      let localTracks = [...tracks];
      let needsStateUpdate = false;

      for (let i = 0; i < localTracks.length; i++) {
        const t = localTracks[i];
        for (let j = 0; j < t.clips.length; j++) {
          const c = t.clips[j];
          if (c._localFile) {
            const fd = new FormData();
            fd.append(`file`, c._localFile);
            const res = await fetch(`${API_BASE_URL}/api/upload_clip`, { method: 'POST', body: fd });
            const data = await res.json();
            
            // Update the track and clip in an immutable way
            const newTracks = [...localTracks];
            const newClips = [...newTracks[i].clips];
            const { _localFile, ...rest } = c;
            newClips[j] = { ...rest, file_path: data.file_path };
            newTracks[i] = { ...newTracks[i], clips: newClips };
            
            localTracks = newTracks;
            updatedTracks[i].clips[j].file_path = data.file_path; // Also update the clone for the render request
            needsStateUpdate = true;
          }
        }
      }
      if (needsStateUpdate) setTracks(localTracks);

      const res = await fetch(`${API_BASE_URL}/api/render/preview`, {
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: { name: templateName, tracks: updatedTracks } }),
      });
      const data = await res.json();
      if (data.preview_url) {
        // Force refresh video element if URL is same
        setPreviewUrl(data.preview_url + "?t=" + Date.now());
      } else throw new Error(data.error || `Preview failed`);
    } catch (err) { 
      if (!isAuto) alert(`Preview Error: ` + err.message);
      else console.error("Auto-preview error:", err);
    }
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
    <div style={{ display: `flex`, height: '100vh', background: `#020617`, color: '#f8fafc', overflow: 'hidden' }}>
      
      {/* Asset / Clip Sidebar */}
      {selClip ? (
        <ClipEditorPanel
          clip={selClip}
          trackIndex={selectedClip.trackIndex}
          clipIndex={selectedClip.clipIndex}
          tracks={tracks}
          setTracks={setTracks}
          onClose={() => setSelectedClip(null)}
        />
      ) : (
        <div style={{ width: 80, background: 'rgba(15, 23, 42, 0.9)', borderRight: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 0', gap: 24 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: '#7c6af7', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(124, 106, 247, 0.3)' }}><Layers size={20} /></div>
          <div style={{ width: 1, height: 40, background: 'rgba(255,255,255,0.1)' }} />
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Film size={24} /></button>
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><FileAudio size={24} /></button>
          <button style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}><Image size={24} /></button>
        </div>
      )}

      {/* Main Workspace Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Header bar */}
        <div style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.05)', background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', padding: '0 24px', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <input value={templateName} onChange={e => setTemplateName(e.target.value)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: 700, width: 300, outline: 'none' }} />
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.03)', padding: '6px 14px', borderRadius: 100, border: '1px solid rgba(255,255,255,0.05)' }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 800, color: isAutoPreviewEnabled ? '#10b981' : '#64748b', letterSpacing: 1 }}>AUTO-RENDER</span>
              <div onClick={() => setIsAutoPreviewEnabled(!isAutoPreviewEnabled)} style={{ width: 32, height: 16, background: isAutoPreviewEnabled ? '#7c6af7' : '#334155', borderRadius: 20, position: 'relative', cursor: 'pointer' }}>
                <div style={{ position: 'absolute', top: 2, left: isAutoPreviewEnabled ? 18 : 2, width: 12, height: 12, background: '#fff', borderRadius: '50%', transition: 'all 0.2s' }} />
              </div>
            </div>

            <div style={{ position: `relative` }}>
              <button onClick={() => setShowTemplateList(!showTemplateList)} style={{ background: 'none', border: '1px solid rgba(255,255,255,0.1)', color: '#94a3b8', padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                <FolderOpen size={16} /> Open
              </button>
              {showTemplateList && (
                <div style={{ position: `absolute`, right: 0, top: 48, background: `#1e293b`, border: `1px solid rgba(255,255,255,0.1)`, borderRadius: 12, minWidth: 240, zIndex: 100, boxShadow: `0 20px 50px rgba(0,0,0,0.5)`, overflow: 'hidden' }}>
                  {savedTemplates.length === 0
                    ? <div style={{ padding: 20, color: `#64748b`, fontSize: `0.85rem`, textAlign: `center` }}>No projects found</div>
                    : savedTemplates.map(t => (
                      <div key={t.template_id} onClick={() => loadTemplate(t)} style={{ padding: `12px 20px`, cursor: `pointer`, borderBottom: `1px solid rgba(255,255,255,0.05)`, color: `#e2e8f0`, fontSize: `0.9rem` }}
                        onMouseEnter={e => e.currentTarget.style.background = `rgba(255,255,255,0.05)`}
                        onMouseLeave={e => e.currentTarget.style.background = `transparent`}>
                        {t.name}
                      </div>
                    ))
                  }
                </div>
              )}
            </div>

            <button onClick={() => setTracks([...tracks, { track_id: crypto.randomUUID(), name: `Body Track`, track_type: `video`, clips: [], muted: false, locked: false }])} 
              style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.2)', color: '#10b981', padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Body Track
            </button>

            <button onClick={() => generatePreview(false)} disabled={isPreviewing} style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              {isPreviewing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />} Refresh
            </button>

            <button onClick={saveTemplate} disabled={isSaving} style={{ background: '#7c6af7', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 12px rgba(124, 106, 247, 0.4)' }}>
              <Save size={16} /> {isSaving ? `Saving...` : `Save`}
            </button>
            {saveMsg && <span style={{ fontSize: `0.8rem`, color: `#10b981`, fontWeight: 700 }}>{saveMsg}</span>}
          </div>
        </div>

        {/* Viewport Area */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 24, overflow: 'hidden' }}>
          
          {/* Top: Preview Panel */}
          <div style={{ 
            flex: 3, 
            background: '#000', 
            borderRadius: 20, 
            border: '1px solid rgba(255,255,255,0.08)', 
            position: 'relative', 
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 30px 60px rgba(0,0,0,0.5)'
          }}>
            {previewUrl ? (
              <video key={previewUrl} src={previewUrl} controls autoPlay muted style={{ maxWidth: '100%', maxHeight: '100%' }} />
            ) : (
              <div style={{ textAlign: 'center', opacity: 0.3 }}>
                <Film size={64} style={{ marginBottom: 16 }} />
                <div style={{ fontWeight: 600 }}>Viewport Empty</div>
                <div style={{ fontSize: '0.85rem' }}>Add content to the timeline to generate a preview</div>
              </div>
            )}

            {/* Premium Loading Overlay */}
            {isPreviewing && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(2, 6, 23, 0.8)', backdropFilter: 'blur(4px)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
                <div style={{ width: 48, height: 48, borderRadius: '50%', border: '3px solid rgba(124, 106, 247, 0.2)', borderTopColor: '#7c6af7', animation: 'spin 1s linear infinite' }} />
                <div style={{ marginTop: 20, fontSize: '0.9rem', fontWeight: 700, letterSpacing: 2, color: '#7c6af7' }}>RENDERING STUDIO PREVIEW</div>
                <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* Status Indicator */}
            <div style={{ position: 'absolute', top: 20, left: 20, display: 'flex', gap: 10 }}>
              <div style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', padding: '6px 12px', borderRadius: 8, fontSize: '0.7rem', fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: isAutoPreviewEnabled ? '#10b981' : '#64748b', boxShadow: isAutoPreviewEnabled ? '0 0 10px #10b981' : 'none' }} />
                {isAutoPreviewEnabled ? 'STUDIO LIVE' : 'MANUAL MODE'}
              </div>
            </div>
          </div>

          {/* Bottom: Timeline Panel */}
          <div style={{ flex: 2, minHeight: 0, display: `flex`, flexDirection: `column` }}>
            <NLETimeline tracks={tracks} setTracks={setTracks} selectedClip={selectedClip} setSelectedClip={setSelectedClip} />
            <div style={{ marginTop: 12, padding: '0 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', display: 'flex', gap: 16 }}>
                <span>Double-click track to add clip</span>
                <span>Drag to reposition</span>
                <span>Right-click for options</span>
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569' }}>LUNARA ENGINE v2.0</div>
            </div>
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
        body: JSON.stringify({ template: tmpl, body_clip: clipPath }),
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
