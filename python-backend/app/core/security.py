from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
import hashlib
from .config import settings

# Try to use passlib first, fallback to direct bcrypt
try:
    from passlib.context import CryptContext

    # Configure password context with explicit bcrypt settings
    pwd_context = CryptContext(
        schemes=["bcrypt"],
        deprecated="auto",
        bcrypt__rounds=12,
        bcrypt__ident="2b"
    )

    def _verify_bcrypt(plain_password: str, hashed_password: str) -> bool:
        try:
            return pwd_context.verify(plain_password, hashed_password)
        except Exception:
            try:
                return bcrypt.checkpw(
                    plain_password.encode('utf-8'),
                    hashed_password.encode('utf-8')
                )
            except Exception:
                return False

    def get_password_hash(password: str) -> str:
        """Hash a password"""
        try:
            return pwd_context.hash(password)
        except Exception:
            salt = bcrypt.gensalt(rounds=12)
            hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
            return hashed.decode('utf-8')

except ImportError:
    def _verify_bcrypt(plain_password: str, hashed_password: str) -> bool:
        try:
            return bcrypt.checkpw(
                plain_password.encode('utf-8'),
                hashed_password.encode('utf-8')
            )
        except Exception:
            return False

    def get_password_hash(password: str) -> str:
        """Hash a password using direct bcrypt"""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')


def _verify_sha256(plain_password: str, hashed_password: str) -> bool:
    """Verify against legacy SHA256 hex digest (migrated from DynamoDB)."""
    return hashlib.sha256(plain_password.encode('utf-8')).hexdigest() == hashed_password


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against its hash. Supports bcrypt and legacy SHA256."""
    if not hashed_password:
        return False
    # Bcrypt hashes start with $2b$ or $2a$
    if hashed_password.startswith(('$2b$', '$2a$', '$2y$')):
        return _verify_bcrypt(plain_password, hashed_password)
    # Legacy SHA256 hex digest (64 hex chars)
    if len(hashed_password) == 64:
        return _verify_sha256(plain_password, hashed_password)
    return False


def needs_password_rehash(hashed_password: str) -> bool:
    """Check if a password hash needs to be upgraded to bcrypt."""
    if not hashed_password:
        return False
    return not hashed_password.startswith(('$2b$', '$2a$', '$2y$'))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str):
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None
    """Create JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[str]:
    """Verify JWT token and return email"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            return None
        return email
    except JWTError:
        return None
