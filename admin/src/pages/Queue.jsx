import React, { useEffect, useState, useRef } from "react";
import { queueAPI } from "../services/api";
import toast from "react-hot-toast";

const Queue = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevWaiting = useRef(0);

  useEffect(() => {
    let interval;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await queueAPI.getStats();
        setStats(res.data.data);
        // Thông báo khi có job mới vào hàng chờ
        if (
          typeof res.data.data.waiting === "number" &&
          res.data.data.waiting > prevWaiting.current
        ) {
          toast.success(
            `Có ${res.data.data.waiting - prevWaiting.current} job dịch mới được thêm vào hàng chờ!`
          );
        }
        prevWaiting.current = res.data.data.waiting;
      } catch (err) {
        setStats(null);
        toast.error("Không lấy được thống kê hàng chờ dịch");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
    interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="main-content">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Thống kê hàng chờ dịch (BullMQ)</h2>
        </div>
        {loading ? (
          <div className="py-8 text-center text-gray-500">Đang tải...</div>
        ) : stats ? (
          <ul className="queue-stats-list">
            <li>Đang chờ: <b>{stats.waiting}</b></li>
            <li>Đang xử lý: <b>{stats.active}</b></li>
            <li>Đã hoàn thành: <b>{stats.completed}</b></li>
            <li>Thất bại: <b>{stats.failed}</b></li>
            <li>Đang tạm dừng: <b>{stats.paused}</b></li>
            <li>Trì hoãn: <b>{stats.delayed}</b></li>
          </ul>
        ) : (
          <div className="py-8 text-center text-red-500">Không lấy được dữ liệu queue</div>
        )}
      </div>
    </div>
  );
};

export default Queue; 