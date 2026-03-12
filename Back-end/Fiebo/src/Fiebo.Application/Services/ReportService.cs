//using Fiebo.Application.DTOs.Report;
//using Fiebo.Application.Interfaces;
//using Fiebo.Domain.Entities;
//using Fiebo.Domain.Exceptions;
//using Fiebo.Domain.Repositories;
//using System;
//using System.Collections.Generic;
//using System.Linq;
//using System.Text;
//using System.Threading.Tasks;

//namespace Fiebo.Application.Services
//{
//    public class ReportService : IReportService
//    {
//        private readonly IUnitOfWork _unitOfWork;

//        public ReportService(IUnitOfWork unitOfWork)
//        {
//            _unitOfWork = unitOfWork;
//        }

//        public async Task<bool> CreateReportAsync(CreateReportRequest request, string userId)
//        {
//            if (string.IsNullOrWhiteSpace(request.Title) || string.IsNullOrWhiteSpace(request.Content))
//            {
//                return false;
//            }

//            var booking = await _unitOfWork.Bookings.GetBookingForReportAsync(request.BookingId, userId);

//            if (booking == null)
//            {
//                return false;
//            }

//            var report = new Report
//            {
//                BookingId = request.BookingId,
//                UserId = userId,
//                Title = request.Title,
//                Content = request.Content,
//                Status = 0 
//            };

//            _unitOfWork.Reports.Add(report);
//            return await _unitOfWork.SaveChangesAsync() > 0;
//        }
//    }
//}
