# app.py - Main Flask Application for AI-Powered Fertilizer Optimizer
import resend
import secrets
import bcrypt 
from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import pickle
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# GMAIL_USERNAME = os.getenv("GMAIL_USERNAME")
# GMAIL_PASSWORD = os.getenv("GMAIL_PASSWORD")

RESEND_API_KEY = os.getenv("RESEND_API_KEY")
resend.api_key = RESEND_API_KEY

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
    return response  # Enable CORS for frontend communication

# MongoDB Connection
try:
    MONGO_URI = "mongodb+srv://agrismart_user:%23%23assassin1234@agrismart.e64zrm5.mongodb.net/?appName=AgriSmart"
    client = MongoClient(MONGO_URI, tls=True, tlsAllowInvalidCertificates=True)
    db = client['dbconnect']  # Your existing database name
    
    # Collections
    users_collection = db['users']
    recommendations_collection = db['recommendations']
    soil_data_collection = db['soil_data']
    
    print("✓ Connected to MongoDB successfully!")
except Exception as e:
    print(f"✗ MongoDB connection error: {e}")


# Email sending:::::::::::::

def send_verification_email(to_email, username, token):
    verify_link = f"https://ai-farming-x.onrender.com/api/verify-email?token={token}"
    

    resend.Emails.send({
        "from": "onboarding@resend.dev",
        "to": to_email,
        "subject": "Verify your AgriSmart account",
        "html": f"""
        <h2>Welcome to AgriSmart, {username}!</h2>

        <p>Click below to verify your email:</p>

        <a href="{verify_link}"
           style="background:#2e7d32;
                  color:white;
                  padding:12px 24px;
                  text-decoration:none;
                  border-radius:8px;">
           Verify Email
        </a>

        <p>This link expires in 24 hours.</p>
        """
})
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP("smtp.gmail.com", 587) as server:
        server.starttls()
        server.login(GMAIL_USERNAME, GMAIL_PASSWORD)
        server.sendmail(GMAIL_USERNAME, to_email, msg.as_string())



# Global variables for ML model
model = None
label_encoders = {}
crop_encoder = None

# ==================== DATA PREPARATION ====================

def create_sample_dataset():
    """Create a sample dataset for training if no data exists"""
    data = {
        'N': [90, 42, 74, 50, 80, 20, 40, 60, 70, 85, 35, 55, 75, 65, 45],
        'P': [42, 43, 35, 19, 30, 45, 50, 30, 25, 40, 55, 20, 35, 30, 40],
        'K': [43, 15, 40, 25, 35, 60, 70, 50, 45, 30, 40, 35, 25, 50, 45],
        'temperature': [20.8, 21.0, 23.0, 26.0, 24.0, 27.0, 22.0, 25.0, 23.5, 21.5, 28.0, 24.5, 22.5, 26.5, 25.5],
        'humidity': [82, 80, 70, 75, 65, 60, 85, 78, 72, 80, 68, 74, 76, 70, 82],
        'ph': [6.5, 7.0, 6.0, 5.5, 6.8, 7.5, 6.2, 6.9, 7.2, 6.4, 5.8, 6.7, 7.1, 6.3, 6.6],
        'rainfall': [202, 226, 263, 200, 150, 180, 220, 190, 210, 240, 170, 195, 230, 205, 215],
        'crop': ['rice', 'maize', 'chickpea', 'cotton', 'wheat', 'jute', 'rice', 'wheat', 'maize', 'rice', 
                'cotton', 'chickpea', 'wheat', 'jute', 'maize']
    }
    return pd.DataFrame(data)

