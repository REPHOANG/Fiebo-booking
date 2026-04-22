//using Fiebo.Application.DTOs.Auth;
//using Fiebo.Application.Interfaces;
//using Fiebo.Application.Services;
//using Fiebo.Domain.Enums;
//using Fiebo.Domain.Exceptions;
//using Moq;
//using Moq.AutoMock;
//using Xunit;

//namespace Fiebo.Application.Tests.Auth
//{
//    public class LoginTests
//    {
//        private readonly AutoMocker _mocker;
//        private readonly AuthService _authService;

//        public LoginTests()
//        {
//            _mocker = new AutoMocker();
//            _authService = _mocker.CreateInstance<AuthService>();
//        }

//        #region UTCID01 - Normal: Valid email + correct password + active account → Token

//        [Fact]
//        public async Task UTCID01_Login_ValidEmail_CorrectPassword_ActiveAccount_ShouldReturnToken()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = "Son123"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son123"))
//                .ReturnsAsync((true, "user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn", UserStatus.Active));

//            _mocker.GetMock<ITokenService>()
//                .Setup(x => x.GenerateAccessToken("user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn"))
//                .Returns("valid_jwt_token");

//            // Act
//            var result = await _authService.LoginAsync(request);

//            // Assert
//            Assert.NotNull(result);
//            Assert.Equal("valid_jwt_token", (IEnumerable<char>?)result);
//            _mocker.GetMock<IIdentityService>()
//                .Verify(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son123"), Times.Once);
//            _mocker.GetMock<ITokenService>()
//                .Verify(x => x.GenerateAccessToken("user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn"), Times.Once);
//        }

//        #endregion

//        #region UTCID02 - Normal: Valid phone + correct password + active account → Token

//        [Fact]
//        public async Task UTCID02_Login_ValidPhone_CorrectPassword_ActiveAccount_ShouldReturnToken()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "0854384243",
//                Password = "Son123"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("0854384243", "Son123"))
//                .ReturnsAsync((true, "user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn", UserStatus.Active));

//            _mocker.GetMock<ITokenService>()
//                .Setup(x => x.GenerateAccessToken("user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn"))
//                .Returns("valid_jwt_token");

//            // Act
//            var result = await _authService.LoginAsync(request);

//            // Assert
//            Assert.NotNull(result);
//            Assert.Equal("valid_jwt_token", (IEnumerable<char>?)result);
//            _mocker.GetMock<IIdentityService>()
//                .Verify(x => x.AuthenticateAsync("0854384243", "Son123"), Times.Once);
//        }

//        #endregion

//        #region UTCID03 - Abnormal: Invalid email format "abc123" → BadRequestException

//        [Fact]
//        public async Task UTCID03_Login_InvalidEmailFormat_ShouldThrowBadRequestException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "abc123",
//                Password = "Son123"
//            };

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<BadRequestException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Định dạng số điện thoại không hợp lệ. Vui lòng nhập số điện thoại hợp lệ.", exception.Message);
//            _mocker.GetMock<IIdentityService>()
//                .Verify(x => x.AuthenticateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
//        }

//        #endregion

//        #region UTCID04 - Abnormal: Invalid phone format "a" → BadRequestException

//        [Fact]
//        public async Task UTCID04_Login_InvalidPhoneFormat_ShouldThrowBadRequestException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "a",
//                Password = "Son123"
//            };

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<BadRequestException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Định dạng số điện thoại không hợp lệ. Vui lòng nhập số điện thoại hợp lệ.", exception.Message);
//            _mocker.GetMock<IIdentityService>()
//                .Verify(x => x.AuthenticateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
//        }

//        #endregion

//        #region UTCID05 - Abnormal: Null EmailOrPhone → BadRequestException

//        [Fact]
//        public async Task UTCID05_Login_NullEmailOrPhone_ShouldThrowBadRequestException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = null!,
//                Password = "Son123"
//            };

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<BadRequestException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.", exception.Message);
//            _mocker.GetMock<IIdentityService>()
//                .Verify(x => x.AuthenticateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
//        }

//        #endregion

//        #region UTCID06 - Abnormal: Email not found in DB → UnauthorizedException

