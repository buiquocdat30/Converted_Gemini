import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Key, 
  Building2, 
  Cpu, 
  Users,
  Settings
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const menuItems = [
    {
      path: '/',
      icon: <LayoutDashboard size={20} />,
      label: 'Dashboard'
    },
    {
      path: '/default-keys',
      icon: <Key size={20} />,
      label: 'Default Keys'
    },
    {
      path: '/providers',
      icon: <Building2 size={20} />,
      label: 'Providers'
    },
    {
      path: '/models',
      icon: <Cpu size={20} />,
      label: 'Models'
    },
    {
      path: '/users',
      icon: <Users size={20} />,
      label: 'Users'
    }
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h2>Admin Panel</h2>
      </div>
      
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      
      <div className="sidebar-footer">
        <div className="nav-link">
          <Settings size={20} />
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar; 