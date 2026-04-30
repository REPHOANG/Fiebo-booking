using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Fiebo.Domain.Entities
{
    public class ReviewImage
    {
        public int ImageId { get; set; }

        public int ReviewId { get; set; }

        public string ImageUrl { get; set; } = null!;

        public Review Review { get; set; } = null!;
    }
}
