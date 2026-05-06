import { useState, useRef, useEffect } from 'react'
import { 
  Bell, HelpCircle, Settings2, Sliders, Headphones, Video, 
  Activity, Upload, CloudUpload, MonitorPlay, Mic, Users, 
  GraduationCap, Zap, CheckCircle, Trash2, Download, BarChart2,
  Database, HardDrive, Clock, FileAudio, FileVideo, Shield,
  Play, Loader2, Volume2, StopCircle, RefreshCw, Save
} from 'lucide-react'
import { TemplateBuilderView, BatchRenderView } from './Workflows.jsx'
import { API_BASE_URL } from './apiConfig.js';

const PRESETS = {
  "YouTube": { noise: 65, boost: 40, eq: 82, lufs: 14 },
  "Podcast": { noise: 85, boost: 20, eq: 60, lufs: 16 },
  "Interview": { noise: 60, boost: 30, eq: 40, lufs: 14 },
  "Online Class": { noise: 70, boost: 25, eq: 55, lufs: 14 }
}

function App() {
  const [currentView, setCurrentView] = useState('workspace') // workspace, library, analytics, settings
  const [currentTab, setCurrentTab] = useState('audio')
  const [file, setFile] = useState(null)
  
  // Audio State
  const [noiseReduce, setNoiseReduce] = useState(65)
  const [voiceBoost, setVoiceBoost] = useState(40)
  const [eqClarity, setEqClarity] = useState(82)
  const [lufsTarget, setLufsTarget] = useState(14)
  const [activePreset, setActivePreset] = useState("YouTube")
  
  // Video Background State
  const [removeBg, setRemoveBg] = useState(false)
  const [bgImage, setBgImage] = useState(null)
  const [subjectScale, setSubjectScale] = useState(1.0)
  const [offsetX, setOffsetX] = useState(0)
  const [offsetY, setOffsetY] = useState(0)
  const [bgBlur, setBgBlur] = useState(0)
  const [videoFilter, setVideoFilter] = useState("None")
  const [subjectBrightness, setSubjectBrightness] = useState(0)
  const [subjectContrast, setSubjectContrast] = useState(0)
  const [skinSmoothing, setSkinSmoothing] = useState(0)
  const [lightMatch, setLightMatch] = useState(0)
  
  // Live Preview State
  const [previewFrame, setPreviewFrame] = useState(null)
  const [previewResult, setPreviewResult] = useState(null)
  const [isPreviewLoading, setIsPreviewLoading] = useState(false)
  
  // Processing State
  const [isProcessing, setIsProcessing] = useState(false)
  const [taskId, setTaskId] = useState(null)
  const [progress, setProgress] = useState({ step: -1, percent: 0.0, message: "Ready" })
  const [downloadUrl, setDownloadUrl] = useState(null)
  
  const fileInputRef = useRef(null)
  const bgInputRef = useRef(null)

  // WebSocket for Progress
  useEffect(() => {
    let ws = null;
    if (taskId) {
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/api/ws/${taskId}`
      ws = new WebSocket(wsUrl)
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data)
        setProgress({
          step: data.step,
          percent: data.progress,
          message: data.message
        })
        
        if (data.step === 6) {
          setIsProcessing(false)
          setDownloadUrl(`${API_BASE_URL}/api/download/${taskId}`)
          ws.close()
        } else if (data.step === -1) {
          setIsProcessing(false)
          ws.close()
        }
      }
    }
    return () => {
      if (ws) ws.close()
    }
  }, [taskId])

  // Extract Frame Logic
  const extractFrame = (videoFile) => {
    const video = document.createElement('video')
    video.src = URL.createObjectURL(videoFile)
    video.crossOrigin = 'anonymous'
    video.muted = true
    
    video.addEventListener('loadeddata', () => {
      video.currentTime = Math.min(1.0, video.duration / 2) || 1.0
    })
    
    video.addEventListener('seeked', () => {
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.8)
      setPreviewFrame(dataUrl)
      setPreviewResult(dataUrl)
    })
  }

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0]
      setFile(selectedFile)
      setDownloadUrl(null)
      setProgress({ step: -1, percent: 0.0, message: "Ready" })
      
      if (selectedFile.type.startsWith('video/')) {
        extractFrame(selectedFile)
      } else {
        setPreviewFrame(null)
        setPreviewResult(null)
      }
    }
  }
  
  const handleBgChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setBgImage(e.target.files[0])
    }
  }

  // Debounced Live Preview Update
  useEffect(() => {
    if (currentTab !== 'video' || !previewFrame) return;
    
    const handler = setTimeout(() => {
      updatePreview();
    }, 500);
    
    return () => clearTimeout(handler);
  }, [previewFrame, removeBg, bgImage, subjectScale, offsetX, offsetY, bgBlur, videoFilter, subjectBrightness, subjectContrast, skinSmoothing, lightMatch, currentTab]);
  
  const updatePreview = async () => {
    setIsPreviewLoading(true);
    
    const formData = new FormData();
    formData.append("preview_frame", previewFrame);
    if (bgImage) formData.append("bg_image", bgImage);
    formData.append("subject_scale", subjectScale);
    formData.append("offset_x", offsetX);
    formData.append("offset_y", offsetY);
    formData.append("bg_blur", bgBlur);
    formData.append("video_filter", videoFilter);
    formData.append("remove_bg", removeBg);
    formData.append("subject_brightness", subjectBrightness);
    formData.append("subject_contrast", subjectContrast);
    formData.append("skin_smoothing", skinSmoothing);
    formData.append("light_match", lightMatch);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/preview`, {
        method: "POST",
        body: formData
      });
      const data = await res.json();
      if (data.preview_result) {
        setPreviewResult(`data:image/jpeg;base64,${data.preview_result}`);
      }
    } catch (err) {
      console.error("Preview update failed:", err);
    } finally {
      setIsPreviewLoading(false);
    }
  }

  const applyPreset = (name) => {
    setActivePreset(name)
    const p = PRESETS[name]
    setNoiseReduce(p.noise)
    setVoiceBoost(p.boost)
    setEqClarity(p.eq)
    setLufsTarget(p.lufs)
  }

  const handleManualChange = (setter) => (e) => {
    setActivePreset("")
    setter(parseInt(e.target.value))
  }

  const startProcessing = async () => {
    if (!file) return
    
    setIsProcessing(true)
    setDownloadUrl(null)
    setProgress({ step: 0, percent: 0.0, message: "Initializing engines..." })
    
    const formData = new FormData()
    formData.append("file", file)
    
    const actualVoiceBoost = Math.round((voiceBoost / 100) * 20)
    formData.append("noise_reduce", noiseReduce)
    formData.append("voice_boost", actualVoiceBoost)
    formData.append("eq_clarity", eqClarity)
    formData.append("lufs_target", lufsTarget)
    
    if (currentTab === 'video' && removeBg) {
      formData.append("remove_bg", "true")
      if (bgImage) formData.append("bg_image", bgImage)
      formData.append("subject_scale", subjectScale)
      formData.append("offset_x", offsetX)
      formData.append("offset_y", offsetY)
      formData.append("bg_blur", bgBlur)
      formData.append("video_filter", videoFilter)
      formData.append("subject_brightness", subjectBrightness)
      formData.append("subject_contrast", subjectContrast)
      formData.append("skin_smoothing", skinSmoothing)
      formData.append("light_match", lightMatch)
    } else {
      formData.append("remove_bg", "false")
    }
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/enhance`, {
        method: "POST",
        body: formData
      })
      const data = await res.json()
      if (data.task_id) {
        setTaskId(data.task_id)
      } else {
        throw new Error("No task ID returned")
      }
    } catch (err) {
      setProgress({ step: -1, percent: 0, message: "Error uploading file" })
      setIsProcessing(false)
    }
  }

  const switchTab = (tab) => {
    setCurrentTab(tab)
    // Don't reset file so user can easily toggle tabs and try different tools on same file
  }



  const renderWorkspace = () => (
    <div className="main-body">
      
      <aside className="left-sidebar">
        <div className="sidebar-header">
          <div className="sidebar-header-title">
            <Settings2 size={16}/> Project Settings
          </div>
          <div className="sidebar-header-sub">Media Configuration</div>
        </div>
        <div className="sidebar-menu">
          <div 
            className={`sidebar-item ${currentTab === 'audio' ? 'active' : ''}`}
            onClick={() => switchTab('audio')}
          >
            <Headphones size={16}/> Audio Lab
          </div>
          <div 
            className={`sidebar-item ${currentTab === 'video' ? 'active' : ''}`}
            onClick={() => switchTab('video')}
          >
            <Video size={16}/> Video Studio
          </div>
        </div>
        <div className="sidebar-footer">
          <button className="btn-apply-all">Apply All</button>
        </div>
      </aside>

      <main className="center-canvas">
        <div className="canvas-header">
          <h2>{currentTab === 'audio' ? 'Audio Production Lab' : 'Video AI Studio'}</h2>
          <div className="canvas-subtitle-row">
            <p>Upload high-fidelity media for automated professional enhancement.</p>
            <span className={`status-badge ${isProcessing ? 'active' : ''}`}>
              STATUS: {isProcessing ? 'PROCESSING' : 'IDLE'}
            </span>
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".mp4,.mov,.mkv,.avi,.wav,.mp3"
          disabled={isProcessing}
          style={{display: 'none'}}
        />

        {downloadUrl ? (
          <div style={{
            width: '100%', minHeight: '400px', backgroundColor: '#000', 
            borderRadius: '8px', overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <video 
              controls 
              src={downloadUrl} 
              style={{width: '100%', maxHeight: '450px', outline: 'none'}} 
              autoPlay 
            />
            <button 
              onClick={() => {
                setDownloadUrl(null)
                setTaskId(null)
                setProgress({ step: -1, percent: 0.0, message: "Ready" })
              }}
              style={{position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.9)', color: '#111827', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', zIndex: 10}}
            >
              Close Preview
            </button>
          </div>
        ) : currentTab === 'video' && file && previewResult ? (
          <div style={{
            width: '100%', minHeight: '400px', backgroundColor: '#000', 
            borderRadius: '8px', overflow: 'hidden', position: 'relative',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <img src={previewResult} alt="Live Preview" style={{maxWidth: '100%', maxHeight: '450px', objectFit: 'contain', opacity: isProcessing ? 0.3 : 1, transition: 'opacity 0.3s'}} />
            
            {isProcessing && (
              <div style={{position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px'}}>
                <div style={{color: 'white', fontSize: '1.2rem', fontWeight: '600', marginBottom: '8px'}}>
                  {progress.message}
                </div>
                <div style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px'}}>
                  Processing media data... Please do not close this window.
                </div>
                <div style={{width: '80%', height: '8px', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '4px', overflow: 'hidden'}}>
                  <div style={{height: '100%', backgroundColor: '#3B82F6', width: `${progress.percent * 100}%`, borderRadius: '4px', transition: 'width 0.3s', boxShadow: '0 0 10px rgba(59,130,246,0.8)'}}></div>
                </div>
                <div style={{color: 'white', fontSize: '0.85rem', marginTop: '12px', fontWeight: 'bold'}}>
                  {Math.round(progress.percent * 100)}%
                </div>
              </div>
            )}

            {isPreviewLoading && !isProcessing && (
              <div style={{position: 'absolute', top: 16, right: 16, background: 'var(--accent-blue-bg)', color: 'var(--accent-blue-text)', padding: '6px 12px', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px'}}>
                <div className="spinner" style={{width: '12px', height: '12px', border: '2px solid var(--accent-blue-text)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite'}}></div>
                Updating Preview...
              </div>
            )}
            
            {!isProcessing && (
              <button 
                onClick={() => fileInputRef.current.click()}
                style={{position: 'absolute', bottom: 16, right: 16, background: 'rgba(255,255,255,0.9)', color: '#111827', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)'}}
              >
                Change Video
              </button>
            )}
            <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <div 
            className={`upload-card ${file ? 'has-file' : ''}`}
            onClick={() => !isProcessing && fileInputRef.current.click()}
          >
            {file ? (
              <>
                <div className="upload-icon-wrapper" style={{backgroundColor: '#E0EAFF', color: '#2563EB'}}>
                  <CheckCircle size={24} />
                </div>
                <div className="upload-title">{file.name}</div>
                <div className="upload-subtitle">
                  {isProcessing ? progress.message : "Click to change asset"}
                </div>
                {isProcessing && (
                  <div style={{width: '60%', height: '4px', backgroundColor: '#E5E7EB', borderRadius: '2px', marginTop: '16px'}}>
                    <div style={{height: '100%', backgroundColor: '#2563EB', width: `${progress.percent * 100}%`, borderRadius: '2px', transition: 'width 0.3s'}}></div>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="upload-icon-wrapper">
                  <CloudUpload size={24} />
                </div>
                <div className="upload-title">Drop media to start processing</div>
                <div className="upload-subtitle">Support for WAV, MP3, MP4, and MOV files. Max file size: 2GB per asset.</div>
                <button className="btn-outline" onClick={(e) => { e.stopPropagation(); fileInputRef.current.click(); }}>
                  Select from Local Storage
                </button>
              </>
            )}
          </div>
        )}

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-title">Available Capacity</div>
            <div className="stat-value">142 GB</div>
            <div className="stat-bar-bg">
              <div className="stat-bar-fill" style={{width: '60%'}}></div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Recent Exports</div>
            <div className="stat-value">24</div>
            <div className="stat-sub positive">↗ +12% this week</div>
          </div>
          <div className="stat-card">
            <div className="stat-title">Processing Power</div>
            <div className="stat-value">88.2k</div>
            <div className="stat-sub">Samples / second</div>
          </div>
        </div>
      </main>

      <aside className="right-panel">
        
        {currentTab === 'audio' ? (
          <>
            <div className="panel-section">
              <div className="panel-section-header">
                <span className="panel-section-title">AUDIO PRESETS</span>
              </div>
              <div className="preset-grid">
                <div className={`preset-card ${activePreset === 'YouTube' ? 'active' : ''}`} onClick={() => applyPreset('YouTube')}>
                  <MonitorPlay className="preset-icon" size={20} />
                  <span className="preset-name">YouTube</span>
                </div>
                <div className={`preset-card ${activePreset === 'Podcast' ? 'active' : ''}`} onClick={() => applyPreset('Podcast')}>
                  <Mic className="preset-icon" size={20} />
                  <span className="preset-name">Podcast</span>
                </div>
                <div className={`preset-card ${activePreset === 'Interview' ? 'active' : ''}`} onClick={() => applyPreset('Interview')}>
                  <Users className="preset-icon" size={20} />
                  <span className="preset-name">Interview</span>
                </div>
                <div className={`preset-card ${activePreset === 'Online Class' ? 'active' : ''}`} onClick={() => applyPreset('Online Class')}>
                  <GraduationCap className="preset-icon" size={20} />
                  <span className="preset-name">Online Class</span>
                </div>
              </div>
            </div>

            <div className="panel-section">
              <div className="panel-section-header">
                <span className="panel-section-title">MANUAL SETTINGS</span>
                <Settings2 size={16} color="#9CA3AF" />
              </div>
              <div className="sliders-container">
                <div className="slider-group">
                  <div className="slider-labels">
                    <span className="slider-name">Noise Reduction</span>
                    <span className="slider-val">{noiseReduce}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={noiseReduce} onChange={handleManualChange(setNoiseReduce)} disabled={isProcessing} />
                </div>
                <div className="slider-group">
                  <div className="slider-labels">
                    <span className="slider-name">Voice Boost</span>
                    <span className="slider-val">{voiceBoost}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={voiceBoost} onChange={handleManualChange(setVoiceBoost)} disabled={isProcessing} />
                </div>
                <div className="slider-group">
                  <div className="slider-labels">
                    <span className="slider-name">EQ Clarity</span>
                    <span className="slider-val">{eqClarity}%</span>
                  </div>
                  <input type="range" min="0" max="100" value={eqClarity} onChange={handleManualChange(setEqClarity)} disabled={isProcessing} />
                </div>
                <div className="slider-group">
                  <div className="slider-labels">
                    <span className="slider-name">LUFS Target</span>
                    <span className="slider-val">-{lufsTarget} dB</span>
                  </div>
                  <input type="range" min="6" max="24" value={lufsTarget} onChange={handleManualChange(setLufsTarget)} disabled={isProcessing} />
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {removeBg && (
              <div className="panel-section" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '16px' }}>
                <div className="panel-section-header">
                  <span className="panel-section-title">SUBJECT LIGHTING & BEAUTY</span>
                </div>
                <div className="sliders-container">
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">AI Light Match</span>
                      <span className="slider-val">{lightMatch}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={lightMatch} onChange={(e) => setLightMatch(parseInt(e.target.value))} disabled={isProcessing || !bgImage} />
                    {!bgImage && <div style={{fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px'}}>Requires custom background image</div>}
                  </div>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">Exposure / Brightness</span>
                      <span className="slider-val">{subjectBrightness > 0 ? `+${subjectBrightness}` : subjectBrightness}</span>
                    </div>
                    <input type="range" min="-50" max="50" value={subjectBrightness} onChange={(e) => setSubjectBrightness(parseInt(e.target.value))} disabled={isProcessing} />
                  </div>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">Contrast</span>
                      <span className="slider-val">{subjectContrast > 0 ? `+${subjectContrast}` : subjectContrast}</span>
                    </div>
                    <input type="range" min="-50" max="50" value={subjectContrast} onChange={(e) => setSubjectContrast(parseInt(e.target.value))} disabled={isProcessing} />
                  </div>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">Skin Smoothing</span>
                      <span className="slider-val">{skinSmoothing}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={skinSmoothing} onChange={(e) => setSkinSmoothing(parseInt(e.target.value))} disabled={isProcessing} />
                  </div>
                </div>
              </div>
            )}
          
            <div className="panel-section">
              <div className="panel-section-header">
                <span className="panel-section-title">VIDEO AI MATTING</span>
              </div>
              <div className="ai-toggle-row">
                <span style={{fontSize: '0.85rem', fontWeight: '500'}}>AI Processing</span>
                <label className="switch" style={{marginLeft: 'auto'}}>
                  <input type="checkbox" checked={removeBg} onChange={(e) => setRemoveBg(e.target.checked)} disabled={isProcessing} />
                  <span className="slider"></span>
                </label>
              </div>
              
              {removeBg && (
                <div className="sliders-container" style={{marginTop: '16px'}}>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">Subject Scale</span>
                      <span className="slider-val">{Math.round(subjectScale * 100)}%</span>
                    </div>
                    <input type="range" min="50" max="150" value={Math.round(subjectScale * 100)} onChange={(e) => setSubjectScale(parseInt(e.target.value) / 100.0)} disabled={isProcessing} />
                  </div>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">X Position</span>
                      <span className="slider-val">{offsetX}</span>
                    </div>
                    <input type="range" min="-500" max="500" value={offsetX} onChange={(e) => setOffsetX(parseInt(e.target.value))} disabled={isProcessing} />
                  </div>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">Y Position</span>
                      <span className="slider-val">{offsetY}</span>
                    </div>
                    <input type="range" min="-500" max="500" value={offsetY} onChange={(e) => setOffsetY(parseInt(e.target.value))} disabled={isProcessing} />
                  </div>
                  <div className="slider-group">
                    <div className="slider-labels">
                      <span className="slider-name">Background Blur</span>
                      <span className="slider-val">{bgBlur}%</span>
                    </div>
                    <input type="range" min="0" max="100" value={bgBlur} onChange={(e) => setBgBlur(parseInt(e.target.value))} disabled={isProcessing} />
                  </div>
                  <div className="slider-group" style={{marginTop: '8px'}}>
                    <div className="slider-labels" style={{marginBottom: '8px'}}>
                      <span className="slider-name">Color Grading</span>
                    </div>
                    <select 
                      value={videoFilter} 
                      onChange={(e) => setVideoFilter(e.target.value)}
                      disabled={isProcessing}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '4px', 
                        border: '1px solid var(--border-color)', backgroundColor: 'transparent'
                      }}
                    >
                      <option value="None">None</option>
                      <option value="Cinematic">Cinematic (Teal & Orange)</option>
                      <option value="Vibrant">Vibrant</option>
                      <option value="Studio B&W">Studio B&W</option>
                    </select>
                  </div>
                  <div 
                    className="bg-upload-zone"
                    onClick={() => !isProcessing && bgInputRef.current.click()}
                    style={{marginTop: '16px'}}
                  >
                    <input type="file" ref={bgInputRef} onChange={handleBgChange} accept="image/*" disabled={isProcessing} style={{display: 'none'}} />
                    {bgImage ? bgImage.name : "Upload Replacement Image"}
                  </div>
                </div>
              )}
            </div>
            
            <div className="panel-section">
              <div className="panel-section-header">
                <span className="panel-section-title">AUTOMATED AUDIO</span>
              </div>
              <p style={{fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.5'}}>
                YouTube standard enhancements (Noise Remove: {noiseReduce}%, Boost: {voiceBoost}%) are applied alongside video processing.
              </p>
            </div>
          </>
        )}

        {!downloadUrl ? (
          <button className="btn-process" onClick={startProcessing} disabled={isProcessing || !file}>
            <Zap size={16} fill="white" /> Process Media
          </button>
        ) : (
          <a href={downloadUrl} download style={{textDecoration: 'none'}}>
            <button className="btn-process" style={{backgroundColor: '#2563EB'}}>
              Download Asset
            </button>
          </a>
        )}

        <div className="system-health-card">
          <div className="health-status">
            <div className="health-dot"></div> SYSTEM HEALTH: OPTIMAL
          </div>
          <div className="health-desc">
            Neural processing cores are active. Estimated processing time for 10 min audio: <strong>45 seconds</strong>.
          </div>
          <div className="health-footer">
            <span>Firmware v4.2.1-stable</span>
            <CheckCircle size={14} />
          </div>
        </div>
      </aside>

    </div>
  )
  
  return (
    <div className="app-wrapper">
      <header className="top-header">
        <div className="header-left">
          <div className="logo">Lunara</div>
          <div className="nav-links">
            <span className={`nav-link ${currentView === 'workspace' ? 'active' : ''}`} onClick={() => setCurrentView('workspace')}>Workspace</span>
            <span className={`nav-link ${currentView === 'templates' ? 'active' : ''}`} onClick={() => setCurrentView('templates')}>Templates</span>
            <span className={`nav-link ${currentView === 'batch_render' ? 'active' : ''}`} onClick={() => setCurrentView('batch_render')}>Batch Render</span>
            <span className={`nav-link ${currentView === 'library' ? 'active' : ''}`} onClick={() => setCurrentView('library')}>Library</span>
            <span className={`nav-link ${currentView === 'analytics' ? 'active' : ''}`} onClick={() => setCurrentView('analytics')}>Analytics</span>
            <span className={`nav-link ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setCurrentView('settings')}>Settings</span>
          </div>
        </div>
        <div className="header-right">
          <Bell className="header-icon" size={18} />
          <HelpCircle className="header-icon" size={18} />
          <button className="btn-upload" onClick={() => setCurrentView('workspace')}>Upload Asset</button>
          <div className="avatar">
            <img src="https://ui-avatars.com/api/?name=User&background=1B2234&color=fff" alt="Avatar" />
          </div>
        </div>
      </header>

      {currentView === 'workspace' && renderWorkspace()}
      {currentView === 'templates' && <TemplateBuilderView />}
      {currentView === 'batch_render' && <BatchRenderView />}
      {currentView === 'library' && <LibraryView />}
      {currentView === 'analytics' && <AnalyticsView />}
      {currentView === 'settings' && <SettingsView />}

      <footer className="global-footer">
        <div className="footer-left">
          <span>SERVER: US-EAST-01</span>
          <span>LATENCY: 14MS</span>
          <span>PROTOCOL: L-MEDIA-V2</span>
        </div>
        <div>© 2026 LUNARA TECHNOLOGIES INC. ALL RIGHTS RESERVED.</div>
      </footer>
    </div>
  )
}