def determine_fertilizer(N, P, K, crop_type):
    """Determine fertilizer type based on NPK values and crop"""
    fertilizer_mapping = {
        'rice': {
            'high_N': 'Urea (46-0-0)',
            'high_P': 'DAP (18-46-0)',
            'high_K': 'MOP (0-0-60)',
            'balanced': 'NPK (17-17-17)'
        },
        'wheat': {
            'high_N': 'Urea (46-0-0)',
            'high_P': 'SSP (16-0-0)',
            'high_K': 'MOP (0-0-60)',
            'balanced': 'NPK (12-32-16)'
        },
        'maize': {
            'high_N': 'Urea (46-0-0)',
            'high_P': 'DAP (18-46-0)',
            'high_K': 'MOP (0-0-60)',
            'balanced': 'NPK (20-20-0)'
        },
        'cotton': {
            'high_N': 'Urea (46-0-0)',
            'high_P': 'SSP (16-0-0)',
            'high_K': 'SOP (0-0-50)',
            'balanced': 'NPK (15-15-15)'
        },
        'default': {
            'high_N': 'Urea (46-0-0)',
            'high_P': 'DAP (18-46-0)',
            'high_K': 'MOP (0-0-60)',
            'balanced': 'NPK (20-20-20)'
        }
    }
    
    crop_map = fertilizer_mapping.get(crop_type.lower(), fertilizer_mapping['default'])
    
    # Determine which nutrient is most needed
    if N < 40:
        return crop_map['high_N']
    elif P < 20:
        return crop_map['high_P']
    elif K < 30:
        return crop_map['high_K']
    else:
        return crop_map['balanced']

# ==================== ML MODEL TRAINING ====================

def train_model():
    """Train the Random Forest model for crop prediction"""
    global model, label_encoders, crop_encoder
    
    try:
        # Create or load dataset
        df = create_sample_dataset()
        
        # Prepare features and target
        X = df[['N', 'P', 'K', 'temperature', 'humidity', 'ph', 'rainfall']]
        y = df['crop']
        
        # Encode crop labels
        crop_encoder = LabelEncoder()
        y_encoded = crop_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y_encoded, test_size=0.2, random_state=42
        )
        
        # Train Random Forest model
        model = RandomForestClassifier(n_estimators=100, random_state=42)
        model.fit(X_train, y_train)
        
        # Calculate accuracy
        accuracy = model.score(X_test, y_test)
        print(f"✓ Model trained successfully! Accuracy: {accuracy * 100:.2f}%")
        
        # Save model
        with open('fertilizer_model.pkl', 'wb') as f:
            pickle.dump(model, f)
        with open('crop_encoder.pkl', 'wb') as f:
            pickle.dump(crop_encoder, f)
            
        return True
    except Exception as e:
        print(f"✗ Model training error: {e}")
        return False

def load_model():
    """Load the pre-trained model"""
    global model, crop_encoder
    
    try:
        if os.path.exists('fertilizer_model.pkl') and os.path.exists('crop_encoder.pkl'):
            with open('fertilizer_model.pkl', 'rb') as f:
                model = pickle.load(f)
            with open('crop_encoder.pkl', 'rb') as f:
                crop_encoder = pickle.load(f)
            print("✓ Model loaded successfully!")
            return True
        else:
            print("Model files not found. Training new model...")
            return train_model()
    except Exception as e:
        print(f"✗ Model loading error: {e}")
        return train_model()

