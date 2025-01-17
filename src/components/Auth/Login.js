import React, { useState } from "react";
import { login } from "../../services/auth";
import { useNavigate } from "react-router-dom";
import { Box, TextField, Button, Typography, Container, Alert } from "@mui/material";

const Login = ({ onLoginSuccess }) => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleLogin = async () => {
        try {
            const data = await login(username, password);
            sessionStorage.setItem("token", data.token);
            sessionStorage.setItem("username", data.username);

            onLoginSuccess();
            navigate("/"); // Navigate to MainPage
        } catch (err) {
            setError("Invalid username or password");
            console.error("Login failed", err);
        }
    };

    return (
        <Container maxWidth="xs" sx={{ marginTop: 8 }}>
            <Typography variant="h4" gutterBottom align="center">
                Login
            </Typography>
            {error && (
                <Alert severity="error" sx={{ marginBottom: 2 }}>
                    {error}
                </Alert>
            )}
            <Box component="form" noValidate autoComplete="off">
                <TextField
                    label="Username"
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
                <TextField
                    label="Password"
                    type="password"
                    fullWidth
                    variant="outlined"
                    margin="normal"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                    variant="contained"
                    color="primary"
                    fullWidth
                    sx={{ marginTop: 2 }}
                    onClick={handleLogin}
                >
                    Login
                </Button>
                <Button
                    color="secondary"
                    fullWidth
                    sx={{ marginTop: 1 }}
                    onClick={() => navigate("/register")}
                >
                    Register
                </Button>
            </Box>
        </Container>
    );
};

export default Login;
