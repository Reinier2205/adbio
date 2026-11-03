/**
 * Strength & Stretch Page
 */

async function renderStrengthStretchPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');
    
    container.innerHTML = `
        <div class="page-header">
            <h1>Strength & stretch</h1>
            <p class="subtitle">Your Pilates video routine for Camino preparation</p>
        </div>
        
        <div class="info-banner">
            <div class="info-icon">💡</div>
            <div class="info-content">
                <strong>Your 5-video rotation</strong>
                <p>Complete 2 sessions per week. Rotate through these videos for variety and balanced training.</p>
            </div>
        </div>
        
        <div class="videos-grid" id="videos-grid">
            <div class="loading">Loading videos...</div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Why Pilates for Camino?</h2>
            </div>
            <div class="card-body">
                <div class="benefits-grid">
                    <div class="benefit-item">
                        <div class="benefit-icon">💪</div>
                        <h3>Core Strength</h3>
                        <p>A strong core stabilizes your body during long walks and helps carry your pack efficiently.</p>
                    </div>
                    
                    <div class="benefit-item">
                        <div class="benefit-icon">🦵</div>
                        <h3>Leg Endurance</h3>
                        <p>Controlled movements build the slow-twitch muscle fibers needed for all-day walking.</p>
                    </div>
                    
                    <div class="benefit-item">
                        <div class="benefit-icon">🧘</div>
                        <h3>Flexibility</h3>
                        <p>Prevents injuries and reduces muscle soreness. Essential for recovery between walking days.</p>
                    </div>
                    
                    <div class="benefit-item">
                        <div class="benefit-icon">⚖️</div>
                        <h3>Balance</h3>
                        <p>Improves stability on uneven terrain, reducing the risk of falls on the trail.</p>
                    </div>
                    
                    <div class="benefit-item">
                        <div class="benefit-icon">🎯</div>
                        <h3>Hip Mobility</h3>
                        <p>Healthy hip flexors prevent lower back pain and improve your walking stride.</p>
                    </div>
                    
                    <div class="benefit-item">
                        <div class="benefit-icon">🌟</div>
                        <h3>Injury Prevention</h3>
                        <p>Addresses muscle imbalances and weak points before they become problems on the trail.</p>
                    </div>
                </div>
            </div>
        </div>
        
        <div class="card">
            <div class="card-header">
                <h2>Customize Your Rotation</h2>
            </div>
            <div class="card-body">
                <p>Click any video card to update it with a different MadFit Pilates video from YouTube.</p>
                <p class="tip">💡 <strong>Tip:</strong> Choose a mix of full-body, lower-body, and recovery sessions for balanced training.</p>
            </div>
        </div>
    `;
    
    // Load videos
    await loadVideos();
}

async function loadVideos() {
    try {
        const videos = await api.getVideos();
        const grid = document.getElementById('videos-grid');
        
        if (!videos || videos.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <p>No videos configured yet.</p>
                </div>
            `;
            return;
        }
        
        // Sort by slot number
        videos.sort((a, b) => a.slot_number - b.slot_number);
        
        let html = '';
        videos.forEach(video => {
            const thumbnailUrl = getYouTubeThumbnail(video.video_url);
            html += `
                <div class="video-card" onclick="openVideo('${video.video_url}')">
                    <div class="video-thumbnail" style="background-image: url('${thumbnailUrl}')">
                        <div class="video-overlay">
                            <div class="play-button">▶</div>
                        </div>
                        <div class="video-slot">Slot ${video.slot_number}</div>
                    </div>
                    <div class="video-info">
                        <h3>${video.title}</h3>
                        <div class="video-meta">
                            ${video.category ? `<span class="video-category">${video.category}</span>` : ''}
                            ${video.duration_min ? `<span class="video-duration">${video.duration_min} min</span>` : ''}
                        </div>
                        <button class="btn-text" onclick="editVideo(${video.slot_number}, event)">
                            Edit
                        </button>
                    </div>
                </div>
            `;
        });
        
        grid.innerHTML = html;
        
    } catch (error) {
        console.error('Error loading videos:', error);
        document.getElementById('videos-grid').innerHTML = `
            <div class="error">Failed to load videos</div>
        `;
    }
}

function getYouTubeThumbnail(url) {
    // Extract YouTube video ID
    let videoId = '';
    
    // Handle different YouTube URL formats
    if (url.includes('youtube.com/watch?v=')) {
        videoId = url.split('v=')[1]?.split('&')[0];
    } else if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
    } else if (url.includes('youtube.com/embed/')) {
        videoId = url.split('embed/')[1]?.split('?')[0];
    }
    
    if (videoId) {
        return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
    }
    
    // Fallback placeholder
    return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="360"%3E%3Crect fill="%232C5F4F" width="480" height="360"/%3E%3Ctext fill="white" font-family="sans-serif" font-size="24" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3EPilates Video%3C/text%3E%3C/svg%3E';
}

function openVideo(url) {
    window.open(url, '_blank');
}

async function editVideo(slotNumber, event) {
    event.stopPropagation();
    
    const newUrl = prompt('Enter new YouTube video URL:');
    if (!newUrl) return;
    
    const newTitle = prompt('Enter video title:');
    if (!newTitle) return;
    
    const category = prompt('Enter category (e.g., Full body, Lower body, Core):') || null;
    const duration = prompt('Duration in minutes:');
    
    try {
        await api.updateVideo({
            slot_number: slotNumber,
            video_url: newUrl,
            title: newTitle,
            category: category,
            duration_min: duration ? parseInt(duration) : null
        });
        
        // Reload videos
        await loadVideos();
        
        alert('Video updated successfully! 🎉');
        
    } catch (error) {
        console.error('Error updating video:', error);
        alert('Failed to update video. Please try again.');
    }
}
