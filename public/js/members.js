// Members view and Member Profile view
const Members = {
  async render() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-secondary text-center mt-6">Loading...</div>';

    try {
      const members = await API.getMembers();
      main.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">Members</h2>
            <div class="section-subtitle">${members.length} active members</div>
          </div>
          <button class="btn btn-accent" id="btn-add-member">+ Add Member</button>
        </div>
        <div class="members-grid">
          ${members.map((m, i) => `
            <div class="member-card animate-in" style="animation-delay:${i * 50}ms" data-member-id="${m.id}">
              <div class="member-card-header">
                <div class="member-avatar ${UI.avatarClass(m.id)}">${UI.initials(m.name)}</div>
                <div style="flex:1">
                  <div class="member-name">${m.name}</div>
                  ${m.current_streak > 0 ? `<span class="member-streak">🔥 ${m.current_streak} day streak</span>` : ''}
                </div>
                <button class="btn btn-ghost btn-icon-only edit-member-btn" data-member-id="${m.id}" title="Edit">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
              <div class="member-fine-amount ${m.total_unpaid > 0 ? '' : 'clean'}">${m.total_unpaid > 0 ? `₹${m.total_unpaid} Unpaid` : '₹0 Outstanding'}</div>
              <div class="member-stats">
                <div class="member-stat"><span>Tasks Done</span><span class="member-stat-value">${m.tasks_completed}</span></div>
                <div class="member-stat"><span>Tasks Missed</span><span class="member-stat-value">${m.tasks_missed}</span></div>
                <div class="member-stat"><span>Total Fines</span><span class="member-stat-value">₹${m.total_fines}</span></div>
                <div class="member-stat"><span>Paid</span><span class="member-stat-value text-accent">₹${m.total_paid}</span></div>
              </div>
              <div class="member-card-actions">
                <button class="btn btn-outline btn-sm add-fine-btn" data-member-id="${m.id}">+ Add Fine</button>
                <button class="btn btn-ghost btn-sm view-profile-btn" data-member-id="${m.id}">View Profile</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      // Handlers
      document.getElementById('btn-add-member').onclick = () => UI.showAddMemberModal();

      document.querySelectorAll('.edit-member-btn').forEach(btn => {
        btn.onclick = async (e) => {
          e.stopPropagation();
          const member = members.find(m => m.id == btn.dataset.memberId);
          if (member) UI.showEditMemberModal(member);
        };
      });

      document.querySelectorAll('.add-fine-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          UI.showAddFineModal(parseInt(btn.dataset.memberId));
        };
      });

      document.querySelectorAll('.view-profile-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.stopPropagation();
          window.location.hash = `#/member/${btn.dataset.memberId}`;
        };
      });

      document.querySelectorAll('.member-card').forEach(card => {
        card.onclick = (e) => {
          if (e.target.closest('button')) return;
          window.location.hash = `#/member/${card.dataset.memberId}`;
        };
      });

    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },

  // Member Profile View
  async renderProfile(memberId) {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-secondary text-center mt-6">Loading...</div>';

    try {
      const member = await API.getMember(memberId);

      main.innerHTML = `
        <a href="#/members" class="back-btn">← Back to Members</a>

        <div class="profile-header animate-in">
          <div class="profile-avatar member-avatar ${UI.avatarClass(member.id)}">${UI.initials(member.name)}</div>
          <div>
            <h2 class="profile-name">${member.name}</h2>
            <div class="text-secondary mt-2">Current Outstanding</div>
            <div class="profile-outstanding ${member.total_unpaid > 0 ? 'text-danger' : 'text-accent'}">₹${member.total_unpaid}</div>
            ${member.current_streak > 0 ? `<span class="member-streak">🔥 ${member.current_streak} day streak</span>` : ''}
          </div>
        </div>

        <div class="profile-stats-grid">
          <div class="stat-card animate-in">
            <div class="stat-label">Tasks Completed</div>
            <div class="stat-value accent">${member.tasks_completed}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:50ms">
            <div class="stat-label">Tasks Missed</div>
            <div class="stat-value danger">${member.tasks_missed}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:100ms">
            <div class="stat-label">Total Fines</div>
            <div class="stat-value">₹${member.total_fines}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:150ms">
            <div class="stat-label">Paid</div>
            <div class="stat-value accent">₹${member.total_paid}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:200ms">
            <div class="stat-label">Unpaid</div>
            <div class="stat-value danger">₹${member.total_unpaid}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:250ms">
            <div class="stat-label">Streak</div>
            <div class="stat-value">${member.current_streak} days</div>
          </div>
        </div>

        <div class="section-header">
          <h2 class="section-title">Fine History</h2>
          <button class="btn btn-outline btn-sm" id="profile-add-fine">+ Add Fine</button>
        </div>

        ${member.fines && member.fines.length > 0 ? `
          <div class="fine-list">
            ${member.fines.map(f => `
              <div class="fine-item animate-in">
                <div class="fine-member">${UI.formatDate(f.date)}</div>
                <div class="fine-reason">${f.reason}</div>
                <div class="fine-amount">₹${f.amount}</div>
                <span class="fine-status ${f.status}">${f.status}</span>
                <div class="fine-actions">
                  <button class="btn btn-ghost btn-icon-only toggle-pay-btn" data-fine-id="${f.id}" title="Toggle paid">
                    ${f.status === 'paid' ? '↩' : '✓'}
                  </button>
                  <button class="btn btn-ghost btn-icon-only edit-fine-btn" data-fine='${JSON.stringify(f).replace(/'/g, "&#39;")}' title="Edit">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        ` : UI.emptyState('🎉', 'No fines yet', 'Looks like they\'re completing their tasks!')}
      `;

      // Handlers
      document.getElementById('profile-add-fine').onclick = () => UI.showAddFineModal(member.id);

      document.querySelectorAll('.toggle-pay-btn').forEach(btn => {
        btn.onclick = async () => {
          try {
            await API.togglePay(parseInt(btn.dataset.fineId));
            UI.toast('Status updated');
            Members.renderProfile(memberId);
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        };
      });

      document.querySelectorAll('.edit-fine-btn').forEach(btn => {
        btn.onclick = () => {
          const fine = JSON.parse(btn.dataset.fine);
          UI.showEditFineModal(fine);
        };
      });

    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },
};
