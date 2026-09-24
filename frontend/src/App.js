import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import { CalculatorProvider } from './context/CalculatorContext';
import Layout from './components/common/Layout';
import theme from './styles/theme';

// Calculator route components will be implemented by other agents
const BasicCalculator = () => <div>Basic Calculator</div>;
const ScientificCalculator = () => <div>Scientific Calculator</div>;
const HistoryView = () => <div>History View</div>;
const Login = () => <div>Login</div>;
const Dashboard = () => <div>Dashboard</div>;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <CalculatorProvider>
          <Router>
            <Layout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/calculator/basic" element={<BasicCalculator />} />
                <Route path="/calculator/scientific" element={<ScientificCalculator />} />
                <Route path="/history" element={<HistoryView />} />
              </Routes>
            </Layout>
          </Router>
        </CalculatorProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
