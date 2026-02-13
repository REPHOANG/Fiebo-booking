using Fiebo.Application.DTOs.Auth;

namespace Fiebo.Application.Interfaces
{
    public interface IAuthService
    {
        Task Register(RegisterDTO request);
        Task Activate(VerifyOtpDTO request);
    }
}
