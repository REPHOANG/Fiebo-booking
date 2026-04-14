using System.ComponentModel.DataAnnotations;

namespace Fiebo.Application.DTOs.Event
{
    public class CancelEventRequest
    {
        /// <summary>
        /// Optional note explaining the reason for cancellation.
        /// Will be included in the refund notification sent to participants.
        /// </summary>
        public string? CancelNote { get; set; }
    }
}
