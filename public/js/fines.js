// Fine History view and Today's Tasks view
const Fines = {
  async render() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-secondary text-center mt-6">Loading...</div>';

    try {
      const [fines, members] = await Promise.all([
        API.getFines(),
        API.getMembers(),
      ]);

      // Group fines by date
      const grouped = {};
      fines.forEach(f => {
        if (!grouped[f.date]) grouped[f.date] = [];
        grouped[f.date].push(f);
      });

      main.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">Fine History</h2>
            <div class="section-subtitle">${fines.length} total fines</div>
          </div>
          <button class="btn btn-accent" id="btn-add-fine-history">+ Add Fine</button>
        </div>

        <!-- Filters -->
        <div class="fine-filters">
          <select id="filter-member">
            <option value="">All Members</option>
            ${members.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}
          </select>
          <select id="filter-status">
            <option value="">All Status</option>
            <option value="paid">Paid</option>
            <option value="unpaid">Unpaid</option>
          </select>
          <input type="date" id="filter-date" placeholder="Filter by date">
          <button class="btn btn-ghost btn-sm" id="clear-filters">Clear</button>
        </div>

        <div id="fines-list-container">
          ${Fines.renderFinesList(grouped)}
        </div>
      `;

      // Handlers
      document.getElementById('btn-add-fine-history').onclick = () => UI.showAddFineModal();

      const filterHandler = async () => {
        const params = {};
        const memberId = document.getElementById('filter-member').value;
        const status = document.getElementById('filter-status').value;
        const date = document.getElementById('filter-date').value;
        if (memberId) params.member_id = memberId;
        if (status) params.status = status;
        if (date) params.date = date;

        try {
          const filtered = await API.getFines(params);
          const groupedFiltered = {};
          filtered.forEach(f => {
            if (!groupedFiltered[f.date]) groupedFiltered[f.date] = [];
            groupedFiltered[f.date].push(f);
          });
          document.getElementById('fines-list-container').innerHTML = Fines.renderFinesList(groupedFiltered);
          Fines.attachFineHandlers();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      };

      document.getElementById('filter-member').onchange = filterHandler;
      document.getElementById('filter-status').onchange = filterHandler;
      document.getElementById('filter-date').onchange = filterHandler;
      document.getElementById('clear-filters').onclick = () => {
        document.getElementById('filter-member').value = '';
        document.getElementById('filter-status').value = '';
        document.getElementById('filter-date').value = '';
        filterHandler();
      };

      Fines.attachFineHandlers();

    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },

  renderFinesList(grouped) {
    const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

    if (dates.length === 0) {
      return UI.emptyState('🎉', 'No fines yet', 'Looks like everyone is completing their tasks.');
    }

    return dates.map(date => `
      <div class="fine-date-group">
        <div class="fine-date-label">${UI.formatDate(date)}</div>
        <div class="fine-list">
          ${grouped[date].map(f => `
            <div class="fine-item animate-in">
              <div class="fine-member">${f.member_name}</div>
              <div class="fine-reason">${f.reason}</div>
              <div class="fine-amount">₹${f.amount}</div>
              <span class="fine-status ${f.status}">${f.status}</span>
              <div class="fine-actions">
                <button class="btn btn-ghost btn-icon-only toggle-pay-btn" data-fine-id="${f.id}" title="Toggle paid/unpaid">
                  ${f.status === 'paid' ? '↩' : '✓'}
                </button>
                <button class="btn btn-ghost btn-icon-only edit-fine-btn" data-fine='${JSON.stringify(f).replace(/'/g, "&#39;")}' title="Edit fine">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');
  },

  attachFineHandlers() {
    document.querySelectorAll('.toggle-pay-btn').forEach(btn => {
      btn.onclick = async () => {
        try {
          await API.togglePay(parseInt(btn.dataset.fineId));
          UI.toast('Status updated');
          App.refresh();
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
  },
};

// Today's Tasks dedicated view
const TodayView = {
  async render() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="text-secondary text-center mt-6">Loading...</div>';

    try {
      const [tasks, members] = await Promise.all([
        API.getTodayTasks(),
        API.getMembers(),
      ]);

      const today = new Date();
      const dateStr = today.toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      main.innerHTML = `
        <div class="section-header">
          <div>
            <h2 class="section-title">Today's Tasks</h2>
            <div class="section-subtitle">${dateStr}</div>
          </div>
        </div>

        <div class="today-grid">
          ${tasks.map((task, i) => {
            const statusClass = task.completed === 1 ? 'completed' : task.completed === 0 ? 'incomplete' : 'pending';
            const statusText = task.completed === 1 ? 'Completed ✅' : task.completed === 0 ? 'Not Completed ❌' : 'Not yet marked';
            const fineText = task.completed === 0 ? '₹10' : '₹0';

            return `
              <div class="today-card ${statusClass} animate-in" style="animation-delay:${i * 50}ms">
                <div class="today-member">
                  <div class="member-avatar ${UI.avatarClass(task.member_id)}" style="width:36px;height:36px;font-size:0.8rem">${UI.initials(task.member_name)}</div>
                  <div>
                    <div style="font-weight:500">${task.member_name}</div>
                    <div style="font-size:0.75rem;color:var(--text-tertiary)">${statusText}</div>
                  </div>
                </div>
                <div class="today-status">
                  <span class="today-status-badge ${statusClass}">${statusClass === 'pending' ? 'Pending' : statusClass === 'completed' ? 'Done' : 'Missed'}</span>
                  <span style="font-size:0.8rem;font-weight:600;color:${task.completed === 0 ? 'var(--danger-text)' : 'var(--text-tertiary)'}">${fineText}</span>
                </div>
                <div class="today-actions">
                  <button class="today-btn complete" data-member-id="${task.member_id}" data-action="complete">✓ Completed</button>
                  <button class="today-btn incomplete" data-member-id="${task.member_id}" data-action="incomplete">✕ Didn't Complete</button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;

      // Attach handlers
      document.querySelectorAll('.today-btn').forEach(btn => {
        btn.onclick = async () => {
          const memberId = parseInt(btn.dataset.memberId);
          const completed = btn.dataset.action === 'complete';
          try {
            const result = await API.updateTask(memberId, completed);
            if (!completed && result.auto_fine_prompt) {
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
            TodayView.render();
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        };
      });

    } catch (err) {
      main.innerHTML = `<div class="empty-state"><div class="empty-state-title">Error</div><div class="empty-state-text">${err.message}</div></div>`;
    }
  },
};

// Rules view
const RulesView = {
  render() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
      <div class="section-header">
        <h2 class="section-title">Study Group Rules</h2>
      </div>
      <div class="rules-list animate-in">
        <ol>
          <li>Complete your daily task every day.</li>
          <li>Failure to complete = default ₹10 fine.</li>
          <li>Fine amount can be adjusted by the group.</li>
          <li>All fines must be recorded honestly.</li>
          <li>Paid fines must be marked as paid promptly.</li>
          <li>Any member can add or edit fines — trust the group.</li>
          <li>Stay consistent. Build the streak. Stay accountable.</li>
        </ol>
      </div>

      <div class="mt-6">
        <div class="highlight-card animate-in" style="animation-delay:100ms">
          <div class="highlight-label">💡 How it works</div>
          <div style="font-size:0.875rem;color:var(--text-secondary);line-height:1.8;margin-top:0.5rem">
            Every day, each member marks whether they completed their study task.
            If someone didn't complete it, any member can add a fine (default ₹10).
            The fine amount is fully editable — the group decides the punishment.
            All fines and payments are tracked transparently. No single admin controls anything.
          </div>
        </div>
      </div>
    `;
  },
};
