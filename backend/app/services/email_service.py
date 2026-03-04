"""SMTP email service for sending invoices."""
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List, Tuple


async def test_smtp_connection(smtp_settings) -> Tuple[bool, str]:
    """Test SMTP connection with current settings."""
    try:
        with smtplib.SMTP(smtp_settings.smtp_host, smtp_settings.smtp_port, timeout=10) as server:
            server.ehlo()
            if smtp_settings.smtp_use_tls:
                server.starttls()
                server.ehlo()
            server.login(smtp_settings.smtp_username, smtp_settings.smtp_password)
        return True, "SMTP connection successful"
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed. Check username and password."
    except smtplib.SMTPConnectError:
        return False, "Could not connect to SMTP server. Check host and port."
    except Exception as e:
        return False, f"Connection failed: {str(e)}"


async def send_invoice_email(
    smtp_settings,
    recipient_emails: List[str],
    invoice,
    company,
    html_content: str,
) -> Tuple[bool, str]:
    """Send invoice email as full HTML without PDF attachment."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"Invoice {invoice.invoice_number} - {company.name}"
        msg["From"] = f"{smtp_settings.from_name} <{smtp_settings.from_email}>"
        msg["To"] = ", ".join(recipient_emails)

        # Basic text fallback
        text_body = f"Invoice {invoice.invoice_number} from {company.name} for ${invoice.total:,.2f}."
        msg.attach(MIMEText(text_body, "plain"))

        # Rich HTML body
        msg.attach(MIMEText(html_content, "html"))

        # Send
        with smtplib.SMTP(smtp_settings.smtp_host, smtp_settings.smtp_port, timeout=30) as server:
            server.ehlo()
            if smtp_settings.smtp_use_tls:
                server.starttls()
                server.ehlo()
            server.login(smtp_settings.smtp_username, smtp_settings.smtp_password)
            server.send_message(msg)

        return True, "Email sent successfully"
    except Exception as e:
        return False, f"Failed to send email: {str(e)}"
