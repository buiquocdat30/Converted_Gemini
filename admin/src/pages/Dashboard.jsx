import React, { useState, useEffect } from "react";
import { Users, Key, Building2, Cpu, Activity } from "lucide-react";
import {
  defaultKeysAPI,
  providersAPI,
  modelsAPI,
  usersAPI,
} from "../services/api";
import toast from "react-hot-toast";

const Dashboard = () => {
  const [stats, setStats] = useState({
    users: 0,
    defaultKeys: 0,
    providers: 0,
    models: 0,
    totalUsage: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);

      const [usersRes, defaultKeysRes, providersRes, modelsRes] =
        await Promise.all([
          usersAPI.getAll(),
          defaultKeysAPI.getAll(),
          providersAPI.getAll(),
          modelsAPI.getAll(),
        ]);

      const totalUsage = defaultKeysRes.data.data.reduce(
        (sum, key) =>
          sum +
          key.usage.reduce((keySum, usage) => keySum + usage.usageCount, 0),
        0
      );

      setStats({
        users: usersRes.data.data.length,
        defaultKeys: defaultKeysRes.data.data.length,
        providers: providersRes.data.data.length,
        models: modelsRes.data.data.length,
        totalUsage,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Lỗi khi tải thống kê");
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Tổng Users",
      value: stats.users,
      icon: <Users size={24} />,
      color: "bg-blue-500",
    },
    {
      title: "Default Keys",
      value: stats.defaultKeys,
      icon: <Key size={24} />,
      color: "bg-green-500",
    },
    {
      title: "Providers",
      value: stats.providers,
      icon: <Building2 size={24} />,
      color: "bg-purple-500",
    },
    {
      title: "Models",
      value: stats.models,
      icon: <Cpu size={24} />,
      color: "bg-orange-500",
    },
    {
      title: "Tổng Usage",
      value: stats.totalUsage,
      icon: <Activity size={24} />,
      color: "bg-red-500",
    },
  ];

  if (loading) {
    return (
      <div className="main-content">
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Dashboard</h2>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-lg">Đang tải...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="main-content">
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Dashboard</h2>
          <button className="btn btn-primary" onClick={fetchStats}>
            Làm mới
          </button>
        </div>

        <div className="grid grid-4">
          {statCards.map((stat, index) => (
            <div key={index} className="stat-card">
              <div className={`stat-icon ${stat.color}`}>{stat.icon}</div>
              <div className="stat-content">
                <h3 className="stat-title">{stat.title}</h3>
                <p className="stat-value">{stat.value.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
