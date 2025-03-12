//search-and-book.js
document.addEventListener('DOMContentLoaded', () => {
    const searchForm = document.getElementById('search-form');
    const resultsList = document.getElementById('search-results');
    const bookForm = document.getElementById('book-form');
    const bookingMessage = document.getElementById('booking-message');
    const paymentButton = document.createElement('button');
    paymentButton.textContent = 'Pay Now';
    paymentButton.id = 'payment-button';
    paymentButton.classList.add('hidden');
 
 

    const toggleVisibility = (element, isVisible) => {
        element.style.display = isVisible ? 'block' : 'none';
    };
 

    // Function to fetch cars based on search criteria
    async function searchCars(criteria) {
     try {
         const response = await fetch(`/cars/search?location=${criteria.location}&startDate=${criteria.startDate}&endDate=${criteria.endDate}`);
         if (!response.ok) throw new Error('Search failed.');
         const cars = await response.json();
         displayCars(cars);
     } catch (error) {
         console.error('Search Error:', error);
     }
 }
 

// Helper function to add one day to a date string
 function addOneDay(dateString) {
    const date = new Date(dateString);
    date.setDate(date.getDate() + 1);
    return date.toLocaleDateString('en-US'); 
}
 

// Function to display cars in the search results
 function displayCars(cars) {
     resultsList.innerHTML = cars.map(car => {
         const availableFromAdjusted = addOneDay(car.availableFrom);
         const availableUntilAdjusted = addOneDay(car.availableUntil);
 
         return `
             <li>
                 Model: ${car.model}, Location: ${car.location}, Price: $${car.price},
                 Available From: ${availableFromAdjusted},
                 Available Until: ${availableUntilAdjusted}
                 <button data-owner-id="${car.ownerId}" data-car-id="${car.id}">Book</button>
             </li>
         `;
     }).join('');
 

     document.querySelectorAll('#search-results button').forEach(button => {
         button.addEventListener('click', () => {
             prepareBookingForm(button.getAttribute('data-car-id'), button.getAttribute('data-owner-id'));
         });
     });
 }
 
// Function to prepare and show the booking form with selected car details
 function prepareBookingForm(carId, ownerId) {
     const bookForm = document.getElementById('book-form');
     const carIdInput = document.getElementById('book-carId');
     carIdInput.value = carId;  
     bookForm.setAttribute('data-owner-id', ownerId);  
 
     bookForm.classList.remove('hidden');
     const bookingMessage = document.getElementById('booking-message');
     bookingMessage.classList.add('hidden'); 
 }
 
 const sessionId = localStorage.getItem('sessionId');
 
 bookForm.addEventListener('submit', async (e) => {
     e.preventDefault();
     const formData = new FormData(bookForm);
     const data = Object.fromEntries(formData);
     const ownerId = bookForm.getAttribute('data-owner-id');
     const userId = localStorage.getItem('userId');
 
     try {
         const response = await fetch(`/cars/book/${data.carId}`, {
             method: 'POST',
             headers: {
                 'Content-Type': 'application/json',
                 'Authorization': sessionId
             },
             body: JSON.stringify(data),
         });
         if (!response.ok) throw new Error('Booking failed.');
         const result = await response.json();
 
         bookingMessage.textContent = result.message + ` Total price: $${result.totalPrice}. Please proceed to payment.`;
         toggleVisibility(bookingMessage, true);
         toggleVisibility(bookForm, false);
         toggleVisibility(paymentButton, true);
         paymentButton.dataset.bookingId = result.bookingId;
         paymentButton.onclick = processPayment;
         bookForm.parentNode.insertBefore(paymentButton, bookForm.nextSibling);
 
 
            sendConfirmationMessages(userId, ownerId, data.carId, result);
        } catch (error) {
            console.error('Booking Error:', error);
            bookingMessage.textContent = error.message;
            toggleVisibility(bookingMessage, true);
        }
    });
 

 
// Function to process payment ons button click
    async function processPayment() {
    const bookingId = this.dataset.bookingId; // Retrieve bookingId stored in the dataset of the button
 
 
    try {
        const response = await fetch(`/cars/pay/${bookingId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ paymentConfirmed: true }),
        });
      
        const result = await response.json();
 
 
       if (!response.ok) {
            throw new Error(result.message || 'Payment processing failed.');
        }
 
 
        alert(result.message); 
    } catch (error) {
        console.error('Payment Error:', error);
        alert('Payment failed, please try again.');
    }
 }
 

// Function to send confirmation messages via Firebase Firestore
 function sendConfirmationMessages(userId, ownerId, carId, bookingDetails) {
    const messagesRef = firebase.firestore().collection('messages');
    
    // Message to the renter
    messagesRef.add({
        fromUserId: ownerId,
        toUserId: userId,
        carId: carId,
        message: `Your booking for car ${carId} is confirmed. Total price: $${bookingDetails.totalPrice}.`,
        type: 'booking-confirmation',
        status: 'sent',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    // Message to the owner
    messagesRef.add({
        fromUserId: userId,
        toUserId: ownerId,
        carId: carId,
        message: `Your car ${carId} has been booked by user ${userId}.`,
        type: 'new-booking',
        status: 'sent',
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    });
}
 

// Event listener for the search form submission
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const criteria = {
            location: searchForm.location.value,
            startDate: searchForm.startDate.value,
            endDate: searchForm.endDate.value,
        };
        searchCars(criteria);
    });
 

// Event listener for logout button
    const logoutButton = document.getElementById('logoutButton');
    if (logoutButton) {
        logoutButton.addEventListener('click', async () => {
            try {
                const response = await fetch('/logout', {
                    method: 'GET',
                    credentials: 'include' // Cookies sent with the request
                });
                if (!response.ok) {
                    throw new Error('Logout failed');
                }
                window.location.href = '/'; 
            } catch (error) {
                console.error('Error logging out:', error);
                alert('Error logging out. Please try again.');
            }
        });
    }
 });