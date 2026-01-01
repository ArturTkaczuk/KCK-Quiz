import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, ProgressBar, Modal, Badge, Alert } from 'react-bootstrap';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';

const MONEY_LADDER = [
    500, 1000, 2000, 5000, 10000,
    20000, 40000, 75000, 125000,
    250000, 500000, 1000000
];

const Game = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [questions, setQuestions] = useState([]);
    const [currentQIndex, setCurrentQIndex] = useState(0);
    const [gameState, setGameState] = useState('loading'); // loading, playing, won, lost, error
    const [timer, setTimer] = useState(600); // 10 minutes
    const [lifelines, setLifelines] = useState({ fifty: true, audience: true, phone: true });

    // Lifeline Effects
    const [hiddenAnswers, setHiddenAnswers] = useState([]); // Array of keys 'A', 'B'...
    const [modalContent, setModalContent] = useState(null); // { title: '', body: '' }

    useEffect(() => {
        fetchGame();
    }, [slug]);

    useEffect(() => {
        if (gameState !== 'playing') return;
        const interval = setInterval(() => {
            setTimer(prev => {
                if (prev <= 1) {
                    endGame('lost');
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [gameState]);

    const fetchGame = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/subjects/${slug}/questions/game`, { withCredentials: true });
            if (res.data.length < 12) {
                setGameState('error');
            } else {
                setQuestions(res.data);
                setGameState('playing');
                setTimer(600);
            }
        } catch (err) {
            console.error(err);
            setGameState('error');
            setModalContent({ title: 'Error', body: err.response?.data?.error || err.message });
        }
    };

    const [history, setHistory] = useState([]); // [{ question_id, selected_answer, is_correct }]

    const endGame = async (result) => {
        // result: 'won', 'lost', 'walkaway'
        setGameState(result);

        let score = 0;
        const currentMoney = currentQIndex > 0 ? MONEY_LADDER[currentQIndex - 1] : 0;

        if (result === 'won') {
            score = 1000000;
        } else if (result === 'walkaway') {
            score = currentMoney;
        } else {
            // Lost - Logic for safety nets (0, 1000, 40000)
            if (currentQIndex > 6) score = 40000;
            else if (currentQIndex > 1) score = 1000;
            else score = 0;
        }

        try {
            await axios.post('http://localhost:5000/api/game/submit', {
                subject_slug: slug,
                score,
                answers: history
            }, { withCredentials: true });
        } catch (err) {
            console.error(err);
        }
    };


    const handleWalkAway = () => {
        if (window.confirm("Are you sure you want to end the game and take your current winnings?")) {
            endGame('walkaway');
        }
    };

    const handleAnswer = (choice) => {
        const currentQ = questions[currentQIndex];
        const isCorrect = choice === currentQ.correct_answer;

        // Add to history
        const newHistory = [...history, {
            question_id: currentQ.id,
            selected_answer: choice,
            is_correct: isCorrect
        }];
        setHistory(newHistory);

        if (isCorrect) {
            // Correct
            import('../utils/audio').then(a => a.playCorrect());
            if (currentQIndex === 11) {
                import('../utils/audio').then(a => a.playWin());
                endGame('won');
            } else {
                setCurrentQIndex(prev => prev + 1);
                setHiddenAnswers([]); // Reset 50:50
                // Optional: Reset timer? Request says "Max 10 minutes per question" -> Yes, per question usually means reset. 
                // Wait, "Maks 10 minut na pytanie". Yes, reset.
                setTimer(600);
            }
        } else {
            // Wrong
            import('../utils/audio').then(a => a.playWrong());
            endGame('lost');
        }
    };

    const useFiftyFifty = () => {
        if (!lifelines.fifty) return;
        setLifelines(prev => ({ ...prev, fifty: false }));

        const currentQ = questions[currentQIndex];
        const wrongs = ['A', 'B', 'C', 'D'].filter(k => k !== currentQ.correct_answer);
        // Hide 2 random wrongs
        const shuffled = wrongs.sort(() => 0.5 - Math.random());
        setHiddenAnswers(shuffled.slice(0, 2));
    };

    const useAudience = () => {
        if (!lifelines.audience) return;
        setLifelines(prev => ({ ...prev, audience: false }));

        const currentQ = questions[currentQIndex];
        // Fake stats: Correct answer gets 40-80%, others split remainder
        const correct = currentQ.correct_answer;
        const correctPerc = Math.floor(Math.random() * 40) + 40; // 40-80
        const remainder = 100 - correctPerc;

        setModalContent({
            title: 'Audience Poll',
            body: `The audience voted:\n${correct}: ${correctPerc}%\n(Others split remaining ${remainder}%)` // Simplified display
        });
    };

    const usePhone = () => {
        if (!lifelines.phone) return;
        setLifelines(prev => ({ ...prev, phone: false }));

        const currentQ = questions[currentQIndex];
        // Hint logic: Correct answer with 80% confidence if Easy, 50% if Hard
        const confidence = currentQ.difficulty === 1 ? 0.9 : currentQ.difficulty >= 3 ? 0.4 : 0.7;
        const isCorrect = Math.random() < confidence;
        const suggested = isCorrect ? currentQ.correct_answer : 'A'; // Fallback wrong

        setModalContent({
            title: 'Phone a Friend',
            body: `Friend says: "I'm ${Math.floor(confidence * 100)}% sure it's ${suggested}."`
        });
    };

    if (gameState === 'loading') return <Container className="mt-5 text-center"><h2>Loading Game for subject: {slug}...</h2></Container>;
    if (gameState === 'error') return <Container className="mt-5 text-center"><Alert variant="danger">Error: {modalContent?.body || 'Failed to load game.'}</Alert><Button onClick={() => navigate('/')}>Back</Button></Container>;
    if (gameState === 'won') return <Container className="mt-5 text-center"><div className="display-1 text-success">YOU WON 1 MILLION!</div><Button size="lg" className="mt-3" onClick={() => navigate('/')}>Home</Button></Container>;
    if (gameState === 'walkaway') return <Container className="mt-5 text-center"><div className="display-1 text-primary">Game Ended</div><h3>You decided to walk away with: <span className="text-warning fw-bold">{currentQIndex > 0 ? MONEY_LADDER[currentQIndex - 1] : 0} $</span></h3><Button size="lg" className="mt-3" onClick={() => navigate('/')}>Home</Button></Container>;
    if (gameState === 'lost') {
        let score = 0;
        // Re-calc for display consistency (or could store in state)
        if (currentQIndex > 6) score = 40000;
        else if (currentQIndex > 1) score = 1000;
        return <Container className="mt-5 text-center"><div className="display-1 text-danger">GAME OVER</div><p>You leave with {score} $</p><Button size="lg" className="mt-3" onClick={() => navigate('/')}>Home</Button></Container>;
    }

    const currentQ = questions[currentQIndex];

    return (
        <Container fluid className="min-vh-100 bg-dark text-white p-4">
            <Row className="h-100">
                <Col md={9} className="d-flex flex-column justify-content-center">
                    <div className="mb-4 d-flex justify-content-between">
                        <h3>Question {currentQIndex + 1}/12</h3>
                        <h3><Badge bg="secondary">Timer: {Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Badge></h3>
                    </div>

                    <Card className="text-dark mb-4 text-center p-4">
                        <Card.Body>
                            <Card.Title className="display-6">{currentQ.content}</Card.Title>
                        </Card.Body>
                    </Card>

                    <Row className="g-3">
                        {['A', 'B', 'C', 'D'].map(opt => (
                            <Col md={6} key={opt}>
                                <Button
                                    variant="outline-light"
                                    className="w-100 p-3 fs-4 text-start"
                                    onClick={() => handleAnswer(opt)}
                                    disabled={hiddenAnswers.includes(opt)}
                                    style={{ visibility: hiddenAnswers.includes(opt) ? 'hidden' : 'visible' }}
                                >
                                    <span className="text-warning fw-bold">{opt}:</span> {currentQ[`answer_${opt.toLowerCase()}`]}
                                </Button>
                            </Col>
                        ))}
                    </Row>

                    <div className="mt-5 d-flex gap-3 justify-content-center align-items-center">
                        <Button variant={lifelines.fifty ? "primary" : "secondary"} disabled={!lifelines.fifty} onClick={useFiftyFifty}>50:50</Button>
                        <Button variant={lifelines.audience ? "primary" : "secondary"} disabled={!lifelines.audience} onClick={useAudience}>Ask Audience</Button>
                        <Button variant={lifelines.phone ? "primary" : "secondary"} disabled={!lifelines.phone} onClick={usePhone}>Phone Friend</Button>
                        <div className="vr mx-2 bg-secondary"></div>
                        <Button variant="danger" onClick={handleWalkAway}>End Game</Button>
                    </div>
                </Col>

                <Col md={3} className="border-start border-secondary">
                    <ul className="list-group">
                        {[...MONEY_LADDER].reverse().map((amt, idx) => {
                            const realIdx = 11 - idx;
                            const active = realIdx === currentQIndex;
                            const passed = realIdx < currentQIndex;
                            const isGuaranteed = realIdx === 1 || realIdx === 6; // $1000 and $40000

                            let liClass = 'list-group-item d-flex justify-content-between ';
                            if (active) liClass += 'active ';
                            else if (passed) liClass += 'list-group-item-success ';
                            else if (isGuaranteed) liClass += 'text-warning fw-bold bg-transparent '; // Highlight guaranteed
                            else liClass += 'bg-transparent text-white ';

                            return (
                                <li key={realIdx} className={liClass}>
                                    <span className={isGuaranteed ? "fw-bold" : ""}>{realIdx + 1}</span>
                                    <span className={isGuaranteed ? "fw-bold" : ""}>{amt} $</span>
                                </li>
                            );
                        })}
                    </ul>
                </Col>
            </Row>

            <Modal show={!!modalContent} onHide={() => setModalContent(null)} centered>
                <Modal.Header closeButton className="text-dark"><Modal.Title>{modalContent?.title}</Modal.Title></Modal.Header>
                <Modal.Body className="text-dark fs-5">{modalContent?.body}</Modal.Body>
                <Modal.Footer><Button onClick={() => setModalContent(null)}>Close</Button></Modal.Footer>
            </Modal>
        </Container>
    );
};

export default Game;
