import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { ChangePassword } from './pages/ChangePassword';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { Projects } from './pages/Projects';
import { Employees } from './pages/Employees';
import { AssignTasks } from './pages/AssignTasks';
import { EmployeeAssignTask } from './pages/EmployeeAssignTask';
import { Messages } from './pages/Messages';
import { Announcements } from './pages/Announcements';
import { Leaves } from './pages/Leaves';
import { Reports } from './pages/Reports';
import { Analytics } from './pages/Analytics';
import { AllocatedProjects } from './pages/AllocatedProjects';
import { NotificationsModule } from './pages/NotificationsModule';
import { ResetPassword } from './pages/ResetPassword';


// HomeRedirect component directs users based on auth role
const HomeRedirect: React.FC = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  
  if (user.role === 'EMPLOYEE') {
    return <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/admin" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Secure Layout Routes */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            
            {/* Employee Views */}
            <Route path="dashboard" element={<EmployeeDashboard />} />
            <Route path="allocated-projects" element={<AllocatedProjects />} />
            <Route path="change-password" element={<ChangePassword />} />
            <Route path="assign-task" element={<EmployeeAssignTask />} />


            {/* Admin Views */}
            <Route path="admin" element={<AdminDashboard />} />
            <Route path="employees" element={<Employees />} />
            <Route path="projects" element={<Projects />} />
            <Route path="assign-tasks" element={<AssignTasks />} />
            <Route path="messages" element={<Messages />} />
            
            {/* Shared Views */}
            <Route path="announcements" element={<Announcements />} />
            <Route path="leaves" element={<Leaves />} />
            <Route path="reports" element={<Reports />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="notifications" element={<NotificationsModule />} />
          </Route>

          {/* Fallback Catch */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
