//car-listing.js
document.addEventListener('DOMContentLoaded', () => {
   console.log("Document loaded");
   const carForm = document.getElementById('car-form');
   const carUpdateForm = document.getElementById('update-car-form');
   const carList = document.getElementById('car-list');


   function handleError(message) {
       console.error("Error:", message);
       // Log error message 
       alert(message); // Display the error message to the user via an alert
   }
   // Fetch and display cars
   async function fetchAndDisplayCars() {
       console.log("Fetching cars");
       try {
           const response = await fetch('/cars', {
               method: 'GET',
               credentials: 'include' // Cookies are sent with the request
           });
           if (!response.ok) {
               throw new Error('Failed to fetch cars');
           }
           const cars = await response.json();
           displayCars(cars);
           console.log("Cars fetched:", cars);
       } catch (error) {
           handleError('Error fetching cars: ' + error.message);
       }
   }

// Displays cars in the DOM
   function displayCars(cars) {
       console.log("Displaying cars");
       carList.innerHTML = cars.map(car => `
       <li>
       Model: ${car.model}, Year: ${car.year}, Price: $${car.price}
       <button onclick='populateUpdateForm(${JSON.stringify(car)})'>Update</button>
   </li>
`).join('');
}


// Populates the update form with car data
   window.populateUpdateForm = function(car) {
       console.log("Populating form for update", car);
       if (carUpdateForm) {
           document.getElementById('update-model').value = car.model;
           document.getElementById('update-year').value = car.year;
           document.getElementById('update-mileage').value = car.mileage;
           document.getElementById('update-location').value = car.location;
           document.getElementById('update-price').value = car.price;
           document.getElementById('update-availableFrom').value = car.availableFrom;
           document.getElementById('update-availableUntil').value = car.availableUntil;
           document.getElementById('update-id').value = car.id;
         
       }
   };


// Event handler for submitting new car listings
   carForm.addEventListener('submit', async (e) => {
       e.preventDefault();
       console.log("Submitting new car form")
       const formData = new FormData(carForm);
       const bodyData = Object.fromEntries(formData.entries());
       try {
           const response = await fetch('/cars', {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               credentials: 'include', // Cookies are sent
               body: JSON.stringify(bodyData)
           });
           if (!response.ok) {
               throw new Error('Failed to add the car');
           }
           alert('Car added successfully!');
           carForm.reset();
           fetchAndDisplayCars();
       } catch (error) {
           handleError('Error adding car: ' + error.message);
       }
   });


// Event handler for updating car details
   carUpdateForm.addEventListener('submit', async (e) => {

       console.log("Submit event listener on carUpdateForm triggered");


       e.preventDefault();


       console.log("Submitting update car form");

       const carId = document.getElementById('update-id').value;
       const formData = new FormData(carUpdateForm);
       const bodyData = Object.fromEntries(formData.entries());
       try {
           const response = await fetch(`/cars/${carId}`, {
               method: 'PUT',
               headers: { 'Content-Type': 'application/json' },
               credentials: 'include', 
               body: JSON.stringify(bodyData)
           });
           if (!response.ok) {
               throw new Error('Failed to update the car');
           }
           alert('Car updated successfully!');

           fetchAndDisplayCars();
       } catch (error) {
           handleError('Error updating car: ' + error.message);
       }
   });


   // Logout functionality with error handling
   const logoutButton = document.getElementById('logoutButton');
   if (logoutButton) {
       logoutButton.addEventListener('click', async () => {
           try {
               const response = await fetch('/logout', {
                   method: 'GET',
                   credentials: 'include' 
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
   // fetch and display cars initially when the page is loaded
   fetchAndDisplayCars();
});
