using Fiebo.Application.DTOs.Auth;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Enums;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;


namespace Fiebo.Application.Services
{
    public class AuthService : IAuthService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IPasswordHasher _passwordHasher;
        private readonly IEmailService _emailService;
        private readonly IOtpGenerator _otpGenerator;
        private readonly IOtpCacheService _otpCacheService;
        public AuthService(
            IUnitOfWork unitOfWork,
            IPasswordHasher passwordHasher,
            IEmailService emailService,
            IOtpGenerator otpGenerator,
            IOtpCacheService otpCacheService
            )
        {
            _unitOfWork = unitOfWork;
            _passwordHasher = passwordHasher;
            _emailService = emailService;
            _otpGenerator = otpGenerator;
            _otpCacheService = otpCacheService;
        }

        public async Task Activate(VerifyOtpDTO request)
        {
            var user = await _unitOfWork.Users.GetByEmailAsync(request.Email);
            if (user == null)
            {
                throw new NotFoundException("Email is not existed");
            }
            if (user.Status == UserStatus.Active)
            {
                throw new BusinessException("Account already verified");
            }
            var cacheKey = user.UserId.ToString();

            var hash = await _otpCacheService.GetOtpAsync(cacheKey);

            if (hash == null)
            {
                throw new BusinessException("OTP has expired or is invalid");
            }

            // 5. Verify OTP
            var isValid = _passwordHasher.Verify(request.Otp, hash);

            if (!isValid)
            {
                throw new BusinessException("Invalid OTP");
            }
            user.Status = UserStatus.Active;
            _unitOfWork.Users.Update(user);
            await _otpCacheService.RemoveOtpAsync(cacheKey);
            await _unitOfWork.SaveChangesAsync();
        }

        public async Task Register(RegisterDTO request)
        {
            var emailExisting = await _unitOfWork.Users.GetByEmailAsync(request.Email);
            if (emailExisting != null)
            {
                throw new ResourceConflictException("Email is already existed");
            }
            var phoneExisting = await _unitOfWork.Users.GetByPhoneAsync(request.PhoneNumber);
            if (phoneExisting != null)
            {
                throw new ResourceConflictException("Phone number is already existed");
            }

            var user = new User
            {
                Name = request.FullName,
                Email = request.Email,
                PhoneNumber = request.PhoneNumber,
                Password = _passwordHasher.Hash(request.Password),
                DateOfBirth = request.DateOfBirth,
                Status = UserStatus.Inactive
            };
            _unitOfWork.Users.Add(user);
            await _unitOfWork.SaveChangesAsync();
            var subject = "Xác thực tài khoản Fiebo";
            var otp = _otpGenerator.Generate();
            var hashOtp = _passwordHasher.Hash(otp);
            var expire = _otpGenerator.GetExpireTime();
            await _otpCacheService.SetOtpAsync(
                user.UserId.ToString(),
                hashOtp,
                _otpGenerator.GetExpireTime()
                );
            var body = $@"
<div style='font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; padding: 20px; border-radius: 8px;'>
    
    <h2 style='color: #2c3e50; text-align: center;'>
        Xác thực tài khoản Fiebo
    </h2>

    <p>Xin chào,</p>

    <p>
        Chúng tôi đã nhận được yêu cầu đăng ký tài khoản trên hệ thống <strong>Fiebo</strong>.
    </p>

    <p>
        Vui lòng sử dụng mã xác thực bên dưới để hoàn tất quá trình đăng ký:
    </p>

    <div style='
        text-align: center;
        font-size: 28px;
        font-weight: bold;
        color: #ffffff;
        background-color: #3498db;
        padding: 12px;
        border-radius: 6px;
        letter-spacing: 4px;
        margin: 20px 0;
    '>
        {otp}
    </div>

    <p>
        Mã xác thực có hiệu lực trong <strong>{_otpGenerator.GetExpireMinutes()} phút</strong>. 
        Vui lòng không chia sẻ mã này với bất kỳ ai.
    </p>

    <p>
        Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này.
    </p>

    <hr style='margin: 30px 0;' />

    <p style='font-size: 12px; color: #888; text-align: center;'>
        © {DateTime.Now.Year} Fiebo. All rights reserved.
    </p>

</div>";

            await _emailService.SendEmailAsync(user.Email, subject, body);
        }
    }
}
