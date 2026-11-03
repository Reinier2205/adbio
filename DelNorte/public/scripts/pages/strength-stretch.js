/**
 * Strength & Stretch Page
 */

async function renderStrengthStretchPage() {
    const user = auth.getCurrentUser();
    const container = document.getElementById('page-container');

    container.innerHTML = `
        <div class="lp-hero">
            <div>
                <h1>Strength &amp; stretch</h1>
                <p class="lp-hero-sub">2 Pilates sessions per week &mdash; always warm up and cool down</p>
            </div>
        </div>

        <section class="ov-section">
            <h2 class="ov-section-title">Your video library</h2>
            <div class="ss-reminder">
                <div class="ss-reminder-item ss-reminder-warm">
                    <div class="ss-reminder-label">Always start with</div>
                    <div class="ss-reminder-name">5 Min Warm Up</div>
                </div>
                <div class="ss-reminder-arrow">&rarr;</div>
                <div class="ss-reminder-item ss-reminder-main">
                    <div class="ss-reminder-label">Main session</div>
                    <div class="ss-reminder-name">45 Min workout</div>
                </div>
                <div class="ss-reminder-arrow">&rarr;</div>
                <div class="ss-reminder-item ss-reminder-cool">
                    <div class="ss-reminder-label">Always finish with</div>
                    <div class="ss-reminder-name">5 Min Cool Down</div>
                </div>
            </div>
            <div class="ss-videos-grid" id="ss-videos-grid">
                <div class="ov-loading">Loading videos...</div>
            </div>
        </section>

        <section class="ov-section">
            <h2 class="ov-section-title">Why Pilates for Camino?</h2>
            <div class="tp-guidelines-grid">
                ${[
                    ['Core strength',      'A strong core stabilises your body on long walks and helps carry your pack efficiently.'],
                    ['Leg endurance',      'Controlled movements build the slow-twitch muscle fibres needed for all-day walking.'],
                    ['Flexibility',        'Prevents injuries and reduces muscle soreness. Essential for recovery between walking days.'],
                    ['Balance',            'Improves stability on uneven terrain, reducing the risk of falls on the Camino.'],
                    ['Hip mobility',       'Healthy hip flexors prevent lower back pain and improve your walking stride.'],
                    ['Injury prevention',  'Addresses muscle imbalances and weak points before they become problems on the Camino.'],
                ].map(([title, desc]) => `
                    <div class="tp-guideline">
                        <div class="tp-guideline-title">${title}</div>
                        <p class="tp-guideline-desc">${desc}</p>
                    </div>
                `).join('')}
            </div>
        </section>
    `;

    await loadSSVideos();
}

async function loadSSVideos() {
    try {
        const videos = await api.getVideos();
        const grid = document.getElementById('ss-videos-grid');

        if (!videos || videos.length === 0) {
            grid.innerHTML = '<div class="ov-empty"><p>No videos configured yet.</p></div>';
            return;
        }

        videos.sort((a, b) => a.slot_number - b.slot_number);

        grid.innerHTML = videos.map(v => {
            const thumb = getYTThumb(v.video_url);
            return `
                <div class="ss-video-card" onclick="openSSVideo('${v.video_url}')">
                    <div class="ss-thumb" style="background-image:url('${thumb}')">
                        <div class="ss-play">&#9654;</div>
                        <div class="ss-slot">Slot ${v.slot_number}</div>
                    </div>
                    <div class="ss-info">
                        <div class="ss-title">${v.title}</div>
                        <div class="ss-meta">
                            ${v.category ? `<span class="ov-badge ov-badge-walk">${v.category}</span>` : ''}
                            ${v.duration_min ? `<span class="ov-badge ov-badge-none">${v.duration_min} min</span>` : ''}
                        </div>
                        <button class="ss-edit-btn" onclick="editSSVideo(${v.slot_number}, event)">Edit</button>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        document.getElementById('ss-videos-grid').innerHTML = '<p class="ov-error">Could not load videos.</p>';
    }
}

function getYTThumb(url) {
    let id = '';
    if (url.includes('youtube.com/watch?v='))  id = url.split('v=')[1]?.split('&')[0];
    else if (url.includes('youtu.be/'))         id = url.split('youtu.be/')[1]?.split('?')[0];
    else if (url.includes('youtube.com/embed/')) id = url.split('embed/')[1]?.split('?')[0];
    return id
        ? `https://img.youtube.com/vi/${id}/hqdefault.jpg`
        : 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="480" height="270"%3E%3Crect fill="%232C5F4F" width="480" height="270"/%3E%3C/svg%3E';
}

function openSSVideo(url) { window.open(url, '_blank'); }

async function editSSVideo(slot, event) {
    event.stopPropagation();
    const url   = prompt('YouTube URL:');   if (!url) return;
    const title = prompt('Video title:');   if (!title) return;
    const cat   = prompt('Category (e.g. Full body, Core):') || null;
    const dur   = prompt('Duration in minutes:');
    try {
        await api.updateVideo({ slot_number: slot, video_url: url, title, category: cat, duration_min: dur ? parseInt(dur) : null });
        await loadSSVideos();
    } catch (e) { alert('Could not update video.'); }
}