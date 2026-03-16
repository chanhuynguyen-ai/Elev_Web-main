import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useElevatorStatus from '../hooks/useElevatorStatus';
import BotOrb from '../components/BotOrb';
import useWeather from '../hooks/useWeather';
import api from '../services/api';
import { speak, startWakeWordListener } from '../services/speech';
import './Home.css';

function parseFloorIntent(text) {
    const floorMatch = text?.match(/(?:tầng|lên|xuống|đến)\s*(\d+)/i);
    if (!floorMatch) return null;
    const floor = parseInt(floorMatch[1], 10);
    return floor >= 1 && floor <= 15 ? floor : null;
}

export default function Home() {
    const status = useElevatorStatus();
    const weather = useWeather();
    const navigate = useNavigate();

    const [botMode, setBotMode] = useState('idle');
    const [stateText, setStateText] = useState('Đang chờ wake word…');
    const [lastAgent, setLastAgent] = useState(null);

    useEffect(() => {
        const cleanup = startWakeWordListener({
            onModeChange: setBotMode,
            onStateText: setStateText,
            onWakeOnly: () => setStateText('Đã kích hoạt. Hãy nói câu lệnh...'),
            onWakeCommand: async (text) => {
                setStateText('Đang xử lý: ' + text);
                setBotMode('speaking');
                try {
                    const parsedFloor = parseFloorIntent(text);
                    if (parsedFloor) {
                        try { localStorage.setItem('lift_target', String(parsedFloor)); } catch {}
                    }
                    const data = await api.chat(text);
                    setLastAgent(data);
                    const answer = data.answer || '...';
                    setStateText('Sunybot: ' + answer);
                    speak(answer);
                } catch {
                    setStateText('Sunybot hiện không thể trả lời.');
                } finally {
                    setBotMode('listening');
                }
            },
        });
        return cleanup;
    }, []);

    const directionText = (dir) => {
        if (dir === 'UP') return '↑ Lên';
        if (dir === 'DOWN') return '↓ Xuống';
        return 'Đứng';
    };

    const displayFloor = status.floor == 1 ? 'G' : status.floor;

    return (
        <div>
            <div className="page-title">
                <h1>Trạng thái thang máy</h1>
                <div className="meta">Elevator #A · Khu chính</div>
            </div>

            <div className="grid-2">
                <div className="panel">
                    <div className="status-grid">
                        <div className="floor-card">
                            <div className="label">Tầng hiện tại</div>
                            <div className="floor-display">
                                <div className="floorNum">{displayFloor ?? '--'}</div>
                                <div className={`badge ${status.overload ? 'err' : 'ok'}`}>
                                    {status.overload ? 'QUÁ TẢI' : 'Bình thường'}
                                </div>
                            </div>
                            <div className="inline">
                                <span className="pill">Wake word: <b>hey sunybot</b></span>
                                <span className="pill">Chạm 1 lần để xác nhận</span>
                            </div>
                        </div>

                        <div className="tiles">
                            <div className="tile">
                                <div className="k">Chiều đi</div>
                                <div className="v">{directionText(status.direction)}</div>
                            </div>
                            <div className="tile">
                                <div className="k">Cửa</div>
                                <div className="v">{status.door ?? '--'}</div>
                            </div>
                            <div className="tile">
                                <div className="k">Số người</div>
                                <div className="v">{status.people_count ?? '--'}</div>
                            </div>
                            <div className="tile">
                                <div className="k">Thời gian</div>
                                <div className="v">{status.time ?? '--:--:--'}</div>
                            </div>
                            <div className="tile">
                                <div className="k">Thời tiết</div>
                                <div className="v">{weather}</div>
                            </div>
                            <button className="btn btn-primary" onClick={() => navigate('/call')}>
                                Gọi tầng
                            </button>
                        </div>
                    </div>
                </div>

                <div className="panel suny">
                    <BotOrb mode={botMode} stateText={stateText} />
                    <div className="inline">
                        <button className="btn btn-ghost" onClick={() => setBotMode('idle')}>Bình thường</button>
                        <button className="btn btn-ghost" onClick={() => setBotMode('listening')}>Đang nghe</button>
                        <button className="btn btn-ghost" onClick={() => setBotMode('speaking')}>Đang trả lời</button>
                    </div>
                    {lastAgent ? (
                        <div style={{ marginTop: 12, padding: 12, borderRadius: 12, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                            <div className="muted">Intent: <b>{lastAgent.intent || 'general'}</b></div>
                            <div className="muted">Tool used: <b>{lastAgent.tool_trace?.length || 0}</b></div>
                            <div className="muted">Confidence: <b>{typeof lastAgent.confidence === 'number' ? `${Math.round(lastAgent.confidence * 100)}%` : '—'}</b></div>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
