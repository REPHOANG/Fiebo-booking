import {
  Box,
  Button,
} from '@mui/material';

export const FilterBar = ({ activeFilter, onFilterChange, selectedMonth, selectedYear, onMonthChange, onYearChange }) => {
  const filters = ['All', 'Processing', 'Pending', 'Failed', 'Completed'];
  const filterLabels = {
    All: 'Tất cả',
    Processing: 'Đang xử lý',
    Pending: 'Đang chờ',
    Failed: 'Thất bại',
    Completed: 'Đã nhận',
  };
  const months = [
    { value: 1, label: 'Tháng 1' },
    { value: 2, label: 'Tháng 2' },
    { value: 3, label: 'Tháng 3' },
    { value: 4, label: 'Tháng 4' },
    { value: 5, label: 'Tháng 5' },
    { value: 6, label: 'Tháng 6' },
    { value: 7, label: 'Tháng 7' },
    { value: 8, label: 'Tháng 8' },
    { value: 9, label: 'Tháng 9' },
    { value: 10, label: 'Tháng 10' },
    { value: 11, label: 'Tháng 11' },
    { value: 12, label: 'Tháng 12' },
  ];
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, index) => currentYear - index);
  const isYearSelected = Boolean(selectedYear);
  const isValidSelectedYear = !selectedYear || years.includes(Number(selectedYear));
  const yearValue = isValidSelectedYear ? selectedYear : '';

  return (
    <Box sx={{  py: 2, bg: '#f7f9fb' }}>
      {/* Filter Buttons */}
      <Box
        sx={{
          display: 'flex',
          gap: 1,
          overflowX: 'auto',
          pb: 2,
          '&::-webkit-scrollbar': { display: 'none' },
        }}
      >
        {filters.map((filter) => (
          <Button
            key={filter}
            onClick={() => onFilterChange(filter)}
            variant={activeFilter === filter ? 'contained' : 'outlined'}
            sx={{
              flexShrink: 0,
              borderRadius: '20px',
              px: 2.5,
              py: 1,
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              fontWeight: activeFilter === filter ? 600 : 500,
              backgroundColor: activeFilter === filter ? '#000' : '#f2f4f6',
              color: activeFilter === filter ? '#fff' : '#45464d',
              border: activeFilter === filter ? 'none' : '1px solid #e0e3e5',
              textTransform: 'none',
              '&:hover': {
                backgroundColor: activeFilter === filter ? '#1a1a1a' : '#e6e8ea',
              },
            }}
          >
            {filterLabels[filter] || filter}
          </Button>
        ))}
      </Box>

      {/* Month and Year Selectors */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <select
          value={yearValue}
          onChange={(e) => onYearChange(e.target.value ? parseInt(e.target.value, 10) : '')}
          style={{
            minWidth: '120px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: '#e0e3e5',
            border: 'none',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            cursor: 'pointer',
          }}
        >
          <option value="" style={{ fontFamily: 'inherit' }}>
            Tất cả
          </option>
          {years.map((year) => (
            <option key={year} value={year} style={{ fontFamily: 'inherit' }}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value ? parseInt(e.target.value, 10) : '')}
          disabled={!isYearSelected}
          style={{
            minWidth: '150px',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: isYearSelected ? '#e0e3e5' : '#f2f4f6',
            border: 'none',
            fontSize: '0.875rem',
            fontFamily: 'inherit',
            cursor: isYearSelected ? 'pointer' : 'not-allowed',
            color: isYearSelected ? '#111' : '#76777d',
          }}
        >
          <option value="" style={{ fontFamily: 'inherit' }}>
            Tháng
          </option>
          {months.map((month) => (
            <option key={month.value} value={month.value} style={{ fontFamily: 'inherit' }}>
              {month.label}
            </option>
          ))}
        </select>  
      </Box>
    </Box>
  );
};
