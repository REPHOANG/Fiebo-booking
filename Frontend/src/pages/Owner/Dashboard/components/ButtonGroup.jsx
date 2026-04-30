const ButtonGroup = ({ options, active, onChange }) => (
  <div className="button-group">
    {options.map((option) => (
      <button
        key={option.value}
        className={active === option.value ? 'active' : ''}
        onClick={() => onChange(option.value)}
      >
        {option.label}
      </button>
    ))}
  </div>
);

export default ButtonGroup;
