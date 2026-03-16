import React, { useState, useRef, useCallback } from 'react';
import BotOrb from '../components/BotOrb';
import { useToast } from '../components/Toast';
import { speak, cancelSpeech, voiceChatOnce } from '../services/speech';
import { fetchChatAbortable, resetAgentSessionId } from '../services/api';
import './Assistant.css';

function parseLocalFloorIntent(text) {
  const floorMatch = text.match(/(?:tầng|lên|xuống|đến)\s*(\d+)/i);
  if (!floorMatch) return null;
  const floor = Number.parseInt(floorMatch[1], 10);
  return Number.isFinite(floor) && floor >= 1 && floor <= 15 ? floor : null;
}

export default function Assistant() {
  const showToast = useToast();
  const [messages, setMessages] = useState([
    { who: 'bot', text: 'Xin chào, tôi là Sunybot. Tôi có thể hỗ trợ gọi tầng, kiểm tra trạng thái và hướng dẫn sử dụng thang máy.' },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [botMode, setBotMode] = useState('idle');
  const [stateText, setStateText] = useState('Sẵn sàng giao tiếp.');
  const abortRef = useRef(null);
  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  const addMessage = useCallback((text, who) => {
    setMessages((prev) => [...prev, { who, text }]);
    setTimeout(scrollToBottom, 50);
  }, []);

  const syncLocalFloor = useCallback((text, agentData) => {
    const parsedFloor = parseLocalFloorIntent(text);
    if (parsedFloor) {
      try { localStorage.setItem('lift_target', String(parsedFloor)); } catch {}
      return;
    }

    const toolFloor = agentData?.tool_trace?.find((item) => item.tool_name === 'call_elevator')?.args?.target_floor;
    if (toolFloor) {
      try { localStorage.setItem('lift_target', String(toolFloor)); } catch {}
    }
  }, []);

  const doSend = useCallback(async (text) => {
    if (!text) return;

    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }

    addMessage(text, 'user');
    setInput('');
    setBusy(true);
    setBotMode('speaking');
    setStateText('Đang trả lời...');

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const data = await fetchChatAbortable(text, controller.signal);
      syncLocalFloor(text, data);
      addMessage(data.answer || '...', 'bot');
      setStateText('Đã trả lời.');
      if (data.requires_human) {
        showToast('Sunybot đề xuất chuyển tiếp cho nhân viên hỗ trợ.');
      }
      speak(data.answer || '');
    } catch (e) {
      if (e && (e.name === 'AbortError' || String(e).includes('AbortError'))) {
        setStateText('Đã hủy.');
      } else {
        addMessage('Sunybot hiện không thể trả lời.', 'bot');
        setStateText('Lỗi kết nối.');
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setBotMode('idle');
    }
  }, [addMessage, showToast, syncLocalFloor]);

  const handleStop = () => {
    cancelSpeech();
    if (abortRef.current) {
      try { abortRef.current.abort(); } catch {}
      abortRef.current = null;
    }
    setBusy(false);
    setBotMode('idle');
    setStateText('Đã hủy.');
  };

  const handleVoice = () => {
    setBotMode('listening');
    setStateText('Đang nghe câu hỏi...');
    voiceChatOnce(
      (text) => {
        setInput(text);
        doSend(text);
      },
      null,
      () => {
        setBotMode('idle');
        setStateText('Sẵn sàng giao tiếp.');
      }
    );
  };

  const handleResetConversation = () => {
    resetAgentSessionId();
    setMessages([
      { who: 'bot', text: 'Xin chào, tôi là Sunybot. Bạn cần tôi hỗ trợ gì trong thang máy?' },
    ]);
    setStateText('Cuộc trò chuyện mới đã sẵn sàng.');
    showToast('Đã làm mới cuộc trò chuyện');
  };

  const quickChips = [
    { label: 'Gọi tầng 7', text: 'Gọi tôi lên tầng 7' },
    { label: 'Tầng hiện tại', text: 'Thang đang ở tầng mấy?' },
    { label: 'Trạng thái cửa', text: 'Cửa đang mở hay đóng?' },
    { label: 'Kiểm tra tải', text: 'Tình trạng quá tải?' },
    { label: 'Hướng dẫn khẩn cấp', text: 'Nếu bị kẹt trong thang máy thì phải làm gì?' },
  ];

  return (
    <div>
      <div className="page-title">
        <h1>Trợ lý ảo</h1>
        <div className="meta">Chat bằng giọng nói hoặc bàn phím</div>
      </div>

      <div className="grid-2 assistant-grid">
        <div className="panel">
          <div className="chat-layout">
            <div className="chat-box">
              <div className="assistant-topbar">
                <div className="assistant-status-text">{stateText}</div>
                <button className="btn btn-ghost btn-xs-inline" onClick={handleResetConversation}>Bắt đầu lại</button>
              </div>

              <div className="chat-messages">
                {messages.map((m, i) => (
                  <div key={`${m.who}-${i}`} className={`bubble ${m.who}`}>{m.text}</div>
                ))}
                <div ref={chatEndRef} />
              </div>

              <div className="chat-input">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && doSend(input.trim())}
                  placeholder="Nhập câu hỏi..."
                />
                {!busy ? (
                  <button className="btn btn-primary" onClick={() => doSend(input.trim())}>Gửi</button>
                ) : (
                  <button className="btn btn-stop" onClick={handleStop}>Dừng</button>
                )}
                <button className="btn btn-ghost" onClick={handleVoice}>Mic</button>
              </div>
            </div>

            <div className="card agent-side-card">
              <h3>Gợi ý nhanh</h3>
              <div className="chips">
                {quickChips.map((c) => (
                  <div key={c.label} className="chip" onClick={() => doSend(c.text)}>{c.label}</div>
                ))}
              </div>
              <div className="assistant-help-card">
                <h4>Sunybot có thể giúp gì?</h4>
                <div className="muted">Gọi tầng, kiểm tra trạng thái, hướng dẫn an toàn và giải thích các thao tác cơ bản của thang máy.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="panel suny">
          <BotOrb mode={botMode} title="Sunybot" stateText={stateText} />
        </div>
      </div>
    </div>
  );
}
