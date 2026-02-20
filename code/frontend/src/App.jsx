import './App.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import DashBoardPage from './pages/DashboardPage';
import PatientsPage from './pages/PatientsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import AnalysisStudioPage from './pages/AnalysisStudioPage';

function App() {
  <BrowserRouter>
            <div className="App">
                <main>
                    <Routes>
                        <Route path="/" element={<AuthPage />} />
                        <Route path="/dashboard" element={<DashBoardPage/>} />
                        <Route path="/patients" element={<PatientsPage/>} />
                        <Route path="/reports" element={<ReportsPage />} />
                        <Route path="/settings" element={<SettingsPage />} />
                        <Route path="/analysisstudio" element={<AnalysisStudioPage />} />
                    </Routes>
                </main>
                <FooterBar />
            </div>
        </BrowserRouter>
}

export default App
