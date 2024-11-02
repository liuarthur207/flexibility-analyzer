import React, { useState, useEffect } from 'react';

const App = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [averageAngle, setAverageAngle] = useState(null);
    const [serverStatus, setServerStatus] = useState('Checking...');
    const [loading, setLoading] = useState(false); // State for loading indicator

    // Function to check server health
    const checkServerHealth = async () => {
        try {
            const response = await fetch('http://localhost:8000/health');
            if (response.ok) {
                const data = await response.json();
                setServerStatus(data.status);
            } else {
                setServerStatus('Server not reachable');
            }
        } catch (error) {
            setServerStatus('Error connecting to server');
        }
    };

    // Handle video file selection
    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
        } else {
            alert('Please upload a valid video file.');
            setVideoFile(null); // Clear video file if invalid
        }
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!videoFile) return; // Early return if no file is selected

        setLoading(true); // Set loading to true
        const formData = new FormData();
        formData.append('video', videoFile);

        try {
            const response = await fetch('http://localhost:8000/get_back_angle', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Failed to get angle from server');
            }

            const data = await response.json();
            setAverageAngle(data.average_angle);
        } catch (error) {
            console.error(error);
            alert('An error occurred while processing the video.');
        } finally {
            setLoading(false); // Reset loading to false
        }
    };

    // Check server health on component mount
    useEffect(() => {
        checkServerHealth();
    }, []);

    return (
        <div>
            <h1>Calculate Average Angle from Video</h1>
            <h2>Server Status: {serverStatus}</h2>
            <form onSubmit={handleSubmit}>
                <label>
                    Video File:
                    <input
                        type="file"
                        accept="video/mp4,video/x-m4v,video/*"
                        onChange={handleFileChange}
                        required
                    />
                </label>
                <button type="submit" disabled={loading}>
                    {loading ? 'Processing...' : 'Submit'}
                </button>
            </form>
            {averageAngle !== null && (
                <div>
                    <h2>Average Angle: {averageAngle}</h2>
                </div>
            )}
        </div>
    );
};

export default App;
