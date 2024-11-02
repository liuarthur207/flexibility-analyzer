from flask import Flask, request, jsonify, render_template, Response, send_from_directory
import cv2
import mediapipe as mp
import numpy as np

app = Flask(__name__, static_folder='../frontend/pose-detection/build/static', static_url_path='/static')

# Function to calculate the angle between three points
def angle_between_points(p1, p2, p3):
    a = np.array(p1)
    b = np.array(p2)
    c = np.array(p3)
    
    ab = b - a
    ac = c - a
    
    cos_angle = np.dot(ab, ac) / (np.linalg.norm(ab) * np.linalg.norm(ac))
    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
    
    return np.degrees(angle)

# Initialize MediaPipe Pose
mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

@app.route('/')
def serve_react_app():
    return send_from_directory('../frontend/pose-detection/build', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../frontend/pose-detection/build/static', path)

if __name__ == '__main__':
    app.run(debug=True)

@app.route('/get_back_angle', methods=['POST'])
def get_back_angle():
    video_path = request.json['video_path']
    
    # Open the video file
    cap = cv2.VideoCapture(video_path)

    # Get the frame rate (FPS)
    fps = cap.get(cv2.CAP_PROP_FPS)

    angles = []
    max_angles_to_store = 30 * fps  # Store 30 angles for averaging over 30 seconds

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        # Process the frame
        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)

        h, w = image.shape[:2]

        # Midpoint calculations
        if results.pose_landmarks:
            midpoint1 = (
                (int(results.pose_landmarks.landmark[11].x * w) + int(results.pose_landmarks.landmark[12].x * w)) // 2,
                (int(results.pose_landmarks.landmark[11].y * h) + int(results.pose_landmarks.landmark[12].y * h)) // 2)

            midpoint2 = (
                (int(results.pose_landmarks.landmark[23].x * w) + int(results.pose_landmarks.landmark[24].x * w)) // 2,
                (int(results.pose_landmarks.landmark[23].y * h) + int(results.pose_landmarks.landmark[24].y * h)) // 2)

            midpoint3 = (
                (int(results.pose_landmarks.landmark[27].x * w) + int(results.pose_landmarks.landmark[28].x * w)) // 2,
                (int(results.pose_landmarks.landmark[27].y * h) + int(results.pose_landmarks.landmark[28].y * h)) // 2)

            # Angle calculation
            angle = angle_between_points(midpoint1, midpoint2, midpoint3)
            angles.append(angle)

            # Keep only angles for the last 30 seconds
            if len(angles) > max_angles_to_store:
                angles.pop(0)

    cap.release()

    # Calculate the average angle
    average_angle = sum(angles) / len(angles) if angles else 0
    return jsonify({'average_angle': int(average_angle)})
