'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export const requestNotificationPermission = async (raffleRef: string) => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return;
    }

    const messaging = getMessaging(app);

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
        console.log('Notification permission granted.');
        try {
            const currentToken = await getToken(messaging, {
                vapidKey: 'BDS7iNntQ29QPIMdJgP6T0iL2eM9Wsa7v22zQ1y53OM93A0Be0v0Lg9i_VjU-5A7uEtp53UjpTssV3NBl50aY8U',
            });
            if (currentToken) {
                console.log('FCM Token:', currentToken);
                // Save the token to Firestore
                const raffleDocRef = doc(db, 'raffles', raffleRef);
                await updateDoc(raffleDocRef, {
                    notificationTokens: arrayUnion(currentToken)
                });
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.log('An error occurred while retrieving token. ', err);
        }
    } else {
        console.log('Unable to get permission to notify.');
    }

    onMessage(messaging, (payload) => {
        console.log('Message received. ', payload);
        // You can handle foreground messages here, e.g., show a toast notification
        const notificationTitle = payload.notification?.title || 'RifaExpress';
        const notificationOptions = {
            body: payload.notification?.body || '',
            icon: '/icon-192x192.png'
        };

        new Notification(notificationTitle, notificationOptions);
    });
};
