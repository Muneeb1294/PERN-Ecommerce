import nodemailer from "nodemailer";
import { config } from 'dotenv';


config({ path: './config/config.env' });

export const sendEmail = async (email, subject, message) => {

    console.log(process.env.SMTP_HOST, process.env.SMTP_SERVICE, process.env.SMTP_PORT, process.env.SMTP_MAIL, process.env.SMTP_PASSWORD);
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            service: process.env.SMTP_SERVICE,
            port: process.env.SMTP_PORT,
            auth: {
                user: "muhammadmuneeb94@gmail.com",
                pass: "ybkgbkrjyrqwsqfu",
            },
        });
        const mailOptions = {
            from: process.env.SMTP_MAIL,
            to: email,
            subject,
            html: message,
        };
        await transporter.sendMail(mailOptions);
        console.log("✅ Email Sent Successfully.");
    } catch (error) {
        console.error("❌ Failed To Send Email.", error);
        throw error;
    }
};
