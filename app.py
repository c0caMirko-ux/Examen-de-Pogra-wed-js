from flask import Flask, jsonify, request
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

app = Flask(__name__)
CORS(app)

# Configuración de la base de datos
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev')

db = SQLAlchemy(app)

# Modelos
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    player_name = db.Column(db.String(80), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    level = db.Column(db.Integer, nullable=False)
    time_played = db.Column(db.Integer, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Rutas API
@app.route('/api/users', methods=['GET'])
def get_users():
    users = User.query.all()
    return jsonify([{
        'id': user.id,
        'username': user.username,
        'created_at': user.created_at.isoformat()
    } for user in users])

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.json
    new_user = User(
        username=data['username'],
        password=data['password']  # En producción, asegúrate de hashear la contraseña
    )
    db.session.add(new_user)
    db.session.commit()
    return jsonify({
        'id': new_user.id,
        'username': new_user.username,
        'created_at': new_user.created_at.isoformat()
    }), 201

@app.route('/api/game-data', methods=['GET'])
def get_game_data():
    games = GameData.query.all()
    return jsonify([{
        'id': game.id,
        'player_name': game.player_name,
        'score': game.score,
        'level': game.level,
        'time_played': game.time_played,
        'created_at': game.created_at.isoformat()
    } for game in games])

@app.route('/api/game-data', methods=['POST'])
def create_game_data():
    data = request.json
    new_game = GameData(
        player_name=data['player_name'],
        score=data['score'],
        level=data['level'],
        time_played=data['time_played']
    )
    db.session.add(new_game)
    db.session.commit()
    return jsonify({
        'id': new_game.id,
        'player_name': new_game.player_name,
        'score': new_game.score,
        'level': new_game.level,
        'time_played': new_game.time_played,
        'created_at': new_game.created_at.isoformat()
    }), 201

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(debug=True)