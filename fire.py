
# Initialize Firebase Admin (do this once at the start of your app)
# cred = credentials.Certificate('path/to/serviceAccountKey.json')


def verify_firebase_session_cookie(session_cookie: str):
    """
    Verifies a Firebase session cookie and returns the decoded claims if valid.
    Raises firebase_admin.auth.InvalidSessionCookieError if invalid or expired.
    """
    