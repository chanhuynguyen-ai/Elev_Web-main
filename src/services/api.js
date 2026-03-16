/* ===== SUNYBOT AGENT API SERVICE ===== */

const SESSION_KEY = 'sunybot_agent_session_id';

function randomId() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `suny-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getAgentSessionId() {
  try {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
      id = randomId();
      localStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return randomId();
  }
}

export function resetAgentSessionId() {
  const id = randomId();
  try {
    localStorage.setItem(SESSION_KEY, id);
  } catch {}
  return id;
}

function saveAgentSessionId(nextId) {
  if (!nextId) return;
  try {
    localStorage.setItem(SESSION_KEY, nextId);
  } catch {}
}

async function parseJsonSafe(response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function normalizeCitation(citation, idx) {
  if (!citation) {
    return { id: `cit-${idx}`, source: 'knowledge_base', content: '', score: null };
  }
  return {
    id: citation.id || `cit-${idx}`,
    source: citation.source || citation.title || 'knowledge_base',
    content: citation.content || citation.text || citation.snippet || '',
    score: typeof citation.score === 'number' ? citation.score : null,
  };
}

function normalizeToolTrace(trace, idx) {
  if (!trace) {
    return {
      id: `tool-${idx}`,
      tool_name: 'unknown_tool',
      args: {},
      status: 'ok',
      duration_ms: 0,
      summary: '',
    };
  }
  return {
    id: trace.id || `tool-${idx}`,
    tool_name: trace.tool_name || trace.tool || 'unknown_tool',
    args: trace.args || {},
    status: trace.status || 'ok',
    duration_ms: Number.isFinite(trace.duration_ms) ? trace.duration_ms : 0,
    summary: trace.summary || trace.result || '',
  };
}

export function normalizeAgentResponse(raw = {}, fallbackMessage = '') {
  const answer = raw.answer || raw.response || raw.final_answer || raw.message || 'Sunybot chưa có phản hồi.';
  const normalized = {
    answer,
    source: raw.source || 'agent',
    intent: raw.intent || null,
    confidence: typeof raw.confidence === 'number' ? raw.confidence : null,
    session_id: raw.session_id || getAgentSessionId(),
    tool_trace: Array.isArray(raw.tool_trace) ? raw.tool_trace.map(normalizeToolTrace) : [],
    citations: Array.isArray(raw.citations) ? raw.citations.map(normalizeCitation) : [],
    memory_summary: raw.memory_summary || '',
    requires_human: Boolean(raw.requires_human),
    status: raw.status || 'ok',
    request_message: fallbackMessage,
    raw,
  };
  saveAgentSessionId(normalized.session_id);
  return normalized;
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await parseJsonSafe(response);
  if (!response.ok) {
    const err = new Error(data?.error || data?.detail || `HTTP ${response.status}`);
    err.status = response.status;
    err.payload = data;
    throw err;
  }
  return data;
}

async function requestFirstSuccess(attempts = []) {
  let lastError = null;
  for (const attempt of attempts) {
    try {
      return await requestJson(attempt.url, attempt.options);
    } catch (err) {
      lastError = err;
    }
  }
  throw lastError || new Error('Không thể kết nối backend');
}

export async function fetchChatAbortable(message, signal, extra = {}) {
  const payload = {
    message,
    question: message,
    session_id: extra.session_id || getAgentSessionId(),
    employee_id: extra.employee_id || '',
    employee_name: extra.employee_name || '',
  };
  const data = await requestJson('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
  return normalizeAgentResponse(data, message);
}

const api = {
  elevatorStatus: () => requestJson('/api/elevator/status'),
  weather: () => requestJson('/api/weather'),
  agentStatus: () => requestJson('/status'),

  chat: async (message, extra = {}) => {
    const payload = {
      message,
      question: message,
      session_id: extra.session_id || getAgentSessionId(),
      employee_id: extra.employee_id || '',
      employee_name: extra.employee_name || '',
    };
    const data = await requestJson('/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return normalizeAgentResponse(data, message);
  },

  command: async ({ elevator_id = 1, from_floor = null, target_floor = null, direction = 'up' } = {}) => {
    return requestFirstSuccess([
      {
        url: '/command',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ elevator_id, from_floor, target_floor, direction }),
        },
      },
      {
        url: '/api/elevator/call',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ floor: target_floor ?? from_floor, direction }),
        },
      },
    ]);
  },

  callFloor: async (floor) => {
    const result = await api.command({ target_floor: floor, direction: 'up' });
    try {
      localStorage.setItem('lift_target', String(floor));
    } catch {}
    return result;
  },

  sos: async (payload = {}) => {
    return requestFirstSuccess([
      {
        url: '/api/sos',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      },
      {
        url: '/chat',
        options: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `Kích hoạt SOS khẩn cấp cho thang máy ${payload.elevator || 'A'} tại tầng ${payload.floor || '--'}`,
            session_id: getAgentSessionId(),
          }),
        },
      },
    ]);
  },

  adminMysql: {
    async connect(payload) {
      return requestJson('/api/admin/mysql/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async useDb(payload) {
      return requestJson('/api/admin/mysql/use-db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },

    async tables({ connection_id, database }) {
      const params = new URLSearchParams();
      if (connection_id) params.set('connection_id', String(connection_id));
      if (database) params.set('database', String(database));
      return requestJson(`/api/admin/mysql/tables?${params.toString()}`);
    },

    async table({ connection_id, database, table }) {
      const params = new URLSearchParams();
      if (connection_id) params.set('connection_id', String(connection_id));
      if (database) params.set('database', String(database));
      if (table) params.set('table', String(table));
      return requestJson(`/api/admin/mysql/table?${params.toString()}`);
    },

    async saveTable(payload) {
      return requestJson('/api/admin/mysql/save-table', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    },
  },
};

export default api;
