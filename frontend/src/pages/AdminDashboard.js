import React, { useState, useEffect } from 'react';
import { Container, Tab, Tabs, Button, Table, Form, Modal, Alert, Row, Col } from 'react-bootstrap';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const [key, setKey] = useState('subjects');
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [questions, setQuestions] = useState([]);

    // Forms state
    const [newSubjectName, setNewSubjectName] = useState('');
    const [jsonFile, setJsonFile] = useState(null);

    // Question Form
    const [editingQuestion, setEditingQuestion] = useState(null); // null = new
    const [qForm, setQForm] = useState({ content: '', answer_a: '', answer_b: '', answer_c: '', answer_d: '', correct_answer: 'A', difficulty: 1 });
    const [showQModal, setShowQModal] = useState(false);

    const navigate = useNavigate();

    useEffect(() => {
        fetchSubjects();
    }, []);

    useEffect(() => {
        if (selectedSubject) {
            fetchQuestions(selectedSubject.slug);
        }
    }, [selectedSubject]);

    const fetchSubjects = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/subjects', { withCredentials: true });
            setSubjects(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const fetchQuestions = async (slug) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/subjects/${slug}/questions`, { withCredentials: true });
            setQuestions(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreateSubject = async (e) => {
        e.preventDefault();
        const slug = newSubjectName.toLowerCase().replace(/ /g, '-').replace(/[^\w-]/g, '');
        try {
            await axios.post('http://localhost:5000/api/subjects', { name: newSubjectName, slug }, { withCredentials: true });
            setNewSubjectName('');
            fetchSubjects();
        } catch (err) {
            alert(err.response?.data?.error || 'Error creating subject');
        }
    };

    const handleSaveQuestion = async () => {
        if (!selectedSubject) return;
        try {
            // Adapt form to API expected format
            const payload = {
                content: qForm.content,
                answers: { A: qForm.answer_a, B: qForm.answer_b, C: qForm.answer_c, D: qForm.answer_d },
                correct_answer: qForm.correct_answer,
                difficulty: parseInt(qForm.difficulty)
            };

            if (editingQuestion) {
                // UPDATE
                await axios.put(`http://localhost:5000/api/questions/${editingQuestion.id}`, payload, { withCredentials: true });
                alert('Question updated!');
            } else {
                // CREATE
                await axios.post(`http://localhost:5000/api/subjects/${selectedSubject.slug}/questions`, payload, { withCredentials: true });
                alert('Question created!');
            }

            setShowQModal(false);
            setEditingQuestion(null); // Reset
            fetchQuestions(selectedSubject.slug);
        } catch (err) {
            alert(err.response?.data?.error || 'Error saving question');
        }
    };

    const handleDeleteQuestion = async (id) => {
        if (!window.confirm("Are you sure you want to delete this question?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/questions/${id}`, { withCredentials: true });
            fetchQuestions(selectedSubject.slug);
        } catch (err) {
            alert('Error deleting question');
        }
    };

    const openEditModal = (q) => {
        setEditingQuestion(q);
        setQForm({
            content: q.content,
            answer_a: q.answer_a,
            answer_b: q.answer_b,
            answer_c: q.answer_c,
            answer_d: q.answer_d,
            correct_answer: q.correct_answer,
            difficulty: q.difficulty
        });
        setShowQModal(true);
    };

    const handleJsonUpload = async () => {
        if (!jsonFile || !selectedSubject) return;
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                await axios.post(`http://localhost:5000/api/subjects/${selectedSubject.slug}/questions/import`, data, { withCredentials: true });
                alert('Questions imported successfully!');
                fetchQuestions(selectedSubject.slug);
            } catch (err) {
                alert('Error parsing or uploading JSON: ' + err.message);
            }
        };
        reader.readAsText(jsonFile);
    };

    const handleDeleteSubject = async (id) => {
        if (!window.confirm("Are you sure you want to delete this subject? This will delete ALL associated questions.")) return;
        try {
            await axios.delete(`http://localhost:5000/api/subjects/${id}`, { withCredentials: true });
            fetchSubjects();
            setSelectedSubject(null);
        } catch (err) {
            alert('Error deleting subject');
        }
    };

    return (
        <Container fluid className="min-vh-100 bg-light py-4">
            <Container>
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2>Admin Dashboard</h2>
                    <Button variant="outline-secondary" onClick={() => navigate('/')}>Back to Home</Button>
                </div>

                <Tabs activeKey={key} onSelect={(k) => setKey(k)} className="mb-3">
                    <Tab eventKey="subjects" title="Subjects">
                        <Row>
                            <Col md={4}>
                                <div className="p-3 border rounded bg-light mb-3">
                                    <h5>Create New Subject</h5>
                                    <Form onSubmit={handleCreateSubject}>
                                        <Form.Group className="mb-3">
                                            <Form.Label>Subject Name</Form.Label>
                                            <Form.Control type="text" value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} required />
                                        </Form.Group>
                                        <Button type="submit" variant="success">Create</Button>
                                    </Form>
                                </div>
                            </Col>
                            <Col md={8}>
                                <h5>Existing Subjects</h5>
                                <Table striped hover>
                                    <thead><tr><th>ID</th><th>Name</th><th>Slug</th><th>actions</th></tr></thead>
                                    <tbody>
                                        {subjects.map(s => (
                                            <tr key={s.id}>
                                                <td>{s.id}</td>
                                                <td>{s.name}</td>
                                                <td>{s.slug}</td>
                                                <td>
                                                    <Button size="sm" variant="primary" className="me-2" onClick={() => { setSelectedSubject(s); setKey('questions'); }}>Manage Questions</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteSubject(s.id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </Table>
                            </Col>
                        </Row>
                    </Tab>

                    <Tab eventKey="questions" title="Questions" disabled={!selectedSubject}>
                        {selectedSubject && (
                            <div>
                                <h4>Managing: <span className="text-primary">{selectedSubject.name}</span></h4>
                                <div className="d-flex gap-2 mb-3">
                                    <Button variant="success" onClick={() => { setEditingQuestion(null); setQForm({ content: '', answer_a: '', answer_b: '', answer_c: '', answer_d: '', correct_answer: 'A', difficulty: 1 }); setShowQModal(true); }}>
                                        + Add New Question
                                    </Button>
                                    <div className="d-flex gap-2 align-items-center ms-auto">
                                        <Form.Control type="file" accept=".json" onChange={e => setJsonFile(e.target.files[0])} size="sm" style={{ width: '250px' }} />
                                        <Button variant="outline-primary" onClick={handleJsonUpload} disabled={!jsonFile}>Import JSON</Button>
                                    </div>
                                </div>

                                <div className="mb-2 text-muted small">
                                    Tip for JSON Import: Use format <code>[{`{"content": "...", "answers": {"A":"..."}, "correct": "A", "difficulty": 1}`}, ...]</code>
                                </div>

                                <Table striped bordered responsive>
                                    <thead><tr><th>#</th><th>Difficulty</th><th>Question</th><th>Correct</th><th>Actions</th></tr></thead>
                                    <tbody>
                                        {questions.map((q, idx) => (
                                            <tr key={q.id}>
                                                <td>{idx + 1}</td>
                                                <td><span className={`badge bg-${q.difficulty === 1 ? 'success' : q.difficulty === 2 ? 'info' : q.difficulty === 3 ? 'warning' : 'danger'}`}>Diff {q.difficulty}</span></td>
                                                <td>{q.content.substring(0, 50)}...</td>
                                                <td>{q.correct_answer}</td>
                                                <td>
                                                    <Button size="sm" variant="warning" className="me-2" onClick={() => openEditModal(q)}>Edit</Button>
                                                    <Button size="sm" variant="danger" onClick={() => handleDeleteQuestion(q.id)}>Delete</Button>
                                                </td>
                                            </tr>
                                        ))}
                                        {questions.length === 0 && <tr><td colSpan="5" className="text-center">No questions found. Add some!</td></tr>}
                                    </tbody>
                                </Table>
                            </div>
                        )}
                    </Tab>
                </Tabs>

                {/* Add/Edit Question Modal */}
                <Modal show={showQModal} onHide={() => setShowQModal(false)} size="lg">
                    <Modal.Header closeButton><Modal.Title>{editingQuestion ? 'Edit Question' : 'Add Question'}</Modal.Title></Modal.Header>
                    <Modal.Body>
                        <Form>
                            <Form.Group className="mb-3">
                                <Form.Label>Question Content</Form.Label>
                                <Form.Control as="textarea" rows={3} value={qForm.content} onChange={e => setQForm({ ...qForm, content: e.target.value })} />
                            </Form.Group>
                            <Row>
                                <Col><Form.Group className="mb-2"><Form.Label>Answer A</Form.Label><Form.Control value={qForm.answer_a} onChange={e => setQForm({ ...qForm, answer_a: e.target.value })} /></Form.Group></Col>
                                <Col><Form.Group className="mb-2"><Form.Label>Answer B</Form.Label><Form.Control value={qForm.answer_b} onChange={e => setQForm({ ...qForm, answer_b: e.target.value })} /></Form.Group></Col>
                            </Row>
                            <Row>
                                <Col><Form.Group className="mb-2"><Form.Label>Answer C</Form.Label><Form.Control value={qForm.answer_c} onChange={e => setQForm({ ...qForm, answer_c: e.target.value })} /></Form.Group></Col>
                                <Col><Form.Group className="mb-2"><Form.Label>Answer D</Form.Label><Form.Control value={qForm.answer_d} onChange={e => setQForm({ ...qForm, answer_d: e.target.value })} /></Form.Group></Col>
                            </Row>
                            <Row>
                                <Col md={6}>
                                    <Form.Group className="mb-3"><Form.Label>Correct Answer</Form.Label>
                                        <Form.Select value={qForm.correct_answer} onChange={e => setQForm({ ...qForm, correct_answer: e.target.value })}>
                                            <option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option>
                                        </Form.Select></Form.Group>
                                </Col>
                                <Col md={6}>
                                    <Form.Group className="mb-3"><Form.Label>Difficulty (1-4)</Form.Label>
                                        <Form.Select value={qForm.difficulty} onChange={e => setQForm({ ...qForm, difficulty: e.target.value })}>
                                            <option value="1">1 (Easy)</option><option value="2">2 (Medium)</option><option value="3">3 (Hard)</option><option value="4">4 (Expert)</option>
                                        </Form.Select></Form.Group>
                                </Col>
                            </Row>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={() => setShowQModal(false)}>Cancel</Button>
                        <Button variant="primary" onClick={handleSaveQuestion}>Save Question</Button>
                    </Modal.Footer>
                </Modal>
            </Container>
        </Container>
    );
};

export default AdminDashboard;
