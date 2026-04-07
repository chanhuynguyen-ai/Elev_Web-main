
import React, { useEffect, useMemo, useState } from 'react';
import useElevatorStatus from '../hooks/useElevatorStatus';
import useClock from '../hooks/useClock';
import { useToast } from '../components/Toast';
import AgentTracePanel from '../components/AgentTracePanel';
import api, { getAgentSessionId, resetAgentSessionId } from '../services/api';
import './Maintenance.css';

const ALL_FLOORS = Array.from({ length: 15 }, (_, i) => i + 1);

const DATASET_OPTIONS = {
  elevator_cv: [
    { key: 'camera_events', label: 'camera_events' },
    { key: 'camera_occupancy_samples', label: 'camera_occupancy_samples' },
    { key: 'person_registry', label: 'person_registry' },
    { key: 'face_embeddings', label: 'face_embeddings' },
  ],
  elevator_llm: [
    { key: 'employees', label: 'employees' },
    { key: 'intents', label: 'intents' },
    { key: 'prompts', label: 'prompts' },
    { key: 'answers', label: 'answers' },
  ],
};

const QUICK_PROMPTS = [
  'Tóm tắt lỗi nổi bật hôm nay',
  'Lỗi nào xuất hiện nhiều nhất?',
  'Trạng thái thang máy hiện tại',
  'Cảnh báo nào cần ưu tiên xử lý?',
];

function formatEventType(event) {
  const raw = String(
    event.title || event.event_type || event.type || event.event || event.label || ''
  ).toUpperCase();
  if (raw.includes('BOTTLE')) return 'Phát hiện chai nhựa';
  if (raw.includes('FALL')) return 'Phát hiện té ngã';
  if (raw.includes('LYING')) return 'Phát hiện nằm bất thường';
  if (raw.includes('CROWD')) return 'Mật độ đông người';
  if (raw.includes('UNKNOWN') || raw.includes('UNIDENTIFIED')) return 'Đối tượng chưa gán nhãn';
  return event.title || event.event || event.event_type || 'Sự kiện camera';
}

function inferSeverity(event) {
  const raw = String(event.severity || event.type || event.event_type || '').toUpperCase();
  if (raw.includes('ERROR') || raw.includes('FALL')) return 'error';
  if (raw.includes('WARN') || raw.includes('CROWD') || raw.includes('BOTTLE')) return 'warn';
  return 'info';
}

