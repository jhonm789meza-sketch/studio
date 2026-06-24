# RIFA⚡ EXPRESS - Despliegue

Esta aplicación está lista para ser publicada. Aquí tienes las mejores opciones para desplegarla de forma gratuita:

## 1. Vercel (Recomendado)
Es la opción más sencilla y potente para aplicaciones Next.js.
1. Sube tu código a un repositorio de **GitHub**.
2. Entra en [vercel.com](https://vercel.com) y crea una cuenta gratuita.
3. Haz clic en "Add New" > "Project" e importa tu repositorio.
4. Vercel detectará automáticamente que es Next.js y desplegará la app.

## 2. Firebase App Hosting
Ya que la app utiliza Firebase, puedes usar su propio servicio de hosting optimizado.
1. Ve a la [Consola de Firebase](https://console.firebase.google.com/).
2. En el menú lateral, busca **App Hosting**.
3. Conecta tu repositorio de GitHub y sigue los pasos.
4. Firebase configurará automáticamente el despliegue continuo.

## 3. Netlify
Una alternativa excelente a Vercel.
1. Crea una cuenta en [netlify.com](https://netlify.com).
2. Conecta tu repositorio de GitHub.
3. Selecciona la carpeta del proyecto y haz clic en "Deploy".

---
*Nota: Recuerda que para que la base de datos funcione en producción, debes asegurarte de que las Reglas de Seguridad de Firestore estén configuradas correctamente en tu consola de Firebase.*