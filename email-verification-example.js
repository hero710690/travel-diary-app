// Example: Email Verification Flow for Travel Diary App

// 1. Frontend: User requests email verification
const requestEmailVerification = async (email) => {
  const response = await fetch('/api/v1/email/verify-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  });
  return response.json();
};

// 2. Backend: Send verification email
const sendVerificationEmail = async (email) => {
  // Generate verification token
  const verificationToken = generateSecureToken();
  
  // Store token in database
  await storeVerificationToken(email, verificationToken);
  
  // Send verification email
  const verificationLink = `${APP_URL}/verify-email/${verificationToken}`;
  await sendEmail({
    to: email,
    subject: 'Verify your email for Travel Diary',
    html: `
      <h2>Welcome to Travel Diary!</h2>
      <p>Please click the link below to verify your email address:</p>
      <a href="${verificationLink}">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `
  });
  
  return { message: 'Verification email sent', email_sent: true };
};

// 3. Backend: Handle email verification
const verifyEmail = async (token) => {
  // Validate token
  const verification = await getVerificationToken(token);
  if (!verification || verification.expired) {
    throw new Error('Invalid or expired verification token');
  }
  
  // Add email to SES verified identities (if using SES verification)
  await ses.verifyEmailIdentity({ EmailAddress: verification.email });
  
  // Or mark as verified in your database
  await markEmailAsVerified(verification.email);
  
  // Clean up verification token
  await deleteVerificationToken(token);
  
  return { message: 'Email verified successfully', verified: true };
};

// 4. Frontend: Email verification page
const EmailVerificationPage = ({ token }) => {
  const [status, setStatus] = useState('verifying');
  
  useEffect(() => {
    verifyEmailToken(token)
      .then(() => setStatus('success'))
      .catch(() => setStatus('error'));
  }, [token]);
  
  if (status === 'success') {
    return (
      <div className="verification-success">
        <h2>✅ Email Verified!</h2>
        <p>You can now receive invitations and notifications.</p>
        <Link to="/dashboard">Go to Dashboard</Link>
      </div>
    );
  }
  
  return <div>Verifying your email...</div>;
};

// 5. Enhanced Invitation Flow
const sendCollaborationInvite = async (tripId, email, role) => {
  // Check if email is verified
  const isVerified = await isEmailVerified(email);
  
  if (!isVerified) {
    // Send verification email first
    await sendVerificationEmail(email);
    return {
      message: 'Verification email sent. User must verify email before receiving invitations.',
      verification_required: true,
      email_sent: true
    };
  }
  
  // Email is verified, send invitation
  return await sendInvitationEmail(tripId, email, role);
};
