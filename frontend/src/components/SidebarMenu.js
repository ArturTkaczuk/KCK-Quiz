import React, { useState, useEffect } from 'react';
import { Offcanvas, ListGroup, Badge } from 'react-bootstrap';
import axios from 'axios';

const SidebarMenu = ({ show, handleClose }) => {
    const [leaderboard, setLeaderboard] = useState([]);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [loading, setLoading] = useState(false);

    const toggleLeaderboard = () => {
        if (!showLeaderboard && leaderboard.length === 0) {
            fetchLeaderboard();
        }
        setShowLeaderboard(!showLeaderboard);
    };

    const fetchLeaderboard = async () => {
        setLoading(true);
        try {
            console.log("Fetching leaderboard...");
            const res = await axios.get('http://localhost:5000/api/leaderboard', { withCredentials: true });
            console.log("Leaderboard data:", res.data);
            setLeaderboard(res.data);
        } catch (err) {
            console.error("Failed to fetch leaderboard", err);
            setLeaderboard([{ name: "Error fetching data", total_score: err.message || "Unknown error" }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Offcanvas show={show} onHide={handleClose}>
            <Offcanvas.Header closeButton>
                <Offcanvas.Title>Main Menu</Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body>

                <div
                    className="p-3 mb-3 bg-light border rounded cursor-pointer d-flex justify-content-between align-items-center"
                    onClick={toggleLeaderboard}
                    style={{ cursor: 'pointer' }}
                >
                    <h5 className="m-0">Global Leaderboard 🏆</h5>
                    <span>{showLeaderboard ? '▼' : '▶'}</span>
                </div>

                {showLeaderboard && (
                    <div className="mb-4">
                        {loading && <p className="text-center text-muted">Loading...</p>}
                        {!loading && (
                            <ListGroup as="ol" numbered>
                                {leaderboard.map((user, idx) => (
                                    <ListGroup.Item
                                        as="li"
                                        key={idx}
                                        className="d-flex justify-content-between align-items-start"
                                    >
                                        <div className="ms-2 me-auto">
                                            <div className="fw-bold">{user.name}</div>
                                        </div>
                                        <Badge bg="primary" pill>
                                            {user.total_score} pts
                                        </Badge>
                                    </ListGroup.Item>
                                ))}
                                {leaderboard.length === 0 && <p className="text-muted text-center">No scores yet. Play a game!</p>}
                            </ListGroup>
                        )}
                    </div>
                )}

                <HistorySection />

            </Offcanvas.Body>
        </Offcanvas>
    );
};

const HistorySection = () => {
    const [games, setGames] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedGameId, setSelectedGameId] = useState(null);
    const [gameDetails, setGameDetails] = useState(null);
    const [detailsLoading, setDetailsLoading] = useState(false);

    const toggleHistory = () => {
        if (!showHistory && games.length === 0) {
            fetchHistory();
        }
        setShowHistory(!showHistory);
    };

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const res = await axios.get('http://localhost:5000/api/history', { withCredentials: true });
            setGames(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleShowDetails = async (gameId) => {
        if (selectedGameId === gameId) {
            setSelectedGameId(null); // Toggle off
            return;
        }
        setSelectedGameId(gameId);
        setDetailsLoading(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/history/${gameId}`, { withCredentials: true });
            setGameDetails(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setDetailsLoading(false);
        }
    };

    return (
        <div>
            <div
                className="p-3 mb-3 bg-light border rounded cursor-pointer d-flex justify-content-between align-items-center"
                onClick={toggleHistory}
                style={{ cursor: 'pointer' }}
            >
                <h5 className="m-0">Your Game History 📜</h5>
                <span>{showHistory ? '▼' : '▶'}</span>
            </div>

            {showHistory && (
                <div>
                    {loading && <p className="text-center text-muted">Loading...</p>}
                    {!loading && games.length === 0 && <p className="text-muted text-center">No games played yet.</p>}

                    <ListGroup>
                        {games.map(game => (
                            <div key={game.id}>
                                <ListGroup.Item
                                    action
                                    onClick={() => handleShowDetails(game.id)}
                                    className="d-flex justify-content-between align-items-center"
                                >
                                    <div>
                                        <div className="fw-bold">{game.subject_name}</div>
                                        <small className="text-muted">{new Date(game.timestamp).toLocaleString()}</small>
                                    </div>
                                    <Badge bg={game.score >= 1000000 ? "success" : "secondary"}>
                                        {game.score} $
                                    </Badge>
                                </ListGroup.Item>

                                {selectedGameId === game.id && (
                                    <div className="bg-white border p-3 border-top-0 mb-2">
                                        {detailsLoading && <p className="text-center">Loading details...</p>}
                                        {!detailsLoading && gameDetails && (
                                            <div>
                                                {gameDetails.length === 0 && <p className="text-muted">No details available for this game.</p>}
                                                {gameDetails.map((q, i) => {
                                                    const isCorrect = q.is_correct === 1;
                                                    return (
                                                        <div key={q.id} className={`p-2 mb-2 border rounded ${isCorrect ? 'border-success bg-opacity-10 bg-success' : 'border-danger bg-opacity-10 bg-danger'}`}>
                                                            <strong>Q{i + 1}:</strong> {q.content}<br />
                                                            <small>You: <span className="fw-bold">{q.selected_answer}</span> | Correct: <span className="fw-bold">{q.correct_answer}</span></small>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </ListGroup>
                </div>
            )}
        </div>
    );
};

export default SidebarMenu;
