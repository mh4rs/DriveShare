//account-recovery.js
document.addEventListener('DOMContentLoaded', function() {
    const startRecoveryButton = document.getElementById('start-recovery-btn');
    const submitAnswerButton = document.getElementById('submit-answer-btn');
    const resetPasswordButton = document.getElementById('reset-password-btn'); 
    const emailInput = document.getElementById('recovery-email');
    const answerInput = document.getElementById('recovery-answer');
    const newPasswordInput = document.getElementById('new-password'); 
    const questionDisplay = document.getElementById('recovery-question');
    const messageDisplay = document.getElementById('recovery-message');
    let currentQuestionKey = 'securityQuestion1'; // Start with the first security question
    let userEmail; // Store user email for password reset


// Function to display messages on the UI
    function displayMessage(message, isSuccess = false) {
        messageDisplay.textContent = message;
        messageDisplay.style.color = isSuccess ? 'green' : 'red';
    }


// Function to switch the UI to the password reset form
    function displayPasswordResetForm() {
        document.getElementById('recovery-questions').style.display = 'none';
        document.getElementById('password-reset-form').style.display = 'block';
    }


// Initiates the recovery process by sending the user's email to the server
    async function initiateRecovery(email) {
        try {
            const response = await fetch('/start-recovery', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
            });
            const data = await response.json();
            if (response.ok) {
                userEmail = email; 
                currentQuestionKey = data.questionKey; // Update current question key
                questionDisplay.textContent = data.questionText; // Display the question text
                document.getElementById('recovery-questions').style.display = 'block';
                answerInput.value = '';
                displayMessage('Please answer the security question below.', true);
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            displayMessage('An error occurred while trying to start the recovery process.');
        }
    }


// Submits the answer to the server and handles the response
    async function submitAnswer(email, answer) {
        try {
            const response = await fetch('/verify-answer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, answer, questionKey: currentQuestionKey }),
            });
            const data = await response.json();
            if (response.ok) {
                if (data.allowReset) {
                    displayPasswordResetForm();
                } else {
                    currentQuestionKey = data.nextQuestionKey;
                    questionDisplay.textContent = data.nextQuestionText;
                    answerInput.value = '';
                    displayMessage('Please answer the next security question below.', true);
                }
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            displayMessage('An error occurred during the recovery process.');
        }
    }


// Resets the user's password after successful security question responses
    async function resetPassword(email, newPassword) {
        try {
            const response = await fetch('/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, newPassword }),
            });
            const data = await response.json();
            if (response.ok) {
                displayMessage(data.message, true);
            } else {
                displayMessage(data.message);
            }
        } catch (error) {
            displayMessage('An error occurred while resetting the password.');
        }
    }

    startRecoveryButton.addEventListener('click', function() {
        const email = emailInput.value.trim();
        if (email) {
            initiateRecovery(email);
        } else {
            displayMessage('Please enter your email.');
        }
    });

    submitAnswerButton.addEventListener('click', function() {
        const answer = answerInput.value.trim();
        if (answer) {
            submitAnswer(userEmail, answer); 
        } else {
            displayMessage('Please answer the security question.');
        }
    });

    resetPasswordButton.addEventListener('click', function() {
        const newPassword = newPasswordInput.value.trim();
        if (newPassword) {
            resetPassword(userEmail, newPassword); 
        } else {
            displayMessage('Please enter a new password.');
        }
    });
});
