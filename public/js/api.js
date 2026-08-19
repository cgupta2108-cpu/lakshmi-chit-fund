// API wrapper for all backend calls
const API = {
  async request(method, url, data = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (data && method !== 'GET') {
      opts.body = JSON.stringify(data);
    }
    const res = await fetch(url, opts);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Request failed');
    return json;
  },

  // Auth
  login(name) { return this.request('POST', '/api/auth/login', { name }); },
  me() { return this.request('GET', '/api/auth/me'); },
  logout() { return this.request('POST', '/api/auth/logout'); },

  // Members
  getMembers() { return this.request('GET', '/api/members'); },
  getMember(id) { return this.request('GET', `/api/members/${id}`); },
  addMember(name) { return this.request('POST', '/api/members', { name }); },
  updateMember(id, name) { return this.request('PUT', `/api/members/${id}`, { name }); },
  deleteMember(id) { return this.request('DELETE', `/api/members/${id}`); },

  // Fines
  getFines(params = {}) {
    const qs = new URLSearchParams(params).toString();
    return this.request('GET', `/api/fines${qs ? '?' + qs : ''}`);
  },
  addFine(data) { return this.request('POST', '/api/fines', data); },
  updateFine(id, data) { return this.request('PUT', `/api/fines/${id}`, data); },
  togglePay(id) { return this.request('PATCH', `/api/fines/${id}/pay`); },
  deleteFine(id) { return this.request('DELETE', `/api/fines/${id}`); },

  // Tasks
  getTodayTasks() { return this.request('GET', '/api/tasks/today'); },
  updateTask(memberId, completed) {
    return this.request('PUT', `/api/tasks/${memberId}/today`, { completed });
  },

  // Dashboard
  getDashboard() { return this.request('GET', '/api/dashboard'); },
  getActivity(limit = 20) { return this.request('GET', `/api/activity?limit=${limit}`); },
};
