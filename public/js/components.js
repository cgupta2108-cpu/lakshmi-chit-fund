// Shared UI components: modals, toasts, empty states

const UI = {
  // Show toast notification
  toast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const icons = { success: '✓', error: '✕', info: 'ℹ' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${icons[type] || ''}</span> ${message}`;
    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(30px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  // Show modal
  showModal(html) {
    const overlay = document.getElementById('modal-overlay');
    const content = document.getElementById('modal-content');
    content.innerHTML = html;
    overlay.classList.remove('hidden');

    // Close on overlay click
    overlay.onclick = (e) => {
      if (e.target === overlay) UI.closeModal();
    };

    // Close on Escape
    document.addEventListener('keydown', UI._escHandler);
  },

  closeModal() {
    document.getElementById('modal-overlay').classList.add('hidden');
    document.removeEventListener('keydown', UI._escHandler);
  },

  _escHandler(e) {
    if (e.key === 'Escape') UI.closeModal();
  },

  // Get avatar class based on member index/id
  avatarClass(id) {
    const classes = ['a1', 'a2', 'a3', 'a4', 'a5'];
    return classes[(id - 1) % classes.length];
  },

  // Get initials from name
  initials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  },

  // Format date
  formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.getTime() === today.getTime()) return 'Today';
    if (date.getTime() === yesterday.getTime()) return 'Yesterday';

    return date.toLocaleDateString('en-IN', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  },

  // Format timestamp for activity
  timeAgo(timestamp) {
    if (!timestamp) return '';
    const now = new Date();
    const date = new Date(timestamp + 'Z'); // UTC
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    return date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  },

  // Today's date in YYYY-MM-DD
  today() {
    return new Date().toISOString().split('T')[0];
  },

  // Empty state component
  emptyState(icon, title, text) {
    return `
      <div class="empty-state">
        <div class="empty-state-icon">${icon}</div>
        <div class="empty-state-title">${title}</div>
        <div class="empty-state-text">${text}</div>
      </div>
    `;
  },

  // Add Fine Modal
  async showAddFineModal(preselectedMemberId = null) {
    let members = [];
    try {
      members = await API.getMembers();
    } catch (e) {
      UI.toast('Failed to load members', 'error');
      return;
    }

    const memberOptions = members.map(m =>
      `<option value="${m.id}" ${m.id == preselectedMemberId ? 'selected' : ''}>${m.name}</option>`
    ).join('');

    UI.showModal(`
      <h2 class="modal-title">Add Fine</h2>
      <form id="add-fine-form">
        <div class="modal-field">
          <label class="modal-label">Member</label>
          <select id="fine-member" required>${memberOptions}</select>
        </div>
        <div class="modal-field">
          <label class="modal-label">Amount (₹)</label>
          <input type="number" id="fine-amount" value="10" min="1" required>
        </div>
        <div class="modal-field">
          <label class="modal-label">Reason</label>
          <input type="text" id="fine-reason" value="Daily task incomplete" required>
        </div>
        <div class="modal-field">
          <label class="modal-label">Date</label>
          <input type="date" id="fine-date" value="${UI.today()}" required>
        </div>
        <div class="modal-field">
          <label class="modal-label">Status</label>
          <select id="fine-status">
            <option value="unpaid">Unpaid</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-accent">Add Fine</button>
        </div>
      </form>
    `);

    document.getElementById('add-fine-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.addFine({
          member_id: parseInt(document.getElementById('fine-member').value),
          amount: parseInt(document.getElementById('fine-amount').value),
          reason: document.getElementById('fine-reason').value,
          date: document.getElementById('fine-date').value,
          status: document.getElementById('fine-status').value,
        });
        UI.closeModal();
        UI.toast('Fine added');
        App.refresh();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    };
  },

  // Edit Fine Modal
  async showEditFineModal(fine) {
    let members = [];
    try {
      members = await API.getMembers();
    } catch (e) {
      UI.toast('Failed to load members', 'error');
      return;
    }

    const memberOptions = members.map(m =>
      `<option value="${m.id}" ${m.id == fine.member_id ? 'selected' : ''}>${m.name}</option>`
    ).join('');

    UI.showModal(`
      <h2 class="modal-title">Edit Fine</h2>
      <form id="edit-fine-form">
        <div class="modal-field">
          <label class="modal-label">Member</label>
          <select id="edit-fine-member">${memberOptions}</select>
        </div>
        <div class="modal-field">
          <label class="modal-label">Amount (₹)</label>
          <input type="number" id="edit-fine-amount" value="${fine.amount}" min="1" required>
        </div>
        <div class="modal-field">
          <label class="modal-label">Reason</label>
          <input type="text" id="edit-fine-reason" value="${fine.reason || ''}" required>
        </div>
        <div class="modal-field">
          <label class="modal-label">Date</label>
          <input type="date" id="edit-fine-date" value="${fine.date}" required>
        </div>
        <div class="modal-field">
          <label class="modal-label">Status</label>
          <select id="edit-fine-status">
            <option value="unpaid" ${fine.status === 'unpaid' ? 'selected' : ''}>Unpaid</option>
            <option value="paid" ${fine.status === 'paid' ? 'selected' : ''}>Paid</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-danger btn-sm" id="delete-fine-btn">Delete</button>
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-accent">Save Changes</button>
        </div>
      </form>
    `);

    document.getElementById('edit-fine-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.updateFine(fine.id, {
          member_id: parseInt(document.getElementById('edit-fine-member').value),
          amount: parseInt(document.getElementById('edit-fine-amount').value),
          reason: document.getElementById('edit-fine-reason').value,
          date: document.getElementById('edit-fine-date').value,
          status: document.getElementById('edit-fine-status').value,
        });
        UI.closeModal();
        UI.toast('Fine updated');
        App.refresh();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    };

    document.getElementById('delete-fine-btn').onclick = async () => {
      if (confirm('Delete this fine?')) {
        try {
          await API.deleteFine(fine.id);
          UI.closeModal();
          UI.toast('Fine deleted');
          App.refresh();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      }
    };
  },

  // Add Member Modal
  showAddMemberModal() {
    UI.showModal(`
      <h2 class="modal-title">Add Member</h2>
      <form id="add-member-form">
        <div class="modal-field">
          <label class="modal-label">Name</label>
          <input type="text" id="member-name" placeholder="Enter member name" required autofocus>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-accent">Add Member</button>
        </div>
      </form>
    `);

    document.getElementById('add-member-form').onsubmit = async (e) => {
      e.preventDefault();
      const name = document.getElementById('member-name').value.trim();
      if (!name) return;
      try {
        await API.addMember(name);
        UI.closeModal();
        UI.toast(`${name} added to the group`);
        App.refresh();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    };
  },

  // Edit Member Modal
  showEditMemberModal(member) {
    UI.showModal(`
      <h2 class="modal-title">Edit Member</h2>
      <form id="edit-member-form">
        <div class="modal-field">
          <label class="modal-label">Name</label>
          <input type="text" id="edit-member-name" value="${member.name}" required autofocus>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-danger btn-sm" id="remove-member-btn">Remove</button>
          <div style="flex:1"></div>
          <button type="button" class="btn btn-ghost" onclick="UI.closeModal()">Cancel</button>
          <button type="submit" class="btn btn-accent">Save</button>
        </div>
      </form>
    `);

    document.getElementById('edit-member-form').onsubmit = async (e) => {
      e.preventDefault();
      try {
        await API.updateMember(member.id, document.getElementById('edit-member-name').value.trim());
        UI.closeModal();
        UI.toast('Member updated');
        App.refresh();
      } catch (err) {
        UI.toast(err.message, 'error');
      }
    };

    document.getElementById('remove-member-btn').onclick = async () => {
      if (confirm(`Remove ${member.name} from the group? Their fine history will be preserved.`)) {
        try {
          await API.deleteMember(member.id);
          UI.closeModal();
          UI.toast(`${member.name} removed`);
          App.refresh();
        } catch (err) {
          UI.toast(err.message, 'error');
        }
      }
    };
  },
};
