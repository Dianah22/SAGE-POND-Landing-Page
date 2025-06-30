import firebase_admin
from firebase_admin import credentials, auth

# Initialize Firebase Admin (do this once at the start of your app)
# cred = credentials.Certificate('path/to/serviceAccountKey.json')
# firebase_admin.initialize_app(cred)

def verify_firebase_session_cookie(session_cookie: str):
    """
    Verifies a Firebase session cookie and returns the decoded claims if valid.
    Raises firebase_admin.auth.InvalidSessionCookieError if invalid or expired.
    """
    try:
        # Set check_revoked=True to ensure the session cookie is not revoked
        decoded_claims = auth.verify_session_cookie(session_cookie, check_revoked=True)
        return decoded_claims  # This is a dict with user info (uid, etc.)
    except auth.InvalidSessionCookieError as e:
        # Session cookie is invalid, expired or revoked
        print("Invalid session cookie:", e)
        return None
    except Exception as e:
        print("Error verifying session cookie:", e)
        return None