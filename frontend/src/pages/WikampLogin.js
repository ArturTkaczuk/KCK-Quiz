import React, { useState } from 'react';
import { Card, Button, Container, Alert, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const WikampLogin = () => {
    const [debugUser, setDebugUser] = useState('265123');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [subjects, setSubjects] = useState([]);
    const { loginSimulation } = useAuth();
    const navigate = useNavigate();

    React.useEffect(() => {
        const fetchSubjects = async () => {
            try {
                // We cannot use axios with credentials here easily if the backend blocks unauthorized /subjects calls
                // But /subjects is public? No, api.js says router.use(checkAuth).
                // Wait, if /subjects requires auth, we can't fetch it before login!
                // SubjectSelection.js fetched it AFTER login or check.
                // But the user wants to choose subject BEFORE login.
                // This implies /subjects should be public or accessible. 
                // Let's check api.js: "router.use(checkAuth)". So it protects everything.
                // We need to bypass auth for /subjects? Or make a public endpoint?
                // Or maybe just fetch it anyway and see if it works? 
                // If it fails with 403, we can't show subjects.

                // DECISION: User asked for this feature. I must make /subjects public or allow it.
                // I will modify api.js to allow /subjects without auth.

                // For now, let's write the frontend code assuming I'll fix the backend.
                // I'll use fetch/axios.
                const response = await fetch('http://localhost:5000/api/subjects');
                if (response.ok) {
                    const data = await response.json();
                    setSubjects(data);
                    if (data.length > 0) setSelectedSubject('main_menu');
                }
            } catch (err) {
                console.error("Failed to fetch subjects", err);
            }
        };
        fetchSubjects();
    }, []);

    const handleLogin = async () => {
        await loginSimulation(debugUser);
        if (selectedSubject === 'main_menu') {
            navigate('/');
        } else if (selectedSubject) {
            navigate(`/${selectedSubject}`);
        } else {
            navigate('/');
        }
    };

    return (
        <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
            <Container style={{ maxWidth: '500px' }}>
                <Card className="shadow-lg border-0">
                    <Card.Header className="bg-primary text-white text-center py-4">
                        <h2 className="mb-0">Wikamp Login</h2>
                        <small>(Simulation)</small>
                    </Card.Header>
                    <Card.Body className="p-4">
                        <Alert variant="info" className="mb-4">
                            <i className="bi bi-info-circle me-2"></i>
                            Select a user role and subject to start.
                        </Alert>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold">Select User</Form.Label>
                            <Form.Select
                                size="lg"
                                value={debugUser}
                                onChange={(e) => setDebugUser(e.target.value)}
                            >
                                <option value="265123">Student (265123)</option>
                                <option value="265124">Student 2 (265124)</option>
                                <option value="265125">Student 3 (265125)</option>
                                <option value="265126">Student 4 (265126)</option>
                                <option value="Lecturer 1">Admin (Lecturer 1)</option>
                                <option value="Lecturer 2">Admin (Lecturer 2)</option>
                                <option value="Lecturer 3">Admin (Lecturer 3)</option>
                                <option value="Lecturer 4">Admin (Lecturer 4)</option>
                            </Form.Select>
                        </Form.Group>

                        <Form.Group className="mb-4">
                            <Form.Label className="fw-bold">Select Subject</Form.Label>
                            <Form.Select
                                size="lg"
                                value={selectedSubject}
                                onChange={(e) => setSelectedSubject(e.target.value)}
                                disabled={subjects.length === 0}
                            >
                                <option value="main_menu" style={{ color: 'orange', fontWeight: 'bold' }}>Main Menu</option>
                                {subjects.map(s => (
                                    <option key={s.id} value={s.slug} style={{ color: 'black' }}>{s.name}</option>
                                ))}
                            </Form.Select>
                            {subjects.length === 0 && <Form.Text className="text-muted">Loading subjects...</Form.Text>}
                        </Form.Group>

                        <Button
                            variant="primary"
                            size="lg"
                            className="w-100"
                            onClick={handleLogin}
                        >
                            {selectedSubject === 'main_menu' ? 'Log In' : 'Log In & Start'}
                        </Button>
                    </Card.Body>
                </Card>
            </Container>
        </div>
    );
};

export default WikampLogin;
