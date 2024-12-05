import nodemailer from 'nodemailer';

// Create a transporter using Gmail's SMTP, with the provided credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // Specify Gmail as the service
  auth: {
    user: process.env.EMAIL_USERNAME, 
    pass: process.env.EMAIL_PASSWORD  // This is the App Password
  }
});

/**
 * Send email verification link to new user
 * @param {string} email - User's email address
 * @param {string} verificationToken - Email verification token
 * @param {string} businessName - User's business name
 */
export const sendVerificationEmail = async (email, verificationToken, businessName) => {

  const verificationLink = `${process.env.FRONTEND_URL}/api/auth/verify-email/${verificationToken}`;

  const mailOptions = {
    from: `"SeamProfy" <${process.env.EMAIL_USERNAME}>`, // Gmail email
    to: email,
    subject: 'Verify Your Email - SeamProfy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to SeamProfy, ${businessName}!</h2>
        <p>Thank you for registering. Please verify your email address by clicking the button below:</p>
        <a href="${verificationLink}" style="
          display: inline-block; 
          padding: 10px 20px; 
          background-color: #4CAF50; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
        ">
          Verify Email
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${verificationLink}</p>
        <p>This link will expire in 1 hour.</p>
        <small>If you did not create an account, please ignore this email.</small>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Verification email sent to ${email}`);
  } catch (error) {
    console.error('Error sending verification email:', error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send password reset link to user
 * @param {string} email - User's email address
 * @param {string} resetToken - Password reset token
 * @param {string} businessName - User's business name
 */
export const sendPasswordResetEmail = async (email, resetToken, businessName) => {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

  const mailOptions = {
    from: `"SeamProfy" <${process.env.EMAIL_USERNAME}>`, // Gmail email
    to: email,
    subject: 'Password Reset Request - SeamProfy',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request, ${businessName}</h2>
        <p>You have requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetLink}" style="
          display: inline-block; 
          padding: 10px 20px; 
          background-color: #2196F3; 
          color: white; 
          text-decoration: none; 
          border-radius: 5px;
        ">
          Reset Password
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p>${resetLink}</p>
        <p>This link will expire in 1 hour.</p>
        <small>If you did not request a password reset, please ignore this email or contact support.</small>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('Failed to send password reset email');
  }
};