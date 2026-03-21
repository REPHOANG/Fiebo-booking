import { Skeleton } from "@mui/material";

export const VenueCardSkeleton = () => {
  return (
    <div className="ch-venue-card">
      {/* Image */}
      <div className="ch-card-image">
        <Skeleton variant="rectangular" width="100%" height={180} />

        {/* badges */}
        <div className="ch-card-badges">
          <Skeleton variant="rounded" width={60} height={20} />
          <Skeleton variant="rounded" width={50} height={20} />
        </div>

        {/* actions */}
        <div className="ch-card-actions">
          <Skeleton variant="circular" width={32} height={32} />
          <Skeleton variant="circular" width={32} height={32} />
        </div>
      </div>

      {/* Info */}
      <div className="ch-card-info">
        {/* logo */}
        <div className="ch-card-info-left">
          <Skeleton variant="circular" width={48} height={48} />
        </div>

        {/* text */}
        <div className="ch-card-info-right" style={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="80%" height={18} />
          <Skeleton variant="text" width="50%" height={18} />
          <Skeleton variant="text" width="40%" height={18} />
        </div>

        {/* button */}
        <Skeleton
          variant="rounded"
          width={100}
          height={36}
          style={{ marginLeft: 8 }}
        />
      </div>
    </div>
  );
};