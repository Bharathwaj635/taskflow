"""Local development entry point.

Run with:  python run.py
"""
from app import create_app
from app.config import DevConfig

app = create_app(DevConfig)

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
