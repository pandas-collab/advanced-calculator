import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import Layout from '../common/Layout';
import { useTheme } from '@mui/material/styles';
import {
  Container,
  Paper,
  Typography,
  Button,
  Box,
  Avatar
} from '@mui/material';

const Profile = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const { user, logout } = useAuthContext();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Layout>
      <Container maxWidth="sm">
        <Box sx={{ mt: 8 }}>
          <Paper elevation={3} sx={{ p: 4 }}>
            <Box display="flex" alignItems="center" mb={3}>
              <Avatar sx={{ mr: 2 }}>{user?.name?.[0]}</Avatar>
              <Typography variant="h5">User Profile</Typography>
            </Box>
            <Typography variant="body1" gutterBottom>
              Name: {user?.name || 'Demo User'}
            </Typography>
            <Typography variant="body1" gutterBottom>
              Email: {user?.email || 'demo@calculator.com'}
            </Typography>
            <Button
              variant="contained"
              color="secondary"
              onClick={handleLogout}
              sx={{ mt: 3 }}
            >
              Logout
            </Button>
          </Paper>
        </Box>
      </Container>
    </Layout>
  );
};

export default Profile;
