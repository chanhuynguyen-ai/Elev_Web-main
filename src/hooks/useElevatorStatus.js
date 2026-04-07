import { useEffect, useState } from 'react';
import api from '../services/api';

const DEFAULT_STATUS = {
  elevator_id: 1,
  floor: '--',
  direction: '--',
  door: '--',
  people_count: '--',
  overload: false,
  status: 'UNKNOWN',
  time: '--:--:--',
  source: 'frontend_default',
  error: null,
};

function normalizeStatus(payload = {}) {
  const nowText = new Date().toLocaleTimeString('vi-VN');

  return {
    elevator_id: payload.elevator_id ?? 1,
    floor: payload.floor ?? '--',
    direction: payload.direction ?? '--',
    door: payload.door ?? '--',
    people_count: payload.people_count ?? '--',
    overload: Boolean(payload.overload),
    status: payload.status || 'UNKNOWN',
    time: payload.time || nowText,
    source: payload.source || 'backend',
    error: payload.error || null,
  };
}

export default function useElevatorStatus(intervalMs = 1000) {
  const [status, setStatus] = useState(DEFAULT_STATUS);

  useEffect(() => {
    let alive = true;
    let timerId = null;

    const loadStatus = async () => {
      try {
        const data = await api.elevatorStatus();
        if (!alive) return;

        setStatus((prev) => ({
          ...prev,
          ...normalizeStatus(data),
        }));
      } catch (err) {
        if (!alive) return;

        setStatus((prev) => ({
          ...prev,
          time: new Date().toLocaleTimeString('vi-VN'),
          source: 'backend_error',
          error: err?.message || 'Không thể lấy trạng thái thang máy',
        }));
      }
    };

    loadStatus();
    timerId = setInterval(loadStatus, Math.max(500, intervalMs));

    return () => {
      alive = false;
      if (timerId) clearInterval(timerId);
    };
  }, [intervalMs]);

  return status;
}