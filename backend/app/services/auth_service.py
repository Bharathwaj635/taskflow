"""Business logic for registration and login."""
from ..extensions import db
from ..models.user import User


class AccountAlreadyExists(Exception):
    """Raised when a username or email is already taken.

    `field` tells the route which form field to attach the error to
    ("username" or "email").
    """
    def __init__(self, message: str, field: str):
        super().__init__(message)
        self.field = field


class InvalidCredentials(Exception):
    """Raised when the identifier (username or email) + password don't match."""


def register_user(name: str, username: str, email: str, password: str) -> User:
    if User.query.filter_by(username=username).first():
        raise AccountAlreadyExists(f"Username '{username}' is already taken", "username")
    if User.query.filter_by(email=email).first():
        raise AccountAlreadyExists(f"{email} is already registered", "email")

    user = User(name=name, username=username, email=email)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return user


def authenticate_user(identifier: str, password: str) -> User:
    """Look up a user by username OR email (whichever `identifier` matches)."""
    user = User.query.filter(
        (User.username == identifier) | (User.email == identifier)
    ).first()
    if not user or not user.check_password(password):
        raise InvalidCredentials("Invalid username/email or password")
    return user


def change_password(user: User, current_password: str, new_password: str) -> None:
    if not user.check_password(current_password):
        raise InvalidCredentials("Current password is incorrect")
    user.set_password(new_password)
    db.session.commit()
