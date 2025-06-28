# Simple Email Verification Flow

## Database Schema
```sql
-- Add to existing tables or create new table
CREATE TABLE email_verifications (
    id VARCHAR(50) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    verification_token VARCHAR(100) UNIQUE NOT NULL,
    verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verified_at TIMESTAMP NULL,
    expires_at TIMESTAMP NOT NULL
);
```

## API Endpoints to Add

### 1. Request Email Verification
```
POST /api/v1/email/request-verification
{
  "email": "user@example.com"
}

Response:
{
  "message": "Verification email sent",
  "email_sent": true
}
```

### 2. Verify Email
```
GET /api/v1/email/verify/{token}

Response:
{
  "message": "Email verified successfully",
  "verified": true
}
```

### 3. Check Verification Status
```
GET /api/v1/email/status/{email}

Response:
{
  "email": "user@example.com",
  "verified": true,
  "verified_at": "2025-06-27T01:35:00Z"
}
```

## Frontend Components

### Email Verification Form
```jsx
const EmailVerificationForm = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await requestEmailVerification(email);
      setStatus('Verification email sent! Check your inbox.');
    } catch (error) {
      setStatus('Error sending verification email.');
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Send Verification Email</button>
      {status && <p>{status}</p>}
    </form>
  );
};
```

### Enhanced Invite Modal
```jsx
const InviteCollaboratorModal = ({ tripId }) => {
  const [email, setEmail] = useState('');
  const [needsVerification, setNeedsVerification] = useState(false);

  const handleInvite = async () => {
    const result = await sendInvitation(tripId, email, 'editor');
    
    if (result.verification_required) {
      setNeedsVerification(true);
    } else {
      // Invitation sent successfully
      toast.success('Invitation sent!');
    }
  };

  if (needsVerification) {
    return (
      <div className="verification-notice">
        <h3>📧 Verification Required</h3>
        <p>We've sent a verification email to <strong>{email}</strong></p>
        <p>They need to verify their email before receiving invitations.</p>
        <button onClick={() => setNeedsVerification(false)}>
          Try Another Email
        </button>
      </div>
    );
  }

  return (
    <div className="invite-form">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter email address"
      />
      <button onClick={handleInvite}>Send Invitation</button>
    </div>
  );
};
```