# ==================== API ENDPOINTS ====================


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Fertilizer Optimizer API is running',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/api/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.get_json()

        if not data:
            return jsonify({'error:': 'Invalid JOSN'}), 400
        
        username = data.get('username').strip()
        password = data.get('password').strip()  # In production, hash this!
        email = data.get('email').strip()
        
        # Check if user exists
        if users_collection.find_one({'username': username}):
            return jsonify({'error': 'Username already exists'}), 400
        
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

        token = secrets.token_urlsafe(32)
        token_expiry = datetime.now().timestamp() + 86400 # 24 hours in seconds
        
        # Create user
        user = {
            'username': username,
            'password': hashed.decode('utf-8'),  # Hash in production!
            'email': email,
            'created_at': datetime.now(),
            'role': 'farmer',
            'is_verified': False,
            'verification_token': token,
            'token_expires_at': token_expiry
        }
        
        try:
            send_verification_email(email, username, token)
        except Exception as email_error:
            return jsonify({'error':'failed to send verification mail'}), 500
        users_collection.insert_one(user)

        
        
        return jsonify({
            'message': 'User registered successfully',
            'username': username
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/api/verify-email', methods=['GET'])
def verify_email():

    token = request.args.get('token')
    
    if not token:
        return "INVALID!!", 400

    user = users_collection.find_one({'verification_token': token})

    if not user:
        return "INVALID!!", 400
    
    if datetime.now().timestamp()>user['token_expires_at']:
        return "LINK EXPIRED. Please register again.", 400
    

    users_collection.update_one(
        {'_id': user['_id']},

        {
            '$set': {'is_verified': True}, 
            '$unset':{'verification_token':'', 'token_expires_at':''}}
    )

    return """
    <html><body style="font-family:sans-serif; text-align:center; padding:60px">
       <h2 style ="color:#2e7d32"> Email Verified successfully! </h2>
       <p> Your account is now active.</p>
       <a href="http://127.0.0.1:5500/login.html"
          styel ="background-colour:#2e7d32;color:white;padding:12px 24px;border-radius:8px;text-decoration:none">
          Go to login
          </a>
          </body></html>
          """, 200


@app.route('/api/login', methods=['POST'])
def login():
    """User login"""
    try:
        data = request.json
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        ip = request.remote_addr
        agent = request.user_agent.string

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        user = users_collection.find_one({'username': username})

        if user and not user.get('is_verified', False):
            return jsonify({'error': 'Please verify your email before logging in'}), 403

        if not user:
            # Log failed attempt
            db['login_logs'].insert_one({
                'username': username,
                'status': 'failed',
                'reason': 'user not found',
                'ip': ip,
                'agent': agent,
                'timestamp': datetime.now()
            })
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not user.get('is_verified', False):
         return jsonify({'error': 'Please verify your email before logging in'}), 403

        # Compare hashed password
        # if not bcrypt.checkpw(password.encode('utf-8'), user['password']):

        stored_password = user['password']
        if isinstance(stored_password, str):
         stored_password = stored_password.encode('utf-8')
        if not bcrypt.checkpw(password.encode('utf-8'), stored_password):
            db['login_logs'].insert_one({
                'username': username,
                'status': 'failed',
                'reason': 'wrong password',
                'ip': ip,
                'agent': agent,
                'timestamp': datetime.now()
            })
            return jsonify({'error': 'Invalid credentials'}), 401

        #  Login success — log it
        db['login_logs'].insert_one({
            'username': username,
            'user_id': str(user['_id']),
            'status': 'success',
            'ip': ip,
            'agent': agent,
            'timestamp': datetime.now()
        })

        return jsonify({
            'message': 'Login successful',
            'username': username,
            'role': user.get('role', 'farmer'),
            'email': user.get('email', '')
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

    #     user = users_collection.find_one({
    #         'username': username,
    #         'password': password  # Use hashed comparison in production!
    #     })
        
    #     if user:
    #         return jsonify({
    #             'message': 'Login successful',
    #             'username': username,
    #             'role': user.get('role', 'farmer')
    #         }), 200
    #     else:
    #         return jsonify({'error': 'Invalid credentials'}), 401
            
    # except Exception as e:
    #     return jsonify({'error': str(e)}), 500

@app.route('/api/fertilizer/recommend', methods=['POST'])
def recommend_fertilizer():
    """Main endpoint for fertilizer recommendation"""
    try:
        data = request.json
        
        # Extract input parameters
        N = float(data.get('nitrogen', 50))
        P = float(data.get('phosphorus', 30))
        K = float(data.get('potassium', 40))
        temperature = float(data.get('temperature', 25))
        humidity = float(data.get('humidity', 70))
        ph = float(data.get('ph', 6.5))
        rainfall = float(data.get('rainfall', 200))
        crop_type = data.get('crop_type', 'rice')
        soil_type = data.get('soil_type', 'loamy')
        
        # Prepare input for model
        input_features = np.array([[N, P, K, temperature, humidity, ph, rainfall]])
        
        # Get crop prediction (optional)
        if model and crop_encoder:
            predicted_crop_encoded = model.predict(input_features)[0]
            predicted_crop = crop_encoder.inverse_transform([predicted_crop_encoded])[0]
        else:
            predicted_crop = crop_type
        
        # Determine fertilizer recommendation
        fertilizer = determine_fertilizer(N, P, K, crop_type)
        
        # Calculate dosage (simplified logic)
        base_dosage = 150  # kg/hectare
        if N < 40:
            dosage = base_dosage * 1.3
        elif N > 80:
            dosage = base_dosage * 0.7
        else:
            dosage = base_dosage
        
        # Generate recommendation
        recommendation = {
            'fertilizer_type': fertilizer,
            'dosage': f"{dosage:.1f} kg/hectare",
            'application_method': 'Split application - 50% at sowing, 50% at tillering',
            'predicted_crop': predicted_crop,
            'soil_analysis': {
                'nitrogen': 'Low' if N < 40 else 'Medium' if N < 80 else 'High',
                'phosphorus': 'Low' if P < 20 else 'Medium' if P < 50 else 'High',
                'potassium': 'Low' if K < 30 else 'Medium' if K < 60 else 'High'
            },
            'recommendations': generate_recommendations(N, P, K, ph, soil_type),
            'timestamp': datetime.now().isoformat()
        }
        
        # Save to database
        save_data = {
            'username': data.get('username', 'anonymous'),
            'input_data': data,
            'recommendation': recommendation,
            'created_at': datetime.now()
        }
        recommendations_collection.insert_one(save_data)
        
        return jsonify(recommendation), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def generate_recommendations(N, P, K, ph, soil_type):
    """Generate detailed recommendations"""
    recommendations = []
    
    # Nitrogen recommendations
    if N < 40:
        recommendations.append("Apply nitrogen-rich fertilizer like Urea to boost crop growth.")
    elif N > 80:
        recommendations.append("Nitrogen levels are sufficient. Avoid over-fertilization.")
    
    # Phosphorus recommendations
    if P < 20:
        recommendations.append("Phosphorus deficiency detected. Apply DAP or SSP fertilizer.")
    
    # Potassium recommendations
    if K < 30:
        recommendations.append("Low potassium levels. Consider applying MOP or SOP.")
    
    # pH recommendations
    if ph < 5.5:
        recommendations.append("Soil is acidic. Consider lime application to raise pH.")
    elif ph > 7.5:
        recommendations.append("Soil is alkaline. Use sulfur amendments to lower pH.")
    
    # Soil type specific
    if soil_type == 'sandy':
        recommendations.append("Sandy soil requires frequent, smaller fertilizer applications.")
    elif soil_type == 'clay':
        recommendations.append("Clay soil benefits from organic matter addition for better drainage.")
    
    return recommendations

@app.route('/api/recommendations/history', methods=['GET'])
def get_history():
    """Get recommendation history for a user"""
    try:
        username = request.args.get('username', 'anonymous')
        
        history = list(recommendations_collection.find(
            {'username': username}
        ).sort('created_at', -1).limit(10))
        
        # Convert ObjectId to string
        for item in history:
            item['_id'] = str(item['_id'])
        
        return jsonify(history), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/soil/save', methods=['POST'])
def save_soil_data():
    """Save soil test data"""
    try:
        data = request.json
        data['created_at'] = datetime.now()
        
        soil_data_collection.insert_one(data)
        
        return jsonify({'message': 'Soil data saved successfully'}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/crops', methods=['GET'])
def get_crops():
    """Get list of available crops"""
    crops = [
        'rice', 'wheat', 'maize', 'cotton', 'chickpea', 
        'jute', 'sugarcane', 'potato', 'tomato', 'onion',
        'soybean', 'groundnut', 'pulses', 'vegetables'
    ]
    return jsonify({'crops': crops}), 200

@app.route('/api/model/retrain', methods=['POST'])
def retrain_model():
    """Retrain the ML model (admin only)"""
    try:
        success = train_model()
        
        if success:
            return jsonify({'message': 'Model retrained successfully'}), 200
        else:
            return jsonify({'error': 'Model training failed'}), 500
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ==================== INITIALIZE APP ====================
load_model()

if __name__ == '__main__':
    print("="*50)
    print("AI-Powered Fertilizer Optimizer Backend")
    print("="*50)
    
    # Load or train model
    
    # Start Flask app
    print("\n✓ Starting Flask server...")
    print("✓ API available at: http://127.0.0.1:5000")
    print("="*50)
    
    app.run(debug=True, host='0.0.0.0', port=5000)
