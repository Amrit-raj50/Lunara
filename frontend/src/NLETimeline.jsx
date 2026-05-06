import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Rnd } from 'react-rnd';
import { Plus, Trash2, Video, Music, Layers, Volume2, VolumeX, Lock, Unlock, ChevronDown, ChevronRight, Copy, Scissors } from 'lucide-react';

const TRACK_COLORS = {
  video: { bg: '#1a6b45', border: '#22c55e', label: '#4ade80', header: '#0f3d28' },
  audio: { bg: '#1a3a6b', border: '#3b82f6', label: '#60a5fa', header: '#0f2040' },
  overlay: { bg: '#5a2d82', border: '#a855f7', label: '#c084fc', header: '#33185a' },
  music: { bg: '#6b2222', border: '#ef4444', label: '#f87171', header: '#3d0f0f' },
};

const TRACK_HEIGHT = 52;
const HEADER_WIDTH = 180;
const RULER_HEIGHT = 36;
const MIN_SCALE = 4;
const MAX_SCALE = 40;

function TimeRuler({ scale, duration, playhead, onPlayheadSet }) {
  const step = scale >= 20 ? 1 : scale >= 10 ? 2 : 5;
  const marks = [];
  for (let i = 0; i <= duration; i += step) {
    const x = i * scale;
    const mins = Math.floor(i / 60);
    const secs = i % 60;
    const label = `${mins}:${secs.toString().padStart(2, '0')}`;
    marks.push(
      <div key={i} style={{ position: 'absolute', left: x, top: 0, height: '100%', pointerEvents: 'none' }}>
        <div style={{ width: 1, height: i % (step * 4) === 0 ? 18 : 10, background: '#4a5568', position: 'absolute', bottom: 0 }} />
        {i % (step * 4) === 0 && (
          <div style={{ position: 'absolute', bottom: 18, left: 4, fontSize: 10, color: '#718096', whiteSpace: 'nowrap' }}>{label}</div>
        )}
      </div>
    );
  }
  return (
    <div
      style={{ position: 'relative', height: RULER_HEIGHT, background: '#111827', borderBottom: '1px solid #2d3748', cursor: 'col-resize', overflow: 'hidden' }}
      onClick={e => {
        const rect = e.currentTarget.getBoundingClientRect();
        onPlayheadSet(Math.max(0, (e.clientX - rect.left) / scale));
      }}
    >
      {marks}
      <div style={{ position: 'absolute', top: 0, left: playhead * scale, width: 2, height: '100%', background: '#f6ad55', zIndex: 10, pointerEvents: 'none' }}>
        <div style={{ width: 10, height: 10, background: '#f6ad55', borderRadius: '50%', position: 'absolute', top: 0, left: -4 }} />
      </div>
    </div>
  );
}

