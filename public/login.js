//login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const messageBox = document.getElementById('login-message');

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
    
        const formData = new FormData(loginForm);
        const formDataObj = Object.fromEntries(formData);
    
// send a POST request to the server-side login endpoint with the form data.

        try {
            const response = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formDataObj),
            });
    
            const result = await response.json();
    
            if (response.ok) {
                // Only save user ID and role for client-side logic
                localStorage.setItem('userId', result.userId);
                localStorage.setItem('userRole', result.role);

                // Redirect user based on role
                const redirectUrl = result.role === 'owner' ? 'list-car.html' : 'search-and-book.html';
                window.location.href = redirectUrl;
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            messageBox.textContent = error.message;
            messageBox.style.color = 'red';
        }
    });
});
