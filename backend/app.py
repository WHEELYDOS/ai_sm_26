"""
AshaCare Backend - Flask Application
Main entry point for the backend API server
"""
import os
import sys

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, send_from_directory, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import config
from models import db


def create_app(config_name='default'):
    """Application factory"""
    app = Flask(__name__, static_folder='static')
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    
    # Setup CORS
    CORS(app, resources={
        r"/api/*": {
            "origins": app.config.get('CORS_ORIGINS', ['*']),
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    
    # Setup JWT
    jwt = JWTManager(app)
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({'error': 'Token has expired', 'code': 'token_expired'}), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({'error': 'Invalid token', 'code': 'invalid_token'}), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({'error': 'Authorization required', 'code': 'authorization_required'}), 401
    
    # Register blueprints
    from routes.auth import auth_bp
    from routes.patients import patients_bp
    from routes.records import records_bp
    from routes.reminders import reminders_bp
    from routes.sync import sync_bp
    from routes.prediction import prediction_bp
    
    app.register_blueprint(auth_bp)
    app.register_blueprint(patients_bp)
    app.register_blueprint(records_bp)
    app.register_blueprint(reminders_bp)
    app.register_blueprint(sync_bp)
    app.register_blueprint(prediction_bp)
    
    # Serve frontend files
    frontend_folder = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend')
    
    @app.route('/')
    def serve_index():
        return send_from_directory(frontend_folder, 'login.html')
    
    @app.route('/app')
    def serve_app():
        return send_from_directory(frontend_folder, 'index.html')
    
    @app.route('/<path:filename>')
    def serve_static(filename):
        # Check frontend folder first
        frontend_path = os.path.join(frontend_folder, filename)
        if os.path.exists(frontend_path):
            return send_from_directory(frontend_folder, filename)
        # Check static folder (for models, etc.)
        return send_from_directory(app.static_folder, filename)
    
    @app.route('/css/<path:filename>')
    def serve_css(filename):
        return send_from_directory(os.path.join(frontend_folder, 'css'), filename)
    
    @app.route('/js/<path:filename>')
    def serve_js(filename):
        return send_from_directory(os.path.join(frontend_folder, 'js'), filename)
    
    @app.route('/assets/<path:filename>')
    def serve_assets(filename):
        return send_from_directory(os.path.join(frontend_folder, 'assets'), filename)
    
    # Serve Vosk models with proper caching
    @app.route('/models/<path:filename>')
    def serve_models(filename):
        models_folder = os.path.join(app.static_folder, 'models')
        response = send_from_directory(models_folder, filename)
        # Cache models for 1 year
        response.cache_control.max_age = 31536000
        return response
    
    # Cache headers for large files
    @app.after_request
    def add_cache_headers(response):
        if response.mimetype in ['application/x-gzip', 'application/gzip']:
            response.cache_control.max_age = 31536000
        return response
    
    # Health check endpoint
    @app.route('/api/health')
    def health_check():
        return jsonify({'status': 'healthy', 'app': 'AshaCare Backend'}), 200
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
    return app


# Create app instance
app = create_app(os.environ.get('FLASK_ENV', 'development'))


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