//        [Fact]
//        public async Task UTCID06_Login_NonExistentEmail_ShouldThrowUnauthorizedException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "test123@gmail.com",
//                Password = "Son123"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("test123@gmail.com", "Son123"))
//                .ReturnsAsync((false, string.Empty, string.Empty, string.Empty, string.Empty, UserStatus.Inactive));

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Địa chỉ email/số điện thoại hoặc mật khẩu không hợp lệ.", exception.Message);
//        }

//        #endregion

//        #region UTCID07 - Abnormal: Valid email + wrong password → UnauthorizedException

//        [Fact]
//        public async Task UTCID07_Login_WrongPassword_ShouldThrowUnauthorizedException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = "Son12345"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son12345"))
//                .ReturnsAsync((false, string.Empty, string.Empty, string.Empty, string.Empty, UserStatus.Inactive));

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Địa chỉ email/số điện thoại hoặc mật khẩu không hợp lệ.", exception.Message);
//        }

//        #endregion

//        #region UTCID08 - Abnormal: Null password → BadRequestException

//        [Fact]
//        public async Task UTCID08_Login_NullPassword_ShouldThrowBadRequestException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = null!
//            };

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<BadRequestException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Nhập liệu không hợp lệ. Vui lòng kiểm tra các trường được đánh dấu.", exception.Message);
//            _mocker.GetMock<IIdentityService>()
//                .Verify(x => x.AuthenticateAsync(It.IsAny<string>(), It.IsAny<string>()), Times.Never);
//        }

//        #endregion

//        #region UTCID09 - Abnormal: Correct credentials + inactive account → UnauthorizedException

//        [Fact]
//        public async Task UTCID09_Login_InactiveAccount_CorrectPassword_ShouldThrowUnauthorizedException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = "Son123"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son123"))
//                .ReturnsAsync((true, "user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn", UserStatus.Inactive));

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Phiên đăng nhập của bạn đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.", exception.Message);
//            _mocker.GetMock<ITokenService>()
//                .Verify(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
//        }

//        #endregion

//        #region UTCID10 - Boundary: Wrong password + inactive account → UnauthorizedException (status checked first)

//        [Fact]
//        public async Task UTCID10_Login_InactiveAccount_WrongPassword_ShouldThrowAccountNotActivated()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = "Son12345"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son12345"))
//                .ReturnsAsync((true, "user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn", UserStatus.Inactive));

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Phiên đăng nhập của bạn đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.", exception.Message);
//        }

//        #endregion

//        #region UTCID11 - Boundary: Locked account (within lockout period) → UnauthorizedException

//        [Fact]
//        public async Task UTCID11_Login_LockedAccount_ShouldThrowUnauthorizedException()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = "Son123"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son123"))
//                .ReturnsAsync((true, "user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn", UserStatus.Banned));

//            // Act & Assert
//            var exception = await Assert.ThrowsAsync<UnauthorizedException>(
//                () => _authService.LoginAsync(request));

//            Assert.Equal("Tài khoản của bạn đã bị khóa tạm thời do nhiều lần đăng nhập không thành công.", exception.Message);
//            _mocker.GetMock<ITokenService>()
//                .Verify(x => x.GenerateAccessToken(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
//        }

//        #endregion

//        #region UTCID12 - Abnormal: Previously locked account (lock expired) → Token

//        [Fact]
//        public async Task UTCID12_Login_LockExpired_CorrectPassword_ShouldReturnToken()
//        {
//            // Arrange
//            var request = new LoginRequest
//            {
//                EmailOrPhone = "sontpthe180038@fpt.edu.vn",
//                Password = "Son123"
//            };

//            _mocker.GetMock<IIdentityService>()
//                .Setup(x => x.AuthenticateAsync("sontpthe180038@fpt.edu.vn", "Son123"))
//                .ReturnsAsync((true, "user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn", UserStatus.Active));

//            _mocker.GetMock<ITokenService>()
//                .Setup(x => x.GenerateAccessToken("user-01", "Son TP", "Customer", "sontpthe180038@fpt.edu.vn"))
//                .Returns("valid_jwt_token");

//            // Act
//            var result = await _authService.LoginAsync(request);

//            // Assert
//            Assert.NotNull(result);
//            Assert.Equal("valid_jwt_token", (IEnumerable<char>?)result);
//        }

//        #endregion
//    }
//}
