import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState } from 'react';
import SideBar from './components/SideBar'
import TopBar from './components/TopBar' 
import AuthPage from './pages/AuthPage'
import DashBoardPage from './pages/DashboardPage'
import PatientsPage from './pages/PatientsPage'
import ReportsPage from './pages/ReportsPage'
import SettingsPage from './pages/SettingsPage'
import AnalysisPage from './pages/AnalysisPage'

function App() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (query) => {
    setSearchQuery(query);
    console.log('Searching for:', query);
    // You can add your search logic here later
  };
  return (
    
    <BrowserRouter>
      <div className="app-container">
      <SideBar />

      <div className="not-sidebar">
      <TopBar 
        title="Dashboard" 
        subtitle="Welcome back, Dr. Chen · Feb 17, 2025"
        onSearch={handleSearch}
      />
    
      <main className="main-content-skeleton">
        <Routes>
              <Route path="/" element={<AuthPage />} />
              <Route path="/dashboard" element={<DashBoardPage />} />
              <Route path="/patients" element={<PatientsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
            </Routes>
      </main>
      </div>
      </div>
    </BrowserRouter>
  )
}

export default App