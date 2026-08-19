// Dashboard view
const Dashboard = {
  async render() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-secondary text-center mt-6">Loading...</div>';

    try {
      const [dashboard, tasks, activity, members] = await Promise.all([
        API.getDashboard(),
        API.getTodayTasks(),
        API.getActivity(10),
        API.getMembers(),
      ]);

      const { totals, top_fine_payer, most_disciplined, leaderboard } = dashboard;

      main.innerHTML = `
        <!-- Stats -->
        <div class="stats-grid">
          <div class="stat-card animate-in">
            <div class="stat-label">Total Fines</div>
            <div class="stat-value">₹${totals.total_fines}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:50ms">
            <div class="stat-label">Unpaid</div>
            <div class="stat-value danger">₹${totals.total_unpaid}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:100ms">
            <div class="stat-label">Collected</div>
            <div class="stat-value accent">₹${totals.total_paid}</div>
          </div>
          <div class="stat-card animate-in" style="animation-delay:150ms">
            <div class="stat-label">Tasks Completed</div>
            <div class="stat-value">${totals.tasks_completed}</div>
          </div>
        </div>

        <!-- Highlights -->
        <div class="highlights-row">
          <div class="highlight-card animate-in" style="animation-delay:200ms">
            <div class="highlight-label">🏆 Most Disciplined</div>
            <div class="highlight-value">${most_disciplined ? most_disciplined.name : '—'}</div>
          </div>
          <div class="highlight-card animate-in" style="animation-delay:250ms">
            <div class="highlight-label">💸 Top Fine Payer</div>
            <div class="highlight-value">${top_fine_payer && top_fine_payer.total > 0 ? `${top_fine_payer.name} — ₹${top_fine_payer.total}` : '—'}</div>
          </div>
        </div>

        <div class="dashboard-grid">
          <div class="dashboard-main">
            <!-- Today's Tasks -->
            <div class="section-header">
              <div>
                <h2 class="section-title">Today's Tasks</h2>
                <div class="section-subtitle">${UI.formatDate(UI.today())}</div>
              </div>
            </div>
            <div class="today-grid mb-6" id="today-tasks-container">
              ${Dashboard.renderTodayTasks(tasks, members)}
            </div>

            <!-- Member Cards -->
            <div class="section-header">
              <h2 class="section-title">Members</h2>
            </div>
            <div class="members-grid" id="member-cards-container">
              ${Dashboard.renderMemberCards(members)}
            </div>
          </div>

          <div class="dashboard-sidebar">
            <!-- Leaderboard -->
            <div>
              <div class="section-header">
                <h2 class="section-title">Leaderboard</h2>
              </div>
              ${Dashboard.renderLeaderboard(leaderboard)}
            </div>

            <!-- Activity Feed -->
            <div>
              <div class="section-header">
                <h2 class="section-title">Activity</h2>
              </div>
              ${Dashboard.renderActivity(activity)}
            </div>
          </div>
        </div>
      `;

      // Attach event handlers
      Dashboard.attachTodayHandlers();
      Dashboard.attachMemberCardHandlers();

    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error loading dashboard</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },

  renderTodayTasks(tasks, members) {
    if (!tasks || tasks.length === 0) {
      return UI.emptyState('📋', 'No members yet', 'Add members to start tracking tasks');
    }

    return tasks.map(task => {
      const statusClass = task.completed === 1 ? 'completed' : task.completed === 0 ? 'incomplete' : 'pending';
      const statusText = task.completed === 1 ? 'Completed' : task.completed === 0 ? 'Incomplete' : 'Pending';
      const member = members.find(m => m.id === task.member_id);
      const avatarCls = member ? UI.avatarClass(member.id) : 'a1';

      return `
        <div class="today-card ${statusClass} animate-in">
          <div class="today-member">
            <div class="member-avatar ${avatarCls}" style="width:32px;height:32px;font-size:0.75rem">${UI.initials(task.member_name)}</div>
            <span style="font-weight:500;font-size:0.875rem">${task.member_name}</span>
          </div>
          <div class="today-status">
            <span class="today-status-badge ${statusClass}">${statusText}</span>
          </div>
          <div class="today-actions">
            <button class="today-btn complete" data-member-id="${task.member_id}" data-action="complete" title="Mark completed">✓</button>
            <button class="today-btn incomplete" data-member-id="${task.member_id}" data-action="incomplete" title="Mark incomplete">✕</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderMemberCards(members) {
    if (!members || members.length === 0) {
      return UI.emptyState('👥', 'No members', 'Add members to get started');
    }

    return members.map((m, i) => {
      const fineClass = m.total_unpaid > 0 ? '' : 'clean';
      const fineText = m.total_unpaid > 0 ? `₹${m.total_unpaid} Unpaid` : '₹0 Outstanding';

      return `
        <div class="member-card animate-in" style="animation-delay:${i * 50}ms" data-member-id="${m.id}">
          <div class="member-card-header">
            <div class="member-avatar ${UI.avatarClass(m.id)}">${UI.initials(m.name)}</div>
            <div style="flex:1">
              <div class="member-name">${m.name}</div>
              ${m.current_streak > 0 ? `<span class="member-streak">🔥 ${m.current_streak} day streak</span>` : ''}
            </div>
          </div>
          <div class="member-fine-amount ${fineClass}">${fineText}</div>
          <div class="member-stats">
            <div class="member-stat">
              <span>Tasks Done</span>
              <span class="member-stat-value">${m.tasks_completed}</span>
            </div>
            <div class="member-stat">
              <span>Tasks Missed</span>
              <span class="member-stat-value">${m.tasks_missed}</span>
            </div>
            <div class="member-stat">
              <span>Total Fines</span>
              <span class="member-stat-value">₹${m.total_fines}</span>
            </div>
            <div class="member-stat">
              <span>Paid</span>
              <span class="member-stat-value text-accent">₹${m.total_paid}</span>
            </div>
          </div>
          <div class="member-card-actions">
            <button class="btn btn-outline btn-sm add-fine-btn" data-member-id="${m.id}">+ Add Fine</button>
            <button class="btn btn-ghost btn-sm mark-paid-btn" data-member-id="${m.id}">Mark Paid</button>
          </div>
        </div>
      `;
    }).join('');
  },

  renderLeaderboard(leaderboard) {
    if (!leaderboard || leaderboard.length === 0) {
      return '<div class="leaderboard"><div class="empty-state" style="padding:2rem"><div class="empty-state-text">No data yet</div></div></div>';
    }

    const rankClasses = ['gold', 'silver', 'bronze'];

    return `
      <div class="leaderboard">
        ${leaderboard.map((m, i) => `
          <div class="leaderboard-item">
            <div class="leaderboard-rank ${rankClasses[i] || 'default'}">${i + 1}</div>
            <div class="leaderboard-name">${m.name}</div>
            <div class="leaderboard-stat">
              <strong>${m.tasks_completed}</strong> done
            </div>
            <div class="leaderboard-stat">
              ${m.total_unpaid > 0 ? `<span class="text-danger">₹${m.total_unpaid}</span>` : '<span class="text-accent">₹0</span>'}
            </div>
          </div>
        `).join('')}
      </div>
    `;
  },

  renderActivity(activities) {
    if (!activities || activities.length === 0) {
      return `
        <div class="activity-feed">
          <div class="activity-item" style="justify-content:center;color:var(--text-tertiary);padding:2rem">
            No activity yet
          </div>
        </div>
      `;
    }

    return `
      <div class="activity-feed">
        ${activities.map(a => `
          <div class="activity-item">
            <div class="activity-dot ${a.action}"></div>
            <span>${a.details}</span>
            <span class="activity-time">${UI.timeAgo(a.created_at)}</span>
          </div>
        `).join('')}
      </div>
    `;
  },

  attachTodayHandlers() {
    document.querySelectorAll('.today-btn').forEach(btn => {
      btn.onclick = async () => {
        const memberId = parseInt(btn.dataset.memberId);
        const completed = btn.dataset.action === 'complete';
        try {
          const result = await API.updateTask(memberId, completed);
          if (!completed && result.auto_fine_prompt) {
            // Ask to create fine
            if (confirm(`${result.member_name} didn't complete today's task. Add ₹10 fine?`)) {
              await API.addFine({
                member_id: memberId,
                amount: 10,
                reason: 'Daily task incomplete',
                date: UI.today(),
                task_id: result.task_id,
              });
              UI.toast('Fine added');
            }
          } else if (completed) {
            UI.toast(`${result.member_name} completed today's task! ✓`);
          }
          App.refresh();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      };
    });
  },

  attachMemberCardHandlers() {
    // Click card to go to profile
    document.querySelectorAll('.member-card').forEach(card => {
      card.onclick = (e) => {
        if (e.target.closest('button')) return;
        const memberId = card.dataset.memberId;
        window.location.hash = `#/member/${memberId}`;
      };
    });

    // Add fine buttons
    document.querySelectorAll('.add-fine-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        UI.showAddFineModal(parseInt(btn.dataset.memberId));
      };
    });

    // Mark paid buttons - marks all unpaid fines as paid
    document.querySelectorAll('.mark-paid-btn').forEach(btn => {
      btn.onclick = async (e) => {
        e.stopPropagation();
        const memberId = parseInt(btn.dataset.memberId);
        try {
          const fines = await API.getFines({ member_id: memberId, status: 'unpaid' });
          if (fines.length === 0) {
            UI.toast('No unpaid fines', 'info');
            return;
          }
          if (confirm(`Mark all ${fines.length} unpaid fines as paid?`)) {
            for (const fine of fines) {
              await API.togglePay(fine.id);
            }
            UI.toast('All fines marked as paid');
            App.refresh();
          }
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      };
    });
  },
};
