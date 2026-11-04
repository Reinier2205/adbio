/**
 * Shared Activity Edit/Delete Modal
 * Used by both Overview and Log Progress pages.
 *
 * Usage:
 *   activityModal.open(activity, onSaved, onDeleted)
 *     onSaved(updatedActivity)   — called after successful PATCH
 *     onDeleted(id)              — called after successful DELETE
 */

const activityModal = (() => {
    let _onSaved   = null;
    let _onDeleted = null;
    let _activity  = null;

    function open(activity, onSaved, onDeleted) {
        _activity  = activity;
        _onSaved   = onSaved;
        _onDeleted = onDeleted;
        _render();
    }

    function close() {
        const el = document.getElementById('act-modal-backdrop');
        if (el) el.remove();
        document.body.style.overflow = '';
    }

    function _render() {
        // Remove any existing modal
        close();

        const a       = _activity;
        const types   = ['walk','hike','pilates','cycle','dance','sauna'];
        const typeTiles = types.map(t => `
            <button type="button" class="lp-type-tile${a.activity_type === t ? ' lp-selected' : ''}" data-type="${t}">
                <span class="lp-tile-icon lp-dot-${t}"></span>
                <span>${t.charAt(0).toUpperCase() + t.slice(1)}</span>
            </button>
        `).join('');

        const isPilates = a.activity_type === 'pilates';

        const backdrop = document.createElement('div');
        backdrop.id    = 'act-modal-backdrop';
        backdrop.className = 'amod-backdrop';
        backdrop.innerHTML = `
            <div class="amod-box" role="dialog" aria-modal="true" aria-label="Edit activity">
                <div class="amod-header">
                    <h3>Edit activity</h3>
                    <button class="amod-close" aria-label="Close">&times;</button>
                </div>

                <div class="amod-body">
                    <div class="lp-field-label">Activity type</div>
                    <div class="lp-type-grid amod-type-grid" id="amod-type-grid">${typeTiles}</div>

                    <div class="lp-field-label" style="margin-top:var(--spacing-md)">Date</div>
                    <input type="date" id="amod-date" class="lp-date-input" value="${a.activity_date}">

                    <div class="amod-numbers" id="amod-numbers" style="margin-top:var(--spacing-md);${isPilates ? 'display:none' : ''}">
                        <div class="lp-numbers-row">
                            <div class="lp-number-box">
                                <div class="lp-field-label">Distance</div>
                                <div class="lp-number-input-wrap">
                                    <input type="number" id="amod-distance" class="lp-number-input" min="0" step="0.1" value="${a.distance_km || ''}">
                                    <span class="lp-number-unit">km</span>
                                </div>
                            </div>
                            <div class="lp-number-box">
                                <div class="lp-field-label">Elevation</div>
                                <div class="lp-number-input-wrap">
                                    <input type="number" id="amod-elevation" class="lp-number-input" min="0" value="${a.elevation_gain_m || ''}">
                                    <span class="lp-number-unit">m</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="lp-numbers-row" style="margin-top:var(--spacing-md)">
                        <div class="lp-number-box">
                            <div class="lp-field-label">Duration</div>
                            <div class="lp-number-input-wrap">
                                <input type="number" id="amod-duration" class="lp-number-input" min="1" value="${a.duration_min || ''}">
                                <span class="lp-number-unit">min</span>
                            </div>
                        </div>
                    </div>

                    <div class="lp-field-label" style="margin-top:var(--spacing-md)">Tags</div>
                    <div class="lp-toggle-row">
                        <button type="button" class="lp-toggle${a.wore_camino_boots ? ' lp-toggle-on' : ''}" id="amod-boots">Boots</button>
                        <button type="button" class="lp-toggle${a.stretched_after   ? ' lp-toggle-on' : ''}" id="amod-stretch">Stretched</button>
                        <button type="button" class="lp-toggle${a.conversation_test ? ' lp-toggle-on' : ''}" id="amod-conv" title="Could you hold a conversation comfortably throughout?">Conversation test</button>
                    </div>

                    <div class="lp-field-label" style="margin-top:var(--spacing-md)">Notes <span class="lp-optional">(optional)</span></div>
                    <textarea id="amod-notes" class="lp-notes" rows="2">${a.notes || ''}</textarea>
                </div>

                <div class="amod-footer">
                    <button class="amod-delete-btn" id="amod-delete">Delete</button>
                    <div class="amod-footer-right">
                        <button class="amod-cancel-btn" id="amod-cancel">Cancel</button>
                        <button class="amod-save-btn" id="amod-save">Save changes</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(backdrop);
        document.body.style.overflow = 'hidden';

        // Close on backdrop click
        backdrop.addEventListener('click', e => { if (e.target === backdrop) close(); });
        document.getElementById('amod-cancel').addEventListener('click', close);
        backdrop.querySelector('.amod-close').addEventListener('click', close);

        // Type tile selection + show/hide distance fields
        let selectedType = a.activity_type;
        document.getElementById('amod-type-grid').addEventListener('click', e => {
            const tile = e.target.closest('.lp-type-tile');
            if (!tile) return;
            document.querySelectorAll('#amod-type-grid .lp-type-tile').forEach(t => t.classList.remove('lp-selected'));
            tile.classList.add('lp-selected');
            selectedType = tile.dataset.type;
            document.getElementById('amod-numbers').style.display = (selectedType === 'pilates' || selectedType === 'sauna') ? 'none' : '';
        });

        // Toggle pills
        ['amod-boots','amod-stretch','amod-conv'].forEach(id => {
            document.getElementById(id).addEventListener('click', function() {
                this.classList.toggle('lp-toggle-on');
            });
        });

        // Save
        document.getElementById('amod-save').addEventListener('click', async () => {
            const btn = document.getElementById('amod-save');
            btn.disabled = true;
            btn.textContent = 'Saving...';
            try {
                const isPil = selectedType === 'pilates' || selectedType === 'sauna';
                const updates = {
                    activity_type:     selectedType,
                    activity_date:     document.getElementById('amod-date').value,
                    duration_min:      parseInt(document.getElementById('amod-duration').value) || null,
                    wore_camino_boots: document.getElementById('amod-boots').classList.contains('lp-toggle-on'),
                    stretched_after:   document.getElementById('amod-stretch').classList.contains('lp-toggle-on'),
                    conversation_test: document.getElementById('amod-conv').classList.contains('lp-toggle-on'),
                    notes:             document.getElementById('amod-notes').value || null,
                    distance_km:       isPil ? null : (parseFloat(document.getElementById('amod-distance').value) || null),
                    elevation_gain_m:  isPil ? null : (parseInt(document.getElementById('amod-elevation').value)  || null),
                };
                const updated = await api.updateActivity(_activity.id, updates);
                close();
                if (_onSaved) _onSaved({ ..._activity, ...updates, id: _activity.id });
            } catch (err) {
                console.error('Update error:', err);
                btn.disabled = false;
                btn.textContent = 'Save changes';
                alert('Could not save. Please try again.');
            }
        });

        // Delete
        document.getElementById('amod-delete').addEventListener('click', async () => {
            if (!confirm('Delete this activity? This cannot be undone.')) return;
            const btn = document.getElementById('amod-delete');
            btn.disabled = true;
            btn.textContent = 'Deleting...';
            try {
                await api.deleteActivity(_activity.id);
                close();
                if (_onDeleted) _onDeleted(_activity.id);
            } catch (err) {
                console.error('Delete error:', err);
                btn.disabled = false;
                btn.textContent = 'Delete';
                alert('Could not delete. Please try again.');
            }
        });
    }

    return { open, close };
})();