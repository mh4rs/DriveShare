// messages.js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-app.js';
import { getFirestore, collection, query, where, orderBy, onSnapshot, doc, updateDoc, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/9.0.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: process.env.FIREBASE_API_KEY,
    authDomain: process.env.FIREBASE_AUTH_DOMAIN,
    projectId: process.env.FIREBASE_PROJECT_ID,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_APP_ID
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    // Update the user ID display
    document.getElementById('loggedInUserId').textContent = userId;

    const messagesList = document.getElementById('messageList');
    const sendMessageForm = document.getElementById('sendMessageForm');
    const notificationBadge = document.getElementById('notificationBadge');


// Function to display a notification on the user interface

    function displayNotification(message, isSuccess = true) {
        const notificationArea = document.getElementById('notification');
        notificationArea.textContent = message;
        notificationArea.style.backgroundColor = isSuccess ? '#ccffcc' : '#ffcccc';
        notificationArea.style.color = isSuccess ? 'green' : 'red';
        notificationArea.style.display = 'block';
        setTimeout(() => {
            notificationArea.style.display = 'none';
        }, 3000);
    }


// Update the notification badge with the unread messages count

    function updateNotificationBadge(unreadCount) {
        notificationBadge.textContent = unreadCount > 0 ? unreadCount : '';
        notificationBadge.style.display = unreadCount > 0 ? 'block' : 'none';
    }


// Fetch and display messages from Firestore

    function fetchAndDisplayMessages() {
        const messagesRef = collection(db, 'messages');
        const q = query(messagesRef, where('toUserId', '==', userId), orderBy('timestamp', 'desc'));
    
        onSnapshot(q, (snapshot) => {
            let unreadCount = 0;
            messagesList.innerHTML = '';
            snapshot.forEach(docSnap => {
                const message = docSnap.data();
                const listItem = document.createElement('li');
                listItem.textContent = `From: ${message.fromUserId}, Message: ${message.message}`;
                if (message.status !== 'read') {
                    unreadCount++;
                    listItem.classList.add('unread');
                }
                messagesList.appendChild(listItem);


                // Update message status to 'read' when clicked

                listItem.addEventListener('click', () => {
                    if (message.status !== 'read') {
                        const messageDocRef = doc(db, 'messages', docSnap.id);
                        updateDoc(messageDocRef, { status: 'read' }).then(() => {
                            listItem.classList.remove('unread');
                            unreadCount--;
                            updateNotificationBadge(unreadCount);
                        }).catch(error => console.error("Error updating message status:", error));
                    }
                });
            });
    
            updateNotificationBadge(unreadCount);
        });
    }


// Handle form submission for sending a new message
    sendMessageForm.addEventListener('submit', event => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const toUserId = formData.get('to');
        const messageData = {
            fromUserId: userId,
            toUserId: toUserId,
            message: formData.get('content'), 
            status: 'sent',
            timestamp: serverTimestamp()
        };

        addDoc(collection(db, 'messages'), messageData)
            .then(() => {
                displayNotification('Message sent successfully.');
            })
            .catch(error => {
                console.error("Error sending message:", error);
                displayNotification('Failed to send message.', false);
            });
    });

    const logoutButton = document.getElementById('logoutButton');
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
            displayNotification('Error logging out. Please try again.', false);
        }
    });

    fetchAndDisplayMessages();
});
