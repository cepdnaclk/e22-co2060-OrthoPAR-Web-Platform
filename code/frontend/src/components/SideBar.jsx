import { NavLink } from 'react-router-dom';

export default function SideBar() {
  const navItems = [
    { id: "dashboard", label: "Dashboard", initial: "D", path: "/dashboard" },
    { id: "analysis",  label: "Analysis Studio", initial: "A", path: "/analysis" },
    { id: "patients",  label: "Patients", initial: "P", path: "/patients" },
    { id: "reports",   label: "Reports", initial: "R", path: "/reports" },
  ];

  return (
    <aside className="sidebar-skeleton">
      {/* 1. Header Section */}
      <div className="sidebar-header">
        <div className="sidebar-header-icon">
          <div className="placeholder-box logo">O</div>
        </div>
        <div className="sidebar-header-text">
          <h1>OrthoScan</h1>
          <p>PAR INDEX</p>
        </div>
      </div>

      {/* 2. Navigation Section */}
      <nav className="nav-bar">
        <div className="nav-list-header">Navigation</div>
        
        {navItems.map((item) => (
          <NavLink
            key={item.id}
            to={item.path}
            className={({ isActive }) => 
              `nav-bar-element${isActive ? " active" : ""}`
            }
          >
            <div className="nav-bar-element-icon">
              <div className="placeholder-box nav">{item.initial}</div>
            </div>
            <div className="nav-bar-element-text">
              {item.label}
            </div>
          </NavLink>
        ))}
      </nav>

      {/* 3. Footer Section */}
      <div className="sidebar-footer-container">
        <NavLink 
          to="/settings" 
          className={({ isActive }) => `nav-bar-element${isActive ? " active" : ""}`}
        >
          <div className="nav-bar-element-icon">
            <div>S</div>
          </div>
          <div className="nav-bar-element-text">Settings</div>
        </NavLink>
      </div>
    </aside>
  );
}