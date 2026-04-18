const API_BASE = 'http://localhost:8000/api';

async function request(url, options = {}) {
  const token = localStorage.getItem('ats_token');
  const headers = {
    ...options.headers,
  };

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }));
    throw new Error(err.detail || 'Request failed');
  }

  // Handle 204 No Content
  if (res.status === 204) return null;
  return res.json();
}

// ───── Auth API ─────
export const authApi = {
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  }),
  signup: (name, email, password, role) => request('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password, role }),
  }),
};

// ───── Resume API ─────
export const resumeApi = {
  upload: async (file, userId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', String(userId));
    return request('/resumes/upload', {
      method: 'POST',
      body: formData,
    });
  },
  getByUserId: (userId) => request(`/resumes/user/${userId}`),
  getById: (id) => request(`/resumes/${id}`),
};

// ───── Job API ─────
export const jobApi = {
  create: (job) => request('/jobs/', {
    method: 'POST',
    body: JSON.stringify(job),
  }),
  getAll: () => request('/jobs/'),
  getByRecruiterId: (recruiterId) => request(`/jobs/recruiter/${recruiterId}`),
  getById: (id) => request(`/jobs/${id}`),
  getMatches: (userId) => request(`/jobs/matches/${userId}`),
};

// ───── Application API ─────
export const applicationApi = {
  apply: (jobId, candidateId, resumeId) => request('/applications/apply', {
    method: 'POST',
    body: JSON.stringify({ jobId, candidateId, resumeId }),
  }),
  getByCandidateId: (candidateId) => request(`/applications/candidate/${candidateId}`),
  getByJobId: (jobId) => request(`/applications/job/${jobId}`),
  getById: (applicationId) => request(`/applications/${applicationId}`),
  updateStatus: (applicationId, status) => request(`/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),
};

// ───── Dashboard API ─────
export const dashboardApi = {
  getCandidateProfile: (userId) => request(`/dashboard/candidate/${userId}`),
  getRecruiterDashboard: (recruiterId) => request(`/dashboard/recruiter/${recruiterId}`),
};

// ----- ATS API -----
export const atsApi = {
  analyze: (file, jobDescription, userId, saveResult = true) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('job_description', jobDescription);
    if (userId !== undefined && userId !== null) {
      formData.append('user_id', String(userId));
    }
    formData.append('save_result', String(saveResult));

    return request('/ats/analyze', {
      method: 'POST',
      body: formData,
    });
  },
  getHistory: (userId, limit = 20) => request(`/ats/history/${userId}?limit=${limit}`),
};
