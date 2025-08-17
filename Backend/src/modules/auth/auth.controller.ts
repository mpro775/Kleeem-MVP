import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorator';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto';

@ApiTags('المصادقة')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'تسجيل مستخدم جديد (الحقول: اسم، إيميل، كلمة المرور)',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ description: 'تم التسجيل بنجاح' })
  @ApiBadRequestResponse({ description: 'خطأ في البيانات أو الإيميل موجود' })
  @HttpCode(HttpStatus.CREATED)
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'تسجيل الدخول وإرجاع توكن JWT' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'تم تسجيل الدخول بنجاح' })
  @ApiUnauthorizedResponse({ description: 'بيانات الاعتماد غير صحيحة' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
  @Public()
  @Post('resend-verification')
  @ApiOperation({ summary: 'إعادة إرسال كود تفعيل البريد الإلكتروني' })
  @ApiOkResponse({ description: 'تم إرسال كود التفعيل بنجاح' })
  @ApiBadRequestResponse({
    description: 'خطأ في الطلب (بريد غير مسجل أو مفعل)',
  })
  async resendVerification(@Body() dto: ResendVerificationDto) {
    await this.authService.resendVerification(dto);
    return { message: 'تم إرسال كود التفعيل مجددًا إلى بريدك' };
  }
  // مسار التحقق من الكود
  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'تفعيل البريد برمز أو رابط' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiOkResponse({ description: 'تم تفعيل البريد بنجاح' })
  @ApiUnauthorizedResponse({ description: 'رمز التفعيل غير صحيح أو منتهي' })
  async verifyEmail(@Body() dto: VerifyEmailDto): Promise<{ message: string }> {
    await this.authService.verifyEmail(dto);
    return { message: 'تم تفعيل البريد بنجاح' };
  }
}
