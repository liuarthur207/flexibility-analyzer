import React, { useState, useEffect, useRef } from 'react';

const App = () => {
    const [videoFile, setVideoFile] = useState(null);
    const [averageBackAngle, setAverageBackAngle] = useState(null);
    const [gptRecommendations, setGptRecommendations] = useState(null); // State for GPT recommendations
    const [serverStatus, setServerStatus] = useState('Checking...');
    const [loading, setLoading] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [recordedChunks, setRecordedChunks] = useState([]);
    const videoRef = useRef(null);
    const mediaRecorderRef = useRef(null);
    const fileInputRef = useRef(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const timerRef = useRef(null);

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

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && file.type.startsWith('video/')) {
            setVideoFile(file);
        } else {
            alert('Please upload a valid video file.');
            setVideoFile(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!videoFile) return;

        setLoading(true);
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
            setAverageBackAngle(data.average_angle);
        } catch (error) {
            console.error(error);
            alert('An error occurred while processing the video.');
        } finally {
            setLoading(false);
        }
    };

    const startRecording = async () => {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoRef.current.srcObject = stream;

        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                setRecordedChunks((prev) => prev.concat(event.data));
            }
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0); 
        timerRef.current = setInterval(() => {
          setRecordingTime((prevTime) => prevTime + 1);
        }, 1000);
    };

    const stopRecording = () => {
        mediaRecorderRef.current.stop();
        setIsRecording(false);

        mediaRecorderRef.current.onstop = () => {
            clearInterval(timerRef.current);
            const currentRecordedChunks = recordedChunks;
            const blob = new Blob(currentRecordedChunks, { type: 'video/webm' });
            const file = new File([blob], 'recorded_video.webm', { type: 'video/webm' });
            setVideoFile(file);
            setRecordedChunks([]);

            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(file);
            fileInputRef.current.files = dataTransfer.files;

            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        };
    };

    const getRecommendations = async () => {
        if (averageBackAngle === null) {
            alert('Please calculate the average angle first!');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/back_recommendation', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ angle: averageBackAngle })
            });

            if (!response.ok) {
                throw new Error('Failed to get recommendations from server');
            }

            const data = await response.json();
            setGptRecommendations(data.advice); // Assuming the API returns 'advice'
        } catch (error) {
            console.error(error);
            alert('An error occurred while getting recommendations.');
        }
    };

    useEffect(() => {
        checkServerHealth();
    }, []);

    return (
        <div>
            <h1>Flexibility Tester with AI!!!</h1>
            <h2>Server Status: {serverStatus}</h2>
            <video ref={videoRef} autoPlay playsInline style={{ display: isRecording ? 'block' : 'none' }}></video>
            <div>
                <button onClick={isRecording ? stopRecording : startRecording}>
                    {isRecording ? 'Stop Recording' : 'Start Recording'}
                </button>
            </div>
            <form onSubmit={handleSubmit}>
                <label>
                    Video File:
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="video/mp4,video/x-m4v,video/*"
                        onChange={handleFileChange}
                        required={!isRecording}
                        disabled={isRecording}
                    />
                </label>
                <button type="submit" disabled={loading || isRecording}>
                    {loading ? 'Processing...' : 'Submit'}
                </button>
            </form>
            <div> 
              {isRecording && <h3>Recording Time: {recordingTime} seconds</h3>}
              <h3> (only last 30 seconds will be used!) </h3>
            </div>
            {averageBackAngle !== null && (
                <div>
                    <h2>Average Angle: {averageBackAngle}</h2>
                    <button onClick={getRecommendations} disabled={loading}>
                        Get GPT Recommendations
                    </button>
                </div>
            )}
{gptRecommendations && (
    <div>
        <h2>Recommendations:</h2>
        <p dangerouslySetInnerHTML={{ __html: gptRecommendations.replace(/\n/g, '<br />') }} />
    </div>
)}

        </div>
    );
};

export default App;