function TrackHeader({ track, index, onDelete, onMuteToggle, onLockToggle }) {
  const colors = TRACK_COLORS[track.track_type] || TRACK_COLORS.video;
  return (
    <div style={{ height: TRACK_HEIGHT, background: colors.header, borderBottom: '1px solid #1a202c', borderRight: '2px solid ' + colors.border, display: 'flex', alignItems: 'center', padding: '0 8px', gap: 6, flexShrink: 0 }}>
      <div style={{ width: 3, height: 32, background: colors.border, borderRadius: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: colors.label, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.name}</div>
        <div style={{ fontSize: 10, color: '#4a5568', marginTop: 2, textTransform: 'uppercase' }}>{track.track_type}</div>
      </div>
      <div style={{ display: 'flex', gap: 2 }}>
        <button onClick={() => onMuteToggle(index)} style={{ background: track.muted ? '#c53030' : '#2d3748', border: 'none', borderRadius: 3, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a0aec0' }} title={track.muted ? 'Unmute' : 'Mute'}>
          {track.muted ? <VolumeX size={11} /> : <Volume2 size={11} />}
        </button>
        <button onClick={() => onLockToggle(index)} style={{ background: track.locked ? '#744210' : '#2d3748', border: 'none', borderRadius: 3, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#a0aec0' }} title={track.locked ? 'Unlock' : 'Lock'}>
          {track.locked ? <Lock size={11} /> : <Unlock size={11} />}
        </button>
        <button onClick={() => onDelete(index)} style={{ background: 'transparent', border: 'none', borderRadius: 3, width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#fc8181' }} title="Delete Track">
          <Trash2 size={11} />
        </button>
      </div>
    </div>
  );
}

/* ── Context Menu ── */
function ContextMenu({ x, y, onClose, onDelete, onDuplicate, onSplit, clipLabel }) {
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const menuStyle = {
    position: 'fixed', left: x, top: y, zIndex: 9999,
    background: '#1a202c', border: '1px solid #2d3748', borderRadius: 8,
    boxShadow: '0 12px 40px rgba(0,0,0,0.6)', padding: '6px 0', minWidth: 180,
    animation: 'ctxFadeIn 0.12s ease-out',
  };

  const itemStyle = {
    padding: '8px 14px', fontSize: '0.82rem', color: '#e2e8f0', cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s',
  };

  return (
    <>
      <style>{`@keyframes ctxFadeIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}`}</style>
      <div ref={ref} style={menuStyle}>
        <div style={{ padding: '6px 14px 8px', fontSize: '0.72rem', color: '#718096', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, borderBottom: '1px solid #2d3748', marginBottom: 4 }}>
          {clipLabel || 'Clip'}
        </div>
        <div style={itemStyle} onMouseEnter={e => e.currentTarget.style.background = '#2d3748'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={onDuplicate}>
          <Copy size={13} color="#60a5fa" /> Duplicate
        </div>
        <div style={itemStyle} onMouseEnter={e => e.currentTarget.style.background = '#2d3748'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={onSplit}>
          <Scissors size={13} color="#a78bfa" /> Split at Playhead
        </div>
        <div style={{ height: 1, background: '#2d3748', margin: '4px 0' }} />
        <div style={{ ...itemStyle, color: '#f87171' }} onMouseEnter={e => e.currentTarget.style.background = '#2d1a1a'} onMouseLeave={e => e.currentTarget.style.background = 'transparent'} onClick={onDelete}>
          <Trash2 size={13} color="#f87171" /> Delete
        </div>
      </div>
    </>
  );
}

function ClipBlock({ clip, trackIndex, clipIndex, scale, trackType, isSelected, onSelect, onUpdate, onDelete, locked, onContextMenu }) {
  const colors = TRACK_COLORS[trackType] || TRACK_COLORS.video;
  const w = Math.max(20, clip.duration * scale);
  const x = clip.start_time * scale;

  const waveLines = trackType === 'audio' || trackType === 'music'
    ? Array.from({ length: Math.floor(w / 4) }, (_, i) => (
        <div key={i} style={{ width: 2, height: `${30 + Math.sin(i * 0.8) * 22}%`, background: 'rgba(255,255,255,0.35)', borderRadius: 1, flexShrink: 0 }} />
      ))
    : null;

  return (
    <Rnd
      bounds="parent"
      dragAxis="x"
      disableDragging={locked}
      enableResizing={locked ? false : { right: true, left: true }}
      position={{ x, y: 4 }}
      size={{ width: w, height: TRACK_HEIGHT - 8 }}
      onDragStop={(e, d) => onUpdate(trackIndex, clipIndex, Math.max(0, d.x / scale), clip.duration)}
      onResizeStop={(e, dir, ref, delta, pos) => onUpdate(trackIndex, clipIndex, Math.max(0, pos.x / scale), parseFloat(ref.style.width) / scale)}
      onClick={() => onSelect({ trackIndex, clipIndex })}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onContextMenu(e, trackIndex, clipIndex); }}
      style={{
        background: clip.is_placeholder ? 'linear-gradient(135deg,#0d6e4a,#22c55e)' : `linear-gradient(135deg,${colors.bg},${colors.bg}cc)`,
        border: `1.5px solid ${isSelected ? '#fff' : colors.border}`,
        borderRadius: 4,
        cursor: locked ? 'not-allowed' : 'grab',
        overflow: 'hidden',
        boxShadow: isSelected ? `0 0 0 2px rgba(255,255,255,0.4), 0 4px 12px rgba(0,0,0,0.5)` : '0 2px 6px rgba(0,0,0,0.4)',
        zIndex: isSelected ? 20 : 5,
      }}
    >
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '3px 6px', position: 'relative' }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>
          {clip.is_placeholder && '⬡ '}{clip.label}
        </div>
        {waveLines && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, overflow: 'hidden', marginTop: 2 }}>
            {waveLines}
          </div>
        )}
        {clip.is_placeholder && (
          <div style={{ position: 'absolute', right: 4, bottom: 3, fontSize: 9, color: '#a7f3d0', fontWeight: 'bold' }}>DYNAMIC</div>
        )}
        {clip.file_path && (
          <div style={{ position: 'absolute', right: 4, bottom: 3, fontSize: 8, color: 'rgba(255,255,255,0.5)', maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            📁 {clip.file_path.split('/').pop()}
          </div>
        )}
      </div>
    </Rnd>
  );
}

export default function NLETimeline({ tracks, setTracks, selectedClip, setSelectedClip }) {
  const [scale, setScale] = useState(16);
  const [playhead, setPlayhead] = useState(0);

  // Calculate dynamic duration based on clips and playhead
  const maxClipTime = tracks.reduce((max, track) => {
    return Math.max(max, track.clips.reduce((tMax, clip) => Math.max(tMax, clip.start_time + clip.duration), 0));
  }, 0);
  const duration = Math.max(120, maxClipTime + 60, playhead + 30); 
  const [contextMenu, setContextMenu] = useState(null);
  const timelineRef = useRef(null);

  // Close context menu on scroll / escape
  useEffect(() => {
    const close = () => setContextMenu(null);
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('scroll', close, true); window.removeEventListener('keydown', onKey); };
  }, []);

  const handleContextMenu = (e, trackIndex, clipIndex) => {
    setContextMenu({ x: e.clientX, y: e.clientY, trackIndex, clipIndex });
    setSelectedClip({ trackIndex, clipIndex });
  };

  const deleteClip = (ti, ci) => {
    const n = [...tracks]; n[ti].clips.splice(ci, 1); setTracks(n); setSelectedClip(null); setContextMenu(null);
  };

  const duplicateClip = (ti, ci) => {
    const n = [...tracks];
    const orig = n[ti].clips[ci];
    const copy = { ...orig, clip_id: crypto.randomUUID(), start_time: orig.start_time + orig.duration + 0.5, label: orig.label + ' (copy)' };
    n[ti].clips.push(copy);
    setTracks(n); setContextMenu(null);
  };

  const splitClip = (ti, ci) => {
    const n = [...tracks];
    const orig = n[ti].clips[ci];
    const splitPoint = playhead;
    if (splitPoint <= orig.start_time || splitPoint >= orig.start_time + orig.duration) { setContextMenu(null); return; }
    const dur1 = splitPoint - orig.start_time;
    const dur2 = orig.duration - dur1;
    orig.duration = dur1;
    const part2 = { ...orig, clip_id: crypto.randomUUID(), start_time: splitPoint, duration: dur2, label: orig.label + ' (B)' };
    n[ti].clips.splice(ci + 1, 0, part2);
    setTracks(n); setContextMenu(null);
  };

  const addClip = (trackIndex) => {
    if (tracks[trackIndex].locked) return;
    const newTracks = [...tracks];
    const track = newTracks[trackIndex];
    const lastEnd = track.clips.reduce((max, c) => Math.max(max, c.start_time + c.duration), 0);
    track.clips.push({
      clip_id: crypto.randomUUID(),
      start_time: lastEnd,
      duration: 5.0,
      file_path: '',
      is_placeholder: false,
      clip_type: track.track_type,
      label: `New ${track.track_type} clip`,
    });
    setTracks(newTracks);
    setSelectedClip({ trackIndex, clipIndex: track.clips.length - 1 });
  };

  const updateClip = (ti, ci, startTime, duration) => {
    const n = [...tracks];
    n[ti].clips[ci].start_time = startTime;
    n[ti].clips[ci].duration = Math.max(0.25, duration);
    setTracks(n);
  };

  const deleteTrack = (i) => { setTracks(tracks.filter((_, idx) => idx !== i)); setSelectedClip(null); };
  const toggleMute = (i) => { const n = [...tracks]; n[i].muted = !n[i].muted; setTracks(n); };
  const toggleLock = (i) => { const n = [...tracks]; n[i].locked = !n[i].locked; setTracks(n); };

  const zoom = (dir) => setScale(s => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s + dir * 2)));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0d1117', borderRadius: 8, overflow: 'hidden', border: '1px solid #2d3748' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#161b27', borderBottom: '1px solid #2d3748' }}>
        <span style={{ fontSize: 12, color: '#718096', marginRight: 4 }}>ZOOM</span>
        <button onClick={() => zoom(-1)} style={{ background: '#2d3748', border: 'none', color: '#e2e8f0', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>−</button>
        <div style={{ background: '#2d3748', borderRadius: 4, padding: '3px 10px', fontSize: 12, color: '#a0aec0', minWidth: 50, textAlign: 'center' }}>{scale}px/s</div>
        <button onClick={() => zoom(1)} style={{ background: '#2d3748', border: 'none', color: '#e2e8f0', padding: '3px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 16 }}>+</button>
        <div style={{ width: 1, height: 24, background: '#2d3748', margin: '0 4px' }} />
        {[['video','Video Track','#22c55e'], ['audio','Audio Track','#3b82f6'], ['overlay','Overlay','#a855f7'], ['music','Music','#ef4444']].map(([type, label, color]) => (
          <button key={type} onClick={() => setTracks([...tracks, { track_id: crypto.randomUUID(), name: `${label} ${tracks.filter(t=>t.track_type===type).length+1}`, track_type: type, clips: [], muted: false, locked: false }])}
            style={{ background: '#1a202c', border: `1px solid ${color}`, color, padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Plus size={11} />+ {label}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: '#4a5568' }}>Playhead: {Math.floor(playhead/60)}:{(Math.floor(playhead)%60).toString().padStart(2,'0')}.{String(Math.floor((playhead%1)*10))[0]}</span>
      </div>

      {/* Main area */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Track Headers */}
        <div style={{ width: HEADER_WIDTH, flexShrink: 0, background: '#111827', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: RULER_HEIGHT, background: '#0d1117', borderBottom: '1px solid #1a202c', display: 'flex', alignItems: 'center', padding: '0 12px' }}>
            <span style={{ fontSize: 10, color: '#4a5568', fontWeight: 700, letterSpacing: 1 }}>TRACKS</span>
          </div>
          {tracks.map((track, i) => (
            <TrackHeader key={track.track_id} track={track} index={i} onDelete={deleteTrack} onMuteToggle={toggleMute} onLockToggle={toggleLock} />
          ))}
        </div>

        {/* Timeline Canvas */}
        <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }} ref={timelineRef}>
          <TimeRuler scale={scale} duration={duration} playhead={playhead} onPlayheadSet={setPlayhead} />
          <div style={{ position: 'relative', flex: 1 }}>
            {/* Playhead line */}
            <div style={{ position: 'absolute', top: 0, left: playhead * scale, width: 1, height: '100%', background: '#f6ad5588', zIndex: 30, pointerEvents: 'none' }} />

            {tracks.map((track, ti) => {
              const colors = TRACK_COLORS[track.track_type] || TRACK_COLORS.video;
              return (
                <div
                  key={track.track_id}
                  style={{ height: TRACK_HEIGHT, borderBottom: '1px solid #1a202c', position: 'relative', background: track.muted ? '#0d1117' : `${colors.bg}18`, minWidth: duration * scale + 200, opacity: track.muted ? 0.5 : 1 }}
                  onDoubleClick={(e) => { if (!track.locked) { const rect = e.currentTarget.getBoundingClientRect(); const x = e.clientX - rect.left; const n = [...tracks]; n[ti].clips.push({ clip_id: crypto.randomUUID(), start_time: x/scale, duration: 5, file_path:'', is_placeholder:false, clip_type:track.track_type, label:`New ${track.track_type} clip`}); setTracks(n); setSelectedClip({trackIndex:ti,clipIndex:n[ti].clips.length-1}); }}}
                >
                  {/* Grid lines */}
                  {Array.from({length:Math.ceil(duration/5)},(_,i)=>(
                    <div key={i} style={{position:'absolute',left:i*5*scale,top:0,width:1,height:'100%',background:'#2d374818',pointerEvents:'none'}}/>
                  ))}

                  {track.locked && (
                    <div style={{position:'absolute',top:0,left:0,right:0,bottom:0,background:'repeating-linear-gradient(-45deg,transparent,transparent 8px,rgba(0,0,0,0.15) 8px,rgba(0,0,0,0.15) 10px)',pointerEvents:'none',zIndex:25}}/>
                  )}

                  {track.clips.map((clip, ci) => (
                    <ClipBlock key={clip.clip_id} clip={clip} trackIndex={ti} clipIndex={ci} scale={scale} trackType={track.track_type}
                      isSelected={selectedClip?.trackIndex===ti && selectedClip?.clipIndex===ci}
                      onSelect={setSelectedClip} onUpdate={updateClip}
                      onDelete={() => deleteClip(ti, ci)}
                      onContextMenu={handleContextMenu}
                      locked={track.locked}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right-click Context Menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x} y={contextMenu.y}
          clipLabel={tracks[contextMenu.trackIndex]?.clips[contextMenu.clipIndex]?.label}
          onClose={() => setContextMenu(null)}
          onDelete={() => deleteClip(contextMenu.trackIndex, contextMenu.clipIndex)}
          onDuplicate={() => duplicateClip(contextMenu.trackIndex, contextMenu.clipIndex)}
          onSplit={() => splitClip(contextMenu.trackIndex, contextMenu.clipIndex)}
        />
      )}
    </div>
  );
}