function formatClockLike(value) {
  if (!value) return '--';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function normalizeEventRow(event, idx) {
  return {
    id: event.id || event.event_id || idx,
    time: formatClockLike(event.event_ts || event.timestamp || event.created_at || event.time),
    title: formatEventType(event),
    severity: inferSeverity(event),
    location: event.cam_id || event.location || '#A / Camera',
    peopleCount: event.people_count ?? event.people ?? '--',
    confidence:
      typeof event.confidence === 'number'
        ? `${Math.round(event.confidence * 100)}%`
        : event.confidence || '--',
    raw: event,
  };
}

function normalizeDensityData(data) {
  if (!Array.isArray(data) || !data.length) {
    return [
      { label: 'Mon', value: 8 },
      { label: 'Tue', value: 14 },
      { label: 'Wed', value: 11 },
      { label: 'Thu', value: 17 },
      { label: 'Fri', value: 13 },
      { label: 'Sat', value: 7 },
      { label: 'Sun', value: 5 },
    ];
  }
  return data.map((item, idx) => {
    const rawLabel = item.day || item.date || item.label || item.sample_ts || item.ts || '';
    let label = rawLabel;
    if (rawLabel) {
      const d = new Date(rawLabel);
      if (!Number.isNaN(d.getTime())) {
        label = d.toLocaleDateString('en-US', { weekday: 'short' });
      }
    }
    return {
      label: label || `D${idx + 1}`,
      value: Number(item.count ?? item.total ?? item.people_count ?? item.avg_people ?? item.value ?? 0),
    };
  });
}

function buildTableData(selectedDb, selectedTable, events, density, status) {
  if (selectedDb === 'elevator_cv') {
    if (selectedTable === 'camera_events') {
      return {
        columns: ['id', 'event_ts', 'event_type', 'cam_id', 'people_count', 'confidence'],
        rows: events.map((event, idx) => ({
          id: event.id || idx + 1,
          event_ts: event.raw?.event_ts || event.raw?.timestamp || event.time,
          event_type: event.raw?.event_type || event.title,
          cam_id: event.raw?.cam_id || 'cam_01',
          people_count: event.peopleCount,
          confidence: event.confidence,
        })),
      };
    }
    if (selectedTable === 'camera_occupancy_samples') {
      return {
        columns: ['id', 'sample_day', 'people_count', 'cam_id'],
        rows: density.map((item, idx) => ({
          id: idx + 1,
          sample_day: item.label,
          people_count: item.value,
          cam_id: status?.cam_id || 'cam_01',
        })),
      };
    }
    if (selectedTable === 'person_registry') {
      return {
        columns: ['person_id', 'name', 'department', 'status'],
        rows: [
          { person_id: 'EMP001', name: 'Nguyễn Văn A', department: 'Kỹ thuật', status: 'registered' },
          { person_id: 'EMP002', name: 'Trần Thị B', department: 'Quản lý', status: 'registered' },
        ],
      };
    }
    if (selectedTable === 'face_embeddings') {
      return {
        columns: ['embedding_id', 'person_id', 'vector_state'],
        rows: [
          { embedding_id: 'EMB001', person_id: 'EMP001', vector_state: 'available' },
          { embedding_id: 'EMB002', person_id: 'EMP002', vector_state: 'available' },
        ],
      };
    }
  }

  if (selectedDb === 'elevator_llm') {
    if (selectedTable === 'employees') {
      return {
        columns: ['employee_id', 'full_name', 'department'],
        rows: [
          { employee_id: 'NV001', full_name: 'Nguyễn Văn A', department: 'Kỹ thuật' },
          { employee_id: 'NV002', full_name: 'Trần Thị B', department: 'Quản lý' },
        ],
      };
    }
    if (selectedTable === 'intents') {
      return {
        columns: ['intent_name', 'description'],
        rows: [
          { intent_name: 'faq_status', description: 'Câu hỏi trạng thái thang máy' },
          { intent_name: 'cv_analytics', description: 'Câu hỏi dữ liệu camera realtime' },
        ],
      };
    }
    if (selectedTable === 'prompts') {
      return {
        columns: ['prompt_id', 'prompt_text'],
        rows: [
          { prompt_id: 1, prompt_text: 'Thang máy có quá tải không?' },
          { prompt_id: 2, prompt_text: 'Camera 1 đông nhất lúc nào?' },
        ],
      };
    }
    if (selectedTable === 'answers') {
      return {
        columns: ['answer_id', 'answer_preview'],
        rows: [
          { answer_id: 1, answer_preview: 'Hiện tại thang máy không quá tải.' },
          { answer_id: 2, answer_preview: 'Khung giờ cao điểm là 08h và 17h.' },
        ],
      };
    }
  }

  return { columns: ['id'], rows: [] };
}

function getUnknownCandidate(events) {
  return events.find((event) =>
    /unknown|unidentified|chưa gán nhãn|unknown_person|unknown face/i.test(
      [event.raw?.event_type, event.raw?.title, event.raw?.event, event.title].filter(Boolean).join(' ')
    )
  );
}

export default function Maintenance() {
  const showToast = useToast();
  const status = useElevatorStatus();
  const clock = useClock();

  const [authed, setAuthed] = useState(() => localStorage.getItem('maint_authed') === '1');
  const [empCode, setEmpCode] = useState('');
  const [mssv, setMssv] = useState('');

  const [cameraVisible, setCameraVisible] = useState(true);
  const [streamUrl, setStreamUrl] = useState('');
  const [cvStatus, setCvStatus] = useState(null);
  const [cvEvents, setCvEvents] = useState([]);
  const [densityData, setDensityData] = useState([]);
  const [showFaceModal, setShowFaceModal] = useState(false);
  const [registerBusy, setRegisterBusy] = useState(false);
  const [faceForm, setFaceForm] = useState({
    employee_code: '',
    employee_name: '',
    department: '',
    note: '',
  });

  const [llmInput, setLlmInput] = useState('');
  const [llmOutput, setLlmOutput] = useState('Kết quả sẽ hiển thị ở đây.');
  const [llmBusy, setLlmBusy] = useState(false);
  const [llmAgentData, setLlmAgentData] = useState(null);
  const [agentSessionId, setAgentSessionId] = useState(() => getAgentSessionId());

  const [selectedDb, setSelectedDb] = useState('elevator_cv');
  const [selectedTable, setSelectedTable] = useState('camera_events');
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(5);

  const [lockedFloors, setLockedFloors] = useState(() => {
    const saved = localStorage.getItem('locked_floors');
    return saved ? JSON.parse(saved) : [5, 6, 7];
  });
  const [floorPins, setFloorPins] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('floor_pins') || '{}');
    } catch {
      return {};
    }
  });
  const [floorAuthConfig, setFloorAuthConfig] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('floor_auth_config') || '{}');
    } catch {
      return {};
    }
  });
  const [editingPin, setEditingPin] = useState(false);
  const [pinInput, setPinInput] = useState('');

  useEffect(() => {
    let disposed = false;

    async function loadCvData() {
      try {
        const [streamData, statusData, eventsData, densityApiData] = await Promise.all([
          api.cvStreamUrl?.(),
          api.cvStatus?.(),
          api.cvEvents?.(20),
          api.cvDensity?.(7),
        ]);

        if (disposed) return;

        setStreamUrl(streamData?.stream_url || streamData?.url || '');
        setCvStatus(statusData || null);

        const eventsPayload = Array.isArray(eventsData)
          ? eventsData
          : eventsData?.events || eventsData?.items || [];
        setCvEvents(eventsPayload.map(normalizeEventRow));

        const densityPayload = Array.isArray(densityApiData)
          ? densityApiData
          : densityApiData?.items || densityApiData?.data || densityApiData?.density || [];
        setDensityData(normalizeDensityData(densityPayload));
      } catch (err) {
        if (!disposed) {
          setCvStatus((prev) => prev || { camera_online: false, backend: 'TensorRT', cam_id: 'cam_01' });
          setCvEvents([]);
          setDensityData(normalizeDensityData([]));
        }
      }
    }

    loadCvData();
    const timer = setInterval(loadCvData, 3000);
    return () => {
      disposed = true;
      clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    setSelectedTable(DATASET_OPTIONS[selectedDb][0].key);
    setSelectedRowIds([]);
  }, [selectedDb]);

  const unknownCandidate = useMemo(() => getUnknownCandidate(cvEvents), [cvEvents]);
  const tableData = useMemo(
    () => buildTableData(selectedDb, selectedTable, cvEvents, densityData, cvStatus),
    [selectedDb, selectedTable, cvEvents, densityData, cvStatus]
  );

  const currentFloorCfg = floorAuthConfig[selectedFloor] || { pin: true, face: false };
  const isSelectedFloorLocked = lockedFloors.includes(selectedFloor);
  const directionText = status.direction || '--';
  const densityMax = Math.max(1, ...densityData.map((d) => d.value));

  const summaryTiles = [
    { label: 'Tầng', value: status.floor ?? '--' },
    { label: 'Hướng', value: directionText },
    { label: 'Cửa', value: status.door ?? '--' },
    { label: 'Người', value: status.people_count ?? '--' },
    { label: 'Cập nhật', value: clock },
  ];

  const healthTiles = [
    { label: 'Camera', value: cvStatus?.camera_online ? 'ON' : 'OFF', tone: cvStatus?.camera_online ? 'ok' : 'err' },
    { label: 'FPS', value: cvStatus?.fps ?? '--' },
    { label: 'Người', value: cvStatus?.people_count ?? cvStatus?.people ?? '--' },
    { label: 'Event', value: cvStatus?.last_event_type || cvStatus?.last_event || '--' },
    { label: 'Backend', value: cvStatus?.backend || 'TensorRT' },
    { label: 'Cam ID', value: cvStatus?.cam_id || 'cam_01' },
    { label: 'DB CV', value: 'elevator_cv' },
    { label: 'DB LLM', value: 'elevator_llm' },
    { label: 'Storage', value: '72%' },
    { label: 'Mạng', value: 'Ổn định', tone: 'ok' },
    { label: 'Chờ gán nhãn', value: unknownCandidate ? 'Có' : 'Không', tone: unknownCandidate ? 'warn' : 'ok' },
  ];

  const handleLogin = () => {
    if (!empCode.trim() || !mssv.trim()) {
      showToast('Vui lòng nhập mã nhân viên và MSSV');
      return;
    }
    localStorage.setItem('maint_authed', '1');
    setAuthed(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('maint_authed');
    setAuthed(false);
  };

  const fillDemo = () => {
    setEmpCode('NV001');
    setMssv('22110000');
  };

  const handleResetAgentSession = () => {
    const next = resetAgentSessionId();
    setAgentSessionId(next);
    setLlmAgentData(null);
    setLlmOutput('Đã tạo phiên kỹ thuật mới cho LLM Console.');
    showToast('Đã tạo phiên debug mới');
  };

  const runLLMQuery = async () => {
    if (!llmInput.trim()) {
      setLlmOutput('Nhập câu hỏi để truy vấn.');
      return;
    }
    setLlmBusy(true);
    setLlmOutput('Đang truy vấn agent...');
    try {
      const data = await api.chat(llmInput, {
        session_id: agentSessionId,
        employee_id: empCode,
        employee_name: empCode,
      });
      setLlmOutput(data.answer || 'Không có phản hồi.');
      setLlmAgentData(data);
      setAgentSessionId(data.session_id || agentSessionId);
      if (data.requires_human) showToast('Agent đề xuất chuyển ca hoặc escalate kỹ thuật.');
    } catch (err) {
      setLlmOutput(`Lỗi truy vấn agent: ${err.message || err}`);
      setLlmAgentData(null);
    } finally {
      setLlmBusy(false);
    }
  };

  const toggleFloorLock = (floor) => {
    setSelectedFloor(floor);
    setLockedFloors((prev) => {
      const next = prev.includes(floor) ? prev.filter((f) => f !== floor) : [...prev, floor];
      localStorage.setItem('locked_floors', JSON.stringify(next));
      showToast(next.includes(floor) ? `Đã khóa tầng ${floor}` : `Đã mở khóa tầng ${floor}`);
      return next;
    });
  };

  const toggleAuthType = (floor, type) => {
    setFloorAuthConfig((prev) => {
      const floorCfg = prev[floor] || { pin: true, face: false };
      const newFloorCfg = { ...floorCfg, [type]: !floorCfg[type] };
      if (!newFloorCfg.pin && !newFloorCfg.face) return prev;
      const next = { ...prev, [floor]: newFloorCfg };
      localStorage.setItem('floor_auth_config', JSON.stringify(next));
      return next;
    });
  };

  const savePin = () => {
    if (!/^\d{4}$/.test(pinInput)) {
      showToast('PIN phải đủ 4 chữ số');
      return;
    }
    const next = { ...floorPins, [selectedFloor]: pinInput };
    setFloorPins(next);
    localStorage.setItem('floor_pins', JSON.stringify(next));
    setEditingPin(false);
    setPinInput('');
    showToast(`Đã đặt PIN cho tầng ${selectedFloor}`);
  };

  const removePin = () => {
    const next = { ...floorPins };
    delete next[selectedFloor];
    setFloorPins(next);
    localStorage.setItem('floor_pins', JSON.stringify(next));
    showToast(`Đã xóa PIN tầng ${selectedFloor}`);
  };

  const openRegisterFace = () => {
    if (unknownCandidate) {
      setFaceForm((prev) => ({
        ...prev,
        note: `Ứng viên từ event ${unknownCandidate.title} lúc ${unknownCandidate.time}`,
      }));
    }
    setShowFaceModal(true);
  };

  const handleRegisterFace = async () => {
    if (!faceForm.employee_code.trim() || !faceForm.employee_name.trim()) {
      showToast('Nhập mã nhân viên và họ tên trước khi đăng ký');
      return;
    }
    setRegisterBusy(true);
    try {
      await api.registerFace?.({
        ...faceForm,
        cam_id: cvStatus?.cam_id || 'cam_01',
        source_event: unknownCandidate?.raw || null,
      });
      showToast('Đã gửi đăng ký khuôn mặt');
      setShowFaceModal(false);
      setFaceForm({ employee_code: '', employee_name: '', department: '', note: '' });
    } catch (err) {
      showToast('Backend chưa lưu được đăng ký khuôn mặt', err.message || String(err));
    } finally {
      setRegisterBusy(false);
    }
  };

  const toggleDataRow = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleDataAction = (action) => {
    const labels = {
      add: 'Add Row',
      delete: 'Delete Selected',
      save: 'Save Changes',
      refresh: 'Refresh',
      load: 'Load / Refresh Table',
    };
    showToast(`${labels[action]} (demo)`, `${selectedDb}.${selectedTable}`);
  };

  if (!authed) {
    return (
      <div className="maint-login-screen">
        <div className="page-title">
          <h1>Trung tâm bảo trì</h1>
          <div className="meta">Chỉ dành cho kỹ thuật</div>
        </div>

        <div className="maint-login-card">
          <div className="maint-login-head">
            <div>
              <h3>Đăng nhập bảo trì</h3>
              <div className="muted">Nhập mã nhân viên và MSSV để truy cập dashboard kỹ thuật.</div>
            </div>
            <span className="tag">Maintenance only</span>
          </div>

          <div className="maint-login-form">
            <label>
              <span>Mã nhân viên</span>
              <input
                value={empCode}
                onChange={(e) => setEmpCode(e.target.value)}
                placeholder="VD: NV001"
              />
            </label>
            <label>
              <span>MSSV / mật khẩu kỹ thuật</span>
              <input
                value={mssv}
                onChange={(e) => setMssv(e.target.value)}
                type="password"
                placeholder="Nhập MSSV hoặc mã truy cập"
              />
            </label>
          </div>

          <div className="login-actions">
            <button className="btn btn-primary" onClick={handleLogin}>
              Đăng nhập
            </button>
            <button className="btn btn-ghost" onClick={fillDemo}>
              Demo nhanh
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="maintenance-v5">
      <div className="page-title">
        <h1>Trung tâm bảo trì</h1>
        <div className="meta">Xin chào, {empCode || 'Kỹ thuật viên'} · {clock}</div>
      </div>

      <section className="maint-top-grid">
        <div className="card maint-camera-card">
          <div className="maint-card-head">
            <div>
              <h3>Live Camera &amp; CV Monitor</h3>
              <div className="muted">
                Camera thật từ CV service. Ẩn màn hình chỉ tác động UI, backend vẫn nhận diện và ghi dữ liệu.
              </div>
            </div>
          </div>

          <div className="camera-meta-row">
            <span className="camera-live-dot">● LIVE</span>
            <span className="tag">Person tracking</span>
            <span className="tag">Object detection</span>
            <span className="tag">Face recognition</span>
            <span className="tag">People: {cvStatus?.people_count ?? '--'}</span>
            <span className="tag">FPS: {cvStatus?.fps ?? '--'}</span>
          </div>

          <div className="camera-stage">
            {cameraVisible && streamUrl ? (
              <img src={streamUrl} alt="CV stream" className="camera-image-fill" />
            ) : (
              <div className="camera-placeholder-full">
                <div className="camera-icon">🖥️</div>
                <div className="camera-placeholder-title">
                  {cameraVisible ? 'Chưa có luồng camera từ backend CV' : 'Màn hình camera đang được ẩn'}
                </div>
                <div className="camera-subnote">
                  {cameraVisible
                    ? 'Kiểm tra stream URL hoặc proxy MJPEG của backend chính.'
                    : 'Camera backend vẫn chạy để nhận diện và ghi dữ liệu.'}
                </div>
              </div>
            )}

            <div className="camera-floating-actions">
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setCameraVisible((v) => !v)}
              >
                {cameraVisible ? 'Ẩn màn hình camera' : 'Bật màn hình camera'}
              </button>
              <button className="btn btn-primary btn-sm" onClick={openRegisterFace}>
                Đăng ký khuôn mặt
              </button>
            </div>
          </div>
        </div>

        <div className="maint-side-rail-v3">
          <div className="card compact-summary-card">
            <div className="panel-title-row">
              <h3>Tóm tắt hệ thống</h3>
              <span className="tag">Realtime</span>
            </div>
            <div className="metric-compact-grid">
              {summaryTiles.map((item) => (
                <div key={item.label} className="metric-card-small">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="card compact-health-card">
            <div className="panel-title-row">
              <h3>Sức khỏe camera &amp; cấu hình</h3>
              <span className="tag">CV + LLM</span>
            </div>
            <div className="metric-health-grid">
              {healthTiles.map((item) => (
                <div key={item.label} className={`health-chip ${item.tone || ''}`}>
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="maint-middle-grid">
        <div className="card timeline-card">
          <div className="panel-title-row">
            <h3>Timeline sự kiện camera</h3>
            <span className="tag">{cvEvents.length} sự kiện</span>
          </div>
          <div className="table-shell">
            <table className="table timeline-table">
              <thead>
                <tr>
                  <th>Giờ</th>
                  <th>Sự kiện</th>
                  <th>Mức độ</th>
                  <th>Vị trí</th>
                </tr>
              </thead>
              <tbody>
                {cvEvents.length ? (
                  cvEvents.map((event) => (
                    <tr key={event.id}>
                      <td>{event.time}</td>
                      <td>{event.title}</td>
                      <td>
                        <span className={`event-badge ${event.severity}`}>
                          {event.severity === 'error'
                            ? 'LỖI'
                            : event.severity === 'warn'
                            ? 'WARN'
                            : 'INFO'}
                        </span>
                      </td>
                      <td>{event.location}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="empty-cell">
                      Chưa có sự kiện camera gần đây.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card llm-console-card">
          <div className="llm-console-head">
            <div>
              <h3>Trợ lý bảo trì (LLM Console)</h3>
              <div className="muted">
                Debug agent, truy vết tool, xem memory và citations cho kỹ thuật viên.
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={handleResetAgentSession}>
              Phiên mới
            </button>
          </div>

          <div className="llm-console-meta">
            <div className="llm-meta-main">
              <span className="tag">Phiên hiện tại</span>
              <span className="llm-session mono">{agentSessionId}</span>
            </div>
            <div className="llm-meta-tags">
              {llmAgentData?.intent ? <span className="tag">Intent: {llmAgentData.intent}</span> : null}
              {llmAgentData?.requires_human ? (
                <span className="tag llm-warn">Cần handoff</span>
              ) : null}
            </div>
          </div>

          <div className="llm-quick-grid">
            {QUICK_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className="quick-prompt-btn"
                onClick={() => setLlmInput(prompt)}
              >
                {prompt}
              </button>
            ))}
          </div>

          <div className="llm-output llm-answer-box">{llmOutput}</div>

          <div className="llm-console-input-row">
            <input
              value={llmInput}
              onChange={(e) => setLlmInput(e.target.value)}
              placeholder="VD: Lỗi nào nhiều nhất?"
              onKeyDown={(e) => e.key === 'Enter' && runLLMQuery()}
            />
            <button className="btn btn-primary" onClick={runLLMQuery} disabled={llmBusy}>
              {llmBusy ? 'Đang chạy...' : 'Gửi'}
            </button>
          </div>

          {llmAgentData ? <AgentTracePanel data={llmAgentData} compact /> : null}
        </div>
      </section>

      <section className="card data-manager-wide-card">
        <div className="data-manager-head">
          <div>
            <h3>Quản lý dữ liệu &amp; Database</h3>
            <div className="muted">
              Bố cục theo tool admin desktop: cột trái chọn DB/bảng, cột phải xem và chỉnh dữ liệu
              với Add / Delete / Save / Refresh.
            </div>
          </div>
          <span className="tag">PK-safe mindset</span>
        </div>

        <div className="data-manager-wide-layout">
          <div className="db-left-rail">
            <div className="db-connect-card">
              <div className="db-conn-row"><span>Host</span><b>localhost</b></div>
              <div className="db-conn-row"><span>Port</span><b>5432</b></div>
              <div className="db-conn-row"><span>User</span><b>elevator_ai</b></div>
              <div className="db-conn-actions">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => showToast('Connect (demo)', 'Dùng API backend để kết nối thật')}
                >
                  Connect
                </button>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => showToast('Use Database', selectedDb)}
                >
                  Use Database
                </button>
              </div>
            </div>

            <div className="db-picker-group">
              <div className="db-picker-title">Databases</div>
              <div className="db-chip-row">
                {Object.keys(DATASET_OPTIONS).map((db) => (
                  <button
                    key={db}
                    className={`db-chip ${selectedDb === db ? 'active' : ''}`}
                    onClick={() => setSelectedDb(db)}
                  >
                    {db}
                  </button>
                ))}
              </div>
            </div>

            <div className="db-picker-group">
              <div className="db-picker-title">Tables</div>
              <div className="db-table-list">
                {DATASET_OPTIONS[selectedDb].map((table) => (
                  <button
                    key={table.key}
                    className={`db-table-item ${selectedTable === table.key ? 'active' : ''}`}
                    onClick={() => setSelectedTable(table.key)}
                  >
                    {table.label}
                  </button>
                ))}
              </div>
            </div>

            <button className="btn btn-primary" onClick={() => handleDataAction('load')}>
              Load / Refresh Table
            </button>
          </div>

          <div className="db-right-panel">
            <div className="db-right-top">
              <div>
                <div className="db-current-label">Bảng hiện tại</div>
                <div className="db-current-name">{selectedDb}.{selectedTable}</div>
              </div>
              <div className="db-action-row">
                <button className="btn btn-ghost btn-sm" onClick={() => handleDataAction('add')}>
                  Add Row
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDataAction('delete')}>
                  Delete Selected
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => handleDataAction('save')}>
                  Save Changes
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDataAction('refresh')}>
                  Refresh
                </button>
              </div>
            </div>

            <div className="db-table-shell">
              <table className="table db-table">
                <thead>
                  <tr>
                    <th></th>
                    {tableData.columns.map((col) => <th key={col}>{col}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tableData.rows.length ? (
                    tableData.rows.map((row, idx) => {
                      const rowId = row.id || idx + 1;
                      return (
                        <tr key={rowId}>
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedRowIds.includes(rowId)}
                              onChange={() => toggleDataRow(rowId)}
                            />
                          </td>
                          {tableData.columns.map((col) => <td key={col}>{row[col] ?? '--'}</td>)}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={tableData.columns.length + 1} className="empty-cell">
                        Không có dữ liệu.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="muted db-footer-note">
              {selectedDb === 'elevator_cv'
                ? 'Bảng nguồn CV đang hiển thị theo read-only để tránh ghi đè dữ liệu realtime.'
                : 'Phần ghi/chỉnh xóa thật sẽ nối qua backend Data Manager ở bước kế tiếp.'}
            </div>
          </div>
        </div>
      </section>

      <div className="maintenance-bottom-actions">
        <button
          className={`btn btn-ghost ${expandedPanel === 'density' ? 'active-inline-toggle' : ''}`}
          onClick={() => setExpandedPanel((prev) => (prev === 'density' ? null : 'density'))}
        >
          {expandedPanel === 'density' ? 'Ẩn mật độ người/ngày' : 'Mật độ người / ngày'}
        </button>
        <button
          className={`btn btn-ghost ${expandedPanel === 'locks' ? 'active-inline-toggle' : ''}`}
          onClick={() => setExpandedPanel((prev) => (prev === 'locks' ? null : 'locks'))}
        >
          {expandedPanel === 'locks' ? 'Ẩn quản lý khóa tầng' : 'Quản lý khóa tầng'}
        </button>
        <button className="btn btn-ghost" onClick={handleLogout}>
          Đăng xuất
        </button>
      </div>

      {expandedPanel === 'density' && (
        <section className="card expandable-bottom-card">
          <div className="expandable-head">
            <div>
              <h3>Mật độ người / ngày</h3>
              <div className="muted">Nguồn từ camera_occupancy_samples của CV service.</div>
            </div>
            <span className="tag">Cam: {cvStatus?.cam_id || 'cam_01'}</span>
          </div>
          <div className="density-chart wide-density-chart">
            {densityData.map((item) => (
              <div key={item.label} className="bar-col">
                <div className="bar" style={{ height: `${(item.value / densityMax) * 100}%` }}>
                  <span className="bar-val">{item.value}</span>
                </div>
                <span className="bar-label">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="inline" style={{ marginTop: 10 }}>
            <span className="pill">Cam: {cvStatus?.cam_id || 'cam_01'}</span>
            <span className="pill">Đang tải: {unknownCandidate ? 'Có' : 'Không'}</span>
          </div>
        </section>
      )}

      {expandedPanel === 'locks' && (
        <section className="card expandable-bottom-card">
          <div className="expandable-head">
            <div>
              <h3>Quản lý khóa tầng</h3>
              <div className="muted">Chọn tầng ở bên trái, cấu hình PIN/Face ở panel chi tiết bên phải.</div>
            </div>
          </div>
          <div className="lock-manager-v2">
            <div className="lock-floor-grid">
              {ALL_FLOORS.map((floor) => {
                const locked = lockedFloors.includes(floor);
                const selected = selectedFloor === floor;
                return (
                  <button
                    key={floor}
                    className={`floor-lock-tile ${locked ? 'locked' : 'unlocked'} ${selected ? 'selected' : ''}`}
                    onClick={() => setSelectedFloor(floor)}
                  >
                    <span className="floor-lock-label">T{floor}</span>
                    <span className="floor-lock-state">{locked ? '🔒' : '🔓'}</span>
                  </button>
                );
              })}
            </div>
            <div className="lock-details-card">
              <div className="lock-details-head">
                <h4>Tầng {selectedFloor}</h4>
                <button className="btn btn-ghost btn-sm" onClick={() => toggleFloorLock(selectedFloor)}>
                  {isSelectedFloorLocked ? 'Mở khóa tầng' : 'Khóa tầng'}
                </button>
              </div>
              <div className="lock-status-line">
                <span className={`event-badge ${isSelectedFloorLocked ? 'warn' : 'info'}`}>
                  {isSelectedFloorLocked ? 'Đang khóa' : 'Đang mở'}
                </span>
              </div>
              {isSelectedFloorLocked && (
                <>
                  <div className="lock-auth-grid">
                    <label className="lock-check">
                      <input
                        type="checkbox"
                        checked={currentFloorCfg.pin ?? true}
                        onChange={() => toggleAuthType(selectedFloor, 'pin')}
                      />
                      PIN
                    </label>
                    <label className="lock-check">
                      <input
                        type="checkbox"
                        checked={currentFloorCfg.face ?? false}
                        onChange={() => toggleAuthType(selectedFloor, 'face')}
                      />
                      Face ID
                    </label>
                  </div>
                  {(currentFloorCfg.pin ?? true) && (
                    <div className="lock-pin-box">
                      {editingPin ? (
                        <div className="lock-pin-edit-row">
                          <input
                            className="pin-inp"
                            value={pinInput}
                            onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                            placeholder="4 số"
                            maxLength={4}
                          />
                          <button className="btn btn-primary btn-sm" onClick={savePin}>Lưu PIN</button>
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                              setEditingPin(false);
                              setPinInput('');
                            }}
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <div className="lock-pin-display">
                          <div className="muted">PIN hiện tại</div>
                          <div className="lock-pin-value">{floorPins[selectedFloor] ? '****' : 'Chưa đặt PIN'}</div>
                          <div className="inline">
                            <button
                              className="btn btn-ghost btn-sm"
                              onClick={() => {
                                setEditingPin(true);
                                setPinInput(floorPins[selectedFloor] || '');
                              }}
                            >
                              {floorPins[selectedFloor] ? 'Sửa PIN' : 'Đặt PIN'}
                            </button>
                            {floorPins[selectedFloor] ? (
                              <button className="btn btn-ghost btn-sm" onClick={removePin}>
                                Xóa PIN
                              </button>
                            ) : null}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </section>
      )}

      {showFaceModal && (
        <div className="overlay-backdrop" onClick={() => setShowFaceModal(false)}>
          <div className="face-register-modal" onClick={(e) => e.stopPropagation()}>
            <div className="face-register-head">
              <div>
                <h3>Đăng ký khuôn mặt nhân viên</h3>
                <div className="muted">
                  Dùng khi model phát hiện người nhưng chưa biết đó là ai.
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowFaceModal(false)}>
                Đóng
              </button>
            </div>

            <div className="face-register-candidate">
              <div className="face-candidate-title">Đối tượng chờ gán nhãn</div>
              {unknownCandidate ? (
                <div className="face-candidate-box">
                  <span>{unknownCandidate.title}</span>
                  <span>{unknownCandidate.time}</span>
                  <span>{unknownCandidate.location}</span>
                </div>
              ) : (
                <div className="face-candidate-box empty">
                  Chưa có unknown person gần đây. Bạn vẫn có thể đăng ký thủ công.
                </div>
              )}
            </div>

            <div className="face-form-grid">
              <label>
                <span>Mã nhân viên</span>
                <input
                  value={faceForm.employee_code}
                  onChange={(e) => setFaceForm((prev) => ({ ...prev, employee_code: e.target.value }))}
                  placeholder="VD: NV009"
                />
              </label>
              <label>
                <span>Họ tên</span>
                <input
                  value={faceForm.employee_name}
                  onChange={(e) => setFaceForm((prev) => ({ ...prev, employee_name: e.target.value }))}
                  placeholder="Nhập họ tên nhân viên"
                />
              </label>
              <label>
                <span>Phòng ban</span>
                <input
                  value={faceForm.department}
                  onChange={(e) => setFaceForm((prev) => ({ ...prev, department: e.target.value }))}
                  placeholder="VD: Kỹ thuật / Bảo vệ"
                />
              </label>
              <label>
                <span>Ghi chú</span>
                <textarea
                  value={faceForm.note}
                  onChange={(e) => setFaceForm((prev) => ({ ...prev, note: e.target.value }))}
                  placeholder="Ghi chú nhận dạng / ca trực / snapshot"
                  rows={4}
                />
              </label>
            </div>

            <div className="face-register-actions">
              <button className="btn btn-ghost" onClick={() => setShowFaceModal(false)}>
                Hủy
              </button>
              <button className="btn btn-primary" onClick={handleRegisterFace} disabled={registerBusy}>
                {registerBusy ? 'Đang gửi...' : 'Lưu đăng ký'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
