//scripts.js

class Mediator {
    constructor() {
        this.components = {};
    }

    register(componentName, component) {
        this.components[componentName] = component;
    }

    emit(event, details) {
        const component = this.components[event];
        if (component) {
            component.update(details);
        }
    }
}

// Create a mediator instance
const mediator = new Mediator();

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('registration-form');
    const messageBox = document.getElementById('message-box');

    // Register components with the mediator
    mediator.register('messageBox', messageBox);

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent the default form submission via HTTP

        const formData = new FormData(form);
        const formDataObj = Object.fromEntries(formData);

        mediator.emit('messageBox', { message: '', display: 'hide' }); // Hide message box initially

        try {
            const response = await fetch('/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formDataObj),
            });

            const result = await response.json();

            if (response.ok) {
                // log in the user to establish a session
                const loginResponse = await fetch('/login', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({ email: formDataObj.email, password: formDataObj.password }),
                });

                const loginResult = await loginResponse.json();

                if (loginResponse.ok) {
                    // Display success message and redirect

                    mediator.emit('messageBox', {
                        message: 'Registration and login successful. Redirecting...',
                        display: 'show',
                        color: 'green'
                    });

                    setTimeout(() => {
                        // Redirect based on user role

                        if (loginResult.role === 'owner') {
                            window.location.href = 'list-car.html';
                        } else if (loginResult.role === 'renter') {
                            window.location.href = 'search-and-book.html';
                        }
                    }, 3000);
                } else {
                    throw new Error(loginResult.error || 'Login failed post-registration.');
                }
            } else {
                throw new Error(result.error || 'Failed to register. Please try again.');
            }
        } catch (error) {
            mediator.emit('messageBox', {
                message: error.message,
                display: 'show',
                color: 'red'
            });
        }
    });
});

// Update function for the message box component

messageBox.update = function(details) {
    this.textContent = details.message;
    this.style.color = details.color || 'black'; // Default text color
    this.classList.toggle('shown', details.display === 'show');
};