function LibraryView() {
  const [assets, setAssets] = useState([]);
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/library`)
      .then(res => res.json())
      .then(data => setAssets(data.assets || []))
      .catch(err => console.error(err));
  }, []);

  const handleDelete = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/api/library/${id}`, { method: 'DELETE' });
      setAssets(assets.filter(a => a.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{padding: '32px', maxWidth: '1200px', margin: '0 auto', width: '100%', flex: 1}}>
      <h2 style={{color: 'var(--text-primary)', marginBottom: '24px', fontSize: '1.8rem'}}>Asset Library</h2>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '24px'}}>
        {assets.map(asset => (
          <div key={asset.id} style={{backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-color)'}}>
            <div style={{height: '140px', backgroundColor: '#111827', display: 'flex', alignItems: 'center', justifyContent: 'center', borderBottom: '1px solid var(--border-color)'}}>
              {asset.file_type === 'video/mp4' ? <FileVideo size={48} color="#3B82F6" /> : <FileAudio size={48} color="#10B981" />}
            </div>
            <div style={{padding: '16px'}}>
              <h3 style={{fontSize: '1rem', marginBottom: '8px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{asset.filename}</h3>
              <div style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '16px'}}>
                {new Date(asset.created_at).toLocaleDateString()} • {(asset.size / 1024 / 1024).toFixed(2)} MB
              </div>
              <div style={{display: 'flex', gap: '8px'}}>
                <a href={asset.url} download style={{flex: 1, textDecoration: 'none'}}>
                  <button style={{width: '100%', padding: '8px', background: 'var(--accent-blue-bg)', color: 'var(--accent-blue-text)', border: 'none', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '0.85rem'}}>
                    <Download size={14} /> Download
                  </button>
                </a>
                <button onClick={() => handleDelete(asset.id)} style={{padding: '8px', background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
        {assets.length === 0 && (
          <div style={{gridColumn: '1 / -1', textAlign: 'center', padding: '64px', color: 'var(--text-secondary)'}}>
            <Database size={48} style={{opacity: 0.2, marginBottom: '16px'}} />
            <h3>Your library is empty</h3>
            <p>Processed media will appear here automatically.</p>
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsView() {
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/analytics`)
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  if (!stats) return <div style={{padding: '32px'}}>Loading analytics...</div>;

  return (
    <div style={{padding: '32px', maxWidth: '1000px', margin: '0 auto', width: '100%', flex: 1}}>
      <h2 style={{color: 'var(--text-primary)', marginBottom: '24px', fontSize: '1.8rem'}}>Compute Dashboard</h2>
      <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '24px', marginBottom: '32px'}}>
        
        <div className="stat-card" style={{border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
          <Clock size={24} color="#3B82F6" style={{marginBottom: '16px'}} />
          <div className="stat-title">Total Compute Used</div>
          <div className="stat-value">{stats.total_compute_seconds.toFixed(2)}s</div>
          <div className="stat-sub">Across all AI models</div>
        </div>

        <div className="stat-card" style={{border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
          <Database size={24} color="#10B981" style={{marginBottom: '16px'}} />
          <div className="stat-title">Files Processed</div>
          <div className="stat-value">{stats.total_files}</div>
          <div className="stat-sub">Successfully generated assets</div>
        </div>

        <div className="stat-card" style={{border: '1px solid var(--border-color)', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)'}}>
          <BarChart2 size={24} color="#8B5CF6" style={{marginBottom: '16px'}} />
          <div className="stat-title">Tool Distribution</div>
          <div className="stat-value">{stats.video_count} / {stats.audio_count}</div>
          <div className="stat-sub">Video vs Audio Tasks</div>
        </div>

      </div>
    </div>
  )
}

function SettingsView() {
  const [settings, setSettings] = useState({ export_quality: '1080p', hardware_acceleration: 'Auto' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/settings`)
      .then(res => res.json())
      .then(data => setSettings(data || { export_quality: '1080p', hardware_acceleration: 'Auto' }))
      .catch(err => console.error(err));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const formData = new FormData();
    formData.append("export_quality", settings.export_quality);
    formData.append("hardware_acceleration", settings.hardware_acceleration);
    
    try {
      await fetch(`${API_BASE_URL}/api/settings`, { method: 'POST', body: formData });
      setTimeout(() => setSaving(false), 500);
    } catch (err) {
      console.error(err);
      setSaving(false);
    }
  };

  return (
    <div style={{padding: '32px', maxWidth: '800px', margin: '0 auto', width: '100%', flex: 1}}>
      <h2 style={{color: 'var(--text-primary)', marginBottom: '24px', fontSize: '1.8rem'}}>Global Configuration</h2>
      
      <div style={{backgroundColor: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', padding: '24px'}}>
        
        <div style={{marginBottom: '24px'}}>
          <label style={{display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px'}}>Default Export Quality</label>
          <select 
            value={settings.export_quality}
            onChange={(e) => setSettings({...settings, export_quality: e.target.value})}
            style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', fontSize: '0.95rem'}}
          >
            <option value="4K">4K UHD (Requires Pro)</option>
            <option value="1080p">1080p HD</option>
            <option value="720p">720p HD</option>
          </select>
        </div>

        <div style={{marginBottom: '32px'}}>
          <label style={{display: 'block', fontSize: '0.9rem', fontWeight: '600', color: 'var(--text-primary)', marginBottom: '8px'}}>Hardware Acceleration Engine</label>
          <select 
            value={settings.hardware_acceleration}
            onChange={(e) => setSettings({...settings, hardware_acceleration: e.target.value})}
            style={{width: '100%', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', fontSize: '0.95rem'}}
          >
            <option value="Auto">Auto-Detect (Recommended)</option>
            <option value="CUDA">NVIDIA CUDA (GPU)</option>
            <option value="CPU">CPU Only</option>
          </select>
          <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '8px'}}>Force the AI to use specific compute pipelines.</p>
        </div>

        <div style={{borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontSize: '0.85rem'}}>
            <Shield size={16} /> All settings are securely synced to MongoDB.
          </div>
          <button 
            onClick={handleSave}
            disabled={saving}
            style={{background: 'var(--accent-blue-bg)', color: 'var(--accent-blue-text)', border: 'none', padding: '10px 24px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s'}}
          >
            {saving ? 'Saved!' : 'Save Configuration'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default App
