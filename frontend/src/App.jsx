import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import ForgotPassword from "./ForgotPassword";
import Home from "./Home";

import SearchUsers from "./pages/SearchUsers";
import FriendRequests from "./pages/FriendRequests";
import Contacts from "./pages/Contacts";
import RiskDashboard from "./pages/RiskDashboard";
import GuardianView from "./pages/GuardianView";
import GuardianRegister from "./GuardianRegister";
import GuardianDashboard from "./pages/GuardianDashboard";
import CallHistory from "./pages/CallHistory";

function PrivateRoute({ children }) {
  const user = localStorage.getItem("user");

  return user ? children : <Navigate to="/login" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Default Route */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Authentication */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/guardian-register" element={<GuardianRegister />} />

        {/* Protected Routes */}
        <Route
          path="/home"
          element={
            <PrivateRoute>
              <Home />
            </PrivateRoute>
          }
        />

        <Route
          path="/search"
          element={
            <PrivateRoute>
              <SearchUsers />
            </PrivateRoute>
          }
        />

        <Route
          path="/requests"
          element={
            <PrivateRoute>
              <FriendRequests />
            </PrivateRoute>
          }
        />

        <Route
          path="/contacts"
          element={
            <PrivateRoute>
              <Contacts />
            </PrivateRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <RiskDashboard />
            </PrivateRoute>
          }
        />

        <Route
          path="/calls"
          element={
            <PrivateRoute>
              <CallHistory />
            </PrivateRoute>
          }
        />

        <Route
          path="/guardian-view"
          element={
            <PrivateRoute>
              <GuardianView />
            </PrivateRoute>
          }
        />

        <Route
          path="/guardian-dashboard"
          element={
            <PrivateRoute>
              <GuardianDashboard />
            </PrivateRoute>
          }
        />

        {/* Invalid Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;