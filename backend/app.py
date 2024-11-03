from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS  # Import CORS
import cv2
import mediapipe as mp
import numpy as np
import tempfile
import os
from openai import OpenAI

client = OpenAI(api_key = os.getenv("OPENAI_API_KEY"))
app = Flask(__name__, static_folder='../frontend/pose-detection-app/build/static', static_url_path='/static')
CORS(app)  # Enable CORS for all routes

def get_response(context, prompt):

    completion = client.chat.completions.create(
    model="gpt-3.5-turbo",
    messages=[
        {"role": "system", "content": context},
        {"role": "user", "content": prompt}
    ]
    )

    return completion.choices[0].message.content

def angle_between_points(p1, p2, p3):
    a = np.array(p1)
    b = np.array(p2)
    c = np.array(p3)

    ab = b - a
    ac = c - a

    cos_angle = np.dot(ab, ac) / (np.linalg.norm(ab) * np.linalg.norm(ac))
    angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))

    return np.degrees(angle)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose()

@app.route('/')
def serve_react_app():
    return send_from_directory('../frontend/pose-detection-app/build', 'index.html')

@app.route('/<path:path>')
def send_static(path):
    return send_from_directory('../frontend/pose-detection-app/build/static', path)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'OK'}), 200



@app.route('/get_back_angle', methods=['POST'])
def get_back_angle():
    if 'video' not in request.files:
        return {'error': 'No video or image file provided'}, 400

    video_file = request.files['video']
    
    # Use a temporary file for the video upload
    suffix = '.webm' if video_file.filename.endswith('.webm') else '.mp4'
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        video_path = temp_file.name
        video_file.save(video_path)

    cap = cv2.VideoCapture(video_path)
    fps = cap.get(cv2.CAP_PROP_FPS)
    angles = []
    max_angles_to_store = 30 * fps

    while cap.isOpened():
        success, frame = cap.read()
        if not success:
            break

        image = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(image)
        h, w = image.shape[:2]

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

            angle = angle_between_points(midpoint1, midpoint2, midpoint3)
            angles.append(angle)

            if len(angles) > max_angles_to_store:
                angles.pop(0)

    cap.release()

    average_angle = sum(angles) / len(angles) if angles else 0
    os.remove(video_path)  # Clean up the temporary file
    return jsonify({'average_angle': int(average_angle)})

@app.route('/back_recommendation', methods=['POST'])
def request_back():
    try:
        # Retrieve angle from request data
        data = request.json
        angle = data.get("angle", None)

        if angle is None:
            return jsonify({'error': 'No angle provided'}), 400

        context = "You are a back flexibility coach. Your job is to give advice and exercise recommendations based on a cobra pose flexibility angle which I give you. Average would be around 30-40. Give a basic flexibility rating, followed by a two new line, followed by advice followed by a new line, followed by a list of recommended exercises. Be short and concise."
        prompt = f"{context} The angle is: {angle} degrees."

        # Generate response from OpenAI
        advice = get_response(context, prompt)
        
        return jsonify({'status': 'OK', 'advice': advice}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
if __name__ == '__main__':
    app.run(port=8000, debug=True)
