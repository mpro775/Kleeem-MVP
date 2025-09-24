// src/mail/mail.service.ts
import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

// ====== Constants (no magic strings) ======
const BRAND_NAME = 'Kaleem' as const;
const FROM_DISPLAY = `"${BRAND_NAME}"` as const;
const SUBJECT_VERIFY = 'تفعيل حسابك على منصة كليم' as const;
const SUBJECT_RESET = 'إعادة تعيين كلمة المرور — كليم' as const;
const VERIFY_PATH = '/verify-email' as const;

// ====== Helpers ======
function ensureNonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}
function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, '');
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter;
  private readonly frontendUrl: string;
  private readonly mailFrom: string;

  constructor(private readonly config: ConfigService) {
    // config
    const host = this.config.get<string>('MAIL_HOST');
    const port = parseInt(this.config.get<string>('MAIL_PORT') || '587', 10);
    const user = this.config.get<string>('MAIL_USER');
    const pass = this.config.get<string>('MAIL_PASS');
    const from = this.config.get<string>('MAIL_FROM');
    const secure = this.config.get<boolean>('MAIL_SECURE') ?? false;
    const feUrl = this.config.get<string>('FRONTEND_URL') ?? '';

    const missing = [
      !ensureNonEmpty(host) ? 'MAIL_HOST' : null,
      !Number.isInteger(port) || port <= 0 ? 'MAIL_PORT' : null,
      !ensureNonEmpty(user) ? 'MAIL_USER' : null,
      !ensureNonEmpty(pass) ? 'MAIL_PASS' : null,
      !ensureNonEmpty(from) ? 'MAIL_FROM' : null,
    ].filter(Boolean);

    if (missing.length > 0) {
      throw new InternalServerErrorException(
        `Missing email configuration: ${missing.join(', ')}`,
      );
    }

    this.frontendUrl = trimTrailingSlash(feUrl);
    this.mailFrom = `${FROM_DISPLAY} <${from!}>`;

    // create transporter
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call
    this.transporter = createTransport({
      host: host!,
      port: port,
      secure,
      auth: { user: user!, pass: pass! },
      // ملاحظة: rejectUnauthorized=false مفيد للبيئات التطويرية؛
      // يُفضّل جعله true في الإنتاج مع شهادات صالحة.
      tls: { rejectUnauthorized: false },
    });
  }

  /**
   * يرسل بريد تفعيل الحساب
   */
  async sendVerificationEmail(email: string, code: string): Promise<void> {
    const link = this.buildVerificationLink(email, code);
    const html = this.generateVerificationTemplate(code, link);

    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: this.mailFrom,
        to: email,
        subject: SUBJECT_VERIFY,
        html,
      });
      this.logger.log(`Verification email sent to ${email}`);
    } catch (err: unknown) {
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to send email to ${email}`, stack);
      throw new InternalServerErrorException('فشل في إرسال بريد التفعيل');
    }
  }

  /**
   * يرسل بريد إعادة تعيين كلمة المرور
   */
  async sendPasswordResetEmail(email: string, link: string): Promise<void> {
    const html = this.generatePasswordResetTemplate(link);
    try {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      await this.transporter.sendMail({
        from: this.mailFrom,
        to: email,
        subject: SUBJECT_RESET,
        html,
      });
      this.logger.log(`Password reset email sent to ${email}`);
    } catch (err: unknown) {
      const stack = err instanceof Error ? err.stack : undefined;
      this.logger.error(`Failed to send reset email to ${email}`, stack);
      // لا نرمي للعميل عمداً لتفادي كشف وجود البريد
    }
  }

  // ====== Private helpers ======

  private buildVerificationLink(email: string, code: string): string {
    const base = this.frontendUrl || '';
    const url = `${trimTrailingSlash(base)}${VERIFY_PATH}`;
    const query =
      `?email=${encodeURIComponent(email)}` +
      `&code=${encodeURIComponent(code)}`;
    return `${url}${query}`;
  }

  private generatePasswordResetTemplate(link: string): string {
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>إعادة تعيين كلمة المرور</title>
<style>
  body{background:#f7f9fc;margin:0;padding:20px;font-family:Segoe UI,Tahoma,Arial}
  .container{max-width:600px;margin:auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 5px 15px rgba(0,0,0,.05)}
  .header{background:linear-gradient(135deg,#4f46e5,#7c3aed);padding:28px;text-align:center;color:#fff;font-weight:bold}
  .content{padding:32px;color:#333;line-height:1.7}
  .btn{display:inline-block;margin:16px 0;padding:14px 18px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;font-weight:700}
  .note{background:#fffaf0;border-right:4px solid #f6ad55;padding:12px;border-radius:8px}
  .footer{padding:18px;text-align:center;color:#718096;font-size:12px;border-top:1px solid #e2e8f0}
</style></head>
<body><div class="container">
  <div class="header">${BRAND_NAME} — Password Reset</div>
  <div class="content">
    <p>لقد تلقّينا طلبًا لإعادة تعيين كلمة المرور لحسابك في ${BRAND_NAME}.</p>
    <p>لإكمال العملية، اضغط الزر أدناه:</p>
    <p><a class="btn" href="${link}">إعادة تعيين كلمة المرور</a></p>
    <p class="note">إذا لم تطلب ذلك، تجاهل هذه الرسالة.</p>
  </div>
  <div class="footer">© ${year} كليم — جميع الحقوق محفوظة</div>
</div></body></html>
    `.trim();
  }

  /**
   * قالب تفعيل الحساب
   */
  private generateVerificationTemplate(
    code: string,
    verificationLink: string,
  ): string {
    const year = new Date().getFullYear();
    return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>تفعيل حسابك</title>
  <style>
    * { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; box-sizing: border-box; }
    body { background-color: #f7f9fc; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 5px 15px rgba(0, 0, 0, 0.05); }
    .header { background: linear-gradient(135deg, #4f46e5, #7c3aed); padding: 30px 20px; text-align: center; }
    .logo { color: white; font-size: 28px; font-weight: bold; margin: 0; }
    .content { padding: 40px 30px; color: #333; line-height: 1.6; }
    .title { color: #2d3748; font-size: 24px; margin-top: 0; text-align: center; }
    .code-container { background: #f0f7ff; border: 1px dashed #4f46e5; border-radius: 8px; padding: 20px; margin: 30px 0; text-align: center; }
    .verification-code { font-size: 32px; font-weight: bold; letter-spacing: 3px; color: #4f46e5; margin: 10px 0; }
    .cta-button { display: block; width: 80%; max-width: 300px; margin: 30px auto; padding: 14px; background: #4f46e5; color: white !important; text-align: center; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 18px; transition: all 0.3s ease; }
    .cta-button:hover { background: #4338ca; transform: translateY(-2px); box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3); }
    .footer { text-align: center; padding: 20px; color: #718096; font-size: 14px; border-top: 1px solid #e2e8f0; }
    .note { background: #fffaf0; padding: 15px; border-radius: 8px; border-right: 4px solid #f6ad55; margin-top: 25px; }
    @media (max-width: 480px) { .content { padding: 25px 20px; } .verification-code { font-size: 28px; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1 class="logo">${BRAND_NAME}</h1></div>
    <div class="content">
      <h2 class="title">تفعيل حسابك</h2>
      <p>مرحباً بك في كليم</p>
      <p>لإكمال عملية إنشاء حسابك، يرجى استخدام كود التفعيل التالي:</p>
      <div class="code-container">
        <p>كود التفعيل</p>
        <div class="verification-code">${code}</div>
        <p>صالح لمدة <b>15 دقيقة</b> فقط</p>
      </div>
      <p>أو يمكنك الضغط على الزر أدناه لتفعيل حسابك مباشرةً:</p>
      <a href="${verificationLink}" class="cta-button">تفعيل الحساب</a>
      <div class="note"><p>إذا لم تطلب هذا البريد، يمكنك تجاهله بأمان.</p></div>
    </div>
    <div class="footer">
      <p>© ${year} كليم . جميع الحقوق محفوظة</p>
      <p>هذه الرسالة أرسلت تلقائياً، يرجى عدم الرد عليها</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }
}
