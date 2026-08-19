// Main App — Router, Auth, Navigation
const App = {
  currentRoute: null,
  currentUser: null,

  async init() {
    // Check auth state
    try {
      const auth = await API.me();
      if (auth.authenticated) {
        App.currentUser = auth;
        App.showApp();
      } else {
        App.showLogin();
      }
    } catch {
      App.showLogin();
    }
  },

  async showLogin() {
    document.getElementById('login-screen').classList.remove('hidden');
    document.getElementById('app').classList.add('hidden');

    // Load members for login buttons
    try {
      const members = await API.getMembers();
      const container = document.getElementById('login-members');
      container.innerHTML = members.map(m => `
        <button class="login-member-btn" data-name="${m.name}">
          <div class="avatar">${UI.initials(m.name)}</div>
          ${m.name}
        </button>
      `).join('');

      container.querySelectorAll('.login-member-btn').forEach(btn => {
        btn.onclick = async () => {
          try {
            const result = await API.login(btn.dataset.name);
            App.currentUser = { name: result.name, id: result.id, authenticated: true };
            App.showApp();
          } catch (err) {
            UI.toast(err.message, 'error');
          }
        };
      });
    } catch (err) {
      document.getElementById('login-members').innerHTML =
        `<p class="text-secondary">Failed to load members: ${err.message}</p>`;
    }
  },

  showApp() {
    document.getElementById('login-screen').classList.add('hidden');
    document.getElementById('app').classList.remove('hidden');
    document.getElementById('current-user-name').textContent = App.currentUser.name;

    // Logout handler
    document.getElementById('btn-logout').onclick = async () => {
      await API.logout();
      App.currentUser = null;
      App.showLogin();
    };

    // Global add fine button
    document.getElementById('btn-add-fine-global').onclick = () => UI.showAddFineModal();

    // Route handling
    window.addEventListener('hashchange', () => App.route());

    // Set default route if none
    if (!window.location.hash || window.location.hash === '#/') {
      window.location.hash = '#/dashboard';
    } else {
      App.route();
    }
  },

  route() {
    const hash = window.location.hash || '#/dashboard';
    const parts = hash.replace('#/', '').split('/');
    const route = parts[0];
    const param = parts[1];

    App.currentRoute = route;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.route === route);
    });

    // Render view
    switch (route) {
      case 'dashboard':
        Dashboard.render();
        break;
      case 'members':
        Members.render();
        break;
      case 'member':
        if (param) Members.renderProfile(param);
        break;
      case 'fines':
        Fines.render();
        break;
      case 'today':
        TodayView.render();
        break;
      case 'rules':
        RulesView.render();
        break;
      default:
        Dashboard.render();
    }
  },

  // Refresh current view (called after data changes)
  refresh() {
    App.route();
  },
};

// Boot
document.addEventListener('DOMContentLoaded', () => App.init());
