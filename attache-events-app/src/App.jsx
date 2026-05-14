import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import MessageToast from './components/MessageToast';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/auth/LoginPage';
import AttendeeLogin from './pages/auth/AttendeeLogin';
import ManageLogin from './pages/auth/ManageLogin';
import VendorRegister from './pages/auth/VendorRegister';
import AttendeeSetPassword from './pages/auth/AttendeeSetPassword';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import VendorForgotPassword from './pages/auth/VendorForgotPassword';
import VendorResetPassword from './pages/auth/VendorResetPassword';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminSetup from './pages/admin/AdminSetup';
import AdminRegistrations from './pages/admin/AdminRegistrations';
import AdminLiveAttendance from './pages/admin/AdminLiveAttendance';
import AdminSurveyResults from './pages/admin/AdminSurveyResults';
import AdminSingleBadge from './pages/admin/AdminSingleBadge';
import AdminMessages from './pages/admin/AdminMessages';
import AdminSpeakers from './pages/admin/AdminSpeakers';
import AdminPartners from './pages/admin/AdminPartners';
import SurveyForm from './pages/survey/SurveyForm';
import AttendeeHome from './pages/attendee/AttendeeHome';
import AttendeeSchedule from './pages/attendee/AttendeeSchedule';
import AttendeeSpeakers from './pages/attendee/AttendeeSpeakers';
import AttendeeVendors from './pages/attendee/AttendeeVendors';
import AttendeeAttendees from './pages/attendee/AttendeeAttendees';
import AttendeeDetail from './pages/attendee/AttendeeDetail';
import AttendeeSessionDetail from './pages/attendee/AttendeeSessionDetail';
import AttendeeSpeakerDetail from './pages/attendee/AttendeeSpeakerDetail';
import AttendeePartners from './pages/attendee/AttendeePartners';
import AttendeePartnerDetail from './pages/attendee/AttendeePartnerDetail';
import AttendeeWifi from './pages/attendee/AttendeeWifi';
import AttendeeFloorPlan from './pages/attendee/AttendeeFloorPlan';
import AttendeeProfile from './pages/attendee/AttendeeProfile';
import MonitorScan from './pages/monitor/MonitorScan';
import VendorLeads from './pages/vendor/VendorLeads';

function AttendeeRoute({ children }) {
  return <ProtectedRoute role="attendee" loginPath="/techshow"><ThemeProvider>{children}<MessageToast /></ThemeProvider></ProtectedRoute>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/techshow" replace />} />
          <Route path="/login" element={<Navigate to="/techshow" replace />} />
          <Route path="/techshow" element={<AttendeeLogin />} />
          <Route path="/manage" element={<ManageLogin />} />
          <Route path="/vendor/register" element={<VendorRegister />} />
          <Route path="/attendee/set-password" element={<AttendeeSetPassword />} />

          <Route path="/admin" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/setup" element={<ProtectedRoute role="admin"><AdminSetup /></ProtectedRoute>} />
          <Route path="/admin/registrations/:event_id" element={<ProtectedRoute role="admin"><AdminRegistrations /></ProtectedRoute>} />
          <Route path="/admin/live-attendance/:event_id" element={<ProtectedRoute role="admin"><AdminLiveAttendance /></ProtectedRoute>} />
          <Route path="/admin/survey-results" element={<ProtectedRoute role="admin"><AdminSurveyResults /></ProtectedRoute>} />
          <Route path="/admin/single-badge" element={<ProtectedRoute role="admin"><AdminSingleBadge /></ProtectedRoute>} />
          <Route path="/admin/messages" element={<ProtectedRoute role="admin"><AdminMessages /></ProtectedRoute>} />
          <Route path="/admin/speakers" element={<ProtectedRoute role="admin"><AdminSpeakers /></ProtectedRoute>} />
          <Route path="/admin/partners" element={<ProtectedRoute role="admin"><AdminPartners /></ProtectedRoute>} />
          <Route path="/survey" element={<SurveyForm />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/vendor/forgot-password" element={<VendorForgotPassword />} />
          <Route path="/vendor/reset-password" element={<VendorResetPassword />} />

          <Route path="/attendee" element={<AttendeeRoute><AttendeeHome /></AttendeeRoute>} />
          <Route path="/attendee/schedule" element={<AttendeeRoute><AttendeeSchedule /></AttendeeRoute>} />
          <Route path="/attendee/speakers" element={<AttendeeRoute><AttendeeSpeakers /></AttendeeRoute>} />
          <Route path="/attendee/vendors" element={<AttendeeRoute><AttendeeVendors /></AttendeeRoute>} />
          <Route path="/attendee/attendees" element={<AttendeeRoute><AttendeeAttendees /></AttendeeRoute>} />
          <Route path="/attendee/profile/:id" element={<AttendeeRoute><AttendeeDetail /></AttendeeRoute>} />
          <Route path="/attendee/session/:id" element={<AttendeeRoute><AttendeeSessionDetail /></AttendeeRoute>} />
          <Route path="/attendee/speaker/:id" element={<AttendeeRoute><AttendeeSpeakerDetail /></AttendeeRoute>} />
          <Route path="/attendee/partners" element={<AttendeeRoute><AttendeePartners /></AttendeeRoute>} />
          <Route path="/attendee/partner/:id" element={<AttendeeRoute><AttendeePartnerDetail /></AttendeeRoute>} />
          <Route path="/attendee/wifi" element={<AttendeeRoute><AttendeeWifi /></AttendeeRoute>} />
          <Route path="/attendee/floorplan" element={<AttendeeRoute><AttendeeFloorPlan /></AttendeeRoute>} />
          <Route path="/attendee/profile" element={<AttendeeRoute><AttendeeProfile /></AttendeeRoute>} />

          <Route path="/monitor" element={<ProtectedRoute role="monitor"><MonitorScan /></ProtectedRoute>} />
          <Route path="/vendor" element={<ProtectedRoute role="vendor"><VendorLeads /></ProtectedRoute>} />

          <Route path="*" element={<Navigate to="/techshow" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
