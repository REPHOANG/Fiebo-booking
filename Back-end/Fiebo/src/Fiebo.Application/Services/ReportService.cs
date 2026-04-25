using Fiebo.Application.DTOs.Report;
using Fiebo.Application.Interfaces;
using Fiebo.Domain.Entities;
using Fiebo.Domain.Exceptions;
using Fiebo.Domain.Repositories;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Application.Services
{
    public class ReportService : IReportService
    {
        private readonly IUnitOfWork _unitOfWork;
        public ReportService(IUnitOfWork unitOfWork) => _unitOfWork = unitOfWork;

        public async Task<bool> SendReportAsync(string userId, CreateReportRequest request)
        {
            var booking = await _unitOfWork.Bookings.GetByIdAsync(request.BookingId);

            if (booking == null || booking.UserId != userId)
                throw new BadRequestException("Booking không hợp lệ.");
 
            if ((int)booking.Status != 2)
                throw new BadRequestException("Chỉ có thể báo cáo cho những đơn đặt sân đã hoàn thành thành công.");

            var report = new Report
            {
                Title = request.Title,
                Content = request.Content,
                BookingId = request.BookingId,
                UserId = userId,
                VenueId = booking.VenueId,
                VenueName = booking.Venue?.Name ?? "N/A",
                Status = 0, 
                CreatedAt = DateTime.Now 
            };

            _unitOfWork.Reports.Add(report);
            return await _unitOfWork.SaveChangesAsync() > 0;
        }

        public async Task<bool> RespondToReportAsync(string adminId, RespondReportRequest request)
        {
            var report = await _unitOfWork.Reports.GetByIdAsync(request.ReportId);

            if (report == null)
                throw new NotFoundException("Báo cáo không tồn tại.");

            if (report.Status != 0)
                throw new BadRequestException("Báo cáo này đã được xử lý trước đó.");

            report.ResponseContent = request.ResponseContent;
            report.AdminId = adminId;
            report.RespondedAt = DateTime.Now;
            report.Status = 1; 

            _unitOfWork.Reports.Update(report);
            return await _unitOfWork.SaveChangesAsync() > 0;
        }

        public async Task<IEnumerable<ReportSummaryResponse>> GetAllReportsForAdminAsync()
        {
            var reports = await _unitOfWork.Reports.GetReportsWithDetailsAsync();

            return reports.Select(r => new ReportSummaryResponse
            {
                Id = r.Id,
                Title = r.Title,
                Content = r.Content,
                Status = r.Status,
                CreatedAt = r.CreatedAt,
                VenueId = r.VenueId,                  
                VenueName = r.Venue?.Name ?? "N/A",
                BookingId = r.BookingId,
                CustomerId = r.UserId
            });
        }

        public async Task<ReportDetailResponse> GetReportDetailForCustomerAsync(int reportId, string userId)
        {
            var report = await _unitOfWork.Reports.GetByIdAsync(reportId);

            if (report == null || report.UserId != userId)
            {
                throw new NotFoundException("Báo cáo không tồn tại hoặc bạn không có quyền xem.");
            }

            return new ReportDetailResponse
            {
                Id = report.Id,
                Title = report.Title,
                Content = report.Content,
                CreatedAt = report.CreatedAt,
                ResponseContent = report.ResponseContent,
                RespondedAt = report.RespondedAt,
                Status = report.Status
            };
        }
    }
}
