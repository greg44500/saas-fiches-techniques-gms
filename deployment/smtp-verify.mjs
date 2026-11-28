/**
 * Vérifie le transport TLS et l'authentification Brevo SANS envoyer de courriel.
 * À appeler uniquement depuis le VPS après configuration réelle.
 */
import nodemailer from 'nodemailer';
import { smtpConfig } from '../backend/config/smtp.config.js';

try {
    const transporter = nodemailer.createTransport({
        ...smtpConfig,
        disableFileAccess: true,
        disableUrlAccess: true,
    });
    await transporter.verify();
    console.log('SMTP : connexion et authentification acceptées. Aucun message envoyé.');
} catch (error) {
    console.error('SMTP : échec (' + (error.code || 'ERREUR') + ').');
    process.exitCode = 1;
}
