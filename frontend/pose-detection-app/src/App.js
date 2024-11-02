import React, { useState } from 'react';

const App = () => {
    const [videoPath, setVideoPath] = useState('');
    const [averageAngle, setAverageAngle] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const response = await fetch('/get_back_angle', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ video_path: videoPath })
        });
        const data = await response.json();
        setAverageAngle(data.average_angle);
    };

    return (
        <div>
            <h1>Calculate Average Angle from Video</h1>
            <form onSubmit={handleSubmit}>
                <label>
                    Video Path:
                    <input
                        type="text"
                        value={videoPath}
                        onChange={(e) => setVideoPath(e.target.value)}
                        placeholder="Enter video file path"
                        required
                    />
                </label>
                <button type="submit">Submit</button>
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
