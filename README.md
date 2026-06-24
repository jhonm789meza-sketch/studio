# RIFA⚡ EXPRESS - Opciones de Despliegue

Esta aplicación está lista para ser publicada. Aquí tienes las instrucciones detalladas para desplegarla de forma gratuita, evitando errores comunes:

## 1. Vercel (Altamente Recomendado)
Es la plataforma oficial de los creadores de Next.js. Es la opción más robusta y fácil.
- **Cómo**: Ve a [vercel.com](https://vercel.com), crea una cuenta, conecta tu GitHub e importa este repositorio.
- **Configuración**: Vercel detectará automáticamente que es Next.js. Solo dale a "Deploy".

## 2. Cloudflare Pages (Excelente Rendimiento)
**¡IMPORTANTE!** No crees un "Worker". Debes crear un proyecto de **Pages**.

### Pasos Correctos para Cloudflare:
1. Entra al panel de Cloudflare y ve a **Workers & Pages**.
2. Haz clic en **Create application** y luego selecciona la pestaña **Pages** (NO Workers).
3. Haz clic en **Connect to Git** y selecciona tu repositorio.
4. **Configuración de Build**:
   - **Framework preset**: Selecciona `Next.js`.
   - **Build command**: `npx @cloudflare/next-on-pages` (o simplemente `next build`).
   - **Output directory**: `.vercel/output/static` o `.next`.
5. En **Environment Variables**, asegúrate de añadir `NODE_VERSION` con valor `20`.

## 3. Firebase App Hosting
La opción nativa para aplicaciones que ya usan servicios de Firebase.
- **Ventaja**: Integración perfecta con tu base de datos actual.
- **Cómo**: En la consola de Firebase, busca la sección "App Hosting" y sigue los pasos para conectar GitHub.

## 4. Netlify
Muy similar a Vercel, excelente para Next.js.
- **Cómo**: Conecta tu repositorio en [netlify.com](https://netlify.com). Detectará automáticamente la configuración de Next.js.

---
**Recordatorio importante**: Independientemente de dónde despliegues, asegúrate de que las **Reglas de Seguridad de Firestore** en tu consola de Firebase permitan el acceso desde el nuevo dominio de producción.